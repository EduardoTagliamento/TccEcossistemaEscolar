/**
 * Migration: Adicionar MatriculaIdentificador em matricula
 * Data: 14/09/2026
 * Descrição: Campo não-chave, editável, default = cópia do MatriculaGUID —
 *            ver docs/PLANO_IMPLEMENTACAO_LOGIN_POR_ESCOLA.md, §3.2.
 *            Depois de adicionar a coluna, faz o backfill das matrículas já
 *            cadastradas copiando MatriculaGUID (sem risco de colisão, já
 *            que MatriculaGUID já é único).
 */

import MysqlDatabase from "../MysqlDatabase";

async function runMigration() {
  console.log("🔧 Iniciando migration: add-matricula-identificador");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'matricula' AND COLUMN_NAME = 'MatriculaIdentificador'`,
      [process.env.DB_NAME || "railway"]
    );

    if (Array.isArray(columns) && columns.length === 0) {
      console.log("📝 Adicionando coluna MatriculaIdentificador...");
      await pool.execute(`
        ALTER TABLE matricula
        ADD COLUMN MatriculaIdentificador VARCHAR(36) NULL AFTER MatriculaGUID,
        ADD INDEX idx_matricula_identificador (MatriculaIdentificador)
      `);
      console.log("✅ Coluna MatriculaIdentificador adicionada com sucesso");
    } else {
      console.log("✅ Coluna MatriculaIdentificador já existe. Pulando ALTER TABLE.");
    }

    console.log("📝 Backfill de MatriculaIdentificador (cópia de MatriculaGUID) para matrículas existentes...");
    const [resultado] = await pool.execute(
      `UPDATE matricula SET MatriculaIdentificador = MatriculaGUID WHERE MatriculaIdentificador IS NULL`
    );
    console.log(`✅ Backfill concluído (${(resultado as { affectedRows: number }).affectedRows} matrícula(s) atualizadas)`);

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
