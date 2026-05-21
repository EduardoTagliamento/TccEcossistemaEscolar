-- =====================================================
-- ALTERNATIVA: Migration Anotacao com Charset Explícito
-- =====================================================
-- Use esta versão se a migration padrão continuar falhando
-- Esta versão especifica charset/collation diretamente nas colunas

-- PRIMEIRO: Execute este diagnóstico para ver o charset/collation correto
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  COLUMN_TYPE,
  CHARACTER_SET_NAME,
  COLLATION_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('usuario', 'escola')
  AND COLUMN_NAME IN ('UsuarioCPF', 'EscolaGUID');

-- RESULTADO ESPERADO:
-- usuario  | UsuarioCPF | varchar(14) | utf8mb4 | utf8mb4_general_ci
-- escola   | EscolaGUID | char(36)    | utf8mb4 | utf8mb4_general_ci

-- =====================================================
-- OPÇÃO A: Charset/Collation utf8mb4_general_ci
-- =====================================================
CREATE TABLE `anotacao` (
  `AnotacaoGUID` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `UsuarioCPF` VARCHAR(14) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `EscolaGUID` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `AnotacaoData` DATETIME NOT NULL COMMENT 'Data da anotação em GMT-3 (America/Sao_Paulo)',
  `AnotacaoTitulo` VARCHAR(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `AnotacaoDescricao` VARCHAR(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `AnotacaoIsFeito` BOOLEAN NOT NULL DEFAULT FALSE,
  `AnotacaoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `AnotacaoUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`AnotacaoGUID`),
  INDEX `idx_anotacao_usuario` (`UsuarioCPF`),
  INDEX `idx_anotacao_escola` (`EscolaGUID`),
  INDEX `idx_anotacao_data` (`AnotacaoData`),
  INDEX `idx_anotacao_feito` (`AnotacaoIsFeito`),
  
  CONSTRAINT `FK_Anotacao_Usuario` FOREIGN KEY (`UsuarioCPF`) 
    REFERENCES `usuario`(`UsuarioCPF`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_Anotacao_Escola` FOREIGN KEY (`EscolaGUID`) 
    REFERENCES `escola`(`EscolaGUID`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================
-- OPÇÃO B: Charset/Collation utf8mb4_unicode_ci
-- =====================================================
-- Se a Opção A falhar, tente esta:
/*
CREATE TABLE `anotacao` (
  `AnotacaoGUID` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `UsuarioCPF` VARCHAR(14) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `EscolaGUID` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `AnotacaoData` DATETIME NOT NULL COMMENT 'Data da anotação em GMT-3 (America/Sao_Paulo)',
  `AnotacaoTitulo` VARCHAR(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `AnotacaoDescricao` VARCHAR(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `AnotacaoIsFeito` BOOLEAN NOT NULL DEFAULT FALSE,
  `AnotacaoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `AnotacaoUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`AnotacaoGUID`),
  INDEX `idx_anotacao_usuario` (`UsuarioCPF`),
  INDEX `idx_anotacao_escola` (`EscolaGUID`),
  INDEX `idx_anotacao_data` (`AnotacaoData`),
  INDEX `idx_anotacao_feito` (`AnotacaoIsFeito`),
  
  CONSTRAINT `FK_Anotacao_Usuario` FOREIGN KEY (`UsuarioCPF`) 
    REFERENCES `usuario`(`UsuarioCPF`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_Anotacao_Escola` FOREIGN KEY (`EscolaGUID`) 
    REFERENCES `escola`(`EscolaGUID`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
*/

-- =====================================================
-- OPÇÃO C: Charset utf8 (legado)
-- =====================================================
-- Apenas se o banco for muito antigo:
/*
CREATE TABLE `anotacao` (
  `AnotacaoGUID` CHAR(36) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `UsuarioCPF` VARCHAR(14) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `EscolaGUID` CHAR(36) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `AnotacaoData` DATETIME NOT NULL COMMENT 'Data da anotação em GMT-3 (America/Sao_Paulo)',
  `AnotacaoTitulo` VARCHAR(256) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `AnotacaoDescricao` VARCHAR(2048) CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
  `AnotacaoIsFeito` BOOLEAN NOT NULL DEFAULT FALSE,
  `AnotacaoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `AnotacaoUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`AnotacaoGUID`),
  INDEX `idx_anotacao_usuario` (`UsuarioCPF`),
  INDEX `idx_anotacao_escola` (`EscolaGUID`),
  INDEX `idx_anotacao_data` (`AnotacaoData`),
  INDEX `idx_anotacao_feito` (`AnotacaoIsFeito`),
  
  CONSTRAINT `FK_Anotacao_Usuario` FOREIGN KEY (`UsuarioCPF`) 
    REFERENCES `usuario`(`UsuarioCPF`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_Anotacao_Escola` FOREIGN KEY (`EscolaGUID`) 
    REFERENCES `escola`(`EscolaGUID`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
*/

-- =====================================================
-- VERIFICAÇÃO PÓS-CRIAÇÃO
-- =====================================================
-- Após sucesso, verifique:
SHOW CREATE TABLE anotacao;

SELECT 
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'anotacao'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
