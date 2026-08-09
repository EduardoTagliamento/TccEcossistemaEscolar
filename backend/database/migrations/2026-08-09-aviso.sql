-- =====================================================
-- MIGRATION: Módulo de Aviso/Comunicado
-- Data: 2026-08-09
-- Descrição: Comunicados de Direção/Coordenação/Secretaria para a escola
--            inteira ou para turmas específicas — sem data própria, com
--            anexo opcional, e rastreio de "1ª visualização" por usuário
--            (usado pro banner de destaque na home). Ver
--            C:\Users\eduar\.claude\plans\enumerated-wishing-wren.md
-- =====================================================

-- SOLUÇÃO PARA ERRO 3780 (incompatibilidade de foreign key), mesmo padrão
-- de create-anotacao-table.sql: cria as tabelas sem FK, adiciona depois.

-- =====================================================
-- TABELA: aviso
-- =====================================================
CREATE TABLE IF NOT EXISTS `aviso` (
  `AvisoGUID` CHAR(36) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `UsuarioCPFAutor` VARCHAR(14) NOT NULL,
  `AvisoTitulo` VARCHAR(150) NOT NULL,
  `AvisoConteudo` TEXT NOT NULL,
  `AvisoAbrangencia` ENUM('Escola','Turmas') NOT NULL,
  `AvisoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`AvisoGUID`),
  INDEX `idx_aviso_escola` (`EscolaGUID`),
  INDEX `idx_aviso_created` (`AvisoCreatedAt`)
) ENGINE=InnoDB;

ALTER TABLE `aviso`
  ADD CONSTRAINT `FK_Aviso_Escola` FOREIGN KEY (`EscolaGUID`)
    REFERENCES `escola`(`EscolaGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE `aviso`
  ADD CONSTRAINT `FK_Aviso_Usuario` FOREIGN KEY (`UsuarioCPFAutor`)
    REFERENCES `usuario`(`UsuarioCPF`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;

-- =====================================================
-- TABELA: avisoxturma
-- Só populada quando AvisoAbrangencia = 'Turmas'.
-- =====================================================
CREATE TABLE IF NOT EXISTS `avisoxturma` (
  `AvisoXTurmaGUID` CHAR(36) NOT NULL,
  `AvisoGUID` CHAR(36) NOT NULL,
  `TurmaGUID` CHAR(36) NOT NULL,
  PRIMARY KEY (`AvisoXTurmaGUID`),
  UNIQUE KEY `uq_avisoxturma` (`AvisoGUID`, `TurmaGUID`),
  INDEX `idx_avisoxturma_turma` (`TurmaGUID`)
) ENGINE=InnoDB;

ALTER TABLE `avisoxturma`
  ADD CONSTRAINT `FK_AvisoXTurma_Aviso` FOREIGN KEY (`AvisoGUID`)
    REFERENCES `aviso`(`AvisoGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE `avisoxturma`
  ADD CONSTRAINT `FK_AvisoXTurma_Turma` FOREIGN KEY (`TurmaGUID`)
    REFERENCES `turma`(`TurmaGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

-- =====================================================
-- TABELA: relacaoanexosaviso
-- Vínculo simples (sem AnexoTipo), mesmo formato de relacaoanexosevento.
-- =====================================================
CREATE TABLE IF NOT EXISTS `relacaoanexosaviso` (
  `RelacaoAnexoAvisoGUID` CHAR(36) NOT NULL,
  `AnexoGUID` CHAR(36) NOT NULL,
  `AvisoGUID` CHAR(36) NOT NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`RelacaoAnexoAvisoGUID`),
  INDEX `idx_relacaoanexosaviso_aviso` (`AvisoGUID`)
) ENGINE=InnoDB;

ALTER TABLE `relacaoanexosaviso`
  ADD CONSTRAINT `FK_RelacaoAnexoAviso_Anexo` FOREIGN KEY (`AnexoGUID`)
    REFERENCES `anexo`(`AnexoGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE `relacaoanexosaviso`
  ADD CONSTRAINT `FK_RelacaoAnexoAviso_Aviso` FOREIGN KEY (`AvisoGUID`)
    REFERENCES `aviso`(`AvisoGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

-- =====================================================
-- TABELA: avisoxusuario
-- Rastreio de "visto" — 1 linha por (aviso, usuário) que já abriu a página
-- de leitura. INSERT IGNORE (mesmo padrão de provaagendadavisualizacao)
-- depende da UNIQUE KEY abaixo pra ser idempotente.
-- =====================================================
CREATE TABLE IF NOT EXISTS `avisoxusuario` (
  `AvisoXUsuarioGUID` CHAR(36) NOT NULL,
  `AvisoGUID` CHAR(36) NOT NULL,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `VisualizadoEm` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`AvisoXUsuarioGUID`),
  UNIQUE KEY `uq_avisoxusuario` (`AvisoGUID`, `UsuarioCPF`)
) ENGINE=InnoDB;

ALTER TABLE `avisoxusuario`
  ADD CONSTRAINT `FK_AvisoXUsuario_Aviso` FOREIGN KEY (`AvisoGUID`)
    REFERENCES `aviso`(`AvisoGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE `avisoxusuario`
  ADD CONSTRAINT `FK_AvisoXUsuario_Usuario` FOREIGN KEY (`UsuarioCPF`)
    REFERENCES `usuario`(`UsuarioCPF`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

-- =====================================================
-- SEED: notificacaotipo / notificacaotipofuncao
-- FuncaoId: 1=Coordenacao 2=Secretaria 3=Professor 4=Responsavel 5=Aluno 6=Direcao
-- =====================================================
INSERT INTO `notificacaotipo`
  (`NotificacaoTipoSlug`, `NotificacaoTipoDescricao`, `NotificacaoTipoCategoria`, `NotificacaoTipoEmailPadrao`, `NotificacaoTipoWhatsappPadrao`)
VALUES
  ('aviso_publicado', 'Novo comunicado da escola', 'Aviso', 1, 1)
ON DUPLICATE KEY UPDATE
  `NotificacaoTipoDescricao` = VALUES(`NotificacaoTipoDescricao`),
  `NotificacaoTipoCategoria` = VALUES(`NotificacaoTipoCategoria`),
  `NotificacaoTipoEmailPadrao` = VALUES(`NotificacaoTipoEmailPadrao`),
  `NotificacaoTipoWhatsappPadrao` = VALUES(`NotificacaoTipoWhatsappPadrao`);

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 1 AS FuncaoId UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) f
WHERE t.`NotificacaoTipoSlug` = 'aviso_publicado'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- DELETE FROM `notificacaotipofuncao` WHERE `NotificacaoTipoId` = (SELECT NotificacaoTipoId FROM notificacaotipo WHERE NotificacaoTipoSlug = 'aviso_publicado');
-- DELETE FROM `notificacaotipo` WHERE `NotificacaoTipoSlug` = 'aviso_publicado';
-- DROP TABLE IF EXISTS `avisoxusuario`;
-- DROP TABLE IF EXISTS `relacaoanexosaviso`;
-- DROP TABLE IF EXISTS `avisoxturma`;
-- DROP TABLE IF EXISTS `aviso`;
