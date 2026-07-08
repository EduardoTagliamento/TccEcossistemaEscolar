-- Migration: Permissões em grupos de conversa (Phase 3)
-- Data: 2026-07-08

USE tccecossistemaescolar;

-- 1. Documentar FuncaoId=6 (Direção) — função não estava na seed inicial
INSERT INTO `funcao` (`FuncaoId`, `FuncaoNome`) VALUES (6, 'Direcao')
ON DUPLICATE KEY UPDATE `FuncaoNome` = VALUES(`FuncaoNome`);

-- 2. Ampliar MembroFuncao ENUM para incluir papéis de permissão em grupos
ALTER TABLE `conversa_grupo_membro`
MODIFY COLUMN `MembroFuncao`
  ENUM('Membro', 'Lider', 'Representante', 'Vice-Representante')
  NOT NULL DEFAULT 'Membro';

-- 3. Adicionar MensagemEditadaAt para suporte a edição de mensagens
ALTER TABLE `mensagem`
ADD COLUMN `MensagemEditadaAt` TIMESTAMP NULL DEFAULT NULL
  AFTER `MensagemCreatedAt`;
