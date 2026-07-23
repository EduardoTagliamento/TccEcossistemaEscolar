-- =====================================================
-- MIGRATION: Notificações — Transferência de Direção
-- Data: 2026-07-23
-- Descrição: Direção pode eleger um Coordenação ativo da escola para
--            assumir a Direção — o Direção atual passa a Coordenação e o
--            eleito passa a Direção (troca simétrica, ver
--            EscolaService.transferirDirecao). Dois tipos de notificação
--            novos: um para quem assume a Direção, outro para quem passa a
--            Coordenação. Segue o mesmo padrão de seed de
--            2026-07-17-notificacoes.sql (FuncaoId 1=Coordenacao 6=Direcao).
-- =====================================================

USE tccecossistemaescolar;

INSERT INTO `notificacaotipo`
  (`NotificacaoTipoSlug`, `NotificacaoTipoDescricao`, `NotificacaoTipoCategoria`, `NotificacaoTipoEmailPadrao`, `NotificacaoTipoWhatsappPadrao`)
VALUES
  ('promovido_direcao',      'Eleito(a) para a Direção da escola',        'Aviso', 1, 1),
  ('rebaixado_coordenacao',  'Deixou a Direção e passou a Coordenação',   'Aviso', 1, 1)
ON DUPLICATE KEY UPDATE
  `NotificacaoTipoDescricao` = VALUES(`NotificacaoTipoDescricao`),
  `NotificacaoTipoCategoria` = VALUES(`NotificacaoTipoCategoria`),
  `NotificacaoTipoEmailPadrao` = VALUES(`NotificacaoTipoEmailPadrao`),
  `NotificacaoTipoWhatsappPadrao` = VALUES(`NotificacaoTipoWhatsappPadrao`);

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 1 AS FuncaoId UNION ALL SELECT 6) f
WHERE t.`NotificacaoTipoSlug` = 'promovido_direcao'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 1 AS FuncaoId UNION ALL SELECT 6) f
WHERE t.`NotificacaoTipoSlug` = 'rebaixado_coordenacao'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- DELETE FROM notificacaotipofuncao WHERE NotificacaoTipoId IN (SELECT NotificacaoTipoId FROM notificacaotipo WHERE NotificacaoTipoSlug IN ('promovido_direcao', 'rebaixado_coordenacao'));
-- DELETE FROM notificacaotipo WHERE NotificacaoTipoSlug IN ('promovido_direcao', 'rebaixado_coordenacao');
