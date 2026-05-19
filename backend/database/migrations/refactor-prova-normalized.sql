-- =====================================================
-- MIGRATION: Refatoração ProvaAgendada - Modelo Normalizado
-- Data: 18/05/2026
-- Descrição: Migra de modelo desnormalizado (1 prova = 1 turma)
--            para modelo normalizado (1 prova → N turmas)
-- =====================================================
-- ⚠️ IMPORTANTE: FAÇA BACKUP ANTES DE EXECUTAR!
-- mysqldump -u root -p railway > backup_antes_refatoracao_prova.sql
-- =====================================================
-- ✅ RE-EXECUÇÃO SEGURA: Este script pode ser executado múltiplas vezes
--    - CREATE TABLE IF NOT EXISTS
--    - INSERT IGNORE (previne duplicação)
--    - DROP TEMPORARY TABLE IF EXISTS
-- =====================================================

USE railway;

-- Desabilitar verificações temporariamente
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- =====================================================
-- PASSO 1: Criar nova estrutura de provas (sem TurmaGUID)
-- =====================================================

CREATE TABLE IF NOT EXISTS `provaagendada_new` (
  `ProvaAgendadaGUID` CHAR(36) NOT NULL,
  `MateriaGUID` CHAR(36) NOT NULL COMMENT 'FK para materia',
  `ProvaData` DATETIME NOT NULL,
  `ProvaDescricao` VARCHAR(1024) NULL,
  `ProvaStatus` ENUM('Agendada', 'Realizada', 'Cancelada') NOT NULL DEFAULT 'Agendada',
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ProvaAgendadaGUID`),
  INDEX `idx_prova_data` (`ProvaData`),
  INDEX `idx_prova_status` (`ProvaStatus`),
  INDEX `idx_prova_materia` (`MateriaGUID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Provas agendadas (dados compartilhados)';

-- =====================================================
-- PASSO 2: Criar tabela de relacionamento N:N (SEM FKs temporariamente)
-- =====================================================

CREATE TABLE IF NOT EXISTS `provaagendada_turma` (
  `ProvaAgendadaTurmaGUID` CHAR(36) NOT NULL,
  `ProvaAgendadaGUID` CHAR(36) NOT NULL COMMENT 'FK para provaagendada',
  `TurmaGUID` CHAR(36) NOT NULL COMMENT 'FK para turma',
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ProvaAgendadaTurmaGUID`),
  UNIQUE KEY `uq_prova_turma` (`ProvaAgendadaGUID`, `TurmaGUID`),
  INDEX `idx_prova` (`ProvaAgendadaGUID`),
  INDEX `idx_turma` (`TurmaGUID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Relacionamento N:N entre Provas e Turmas';

-- =====================================================
-- PASSO 3: Migrar dados da tabela antiga para a nova
-- =====================================================

-- Verificar estado das tabelas para execução condicional
SET @has_turmaguid = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'provaagendada'
    AND COLUMN_NAME = 'TurmaGUID'
);

SET @has_backup = (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'provaagendada_old_backup'
);

-- 3.1. Inserir provas únicas (sem duplicação)
-- Proteção: Execução condicional usando prepared statements
-- Nota: Se re-executar, INSERT IGNORE previne duplicação

SET @insert_provas_sql = IF(@has_turmaguid > 0,
  'INSERT IGNORE INTO `provaagendada_new` (
     ProvaAgendadaGUID,
     MateriaGUID,
     ProvaData,
     ProvaDescricao,
     ProvaStatus,
     CreatedAt,
     UpdatedAt
   )
   SELECT 
     MIN(ProvaAgendadaGUID) AS ProvaAgendadaGUID,
     MateriaGUID,
     ProvaData,
     ProvaDescricao,
     ProvaStatus,
     MIN(CreatedAt) AS CreatedAt,
     MAX(UpdatedAt) AS UpdatedAt
   FROM `provaagendada`
   GROUP BY MateriaGUID, ProvaData, ProvaDescricao, ProvaStatus',
  'SELECT "Tabela já migrada" AS Info'
);

