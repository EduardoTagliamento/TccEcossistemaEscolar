# API Documentation - Pendência

**Version:** 1.0.0
**Base URL:** `/api/pendencia`
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Create Pendência](#create-pendência)
  - [List Pendências](#list-pendências)
  - [Count Pendentes](#count-pendentes)
  - [Count Atrasadas](#count-atrasadas)
  - [Get Pendência by ID](#get-pendência-by-id)
  - [Update Pendência](#update-pendência)
  - [Delete Pendência](#delete-pendência)
  - [Mark as Done](#mark-as-done)
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

API para gerenciamento de **pendências** — lembretes/avisos administrativos ou pedagógicos, direcionados a um usuário específico de uma escola (ex.: "trazer documento X", "assinar boletim"), distintos de Tarefa Acadêmica (que é sempre atrelada a uma matrícula/matéria) e de Evento (que é um aviso amplo, não individual).

**Conceito:**
- `Pendencia` é sempre destinada a **um único usuário** (`UsuarioCPF`, o destinatário) dentro de uma escola.
- `PendenciaFeito`/`PendenciaRealizacaoData` seguem o mesmo padrão de conclusão usado em Tarefa Acadêmica: quando marcada como feita, `PendenciaRealizacaoData` é preenchida automaticamente.
- Pendências podem ter anexos vinculados via a tabela genérica `relacaoanexos` (compartilhada com Tarefa e Evento).

**Permissões:**
- **Criar/Atualizar/Excluir**: apenas **Coordenação** (FuncaoId=1), **Secretaria** (FuncaoId=2) ou **Direção** (FuncaoId=6), com vínculo `Status='Ativo'` na escola.
- **Marcar como feito**: apenas o próprio destinatário (`UsuarioCPF` da pendência).
- **Listar/Buscar**: o destinatário sempre vê as próprias pendências; Coordenação/Secretaria/Direção podem ver as pendências de qualquer usuário da escola.

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
> Nota: o `PendenciaMiddleware` lança erros só com `message` (sem `details`); o `PendenciaService` também. O `ErrorResponse` genérico do projeto normaliza a resposta, mas não injeta `details` a menos que explicitamente passado.

---

## Endpoints

### Create Pendência

Cria uma nova pendência direcionada a um usuário vinculado à escola.

**Endpoint:** `POST /api/pendencia`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "UsuarioCPFDestino": "12345678901",
  "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
  "PendenciaTitulo": "Trazer atestado médico",
  "PendenciaConteudo": "Entregar atestado médico referente à falta do dia 10/07.",
  "PendenciaPrazoData": "2026-07-25T23:59:59.000Z"
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `UsuarioCPFDestino` | string | ✅ Yes | CPF do usuário destinatário | 11 dígitos (com ou sem máscara) |
| `EscolaGUID` | string | ✅ Yes | UUID da escola | UUID v4 válido |
| `PendenciaTitulo` | string | ✅ Yes | Título da pendência | 3-128 caracteres |
| `PendenciaConteudo` | string | ❌ No | Descrição detalhada | Máx. 1024 caracteres |
| `PendenciaPrazoData` | string | ✅ Yes | Prazo (ISO 8601) | Data válida e futura |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Pendência criada com sucesso",
  "data": {
    "pendencia": {
      "PendenciaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "UsuarioCPF": "12345678901",
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "PendenciaTitulo": "Trazer atestado médico",
      "PendenciaConteudo": "Entregar atestado médico referente à falta do dia 10/07.",
      "PendenciaPostagemData": "2026-07-17T10:00:00.000Z",
      "PendenciaPrazoData": "2026-07-25T23:59:59.000Z",
      "PendenciaFeito": false,
      "PendenciaRealizacaoData": null,
      "PendenciaCreatedAt": "2026-07-17T10:00:00.000Z",
      "PendenciaUpdatedAt": "2026-07-17T10:00:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Campo obrigatório ausente (middleware)
```json
{ "success": false, "message": "PendenciaTitulo é obrigatório" }
```

**400 Bad Request** - CPF/GUID/título/data inválidos (middleware, várias mensagens possíveis: `UsuarioCPFDestino deve ter 11 dígitos`, `EscolaGUID inválido (deve ser UUID v4)`, `PendenciaTitulo deve ter entre 3 e 128 caracteres`, `PendenciaConteudo deve ter no máximo 1024 caracteres`, `PendenciaPrazoData deve ser uma data válida (ISO 8601)`)

**400 Bad Request** - Prazo no passado (service)
```json
{ "success": false, "message": "Prazo deve ser uma data futura" }
```

**400 Bad Request** - Destinatário não vinculado à escola (service)
```json
{ "success": false, "message": "Usuário destinatário não está vinculado a esta escola" }
```

**403 Forbidden** - Criador sem permissão (service)
```json
{ "success": false, "message": "Sem permissão para criar pendências (apenas Coordenação, Secretaria ou Direção)" }
```

**404 Not Found** - Escola ou usuário destinatário não encontrado
```json
{ "success": false, "message": "Escola não encontrada" }
```
```json
{ "success": false, "message": "Usuário destinatário não encontrado" }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/pendencia \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "UsuarioCPFDestino": "12345678901",
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "PendenciaTitulo": "Trazer atestado médico",
    "PendenciaPrazoData": "2026-07-25T23:59:59.000Z"
  }'
```

---

### List Pendências

Lista pendências com filtros opcionais. Se `EscolaGUID` não for informado, ou o usuário não for admin da escola, o resultado é restrito às pendências do próprio usuário.

**Endpoint:** `GET /api/pendencia`

**Query Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `EscolaGUID` | string | ❌ No | Filtra por escola (e habilita ver pendências de outros usuários se admin) | UUID v4 |
| `PendenciaFeito` | boolean | ❌ No | Filtra por status | `true`/`false`/`1`/`0` |
| `atrasadas` | boolean | ❌ No | Só pendências não feitas e com prazo vencido | `true`/`false`/`1`/`0` |
| `limit` | number | ❌ No | Paginação | 1-100 |
| `offset` | number | ❌ No | Paginação | ≥ 0 |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Pendências listadas com sucesso",
  "data": {
    "pendencias": [
      {
        "PendenciaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "UsuarioCPF": "12345678901",
        "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
        "PendenciaTitulo": "Trazer atestado médico",
        "PendenciaConteudo": "Entregar atestado médico referente à falta do dia 10/07.",
        "PendenciaPostagemData": "2026-07-17T10:00:00.000Z",
        "PendenciaPrazoData": "2026-07-25T23:59:59.000Z",
        "PendenciaFeito": false,
        "PendenciaRealizacaoData": null,
        "PendenciaCreatedAt": "2026-07-17T10:00:00.000Z",
        "PendenciaUpdatedAt": "2026-07-17T10:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

**Error Responses:**

**400 Bad Request** - Query params inválidos (`EscolaGUID`, `PendenciaFeito`, `atrasadas`, `limit`, `offset`)

**403 Forbidden** - `EscolaGUID` informado mas usuário sem vínculo `Ativo`
```json
{ "success": false, "message": "Sem acesso a esta escola" }
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/pendencia?EscolaGUID=550e8400-e29b-41d4-a716-446655440000&atrasadas=true" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Count Pendentes

Retorna o total de pendências não concluídas do usuário autenticado.

**Endpoint:** `GET /api/pendencia/contador/pendentes`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EscolaGUID` | string | ❌ No | Restringe a contagem a uma escola |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Total de pendências pendentes",
  "data": { "total": 3 }
}
```

**Error Responses:**

**403 Forbidden** - Sem acesso à `EscolaGUID` informada
```json
{ "success": false, "message": "Sem acesso a esta escola" }
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/pendencia/contador/pendentes?EscolaGUID=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Count Atrasadas

Retorna o total de pendências não concluídas com prazo já vencido do usuário autenticado.

**Endpoint:** `GET /api/pendencia/contador/atrasadas`

**Query Parameters:** iguais ao endpoint anterior (`EscolaGUID` opcional).

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Total de pendências atrasadas",
  "data": { "total": 1 }
}
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/pendencia/contador/atrasadas" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Get Pendência by ID

Busca uma pendência específica. Acesso permitido ao destinatário ou a admin da escola (Coordenação/Secretaria/Direção).

**Endpoint:** `GET /api/pendencia/:PendenciaGUID`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PendenciaGUID` | string | ✅ Yes | UUID v4 da pendência |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Pendência encontrada",
  "data": { "pendencia": { "PendenciaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "PendenciaFeito": false } }
}
```

**Error Responses:**

**400 Bad Request** - GUID inválido
```json
{ "success": false, "message": "PendenciaGUID inválido (deve ser UUID v4)" }
```

**403 Forbidden** - Nem destinatário nem admin
```json
{ "success": false, "message": "Sem permissão para acessar esta pendência" }
```

**404 Not Found**
```json
{ "success": false, "message": "Pendência não encontrada" }
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/pendencia/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Update Pendência

Atualiza título, conteúdo e/ou prazo. Apenas admin da escola (Coordenação/Secretaria/Direção).

**Endpoint:** `PUT /api/pendencia/:PendenciaGUID`

**Request Body:**
```json
{
  "PendenciaTitulo": "Trazer atestado médico (atualizado)",
  "PendenciaPrazoData": "2026-07-28T23:59:59.000Z"
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `PendenciaTitulo` | string | ❌ No | Novo título | 3-128 caracteres |
| `PendenciaConteudo` | string | ❌ No | Nova descrição | Máx. 1024 caracteres |
| `PendenciaPrazoData` | string | ❌ No | Novo prazo | Data válida e futura |

> Pelo menos um dos três campos deve ser enviado.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Pendência atualizada com sucesso",
  "data": { "pendencia": { "PendenciaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "PendenciaTitulo": "Trazer atestado médico (atualizado)" } }
}
```

**Error Responses:**

**400 Bad Request** - Nenhum campo fornecido
```json
{ "success": false, "message": "Pelo menos um campo deve ser fornecido para atualização" }
```

**400 Bad Request** - Título curto/longo, conteúdo longo, prazo no passado
```json
{ "success": false, "message": "Prazo deve ser uma data futura" }
```

**403 Forbidden** - Não é admin da escola
```json
{ "success": false, "message": "Sem permissão (apenas Coordenação, Secretaria ou Direção)" }
```

**404 Not Found**
```json
{ "success": false, "message": "Pendência não encontrada" }
```

**cURL Example:**
```bash
curl -X PUT https://api.example.com/api/pendencia/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "PendenciaPrazoData": "2026-07-28T23:59:59.000Z" }'
```

---

### Delete Pendência

Exclui definitivamente (hard delete) uma pendência. Apenas admin da escola.

**Endpoint:** `DELETE /api/pendencia/:PendenciaGUID`

**Success Response (200 OK):**
```json
{ "success": true, "message": "Pendência excluída com sucesso", "data": null }
```

**Error Responses:**

**403 Forbidden**
```json
{ "success": false, "message": "Sem permissão (apenas Coordenação, Secretaria ou Direção)" }
```

**404 Not Found**
```json
{ "success": false, "message": "Pendência não encontrada" }
```

**cURL Example:**
```bash
curl -X DELETE https://api.example.com/api/pendencia/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Mark as Done

Marca a pendência como concluída. Apenas o próprio destinatário.

**Endpoint:** `PATCH /api/pendencia/:PendenciaGUID/feito`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Pendência marcada como feita",
  "data": {
    "pendencia": {
      "PendenciaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "PendenciaFeito": true,
      "PendenciaRealizacaoData": "2026-07-20T09:00:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Já estava feita
```json
{ "success": false, "message": "Pendência já foi marcada como feita" }
```

**403 Forbidden** - Não é o destinatário
```json
{ "success": false, "message": "Apenas o destinatário pode marcar como feito" }
```

**404 Not Found**
```json
{ "success": false, "message": "Pendência não encontrada" }
```

**cURL Example:**
```bash
curl -X PATCH https://api.example.com/api/pendencia/7c9e6679-7425-40de-944b-e07fc1f90ae7/feito \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### List Anexos

Lista os anexos vinculados a uma pendência.

**Endpoint:** `GET /api/pendencia/:PendenciaGUID/anexos`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Anexos listados com sucesso",
  "data": {
    "anexos": [
      {
        "AnexoGUID": "550e8400-e29b-41d4-a716-446655440000",
        "UsuarioCPF": "12345678901",
        "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
        "AnexoCaminho": "/uploads/anexos/550e8400.pdf",
        "AnexoNomeOriginal": "atestado.pdf",
        "AnexoTamanho": 204800,
        "CreatedAt": "2026-07-18T09:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

**Error Responses:**

**401 Unauthorized** - Sem token
```json
{ "success": false, "message": "Não autenticado" }
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/pendencia/7c9e6679-7425-40de-944b-e07fc1f90ae7/anexos \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Link Anexo

Vincula um anexo já enviado (`POST /api/anexo`) a uma pendência.

**Endpoint:** `POST /api/pendencia/:PendenciaGUID/anexos`

**Request Body:**
```json
{ "AnexoGUID": "550e8400-e29b-41d4-a716-446655440000" }
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Anexo vinculado à pendência com sucesso",
  "data": {
    "relacao": {
      "RelacaoAnexoGUID": "9e9f7780-9647-62fg-c166-g29he3h12cg9",
      "AnexoGUID": "550e8400-e29b-41d4-a716-446655440000",
      "TarefaGUID": null,
      "PendenciaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "EventoGUID": null,
      "RelacaoCreatedAt": "2026-07-18T09:00:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - `AnexoGUID` ausente no body
```json
{ "success": false, "message": "AnexoGUID é obrigatório" }
```

**403 Forbidden** - Anexo de outra escola (mesma checagem usada em Tarefa/Evento)
```json
{ "success": false, "message": "Anexo não pertence à mesma escola do recurso" }
```

**404 Not Found** - Anexo não existe
```json
{ "success": false, "message": "Anexo não encontrado" }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/pendencia/7c9e6679-7425-40de-944b-e07fc1f90ae7/anexos \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "AnexoGUID": "550e8400-e29b-41d4-a716-446655440000" }'
```

---

## Data Models

### Pendencia Entity

```typescript
interface PendenciaDTO {
  PendenciaGUID: string;                // UUID v4
  UsuarioCPF: string;                   // CPF do destinatário
  EscolaGUID: string;                   // FK para escola
  PendenciaTitulo: string;              // 3-128 caracteres
  PendenciaConteudo: string | null;     // até 1024 caracteres
  PendenciaPostagemData: Date;          // preenchida automaticamente na criação
  PendenciaPrazoData: Date;
  PendenciaFeito: boolean;
  PendenciaRealizacaoData: Date | null; // preenchida automaticamente ao marcar como feito
  PendenciaCreatedAt: Date;
  PendenciaUpdatedAt: Date;
}
```

### Database Schema (inferido de `backend/repositories/pendencia.repository.ts` — ⚠️ A confirmar: `CREATE TABLE` não localizado em `sql.txt`/`migrations/`, possivelmente criado manualmente no banco)

```sql
CREATE TABLE pendencia (
  PendenciaGUID CHAR(36) NOT NULL PRIMARY KEY,
  UsuarioCPF CHAR(11) NOT NULL,
  EscolaGUID CHAR(36) NOT NULL,
  PendenciaTitulo VARCHAR(128) NOT NULL,
  PendenciaConteudo VARCHAR(1024) NULL,
  PendenciaPostagemData DATETIME NOT NULL,
  PendenciaPrazoData DATETIME NOT NULL,
  PendenciaFeito TINYINT(1) NOT NULL DEFAULT 0,
  PendenciaRealizacaoData DATETIME NULL,
  PendenciaCreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PendenciaUpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (UsuarioCPF) REFERENCES usuario(UsuarioCPF),
  FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID)
);
```

### RelacaoAnexos (tabela genérica compartilhada com Tarefa e Evento)

```sql
CREATE TABLE relacaoanexos (
  RelacaoAnexoGUID CHAR(36) NOT NULL PRIMARY KEY,
  AnexoGUID CHAR(36) NOT NULL,
  TarefaGUID CHAR(36) NULL,
  PendenciaGUID CHAR(36) NULL,
  EventoGUID CHAR(36) NULL,
  RelacaoCreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (AnexoGUID) REFERENCES anexo(AnexoGUID)
);
```

Fonte: `backend/repositories/relacaoanexos.repository.ts`. Exatamente um dos três GUIDs (`TarefaGUID`/`PendenciaGUID`/`EventoGUID`) é preenchido por linha; os outros dois ficam `NULL`.

---

## Business Rules

1. **Destinatário único** — toda pendência tem exatamente um `UsuarioCPF` destinatário; não há pendências em massa/turma (`backend/entities/pendencia.model.ts`).
2. **Criação restrita a admin** — apenas Coordenação (1), Secretaria (2) ou Direção (6) com vínculo `Status='Ativo'` na escola podem criar (`PendenciaService#validarPermissaoCriar`).
3. **Destinatário deve estar vinculado à escola** — `escolaxusuarioxfuncao` com `Status='Ativo'` para `(EscolaGUID, UsuarioCPFDestino)`, senão 400 (`PendenciaService.store`).
4. **Prazo sempre futuro** — na criação e na atualização, `PendenciaPrazoData` deve ser posterior a `new Date()` no momento da chamada (`PendenciaService.store`/`update`).
5. **`PendenciaRealizacaoData` consistente com `PendenciaFeito`** — a entidade valida que `PendenciaRealizacaoData` só existe quando `PendenciaFeito=true` (`Pendencia.validar()`).
6. **Marcar como feito é exclusivo do destinatário** — nem admin, nem outros usuários podem chamar `PATCH .../feito` em nome de outra pessoa; e não pode marcar duas vezes (400 se já feita) (`PendenciaService.marcarComoFeito`).
7. **Atualizar/Excluir restrito a admin** — mesmo o destinatário não pode editar título/conteúdo/prazo; só Coordenação/Secretaria/Direção da escola (`PendenciaService#validarPermissaoAdmin`).
8. **Visualização (`show`/`index`)** — destinatário sempre vê as próprias; para ver pendências de terceiros é necessário ser admin da escola informada em `EscolaGUID` (`PendenciaService.index`, `#validarAcesso`).
9. **Listagem sem `EscolaGUID` é sempre autorrestrita** — se o filtro `EscolaGUID` não for enviado, o service força `filters.UsuarioCPF = usuarioCPF`, independente da função do usuário.
10. **Exclusão é física (hard delete)** — `DELETE FROM pendencia`, sem soft delete/status (diferente de Turma/Matéria/Curso).
11. **Anexos via tabela genérica** — vínculo usa `relacaoanexos.PendenciaGUID`; a validação de "mesma escola" para pendência atualmente é simplificada (`escolaGUID = anexo.EscolaGUID`, sem checar a escola real da pendência) — ⚠️ A confirmar: comportamento aparente do código em `RelacaoAnexosService.vincularAnexo` (case `"pendencia"`), possivelmente uma lacuna de validação a ser revisada.

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | `PendenciaGUID`/`EscolaGUID` inválido (deve ser UUID v4) | Parâmetro/filtro não é UUID |
| 400 | `UsuarioCPFDestino`/`PendenciaTitulo`/`PendenciaConteudo`/`PendenciaPrazoData` obrigatório ou fora do formato | Falha de validação do middleware |
| 400 | Prazo deve ser uma data futura | Prazo no passado na criação ou atualização |
| 400 | Usuário destinatário não está vinculado a esta escola | Sem registro `Ativo` em `escolaxusuarioxfuncao` |
| 400 | Pendência já foi marcada como feita | Chamada duplicada de `PATCH .../feito` |
| 400 | `AnexoGUID` é obrigatório | Body sem `AnexoGUID` em `POST .../anexos` |
| 401 | Não autenticado | Token ausente/inválido |
| 403 | Sem permissão para criar pendências (apenas Coordenação, Secretaria ou Direção) | Criador não é admin |
| 403 | Sem permissão (apenas Coordenação, Secretaria ou Direção) | Update/Delete por não-admin |
| 403 | Apenas o destinatário pode marcar como feito | `PATCH .../feito` por outro usuário |
| 403 | Sem acesso a esta escola | `EscolaGUID` informado sem vínculo `Ativo` |
| 403 | Sem permissão para acessar esta pendência | `GET :guid` por quem não é destinatário nem admin |
| 403 | Anexo não pertence à mesma escola do recurso | Anexo de escola diferente |
| 404 | Pendência não encontrada | GUID inexistente |
| 404 | Escola não encontrada / Usuário destinatário não encontrado | Referência inexistente na criação |
| 404 | Anexo não encontrado | `AnexoGUID` inexistente |

---

## Examples

### Cenário 1: Secretaria cria pendência para um aluno
```bash
POST /api/pendencia
{ "UsuarioCPFDestino": "12345678901", "EscolaGUID": "550e8400-...", "PendenciaTitulo": "Trazer atestado médico", "PendenciaPrazoData": "2026-07-25T23:59:59.000Z" }
# Response 201
```

### Cenário 2: Aluno marca a própria pendência como feita
```bash
PATCH /api/pendencia/7c9e6679-7425-40de-944b-e07fc1f90ae7/feito
# Response 200, PendenciaFeito=true, PendenciaRealizacaoData preenchida
```

### Cenário 3: Aluno tenta atualizar sua própria pendência (❌ Erro)
```bash
PUT /api/pendencia/7c9e6679-7425-40de-944b-e07fc1f90ae7
{ "PendenciaTitulo": "Novo título" }

Response 403:
{ "success": false, "message": "Sem permissão (apenas Coordenação, Secretaria ou Direção)" }
```

---

## Integration with Other Entities

- **Pendencia → Usuario / EscolaxUsuarioxFuncao**: destinatário e criador validados via [escolaxusuarioxfuncao-api.md](escolaxusuarioxfuncao-api.md).
- **Pendencia ↔ RelacaoAnexos ↔ Anexo**: mesmo padrão de vínculo de anexos usado em [tarefaacademica-api.md](tarefaacademica-api.md) e Evento — ver [anexo-api.md](anexo-api.md).
- **Pendencia → Calendário**: ⚠️ A confirmar — diferente de Tarefa e Prova, Pendência **não** aparece em `GET /api/calendario` (ver [calendario-api.md](calendario-api.md)); a query de calendário só faz `UNION` de `tarefaacademica` e `provaagendada`.

---

## Notes

- Diferente de Tarefa/Evento, a exclusão de Pendência é **física** (linha removida do banco), não soft delete.
- Todas as datas são retornadas em ISO 8601.
- `PendenciaGUID` segue estritamente UUID v4 (regex com `4` na posição de versão e `[89ab]` na de variante) — mais rígido que a validação genérica de outros módulos, que aceitam qualquer UUID v4-like.
