/**
 * Migration: Adicionar ProvaTitulo em provaagendada
 * Descrição: Título próprio da prova, separado da descrição (antes a UI
 *            reusava ProvaDescricao inteira como "título", ficando redundante
 *            com a descrição mostrada logo abaixo). Rows existentes são
 *            preenchidas a partir da descrição atual (truncada a 128 chars)
 *            como fallback só pra não ficar em branco.
 */

import MysqlDatabase from "../MysqlDatabase";

async function runMigration() {
  console.log("🔧 Iniciando migration: add-provatitulo");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'provaagendada' AND COLUMN_NAME = 'ProvaTitulo'`,
      [process.env.DB_NAME || "railway"]
    );

    if (Array.isArray(columns) && columns.length > 0) {
      console.log("✅ Coluna ProvaTitulo já existe. Migration ignorada.");
      process.exit(0);
    }

    console.log("📝 Adicionando coluna ProvaTitulo (nullable)...");
    await pool.execute(`
      ALTER TABLE provaagendada
      ADD COLUMN ProvaTitulo VARCHAR(128) NULL AFTER MateriaGUID
    `);

    console.log("📝 Preenchendo ProvaTitulo das provas existentes a partir de ProvaDescricao...");
    await pool.execute(`
      UPDATE provaagendada
      SET ProvaTitulo = LEFT(TRIM(COALESCE(NULLIF(ProvaDescricao, ''), 'Prova')), 128)
      WHERE ProvaTitulo IS NULL
    `);

    console.log("📝 Tornando ProvaTitulo obrigatório (NOT NULL)...");
    await pool.execute(`
      ALTER TABLE provaagendada
      MODIFY COLUMN ProvaTitulo VARCHAR(128) NOT NULL
    `);

    console.log("✅ Coluna ProvaTitulo adicionada e preenchida com sucesso");
    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
