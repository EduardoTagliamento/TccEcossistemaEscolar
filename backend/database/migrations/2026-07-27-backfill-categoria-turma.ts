/**
 * Backfill: categoriaconteudo ganha TurmaGUID
 * Ver docs/PLANO_IMPLEMENTACAO_MATERIAS.md, seção 4.3 e decisão #3.
 *
 * Contexto: categorias criadas ANTES do escopo por turma têm só
 * UsuarioCPF+MateriaGUID+CategoriaNome (TurmaGUID NULL). Este script:
 *   1. Pra cada categoria antiga (TurmaGUID NULL), busca as turmas onde
 *      esse professor está ATIVAMENTE alocado naquela matéria
 *      (materiaxprofessorxturma.AlocacaoStatus = 'Ativa').
 *   2. Cria 1 cópia da categoria por turma encontrada (mesmo nome/Ordem).
 *      Idempotente: se já existir uma linha (UsuarioCPF, MateriaGUID,
 *      TurmaGUID, CategoriaNome) — ex.: reexecução, ou o professor já
 *      criou uma categoria geral com o mesmo nome via `criarCategoriaGeral`
 *      depois que essa feature foi ao ar mas antes do backfill rodar —
 *      reaproveita a cópia existente em vez de duplicar.
 *   3. Reatribui `conteudoturma.CategoriaGUID` (campo novo, ainda NULL nos
 *      dados antigos) a partir do que `conteudo.CategoriaGUID` (campo
 *      LEGADO, intocado) apontava, resolvendo pra cópia certa da turma
 *      daquela linha de distribuição.
 *   4. `provaagendada` nunca teve campo de categoria antes desta feature
 *      — não há nada legado pra migrar aqui (script só confirma que não
 *      existe nenhuma linha inesperada, por segurança).
 *   5. Categoria antiga que teve ao menos 1 cópia criada com sucesso é
 *      excluída (nada mais aponta pra ela — `conteudo.CategoriaGUID` é só
 *      histórico, já ignorado pelo código novo). Categoria SEM nenhuma
 *      turma ativa encontrada (professor não leciona mais essa matéria em
 *      turma nenhuma) fica intocada e é reportada pra revisão manual — não
 *      dá pra escolher uma turma "certa" nesse caso.
 *
 * NÃO faz o `ALTER TABLE categoriaconteudo MODIFY COLUMN TurmaGUID NOT NULL`
 * final — isso é manual, só depois de confirmar visualmente (e com
 * `--check`) que o backfill não deixou nenhuma categoria antiga sem
 * cobertura.
 *
 * Uso (a partir da raiz do repo):
 *   npx tsx backend/database/migrations/2026-07-27-backfill-categoria-turma.ts --check
 *      → só lê e relata o que seria feito, NÃO grava nada no banco.
 *   npx tsx backend/database/migrations/2026-07-27-backfill-categoria-turma.ts --apply
 *      → executa de verdade (cria as cópias, reatribui conteudoturma,
 *        apaga as categorias antigas já cobertas).
 *
 * ⚠️ Confirme qual banco o `.env` está apontando ANTES de rodar com
 * `--apply` — `backend/database/mysql.ts` tem fallback pro banco de
 * PRODUÇÃO (Railway) se as variáveis DB_* não estiverem setadas.
 */

import { v4 as uuidv4 } from "uuid";
import MysqlDatabase from "../MysqlDatabase";

interface CategoriaAntiga {
  CategoriaGUID: string;
  UsuarioCPF: string;
  MateriaGUID: string;
  CategoriaNome: string | null;
  Ordem: number;
}

