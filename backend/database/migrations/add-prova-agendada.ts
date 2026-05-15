/**
 * Migration: Add ProvaAgendada Tables
 *
 * Adiciona as tabelas do sistema de Provas Agendadas:
 * - provaagendada (Provas por turma/matéria)
 * - relacaoanexosprova (Vínculo entre anexos e provas)
 *
 * Pré-requisitos:
 * - Tabela `turma` existente
 * - Tabela `materia` existente
 * - Tabela `anexo` existente
 *
 * Execução: npx tsx backend/database/migrations/add-prova-agendada.ts
 */

import { pool } from "../mysql";

async function runMigration() {
  console.log("🔄 Iniciando migration: Add ProvaAgendada Tables...\n");

  try {
    // =====================================================
    // TABELA: provaagendada
    // =====================================================
    console.log("📝 Criando tabela 'provaagendada'...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS provaagendada (
        ProvaAgendadaGUID CHAR(36) NOT NULL,
        TurmaGUID CHAR(36) NOT NULL,
        MateriaGUID CHAR(36) NOT NULL,
        ProvaData DATETIME NOT NULL,
        ProvaDescricao VARCHAR(1024) NULL,
        ProvaStatus ENUM('Agendada', 'Realizada', 'Cancelada') NOT NULL DEFAULT 'Agendada',
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (ProvaAgendadaGUID),
        INDEX idx_prova_data (ProvaData),
        INDEX idx_prova_status (ProvaStatus),
        INDEX idx_prova_turma (TurmaGUID),
        INDEX idx_prova_materia (MateriaGUID),
        CONSTRAINT FK_Prova_Turma FOREIGN KEY (TurmaGUID)
          REFERENCES turma(TurmaGUID)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT FK_Prova_Materia FOREIGN KEY (MateriaGUID)
          REFERENCES materia(MateriaGUID)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Tabela 'provaagendada' criada com sucesso!\n");

    // =====================================================
    // TABELA: relacaoanexosprova
    // =====================================================
    console.log("🔗 Criando tabela 'relacaoanexosprova'...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS relacaoanexosprova (
        RelacaoAnexoProvaGUID CHAR(36) NOT NULL,
        AnexoGUID CHAR(36) NOT NULL,
        ProvaAgendadaGUID CHAR(36) NOT NULL,
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (RelacaoAnexoProvaGUID),
        INDEX idx_relacao_prova (ProvaAgendadaGUID),
        INDEX idx_relacao_anexo_prova (AnexoGUID),
        CONSTRAINT FK_RelacaoAnexoProva_Anexo FOREIGN KEY (AnexoGUID)
          REFERENCES anexo(AnexoGUID)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT FK_RelacaoAnexoProva_Prova FOREIGN KEY (ProvaAgendadaGUID)
          REFERENCES provaagendada(ProvaAgendadaGUID)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Tabela 'relacaoanexosprova' criada com sucesso!\n");

    console.log("✅ Migration concluída com sucesso!");
    console.log("\n📊 Resumo:");
    console.log("   - provaagendada: criada");
    console.log("   - relacaoanexosprova: criada");
  } catch (error: any) {
    console.error("❌ Erro durante a migration:", error.message);
    throw error;
  } finally {
    await pool.end();
    console.log("\n🔌 Conexão com banco encerrada.");
  }
}

runMigration();
