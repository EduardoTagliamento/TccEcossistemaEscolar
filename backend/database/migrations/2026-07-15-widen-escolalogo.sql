-- =====================================================
-- MIGRATION: Aumentar EscolaLogo para VARCHAR(500)
-- Data: 2026-07-15
-- Descrição: EscolaLogo passou a guardar a URL pública completa do arquivo
--            no Cloudflare R2 (não mais só o nome do arquivo em disco
--            local), então VARCHAR(255) pode não ser suficiente.
-- =====================================================

ALTER TABLE `escola`
MODIFY COLUMN `EscolaLogo` VARCHAR(500) NULL;

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- ALTER TABLE `escola` MODIFY COLUMN `EscolaLogo` VARCHAR(255) NULL;