async function run() {
  const modoAplicar = process.argv.includes("--apply");
  const modoCheck = process.argv.includes("--check");

  if (!modoAplicar && !modoCheck) {
    console.error("Uso: npx tsx 2026-07-27-backfill-categoria-turma.ts --check | --apply");
    process.exit(1);
  }

  console.log(`🔧 Backfill categoriaconteudo.TurmaGUID — modo: ${modoAplicar ? "APPLY (grava no banco)" : "CHECK (só leitura)"}`);

  const db = MysqlDatabase.getInstance();
  const pool = await db.getPool();

  const [categoriasAntigas] = await pool.query<any[]>(
    `SELECT CategoriaGUID, UsuarioCPF, MateriaGUID, CategoriaNome, Ordem
     FROM categoriaconteudo
     WHERE TurmaGUID IS NULL`
  );

  console.log(`📊 ${categoriasAntigas.length} categoria(s) antiga(s) (TurmaGUID NULL) encontrada(s).`);

  if (categoriasAntigas.length === 0) {
    console.log("✅ Nada pra migrar. Já dá pra rodar o ALTER TABLE ... NOT NULL manualmente.");
    process.exit(0);
  }

  let totalCopiasCriadas = 0;
  let totalConteudoTurmaAtualizado = 0;
  let totalCategoriasOrfas = 0;
  let totalCategoriasRemoviveis = 0;

  for (const categoria of categoriasAntigas as CategoriaAntiga[]) {
    const [alocacoes] = await pool.query<any[]>(
      `SELECT TurmaGUID FROM materiaxprofessorxturma
       WHERE UsuarioCPF = ? AND MateriaGUID = ? AND AlocacaoStatus = 'Ativa'`,
      [categoria.UsuarioCPF, categoria.MateriaGUID]
    );

    if (alocacoes.length === 0) {
      totalCategoriasOrfas++;
      console.warn(
        `⚠️  Categoria "${categoria.CategoriaNome}" (${categoria.CategoriaGUID}) — professor ${categoria.UsuarioCPF} sem nenhuma alocação ativa nessa matéria (${categoria.MateriaGUID}). Deixada como está — revisar manualmente.`
      );
      continue;
    }

    // TurmaGUID -> CategoriaGUID da cópia (nova ou já existente)
    const mapaTurmaParaNovaCategoria = new Map<string, string>();

    for (const { TurmaGUID } of alocacoes) {
      const [existente] = await pool.query<any[]>(
        `SELECT CategoriaGUID FROM categoriaconteudo
         WHERE UsuarioCPF = ? AND MateriaGUID = ? AND TurmaGUID = ? AND CategoriaNome = ? LIMIT 1`,
        [categoria.UsuarioCPF, categoria.MateriaGUID, TurmaGUID, categoria.CategoriaNome]
      );

      if (existente.length > 0) {
        mapaTurmaParaNovaCategoria.set(TurmaGUID, existente[0].CategoriaGUID);
        continue;
      }

      const novoGUID = uuidv4();
      console.log(
        `  ${modoAplicar ? "➕" : "🔎"} cópia de "${categoria.CategoriaNome}" pra turma ${TurmaGUID}${modoAplicar ? "" : " (dry-run)"}`
      );
      if (modoAplicar) {
        await pool.execute(
          `INSERT INTO categoriaconteudo (CategoriaGUID, UsuarioCPF, MateriaGUID, TurmaGUID, CategoriaNome, Ordem)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [novoGUID, categoria.UsuarioCPF, categoria.MateriaGUID, TurmaGUID, categoria.CategoriaNome, categoria.Ordem]
        );
      }
      mapaTurmaParaNovaCategoria.set(TurmaGUID, novoGUID);
      totalCopiasCriadas++;
    }

    // Reatribuir conteudoturma.CategoriaGUID a partir do legado conteudo.CategoriaGUID
    const [conteudoTurmaRows] = await pool.query<any[]>(
      `SELECT ct.ConteudoTurmaGUID, ct.TurmaGUID
       FROM conteudo c
       INNER JOIN conteudoturma ct ON ct.ConteudoGUID = c.ConteudoGUID
       WHERE c.CategoriaGUID = ? AND ct.CategoriaGUID IS NULL`,
      [categoria.CategoriaGUID]
    );

    for (const linha of conteudoTurmaRows as any[]) {
      const novaCategoriaGUID = mapaTurmaParaNovaCategoria.get(linha.TurmaGUID);
      if (!novaCategoriaGUID) {
        console.warn(
          `  ⚠️  conteudoturma ${linha.ConteudoTurmaGUID} (turma ${linha.TurmaGUID}) sem cópia correspondente — professor não está mais alocado nessa turma. Deixado sem categoria.`
        );
        continue;
      }
      console.log(
        `  ${modoAplicar ? "🔗" : "🔎"} conteudoturma ${linha.ConteudoTurmaGUID} -> categoria ${novaCategoriaGUID}${modoAplicar ? "" : " (dry-run)"}`
      );
      if (modoAplicar) {
        await pool.execute(`UPDATE conteudoturma SET CategoriaGUID = ? WHERE ConteudoTurmaGUID = ?`, [
          novaCategoriaGUID,
          linha.ConteudoTurmaGUID,
        ]);
      }
      totalConteudoTurmaAtualizado++;
    }

    // Categoria antiga já coberta por >=1 cópia — remove o registro sem turma
    // (nada mais aponta funcionalmente pra ela; conteudo.CategoriaGUID é só
    // histórico e já é ignorado pelo código novo).
    totalCategoriasRemoviveis++;
    console.log(`  ${modoAplicar ? "🗑️ " : "🔎"} remover categoria antiga ${categoria.CategoriaGUID}${modoAplicar ? "" : " (dry-run)"}`);
    if (modoAplicar) {
      await pool.execute(`DELETE FROM categoriaconteudo WHERE CategoriaGUID = ?`, [categoria.CategoriaGUID]);
    }
  }

  // Prova nunca teve categoria antes desta feature — só uma checagem de sanidade.
  const [provaOrfa] = await pool.query<any[]>(
    `SELECT COUNT(*) AS total FROM provaagendada_turma WHERE CategoriaGUID IS NOT NULL`
  );
  console.log(`ℹ️  provaagendada_turma com CategoriaGUID já preenchido: ${(provaOrfa[0] as any).total} (esperado: 0 antes do backfill)`);

  console.log("—".repeat(40));
  console.log(`Categorias antigas processadas: ${categoriasAntigas.length}`);
  console.log(`  cópias por turma criadas/reaproveitadas: ${totalCopiasCriadas}`);
  console.log(`  conteudoturma.CategoriaGUID reatribuídos: ${totalConteudoTurmaAtualizado}`);
  console.log(`  categorias órfãs (sem alocação ativa, revisar manualmente): ${totalCategoriasOrfas}`);
  console.log(`  categorias antigas removidas (cobertas): ${modoAplicar ? totalCategoriasRemoviveis : `${totalCategoriasRemoviveis} (dry-run, nada removido de verdade)`}`);

  if (totalCategoriasOrfas > 0) {
    console.log(
      `\n⚠️  ${totalCategoriasOrfas} categoria(s) ficaram sem cobertura (professor sem alocação ativa na matéria). TurmaGUID NOT NULL só pode ser aplicado depois de resolver essas manualmente (ou aceitar apagá-las).`
    );
  } else {
    console.log(`\n✅ Nenhuma categoria órfã. Depois de rodar com --apply, dá pra aplicar:`);
    console.log(`   ALTER TABLE categoriaconteudo MODIFY COLUMN TurmaGUID CHAR(36) NOT NULL;`);
  }

  process.exit(0);
}

run().catch((error) => {
  console.error("❌ Erro no backfill:", error);
  process.exit(1);
});
