# Migration: Adicionar CursoGUID em materia

## ✅ Status da Migration

Esta migration adiciona o campo `CursoGUID` na tabela `materia` para permitir associar matérias a cursos específicos (necessário para escolas técnicas).

## 📝 Como Executar

### Opção 1: Via TypeScript (dentro do Railway ou com VPN)
```bash
npx tsx backend/database/migrations/add-curso-guid-to-materia.ts
```

### Opção 2: Via SQL Direto (Railway Dashboard)

1. Acesse o Railway Dashboard: https://railway.app/
2. Vá para o projeto do banco de dados
3. Clique em "Query" ou abra o MySQL CLI
4. Execute o SQL abaixo:

```sql
-- Verificar se coluna já existe
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'railway' 
  AND TABLE_NAME = 'materia' 
  AND COLUMN_NAME = 'CursoGUID';

-- Se não existir, executar os comandos abaixo:

-- 1. Adicionar coluna
ALTER TABLE materia 
ADD COLUMN CursoGUID CHAR(36) NULL 
AFTER EscolaGUID;

-- 2. Adicionar índice
ALTER TABLE materia 
ADD INDEX idx_materia_curso (CursoGUID);

-- 3. Adicionar foreign key
ALTER TABLE materia 
ADD CONSTRAINT FK_Materia_Curso FOREIGN KEY (CursoGUID)
  REFERENCES curso (CursoGUID)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

-- Verificar resultado
DESCRIBE materia;
```

## 🔄 Rollback (se necessário)

```sql
ALTER TABLE materia
DROP FOREIGN KEY FK_Materia_Curso;

ALTER TABLE materia
DROP INDEX idx_materia_curso;

ALTER TABLE materia
DROP COLUMN CursoGUID;
```

## 📊 Impacto

- ✅ Não afeta dados existentes (coluna é NULL)
- ✅ Permite matérias sem curso (opcional)
- ✅ DELETE CASCADE em curso → SET NULL em materia
- ✅ Mantém integridade referencial

## 🎯 Próximos Passos

Após executar esta migration:
1. ✅ Atualizar model de Materia (adicionar CursoGUID)
2. ✅ Atualizar APIs de materia para aceitar CursoGUID
3. ✅ Implementar Fase 1 (Cadastro de Cursos)
4. ✅ Implementar Fase 2 (Cadastro de Matérias com Curso)
