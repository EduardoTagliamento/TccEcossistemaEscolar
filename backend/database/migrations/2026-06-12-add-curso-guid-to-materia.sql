-- =====================================================
-- MIGRATION: Adicionar CursoGUID em materia
-- Data: 2026-06-12
-- Descrição: Permite associar matérias a cursos específicos
--            (necessário para escolas técnicas)
-- =====================================================

-- Adicionar coluna CursoGUID (opcional - permite matérias sem curso)
ALTER TABLE `tccecossistemaescolar`.`materia`
ADD COLUMN `CursoGUID` CHAR(36) NULL AFTER `EscolaGUID`,
ADD INDEX `idx_materia_curso` (`CursoGUID`),
ADD CONSTRAINT `FK_Materia_Curso` FOREIGN KEY (`CursoGUID`)
  REFERENCES `tccecossistemaescolar`.`curso` (`CursoGUID`)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- ALTER TABLE `tccecossistemaescolar`.`materia`
-- DROP FOREIGN KEY `FK_Materia_Curso`,
-- DROP INDEX `idx_materia_curso`,
-- DROP COLUMN `CursoGUID`;
