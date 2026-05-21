-- =====================================================
-- SCRIPT RÁPIDO: Criar Tabela Anotacao (Copy & Paste)
-- =====================================================
-- Execute linha por linha para identificar onde está o erro

-- LINHA 1: Criar tabela (sempre funciona)
CREATE TABLE `anotacao` (
  `AnotacaoGUID` CHAR(36) NOT NULL,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `AnotacaoData` DATETIME NOT NULL,
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

-- LINHA 2: Foreign key usuario (se der erro, vá para LINHA 2.1)
ALTER TABLE `anotacao` ADD CONSTRAINT `FK_Anotacao_Usuario` 
  FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario`(`UsuarioCPF`) 
  ON UPDATE CASCADE ON DELETE CASCADE;

-- LINHA 2.1: Se LINHA 2 deu erro, ajuste charset primeiro
-- ALTER TABLE `anotacao` MODIFY COLUMN `UsuarioCPF` VARCHAR(14) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL;
-- Depois volte e execute LINHA 2 novamente

-- LINHA 3: Foreign key escola (se der erro, vá para LINHA 3.1)
ALTER TABLE `anotacao` ADD CONSTRAINT `FK_Anotacao_Escola` 
  FOREIGN KEY (`EscolaGUID`) REFERENCES `escola`(`EscolaGUID`) 
  ON UPDATE CASCADE ON DELETE CASCADE;

-- LINHA 3.1: Se LINHA 3 deu erro, ajuste charset primeiro
-- ALTER TABLE `anotacao` MODIFY COLUMN `EscolaGUID` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL;
-- Depois volte e execute LINHA 3 novamente

-- VERIFICAÇÃO FINAL:
SELECT 
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'anotacao'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Saída esperada:
-- FK_Anotacao_Usuario | UsuarioCPF | usuario | UsuarioCPF
-- FK_Anotacao_Escola  | EscolaGUID | escola  | EscolaGUID

-- ✅ SE TUDO DEU CERTO, VOCÊ VERÁ 2 LINHAS ACIMA
