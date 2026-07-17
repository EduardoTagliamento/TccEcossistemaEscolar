-- =====================================================
-- MIGRATION: Criar tabela horarioturma (cronograma/grade horária da turma)
-- Data: 2026-07-14
-- Descrição: Slots preenchidos do cronograma semanal de uma turma. Cada
--            linha ocupa um dia+horário com uma alocação matéria+professor
--            (materiaxprofessorxturma). Sem linha = slot vazio ("banco").
-- =====================================================

CREATE TABLE IF NOT EXISTS `horarioturma` (
  `HorarioTurmaGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `TurmaGUID` CHAR(36) NOT NULL,
  `MatProfTurGUID` CHAR(36) NOT NULL,
  `DiaSemana` ENUM('Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo') NOT NULL,
  `HoraInicio` VARCHAR(5) NOT NULL,
  `HoraFim` VARCHAR(5) NOT NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_horarioturma_turma_dia_hora` (`TurmaGUID`, `DiaSemana`, `HoraInicio`),
  INDEX `idx_horarioturma_matproftur` (`MatProfTurGUID`),
  CONSTRAINT `FK_HorarioTurma_Turma` FOREIGN KEY (`TurmaGUID`)
    REFERENCES `turma` (`TurmaGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `FK_HorarioTurma_MatProfTur` FOREIGN KEY (`MatProfTurGUID`)
    REFERENCES `materiaxprofessorxturma` (`MatProfTurGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- DROP TABLE IF EXISTS `horarioturma`;
