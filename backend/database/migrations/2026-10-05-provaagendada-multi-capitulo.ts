/**
 * Migration: Permitir múltiplos capítulos por prova agendada
 * Data: 05/10/2026
 * Descrição: Cria tabela de ligação `provaagendadacapitulo` (N:N entre
 *            provaagendada e materialdidaticocapitulo), migra o único
 *            vínculo existente (coluna `MaterialDidaticoCapituloGUID` em
 *            `provaagendada`) e remove a coluna antiga.
 */

import MysqlDatabase from "../MysqlDatabase";
import { gerarGUID } from "../../utils/helpers/guid.helper";

async function runMigration() {
  console.log("🔧 Iniciando migration: 2026-10-05-provaagendada-multi-capitulo");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    const [tabelas] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'provaagendadacapitulo'`,
      [process.env.DB_NAME || "railway"]
    );

    if (Array.isArray(tabelas) && tabelas.length > 0) {
      console.log("✅ Tabela provaagendadacapitulo já existe. Migration ignorada.");
      process.exit(0);
    }

    console.log("📝 Criando tabela provaagendadacapitulo...");
    await pool.execute(`
      CREATE TABLE provaagendadacapitulo (
        ProvaAgendadaCapituloGUID CHAR(36) NOT NULL PRIMARY KEY,
        ProvaAgendadaGUID CHAR(36) NOT NULL,
        MaterialDidaticoCapituloGUID CHAR(36) NOT NULL,
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_provaagendadacapitulo (ProvaAgendadaGUID, MaterialDidaticoCapituloGUID),
        KEY idx_provaagendadacapitulo_capitulo (MaterialDidaticoCapituloGUID),
        CONSTRAINT fk_pac_prova FOREIGN KEY (ProvaAgendadaGUID)
          REFERENCES provaagendada (ProvaAgendadaGUID) ON DELETE CASCADE,
        CONSTRAINT fk_pac_capitulo FOREIGN KEY (MaterialDidaticoCapituloGUID)
          REFERENCES materialdidaticocapitulo (MaterialDidaticoCapituloGUID) ON DELETE CASCADE
      )
    `);
    console.log("✅ Tabela criada.");

    console.log("📝 Migrando vínculos existentes...");
    const [provasComCapitulo] = await pool.execute<any[]>(
      `SELECT ProvaAgendadaGUID, MaterialDidaticoCapituloGUID FROM provaagendada
       WHERE MaterialDidaticoCapituloGUID IS NOT NULL`
    );

    for (const prova of provasComCapitulo as any[]) {
      await pool.execute(
        `INSERT INTO provaagendadacapitulo (ProvaAgendadaCapituloGUID, ProvaAgendadaGUID, MaterialDidaticoCapituloGUID)
         VALUES (?, ?, ?)`,
        [gerarGUID(), prova.ProvaAgendadaGUID, prova.MaterialDidaticoCapituloGUID]
      );
    }
    console.log(`✅ ${(provasComCapitulo as any[]).length} vínculo(s) migrado(s).`);

    console.log("📝 Removendo coluna antiga MaterialDidaticoCapituloGUID...");
    await pool.execute(`ALTER TABLE provaagendada DROP COLUMN MaterialDidaticoCapituloGUID`);
    console.log("✅ Coluna removida.");

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
