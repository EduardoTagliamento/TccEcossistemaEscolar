/**
 * Migration: Tracking de progresso por aluno no Banco de Questões
 * Data: 06/10/2026
 * Descrição: tabela `questaobancoprogresso` — 1 linha por (aluno, questão),
 *            com 2 flags independentes: `Feita` (resolveu, com `Acertou` e
 *            `FeitaEm`; some do pool de randomização) e `Marcada`
 *            (favoritar, independente de ter feito ou não).
 */

import MysqlDatabase from "../MysqlDatabase";

async function runMigration() {
  console.log("🔧 Iniciando migration: 2026-10-06-questaobanco-progresso-aluno");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    const [tabelas] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'questaobancoprogresso'`,
      [process.env.DB_NAME || "railway"]
    );

    if (Array.isArray(tabelas) && tabelas.length > 0) {
      console.log("✅ Tabela questaobancoprogresso já existe. Migration ignorada.");
      process.exit(0);
    }

    console.log("📝 Criando tabela questaobancoprogresso...");
    await pool.execute(`
      CREATE TABLE questaobancoprogresso (
        QuestaoBancoProgressoGUID CHAR(36) NOT NULL PRIMARY KEY,
        UsuarioGUID CHAR(36) NOT NULL,
        QuestaoBancoGUID CHAR(36) NOT NULL,
        Feita TINYINT(1) NOT NULL DEFAULT 0,
        Acertou TINYINT(1) NULL,
        FeitaEm TIMESTAMP NULL,
        Marcada TINYINT(1) NOT NULL DEFAULT 0,
        MarcadaEm TIMESTAMP NULL,
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_qbp_usuario_questao (UsuarioGUID, QuestaoBancoGUID),
        KEY idx_qbp_questao (QuestaoBancoGUID),
        CONSTRAINT fk_qbp_usuario FOREIGN KEY (UsuarioGUID)
          REFERENCES usuario (UsuarioGUID) ON DELETE CASCADE,
        CONSTRAINT fk_qbp_questao FOREIGN KEY (QuestaoBancoGUID)
          REFERENCES questaobanco (QuestaoBancoGUID) ON DELETE CASCADE
      )
    `);
    console.log("✅ Tabela criada.");

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
