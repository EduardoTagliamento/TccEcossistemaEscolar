/**
 * Migration: Adicionar ProvaDataTurma em provaagendada_turma
 * Data: 14/07/2026
 * Descrição: Data/hora própria por turma (agendamento automático),
 *            opcional — NULL usa a data compartilhada da prova.
 */

import MysqlDatabase from "../MysqlDatabase";

async function runMigration() {
  console.log("🔧 Iniciando migration: add-provadataturma");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'provaagendada_turma' AND COLUMN_NAME = 'ProvaDataTurma'`,
      [process.env.DB_NAME || "railway"]
    );

    if (Array.isArray(columns) && columns.length > 0) {
      console.log("✅ Coluna ProvaDataTurma já existe. Migration ignorada.");
      process.exit(0);
    }

    console.log("📝 Adicionando coluna ProvaDataTurma...");
    await pool.execute(`
      ALTER TABLE provaagendada_turma
      ADD COLUMN ProvaDataTurma DATETIME NULL AFTER TurmaGUID
    `);
    console.log("✅ Coluna ProvaDataTurma adicionada com sucesso");

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
