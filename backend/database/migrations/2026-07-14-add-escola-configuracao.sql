-- =====================================================
-- MIGRATION: Criar escolaconfiguracao + escolaconfiguracaointervalo
-- Data: 2026-07-14
-- Descrição: Parâmetros de horário letivo da escola (minutos/aula, dias
--            letivos, período da manhã/tarde e intervalos), base para o
--            futuro cronograma de turma.
-- =====================================================

CREATE TABLE IF NOT EXISTS `escolaconfiguracao` (
  `EscolaConfiguracaoGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `EscolaGUID` CHAR(36) NOT NULL,
  `MinutosPorAula` INT NOT NULL,
  `DiasSemana` VARCHAR(60) NOT NULL,
  `PeriodoManhaInicio` VARCHAR(5) NOT NULL,
  `PeriodoManhaFim` VARCHAR(5) NOT NULL,
  `TemAulaTarde` TINYINT(1) NOT NULL DEFAULT 0,
  `PeriodoTardeInicio` VARCHAR(5) NULL,
  `PeriodoTardeFim` VARCHAR(5) NULL,
  `IntervaloVariado` TINYINT(1) NOT NULL DEFAULT 0,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_escolaconfiguracao_escola` (`EscolaGUID`),
  CONSTRAINT `FK_EscolaConfiguracao_Escola` FOREIGN KEY (`EscolaGUID`)
    REFERENCES `escola` (`EscolaGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `escolaconfiguracaointervalo` (
  `EscolaConfiguracaoIntervaloGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `EscolaConfiguracaoGUID` CHAR(36) NOT NULL,
  `DiaSemana` ENUM('Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo') NULL,
  `IntervaloInicio` VARCHAR(5) NOT NULL,
  `IntervaloFim` VARCHAR(5) NOT NULL,
  INDEX `idx_escolaconfiguracaointervalo_config` (`EscolaConfiguracaoGUID`),
  CONSTRAINT `FK_EscolaConfiguracaoIntervalo_Config` FOREIGN KEY (`EscolaConfiguracaoGUID`)
    REFERENCES `escolaconfiguracao` (`EscolaConfiguracaoGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- DROP TABLE IF EXISTS `escolaconfiguracaointervalo`;
-- DROP TABLE IF EXISTS `escolaconfiguracao`;
