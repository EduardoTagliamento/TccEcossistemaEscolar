# API Documentation - Anotação

**Version:** 1.0.0
**Base URL:** `/api/anotacao`
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Create Anotação](#create-anotação)
  - [List Anotações](#list-anotações)
  - [Get Estatísticas](#get-estatísticas)
  - [Get Anotação by ID](#get-anotação-by-id)
  - [Update Anotação](#update-anotação)
  - [Toggle Feito](#toggle-feito)
  - [Delete Anotação](#delete-anotação)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)
- [Examples](#examples)
- [Integration with Other Entities](#integration-with-other-entities)
- [Notes](#notes)

---

## Overview

API para gerenciamento de **anotações pessoais** — lembretes de uso privado do próprio usuário (não visíveis a outros, diferente de Pendência/Evento), associados a uma data e a uma escola. Pensado para uso em agenda/calendário pessoal.

**Conceito:**
- `Anotacao` pertence sempre ao `UsuarioCPF` que a criou; não há conceito de destinatário/criador separados (diferente de Pendência).
- `AnotacaoIsFeito` é um toggle simples (sem `AnotacaoRealizacaoData` associada).

**Permissões:**
- Qualquer usuário autenticado com vínculo `Ativo` na escola pode criar anotações para si mesmo.
- Todas as operações de leitura/edição/exclusão são restritas ao **próprio dono** da anotação (`UsuarioCPF === usuário autenticado`) — não há papel de admin com acesso a anotações de terceiros.

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

### Create Anotação

**Endpoint:** `POST /api/anotacao`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
  "AnotacaoData": "2026-07-20T09:00:00.000Z",
  "AnotacaoTitulo": "Levar material de arte",
  "AnotacaoDescricao": "Lembrar de levar tintas e pincéis para a aula de terça."
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `EscolaGUID` | string | ✅ Yes | UUID da escola | Deve haver vínculo `Ativo` do usuário |
| `AnotacaoData` | string | ✅ Yes | Data/hora da anotação (ISO 8601, `America/Sao_Paulo`) | Data válida |
| `AnotacaoTitulo` | string | ✅ Yes | Título | Não vazio, máx. 256 caracteres |
| `AnotacaoDescricao` | string | ❌ No | Descrição | Máx. 2048 caracteres |

> `UsuarioCPF` **não** é enviado no body — é sempre o usuário do token (`req.user.UsuarioCPF`).

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Anotação criada com sucesso",
  "data": {
    "AnotacaoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "UsuarioCPF": "12345678901",
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "AnotacaoData": "2026-07-20T09:00:00.000Z",
    "AnotacaoTitulo": "Levar material de arte",
    "AnotacaoDescricao": "Lembrar de levar tintas e pincéis para a aula de terça.",
    "AnotacaoIsFeito": false,
    "AnotacaoCreatedAt": "2026-07-17T10:00:00.000Z",
    "AnotacaoUpdatedAt": "2026-07-17T10:00:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - Campo obrigatório ausente/inválido (`EscolaGUID é obrigatório`, `AnotacaoData é obrigatória`, `AnotacaoTitulo é obrigatório`, `AnotacaoData inválida (use formato ISO 8601)`, `AnotacaoTitulo não pode ser vazio`, `AnotacaoTitulo não pode exceder 256 caracteres`, `AnotacaoDescricao não pode exceder 2048 caracteres`)

**401 Unauthorized** - Sem token
```json
{ "success": false, "message": "Usuário não autenticado" }
```

**403 Forbidden** - Sem vínculo ativo com a escola
```json
{ "success": false, "message": "Usuário não vinculado à escola ou vínculo inativo" }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/anotacao \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "AnotacaoData": "2026-07-20T09:00:00.000Z",
    "AnotacaoTitulo": "Levar material de arte"
  }'
```

---

### List Anotações

Lista anotações do usuário autenticado. Se `DataInicio` **e** `DataFim` forem informados juntos, usa uma query dedicada de intervalo de datas (`findByDateRange`); caso contrário, usa filtros gerais (incluindo `AnotacaoIsFeito`).

**Endpoint:** `GET /api/anotacao`

**Query Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `EscolaGUID` | string | ✅ Yes | UUID da escola | Vínculo `Ativo` obrigatório |
| `DataInicio` | string | ❌ No | Início do período (requer `DataFim` junto para ativar o modo intervalo) | ISO 8601 |
| `DataFim` | string | ❌ No | Fim do período | ISO 8601 |
| `AnotacaoIsFeito` | boolean | ❌ No | Filtra por status (ignorado se `DataInicio`+`DataFim` estiverem presentes) | `true`/`false`/`1`/`0` |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "AnotacaoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "UsuarioCPF": "12345678901",
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "AnotacaoData": "2026-07-20T09:00:00.000Z",
      "AnotacaoTitulo": "Levar material de arte",
      "AnotacaoDescricao": null,
      "AnotacaoIsFeito": false,
      "AnotacaoCreatedAt": "2026-07-17T10:00:00.000Z",
      "AnotacaoUpdatedAt": "2026-07-17T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

**Error Responses:**

**400 Bad Request** - `EscolaGUID` ausente
```json
{ "success": false, "message": "EscolaGUID é obrigatório nos parâmetros de busca" }
```

**400 Bad Request** - `DataInicio`/`DataFim`/`AnotacaoIsFeito` inválidos

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/anotacao?EscolaGUID=550e8400-e29b-41d4-a716-446655440000&DataInicio=2026-07-01&DataFim=2026-07-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Get Estatísticas

Retorna a contagem total/feitas/pendentes de anotações do usuário em uma escola.

**Endpoint:** `GET /api/anotacao/estatisticas`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EscolaGUID` | string | ✅ Yes | UUID da escola |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": { "total": 8, "feitas": 5, "pendentes": 3 }
}
```

**Error Responses:**

**400 Bad Request** - `EscolaGUID` ausente
```json
{ "success": false, "message": "EscolaGUID é obrigatório" }
```

**403 Forbidden** - Sem vínculo ativo com a escola
```json
{ "success": false, "message": "Usuário não vinculado à escola" }
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/anotacao/estatisticas?EscolaGUID=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

> Nota de rota: `GET /estatisticas` é registrada **antes** de `GET /:guid` no router (`routes/anotacao.routes.ts`) justamente para não colidir com a rota de parâmetro.

---

### Get Anotação by ID

**Endpoint:** `GET /api/anotacao/:guid`

**URL Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `guid` | string | ✅ Yes | UUID da anotação | UUID v4 |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": { "AnotacaoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "AnotacaoTitulo": "Levar material de arte" }
}
```

**Error Responses:**

**400 Bad Request** - GUID inválido
```json
{ "success": false, "message": "AnotacaoGUID inválido (deve ser UUID v4)" }
```

**403 Forbidden** - Não é o dono
```json
{ "success": false, "message": "Sem permissão para acessar esta anotação" }
```

**404 Not Found**
```json
{ "success": false, "message": "Anotação não encontrada" }
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/anotacao/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Update Anotação

**Endpoint:** `PUT /api/anotacao/:guid`

**Request Body:**
```json
{ "AnotacaoTitulo": "Levar material de arte e argila", "AnotacaoIsFeito": false }
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `AnotacaoData` | string | ❌ No | Nova data | ISO 8601 |
| `AnotacaoTitulo` | string | ❌ No | Novo título | Não vazio, máx. 256 caracteres |
| `AnotacaoDescricao` | string \| null | ❌ No | Nova descrição | Máx. 2048 caracteres |
| `AnotacaoIsFeito` | boolean | ❌ No | Novo status | Booleano |

> Pelo menos um campo deve ser enviado.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Anotação atualizada com sucesso",
  "data": { "AnotacaoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "AnotacaoTitulo": "Levar material de arte e argila" }
}
```

**Error Responses:**

**400 Bad Request** - Nenhum campo, ou campos inválidos
```json
{ "success": false, "message": "Nenhum campo para atualizar foi fornecido" }
```

**403 Forbidden** - Não é o dono
```json
{ "success": false, "message": "Sem permissão para editar esta anotação" }
```

**404 Not Found**
```json
{ "success": false, "message": "Anotação não encontrada" }
```

**cURL Example:**
```bash
curl -X PUT https://api.example.com/api/anotacao/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "AnotacaoTitulo": "Levar material de arte e argila" }'
```

---

### Toggle Feito

Alterna (`!AnotacaoIsFeito`) o status de conclusão da anotação — **não** aceita um valor explícito no body, sempre inverte o estado atual.

**Endpoint:** `PATCH /api/anotacao/:guid/toggle`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Anotação marcada como feita",
  "data": { "AnotacaoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "AnotacaoIsFeito": true }
}
```

**Error Responses:**

**403 Forbidden** - Não é o dono
```json
{ "success": false, "message": "Sem permissão para marcar esta anotação" }
```

**404 Not Found**
```json
{ "success": false, "message": "Anotação não encontrada" }
```

**cURL Example:**
```bash
curl -X PATCH https://api.example.com/api/anotacao/7c9e6679-7425-40de-944b-e07fc1f90ae7/toggle \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Delete Anotação

Exclusão física (hard delete).

**Endpoint:** `DELETE /api/anotacao/:guid`

**Success Response (200 OK):**
```json
{ "success": true, "message": "Anotação excluída com sucesso" }
```

**Error Responses:**

**403 Forbidden** - Não é o dono
```json
{ "success": false, "message": "Sem permissão para excluir esta anotação" }
```

**404 Not Found**
```json
{ "success": false, "message": "Anotação não encontrada" }
```

**cURL Example:**
```bash
curl -X DELETE https://api.example.com/api/anotacao/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Data Models

### Anotacao Entity

```typescript
interface Anotacao {
  AnotacaoGUID: string;              // UUID v4
  UsuarioCPF: string;                // dono (sempre o usuário autenticado que criou)
  EscolaGUID: string;                // FK para escola
  AnotacaoData: Date;                // data/hora da anotação (America/Sao_Paulo)
  AnotacaoTitulo: string;            // até 256 caracteres
  AnotacaoDescricao: string | null;  // até 2048 caracteres
  AnotacaoIsFeito: boolean;
  AnotacaoCreatedAt: Date;
  AnotacaoUpdatedAt: Date;
}
```

### Database Schema

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
  CONSTRAINT `FK_Anotacao_Usuario` FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario`(`UsuarioCPF`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_Anotacao_Escola` FOREIGN KEY (`EscolaGUID`) REFERENCES `escola`(`EscolaGUID`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;
```

Fonte: `backend/database/migrations/create-anotacao-table.sql`.

---

## Business Rules

1. **Anotação é sempre pessoal** — `UsuarioCPF` é definido pelo backend a partir do token, nunca enviado pelo cliente (`AnotacaoController.create`).
2. **Vínculo ativo obrigatório na criação/listagem/estatísticas** — checagem de `escolaxusuarioxfuncao.Status='Ativo'` antes de qualquer operação que envolva `EscolaGUID` explícito (`AnotacaoService.criarAnotacao`, `listarAnotacoesPorPeriodo`, `obterEstatisticas`).
3. **Somente o dono tem acesso** — `show`, `update`, `marcarComoFeito` (toggle) e `excluirAnotacao` todos comparam `anotacao.UsuarioCPF === usuarioCPF`; não existe papel de admin com acesso a anotações de outros usuários (diferente de Pendência).
4. **Toggle não aceita valor explícito** — `PATCH /:guid/toggle` sempre inverte o valor atual (`!anotacao.AnotacaoIsFeito`); para setar um valor específico, use `PUT /:guid` com `AnotacaoIsFeito`.
5. **Listagem por intervalo de datas usa query dedicada** — se `DataInicio` e `DataFim` forem ambos informados, o filtro `AnotacaoIsFeito` da query string é **ignorado** (o controller opta pelo modo `listarAnotacoesPorPeriodo`, que não recebe esse filtro).
6. **Exclusão é física (hard delete)** — sem soft delete/status.
7. **Sem validação de anexos** — Anotação não integra com `relacaoanexos` nos endpoints atuais, apesar de a migration deixar comentado um plano para adicionar `AnotacaoGUID` a essa tabela (ver Notes).

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | `EscolaGUID`/`AnotacaoData`/`AnotacaoTitulo` obrigatório ou fora do formato | Falha de validação do middleware |
| 400 | `AnotacaoDescricao não pode exceder 2048 caracteres` | Descrição longa demais |
| 400 | `AnotacaoGUID inválido (deve ser UUID v4)` | Parâmetro de rota mal formatado |
| 400 | `Nenhum campo para atualizar foi fornecido` | `PUT` com body vazio |
| 401 | Usuário não autenticado | Token ausente/inválido |
| 403 | Usuário não vinculado à escola ou vínculo inativo / Usuário não vinculado à escola | Sem vínculo `Ativo` em `escolaxusuarioxfuncao` |
| 403 | Sem permissão para acessar/editar/marcar/excluir esta anotação | Usuário não é o dono |
| 404 | Anotação não encontrada | GUID inexistente |

---

## Examples

### Cenário 1: Criar e concluir uma anotação
```bash
POST /api/anotacao
{ "EscolaGUID": "550e8400-...", "AnotacaoData": "2026-07-20T09:00:00.000Z", "AnotacaoTitulo": "Levar material de arte" }
# Response 201, AnotacaoIsFeito=false

PATCH /api/anotacao/<guid>/toggle
# Response 200, AnotacaoIsFeito=true
```

### Cenário 2: Outro usuário tenta ver a anotação (❌ Erro)
```bash
GET /api/anotacao/7c9e6679-7425-40de-944b-e07fc1f90ae7
# usuário autenticado ≠ dono da anotação

Response 403:
{ "success": false, "message": "Sem permissão para acessar esta anotação" }
```

---

## Integration with Other Entities

- **Anotacao → Usuario / EscolaxUsuarioxFuncao**: vínculo validado via [escolaxusuarioxfuncao-api.md](escolaxusuarioxfuncao-api.md).
- **Anotacao → Calendário**: ⚠️ A confirmar — Anotação **não** aparece em `GET /api/calendario` (ver [calendario-api.md](calendario-api.md)), que só agrega Tarefa e Prova.

---

## Notes

- Todas as datas são retornadas em ISO 8601.
- A migration `create-anotacao-table.sql` contém, comentado, um plano de adicionar a coluna `AnotacaoGUID` à tabela genérica `relacaoanexos` para permitir anexos em anotações — **não implementado** nos endpoints atuais (nenhuma rota de anexo para Anotação existe em `routes/anotacao.routes.ts`).
- `AnotacaoGUID` segue estritamente UUID v4 (regex com `4` na posição de versão e `[89ab]` na de variante).
