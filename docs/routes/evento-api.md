# API Documentation - Evento

**Version:** 1.0.0
**Base URL:** `/api/evento`
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Create Evento](#create-evento)
  - [List Eventos](#list-eventos)
  - [Get Evento by ID](#get-evento-by-id)
  - [Update Evento](#update-evento)
  - [Delete Evento](#delete-evento)
  - [List Anexos](#list-anexos)
  - [Link Anexo](#link-anexo)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)
- [Examples](#examples)
- [Integration with Other Entities](#integration-with-other-entities)
- [Notes](#notes)

---

## Overview

API para gerenciamento de **eventos escolares** — reuniões, festas, palestras, feiras etc. Diferente de Pendência (destinada a um único usuário) e de Tarefa/Prova (atreladas a matrícula/matéria), um Evento é um aviso **amplo por escola**, visível a todos os usuários vinculados a ela.

**Conceito:**
- `Evento` pertence a uma `EscolaGUID` e não tem destinatário individual.
- `EventoStatus` tem 3 valores: `Agendado` (padrão na criação), `Realizado`, `Cancelado`.
- Suporta anexos vinculados via a tabela genérica `relacaoanexos` (mesmo padrão de Tarefa e Pendência).

**Permissões:**
- **Criar/Atualizar/Excluir**: apenas **Coordenação** (FuncaoId=1), **Secretaria** (FuncaoId=2) ou **Direção** (FuncaoId=6), com vínculo `Status='Ativo'` na escola.
- **Listar/Buscar**: qualquer usuário com vínculo `Ativo` na escola do evento.

---

## Authentication

Todas as rotas requerem autenticação JWT.

**Header obrigatório:**
```
Authorization: Bearer <token>
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Descrição da operação",
  "data": { /* dados */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Descrição do erro"
}
```

---

## Endpoints

### Create Evento

**Endpoint:** `POST /api/evento`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
  "EventoTitulo": "Reunião de Pais e Mestres",
  "EventoDescricao": "Reunião do 3º bimestre, auditório principal.",
  "EventoData": "2026-08-15T19:00:00.000Z"
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `EscolaGUID` | string | ✅ Yes | UUID da escola | UUID v4 válido |
| `EventoTitulo` | string | ✅ Yes | Título do evento | 3-128 caracteres |
| `EventoDescricao` | string | ❌ No | Descrição detalhada | Máx. 1024 caracteres |
| `EventoData` | string | ✅ Yes | Data/hora do evento (ISO 8601) | Data válida e futura |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Evento criado com sucesso",
  "data": {
    "evento": {
      "EventoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "EventoTitulo": "Reunião de Pais e Mestres",
      "EventoDescricao": "Reunião do 3º bimestre, auditório principal.",
      "EventoData": "2026-08-15T19:00:00.000Z",
      "EventoStatus": "Agendado",
      "EventoCreatedAt": "2026-07-17T10:00:00.000Z",
      "EventoUpdatedAt": "2026-07-17T10:00:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Campo obrigatório ausente (`EscolaGUID é obrigatório`, `EventoTitulo é obrigatório`, `EventoData é obrigatório`)

**400 Bad Request** - Formato inválido (`EscolaGUID inválido (deve ser UUID v4)`, `EventoTitulo deve ter entre 3 e 128 caracteres`, `EventoDescricao deve ter no máximo 1024 caracteres`, `EventoData deve ser uma data válida (ISO 8601)`)

**400 Bad Request** - Data no passado (service)
```json
{ "success": false, "message": "Data do evento deve ser futura" }
```

**403 Forbidden** - Sem permissão
```json
{ "success": false, "message": "Sem permissão. Apenas Coordenação, Direção e Secretaria podem gerenciar eventos" }
```

**404 Not Found** - Escola não encontrada
```json
{ "success": false, "message": "Escola não encontrada" }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/evento \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "EventoTitulo": "Reunião de Pais e Mestres",
    "EventoData": "2026-08-15T19:00:00.000Z"
  }'
```

---

### List Eventos

**Endpoint:** `GET /api/evento`

**Query Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `EscolaGUID` | string | ❌ No | Filtra por escola (se informado, exige vínculo `Ativo`) | UUID v4 |
| `EventoStatus` | string | ❌ No | Filtra por status | `Agendado`, `Realizado` ou `Cancelado` |
| `dataInicio` | string | ❌ No | Início do período | ISO 8601 |
| `dataFim` | string | ❌ No | Fim do período | ISO 8601 |
| `limit` | number | ❌ No | Paginação | 1-100 |
| `offset` | number | ❌ No | Paginação | ≥ 0 |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Eventos listados com sucesso",
  "data": {
    "eventos": [
      {
        "EventoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
        "EventoTitulo": "Reunião de Pais e Mestres",
        "EventoDescricao": "Reunião do 3º bimestre, auditório principal.",
        "EventoData": "2026-08-15T19:00:00.000Z",
        "EventoStatus": "Agendado",
        "EventoCreatedAt": "2026-07-17T10:00:00.000Z",
        "EventoUpdatedAt": "2026-07-17T10:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

**Error Responses:**

**400 Bad Request** - Query params inválidos (`EscolaGUID`, `EventoStatus`, `dataInicio`, `dataFim`, `limit`, `offset`)

**403 Forbidden** - Sem vínculo com a escola filtrada
```json
{ "success": false, "message": "Usuário não vinculado a esta escola" }
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/evento?EscolaGUID=550e8400-e29b-41d4-a716-446655440000&EventoStatus=Agendado" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Get Evento by ID

**Endpoint:** `GET /api/evento/:EventoGUID`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EventoGUID` | string | ✅ Yes | UUID v4 do evento |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Evento encontrado",
  "data": { "evento": { "EventoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "EventoStatus": "Agendado" } }
}
```

**Error Responses:**

**400 Bad Request** - GUID inválido
```json
{ "success": false, "message": "EventoGUID inválido (deve ser UUID v4)" }
```

**403 Forbidden** - Sem vínculo com a escola do evento
```json
{ "success": false, "message": "Sem permissão para visualizar este evento" }
```

**404 Not Found**
```json
{ "success": false, "message": "Evento não encontrado" }
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/evento/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Update Evento

**Endpoint:** `PUT /api/evento/:EventoGUID`

**Request Body:**
```json
{
  "EventoTitulo": "Reunião de Pais e Mestres (remarcada)",
  "EventoData": "2026-08-20T19:00:00.000Z",
  "EventoStatus": "Agendado"
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `EventoTitulo` | string | ❌ No | Novo título | 3-128 caracteres |
| `EventoDescricao` | string | ❌ No | Nova descrição | Máx. 1024 caracteres |
| `EventoData` | string | ❌ No | Nova data | ISO 8601, futura |
| `EventoStatus` | string | ❌ No | Novo status | `Agendado`, `Realizado` ou `Cancelado` |

> Pelo menos um campo deve ser enviado.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Evento atualizado com sucesso",
  "data": { "evento": { "EventoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "EventoTitulo": "Reunião de Pais e Mestres (remarcada)" } }
}
```

**Error Responses:**

**400 Bad Request** - Nenhum campo, título curto, descrição longa, data inválida/passada, status fora do enum

**403 Forbidden**
```json
{ "success": false, "message": "Sem permissão. Apenas Coordenação, Direção e Secretaria podem gerenciar eventos" }
```

**404 Not Found**
```json
{ "success": false, "message": "Evento não encontrado" }
```

**cURL Example:**
```bash
curl -X PUT https://api.example.com/api/evento/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "EventoStatus": "Realizado" }'
```

---

### Delete Evento

Cancela o evento (soft delete — `EventoStatus` passa para `Cancelado`).

**Endpoint:** `DELETE /api/evento/:EventoGUID`

**Success Response (200 OK):**
```json
{ "success": true, "message": "Evento cancelado com sucesso", "data": null }
```

**Error Responses:**

**403 Forbidden**
```json
{ "success": false, "message": "Sem permissão. Apenas Coordenação, Direção e Secretaria podem gerenciar eventos" }
```

**404 Not Found**
```json
{ "success": false, "message": "Evento não encontrado" }
```

**cURL Example:**
```bash
curl -X DELETE https://api.example.com/api/evento/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### List Anexos

**Endpoint:** `GET /api/evento/:EventoGUID/anexos`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Anexos listados com sucesso",
  "data": { "anexos": [ { "AnexoGUID": "550e8400-...", "AnexoNomeOriginal": "convite.pdf" } ], "total": 1 }
}
```

**Error Responses:**

**404 Not Found** - Evento não encontrado (validado dentro de `listarAnexosEvento`)
```json
{ "success": false, "message": "Evento não encontrado" }
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/evento/7c9e6679-7425-40de-944b-e07fc1f90ae7/anexos \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Link Anexo

Vincula um anexo já enviado (`POST /api/anexo`) a um evento. Requer permissão de admin (mesma regra de criação/edição de evento, validada implicitamente pela camada de rota — ver Nota abaixo).

**Endpoint:** `POST /api/evento/:EventoGUID/anexos`

**Request Body:**
```json
{ "AnexoGUID": "550e8400-e29b-41d4-a716-446655440000" }
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Anexo vinculado ao evento com sucesso",
  "data": {
    "relacao": {
      "RelacaoAnexoGUID": "9e9f7780-9647-62fg-c166-g29he3h12cg9",
      "AnexoGUID": "550e8400-e29b-41d4-a716-446655440000",
      "TarefaGUID": null,
      "PendenciaGUID": null,
      "EventoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "RelacaoCreatedAt": "2026-07-18T09:00:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - `AnexoGUID` ausente
```json
{ "success": false, "message": "AnexoGUID é obrigatório" }
```

**403 Forbidden** - Anexo de outra escola
```json
{ "success": false, "message": "Anexo não pertence à mesma escola do recurso" }
```

**404 Not Found** - Anexo ou evento inexistente
```json
{ "success": false, "message": "Anexo não encontrado" }
```
```json
{ "success": false, "message": "Evento não encontrado" }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/evento/7c9e6679-7425-40de-944b-e07fc1f90ae7/anexos \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "AnexoGUID": "550e8400-e29b-41d4-a716-446655440000" }'
```

---

## Data Models

### Evento Entity

```typescript
interface EventoDTO {
  EventoGUID: string;                        // UUID v4
  EscolaGUID: string;                        // FK para escola
  EventoTitulo: string;                      // 3-128 caracteres
  EventoDescricao: string | null;            // até 1024 caracteres
  EventoData: Date;
  EventoStatus: "Agendado" | "Realizado" | "Cancelado";
  EventoCreatedAt: Date;
  EventoUpdatedAt: Date;
}
```

### Database Schema (⚠️ A confirmar: `CREATE TABLE` não localizado em `sql.txt`/`migrations/` — schema inferido de `backend/repositories/evento.repository.ts` e `backend/entities/evento.model.ts`)

```sql
CREATE TABLE evento (
  EventoGUID CHAR(36) NOT NULL PRIMARY KEY,
  EscolaGUID CHAR(36) NOT NULL,
  EventoTitulo VARCHAR(128) NOT NULL,
  EventoDescricao VARCHAR(1024) NULL,
  EventoData DATETIME NOT NULL,
  EventoStatus ENUM('Agendado','Realizado','Cancelado') NOT NULL DEFAULT 'Agendado',
  EventoCreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  EventoUpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID)
);
```

---

## Business Rules

1. **Evento é por escola, sem destinatário individual** — diferente de Pendência (`backend/entities/evento.model.ts`).
2. **Criação/edição/exclusão restrita a admin** — Coordenação (1), Secretaria (2) ou Direção (6), com vínculo `Status='Ativo'` na escola (`EventoService#validarPermissaoEscrita`).
3. **Data sempre futura** — na criação e sempre que `EventoData` for alterada no `update` (`EventoService.store`/`update`).
4. **Leitura exige vínculo ativo com a escola** — tanto em `GET /:EventoGUID` (checado contra a escola do próprio evento) quanto em `GET /` quando `EscolaGUID` é informado.
5. **Delete é soft delete** — `EventoStatus` muda para `Cancelado`; não há remoção física da linha (`EventoService.destroy` → `EventoDAO.delete`, ver Notes).
6. **Status tem 3 valores fixos** — `Agendado` (padrão), `Realizado`, `Cancelado`; validado tanto no middleware quanto na entidade (`Evento.validar()`).
7. **Anexos via tabela genérica** — vínculo usa `relacaoanexos.EventoGUID`, mesmo padrão de Tarefa e Pendência; a checagem de "mesma escola" usa `evento.EscolaGUID` real (diferente de Pendência, que hoje simplifica essa checagem — ver [pendencia-api.md](pendencia-api.md)).

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | `EventoGUID`/`EscolaGUID` inválido (deve ser UUID v4) | Parâmetro/filtro não é UUID |
| 400 | `EventoTitulo`/`EventoData` obrigatório ou fora do formato | Falha de validação do middleware |
| 400 | Data do evento deve ser futura | Data no passado na criação/atualização |
| 400 | `EventoStatus` deve ser Agendado, Realizado ou Cancelado | Valor fora do enum |
| 400 | Pelo menos um campo deve ser fornecido para atualização | `PUT` com body vazio |
| 400 | `AnexoGUID` é obrigatório | Body sem `AnexoGUID` |
| 401 | Não autenticado | Token ausente/inválido |
| 403 | Usuário não está vinculado a esta escola / Usuário não vinculado a esta escola | Sem vínculo `Ativo` |
| 403 | Sem permissão. Apenas Coordenação, Direção e Secretaria podem gerenciar eventos | Escrita por não-admin |
| 403 | Sem permissão para visualizar este evento | `GET :guid` sem vínculo com a escola |
| 403 | Anexo não pertence à mesma escola do recurso | Anexo de escola diferente |
| 404 | Evento não encontrado | GUID inexistente |
| 404 | Escola não encontrada | `EscolaGUID` inexistente na criação |
| 404 | Anexo não encontrado | `AnexoGUID` inexistente |

---

## Examples

### Cenário 1: Direção cria um evento
```bash
POST /api/evento
{ "EscolaGUID": "550e8400-...", "EventoTitulo": "Feira de Ciências", "EventoData": "2026-09-10T13:00:00.000Z" }
# Response 201, EventoStatus="Agendado"
```

### Cenário 2: Marcar evento como realizado após acontecer
```bash
PUT /api/evento/7c9e6679-7425-40de-944b-e07fc1f90ae7
{ "EventoStatus": "Realizado" }
# Response 200
```

### Cenário 3: Aluno tenta criar evento (❌ Erro)
```bash
POST /api/evento
# usuário autenticado é Aluno (FuncaoId=5)

Response 403:
{ "success": false, "message": "Sem permissão. Apenas Coordenação, Direção e Secretaria podem gerenciar eventos" }
```

---

## Integration with Other Entities

- **Evento → Escola**: todo evento pertence a uma escola; permissões usam o mesmo vínculo tripla de [escolaxusuarioxfuncao-api.md](escolaxusuarioxfuncao-api.md).
- **Evento ↔ RelacaoAnexos ↔ Anexo**: mesmo padrão de [tarefaacademica-api.md](tarefaacademica-api.md) e [pendencia-api.md](pendencia-api.md) — ver [anexo-api.md](anexo-api.md).
- **Evento → Calendário**: ⚠️ A confirmar — assim como Pendência, Evento **não** aparece hoje em `GET /api/calendario` (ver [calendario-api.md](calendario-api.md)), que só faz `UNION` de Tarefa e Prova.

---

## Notes

- Todas as datas são retornadas em ISO 8601.
- `EventoGUID` segue estritamente UUID v4 (regex com `4` na posição de versão e `[89ab]` na de variante).
- A mensagem de sucesso do `DELETE` ("Evento cancelado com sucesso") já denuncia que a operação é um soft delete (`EventoStatus='Cancelado'`), não uma remoção física.
