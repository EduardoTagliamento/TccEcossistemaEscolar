-- =====================================================
-- MIGRATION: Chaves de API para parceiros externos
-- Data: 2026-09-13
-- Descrição: Cria o módulo de chaves de API (autenticação de aplicações
--            externas, sem sessão humana) e estende registroauditoria pra
--            aceitar uma chave de API como ator, além de um usuário.
--            Ver docs/PLANO_IMPLEMENTACAO_API_KEYS.md.
--
-- ⚠️ Antes de rodar: confira a definição ATUAL de `registroauditoria` no
--    banco (`SHOW CREATE TABLE registroauditoria;`). Em 2026-09-13 a
--    coluna do ator era `UsuarioGUIDAtor CHAR(12) NOT NULL` com FK pra
--    `usuario(UsuarioGUID)` — diferente da migration original de
--    2026-07-21 (`UsuarioCPFAtor VARCHAR(14)`), que foi superada por uma
--    migration posterior (da troca de PK de usuario pra GUID de 12
--    caracteres) não catalogada num arquivo próprio. Se o nome/tipo real
--    da coluna tiver mudado de novo desde então, ajuste o ALTER abaixo
--    antes de aplicar.
-- =====================================================

-- ---------------------------------------------------
-- 1. apikey — uma chave por integração de parceiro, escopada a UMA escola
-- ---------------------------------------------------
CREATE TABLE `apikey` (
  `ApiKeyGUID` CHAR(36) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL COMMENT 'Escola dona da chave — uma chave só acessa dados dessa escola',
  `ApiKeyNome` VARCHAR(100) NOT NULL COMMENT 'Rótulo livre escolhido por quem emitiu, ex. "Integração Secretaria Digital"',
  `ApiKeyPrefixo` VARCHAR(16) NOT NULL COMMENT 'Parte visível do token pra sempre (ex. baua_live_51h4f8a2), só identificação',
  `ApiKeyHashSecreto` CHAR(64) NOT NULL COMMENT 'SHA-256 (hex) do token completo — o valor em si nunca é persistido',
  `ApiKeyEscopos` JSON NOT NULL COMMENT 'Array de strings, ex. ["usuario:leitura","turma:leitura"]',
  `ApiKeyStatus` ENUM('Ativa','Revogada') NOT NULL DEFAULT 'Ativa',
  `ApiKeyCriadoPorGUID` CHAR(12) NOT NULL COMMENT 'UsuarioGUID de quem emitiu (sempre uma Direção)',
  `ApiKeyUltimoUsoEm` TIMESTAMP NULL DEFAULT NULL COMMENT 'Atualizado a cada chamada autenticada com a chave',
  `ApiKeyCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ApiKeyUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ApiKeyGUID`),
  UNIQUE KEY `uq_apikey_hash` (`ApiKeyHashSecreto`),
  INDEX `idx_apikey_escola` (`EscolaGUID`),
  INDEX `idx_apikey_criado_por` (`ApiKeyCriadoPorGUID`),
  CONSTRAINT `FK_ApiKey_Escola` FOREIGN KEY (`EscolaGUID`) REFERENCES `escola` (`EscolaGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_ApiKey_CriadoPor` FOREIGN KEY (`ApiKeyCriadoPorGUID`) REFERENCES `usuario` (`UsuarioGUID`) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ---------------------------------------------------
-- 2. registroauditoria — ator passa a ser polimórfico (Usuario XOR ApiKey)
-- ---------------------------------------------------
ALTER TABLE `registroauditoria`
  MODIFY COLUMN `UsuarioGUIDAtor` CHAR(12) NULL COMMENT 'Usuário que executou a ação — NULL quando o ator foi uma chave de API',
  ADD COLUMN `ApiKeyGUIDAtor` CHAR(36) NULL COMMENT 'Chave de API que executou a ação — NULL quando o ator foi um usuário' AFTER `UsuarioGUIDAtor`,
  ADD INDEX `idx_registroauditoria_apikey_ator` (`ApiKeyGUIDAtor`),
  ADD CONSTRAINT `FK_RegistroAuditoria_ApiKeyAtor` FOREIGN KEY (`ApiKeyGUIDAtor`) REFERENCES `apikey` (`ApiKeyGUID`) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Nota: a FK original `FK_RegistroAuditoria_Ator` (UsuarioGUIDAtor →
-- usuario.UsuarioGUID, ON DELETE RESTRICT) continua valendo — MODIFY
-- COLUMN só relaxa a coluna pra NULL, não remove a constraint existente.

-- ⚠️ SEM CHECK constraint de propósito: o MySQL recusa (Error 3823) uma
-- coluna que já participa de uma FK com ON UPDATE CASCADE
-- (FK_RegistroAuditoria_Ator, pré-existente) também entrar num CHECK —
-- testado ao aplicar em produção em 2026-09-13. A regra "exatamente um
-- entre UsuarioGUIDAtor/ApiKeyGUIDAtor" continua garantida em
-- AuditoriaService.registrar() (lança se vier 0 ou 2 preenchidos); não há
-- nenhuma escrita direta nesta tabela vinda de fora desse método, então a
-- ausência do CHECK no banco não abre brecha real.
