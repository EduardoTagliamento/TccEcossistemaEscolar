/**
 * Migration (seed de dados, não altera schema): segunda leva de pré-cadastro
 * da Feira Técnica do Colégio Univap — pessoas que se cadastraram na
 * primeira metade do evento (salas_reduzido_novos.json).
 * Data: 02/10/2026
 *
 * Mesma lógica de `2026-10-01-feira-tecnica-univap.ts`, com as correções
 * aprendidas depois daquela rodada (ver backfills de 2026-10-01/02):
 *   - Todas as turmas já existem (criadas na primeira leva), não cria turma.
 *   - Garante o vínculo em escolaxusuarioxfuncao (FuncaoId=5/Aluno) na hora,
 *     não deixa pra um backfill depois.
 *   - Adiciona a pessoa no grupo de chat (conversa_grupo) da turma na hora.
 *   - Tenta sincronizar no grupo de WhatsApp vinculado à turma, se houver
 *     (só é efetivo se a pessoa já tiver telefone — cascas não têm, então
 *     isso fica pendente até a ativação real, mesma regra de sempre).
 *
 * Idempotente — pode rodar de novo sem duplicar nada.
 */

import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import * as fs from "fs";
import * as path from "path";
import MysqlDatabase from "../MysqlDatabase";
import { gerarGUID, gerarGUIDUsuario } from "../../utils/helpers/guid.helper";
import { paraFormatoEvolutionApi } from "../../utils/helpers/telefone.helper";
import EvolutionApiService from "../../external/EvolutionApiService";

const ESCOLA_GUID = "b67a6634-9afd-4fb3-8227-d2569a3db98c"; // Colégios UNIVAP - Centro
const FUNCAO_ID_ALUNO = 5;

interface SalaJSON {
  sala: string;
  curso: string;
  alunos: string[];
}

