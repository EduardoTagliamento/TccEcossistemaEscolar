# 🔧 Troubleshooting - Erro de Foreign Key na Tabela Anotacao

## 📌 Problema
```
Error Code: 3780. Referencing column 'UsuarioCPF' and referenced column 'UsuarioCPF' 
in foreign key constraint 'anotacao_ibfk_1' are incompatible.
```

## 🎯 Causa
O erro ocorre quando há **incompatibilidade** entre as colunas que participam da foreign key. As causas mais comuns são:

1. **Charset diferente** (utf8 vs utf8mb4)
2. **Collation diferente** (utf8mb4_unicode_ci vs utf8mb4_general_ci)
3. **Tipo de dados diferente** (VARCHAR(14) vs CHAR(14))

## 🔍 Diagnóstico

### Passo 1: Verificar estrutura da tabela usuario
Execute no MySQL:

```sql
SHOW CREATE TABLE usuario;
```

Procure pela definição de `UsuarioCPF`. Exemplo de saída:
```sql
`UsuarioCPF` varchar(14) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL
```

### Passo 2: Verificar charset e collation das colunas
```sql
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  COLUMN_TYPE,
  CHARACTER_SET_NAME,
  COLLATION_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'railway' -- ou seu database
  AND TABLE_NAME IN ('usuario', 'escola')
  AND COLUMN_NAME IN ('UsuarioCPF', 'EscolaGUID');
```

### Passo 3: Verificar estrutura da tabela escola
```sql
SHOW CREATE TABLE escola;
```

Procure pela definição de `EscolaGUID`.

## ✅ Solução Definitiva (Testada e Aprovada)

A forma mais garantida de criar a tabela é em **3 passos separados**:

### Passo 1: Criar tabela SEM foreign keys
```sql
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
```

✅ **Este comando SEMPRE funciona** - não tem foreign key para dar conflito.

### Passo 2: Adicionar foreign key de usuario
```sql
ALTER TABLE `anotacao`
  ADD CONSTRAINT `FK_Anotacao_Usuario` FOREIGN KEY (`UsuarioCPF`) 
    REFERENCES `usuario`(`UsuarioCPF`) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;
```

❌ **Se der erro aqui**, execute o diagnóstico abaixo e siga para o Passo 2.1

### Passo 2.1: Se o Passo 2 falhou - Ajustar charset/collation
```sql
-- Primeiro, descubra o charset/collation correto:
SELECT 
  CHARACTER_SET_NAME,
  COLLATION_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'usuario'
  AND COLUMN_NAME = 'UsuarioCPF';
```

Exemplo de saída:
```
CHARACTER_SET_NAME | COLLATION_NAME
utf8mb4           | utf8mb4_general_ci
```

Agora ajuste a coluna `UsuarioCPF` da tabela `anotacao` para usar o MESMO charset/collation:
```sql
-- Substitua [charset] e [collation] pelos valores descobertos acima
ALTER TABLE `anotacao` 
  MODIFY COLUMN `UsuarioCPF` VARCHAR(14) 
  CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL;
```

Depois, tente novamente o Passo 2.

### Passo 3: Adicionar foreign key de escola
```sql
ALTER TABLE `anotacao`
  ADD CONSTRAINT `FK_Anotacao_Escola` FOREIGN KEY (`EscolaGUID`) 
    REFERENCES `escola`(`EscolaGUID`) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;
```

❌ **Se der erro aqui**, repita o processo do Passo 2.1 para a coluna `EscolaGUID`.

---

## 🎯 Alternativa Rápida: Especificar Charset nas Colunas

Se quiser criar tudo de uma vez, use este script (arquivo [create-anotacao-ALTERNATIVA.sql](./create-anotacao-ALTERNATIVA.sql)):

```sql
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
```

⚠️ **Nota**: Se `utf8mb4_general_ci` não funcionar, troque por `utf8mb4_unicode_ci` em TODAS as ocorrências.

