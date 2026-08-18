/**
 * Migration: Corrige linguagem de gênero nas descrições de notificacaotipo
 * Data: 17/08/2026
 * Descrição: `NotificacaoTipoDescricao` é exibida ao usuário na tela de
 *            configurações de notificação (frontend/.../notificacoes/configuracoes/page.tsx).
 *            Algumas descrições usavam particípio no masculino
 *            ("Promovido a...", "Removido de...", "Matriculado em...") —
 *            padronizando pra forma mista ("Promovido(a)...") já usada em
 *            outros textos do sistema (ex.: "Eleito(a) para a Direção").
 */

import MysqlDatabase from "../MysqlDatabase";

const CORRECOES: Array<{ slug: string; descricao: string }> = [
  { slug: "promovido_representante", descricao: "Promovido(a) a representante" },
  { slug: "promovido_vice_representante", descricao: "Promovido(a) a vice-representante" },
  { slug: "removido_vice_representante", descricao: "Removido(a) do cargo de vice-representante" },
  { slug: "removido_grupo", descricao: "Removido(a) de um grupo" },
  { slug: "matricula_nova_turma", descricao: "Matriculado(a) em nova turma" },
  { slug: "removido_grupo_projeto", descricao: "Removido(a) de um grupo de projeto" },
];

async function runMigration() {
  console.log("🔧 Iniciando migration: correção de gênero em notificacaotipo");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    for (const { slug, descricao } of CORRECOES) {
      const [result]: any = await pool.execute(
        `UPDATE notificacaotipo SET NotificacaoTipoDescricao = ? WHERE NotificacaoTipoSlug = ?`,
        [descricao, slug]
      );
      console.log(`📝 ${slug}: ${result.affectedRows} linha(s) atualizada(s)`);
    }

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
