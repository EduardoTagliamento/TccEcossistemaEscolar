-- =====================================================
-- FIX: Corrigir Foreign Key da tabela provaagendada_turma
-- Data: 19/05/2026
-- Descrição: A FK estava apontando para provaagendada_old_backup
--            ao invés de provaagendada após a migração
-- =====================================================

USE railway;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- Dropar a Foreign Key incorreta (se existir)
-- =====================================================

-- Dropar fk_provaagendadaturma_prova se existir
SET @drop_fk = (
  SELECT CONCAT('ALTER TABLE `provaagendada_turma` DROP FOREIGN KEY `', CONSTRAINT_NAME, '`')
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'provaagendada_turma'
    AND CONSTRAINT_NAME = 'fk_provaagendadaturma_prova'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @drop_fk = IFNULL(@drop_fk, 'SELECT "FK não encontrada" AS Info');
PREPARE stmt FROM @drop_fk; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

-- Dropar fk_provaagendadaturma_turma se existir
SET @drop_fk = (
  SELECT CONCAT('ALTER TABLE `provaagendada_turma` DROP FOREIGN KEY `', CONSTRAINT_NAME, '`')
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'provaagendada_turma'
    AND CONSTRAINT_NAME = 'fk_provaagendadaturma_turma'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @drop_fk = IFNULL(@drop_fk, 'SELECT "FK não encontrada" AS Info');
PREPARE stmt FROM @drop_fk; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

-- =====================================================
-- Recriar Foreign Keys corretas
-- =====================================================

-- FK para provaagendada
ALTER TABLE `provaagendada_turma`
ADD CONSTRAINT `fk_provaagendadaturma_prova` 
  FOREIGN KEY (`ProvaAgendadaGUID`) 
  REFERENCES `provaagendada` (`ProvaAgendadaGUID`) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- FK para turma
ALTER TABLE `provaagendada_turma`
ADD CONSTRAINT `fk_provaagendadaturma_turma` 
  FOREIGN KEY (`TurmaGUID`) 
  REFERENCES `turma` (`TurmaGUID`) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- Verificação
-- =====================================================

SELECT 
  CONSTRAINT_NAME,
  TABLE_NAME,
  REFERENCED_TABLE_NAME,
  DELETE_RULE,
  UPDATE_RULE
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'provaagendada_turma'
  AND CONSTRAINT_NAME LIKE 'fk_%'
ORDER BY CONSTRAINT_NAME;

SELECT '✅ Foreign keys corrigidas!' AS Status;