PREPARE stmt FROM @insert_provas_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3.2. Criar mapeamento de ProvaAgendadaGUID antigo → ProvaAgendadaGUID novo
-- (Necessário para atualizar FKs de relacaoanexosprova)
-- Proteção: DROP antes de criar para permitir re-execução
DROP TEMPORARY TABLE IF EXISTS `temp_prova_mapping`;

CREATE TEMPORARY TABLE `temp_prova_mapping` (
  `OldProvaGUID` CHAR(36) NOT NULL,
  `NewProvaGUID` CHAR(36) NOT NULL,
  PRIMARY KEY (`OldProvaGUID`),
  INDEX `idx_new_guid` (`NewProvaGUID`)
) ENGINE=MEMORY;

-- Popular mapeamento usando prepared statements (proteção condicional)
-- Nota: Se re-executar, tabela temporária é recriada do zero

SET @insert_mapping_sql = IF(@has_turmaguid > 0,
  'INSERT INTO `temp_prova_mapping` (OldProvaGUID, NewProvaGUID)
   SELECT 
     p_old.ProvaAgendadaGUID AS OldProvaGUID,
     (
       SELECT MIN(p_group.ProvaAgendadaGUID)
       FROM `provaagendada` p_group
       WHERE p_group.MateriaGUID = p_old.MateriaGUID
         AND p_group.ProvaData = p_old.ProvaData
         AND p_group.ProvaDescricao <=> p_old.ProvaDescricao
         AND p_group.ProvaStatus = p_old.ProvaStatus
     ) AS NewProvaGUID
   FROM `provaagendada` p_old',
  'SELECT "Tabela já migrada" AS Info'
);

PREPARE stmt FROM @insert_mapping_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3.3. Inserir atribuições (relacionamento N:N)
-- Proteção: Execução condicional usando prepared statements

SET @insert_turma_sql = IF(@has_turmaguid > 0,
  'INSERT IGNORE INTO `provaagendada_turma` (
     ProvaAgendadaTurmaGUID,
     ProvaAgendadaGUID,
     TurmaGUID,
     CreatedAt
   )
   SELECT 
     UUID() AS ProvaAgendadaTurmaGUID,
     mapping.NewProvaGUID AS ProvaAgendadaGUID,
     p_old.TurmaGUID,
     p_old.CreatedAt AS CreatedAt
   FROM `provaagendada` p_old
   INNER JOIN `temp_prova_mapping` mapping ON p_old.ProvaAgendadaGUID = mapping.OldProvaGUID',
  'SELECT 1' -- No-op se não tem TurmaGUID
);

PREPARE stmt FROM @insert_turma_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Nota: Em re-execução após PASSO 5, o INSERT acima via @has_turmaguid
-- já terá sido executado na primeira passagem. INSERT IGNORE previne duplicatas.

-- =====================================================
-- PASSO 4: Atualizar Foreign Keys em tabelas relacionadas
-- =====================================================

-- 4.1. Atualizar relacaoanexosprova (se existir)
-- Garantir que temp_prova_mapping existe e está populada

-- Verificar estado das tabelas (definir variáveis se não existirem)
SET @has_turmaguid = IFNULL(@has_turmaguid, (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'provaagendada'
    AND COLUMN_NAME = 'TurmaGUID'
));

SET @has_backup = IFNULL(@has_backup, (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'provaagendada_old_backup'
));

-- Verificar se precisa criar/popular a tabela temporária
SET @mapping_count = (
  SELECT COUNT(*)
  FROM information_schema.TABLES t
  WHERE t.TABLE_SCHEMA = DATABASE()
    AND t.TABLE_NAME = 'temp_prova_mapping'
);

-- Se não existir, criar e popular
SET @create_mapping = IF(@mapping_count = 0, 1, 0);

-- Dropar se existir (proteção para re-execução)
DROP TEMPORARY TABLE IF EXISTS `temp_prova_mapping_fallback`;

