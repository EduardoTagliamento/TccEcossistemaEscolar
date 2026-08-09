# API Documentation - Sugestão

> ⚠️ **Módulo TEMPORÁRIO.** Criado só pro teste com um grupo pequeno de usuários (beta). Quando o teste terminar, remover: os arquivos listados em [Notes](#notes), o `<SugestaoFlutuante />` do layout, a seção em `/admin-plataforma`, e rodar `DROP TABLE sugestao;`. Por isso não tem um `PLANO_IMPLEMENTACAO_*.md` próprio — este documento é a única referência.

**Version:** 1.0.0 (temporário)
**Base URL:** `/api/sugestao`
**Content-Type:** `application/json`

---

## Overview

Botão flutuante "?" (canto inferior esquerdo, em toda tela do dashboard) onde qualquer usuário autenticado manda um texto livre de sugestão/feedback. Admin de plataforma (`UsuarioIsPlataformaAdmin`) vê a lista em `/admin-plataforma`.

**Permissões:**
- **Criar** (`POST /`): qualquer usuário autenticado.
- **Listar / Excluir** (`GET /`, `DELETE /:guid`): só admin de plataforma, via `plataformaAdminGuard` (o mesmo guard do banco de questões universal em `/admin-plataforma`).

---

## Authentication

Todas as rotas requerem `Authorization: Bearer <token>`.

---

## Endpoints

### Create Sugestão

**Endpoint:** `POST /api/sugestao`

**Request Body:**
```json
{
  "SugestaoTexto": "Seria legal poder editar a tarefa depois de criada.",
  "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
  "SugestaoPaginaUrl": "/dashboard/550e8400-.../materias"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `SugestaoTexto` | string | ✅ Yes | Não vazio, máx. 2000 caracteres |
| `EscolaGUID` | string | ❌ No | UUID — contexto informativo, sem FK no banco |
| `SugestaoPaginaUrl` | string | ❌ No | Máx. 255 caracteres — `pathname` de onde o usuário estava (`usePathname()`) |

> `UsuarioCPF` não é enviado no body — sempre o usuário do token.

**Success Response (201 Created):**
```json
{ "success": true, "message": "Sugestão enviada — obrigado!", "data": { "SugestaoGUID": "...", "...": "..." } }
```

**Error Responses:**

**400 Bad Request**
```json
{ "success": false, "message": "SugestaoTexto é obrigatório" }
```

---

### List Sugestões

**Endpoint:** `GET /api/sugestao`

Retorna todas as sugestões, mais recentes primeiro, já com nome/e-mail de quem enviou (`JOIN usuario`).

**Success Response (200 OK):**
```json
{
  "success": true,
  "total": 1,
  "data": [
    {
      "SugestaoGUID": "7c9e6679-...",
      "UsuarioCPF": "12345678901",
      "UsuarioNome": "Maria Silva",
      "UsuarioEmail": "maria@exemplo.com",
      "EscolaGUID": "550e8400-...",
      "SugestaoTexto": "Seria legal poder editar a tarefa depois de criada.",
      "SugestaoPaginaUrl": "/dashboard/550e8400-.../materias",
      "SugestaoCreatedAt": "2026-08-09T18:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

**403 Forbidden**
```json
{ "success": false, "message": "Este recurso é restrito a administradores de plataforma." }
```

---

### Delete Sugestão

**Endpoint:** `DELETE /api/sugestao/:guid`

**Success Response (200 OK):**
```json
{ "success": true, "message": "Sugestão excluída" }
```

**Error Responses:**

**404 Not Found**
```json
{ "success": false, "message": "Sugestão não encontrada" }
```

---

## Data Models

```typescript
interface Sugestao {
  SugestaoGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string | null;
  SugestaoTexto: string;           // até 2000 caracteres
  SugestaoPaginaUrl: string | null;
  SugestaoCreatedAt: Date;
}
```

```sql
CREATE TABLE `sugestao` (
  `SugestaoGUID` CHAR(36) NOT NULL,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `EscolaGUID` CHAR(36) NULL,           -- sem FK: só contexto informativo
  `SugestaoTexto` TEXT NOT NULL,
  `SugestaoPaginaUrl` VARCHAR(255) NULL,
  `SugestaoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`SugestaoGUID`),
  CONSTRAINT `FK_Sugestao_Usuario` FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario`(`UsuarioCPF`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;
```

Fonte: `backend/database/migrations/2026-08-09-sugestao.sql`.

---

## Notes

**Arquivos (todos exclusivos deste módulo, sem nada compartilhado além do guard/middleware genéricos):**
- `backend/database/migrations/2026-08-09-sugestao.sql`
- `backend/entities/sugestao.model.ts`
- `backend/repositories/sugestao.repository.ts`
- `backend/services/sugestao.service.ts`
- `backend/schemas/sugestao.schema.ts`
- `backend/middlewares/sugestao.middleware.ts`
- `backend/controllers/sugestao.controller.ts`
- `routes/sugestao.routes.ts` (registrado em `backend/Server.ts` como `/api/sugestao`)
- `frontend/lib/api/sugestao.api.ts`
- `frontend/app/dashboard/[escolaGUID]/_components/SugestaoFlutuante.tsx` (+ `.module.css`) — montado em `frontend/app/dashboard/[escolaGUID]/layout.tsx`
- Seção "Sugestões dos usuários" em `frontend/app/admin-plataforma/page.tsx`

Sem `EscolaGUID` obrigatório nem FK pra `escola` — o botão aparece em qualquer tela do dashboard, então o usuário sempre tem um `escolaGUID` de rota disponível na prática, mas o campo foi deixado opcional/sem FK pra manter a tabela simples de derrubar depois.
