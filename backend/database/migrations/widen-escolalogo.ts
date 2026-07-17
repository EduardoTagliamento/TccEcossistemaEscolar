/**
 * Migration: Aumentar EscolaLogo para VARCHAR(500)
 * Data: 15/07/2026
 * Descrição: EscolaLogo agora guarda a URL pública completa (Cloudflare R2).
 */

import MysqlDatabase from "../MysqlDatabase";

async function runMigration() {
  console.log("🔧 Iniciando migration: widen-escolalogo");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    console.log("📝 Alterando coluna escola.EscolaLogo para VARCHAR(500)...");
    await pool.execute(`
      ALTER TABLE escola
      MODIFY COLUMN EscolaLogo VARCHAR(500) NULL
    `);
    console.log("✅ Coluna escola.EscolaLogo alterada com sucesso");

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