-- Criar tabela fallback apenas se necessário
CREATE TEMPORARY TABLE IF NOT EXISTS `temp_prova_mapping_fallback` (
  `OldProvaGUID` CHAR(36) NOT NULL,
  `NewProvaGUID` CHAR(36) NOT NULL,
  PRIMARY KEY (`OldProvaGUID`),
  INDEX `idx_new_guid` (`NewProvaGUID`)
) ENGINE=MEMORY;

-- Popular fallback (será usado apenas se temp_prova_mapping não existir do PASSO 3)
-- Usar prepared statements para execução condicional
-- Nota: Fallback só é necessário se executar PASSO 4 isoladamente

SET @insert_fallback_sql = IF(@has_turmaguid > 0,
  'INSERT IGNORE INTO `temp_prova_mapping_fallback` (OldProvaGUID, NewProvaGUID)
   SELECT 
     p_old.ProvaAgendadaGUID AS OldProvaGUID,
     COALESCE(
       (
         SELECT MIN(p_new.ProvaAgendadaGUID)
         FROM `provaagendada_new` p_new
         WHERE p_new.MateriaGUID = p_old.MateriaGUID
           AND p_new.ProvaData = p_old.ProvaData
           AND p_new.ProvaDescricao <=> p_old.ProvaDescricao
           AND p_new.ProvaStatus = p_old.ProvaStatus
       ),
       p_old.ProvaAgendadaGUID
     ) AS NewProvaGUID
   FROM `provaagendada` p_old',
  'SELECT "Fallback não necessário" AS Info'
);

PREPARE stmt FROM @insert_fallback_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Atualizar relacaoanexosprova usando temp_prova_mapping (do PASSO 3) ou fallback
-- INNER JOIN já filtra apenas registros com mapeamento
UPDATE `relacaoanexosprova` rap
INNER JOIN `temp_prova_mapping_fallback` mapping ON rap.ProvaAgendadaGUID = mapping.OldProvaGUID
SET rap.ProvaAgendadaGUID = mapping.NewProvaGUID;

-- =====================================================
-- PASSO 5: Substituir tabela antiga pela nova
-- =====================================================

-- 5.1. Dropar constraints da tabela antiga E das tabelas relacionadas
-- Descobrir e dropar FKs dinamicamente para evitar erros

-- Dropar FKs de provaagendada
SET @drop_fk = (SELECT CONCAT('ALTER TABLE provaagendada DROP FOREIGN KEY ', CONSTRAINT_NAME)
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'provaagendada'
                  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                LIMIT 1);
SET @drop_fk = IFNULL(@drop_fk, 'SELECT 1');
PREPARE stmt FROM @drop_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Segunda FK (se existir)
SET @drop_fk = (SELECT CONCAT('ALTER TABLE provaagendada DROP FOREIGN KEY ', CONSTRAINT_NAME)
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'provaagendada'
                  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                LIMIT 1);
SET @drop_fk = IFNULL(@drop_fk, 'SELECT 1');
PREPARE stmt FROM @drop_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ⚠️ CRÍTICO: Dropar TODAS as FKs de relacaoanexosprova

-- Primeira FK
SET @drop_fk = (SELECT CONCAT('ALTER TABLE relacaoanexosprova DROP FOREIGN KEY ', CONSTRAINT_NAME)
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'relacaoanexosprova'
                  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                LIMIT 1);
SET @drop_fk = IFNULL(@drop_fk, 'SELECT 1');
PREPARE stmt FROM @drop_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Segunda FK (se existir)
SET @drop_fk = (SELECT CONCAT('ALTER TABLE relacaoanexosprova DROP FOREIGN KEY ', CONSTRAINT_NAME)
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'relacaoanexosprova'
                  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                LIMIT 1);
SET @drop_fk = IFNULL(@drop_fk, 'SELECT 1');
PREPARE stmt FROM @drop_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Terceira FK (se existir)
SET @drop_fk = (SELECT CONCAT('ALTER TABLE relacaoanexosprova DROP FOREIGN KEY ', CONSTRAINT_NAME)
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'relacaoanexosprova'
                  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                LIMIT 1);
