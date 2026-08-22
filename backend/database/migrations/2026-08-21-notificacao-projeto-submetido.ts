/**
 * Migration: Notificação de submissão de projeto
 * Data: 21/08/2026
 * Descrição: Semeia o tipo `projeto_submetido` no catálogo notificacaotipo —
 *            usado por GrupoProjetoService.submeterProjeto() para avisar o
 *            criador do projeto quando um grupo submete a entrega. Ver
 *            docs/PLANO_IMPLEMENTACAO_PERMISSOES_GRANULARES_GRUPOS.md, seção 4e.
 *            Mesmo padrão idempotente (ON DUPLICATE KEY UPDATE) já usado em
 *            2026-07-19-add-projetos.ts.
 */

import MysqlDatabase from "../MysqlDatabase";

async function seedNotificacaoTipoFuncao(pool: any, slug: string, funcaoSubquery: string) {
  await pool.execute(`
    INSERT INTO notificacaotipofuncao (NotificacaoTipoId, FuncaoId)
    SELECT t.NotificacaoTipoId, f.FuncaoId
    FROM notificacaotipo t
    CROSS JOIN (${funcaoSubquery}) f
    WHERE t.NotificacaoTipoSlug = ?
    ON DUPLICATE KEY UPDATE notificacaotipofuncao.NotificacaoTipoId = notificacaotipofuncao.NotificacaoTipoId;
  `, [slug]);
}

async function runMigration() {
  console.log("🔧 Iniciando migration: notificacao-projeto-submetido");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    console.log("📝 Semeando catálogo notificacaotipo (projeto_submetido)...");
    await pool.execute(`
      INSERT INTO notificacaotipo
        (NotificacaoTipoSlug, NotificacaoTipoDescricao, NotificacaoTipoCategoria, NotificacaoTipoEmailPadrao, NotificacaoTipoWhatsappPadrao)
      VALUES
        ('projeto_submetido', 'Grupo submeteu a entrega de um projeto', 'Aviso', 1, 1)
      ON DUPLICATE KEY UPDATE
        NotificacaoTipoDescricao = VALUES(NotificacaoTipoDescricao),
        NotificacaoTipoCategoria = VALUES(NotificacaoTipoCategoria),
        NotificacaoTipoEmailPadrao = VALUES(NotificacaoTipoEmailPadrao),
        NotificacaoTipoWhatsappPadrao = VALUES(NotificacaoTipoWhatsappPadrao);
    `);
    console.log("✅ notificacaotipo semeado (projeto_submetido)");

    console.log("📝 Semeando notificacaotipofuncao (projeto_submetido → Professor(3)/Direção(6), mesmo público que pode criar projeto)...");
    await seedNotificacaoTipoFuncao(pool, "projeto_submetido", "SELECT 3 AS FuncaoId UNION ALL SELECT 6");
    console.log("✅ notificacaotipofuncao semeada");

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
