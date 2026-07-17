/**
 * Migration: Adicionar TarefaPrazoDataMatricula em tarefaacademica_matricula
 * Data: 14/07/2026
 * Descrição: Prazo próprio por aluno (agendamento automático), opcional —
 *            NULL usa o prazo compartilhado da tarefa.
 */

import MysqlDatabase from "../MysqlDatabase";

async function runMigration() {
  console.log("🔧 Iniciando migration: add-tarefaprazodatamatricula");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tarefaacademica_matricula' AND COLUMN_NAME = 'TarefaPrazoDataMatricula'`,
      [process.env.DB_NAME || "railway"]
    );

    if (Array.isArray(columns) && columns.length > 0) {
      console.log("✅ Coluna TarefaPrazoDataMatricula já existe. Migration ignorada.");
      process.exit(0);
    }

    console.log("📝 Adicionando coluna TarefaPrazoDataMatricula...");
    await pool.execute(`
      ALTER TABLE tarefaacademica_matricula
      ADD COLUMN TarefaPrazoDataMatricula DATETIME NULL AFTER MatriculaGUID
    `);
    console.log("✅ Coluna TarefaPrazoDataMatricula adicionada com sucesso");

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
