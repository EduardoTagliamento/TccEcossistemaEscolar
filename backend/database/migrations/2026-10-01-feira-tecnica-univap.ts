/**
 * Migration (seed de dados, não altera schema): Pré-cadastro para a Feira
 * Técnica do Colégio Univap.
 * Data: 01/10/2026
 * Descrição: ver docs/SPEC_FEIRA_TECNICA_UNIVAP_2026.md.
 *
 * - Lê `data/salas_reduzido.json` (sala → curso → lista de alunos).
 * - Cria as turmas de 1º e 2º ano que ainda não existem (3º ano já existe em
 *   produção, criado manualmente antes desta feature).
 * - Pra cada aluno: resolve por nome exato (case-insensitive, trim) contra
 *   `usuario` já existente — se achar, só garante a matrícula na turma certa
 *   (sem duplicar e sem mexer em quem já tem matrícula ativa em outro
 *   lugar, por segurança); se não achar, cria um usuário "casca" (nome +
 *   senha descartável, sem telefone/email ainda) + matrícula ativa. A
 *   ativação de verdade (telefone/email/matrícula real + senha enviada por
 *   WhatsApp) acontece depois, pelo fluxo público `/cadastro/univap`.
 *
 * EscolaGUID fixo e deliberado — é a única das 8 escolas "Univap" do banco
 * que tem dados reais (ver spec). NUNCA generalizar pra outro EscolaGUID
 * sem reconferir.
 *
 * Idempotente — pode rodar de novo sem duplicar nada.
 */

import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import * as fs from "fs";
import * as path from "path";
import MysqlDatabase from "../MysqlDatabase";
import { gerarGUID } from "../../utils/helpers/guid.helper";
import { gerarGUIDUsuario } from "../../utils/helpers/guid.helper";

const ESCOLA_GUID = "b67a6634-9afd-4fb3-8227-d2569a3db98c"; // Colégios UNIVAP - Centro

interface SalaJSON {
  sala: string; // ex.: "1A", "3H"
  curso: string; // ex.: "ELETRÔNICA"
  alunos: string[];
}

