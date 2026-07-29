/**
 * Migration: Tarefa tipo "lista" (quiz estilo Forms)
 * Data: 29/07/2026
 * Descrição: ver 2026-07-29-add-tarefa-lista.sql
 *
 * ATENÇÃO: este script NÃO é executado automaticamente. Rodar manualmente
 * (`npx tsx backend/database/migrations/2026-07-29-add-tarefa-lista.ts`)
 * só depois de revisão, contra o banco correto.
 */
import MysqlDatabase from "../MysqlDatabase";

async function tabelaExiste(pool: any, tabela: string): Promise<boolean> {
  const [linhas] = await pool.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tabela]
  );
  return (linhas as any[]).length > 0;
}

/**
 * Schema drift real confirmado contra produção (2026-07-29, via
 * INFORMATION_SCHEMA.COLUMNS): `tarefaacademica.TarefaGUID`, `anexo.AnexoGUID`
 * e `usuario.UsuarioCPF` estão em utf8mb4_0900_ai_ci, enquanto
 * `tarefaacademica_matricula.TarefaMatriculaGUID` está em utf8mb4_unicode_ci —
 * não é uniforme, e assumir um padrão fixo já causou dois erros nesta mesma
 * migration (ER_FK_INCOMPATIBLE_COLUMNS / erro 3780). Por isso toda coluna
 * referenciada por FK aqui é detectada em tempo de execução, não hardcoded.
 */
async function collationDaColuna(pool: any, tabela: string, coluna: string): Promise<string> {
  const [linhas] = await pool.execute(
    `SELECT COLLATION_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tabela, coluna]
  );
  const linha = (linhas as any[])[0];
  if (!linha?.COLLATION_NAME) {
    throw new Error(`Não foi possível detectar a collation de ${tabela}.${coluna} — a coluna existe?`);
  }
  return linha.COLLATION_NAME;
}

async function runMigration() {
  console.log("🔧 Iniciando migration: add-tarefa-lista");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    const jaExiste = await tabelaExiste(pool, "tarefaacademica_questao");
    if (jaExiste) {
      console.log("ℹ️  Tabela tarefaacademica_questao já existe — nada a fazer.");
      process.exit(0);
    }

    const anexoCollation = await collationDaColuna(pool, "anexo", "AnexoGUID");
    const tarefaCollation = await collationDaColuna(pool, "tarefaacademica", "TarefaGUID");
    const tarefaMatriculaCollation = await collationDaColuna(pool, "tarefaacademica_matricula", "TarefaMatriculaGUID");
    const usuarioCollation = await collationDaColuna(pool, "usuario", "UsuarioCPF");
    console.log(`ℹ️  Collations detectadas: anexo.AnexoGUID=${anexoCollation}, tarefaacademica.TarefaGUID=${tarefaCollation}, tarefaacademica_matricula.TarefaMatriculaGUID=${tarefaMatriculaCollation}, usuario.UsuarioCPF=${usuarioCollation}`);

    console.log("📝 Criando tabela tarefaacademica_questao...");
    await pool.execute(`
      CREATE TABLE tarefaacademica_questao (
        QuestaoGUID           CHAR(36) PRIMARY KEY,
        TarefaGUID             CHAR(36) CHARACTER SET utf8mb4 COLLATE ${tarefaCollation} NOT NULL,
        QuestaoEnunciado       TEXT NOT NULL,
        QuestaoTipo            ENUM('objetiva','discursiva') NOT NULL,
        QuestaoPontosMaximos   DECIMAL(4,2) NOT NULL DEFAULT 1.00,
        QuestaoExplicacao      TEXT NULL,
        QuestaoOrdem           INT NOT NULL DEFAULT 0,
        CreatedAt              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT FK_Questao_Tarefa FOREIGN KEY (TarefaGUID) REFERENCES tarefaacademica(TarefaGUID) ON DELETE CASCADE,
        INDEX idx_questao_tarefa (TarefaGUID)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ tarefaacademica_questao criada");

    console.log("📝 Criando tabela tarefaacademica_alternativa...");
    await pool.execute(`
      CREATE TABLE tarefaacademica_alternativa (
        AlternativaGUID    CHAR(36) PRIMARY KEY,
        QuestaoGUID         CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        AlternativaTexto    VARCHAR(512) NOT NULL,
        AlternativaCorreta  BOOLEAN NOT NULL DEFAULT FALSE,
        AlternativaPontos   DECIMAL(4,2) NOT NULL DEFAULT 0.00,
        AlternativaOrdem    INT NOT NULL DEFAULT 0,
        CreatedAt           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT FK_Alternativa_Questao FOREIGN KEY (QuestaoGUID) REFERENCES tarefaacademica_questao(QuestaoGUID) ON DELETE CASCADE,
        INDEX idx_alternativa_questao (QuestaoGUID)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ tarefaacademica_alternativa criada");

    console.log("📝 Criando tabela tarefaacademica_questao_anexo...");
    await pool.execute(`
      CREATE TABLE tarefaacademica_questao_anexo (
        QuestaoAnexoGUID  CHAR(36) PRIMARY KEY,
        QuestaoGUID        CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        AnexoGUID          CHAR(36) CHARACTER SET utf8mb4 COLLATE ${anexoCollation} NOT NULL,
        CreatedAt          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT FK_QuestaoAnexo_Questao FOREIGN KEY (QuestaoGUID) REFERENCES tarefaacademica_questao(QuestaoGUID) ON DELETE CASCADE,
        CONSTRAINT FK_QuestaoAnexo_Anexo FOREIGN KEY (AnexoGUID) REFERENCES anexo(AnexoGUID) ON DELETE CASCADE,
        INDEX idx_questaoanexo_questao (QuestaoGUID)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ tarefaacademica_questao_anexo criada");

    console.log("📝 Criando tabela tarefaacademica_resposta...");
    await pool.execute(`
      CREATE TABLE tarefaacademica_resposta (
        RespostaGUID              CHAR(36) PRIMARY KEY,
        TarefaMatriculaGUID        CHAR(36) CHARACTER SET utf8mb4 COLLATE ${tarefaMatriculaCollation} NOT NULL,
        QuestaoGUID                 CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        AlternativaGUID               CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
        RespostaTextoDiscursiva       TEXT NULL,
        RespostaPontosObtidos         DECIMAL(4,2) NULL,
        RespostaAvaliadoEm            TIMESTAMP NULL,
        RespostaAvaliadoPorCPF        VARCHAR(14) CHARACTER SET utf8mb4 COLLATE ${usuarioCollation} NULL,
        RespondidoEm                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CreatedAt                     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt                     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_resposta (TarefaMatriculaGUID, QuestaoGUID),
        CONSTRAINT FK_Resposta_Matricula FOREIGN KEY (TarefaMatriculaGUID) REFERENCES tarefaacademica_matricula(TarefaMatriculaGUID) ON DELETE CASCADE,
        CONSTRAINT FK_Resposta_Questao FOREIGN KEY (QuestaoGUID) REFERENCES tarefaacademica_questao(QuestaoGUID) ON DELETE CASCADE,
        CONSTRAINT FK_Resposta_Alternativa FOREIGN KEY (AlternativaGUID) REFERENCES tarefaacademica_alternativa(AlternativaGUID) ON DELETE SET NULL,
        CONSTRAINT FK_Resposta_Avaliador FOREIGN KEY (RespostaAvaliadoPorCPF) REFERENCES usuario(UsuarioCPF),
        INDEX idx_resposta_matricula (TarefaMatriculaGUID),
        INDEX idx_resposta_questao (QuestaoGUID)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ tarefaacademica_resposta criada");

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
