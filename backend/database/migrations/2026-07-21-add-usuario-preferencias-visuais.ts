/**
 * Migration: Preferências visuais e de acessibilidade do usuário
 * Data: 21/07/2026
 * Descrição: Adiciona UsuarioTema, UsuarioModoDaltonico, UsuarioEscalaFonte,
 *            UsuarioReduzirMovimento e UsuarioAltoContraste na tabela usuario.
 *
 * ATENÇÃO: este script NÃO é executado automaticamente — ver aviso em
 * 2026-07-21-add-usuario-preferencias-visuais.sql. Rodar manualmente
 * (`npx tsx backend/database/migrations/2026-07-21-add-usuario-preferencias-visuais.ts`)
 * só depois de revisão, contra o banco correto.
 */
import MysqlDatabase from "../MysqlDatabase";

async function colunaExiste(pool: any, tabela: string, coluna: string): Promise<boolean> {
  const [linhas] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tabela, coluna]
  );
  return (linhas as any[]).length > 0;
}

async function adicionarColunaSeNaoExiste(
  pool: any,
  coluna: string,
  ddl: string
): Promise<void> {
  const jaExiste = await colunaExiste(pool, "usuario", coluna);
  if (jaExiste) {
    console.log(`ℹ️  Coluna ${coluna} já existe — nada a fazer.`);
    return;
  }
  console.log(`📝 Adicionando coluna ${coluna} em usuario...`);
  await pool.execute(ddl);
  console.log(`✅ Coluna ${coluna} adicionada`);
}

async function runMigration() {
  console.log("🔧 Iniciando migration: usuario-preferencias-visuais");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    await adicionarColunaSeNaoExiste(
      pool,
      "UsuarioTema",
      `ALTER TABLE usuario ADD COLUMN UsuarioTema VARCHAR(10) NOT NULL DEFAULT 'system' AFTER UsuarioFotoUrl;`
    );
    await adicionarColunaSeNaoExiste(
      pool,
      "UsuarioModoDaltonico",
      `ALTER TABLE usuario ADD COLUMN UsuarioModoDaltonico TINYINT(1) NOT NULL DEFAULT 0 AFTER UsuarioTema;`
    );
    await adicionarColunaSeNaoExiste(
      pool,
      "UsuarioEscalaFonte",
      `ALTER TABLE usuario ADD COLUMN UsuarioEscalaFonte VARCHAR(10) NOT NULL DEFAULT 'medium' AFTER UsuarioModoDaltonico;`
    );
    await adicionarColunaSeNaoExiste(
      pool,
      "UsuarioReduzirMovimento",
      `ALTER TABLE usuario ADD COLUMN UsuarioReduzirMovimento TINYINT(1) NOT NULL DEFAULT 0 AFTER UsuarioEscalaFonte;`
    );
    await adicionarColunaSeNaoExiste(
      pool,
      "UsuarioAltoContraste",
      `ALTER TABLE usuario ADD COLUMN UsuarioAltoContraste TINYINT(1) NOT NULL DEFAULT 0 AFTER UsuarioReduzirMovimento;`
    );

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