function normalizarNome(nome: string): string {
  return nome.trim().replace(/\s+/g, " ").toLowerCase();
}

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
  console.log("🔧 Iniciando seed: feira-tecnica-univap-novos (2ª leva)");

  const db = new MysqlDatabase();
  const pool = await db.getPool();

  const jsonPath = "F:\\Area de Trabalho\\feiratecnica\\dados\\salas_reduzido_novos.json";
  const salas: SalaJSON[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`📄 ${salas.length} salas carregadas de ${jsonPath}`);

  const [turmaRows] = await pool.execute<any[]>(
    `SELECT TurmaGUID, TurmaSerie, TurmaNome FROM turma WHERE EscolaGUID = ?`,
    [ESCOLA_GUID]
  );
  const turmaPorChave = new Map<string, string>();
  for (const row of turmaRows as any[]) {
    turmaPorChave.set(`${row.TurmaSerie}-${row.TurmaNome.toUpperCase()}`, row.TurmaGUID);
  }

  // ConversaGUID (grupo de chat) de cada turma — já deve existir (backfill de 02/10).
  const [grupoRows] = await pool.execute<any[]>(
    `SELECT ConversaGUID, ConversaGrupoRefGUID FROM conversa_grupo WHERE ConversaGrupoTipo = 'Turma'`
  );
  const conversaPorTurma = new Map<string, string>();
  for (const row of grupoRows as any[]) {
    conversaPorTurma.set(row.ConversaGrupoRefGUID, row.ConversaGUID);
  }

  // Grupo de WhatsApp vinculado por turma, se houver.
  const [whatsRows] = await pool.execute<any[]>(
    `SELECT TurmaGUID, GrupoWhatsappJID FROM turma_grupo_whatsapp`
  );
  const whatsPorTurma = new Map<string, string>();
  for (const row of whatsRows as any[]) {
    whatsPorTurma.set(row.TurmaGUID, row.GrupoWhatsappJID);
  }

  let usuariosCriados = 0;
  let usuariosReaproveitados = 0;
  let matriculasCriadas = 0;
  let vinculosEscolaCriados = 0;
  let membrosGrupoChatAdicionados = 0;
  let usuariosAmbiguos = 0;
  let avisosConflito = 0;
  let turmasNaoEncontradas = 0;

  const entrouPorTurma = new Map<string, string[]>();

  for (const salaInfo of salas) {
    const ano = salaInfo.sala.charAt(0);
    const letra = salaInfo.sala.slice(1).toUpperCase();
    const chaveTurma = `${ano}-${letra}`;

    const turmaGUID = turmaPorChave.get(chaveTurma);
    if (!turmaGUID) {
      console.error(`❌ Turma "${salaInfo.sala}" não encontrada na escola — pulando sala inteira (precisa existir antes de rodar este script).`);
      turmasNaoEncontradas++;
      continue;
    }

    const conversaGUID = conversaPorTurma.get(turmaGUID);
    const whatsappJID = whatsPorTurma.get(turmaGUID);

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

      const [matriculaExistente] = await pool.execute<any[]>(
        `SELECT MatriculaGUID FROM matricula WHERE UsuarioGUID = ? AND TurmaGUID = ? AND MatriculaStatus = 'Ativa'`,
        [usuarioGUID, turmaGUID]
      );
      if (matriculaExistente.length === 0) {
        const [matriculaAtivaOutraTurma] = await pool.execute<any[]>(
          `SELECT TurmaGUID FROM matricula WHERE UsuarioGUID = ? AND MatriculaStatus = 'Ativa'`,
          [usuarioGUID]
        );
        if (matriculaAtivaOutraTurma.length > 0) {
          console.warn(`⚠️  CONFLITO: "${nomeOriginal}" já tem matrícula ativa em outra turma — não criei nova matrícula pra ${chaveTurma}.`);
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

        if (!entrouPorTurma.has(chaveTurma)) entrouPorTurma.set(chaveTurma, []);
        entrouPorTurma.get(chaveTurma)!.push(capitalizarNome(nomeOriginal));
      }

      // Vínculo escolaxusuarioxfuncao (Aluno) — idempotente via upsert manual.
      const [vinculoExistente] = await pool.execute<any[]>(
        `SELECT EscolaxUsuarioxFuncaoId, Status FROM escolaxusuarioxfuncao WHERE UsuarioGUID = ? AND EscolaGUID = ? AND FuncaoId = ?`,
        [usuarioGUID, ESCOLA_GUID, FUNCAO_ID_ALUNO]
      );
      if (vinculoExistente.length === 0) {
        await pool.execute(
          `INSERT INTO escolaxusuarioxfuncao (UsuarioGUID, EscolaGUID, FuncaoId, DataInicio, DataFim, Status)
           VALUES (?, ?, ?, NOW(), NULL, 'Ativo')`,
          [usuarioGUID, ESCOLA_GUID, FUNCAO_ID_ALUNO]
        );
        vinculosEscolaCriados++;
      } else if (vinculoExistente[0].Status !== "Ativo") {
        await pool.execute(
          `UPDATE escolaxusuarioxfuncao SET Status = 'Ativo', DataInicio = NOW(), DataFim = NULL WHERE EscolaxUsuarioxFuncaoId = ?`,
          [vinculoExistente[0].EscolaxUsuarioxFuncaoId]
        );
        vinculosEscolaCriados++;
      }

      // Grupo de chat (conversa_grupo) da turma.
      if (conversaGUID) {
        await pool.execute(
          `INSERT INTO conversa_grupo_membro (ConversaGUID, MembroUsuarioGUID, MembroFuncao, MembroStatus, MembroEntradaAt, MembroSaidaAt)
           VALUES (?, ?, 'Membro', 'Ativo', NOW(), NULL)
           ON DUPLICATE KEY UPDATE MembroStatus = 'Ativo', MembroSaidaAt = NULL`,
          [conversaGUID, usuarioGUID]
        );
        membrosGrupoChatAdicionados++;
      } else {
        console.warn(`⚠️  Turma ${chaveTurma} não tem grupo de chat (conversa_grupo) — pulei esse passo pra "${nomeOriginal}".`);
      }

      // Grupo de WhatsApp vinculado à turma, se houver (só efetivo se já tiver telefone).
      if (whatsappJID) {
        const [usuarioRow] = await pool.execute<any[]>(
          `SELECT UsuarioTelefone FROM usuario WHERE UsuarioGUID = ?`,
          [usuarioGUID]
        );
        const telefone = usuarioRow[0]?.UsuarioTelefone;
        if (telefone) {
          try {
            await EvolutionApiService.getInstance().adicionarParticipante(whatsappJID, paraFormatoEvolutionApi(telefone));
          } catch (erro: any) {
            console.error(`❌ Falha ao sincronizar "${nomeOriginal}" no grupo de WhatsApp da turma ${chaveTurma}:`, erro?.message ?? erro);
          }
        }
      }
    }
  }

  console.log("\n🎉 Seed concluído:");
  console.log(`   Usuários criados (cascas): ${usuariosCriados}`);
  console.log(`   Usuários reaproveitados (já existiam): ${usuariosReaproveitados}`);
  console.log(`   Matrículas novas criadas: ${matriculasCriadas}`);
  console.log(`   Vínculos escolaxusuarioxfuncao criados/reativados: ${vinculosEscolaCriados}`);
  console.log(`   Membros adicionados ao grupo de chat da turma: ${membrosGrupoChatAdicionados}`);
  console.log(`   Nomes ambíguos (pulados): ${usuariosAmbiguos}`);
  console.log(`   Conflitos de matrícula ativa em outra turma (pulados): ${avisosConflito}`);
  console.log(`   Turmas não encontradas (pulei a sala inteira): ${turmasNaoEncontradas}`);

  console.log("\n📋 Quem entrou, por turma:");
  const turmasOrdenadas = [...entrouPorTurma.keys()].sort();
  for (const chave of turmasOrdenadas) {
    const nomes = entrouPorTurma.get(chave)!;
    console.log(`\n${chave.replace("-", "")} (${nomes.length}):`);
    for (const nome of nomes.sort()) console.log(`   - ${nome}`);
  }

  process.exit(0);
}

runMigration().catch((error) => {
  console.error("❌ Erro ao executar seed:", error);
  process.exit(1);
});
