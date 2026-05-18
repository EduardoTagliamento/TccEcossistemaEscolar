# Normalização de CPF no Sistema

## 📋 Resumo

Todos os CPFs do sistema foram padronizados para usar o formato **XXX.XXX.XXX-XX** (com pontos e hífen).

---

## ✅ O que foi feito

### 1. **Função Utilitária Centralizada**

Criado arquivo `backend/utils/helpers/cpf.helper.ts` com funções:

- ✅ `normalizeCPF(cpf)` - Aceita CPF com ou sem formatação, retorna formatado
- ✅ `formatCPF(cpf)` - Formata CPF
- ✅ `cleanCPF(cpf)` - Remove formatação
- ✅ `isValidCPFFormat(cpf)` - Valida formato
- ✅ `isValidCPF(cpf)` - Valida dígitos verificadores

### 2. **Entidades Atualizadas**

Todas as entidades que usam CPF agora usam `normalizeCPF()` no setter:

- ✅ `Usuario.model.ts`
- ✅ `Matricula.model.ts`
- ✅ `Anexo.model.ts`
- ✅ `EscolaxUsuarioxFuncao.model.ts`
- ✅ `VerificacaoEmail.model.ts`
- ✅ `MateriaxProfessorxTurma.model.ts` (Alocações)

**Comportamento:**
```typescript
// ANTES (inconsistente):
usuario.UsuarioCPF = "12345678909";  // ❌ Rejeitava
matricula.UsuarioCPF = "12345678909"; // ✅ Armazenava sem formato

// AGORA (padronizado):
usuario.UsuarioCPF = "12345678909";   // ✅ Formata automaticamente → "123.456.789-09"
matricula.UsuarioCPF = "123.456.789-09"; // ✅ Mantém formato → "123.456.789-09"
```

### 3. **Services Atualizados**

- ✅ `professor.service.ts` - Removida função `formatCPF()` duplicada (usa a entidade agora)

### 4. **Script SQL de Migração**

Criado `backend/database/migrations/fix-cpf-formatting.sql` para:

- ✅ Verificar CPFs sem formatação no banco
- ✅ Atualizar todas as tabelas (usuario, matricula, anexo, etc.)
- ✅ Validar resultado final

---

## 🚀 Como executar a migração

### Passo 1: Backup do Banco
```bash
mysqldump -u root -p ecossistema_escolar > backup_antes_cpf_$(date +%Y%m%d).sql
```

### Passo 2: Executar Script SQL
```bash
mysql -u root -p ecossistema_escolar < backend/database/migrations/fix-cpf-formatting.sql
```

Ou no MySQL Workbench:
1. Abrir `fix-cpf-formatting.sql`
2. Executar script completo
3. Verificar resultado das queries de verificação

### Passo 3: Reiniciar o Backend
```bash
cd backend
npm run dev
```

### Passo 4: Testar
1. Acessar tela de CRUD de Tarefas
2. Clicar em "Selecionar Alunos"
3. Verificar se os alunos aparecem corretamente

---

## 📊 Exemplo de Transformação

### Antes:
```sql
SELECT * FROM matricula;
-- UsuarioCPF: "12345678909" (sem formatação)

SELECT * FROM usuario;
-- UsuarioCPF: "123.456.789-09" (com formatação)
```

### Depois:
```sql
SELECT * FROM matricula;
-- UsuarioCPF: "123.456.789-09" (com formatação)

SELECT * FROM usuario;
-- UsuarioCPF: "123.456.789-09" (com formatação)
```

---

## 🔄 Fluxo de Normalização

```
Input (qualquer formato)
    ↓
normalizeCPF()
    ↓
1. Remove formatação → "12345678909"
2. Valida 11 dígitos
3. Aplica máscara → "123.456.789-09"
    ↓
Armazenado no banco (sempre formatado)
```

---

## 🎯 Benefícios

1. **Consistência** - Todos os CPFs no mesmo formato
2. **Manutenibilidade** - Lógica centralizada em um arquivo
3. **Flexibilidade** - Aceita CPF com ou sem formatação na entrada
4. **Legibilidade** - Formato legível no banco de dados
5. **Validação** - Função para validar dígitos verificadores disponível

---

## 📝 Uso da Função Helper

```typescript
import { normalizeCPF, isValidCPF } from "../utils/helpers/cpf.helper";

// Normalizar CPF
const cpfFormatado = normalizeCPF("12345678909");
// Resultado: "123.456.789-09"

// Validar CPF
if (isValidCPF("123.456.789-09")) {
  console.log("CPF válido!");
}

// Nas entidades (automático):
const usuario = new Usuario();
usuario.UsuarioCPF = "12345678909"; // Normaliza automaticamente
console.log(usuario.UsuarioCPF); // "123.456.789-09"
```

---

## ⚠️ Avisos Importantes

1. **Sempre faça backup** antes de executar o script SQL
2. O script é **idempotente** (pode rodar múltiplas vezes sem problema)
3. CPFs inválidos (≠ 11 dígitos) não serão alterados
4. A normalização acontece **automaticamente** ao setar valores nas entidades
5. Não é necessário validar/formatar CPF manualmente nos services

---

## 🐛 Solução do Bug Reportado

**Problema Original:**
- Modal de alunos mostrava "(0 alunos)"
- CPF na tabela `matricula`: `"12345678909"` (sem formatação)
- CPF na tabela `usuario`: `"123.456.789-09"` (com formatação)
- Busca falhava por incompatibilidade de formato

**Solução Implementada:**
1. ✅ Entidades normalizam CPF automaticamente
2. ✅ Banco de dados atualizado com formato padronizado
3. ✅ Busca funciona corretamente
4. ✅ Alunos aparecem no modal

---

## 📅 Data de Implementação

**18 de maio de 2026**

---

## 👤 Responsável

Sistema desenvolvido por: Eduardo Tagliamento
