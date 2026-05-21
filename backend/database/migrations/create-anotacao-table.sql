-- Migration: Criar tabela anotacao
-- Data: 21/05/2026
-- Descrição: Sistema de anotações pessoais para usuários vinculados a escolas

-- SOLUÇÃO PARA ERRO 3780 (incompatibilidade de foreign key):
-- Criamos a tabela SEM foreign keys, depois adicionamos separadamente
-- Isso permite que o MySQL ajuste automaticamente charset/collation

-- PASSO 1: Criar tabela sem foreign keys
CREATE TABLE `anotacao` (
  `AnotacaoGUID` CHAR(36) NOT NULL,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `AnotacaoData` DATETIME NOT NULL COMMENT 'Data da anotação em GMT-3 (America/Sao_Paulo)',
  `AnotacaoTitulo` VARCHAR(256) NOT NULL,
  `AnotacaoDescricao` VARCHAR(2048) NULL,
  `AnotacaoIsFeito` BOOLEAN NOT NULL DEFAULT FALSE,
  `AnotacaoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `AnotacaoUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`AnotacaoGUID`),
  INDEX `idx_anotacao_usuario` (`UsuarioCPF`),
  INDEX `idx_anotacao_escola` (`EscolaGUID`),
  INDEX `idx_anotacao_data` (`AnotacaoData`),
  INDEX `idx_anotacao_feito` (`AnotacaoIsFeito`)
) ENGINE=InnoDB;

-- PASSO 2: Adicionar foreign key para usuario
-- Se houver erro aqui, a causa é charset/collation incompatível
ALTER TABLE `anotacao`
  ADD CONSTRAINT `FK_Anotacao_Usuario` FOREIGN KEY (`UsuarioCPF`) 
    REFERENCES `usuario`(`UsuarioCPF`) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;

-- PASSO 3: Adicionar foreign key para escola
ALTER TABLE `anotacao`
  ADD CONSTRAINT `FK_Anotacao_Escola` FOREIGN KEY (`EscolaGUID`) 
    REFERENCES `escola`(`EscolaGUID`) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;

-- VERIFICAÇÃO: Se os passos 2 ou 3 falharem, execute este diagnóstico:
-- SELECT 
--   'usuario' AS tabela,
--   COLUMN_NAME,
--   CHARACTER_SET_NAME,
--   COLLATION_NAME
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND TABLE_NAME = 'usuario'
--   AND COLUMN_NAME = 'UsuarioCPF'
-- UNION ALL
-- SELECT 
--   'anotacao',
--   COLUMN_NAME,
--   CHARACTER_SET_NAME,
--   COLLATION_NAME
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND TABLE_NAME = 'anotacao'
--   AND COLUMN_NAME = 'UsuarioCPF';

-- Se os charsets/collations forem diferentes, execute:
-- ALTER TABLE `anotacao` 
--   MODIFY COLUMN `UsuarioCPF` VARCHAR(14) 
--   CHARACTER SET [charset_da_tabela_usuario] 
--   COLLATE [collation_da_tabela_usuario] NOT NULL;
-- 
-- ALTER TABLE `anotacao` 
--   MODIFY COLUMN `EscolaGUID` CHAR(36) 
--   CHARACTER SET [charset_da_tabela_escola] 
--   COLLATE [collation_da_tabela_escola] NOT NULL;
--
-- Depois repita os passos 2 e 3.

-- Verificar se a tabela relacaoanexos existe e se possui suporte para AnotacaoGUID
-- Se a tabela relacaoanexos já existe, adicionar coluna AnotacaoGUID
-- Se não existe, criar com suporte completo

-- Verificar estrutura atual de relacaoanexos (comentado - executar se já existir):
-- ALTER TABLE `tccecossistemaescolar`.`relacaoanexos`
-- ADD COLUMN `AnotacaoGUID` CHAR(36) NULL AFTER `EventoGUID`,
-- ADD FOREIGN KEY (`AnotacaoGUID`) REFERENCES `anotacao`(`AnotacaoGUID`) ON UPDATE CASCADE ON DELETE CASCADE;

-- Atualizar constraint CHECK para incluir anotacao (se relacaoanexos já existir):
-- ALTER TABLE `tccecossistemaescolar`.`relacaoanexos`
-- DROP CHECK `relacaoanexos_chk_1`;

-- ALTER TABLE `tccecossistemaescolar`.`relacaoanexos`
-- ADD CONSTRAINT `relacaoanexos_chk_1` CHECK (
--   (TarefaGUID IS NOT NULL AND PendenciaGUID IS NULL AND EventoGUID IS NULL AND AnotacaoGUID IS NULL) OR
--   (TarefaGUID IS NULL AND PendenciaGUID IS NOT NULL AND EventoGUID IS NULL AND AnotacaoGUID IS NULL) OR
--   (TarefaGUID IS NULL AND PendenciaGUID IS NULL AND EventoGUID IS NOT NULL AND AnotacaoGUID IS NULL) OR
--   (TarefaGUID IS NULL AND PendenciaGUID IS NULL AND EventoGUID IS NULL AND AnotacaoGUID IS NOT NULL)
-- );

-- Adicionar índice para AnotacaoGUID (se relacaoanexos já existir):
-- CREATE INDEX `idx_relacao_anotacao` ON `relacaoanexos` (`AnotacaoGUID`);
