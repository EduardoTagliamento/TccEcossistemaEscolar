/**
 * Migration: Adicionar aulas por semana (padrão em materia, override em
 * materiaxprofessorxturma)
 * Data: 14/07/2026
 */

import MysqlDatabase from "../MysqlDatabase";

async function colunaExiste(pool: any, tabela: string, coluna: string): Promise<boolean> {
  const [rows] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME || "railway", tabela, coluna]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function runMigration() {
  console.log("🔧 Iniciando migration: add-aulas-por-semana");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    if (await colunaExiste(pool, "materia", "MateriaAulasPorSemanaPadrao")) {
      console.log("✅ Coluna materia.MateriaAulasPorSemanaPadrao já existe. Pulando.");
    } else {
      console.log("📝 Adicionando coluna materia.MateriaAulasPorSemanaPadrao...");
      await pool.execute(`
        ALTER TABLE materia
        ADD COLUMN MateriaAulasPorSemanaPadrao INT NULL AFTER MateriaIsTecnica
      `);
      console.log("✅ Coluna materia.MateriaAulasPorSemanaPadrao adicionada");
    }

    if (await colunaExiste(pool, "materiaxprofessorxturma", "AulasPorSemana")) {
      console.log("✅ Coluna materiaxprofessorxturma.AulasPorSemana já existe. Pulando.");
    } else {
      console.log("📝 Adicionando coluna materiaxprofessorxturma.AulasPorSemana...");
      await pool.execute(`
        ALTER TABLE materiaxprofessorxturma
        ADD COLUMN AulasPorSemana INT NULL AFTER AlocacaoStatus
      `);
      console.log("✅ Coluna materiaxprofessorxturma.AulasPorSemana adicionada");
    }

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
