-- =====================================================
-- MIGRATION: Refatoração TarefaAcademica - Modelo Normalizado
-- Data: 18/05/2026
-- Descrição: Migra de modelo desnormalizado (1 tarefa = 1 aluno)
--            para modelo normalizado (1 tarefa → N alunos)
-- =====================================================
-- ⚠️ IMPORTANTE: FAÇA BACKUP ANTES DE EXECUTAR!
-- mysqldump -u root -p railway > backup_antes_refatoracao.sql
-- =====================================================

USE railway;

-- Desabilitar verificações temporariamente
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- =====================================================
-- PASSO 1: Criar nova estrutura de tarefas (sem MatriculaGUID)
-- =====================================================

CREATE TABLE IF NOT EXISTS `tarefaacademica_new` (
  `TarefaGUID` CHAR(36) NOT NULL,
  `matXprofXturxescGUID` CHAR(36) NOT NULL COMMENT 'FK para materiaxprofessorxturma',
  `TarefaTitulo` VARCHAR(255) NOT NULL,
  `TarefaConteudo` TEXT,
  `TarefaPostagemData` DATETIME NOT NULL,
  `TarefaPrazoData` DATETIME NOT NULL,
  `TarefaTipoEntrega` VARCHAR(50) NOT NULL DEFAULT 'Arquivo',
  `TarefaCreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `TarefaUpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`TarefaGUID`),
  INDEX `idx_matXprofXturxescGUID` (`matXprofXturxescGUID`),
  INDEX `idx_prazo_postagem` (`TarefaPrazoData`, `TarefaPostagemData`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tarefas acadêmicas (dados compartilhados)';

-- =====================================================
-- PASSO 2: Criar tabela de relacionamento N:N (SEM FKs temporariamente)
-- =====================================================

CREATE TABLE IF NOT EXISTS `tarefaacademica_matricula` (
  `TarefaMatriculaGUID` CHAR(36) NOT NULL,
  `TarefaGUID` CHAR(36) NOT NULL COMMENT 'FK para tarefaacademica',
  `MatriculaGUID` CHAR(36) NOT NULL COMMENT 'FK para matricula',
  `TarefaFeito` BOOLEAN NOT NULL DEFAULT FALSE,
  `TarefaRealizacaoData` DATETIME NULL,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`TarefaMatriculaGUID`),
  UNIQUE KEY `uq_tarefa_matricula` (`TarefaGUID`, `MatriculaGUID`),
  INDEX `idx_tarefa` (`TarefaGUID`),
  INDEX `idx_matricula` (`MatriculaGUID`),
  INDEX `idx_feito` (`TarefaFeito`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Relacionamento N:N entre Tarefas e Matrículas';

-- =====================================================
-- PASSO 3: Migrar dados da tabela antiga para a nova
-- =====================================================

-- 3.0. Verificar/Corrigir tipo de matXprofXturxescGUID na tabela antiga (se necessário)
-- A tabela antiga pode ter VARCHAR(255) quando deveria ser CHAR(36)
ALTER TABLE `tarefaacademica` MODIFY COLUMN `matXprofXturxescGUID` CHAR(36) NOT NULL;

-- 3.1. Inserir tarefas únicas (sem duplicação)
-- Agrupa por campos compartilhados e mantém o primeiro TarefaGUID de cada grupo
INSERT INTO `tarefaacademica_new` (
  TarefaGUID,
  matXprofXturxescGUID,
  TarefaTitulo,
  TarefaConteudo,
  TarefaPostagemData,
  TarefaPrazoData,
  TarefaTipoEntrega,
  TarefaCreatedAt,
  TarefaUpdatedAt
)
SELECT 
  MIN(TarefaGUID) AS TarefaGUID, -- Mantém o primeiro GUID do grupo
  matXprofXturxescGUID,
  TarefaTitulo,
  TarefaConteudo,
  TarefaPostagemData,
  TarefaPrazoData,
  TarefaTipoEntrega,
  MIN(CreatedAt) AS TarefaCreatedAt,
  MAX(UpdatedAt) AS TarefaUpdatedAt
FROM `tarefaacademica`
GROUP BY 
  matXprofXturxescGUID,
  TarefaTitulo,
  TarefaConteudo,
  TarefaPostagemData,
  TarefaPrazoData,
  TarefaTipoEntrega;

-- 3.2. Criar mapeamento de TarefaGUID antigo → TarefaGUID novo
-- (Necessário para atualizar FKs de relacaoanexostarefa)
CREATE TEMPORARY TABLE `temp_tarefa_mapping` (
  `OldTarefaGUID` CHAR(36) NOT NULL,
  `NewTarefaGUID` CHAR(36) NOT NULL,
  PRIMARY KEY (`OldTarefaGUID`),
  INDEX `idx_new_guid` (`NewTarefaGUID`)
) ENGINE=MEMORY;

INSERT INTO `temp_tarefa_mapping` (OldTarefaGUID, NewTarefaGUID)
SELECT 
  t_old.TarefaGUID AS OldTarefaGUID,
  (
    SELECT MIN(t_group.TarefaGUID)
    FROM `tarefaacademica` t_group
    WHERE t_group.matXprofXturxescGUID = t_old.matXprofXturxescGUID
      AND t_group.TarefaTitulo = t_old.TarefaTitulo
      AND t_group.TarefaConteudo <=> t_old.TarefaConteudo
      AND t_group.TarefaPostagemData = t_old.TarefaPostagemData
      AND t_group.TarefaPrazoData = t_old.TarefaPrazoData
      AND t_group.TarefaTipoEntrega = t_old.TarefaTipoEntrega
  ) AS NewTarefaGUID
FROM `tarefaacademica` t_old;

-- 3.3. Inserir atribuições (relacionamento N:N)
INSERT INTO `tarefaacademica_matricula` (
  TarefaMatriculaGUID,
  TarefaGUID,
  MatriculaGUID,
  TarefaFeito,
  TarefaRealizacaoData,
  CreatedAt,
  UpdatedAt
)
SELECT 
  UUID() AS TarefaMatriculaGUID,
  mapping.NewTarefaGUID AS TarefaGUID,
  t_old.MatriculaGUID,
  t_old.TarefaFeito,
  t_old.TarefaRealizacaoData,
  t_old.CreatedAt AS CreatedAt,
  t_old.UpdatedAt AS UpdatedAt
FROM `tarefaacademica` t_old
INNER JOIN `temp_tarefa_mapping` mapping ON t_old.TarefaGUID = mapping.OldTarefaGUID;

-- =====================================================
-- PASSO 4: Atualizar Foreign Keys em tabelas relacionadas
-- =====================================================

-- 4.1. Atualizar relacaoanexostarefa (se existir)
UPDATE `relacaoanexostarefa` rat
INNER JOIN `temp_tarefa_mapping` mapping ON rat.TarefaGUID = mapping.OldTarefaGUID
SET rat.TarefaGUID = mapping.NewTarefaGUID
WHERE rat.TarefaGUID IN (SELECT OldTarefaGUID FROM temp_tarefa_mapping);

-- =====================================================
-- PASSO 5: Substituir tabela antiga pela nova
-- =====================================================

-- 5.1. Dropar constraints da tabela antiga E das tabelas relacionadas
-- Descobrir e dropar FKs dinamicamente para evitar erros

-- Dropar FKs de tarefaacademica
SET @drop_fk = (SELECT CONCAT('ALTER TABLE tarefaacademica DROP FOREIGN KEY ', CONSTRAINT_NAME, ';')
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'tarefaacademica'
                  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                  AND CONSTRAINT_NAME = 'fk_tarefa_alocacao'
                LIMIT 1);
SET @drop_fk = IFNULL(@drop_fk, 'SELECT 1;');
PREPARE stmt FROM @drop_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @drop_fk = (SELECT CONCAT('ALTER TABLE tarefaacademica DROP FOREIGN KEY ', CONSTRAINT_NAME, ';')
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'tarefaacademica'
                  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                  AND CONSTRAINT_NAME = 'fk_tarefa_matricula'
                LIMIT 1);
SET @drop_fk = IFNULL(@drop_fk, 'SELECT 1;');
PREPARE stmt FROM @drop_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ⚠️ CRÍTICO: Dropar TODAS as FKs de relacaoanexostarefa
-- Executar múltiplas vezes para garantir que todas sejam dropadas

-- Primeira FK
SET @drop_fk = (SELECT CONCAT('ALTER TABLE relacaoanexostarefa DROP FOREIGN KEY ', CONSTRAINT_NAME)
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'relacaoanexostarefa'
                  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                LIMIT 1);
SET @drop_fk = IFNULL(@drop_fk, 'SELECT 1');
PREPARE stmt FROM @drop_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Segunda FK (se existir)
SET @drop_fk = (SELECT CONCAT('ALTER TABLE relacaoanexostarefa DROP FOREIGN KEY ', CONSTRAINT_NAME)
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'relacaoanexostarefa'
                  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                LIMIT 1);
SET @drop_fk = IFNULL(@drop_fk, 'SELECT 1');
PREPARE stmt FROM @drop_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Terceira FK (se existir)
SET @drop_fk = (SELECT CONCAT('ALTER TABLE relacaoanexostarefa DROP FOREIGN KEY ', CONSTRAINT_NAME)
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'relacaoanexostarefa'
                  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                LIMIT 1);
SET @drop_fk = IFNULL(@drop_fk, 'SELECT 1');
PREPARE stmt FROM @drop_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5.1.1. Converter TarefaGUID em relacaoanexostarefa para CHAR(36) (compatibilidade)
ALTER TABLE `relacaoanexostarefa` MODIFY COLUMN `TarefaGUID` CHAR(36) NOT NULL;

-- 5.2. Renomear tabelas
DROP TABLE IF EXISTS `tarefaacademica_old_backup`;
RENAME TABLE `tarefaacademica` TO `tarefaacademica_old_backup`;
RENAME TABLE `tarefaacademica_new` TO `tarefaacademica`;

-- 5.3. Adicionar Foreign Key na tabela de tarefas
ALTER TABLE `tarefaacademica`
ADD CONSTRAINT `fk_tarefa_alocacao` 
  FOREIGN KEY (`matXprofXturxescGUID`) 
  REFERENCES `materiaxprofessorxturma` (`MatProfTurGUID`) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- 5.4. Recriar Foreign Key em relacaoanexostarefa (DEPOIS do RENAME)
ALTER TABLE `relacaoanexostarefa`
ADD CONSTRAINT `fk_relacao_tarefa` 
  FOREIGN KEY (`TarefaGUID`) 
  REFERENCES `tarefaacademica` (`TarefaGUID`) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- 5.5. Adicionar Foreign Keys na tabela tarefaacademica_matricula
ALTER TABLE `tarefaacademica_matricula`
ADD CONSTRAINT `fk_tarefamatricula_tarefa` 
  FOREIGN KEY (`TarefaGUID`) 
  REFERENCES `tarefaacademica` (`TarefaGUID`) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

ALTER TABLE `tarefaacademica_matricula`
ADD CONSTRAINT `fk_tarefamatricula_matricula` 
  FOREIGN KEY (`MatriculaGUID`) 
  REFERENCES `matricula` (`MatriculaGUID`) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- 5.6. Limpar tabela temporária
DROP TEMPORARY TABLE IF EXISTS `temp_tarefa_mapping`;

-- Reabilitar verificações
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- PASSO 6: Verificações de Integridade
-- =====================================================

-- 6.1. Verificar total de tarefas (deve ser menor que antes)
SELECT 
  'Tarefas Antigas' AS Tabela,
  COUNT(*) AS Total
FROM `tarefaacademica_old_backup`
UNION ALL
SELECT 
  'Tarefas Novas (Únicas)' AS Tabela,
  COUNT(*) AS Total
FROM `tarefaacademica`
UNION ALL
SELECT 
  'Atribuições (N:N)' AS Tabela,
  COUNT(*) AS Total
FROM `tarefaacademica_matricula`;

-- 6.2. Verificar integridade: todas as matrículas da tabela antiga devem estar na nova
SELECT 
  'Matrículas não migradas' AS Status,
  COUNT(*) AS Total
FROM `tarefaacademica_old_backup` t_old
LEFT JOIN `tarefaacademica_matricula` t_mat ON t_old.MatriculaGUID = t_mat.MatriculaGUID
WHERE t_mat.TarefaMatriculaGUID IS NULL;
-- ⚠️ Se retornar > 0, ALGO DEU ERRADO!

-- 6.3. Verificar anexos (todos devem ter tarefa válida)
SELECT 
  'Anexos órfãos' AS Status,
  COUNT(*) AS Total
FROM `relacaoanexostarefa` rat
LEFT JOIN `tarefaacademica` t ON rat.TarefaGUID = t.TarefaGUID
WHERE t.TarefaGUID IS NULL;
-- ⚠️ Se retornar > 0, ALGO DEU ERRADO!

-- 6.4. Verificar estrutura de tarefas únicas (não deve haver duplicatas)
SELECT 
  matXprofXturxescGUID,
  TarefaTitulo,
  TarefaPostagemData,
  COUNT(*) AS Duplicatas
FROM `tarefaacademica`
GROUP BY matXprofXturxescGUID, TarefaTitulo, TarefaPostagemData
HAVING COUNT(*) > 1;
-- ⚠️ Deve retornar 0 linhas!

-- 6.5. Estatísticas finais
SELECT 
  'Redução de registros' AS Metrica,
  CONCAT(
    ROUND(
      (1 - (SELECT COUNT(*) FROM tarefaacademica) / (SELECT COUNT(*) FROM tarefaacademica_old_backup)) * 100,
      2
    ),
    '%'
  ) AS Valor;

-- =====================================================
-- SUCESSO! ✅
-- =====================================================
-- A tabela `tarefaacademica_old_backup` foi mantida como backup.
-- Você pode deletá-la após validar que tudo está funcionando:
-- DROP TABLE `tarefaacademica_old_backup`;
-- =====================================================

-- =====================================================
-- ROLLBACK (SE NECESSÁRIO)
-- =====================================================
-- ⚠️ Use apenas se precisar reverter a migration!
-- 
-- SET FOREIGN_KEY_CHECKS = 0;
-- 
-- -- Restaurar tabela antiga
-- DROP TABLE IF EXISTS `tarefaacademica`;
-- RENAME TABLE `tarefaacademica_old_backup` TO `tarefaacademica`;
-- 
-- -- Deletar tabela nova
-- DROP TABLE IF EXISTS `tarefaacademica_matricula`;
-- 
-- -- Restaurar constraints
-- ALTER TABLE `tarefaacademica`
-- ADD CONSTRAINT `fk_tarefa_alocacao` 
--   FOREIGN KEY (`matXprofXturxescGUID`) 
--   REFERENCES `materiaxprofessorxturma` (`MatProfTurGUID`) 
--   ON DELETE CASCADE 
--   ON UPDATE CASCADE;
-- 
-- ALTER TABLE `tarefaacademica`
-- ADD CONSTRAINT `fk_tarefa_matricula` 
--   FOREIGN KEY (`MatriculaGUID`) 
--   REFERENCES `matricula` (`MatriculaGUID`) 
--   ON DELETE CASCADE 
--   ON UPDATE CASCADE;
-- 
-- SET FOREIGN_KEY_CHECKS = 1;
-- =====================================================
