/**
 * Backfill do grupo de CHAT INTERNO da turma (feature "Conversas" dentro do
 * Bauá — `ConversaGrupoService`), não confundir com o grupo de WhatsApp
 * externo (`2026-10-01-sync-grupo-whatsapp-feira.ts`, feature separada).
 *
 * Mesma causa raiz: o seed da feira (`2026-10-01-feira-tecnica-univap.ts`)
 * escreveu Turma e Matricula direto via SQL puro, pulando a camada de
 * serviço — que normalmente, ao criar uma Turma, cria o grupo de chat dela
 * (`ConversaGrupoService.criarGrupoTurma`), e ao criar uma Matricula,
 * adiciona o aluno no grupo de chat já existente da turma
 * (`ConversaGrupoService.adicionarMembroTurma`).
 *
 * Confirmado por consulta read-only nessa escola (b67a6634-9afd-4fb3-8227-d2569a3db98c):
 *   - 26 turmas novas de hoje (1A-1N, 2A-2L): NENHUMA tem grupo de chat ainda.
 *   - 12 turmas que já existiam (3A-3L): TODAS já têm grupo de chat (de antes
 *     da feira) — só faltam os membros novos de hoje dentro desse grupo.
 *
 * Então, pra cada turma dessa escola:
 *   - sem grupo de chat ainda -> `criarGrupoTurma` (cria o grupo E já
 *     popula todo mundo que tem matrícula ativa nela agora, de uma vez).
 *   - já tem grupo de chat -> `adicionarMembroTurma` só pros alunos cuja
 *     matrícula foi criada HOJE (filtro por MatriculaCreatedAt), pra não
 *     reemitir evento de socket "membro_entrou" pra quem já era membro de
 *     antes (addMembro é upsert idempotente, mas o evento de socket seria
 *     reemitido à toa).
 */

import MysqlDatabase from "../MysqlDatabase";
import { ConversaDAO } from "../../repositories/conversa.repository";
import { ConversaGrupoDAO } from "../../repositories/conversa-grupo.repository";
import { MatriculaDAO } from "../../repositories/matricula.repository";
import { UsuarioDAO } from "../../repositories/usuario.repository";
import ConversaGrupoService from "../../services/conversa-grupo.service";

const ESCOLA_GUID = "b67a6634-9afd-4fb3-8227-d2569a3db98c";
const DATA_CORTE = "2026-10-01 00:00:00"; // início do dia da feira

async function run() {
  const database = new MysqlDatabase();
  const pool = await database.getPool();

  const conversaDAO = new ConversaDAO(database);
  const conversaGrupoDAO = new ConversaGrupoDAO(database);
  const matriculaDAO = new MatriculaDAO(database);
  const usuarioDAO = new UsuarioDAO(database);
  const service = new ConversaGrupoService(conversaDAO, conversaGrupoDAO, matriculaDAO, usuarioDAO);

  const [turmas] = await pool.execute<any[]>(
    `SELECT TurmaGUID, TurmaSerie, TurmaNome FROM turma WHERE EscolaGUID = ? ORDER BY TurmaSerie, TurmaNome`,
    [ESCOLA_GUID]
  );

  for (const turma of turmas) {
    const label = `${turma.TurmaSerie}${turma.TurmaNome}`;
    const grupo = await conversaGrupoDAO.findByRefGUID(turma.TurmaGUID);

    if (!grupo) {
      console.log(`\n--- ${label}: sem grupo de chat, criando (popula membros atuais) ---`);
      await service.criarGrupoTurma(turma.TurmaGUID, turma.TurmaNome);
      continue;
    }

    const [novos] = await pool.execute<any[]>(
      `SELECT UsuarioGUID FROM matricula
       WHERE TurmaGUID = ? AND MatriculaStatus = 'Ativa' AND MatriculaCreatedAt >= ?`,
      [turma.TurmaGUID, DATA_CORTE]
    );

    if (novos.length === 0) {
      console.log(`--- ${label}: já tem grupo, nenhum membro novo de hoje. ---`);
      continue;
    }

    console.log(`\n--- ${label}: já tem grupo, adicionando ${novos.length} membro(s) novo(s) de hoje ---`);
    for (const row of novos) {
      await service.adicionarMembroTurma(turma.TurmaGUID, row.UsuarioGUID);
    }
  }

  console.log("\n🎉 Backfill de grupos de chat de turma concluído.");
  process.exit(0);
}

run().catch((erro) => {
  console.error("❌ Erro:", erro);
  process.exit(1);
});
