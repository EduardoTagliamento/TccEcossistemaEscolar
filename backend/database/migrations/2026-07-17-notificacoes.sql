-- =====================================================
-- MIGRATION: Sistema de Notificações
-- Data: 2026-07-17
-- Descrição: Cria o catálogo de tipos de notificação, o feed in-app,
--            o log de envio por canal (email/whatsapp) e as preferências
--            de notificação por usuário. Ver docs/PLANO_IMPLEMENTACAO_NOTIFICACOES.md
-- =====================================================

-- =====================================================
-- TABELA: notificacaotipo
-- Catálogo estático dos tipos de notificação existentes no sistema.
-- =====================================================
CREATE TABLE IF NOT EXISTS `notificacaotipo` (
  `NotificacaoTipoId` INT NOT NULL AUTO_INCREMENT,
  `NotificacaoTipoSlug` VARCHAR(50) NOT NULL,
  `NotificacaoTipoDescricao` VARCHAR(150) NOT NULL,
  `NotificacaoTipoCategoria` ENUM('Aviso','Lembrete') NOT NULL,
  `NotificacaoTipoEmailPadrao` TINYINT(1) NOT NULL DEFAULT 0,
  `NotificacaoTipoWhatsappPadrao` TINYINT(1) NOT NULL DEFAULT 0,
  `NotificacaoTipoAtivo` TINYINT(1) NOT NULL DEFAULT 1,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`NotificacaoTipoId`),
  UNIQUE KEY `uq_notificacaotipo_slug` (`NotificacaoTipoSlug`)
);

