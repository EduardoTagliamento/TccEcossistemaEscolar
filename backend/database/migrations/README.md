# 📋 Migrations Database

Este diretório contém scripts de migração SQL para evolução do banco de dados.

## 🔄 Como Executar Migrations

### Opção 1: Via Railway (Banco em Produção/Desenvolvimento)

Se você está usando o banco Railway configurado no `.env`:

1. Acesse o [Railway Dashboard](https://railway.app/)
2. Navegue até seu projeto
3. Clique em **MySQL** > **Query**
4. Cole o conteúdo do arquivo `.sql` da migration
5. Execute

### Opção 2: Via MySQL CLI (Banco Local)

Se você está usando banco local:

```bash
# Conectar ao banco
mysql -u root -p tccecossistemaescolar

# Executar migration
SOURCE backend/database/migrations/2026-05-12-add-escola-is-tecnica.sql;
```

### Opção 3: Via Script TypeScript

Alguns arquivos `.ts` podem ser executados diretamente:

```bash
npx tsx backend/database/migrations/add-escola-is-tecnica.ts
```

**⚠️ Nota:** Scripts TypeScript só funcionam se você conseguir conectar ao banco do ambiente local.

## 📝 Migrations Disponíveis

### ✅ 2026-05-12-add-escola-is-tecnica.sql
**Status:** Pendente de execução  
**Descrição:** Adiciona campo `EscolaIsTecnica` para identificar escolas técnicas  
**Necessário para:** Implementação dos módulos acadêmicos (matéria, curso, turma, matrícula, professor)

**O que faz:**
- Adiciona coluna `EscolaIsTecnica BOOLEAN NOT NULL DEFAULT FALSE`
- Adiciona índice `idx_escola_is_tecnica`

**Como verificar se já foi executado:**
```sql
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'escola' 
  AND COLUMN_NAME = 'EscolaIsTecnica';
```

Se retornar resultado, a migration já foi executada.

## 🎯 Próximas Etapas

Após executar a migration `add-escola-is-tecnica`, você estará pronto para:

1. ✅ Criar escolas marcando se são técnicas ou não
2. ✅ Começar implementação dos módulos acadêmicos seguindo o [PLANO_IMPLEMENTACAO_MODULOS_ACADEMICOS.md](../../docs/PLANO_IMPLEMENTACAO_MODULOS_ACADEMICOS.md)

## ⚠️ Importante

- **Sempre faça backup do banco antes de executar migrations em produção**
- Migrations devem ser executadas na ordem cronológica (data no nome do arquivo)
- Se uma migration falhar, não execute as próximas até resolver o problema