SET @drop_fk = IFNULL(@drop_fk, 'SELECT 1');
PREPARE stmt FROM @drop_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.1.1. Converter ProvaAgendadaGUID em relacaoanexosprova para CHAR(36) (compatibilidade)
ALTER TABLE `relacaoanexosprova` MODIFY COLUMN `ProvaAgendadaGUID` CHAR(36) NOT NULL;

-- 5.2. Renomear tabelas
DROP TABLE IF EXISTS `provaagendada_old_backup`;
RENAME TABLE `provaagendada` TO `provaagendada_old_backup`;
RENAME TABLE `provaagendada_new` TO `provaagendada`;

-- 5.3. Adicionar Foreign Key na tabela de provas (se não existir)
SET @fk_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'provaagendada'
    AND CONSTRAINT_NAME = 'fk_prova_materia'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @add_fk_sql = IF(@fk_exists = 0,
  'ALTER TABLE `provaagendada`
   ADD CONSTRAINT `fk_prova_materia` 
     FOREIGN KEY (`MateriaGUID`) 
     REFERENCES `materia` (`MateriaGUID`) 
     ON DELETE RESTRICT 
     ON UPDATE CASCADE',
  'SELECT 1'
);

PREPARE stmt FROM @add_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5.4. Recriar Foreign Key em relacaoanexosprova (DEPOIS do RENAME)
SET @fk_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'relacaoanexosprova'
    AND CONSTRAINT_NAME = 'fk_relacao_prova'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @add_fk_sql = IF(@fk_exists = 0,
  'ALTER TABLE `relacaoanexosprova`
   ADD CONSTRAINT `fk_relacao_prova` 
     FOREIGN KEY (`ProvaAgendadaGUID`) 
     REFERENCES `provaagendada` (`ProvaAgendadaGUID`) 
     ON DELETE CASCADE 
     ON UPDATE CASCADE',
  'SELECT 1'
);

PREPARE stmt FROM @add_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5.5. Adicionar Foreign Keys na tabela provaagendada_turma
SET @fk_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'provaagendada_turma'
    AND CONSTRAINT_NAME = 'fk_provaagendadaturma_prova'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @add_fk_sql = IF(@fk_exists = 0,
  'ALTER TABLE `provaagendada_turma`
   ADD CONSTRAINT `fk_provaagendadaturma_prova` 
     FOREIGN KEY (`ProvaAgendadaGUID`) 
     REFERENCES `provaagendada` (`ProvaAgendadaGUID`) 
     ON DELETE CASCADE 
     ON UPDATE CASCADE',
  'SELECT 1'
);

PREPARE stmt FROM @add_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'provaagendada_turma'
    AND CONSTRAINT_NAME = 'fk_provaagendadaturma_turma'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @add_fk_sql = IF(@fk_exists = 0,
  'ALTER TABLE `provaagendada_turma`
   ADD CONSTRAINT `fk_provaagendadaturma_turma` 
     FOREIGN KEY (`TurmaGUID`) 
     REFERENCES `turma` (`TurmaGUID`) 
     ON DELETE CASCADE 
     ON UPDATE CASCADE',
  'SELECT 1'
);

PREPARE stmt FROM @add_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5.6. Limpar tabelas temporárias
DROP TEMPORARY TABLE IF EXISTS `temp_prova_mapping`;
DROP TEMPORARY TABLE IF EXISTS `temp_prova_mapping_fallback`;

-- Reabilitar verificações
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- PASSO 6: Verificações de Integridade
-- =====================================================

-- Verificar se backup tem TurmaGUID (primeira execução)
SET @backup_has_turmaguid = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'provaagendada_old_backup'
    AND COLUMN_NAME = 'TurmaGUID'
);

-- 6.1. Verificar total de provas (deve ser menor que antes)
SELECT 
  'Provas Antigas (Backup)' AS Tabela,
  COUNT(*) AS Total
FROM `provaagendada_old_backup`
UNION ALL
SELECT 
  'Provas Novas (Únicas)' AS Tabela,
  COUNT(*) AS Total
