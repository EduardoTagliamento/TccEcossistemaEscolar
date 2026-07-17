/**
 * Migration: Garantir anexo.AnexoCaminho com VARCHAR(500)
 * Data: 15/07/2026
 * Descrição: AnexoCaminho agora guarda a URL pública completa (Cloudflare R2).
 */

import MysqlDatabase from "../MysqlDatabase";

async function runMigration() {
  console.log("🔧 Iniciando migration: widen-anexocaminho");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    console.log("📝 Alterando coluna anexo.AnexoCaminho para VARCHAR(500)...");
    await pool.execute(`
      ALTER TABLE anexo
      MODIFY COLUMN AnexoCaminho VARCHAR(500) NOT NULL
    `);
    console.log("✅ Coluna anexo.AnexoCaminho alterada com sucesso");

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
