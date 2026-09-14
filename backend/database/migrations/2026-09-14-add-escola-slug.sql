-- =====================================================
-- MIGRATION: Adicionar EscolaSlug em escola
-- Data: 2026-09-14
-- Descrição: Identificador de URL único e editável por escola, usado pelo
--            link de login individual (/login/[EscolaSlug]) — ver
--            docs/PLANO_IMPLEMENTACAO_LOGIN_POR_ESCOLA.md.
--            NULL permitido para não quebrar escolas já cadastradas; o
--            script .ts desta migration faz o backfill (slugify do
--            EscolaNome, com sufixo numérico em caso de conflito).
-- =====================================================

ALTER TABLE `escola`
ADD COLUMN `EscolaSlug` VARCHAR(60) NULL AFTER `EscolaNome`,
ADD UNIQUE INDEX `idx_escola_slug` (`EscolaSlug`);

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- ALTER TABLE `escola` DROP INDEX `idx_escola_slug`, DROP COLUMN `EscolaSlug`;
