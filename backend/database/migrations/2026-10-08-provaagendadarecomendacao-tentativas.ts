/**
 * Migration: Adicionar TentativasResumo em provaagendadarecomendacao
 * Data: 08/10/2026
 * Descrição: o resumo de IA de uma prova pode falhar sem erro registrado
 *            (StatusGeracao continua 'Concluida' se vídeo/página de livro
 *            deram certo — só o resumo em si fica null, falha parcial sem
 *            rastro). Casos reais: cota de "cheio" esgotada E fallback
 *            "leve" deu timeout (prova "Matemática AP", 08/10/2026). Essa
 *            coluna conta quantas vezes já tentamos reprocessar SÓ o
 *            resumo faltante, pra um scheduler novo poder tentar de novo
 *            automaticamente sem reprocessar pra sempre um caso que nunca
 *            vai dar certo (ex.: prova sem nenhuma fonte de texto real).
 */

import MysqlDatabase from "../MysqlDatabase";

async function runMigration() {
  console.log("🔧 Iniciando migration: 2026-10-08-provaagendadarecomendacao-tentativas");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    const [colunas] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'provaagendadarecomendacao' AND COLUMN_NAME = 'TentativasResumo'`,
      [process.env.DB_NAME || "railway"]
    );

    if (Array.isArray(colunas) && colunas.length > 0) {
      console.log("✅ Coluna TentativasResumo já existe. Migration ignorada.");
      process.exit(0);
    }

    console.log("📝 Adicionando coluna TentativasResumo...");
    await pool.execute(
      `ALTER TABLE provaagendadarecomendacao ADD COLUMN TentativasResumo SMALLINT NOT NULL DEFAULT 0 AFTER ResumoTexto`
    );
    console.log("✅ Coluna adicionada.");

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
