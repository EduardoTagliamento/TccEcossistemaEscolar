-- =====================================================
-- MIGRATION: Adicionar coluna EscolaLogo
-- Data: 2026-03-10
-- Descrição: Adiciona coluna para armazenar caminho do arquivo de logo
-- =====================================================

USE `tccecossistemaescolar`;

-- Adicionar coluna EscolaLogo (caminho do arquivo)
ALTER TABLE `escola`
ADD COLUMN `EscolaLogo` VARCHAR(255) NULL AFTER `EscolaIcone`,
ADD INDEX `idx_escola_logo` (`EscolaLogo`);

-- Verificar se a coluna foi adicionada
SHOW COLUMNS FROM `escola` LIKE 'EscolaLogo';
