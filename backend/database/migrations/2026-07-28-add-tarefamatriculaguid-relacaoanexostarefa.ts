/**
 * Migration: TarefaMatriculaGUID em relacaoanexostarefa
 * Data: 28/07/2026
 * Descrição: ver 2026-07-28-add-tarefamatriculaguid-relacaoanexostarefa.sql
 *
 * ATENÇÃO: este script NÃO é executado automaticamente. Rodar manualmente
 * (`npx tsx backend/database/migrations/2026-07-28-add-tarefamatriculaguid-relacaoanexostarefa.ts`)
 * só depois de revisão, contra o banco correto.
 */
import MysqlDatabase from "../MysqlDatabase";

async function colunaExiste(pool: any, tabela: string, coluna: string): Promise<boolean> {
  const [linhas] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tabela, coluna]
  );
  return (linhas as any[]).length > 0;
}

async function runMigration() {
  console.log("🔧 Iniciando migration: tarefamatriculaguid-relacaoanexostarefa");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    const jaExiste = await colunaExiste(pool, "relacaoanexostarefa", "TarefaMatriculaGUID");
    if (jaExiste) {
      console.log("ℹ️  Coluna TarefaMatriculaGUID já existe — nada a fazer.");
      process.exit(0);
    }

    console.log("📝 Adicionando coluna TarefaMatriculaGUID em relacaoanexostarefa...");
    // COLLATE explícito: relacaoanexostarefa é utf8mb4_0900_ai_ci (padrão da
    // tabela), mas tarefaacademica_matricula.TarefaMatriculaGUID (PK
    // referenciada) é utf8mb4_unicode_ci — schema drift pré-existente entre
    // as duas tabelas. Sem casar a collation aqui, o ADD CONSTRAINT falha com
    // ER_FK_INCOMPATIBLE_COLUMNS (confirmado rodando contra produção).
    await pool.execute(`
      ALTER TABLE relacaoanexostarefa
        ADD COLUMN TarefaMatriculaGUID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER TarefaGUID,
        ADD INDEX idx_relacao_matricula (TarefaMatriculaGUID),
        ADD CONSTRAINT FK_RelacaoAnexoTarefa_Matricula FOREIGN KEY (TarefaMatriculaGUID)
          REFERENCES tarefaacademica_matricula(TarefaMatriculaGUID) ON UPDATE CASCADE ON DELETE CASCADE;
    `);
    console.log("✅ Coluna TarefaMatriculaGUID adicionada");

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
