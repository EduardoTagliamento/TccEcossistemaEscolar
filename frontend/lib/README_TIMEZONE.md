# Timezone Utilities

Utilitários para conversão e formatação de datas/horários entre diferentes timezones.

## 🎯 Objetivo

Garantir que usuários em **qualquer timezone** vejam horários corretos, enquanto o banco de dados mantém tudo padronizado em **GMT-3 (horário de Brasília)**.

## 📦 Funções Disponíveis

### `converterParaBrasil(dataLocal: string): string`

Converte data do timezone do usuário para GMT-3 (Brasil).

**Quando usar**: Antes de enviar data para o backend (criar/editar).

```typescript
import { converterParaBrasil } from '@/lib/timezone-utils';

const payload = {
  ProvaData: converterParaBrasil(form.ProvaData) // "2026-05-20T15:00" → "2026-05-20T15:00:00"
};
```

---

### `converterDoBrasil(dataGMT3: string | Date): string`

Converte data do banco (GMT-3) para o timezone do usuário.

**Quando usar**: Ao carregar data do backend para preencher formulário.

```typescript
import { converterDoBrasil } from '@/lib/timezone-utils';

setForm({
  ProvaData: converterDoBrasil(prova.ProvaData) // "2026-05-20T15:00:00" → "2026-05-20T15:00"
});
```

---

### `usuarioForaDoBrasil(): boolean`

Verifica se o timezone do navegador é diferente de `America/Sao_Paulo`.

**Quando usar**: Para exibir avisos de timezone.

```typescript
import { usuarioForaDoBrasil } from '@/lib/timezone-utils';

{usuarioForaDoBrasil() && (
  <div className={styles.timezoneAlert}>
    🌍 Você está em um fuso horário diferente do Brasil (GMT-3).
  </div>
)}
```

---

### `formatarParaCalendario(dataGMT3: string | Date): string`

Formata data para exibição com indicador de timezone quando necessário.

**Quando usar**: Ao exibir datas em listas/calendários.

```typescript
import { formatarParaCalendario } from '@/lib/timezone-utils';

<p>{formatarParaCalendario(prova.ProvaData)}</p>
// No Brasil: "20/05/2026 15:00"
// Fora do Brasil: "20/05/2026 15:00 (GMT-4)"
```

---

### `getUsuarioTimezone(): string`

Retorna o timezone do navegador do usuário.

**Quando usar**: Para debug ou logs.

```typescript
import { getUsuarioTimezone } from '@/lib/timezone-utils';

console.log('Timezone do usuário:', getUsuarioTimezone());
// Ex: "America/Sao_Paulo", "America/New_York", "Europe/London"
```

---

## 🔄 Fluxo de Dados

```
Usuário preenche     converterParaBrasil()      Backend recebe
   formulário     ──────────────────────────>   string GMT-3
(timezone local)                                      │
      ▲                                               │
      │                                               ▼
      │                                           MySQL salva
      │                                           DATETIME GMT-3
      │                                               │
      │           converterDoBrasil()                 │
      └────────────────────────────────<──────────────┘
   Formulário                               Backend retorna
  preenchido                                 string GMT-3
```

## 🧪 Testando

### Simular Diferentes Timezones no Chrome

1. Abra DevTools (F12)
2. Console → Execute:

```javascript
// Nova York (GMT-4)
Intl.DateTimeFormat().resolvedOptions().timeZone = 'America/New_York';

// Londres (GMT+1)
Intl.DateTimeFormat().resolvedOptions().timeZone = 'Europe/London';

// Tóquio (GMT+9)
Intl.DateTimeFormat().resolvedOptions().timeZone = 'Asia/Tokyo';
```

3. Recarregue a página
4. Verifique se o aviso de timezone aparece
5. Teste criar/editar e validar horários salvos

## 📋 Implementado Em

- ✅ CRUD de Provas ([frontend/app/dashboard/[escolaGUID]/crud-provaagendada/page.tsx](../app/dashboard/[escolaGUID]/crud-provaagendada/page.tsx))
- ✅ CRUD de Tarefas ([frontend/app/dashboard/[escolaGUID]/crud-tarefa/page.tsx](../app/dashboard/[escolaGUID]/crud-tarefa/page.tsx))
- ✅ Componente Calendário ([frontend/app/dashboard/[escolaGUID]/calendario/page.tsx](../app/dashboard/[escolaGUID]/calendario/page.tsx))

## 📚 Documentação Completa

Veja [docs/SISTEMA_TIMEZONE_GLOBAL.md](../../docs/SISTEMA_TIMEZONE_GLOBAL.md) para:
- Arquitetura detalhada
- Fluxogramas
- Testes manuais e automatizados
- Troubleshooting
- Exemplos de uso completos

## ⚠️ Importante

- **Nunca** use `.toISOString()` direto para enviar datas ao backend
- **Sempre** use `converterParaBrasil()` antes de enviar
- **Sempre** use `converterDoBrasil()` ao carregar para edição
- **Banco de dados**: DATETIME sempre em GMT-3
- **Frontend**: Detecta e converte automaticamente

## 🔗 Links Úteis

- [MDN - Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [IANA Time Zone Database](https://www.iana.org/time-zones)
