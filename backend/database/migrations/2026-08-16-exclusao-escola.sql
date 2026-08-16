-- =====================================================
-- MIGRATION: Exclusão de escola com confirmação por email
-- Data: 2026-08-16
-- Descrição: Tela de Configurações (Direção) ganha um fluxo de exclusão de
--            escola com código de 6 dígitos por email (mesmo padrão de
--            verificacao_email) — confirmar desativa a escola
--            (EscolaStatus='Inativa' + EscolaInativadaEm=NOW()). Exclusão
--            DEFINITIVA só acontece depois de 30 dias inativa sem
--            reativação, via job diário (CleanupScheduler).
--
-- ATENÇÃO — verifique antes de rodar: outras migrations desta pasta (ex.
-- 2026-08-09-aviso.sql, 2026-08-04-redefinicao-senha.sql) ainda declaram
-- FK pra `usuario` via UsuarioCPF, mas o código atual (backend/services)
-- já usa UsuarioGUID pra essas mesmas tabelas — ou seja, o schema real já
-- foi alterado depois dessas migrations sem o arquivo ser atualizado
-- (drift). Este arquivo assume `usuario.UsuarioGUID CHAR(12)` como
-- verdade (bate com o validador em backend/entities/usuario.model.ts e
-- com o resto do código desta sessão) — rode um
-- `SHOW CREATE TABLE usuario;` antes pra confirmar o tipo/nome exatos da
-- coluna, e ajuste o `UsuarioGUIDSolicitante CHAR(12)` abaixo se divergir.
-- =====================================================

-- ---------------------------------------------------
-- 1. escola.EscolaInativadaEm — relógio dos 30 dias
-- ---------------------------------------------------
ALTER TABLE `escola`
  ADD COLUMN `EscolaInativadaEm` DATETIME NULL AFTER `EscolaStatus`;

-- ---------------------------------------------------
-- 2. exclusao_escola — códigos de confirmação (mesmo padrão de
--    verificacao_email, mas por EscolaGUID em vez de UsuarioGUID)
-- ---------------------------------------------------
CREATE TABLE `exclusao_escola` (
  `ExclusaoId` INT NOT NULL AUTO_INCREMENT,
  `EscolaGUID` CHAR(36) NOT NULL,
  `UsuarioGUIDSolicitante` CHAR(12) NOT NULL,
  `ExclusaoCodigo` CHAR(6) NOT NULL,
  `ExclusaoExpiresAt` DATETIME NOT NULL,
  `ExclusaoUsado` BOOLEAN NOT NULL DEFAULT FALSE,
  `ExclusaoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ExclusaoId`),
  INDEX `idx_exclusao_escola` (`EscolaGUID`),
  INDEX `idx_exclusao_solicitante` (`UsuarioGUIDSolicitante`)
) ENGINE=InnoDB;

ALTER TABLE `exclusao_escola`
  ADD CONSTRAINT `FK_ExclusaoEscola_Escola` FOREIGN KEY (`EscolaGUID`)
    REFERENCES `escola`(`EscolaGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE `exclusao_escola`
  ADD CONSTRAINT `FK_ExclusaoEscola_Usuario` FOREIGN KEY (`UsuarioGUIDSolicitante`)
    REFERENCES `usuario`(`UsuarioGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- DROP TABLE IF EXISTS `exclusao_escola`;
-- ALTER TABLE `escola` DROP COLUMN `EscolaInativadaEm`;
