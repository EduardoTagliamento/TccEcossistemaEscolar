/**
 * Migration: Foto de perfil do usuário
 * Data: 19/07/2026
 * Descrição: Adiciona UsuarioFotoUrl na tabela usuario.
 */

import MysqlDatabase from "../MysqlDatabase";

async function colunaExiste(pool: any, tabela: string, coluna: string): Promise<boolean> {
  const [linhas] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tabela, coluna]
  );
  return (linhas as any[]).length > 0;
}

async function runMigration() {
  console.log("🔧 Iniciando migration: usuario-foto");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    const jaExiste = await colunaExiste(pool, "usuario", "UsuarioFotoUrl");
    if (jaExiste) {
      console.log("ℹ️  Coluna UsuarioFotoUrl já existe — nada a fazer.");
    } else {
      console.log("📝 Adicionando coluna UsuarioFotoUrl em usuario...");
      await pool.execute(`ALTER TABLE usuario ADD COLUMN UsuarioFotoUrl VARCHAR(500) NULL AFTER UsuarioEmail;`);
      console.log("✅ Coluna UsuarioFotoUrl adicionada");
    }

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
