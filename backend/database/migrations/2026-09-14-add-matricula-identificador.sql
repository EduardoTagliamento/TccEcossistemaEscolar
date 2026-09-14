-- =====================================================
-- MIGRATION: Adicionar MatriculaIdentificador em matricula
-- Data: 2026-09-14
-- Descrição: Campo NÃO-CHAVE, separado de MatriculaGUID (a PK, que já aceita
--            RA customizado) — por padrão uma cópia do MatriculaGUID no
--            momento da criação, mas editável depois pela secretaria sem
--            afetar a FK usada em tarefaacademica_matricula, conteudoprogresso
--            etc. Usado como identificador de login na tela por escola
--            (/login/[EscolaSlug]) — ver docs/PLANO_IMPLEMENTACAO_LOGIN_POR_ESCOLA.md.
--            Sem UNIQUE na coluna: `matricula` não tem EscolaGUID direto
--            (só via TurmaGUID/GrupoEletivoGUID), então a unicidade "por
--            escola" (decisão #1 da spec) é verificada em código
--            (MatriculaService), não por constraint de banco — ver §3.2.
-- =====================================================

ALTER TABLE `matricula`
ADD COLUMN `MatriculaIdentificador` VARCHAR(36) NULL AFTER `MatriculaGUID`,
ADD INDEX `idx_matricula_identificador` (`MatriculaIdentificador`);

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- ALTER TABLE `matricula` DROP INDEX `idx_matricula_identificador`, DROP COLUMN `MatriculaIdentificador`;
