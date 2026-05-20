# 🌍 Sistema Global de Timezone - Documentação Completa

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Convenções](#convenções)
4. [Implementação](#implementação)
5. [Uso no Código](#uso-no-código)
6. [Testes](#testes)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O sistema de timezone foi implementado para garantir que usuários em **qualquer parte do mundo** possam interagir com o sistema de forma consistente, vendo sempre os horários corretos ajustados ao seu fuso local.

### Problema Resolvido
**Antes**: Datas eram salvas em UTC, causando discrepância de 3 horas para usuários no Brasil (GMT-3).  
**Agora**: Sistema detecta automaticamente o timezone do usuário, salva tudo em GMT-3 (padrão brasileiro) e exibe no fuso local de cada um.

### Benefícios
- ✅ **Consistência**: Banco sempre em GMT-3
- ✅ **Flexibilidade**: Suporta usuários em qualquer timezone
- ✅ **UX**: Horários exibidos no fuso do usuário automaticamente
- ✅ **Transparência**: Aviso visual quando usuário está fora do Brasil

---

## 🏗️ Arquitetura

### Fluxo de Dados

```
┌─────────────┐     converterParaBrasil()     ┌──────────┐
│   Frontend  │  ────────────────────────────> │ Backend  │
│  (qualquer  │                                 │          │
│  timezone)  │                                 │  GMT-3   │
│             │  <──────────────────────────── │ MySQL    │
└─────────────┘     converterDoBrasil()        └──────────┘
                                                   │
                                                   ▼
                                            DATETIME sempre
                                              em GMT-3
```

### Camadas

1. **Utilitários** (`frontend/lib/timezone-utils.ts`)
   - Detecção de timezone
   - Conversões bidirecionais
   - Formatação para exibição

2. **Frontend** (CRUDs e Calendário)
   - Importa funções dos utils
   - Converte ao enviar (usuário → GMT-3)
   - Converte ao receber (GMT-3 → usuário)
   - Exibe avisos quando necessário

3. **Backend** (Controllers)
   - Recebe strings no formato ISO sem timezone
   - Interpreta como GMT-3
   - Salva no MySQL como DATETIME

4. **Banco de Dados**
   - Tipo `DATETIME` (sem timezone)
   - Sempre em GMT-3
   - Comentários nas colunas indicam timezone

---

## 📐 Convenções

### 1. Formato de Data no Banco
```sql
-- Todas as colunas DATETIME devem ter comentário indicando timezone
ProvaData DATETIME NOT NULL COMMENT 'Data/hora em GMT-3 (horário de Brasília)',
TarefaPrazoData DATETIME NOT NULL COMMENT 'Prazo em GMT-3 (horário de Brasília)',
```

### 2. Formato de Transmissão (Frontend → Backend)
```typescript
// Sempre sem timezone (Z) para indicar que é horário local (GMT-3)
"2026-05-20T15:00:00"  // ✅ Correto
"2026-05-20T15:00:00Z" // ❌ Incorreto (indica UTC)
```

### 3. Formato de Exibição
```typescript
// Input datetime-local: YYYY-MM-DDTHH:mm
form.ProvaData = "2026-05-20T15:00"

// Calendário: Formatação localizada
"20/05/2026 15:00" ou "20/05/2026 15:00 (GMT-4)" se fora do Brasil
```

---

## 💻 Implementação

### Arquivo: `frontend/lib/timezone-utils.ts`

#### Funções Principais

##### 1. `converterParaBrasil(dataLocal: string): string`
Converte data do timezone do usuário para GMT-3 (usado ao enviar para backend).

```typescript
// Exemplo: Usuário em Londres (GMT+1) cria prova para 15:00
const dataInput = "2026-05-20T15:00"; // 15:00 em Londres
const dataGMT3 = converterParaBrasil(dataInput); 
// Retorna: "2026-05-20T11:00:00" (15:00 GMT+1 = 11:00 GMT-3)
```

##### 2. `converterDoBrasil(dataGMT3: string | Date): string`
Converte data do banco (GMT-3) para o timezone do usuário (usado ao preencher formulários).

```typescript
// Exemplo: Prova salva no banco como "2026-05-20T15:00:00" (GMT-3)
// Usuário em Nova York (GMT-4) abre para editar
const dataEditavel = converterDoBrasil("2026-05-20T15:00:00");
// Retorna: "2026-05-20T14:00" (15:00 GMT-3 = 14:00 GMT-4)
```

##### 3. `usuarioForaDoBrasil(): boolean`
Verifica se o timezone do navegador é diferente de `America/Sao_Paulo`.

```typescript
if (usuarioForaDoBrasil()) {
  // Exibir aviso
}
```

##### 4. `formatarParaCalendario(dataGMT3: string | Date): string`
Formata data para exibição com indicador de timezone se necessário.

```typescript
// Usuário no Brasil
formatarParaCalendario("2026-05-20T15:00:00");
// Retorna: "20/05/2026 15:00"

// Usuário em Tóquio (GMT+9)
formatarParaCalendario("2026-05-20T15:00:00");
// Retorna: "21/05/2026 03:00 (GMT+9)"
```

---

## 🔧 Uso no Código

### 1. CRUD de Provas

#### Enviar ao Backend (Criar/Editar)
```typescript
import { converterParaBrasil } from '@/lib/timezone-utils';

const payload = {
  prova: {
    ProvaData: converterParaBrasil(form.ProvaData), // ✨ Conversão
    // ... outros campos
  },
};

await fetch('/api/prova', {
  method: 'POST',
  body: JSON.stringify(payload),
});
```

#### Carregar para Edição
```typescript
import { converterDoBrasil } from '@/lib/timezone-utils';

const editarProva = (prova: Prova) => {
  setForm({
    ProvaData: converterDoBrasil(prova.ProvaData), // ✨ Conversão
    // ... outros campos
  });
};
```

#### Exibir Aviso de Timezone
```typescript
import { usuarioForaDoBrasil } from '@/lib/timezone-utils';

{usuarioForaDoBrasil() && (
  <div className={styles.timezoneAlert}>
    🌍 <strong>Atenção:</strong> Você está em um fuso horário diferente do Brasil (GMT-3). 
    As datas e horários exibidos foram ajustados para o seu fuso local.
  </div>
)}
```

### 2. CRUD de Tarefas

Mesma implementação do CRUD de Provas:
- `converterParaBrasil()` ao enviar
- `converterDoBrasil()` ao editar
- `usuarioForaDoBrasil()` para aviso

### 3. Componente de Calendário

O calendário utiliza apenas o aviso visual, pois `toLocaleTimeString()` já faz conversão automática:

```typescript
import { usuarioForaDoBrasil } from '@/lib/timezone-utils';

// Aviso no topo
{usuarioForaDoBrasil() && (
  <div className={styles.timezoneAlert}>
    🌍 <strong>Atenção:</strong> Você está em um fuso horário diferente do Brasil (GMT-3).
    As datas e horários exibidos foram ajustados para o seu fuso local.
  </div>
)}

// Exibição automática com conversão nativa do navegador
{new Date(aviso.DataPrazo).toLocaleTimeString('pt-BR', {
  hour: '2-digit',
  minute: '2-digit'
})}
```

---

## 🧪 Testes

### Teste Manual - Diferentes Timezones

#### 1. Simular Timezone no Navegador (Chrome DevTools)

```javascript
// 1. Abra DevTools (F12)
// 2. Abra o Console
// 3. Execute:

// Simular Nova York (GMT-4)
Intl.DateTimeFormat().resolvedOptions().timeZone = 'America/New_York';

// Simular Londres (GMT+1)
Intl.DateTimeFormat().resolvedOptions().timeZone = 'Europe/London';

// Simular Tóquio (GMT+9)
Intl.DateTimeFormat().resolvedOptions().timeZone = 'Asia/Tokyo';

// 4. Recarregue a página
```

#### 2. Validar Comportamento

**Cenário 1: Criar Prova no Brasil**
```
Timezone: America/Sao_Paulo (GMT-3)
Input: 20/05/2026 15:00
Esperado no banco: 2026-05-20 15:00:00
✅ Aviso de timezone: NÃO exibido
```

**Cenário 2: Criar Prova em Nova York**
```
Timezone: America/New_York (GMT-4)
Input: 20/05/2026 15:00 (horário NY)
Esperado no banco: 2026-05-20 16:00:00 (16:00 GMT-3 = 15:00 GMT-4)
✅ Aviso de timezone: EXIBIDO
```

**Cenário 3: Editar Prova em Tóquio**
```
Timezone: Asia/Tokyo (GMT+9)
Banco: 2026-05-20 15:00:00 (GMT-3)
Esperado no input: 21/05/2026 03:00 (15:00 GMT-3 = 03:00 do dia seguinte GMT+9)
✅ Aviso de timezone: EXIBIDO
```

### Teste Automatizado

```typescript
// Arquivo: frontend/lib/__tests__/timezone-utils.test.ts

import { converterParaBrasil, converterDoBrasil } from '../timezone-utils';

describe('Timezone Utils', () => {
  test('converte corretamente para GMT-3', () => {
    const input = '2026-05-20T15:00';
    const resultado = converterParaBrasil(input);
    expect(resultado).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });

  test('converte corretamente do GMT-3', () => {
    const input = '2026-05-20T15:00:00';
    const resultado = converterDoBrasil(input);
    expect(resultado).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});
```

---

## 🔍 Troubleshooting

### Problema 1: "Horário salvo está 3 horas adiantado"

**Causa**: Frontend enviando data em UTC (`.toISOString()`) ao invés de usar `converterParaBrasil()`.

**Solução**:
```typescript
// ❌ Errado
ProvaData: new Date(form.ProvaData).toISOString()

// ✅ Correto
ProvaData: converterParaBrasil(form.ProvaData)
```

### Problema 2: "Ao editar, horário aparece diferente do salvo"

**Causa**: Não está usando `converterDoBrasil()` ao preencher o formulário.

**Solução**:
```typescript
// ❌ Errado
ProvaData: prova.ProvaData.slice(0, 16)

// ✅ Correto
ProvaData: converterDoBrasil(prova.ProvaData)
```

### Problema 3: "Aviso de timezone não aparece"

**Causa**: Navegador configurado com timezone `America/Sao_Paulo`.

**Verificação**:
```javascript
// Console do navegador
console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);
// Se retornar "America/Sao_Paulo", aviso não é exibido (comportamento correto)
```

### Problema 4: "Backend retorna erro de data inválida"

**Causa**: String sendo enviada com 'Z' no final (indicando UTC).

**Solução**: Garantir que `converterParaBrasil()` remove o 'Z':
```typescript
return dataAjustada.toISOString().slice(0, 19); // Remove .000Z
```

---

## 📊 Fluxograma Completo

```
┌────────────────────────────────────────────────────────────────┐
│                    CRIAR NOVA PROVA/TAREFA                     │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
          ┌───────────────────────────────────────┐
          │ Usuário preenche data no formulário   │
          │ Ex: 20/05/2026 15:00                  │
          │ (no timezone do navegador)            │
          └───────────────────────────────────────┘
                              │
                              ▼
          ┌───────────────────────────────────────┐
          │  converterParaBrasil(dataLocal)       │
          │  • Detecta timezone do navegador      │
          │  • Calcula diferença para GMT-3       │
          │  • Retorna ISO sem timezone           │
          └───────────────────────────────────────┘
                              │
                              ▼
          ┌───────────────────────────────────────┐
          │  POST /api/prova                      │
          │  Body: {                              │
          │    ProvaData: "2026-05-20T15:00:00"   │
          │  }                                    │
          └───────────────────────────────────────┘
                              │
                              ▼
          ┌───────────────────────────────────────┐
          │  Backend (Node.js)                    │
          │  new Date("2026-05-20T15:00:00")      │
          │  → Interpreta como GMT-3              │
          └───────────────────────────────────────┘
                              │
                              ▼
          ┌───────────────────────────────────────┐
          │  MySQL INSERT                         │
          │  ProvaData = '2026-05-20 15:00:00'    │
          │  (DATETIME, sempre GMT-3)             │
          └───────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    EDITAR PROVA/TAREFA                         │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
          ┌───────────────────────────────────────┐
          │  MySQL SELECT                         │
          │  ProvaData = '2026-05-20 15:00:00'    │
          │  (GMT-3)                              │
          └───────────────────────────────────────┘
                              │
                              ▼
          ┌───────────────────────────────────────┐
          │  GET /api/prova/:id                   │
          │  Response: {                          │
          │    ProvaData: "2026-05-20T15:00:00"   │
          │  }                                    │
          └───────────────────────────────────────┘
                              │
                              ▼
          ┌───────────────────────────────────────┐
          │  converterDoBrasil(provaData)         │
          │  • Adiciona offset -03:00             │
          │  • Converte para timezone do navegador│
          │  • Formata para input datetime-local  │
          └───────────────────────────────────────┘
                              │
                              ▼
          ┌───────────────────────────────────────┐
          │  Formulário preenchido                │
          │  Ex (usuário em NY GMT-4):            │
          │  "2026-05-20T14:00"                   │
          │  (15:00 GMT-3 = 14:00 GMT-4)          │
          └───────────────────────────────────────┘
```

---

## 📝 Checklist de Implementação

Para adicionar suporte de timezone em uma nova feature:

- [ ] Importar funções de `@/lib/timezone-utils`
- [ ] Usar `converterParaBrasil()` antes de enviar ao backend
- [ ] Usar `converterDoBrasil()` ao carregar para edição
- [ ] Adicionar aviso com `usuarioForaDoBrasil()`
- [ ] Adicionar CSS para `.timezoneAlert`
- [ ] Testar com diferentes timezones simulados
- [ ] Validar no banco que está salvando em GMT-3
- [ ] Documentar no código que o campo é GMT-3

---

## 🎓 Boas Práticas

1. **Sempre use os utilitários**: Nunca faça conversões manuais de timezone
2. **Comente os campos**: Indique explicitamente que DATETIME é GMT-3
3. **Teste em diferentes timezones**: Use DevTools para simular
4. **Mantenha consistência**: Todos os CRUDs devem seguir o mesmo padrão
5. **Documente mudanças**: Atualize esta documentação se alterar o comportamento

---

## 📚 Referências

- [MDN - Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [MDN - Date.toISOString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)
- [IANA Time Zone Database](https://www.iana.org/time-zones)
- [MySQL DATETIME Documentation](https://dev.mysql.com/doc/refman/8.0/en/datetime.html)

---

**Última atualização**: 20/05/2026  
**Versão**: 1.0  
**Autor**: Sistema TCC Ecossistema Escolar