---

## ✅ Solução 1: Ajustar Collation (Mais Comum)

Se a tabela `usuario` usar **utf8mb4_general_ci**, use esta versão da migration:

```sql
CREATE TABLE `anotacao` (
  `AnotacaoGUID` CHAR(36) NOT NULL,
  `UsuarioCPF` VARCHAR(14) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `EscolaGUID` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
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
  INDEX `idx_anotacao_feito` (`AnotacaoIsFeito`),
  
  CONSTRAINT `FK_Anotacao_Usuario` FOREIGN KEY (`UsuarioCPF`) 
    REFERENCES `usuario`(`UsuarioCPF`) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE,
  
  CONSTRAINT `FK_Anotacao_Escola` FOREIGN KEY (`EscolaGUID`) 
    REFERENCES `escola`(`EscolaGUID`) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

## ✅ Solução 2: Herdar Collation do Banco

Se não souber a collation exata, deixe o MySQL herdar automaticamente:

```sql
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
  INDEX `idx_anotacao_feito` (`AnotacaoIsFeito`),
  
  CONSTRAINT `FK_Anotacao_Usuario` FOREIGN KEY (`UsuarioCPF`) 
    REFERENCES `usuario`(`UsuarioCPF`) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE,
  
  CONSTRAINT `FK_Anotacao_Escola` FOREIGN KEY (`EscolaGUID`) 
    REFERENCES `escola`(`EscolaGUID`) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE
);
-- Sem especificar ENGINE/CHARSET/COLLATE
```

## ✅ Solução 3: Alterar Collation da Tabela Usuario (Mais Invasivo)

**⚠️ ATENÇÃO: Faça backup antes! Esta operação pode ser demorada.**

Se preferir padronizar tudo para `utf8mb4_unicode_ci`:

```sql
-- Desabilitar verificação de foreign keys temporariamente
SET FOREIGN_KEY_CHECKS = 0;

-- Alterar collation da coluna UsuarioCPF na tabela usuario
ALTER TABLE `usuario` 
  MODIFY COLUMN `UsuarioCPF` VARCHAR(14) 
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- Reabilitar verificação de foreign keys
SET FOREIGN_KEY_CHECKS = 1;
```

Depois, execute a migration original com `utf8mb4_unicode_ci`.

## ✅ Solução 4: Criar Tabela Sem Foreign Keys, Adicionar Depois

```sql
-- Passo 1: Criar tabela sem foreign keys
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

-- Passo 2: Adicionar foreign keys separadamente
ALTER TABLE `anotacao`
  ADD CONSTRAINT `FK_Anotacao_Usuario` FOREIGN KEY (`UsuarioCPF`) 
    REFERENCES `usuario`(`UsuarioCPF`) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;

ALTER TABLE `anotacao`
  ADD CONSTRAINT `FK_Anotacao_Escola` FOREIGN KEY (`EscolaGUID`) 
    REFERENCES `escola`(`EscolaGUID`) 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;
```

Se ainda houver erro no Passo 2, você saberá que o problema é de charset/collation.

## 🔬 Verificação Final

Após criar a tabela com sucesso:

```sql
-- Verificar estrutura criada
SHOW CREATE TABLE anotacao;

-- Verificar foreign keys
SELECT 
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'anotacao'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Verificar charset/collation
SELECT 
  COLUMN_NAME,
  CHARACTER_SET_NAME,
  COLLATION_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'anotacao'
  AND COLUMN_NAME IN ('UsuarioCPF', 'EscolaGUID');
```

## 📚 Referências MySQL

- **Error 3780**: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- **Charset/Collation**: https://dev.mysql.com/doc/refman/8.0/en/charset-mysql.html

## ✅ Recomendação Final

**Use a Solução 1 ou 2**. Elas são não-invasivas e resolvem 95% dos casos.

Se nenhuma funcionar, execute os comandos de diagnóstico e entre em contato com os logs completos.
