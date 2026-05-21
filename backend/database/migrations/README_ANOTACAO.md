# 📁 Migrations - Tabela Anotacao

Esta pasta contém múltiplas versões da migration para criar a tabela `anotacao`, além de guias de troubleshooting.

## 📄 Arquivos Disponíveis

### 1. `create-anotacao-SIMPLES.sql` ⭐ **RECOMENDADO**
**Use este primeiro!**

- ✅ Cria tabela em 3 passos separados
- ✅ Fácil de diagnosticar onde está o erro
- ✅ Instruções inline para ajustar charset se necessário
- ✅ Copy & paste linha por linha

**Quando usar:** Sempre como primeira tentativa.

---

### 2. `create-anotacao-table.sql`
Versão padrão da migration.

- Cria tabela sem foreign keys
- Adiciona foreign keys separadamente com ALTER TABLE
- Comentários explicativos
- Queries de diagnóstico incluídas

**Quando usar:** Se preferir rodar um arquivo completo via `mysql < arquivo.sql`.

---

### 3. `create-anotacao-ALTERNATIVA.sql`
Versão com charset/collation **explícitos** em cada coluna.

- Especifica `CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci` em TODAS as colunas
- Inclui 3 opções (general_ci, unicode_ci, utf8 legado)
- Cria tudo de uma vez (sem passos separados)

**Quando usar:** Se os outros métodos continuarem falhando e você souber exatamente qual charset/collation usar.

---

### 4. `TROUBLESHOOTING_ANOTACAO_FK.md` 📚
Guia completo de diagnóstico e solução do erro 3780.

Contém:
- Explicação do erro
- Comandos de diagnóstico
- 4+ soluções diferentes
- Verificações pós-criação
- Links de referência MySQL

**Quando usar:** Quando nenhuma migration funcionar e você precisar entender o problema a fundo.

---

## 🚀 Fluxo de Uso Recomendado

### Passo 1: Tente o Script Simples
```bash
# Abra seu cliente MySQL
mysql -u usuario -p database
```

Copie e cole do arquivo `create-anotacao-SIMPLES.sql`:
1. Execute LINHA 1 (CREATE TABLE) - deve funcionar sempre
2. Execute LINHA 2 (FK usuario) - se falhar, ajuste charset e repita
3. Execute LINHA 3 (FK escola) - se falhar, ajuste charset e repita

### Passo 2: Se Falhou, Diagnóstico Rápido
```sql
-- Ver charset/collation das tabelas existentes
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CHARACTER_SET_NAME,
  COLLATION_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('usuario', 'escola')
  AND COLUMN_NAME IN ('UsuarioCPF', 'EscolaGUID');
```

### Passo 3: Ajustar e Tentar Novamente
Se o diagnóstico mostrar charset diferente, ajuste as colunas da tabela `anotacao`:

```sql
ALTER TABLE `anotacao` 
  MODIFY COLUMN `UsuarioCPF` VARCHAR(14) 
  CHARACTER SET [charset] COLLATE [collation] NOT NULL;
```

Depois repita as LINHA 2 e 3 do script simples.

### Passo 4: Se Ainda Falhou
Consulte o [TROUBLESHOOTING_ANOTACAO_FK.md](./TROUBLESHOOTING_ANOTACAO_FK.md) para soluções avançadas.

---

## ❓ FAQ

### Por que tantos arquivos diferentes?
Diferentes bancos MySQL podem ter configurações diferentes de charset/collation. Fornecemos múltiplas abordagens para garantir que pelo menos uma funcione.

### Qual a diferença entre utf8mb4_general_ci e utf8mb4_unicode_ci?
- **general_ci**: Mais rápido, comparação simplificada
- **unicode_ci**: Mais preciso, segue padrão Unicode completo

Ambos funcionam para este projeto. Use o que sua tabela `usuario` já usa.

### Posso deletar esses arquivos depois?
Sim, após criar a tabela com sucesso, pode manter apenas um para referência ou deletar todos.

### E se minha tabela `usuario` usar utf8 (sem mb4)?
Use a OPÇÃO C do arquivo `create-anotacao-ALTERNATIVA.sql` que suporta utf8 legado.

---

## ✅ Verificação Final

Após criar a tabela com sucesso, execute:

```sql
-- Verificar foreign keys
SELECT 
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'anotacao'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

**Saída esperada:**
```
FK_Anotacao_Usuario | UsuarioCPF | usuario | UsuarioCPF
FK_Anotacao_Escola  | EscolaGUID | escola  | EscolaGUID
```

Se você vir essas 2 linhas, **a tabela foi criada corretamente!** ✅

---

## 📞 Suporte

Se após seguir todos os passos a tabela ainda não foi criada:
1. Capture a mensagem de erro completa
2. Execute o diagnóstico do Passo 2 e anote os valores
3. Leia o [TROUBLESHOOTING_ANOTACAO_FK.md](./TROUBLESHOOTING_ANOTACAO_FK.md)

---

**Arquivos criados em:** 21/05/2026  
**Projeto:** TCC Ecossistema Escolar - Sistema de Anotações
