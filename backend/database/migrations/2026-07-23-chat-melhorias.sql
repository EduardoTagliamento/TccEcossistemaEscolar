-- =====================================================
-- MIGRATION: Chat — Reações a mensagens
-- Data: 2026-07-23
-- Descrição: Tabela de reações (emoji) a mensagens do chat. Um usuário pode
--            reagir com vários emojis diferentes na mesma mensagem (estilo
--            Discord) — cada par (mensagem, usuário, emoji) é independente;
--            reagir de novo com o mesmo emoji remove essa reação específica.
--            Gestão de grupo e recibo de leitura NÃO precisam de migration
--            (reaproveitam conversa_grupo_membro/usuario/mensagem_leitura já
--            existentes). Ver docs/PLANO_IMPLEMENTACAO_CHAT_MELHORIAS.md.
-- =====================================================

USE tccecossistemaescolar;

CREATE TABLE IF NOT EXISTS `mensagem_reacao` (
  `MensagemGUID`     CHAR(36)                                        NOT NULL,
  `UsuarioCPF`       VARCHAR(14)                                     NOT NULL,
  `ReacaoEmoji`      ENUM('👍', '❤️', '😂', '😮', '😢', '🙏')        NOT NULL,
  `ReacaoCreatedAt`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MensagemGUID`, `UsuarioCPF`, `ReacaoEmoji`),
  INDEX `idx_mensagemreacao_mensagem` (`MensagemGUID`),
  CONSTRAINT `FK_MensagemReacao_Mensagem`
    FOREIGN KEY (`MensagemGUID`) REFERENCES `mensagem` (`MensagemGUID`)
    ON DELETE CASCADE,
  CONSTRAINT `FK_MensagemReacao_Usuario`
    FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario` (`UsuarioCPF`)
    ON DELETE CASCADE
);

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- DROP TABLE IF EXISTS `mensagem_reacao`;
