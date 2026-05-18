-- =====================================================
-- MIGRATION: Adicionar campo EscolaIsTecnica
-- Data: 12/05/2026
-- Descrição: Adiciona flag booleana para identificar escolas técnicas
-- Execução: Necessária antes de implementar módulos acadêmicos
-- =====================================================

-- Verificar se coluna já existe (MySQL)
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'railway' 
  AND TABLE_NAME = 'escola' 
  AND COLUMN_NAME = 'EscolaIsTecnica';

-- Se não existir, executar:
ALTER TABLE `escola`
ADD COLUMN `EscolaIsTecnica` BOOLEAN NOT NULL DEFAULT FALSE AFTER `EscolaStatus`,
ADD INDEX `idx_escola_is_tecnica` (`EscolaIsTecnica`);

-- Verificação (deve retornar 0 e 1)
SELECT 
  EscolaGUID,
  EscolaNome,
  EscolaIsTecnica,
  EscolaStatus
FROM escola
LIMIT 5;

-- =====================================================
-- ROLLBACK (caso necessário)
-- =====================================================
-- ALTER TABLE `escola`
-- DROP INDEX `idx_escola_is_tecnica`,
-- DROP COLUMN `EscolaIsTecnica`;
