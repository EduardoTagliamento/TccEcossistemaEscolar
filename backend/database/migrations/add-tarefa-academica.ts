/**
 * Migration: Add TarefaAcademica Tables
 *
 * Adiciona as tabelas do sistema de Tarefas Acadêmicas:
 * - tarefaacademica (Tarefas atribuídas a alunos)
 * - relacaoanexostarefa (Vínculo bidirecional entre anexos e tarefas)
 *
 * Pré-requisitos:
 * - Tabela `matricula` existente
 * - Tabela `materiaxprofessorxturma` existente
 * - Tabela `anexo` existente
 *
 * Execução: npx tsx backend/database/migrations/add-tarefa-academica.ts
 */

import { pool } from "../mysql";

async function runMigration() {
  console.log("🔄 Iniciando migration: Add TarefaAcademica Tables...\n");

  try {
    // =====================================================
    // TABELA: tarefaacademica
    // =====================================================
    console.log("📋 Criando tabela 'tarefaacademica'...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS tarefaacademica (
        TarefaGUID CHAR(36) NOT NULL,
        MatriculaGUID VARCHAR(36) NOT NULL,
        matXprofXturxescGUID CHAR(36) NOT NULL,
        TarefaTitulo VARCHAR(128) NOT NULL,
        TarefaConteudo VARCHAR(1024) NULL,
        TarefaPostagemData DATETIME NOT NULL,
        TarefaPrazoData DATETIME NOT NULL,
        TarefaTipoEntrega ENUM('digital', 'fisica') NOT NULL,
        TarefaFeito BOOLEAN NOT NULL DEFAULT FALSE,
        TarefaRealizacaoData DATETIME NULL,
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (TarefaGUID),
        INDEX idx_tarefa_matricula (MatriculaGUID),
        INDEX idx_tarefa_matproftur (matXprofXturxescGUID),
        INDEX idx_tarefa_prazo (TarefaPrazoData),
        INDEX idx_tarefa_feito (TarefaFeito),
        INDEX idx_tarefa_tipo_entrega (TarefaTipoEntrega),
        CONSTRAINT FK_Tarefa_Matricula FOREIGN KEY (MatriculaGUID)
          REFERENCES matricula(MatriculaGUID)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT FK_Tarefa_MatProfTur FOREIGN KEY (matXprofXturxescGUID)
          REFERENCES materiaxprofessorxturma(matXprofXturxescGUID)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Tabela 'tarefaacademica' criada com sucesso!\n");

    // =====================================================
    // TABELA: relacaoanexostarefa
    // =====================================================
    console.log("🔗 Criando tabela 'relacaoanexostarefa'...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS relacaoanexostarefa (
        RelacaoAnexoTarefaGUID CHAR(36) NOT NULL,
        AnexoGUID CHAR(36) NOT NULL,
        TarefaGUID CHAR(36) NOT NULL,
        AnexoTipo ENUM('descricao', 'entrega') NOT NULL,
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (RelacaoAnexoTarefaGUID),
        INDEX idx_relacao_tarefa (TarefaGUID),
        INDEX idx_relacao_anexo (AnexoGUID),
        INDEX idx_relacao_tipo (AnexoTipo),
        CONSTRAINT FK_RelacaoAnexoTarefa_Anexo FOREIGN KEY (AnexoGUID)
          REFERENCES anexo(AnexoGUID)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT FK_RelacaoAnexoTarefa_Tarefa FOREIGN KEY (TarefaGUID)
          REFERENCES tarefaacademica(TarefaGUID)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Tabela 'relacaoanexostarefa' criada com sucesso!\n");

    console.log("✅ Migration concluída com sucesso!");
    console.log("\n📊 Resumo:");
    console.log("   - tarefaacademica: criada");
    console.log("   - relacaoanexostarefa: criada");
  } catch (error: any) {
    console.error("❌ Erro durante a migration:", error.message);
    throw error;
  } finally {
    await pool.end();
    console.log("\n🔌 Conexão com banco encerrada.");
  }
}

runMigration();
