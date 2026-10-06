-- =====================================================
-- MIGRATION: Vínculo N:N entre `materia` e `materiaglobal`
-- Data: 2026-10-06
-- Descrição: até aqui, `materia.MateriaGlobalGUID` era uma FK única (1 matéria da
--            escola → no máximo 1 matéria global). Caso real que motivou: duas
--            escolas têm a aula "Filosofia/Sociologia" como UMA matéria só (1
--            professor, 1 registro), mas a taxonomia global precisa separar
--            Filosofia e Sociologia (são duas matérias de vestibular distintas,
--            cada uma com suas próprias questões no banco universal).
--
--            Abordagem ADITIVA (não substitui o sistema de auto-resolução por
--            nome já existente, spec item 15/16/17): `materia.MateriaGlobalGUID`
--            continua existindo e funcionando exatamente como antes (resolução
--            automática/confirmação manual/fila de ambíguos) — representa o
--            vínculo PRIMÁRIO. Esta tabela nova é a lista completa (superset),
--            populada por um backfill de todo vínculo primário já existente, e
--            estendida manualmente quando uma matéria de escola precisa de MAIS
--            de 1 vínculo global.
-- =====================================================

CREATE TABLE IF NOT EXISTS `materiamateriaglobal` (
  `MateriaMateriaGlobalGUID` CHAR(36) NOT NULL,
  `MateriaGUID` CHAR(36) NOT NULL,
  `MateriaGlobalGUID` CHAR(36) NOT NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MateriaMateriaGlobalGUID`),
  UNIQUE KEY `UQ_MateriaMateriaGlobal_Par` (`MateriaGUID`, `MateriaGlobalGUID`),
  INDEX `idx_materiamateriaglobal_materia` (`MateriaGUID`),
  INDEX `idx_materiamateriaglobal_global` (`MateriaGlobalGUID`)
) ENGINE=InnoDB;

ALTER TABLE `materiamateriaglobal`
  ADD CONSTRAINT `FK_MateriaMateriaGlobal_Materia` FOREIGN KEY (`MateriaGUID`)
    REFERENCES `materia`(`MateriaGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE `materiamateriaglobal`
  ADD CONSTRAINT `FK_MateriaMateriaGlobal_Global` FOREIGN KEY (`MateriaGlobalGUID`)
    REFERENCES `materiaglobal`(`MateriaGlobalGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

-- Backfill: todo vínculo primário já existente também entra na lista completa.
INSERT INTO `materiamateriaglobal` (`MateriaMateriaGlobalGUID`, `MateriaGUID`, `MateriaGlobalGUID`)
SELECT UUID(), `MateriaGUID`, `MateriaGlobalGUID`
FROM `materia`
WHERE `MateriaGlobalGUID` IS NOT NULL;

-- =====================================================
-- Como verificar se já foi executada:
-- SHOW TABLES LIKE 'materiamateriaglobal';
--
-- ROLLBACK:
-- DROP TABLE IF EXISTS `materiamateriaglobal`;
-- =====================================================
