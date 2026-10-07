/**
 * Migration: Adicionar Ano em questaobanco
 * Data: 07/10/2026
 * Descrição: nova tela do Banco de Questões filtra por Vestibular, Ano e
 *            Dificuldade como dimensões independentes — hoje o ano só existe
 *            embutido no Nome do Vestibular (ex.: "ENEM 2023"), sem coluna
 *            própria. Adiciona `Ano` (SMALLINT, nullable) e faz backfill
 *            extraindo o ano de 4 dígitos do Nome do Vestibular vinculado.
 */

import MysqlDatabase from "../MysqlDatabase";

async function runMigration() {
  console.log("🔧 Iniciando migration: 2026-10-07-questaobanco-ano");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    const [colunas] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'questaobanco' AND COLUMN_NAME = 'Ano'`,
      [process.env.DB_NAME || "railway"]
    );

    if (Array.isArray(colunas) && colunas.length > 0) {
      console.log("✅ Coluna Ano já existe. Migration ignorada.");
      process.exit(0);
    }

    console.log("📝 Adicionando coluna Ano...");
    await pool.execute(`ALTER TABLE questaobanco ADD COLUMN Ano SMALLINT NULL AFTER VestibularGUID`);
    console.log("✅ Coluna adicionada.");

    console.log("📝 Backfill: extraindo ano do Nome do Vestibular vinculado...");
    const [resultado] = await pool.execute(`
      UPDATE questaobanco qb
      INNER JOIN vestibular v ON v.VestibularGUID = qb.VestibularGUID
      SET qb.Ano = CAST(REGEXP_SUBSTR(v.Nome, '(19|20)[0-9]{2}') AS UNSIGNED)
      WHERE qb.Ano IS NULL
    `);
    console.log(`✅ Backfill concluído (${(resultado as any).affectedRows} linha(s) atualizada(s)).`);

    const [[{ semAno }]] = await pool.execute<any[]>(
      `SELECT COUNT(*) as semAno FROM questaobanco WHERE Ano IS NULL`
    );
    if (semAno > 0) {
      console.warn(`⚠️  ${semAno} questão(ões) ficaram sem Ano (Vestibular sem ano parseável no Nome) — verificar manualmente.`);
    }

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