function normalizarNome(nome: string): string {
  return nome.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * O JSON da feira vem com capitalização inconsistente ("MARIA JULIA CONTI",
 * "sarah medeiros paixão") — mesma regra de `UsuarioService#capitalizeWords`:
 * primeira letra maiúscula por palavra, resto minúsculo.
 */
function capitalizarNome(nome: string): string {
  return nome
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
    .join(" ");
}

async function runMigration() {
  console.log("🔧 Iniciando seed: feira-tecnica-univap");

  const db = new MysqlDatabase();
  const pool = await db.getPool();

  const jsonPath = path.join(__dirname, "data", "salas_reduzido.json");
  const salas: SalaJSON[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`📄 ${salas.length} salas carregadas de ${jsonPath}`);

  // --- Cursos da escola (nome em lowercase -> CursoGUID) ---
  const [cursoRows] = await pool.execute<any[]>(
    `SELECT CursoGUID, CursoNome FROM curso WHERE EscolaGUID = ?`,
    [ESCOLA_GUID]
  );
  const cursoPorNome = new Map<string, string>();
  for (const row of cursoRows as any[]) {
    cursoPorNome.set(row.CursoNome.trim().toLowerCase(), row.CursoGUID);
  }
  console.log(`📚 ${cursoPorNome.size} cursos encontrados pra escola.`);

  // --- Turmas já existentes (TurmaSerie-TurmaNome -> TurmaGUID) ---
  const [turmaRows] = await pool.execute<any[]>(
    `SELECT TurmaGUID, TurmaSerie, TurmaNome FROM turma WHERE EscolaGUID = ?`,
    [ESCOLA_GUID]
  );
  const turmaPorChave = new Map<string, string>();
  for (const row of turmaRows as any[]) {
    turmaPorChave.set(`${row.TurmaSerie}-${row.TurmaNome.toUpperCase()}`, row.TurmaGUID);
  }
  console.log(`🏫 ${turmaPorChave.size} turmas já existentes encontradas.`);

  let turmasCriadas = 0;
  let usuariosCriados = 0;
  let usuariosReaproveitados = 0;
  let matriculasCriadas = 0;
  let usuariosAmbiguos = 0;
  let avisosConflito = 0;

  for (const salaInfo of salas) {
    const ano = salaInfo.sala.charAt(0); // "1", "2", "3"
    const letra = salaInfo.sala.slice(1).toUpperCase(); // "A".."N"
    const chaveTurma = `${ano}-${letra}`;

    let turmaGUID = turmaPorChave.get(chaveTurma);

    if (!turmaGUID) {
      const cursoGUID = cursoPorNome.get(salaInfo.curso.trim().toLowerCase());
      if (!cursoGUID) {
        console.error(`❌ Curso "${salaInfo.curso}" (sala ${salaInfo.sala}) não encontrado na escola — pulando sala inteira.`);
        continue;
      }

      turmaGUID = gerarGUID();
      await pool.execute(
        `INSERT INTO turma (TurmaGUID, EscolaGUID, TurmaSerie, TurmaNome, TurmaIsTecnico, CursoGUID, TurmaStatus, TurmaCreatedAt, TurmaUpdatedAt)
         VALUES (?, ?, ?, ?, TRUE, ?, 'Ativa', NOW(), NOW())`,
        [turmaGUID, ESCOLA_GUID, ano, letra, cursoGUID]
      );
      turmaPorChave.set(chaveTurma, turmaGUID);
      turmasCriadas++;
      console.log(`✅ Turma criada: ${ano}º ano "${letra}" (${salaInfo.curso}) — ${turmaGUID}`);
    }

    for (const nomeOriginal of salaInfo.alunos) {
      const nomeNormalizado = normalizarNome(nomeOriginal);

      const [candidatos] = await pool.execute<any[]>(
        `SELECT UsuarioGUID, UsuarioNome FROM usuario WHERE LOWER(TRIM(UsuarioNome)) = ? AND UsuarioDeletedAt IS NULL`,
        [nomeNormalizado]
      );

      let usuarioGUID: string;

      if (candidatos.length > 1) {
        console.warn(`⚠️  AMBÍGUO: "${nomeOriginal}" bate com ${candidatos.length} usuários diferentes — pulando, resolver manualmente.`);
        usuariosAmbiguos++;
        continue;
      } else if (candidatos.length === 1) {
        usuarioGUID = (candidatos[0] as any).UsuarioGUID;
        usuariosReaproveitados++;
      } else {
        usuarioGUID = gerarGUIDUsuario();
        const senhaDescartavel = randomBytes(24).toString("hex");
        const senhaHash = await bcrypt.hash(senhaDescartavel, 10);
        await pool.execute(
          `INSERT INTO usuario (UsuarioGUID, UsuarioNome, UsuarioSenha, UsuarioStatus, UsuarioEmailVerificado)
           VALUES (?, ?, ?, 'Ativo', FALSE)`,
          [usuarioGUID, capitalizarNome(nomeOriginal), senhaHash]
        );
        usuariosCriados++;
      }

      // Já tem matrícula ATIVA nessa turma específica? Não duplica.
      const [matriculaExistente] = await pool.execute<any[]>(
        `SELECT MatriculaGUID FROM matricula WHERE UsuarioGUID = ? AND TurmaGUID = ? AND MatriculaStatus = 'Ativa'`,
        [usuarioGUID, turmaGUID]
      );
      if (matriculaExistente.length > 0) continue;

      // Tem matrícula ativa em OUTRA turma? (regra: só uma ativa por vez) —
      // não mexe, só avisa pra conferência manual (ex.: nome repetido entre
      // escolas, ou pessoa já matriculada em turma diferente de propósito).
      const [matriculaAtivaOutraTurma] = await pool.execute<any[]>(
        `SELECT TurmaGUID FROM matricula WHERE UsuarioGUID = ? AND MatriculaStatus = 'Ativa'`,
        [usuarioGUID]
      );
      if (matriculaAtivaOutraTurma.length > 0) {
        console.warn(`⚠️  CONFLITO: "${nomeOriginal}" já tem matrícula ativa em outra turma (${(matriculaAtivaOutraTurma[0] as any).TurmaGUID}) — não criei nova matrícula pra ${chaveTurma}.`);
        avisosConflito++;
        continue;
      }

      const matriculaGUID = gerarGUID();
      await pool.execute(
        `INSERT INTO matricula (MatriculaGUID, MatriculaIdentificador, UsuarioGUID, TurmaGUID, MatriculaDataEntrada, MatriculaStatus, MatriculaCreatedAt, MatriculaUpdatedAt)
         VALUES (?, ?, ?, ?, NOW(), 'Ativa', NOW(), NOW())`,
        [matriculaGUID, matriculaGUID, usuarioGUID, turmaGUID]
      );
      matriculasCriadas++;
    }
  }

  console.log("\n🎉 Seed concluído:");
  console.log(`   Turmas criadas: ${turmasCriadas}`);
  console.log(`   Usuários criados (cascas): ${usuariosCriados}`);
  console.log(`   Usuários reaproveitados (já existiam): ${usuariosReaproveitados}`);
  console.log(`   Matrículas criadas: ${matriculasCriadas}`);
  console.log(`   Nomes ambíguos (pulados): ${usuariosAmbiguos}`);
  console.log(`   Conflitos de matrícula ativa em outra turma (pulados): ${avisosConflito}`);

  process.exit(0);
}

runMigration().catch((error) => {
  console.error("❌ Erro ao executar seed:", error);
  process.exit(1);
});