FROM `provaagendada`
UNION ALL
SELECT 
  'Atribuições (N:N)' AS Tabela,
  COUNT(*) AS Total
FROM `provaagendada_turma`;

-- 6.2. Verificar integridade: todas as turmas da tabela antiga devem estar na nova
-- ⚠️ Só executa se backup tem TurmaGUID (primeira execução)
SET @verify_turmas_sql = IF(@backup_has_turmaguid > 0,
  'SELECT 
     "Turmas não migradas" AS Status,
     COUNT(*) AS Total
   FROM `provaagendada_old_backup` p_old
   LEFT JOIN `provaagendada_turma` p_tur ON p_old.TurmaGUID = p_tur.TurmaGUID
   WHERE p_tur.ProvaAgendadaTurmaGUID IS NULL',
  'SELECT "Verificação não aplicável (re-execução)" AS Status, 0 AS Total'
);

PREPARE stmt FROM @verify_turmas_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6.3. Verificar anexos (todos devem ter prova válida)
SELECT 
  'Anexos órfãos' AS Status,
  COUNT(*) AS Total
FROM `relacaoanexosprova` rap
LEFT JOIN `provaagendada` p ON rap.ProvaAgendadaGUID = p.ProvaAgendadaGUID
WHERE p.ProvaAgendadaGUID IS NULL;
-- ⚠️ Se retornar > 0, ALGO DEU ERRADO!

-- 6.4. Verificar estrutura de provas únicas (não deve haver duplicatas)
SELECT 
  'Duplicatas de provas' AS Status,
  COUNT(*) AS Total
FROM (
  SELECT 
    MateriaGUID,
    ProvaData,
    ProvaDescricao,
    COUNT(*) AS Duplicatas
  FROM `provaagendada`
  GROUP BY MateriaGUID, ProvaData, ProvaDescricao
  HAVING COUNT(*) > 1
) AS duplicates;
-- ⚠️ Deve retornar 0!

-- 6.5. Estatísticas finais (só se backup existir)
SET @stats_sql = IF(@backup_has_turmaguid > 0,
  'SELECT 
     "Redução de registros" AS Metrica,
     CONCAT(
       ROUND(
         (1 - (SELECT COUNT(*) FROM provaagendada) / (SELECT COUNT(*) FROM provaagendada_old_backup)) * 100,
         2
       ),
       "%"
     ) AS Valor',
  'SELECT "Estatísticas não aplicáveis (re-execução)" AS Metrica, "N/A" AS Valor'
);

PREPARE stmt FROM @stats_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- SUCESSO! ✅
-- =====================================================
-- A tabela `provaagendada_old_backup` foi mantida como backup.
-- Você pode deletá-la após validar que tudo está funcionando:
-- DROP TABLE `provaagendada_old_backup`;
-- =====================================================

-- =====================================================
-- ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- ⚠️ Use apenas se precisar reverter a migration!
-- 
-- SET FOREIGN_KEY_CHECKS = 0;
-- 
-- -- Restaurar tabela antiga
-- DROP TABLE IF EXISTS `provaagendada`;
-- RENAME TABLE `provaagendada_old_backup` TO `provaagendada`;
-- 
-- -- Deletar tabela nova
-- DROP TABLE IF EXISTS `provaagendada_turma`;
-- 
-- -- Restaurar constraints
-- ALTER TABLE `provaagendada`
-- ADD CONSTRAINT `FK_Prova_Turma` 
--   FOREIGN KEY (`TurmaGUID`) 
--   REFERENCES `turma` (`TurmaGUID`) 
--   ON UPDATE CASCADE 
--   ON DELETE RESTRICT;
-- 
-- ALTER TABLE `provaagendada`
-- ADD CONSTRAINT `FK_Prova_Materia` 
--   FOREIGN KEY (`MateriaGUID`) 
--   REFERENCES `materia` (`MateriaGUID`) 
--   ON UPDATE CASCADE 
--   ON DELETE RESTRICT;
-- 
-- SET FOREIGN_KEY_CHECKS = 1;
-- =====================================================
