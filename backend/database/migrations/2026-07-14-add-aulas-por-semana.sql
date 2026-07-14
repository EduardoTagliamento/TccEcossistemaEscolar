-- =====================================================
-- MIGRATION: Adicionar aulas por semana (padrão e override)
-- Data: 2026-07-14
-- Descrição: MateriaAulasPorSemanaPadrao em materia (valor padrão da
--            matéria) e AulasPorSemana em materiaxprofessorxturma
--            (override específico por turma). Ambos opcionais (NULL = usa
--            o padrão da matéria).
-- =====================================================

ALTER TABLE `materia`
ADD COLUMN `MateriaAulasPorSemanaPadrao` INT NULL AFTER `MateriaIsTecnica`;

ALTER TABLE `materiaxprofessorxturma`
ADD COLUMN `AulasPorSemana` INT NULL AFTER `AlocacaoStatus`;

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- ALTER TABLE `materiaxprofessorxturma` DROP COLUMN `AulasPorSemana`;
-- ALTER TABLE `materia` DROP COLUMN `MateriaAulasPorSemanaPadrao`;
