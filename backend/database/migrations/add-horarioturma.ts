/**
 * Migration: Criar tabela horarioturma (cronograma/grade horária da turma)
 * Data: 14/07/2026
 */

import MysqlDatabase from "../MysqlDatabase";

async function runMigration() {
  console.log("🔧 Iniciando migration: add-horarioturma");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    console.log("📝 Criando tabela horarioturma (se não existir)...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS horarioturma (
        HorarioTurmaGUID CHAR(36) NOT NULL PRIMARY KEY,
        TurmaGUID CHAR(36) NOT NULL,
        MatProfTurGUID CHAR(36) NOT NULL,
        DiaSemana ENUM('Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo') NOT NULL,
        HoraInicio VARCHAR(5) NOT NULL,
        HoraFim VARCHAR(5) NOT NULL,
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_horarioturma_turma_dia_hora (TurmaGUID, DiaSemana, HoraInicio),
        INDEX idx_horarioturma_matproftur (MatProfTurGUID),
        CONSTRAINT FK_HorarioTurma_Turma FOREIGN KEY (TurmaGUID)
          REFERENCES turma (TurmaGUID)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT FK_HorarioTurma_MatProfTur FOREIGN KEY (MatProfTurGUID)
          REFERENCES materiaxprofessorxturma (MatProfTurGUID)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      );
    `);
    console.log("✅ Tabela horarioturma pronta");

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
