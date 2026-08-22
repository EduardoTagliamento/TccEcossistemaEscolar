/**
 * Migration: Chat para Grupo de Projeto (#29)
 * Data: 21/08/2026
 * Descrição: Reverte a decisão original da v1 de Projetos (chat fora de
 *            escopo) — Grupo de Projeto passa a ter conversa_grupo, igual
 *            Turma e Tarefa. Ver
 *            docs/PLANO_IMPLEMENTACAO_PERMISSOES_GRANULARES_GRUPOS.md,
 *            seção 1b.
 *
 *            1. ALTER aditivo no enum ConversaGrupoTipo (adiciona 'Projeto').
 *            2. Backfill: cria conversa_grupo (+ membros) pra todo
 *               grupoprojeto que ainda não tem — decisão explícita do
 *               usuário (2026-08-21): grupos antigos também ganham chat
 *               retroativamente, não só os criados a partir de agora.
 *
 *            Idempotente: o ALTER MODIFY é seguro de rodar mais de uma vez
 *            (mesmo padrão da migration de 'Submissao' em HistoricoTipo); o
 *            backfill só processa grupoprojeto sem conversa_grupo (LEFT JOIN
 *            IS NULL) e usa ON DUPLICATE KEY UPDATE nos membros.
 */

import MysqlDatabase from "../MysqlDatabase";
import { gerarGUID } from "../../utils/helpers/guid.helper";

async function runMigration() {
  console.log("🔧 Iniciando migration: chat-grupoprojeto");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    console.log("📝 Alterando enum conversa_grupo.ConversaGrupoTipo (+ 'Projeto')...");
    await pool.execute(`
      ALTER TABLE conversa_grupo
        MODIFY ConversaGrupoTipo ENUM('Turma','Tarefa','Projeto') NOT NULL;
    `);
    console.log("✅ Enum atualizado");

    console.log("📝 Buscando grupoprojeto sem conversa_grupo (backfill)...");
    const [gruposSemChat] = await pool.query(`
      SELECT gp.GrupoProjetoGUID, gp.UsuarioGUIDLider, p.ProjetoTitulo
      FROM grupoprojeto gp
      INNER JOIN projeto p ON p.ProjetoGUID = gp.ProjetoGUID
      LEFT JOIN conversa_grupo cg
        ON cg.ConversaGrupoTipo = 'Projeto' AND cg.ConversaGrupoRefGUID = gp.GrupoProjetoGUID
      WHERE cg.ConversaGUID IS NULL
    `);

    const grupos = gruposSemChat as Array<{ GrupoProjetoGUID: string; UsuarioGUIDLider: string; ProjetoTitulo: string }>;
    console.log(`📦 ${grupos.length} grupo(s) de projeto sem chat — criando retroativamente...`);

    let criados = 0;
    for (const grupo of grupos) {
      const conversaGUID = gerarGUID();

      await pool.execute(
        `INSERT INTO conversa (ConversaGUID, ConversaTipo, ConversaStatus) VALUES (?, 'Grupo', 'Ativa')`,
        [conversaGUID]
      );

      await pool.execute(
        `INSERT INTO conversa_grupo (ConversaGUID, ConversaGrupoNome, ConversaGrupoTipo, ConversaGrupoRefGUID)
         VALUES (?, ?, 'Projeto', ?)`,
        [conversaGUID, grupo.ProjetoTitulo, grupo.GrupoProjetoGUID]
      );

      await pool.execute(
        `INSERT INTO conversa_grupo_membro (ConversaGUID, MembroUsuarioGUID, MembroFuncao, MembroStatus, MembroEntradaAt, MembroSaidaAt)
         VALUES (?, ?, 'Lider', 'Ativo', NOW(), NULL)
         ON DUPLICATE KEY UPDATE MembroStatus = 'Ativo', MembroFuncao = 'Lider', MembroSaidaAt = NULL`,
        [conversaGUID, grupo.UsuarioGUIDLider]
      );

      const [membros] = await pool.query(
        `SELECT UsuarioGUID FROM usuarioxgrupoprojeto WHERE GrupoProjetoGUID = ?`,
        [grupo.GrupoProjetoGUID]
      );
      for (const membro of membros as Array<{ UsuarioGUID: string }>) {
        await pool.execute(
          `INSERT INTO conversa_grupo_membro (ConversaGUID, MembroUsuarioGUID, MembroFuncao, MembroStatus, MembroEntradaAt, MembroSaidaAt)
           VALUES (?, ?, 'Membro', 'Ativo', NOW(), NULL)
           ON DUPLICATE KEY UPDATE MembroStatus = 'Ativo', MembroSaidaAt = NULL`,
          [conversaGUID, membro.UsuarioGUID]
        );
      }

      criados++;
    }

    console.log(`✅ Backfill concluído: ${criados} conversa(s) criada(s)`);
    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
