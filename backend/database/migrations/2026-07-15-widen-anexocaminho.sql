-- =====================================================
-- MIGRATION: Garantir AnexoCaminho com VARCHAR(500)
-- Data: 2026-07-15
-- Descrição: AnexoCaminho passou a guardar a URL pública completa do
--            arquivo no Cloudflare R2 (não mais um caminho relativo em
--            disco local), então precisa de espaço suficiente. A entidade
--            (backend/entities/anexo.model.ts) já valida até 500
--            caracteres — esta migration garante que a coluna acompanhe.
-- =====================================================

ALTER TABLE `anexo`
MODIFY COLUMN `AnexoCaminho` VARCHAR(500) NOT NULL;

-- =====================================================
-- ROLLBACK (caso necessário — ajuste o tamanho anterior se souber qual era):
-- =====================================================
-- ALTER TABLE `anexo` MODIFY COLUMN `AnexoCaminho` VARCHAR(255) NOT NULL;