-- =====================================================
-- TABELA: notificacaotipofuncao
-- Quais papéis (funcao) enxergam/configuram cada tipo de notificação.
-- =====================================================
CREATE TABLE IF NOT EXISTS `notificacaotipofuncao` (
  `NotificacaoTipoId` INT NOT NULL,
  `FuncaoId` INT NOT NULL,
  PRIMARY KEY (`NotificacaoTipoId`, `FuncaoId`),
  CONSTRAINT `FK_NTF_Tipo` FOREIGN KEY (`NotificacaoTipoId`)
    REFERENCES `notificacaotipo` (`NotificacaoTipoId`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `FK_NTF_Funcao` FOREIGN KEY (`FuncaoId`)
    REFERENCES `funcao` (`FuncaoId`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

-- =====================================================
-- TABELA: notificacao
-- Feed in-app — uma linha por destinatário por evento disparado.
-- =====================================================
CREATE TABLE IF NOT EXISTS `notificacao` (
  `NotificacaoGUID` CHAR(36) NOT NULL,
  `NotificacaoTipoId` INT NOT NULL,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `NotificacaoTitulo` VARCHAR(150) NOT NULL,
  `NotificacaoConteudo` VARCHAR(500) NULL,
  `NotificacaoEntidadeTipo` VARCHAR(40) NULL,
  `NotificacaoEntidadeGUID` VARCHAR(36) NULL,
  `NotificacaoLink` VARCHAR(255) NULL,
  `NotificacaoLida` TINYINT(1) NOT NULL DEFAULT 0,
  `NotificacaoLidaData` TIMESTAMP NULL,
  `NotificacaoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`NotificacaoGUID`),
  INDEX `idx_notificacao_usuario_lida` (`UsuarioCPF`, `NotificacaoLida`),
  INDEX `idx_notificacao_escola` (`EscolaGUID`),
  INDEX `idx_notificacao_created` (`NotificacaoCreatedAt`),
  CONSTRAINT `FK_Notificacao_Tipo` FOREIGN KEY (`NotificacaoTipoId`)
    REFERENCES `notificacaotipo` (`NotificacaoTipoId`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT `FK_Notificacao_Usuario` FOREIGN KEY (`UsuarioCPF`)
    REFERENCES `usuario` (`UsuarioCPF`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `FK_Notificacao_Escola` FOREIGN KEY (`EscolaGUID`)
    REFERENCES `escola` (`EscolaGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

-- =====================================================
-- TABELA: notificacaoenvio
-- Auditoria/idempotência de envio por canal (email/whatsapp).
-- =====================================================
CREATE TABLE IF NOT EXISTS `notificacaoenvio` (
  `NotificacaoEnvioId` INT NOT NULL AUTO_INCREMENT,
  `NotificacaoGUID` CHAR(36) NOT NULL,
  `NotificacaoEnvioCanal` ENUM('Email','Whatsapp') NOT NULL,
  `NotificacaoEnvioStatus` ENUM('Pendente','Enviado','Falhou') NOT NULL DEFAULT 'Pendente',
  `NotificacaoEnvioProviderId` VARCHAR(100) NULL,
  `NotificacaoEnvioErro` VARCHAR(255) NULL,
  `NotificacaoEnvioTentativas` TINYINT NOT NULL DEFAULT 0,
  `NotificacaoEnvioEnviadoData` TIMESTAMP NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`NotificacaoEnvioId`),
  UNIQUE KEY `UQ_Notificacao_Canal` (`NotificacaoGUID`, `NotificacaoEnvioCanal`),
  CONSTRAINT `FK_Envio_Notificacao` FOREIGN KEY (`NotificacaoGUID`)
    REFERENCES `notificacao` (`NotificacaoGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

-- =====================================================
-- TABELA: usuarionotificacaopreferencia
-- Override esparso do usuário — só existe linha quando ele muda o padrão
-- do catálogo. Preferência é global (não é por escola).
-- =====================================================
CREATE TABLE IF NOT EXISTS `usuarionotificacaopreferencia` (
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `NotificacaoTipoId` INT NOT NULL,
  `PreferenciaEmailAtivo` TINYINT(1) NOT NULL,
  `PreferenciaWhatsappAtivo` TINYINT(1) NOT NULL,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`UsuarioCPF`, `NotificacaoTipoId`),
  CONSTRAINT `FK_Preferencia_Usuario` FOREIGN KEY (`UsuarioCPF`)
    REFERENCES `usuario` (`UsuarioCPF`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `FK_Preferencia_Tipo` FOREIGN KEY (`NotificacaoTipoId`)
    REFERENCES `notificacaotipo` (`NotificacaoTipoId`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

-- =====================================================
-- SEED: notificacaotipo
-- FuncaoId: 1=Coordenacao 2=Secretaria 3=Professor 4=Responsavel 5=Aluno 6=Direcao
-- =====================================================
INSERT INTO `notificacaotipo`
  (`NotificacaoTipoSlug`, `NotificacaoTipoDescricao`, `NotificacaoTipoCategoria`, `NotificacaoTipoEmailPadrao`, `NotificacaoTipoWhatsappPadrao`)
VALUES
  ('materia_postada',            'Professor postou uma matéria',                 'Aviso',    1, 1),
  ('prova_postada',               'Professor postou uma prova',                   'Aviso',    1, 1),
  ('tarefa_postada',              'Professor postou uma tarefa',                  'Aviso',    1, 1),
  ('pendencia_criada',            'Nova pendência',                               'Aviso',    1, 1),
  ('evento_criado',               'Novo evento na escola',                        'Aviso',    1, 1),
  ('convite_grupo',               'Convite para grupo de tarefa',                 'Aviso',    1, 1),
  ('tarefa_avaliada',             'Professor avaliou sua tarefa',                 'Aviso',    1, 1),
  ('tarefa_resposta_recebida',    'Aluno enviou resposta da tarefa',              'Aviso',    0, 0),
  ('mensagem_grupo',              'Nova mensagem no grupo',                       'Aviso',    0, 0),
  ('mensagem_individual',         'Nova mensagem direta',                         'Aviso',    0, 0),
  ('promovido_representante',     'Promovido a representante',                    'Aviso',    1, 1),
  ('promovido_vice_representante','Promovido a vice-representante',               'Aviso',    1, 1),
  ('removido_vice_representante', 'Removido do cargo de vice-representante',      'Aviso',    0, 0),
  ('removido_grupo',              'Removido de um grupo',                         'Aviso',    0, 0),
  ('tarefa_prazo_amanha',         'Lembrete: tarefa vence amanhã',                'Lembrete', 1, 1),
  ('anotacao_prazo_amanha',       'Lembrete: anotação vence amanhã',              'Lembrete', 1, 1),
  ('prova_prazo_amanha',          'Lembrete: prova amanhã',                       'Lembrete', 1, 1),
  ('tarefa_prazo_alterado',       'Prazo da tarefa foi alterado',                 'Aviso',    1, 1),
  ('matricula_nova_turma',        'Matriculado em nova turma',                    'Aviso',    1, 1),
  ('evento_prazo_amanha',         'Lembrete: evento amanhã',                      'Lembrete', 0, 0)
ON DUPLICATE KEY UPDATE
  `NotificacaoTipoDescricao` = VALUES(`NotificacaoTipoDescricao`),
  `NotificacaoTipoCategoria` = VALUES(`NotificacaoTipoCategoria`),
  `NotificacaoTipoEmailPadrao` = VALUES(`NotificacaoTipoEmailPadrao`),
  `NotificacaoTipoWhatsappPadrao` = VALUES(`NotificacaoTipoWhatsappPadrao`);

-- =====================================================
-- SEED: notificacaotipofuncao
-- Resolvido por slug (não por Id fixo) para ser seguro re-executar.
-- =====================================================
INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'materia_postada'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'prova_postada'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'tarefa_postada'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 1 AS FuncaoId UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 5 UNION ALL SELECT 6) f
WHERE t.`NotificacaoTipoSlug` = 'pendencia_criada'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 1 AS FuncaoId UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 5 UNION ALL SELECT 6) f
WHERE t.`NotificacaoTipoSlug` = 'evento_criado'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'convite_grupo'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'tarefa_avaliada'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 3 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'tarefa_resposta_recebida'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 1 AS FuncaoId UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 5 UNION ALL SELECT 6) f
WHERE t.`NotificacaoTipoSlug` = 'mensagem_grupo'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 1 AS FuncaoId UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 5 UNION ALL SELECT 6) f
WHERE t.`NotificacaoTipoSlug` = 'mensagem_individual'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'promovido_representante'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'promovido_vice_representante'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'removido_vice_representante'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'removido_grupo'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'tarefa_prazo_amanha'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'anotacao_prazo_amanha'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'prova_prazo_amanha'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'tarefa_prazo_alterado'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'matricula_nova_turma'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 1 AS FuncaoId UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 5 UNION ALL SELECT 6) f
WHERE t.`NotificacaoTipoSlug` = 'evento_prazo_amanha'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- DROP TABLE IF EXISTS `usuarionotificacaopreferencia`;
-- DROP TABLE IF EXISTS `notificacaoenvio`;
-- DROP TABLE IF EXISTS `notificacao`;
-- DROP TABLE IF EXISTS `notificacaotipofuncao`;
-- DROP TABLE IF EXISTS `notificacaotipo`;
