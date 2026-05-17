# API Documentation - Prova Agendada (Scheduled Test)

**Version:** 1.0.0  
**Base URL:** `/api/prova`  
**Content-Type:** `application/json`  
**Authentication:** Required (JWT Bearer Token)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [ProvaAgendada (Scheduled Test)](#provaagendada-scheduled-test)
    - [Create Scheduled Test](#create-scheduled-test)
    - [List Scheduled Tests](#list-scheduled-tests)
    - [Get Scheduled Test by ID](#get-scheduled-test-by-id)
    - [Update Scheduled Test](#update-scheduled-test)
    - [Delete Scheduled Test](#delete-scheduled-test)
- [Data Models](#data-models)
- [Business Rules](#business-rules)

---

## Overview

API REST para gerenciamento de provas agendadas do Ecossistema Escolar. Esta API fornece endpoints para criar, listar, atualizar e deletar provas agendadas para turmas e matérias específicas.

**Tecnologias:**
- Node.js + Express + TypeScript
- MySQL (database)
- Arquitetura MVC em camadas

**Key Features:**
- 📅 Agendamento de provas por turma e matéria
- 📝 Descrição detalhada das provas
- 🔔 Status de prova (Agendada, Realizada, Cancelada)
- 🔒 Autenticação JWT obrigatória
- 📊 Filtros por turma, matéria, status e período
- ⚡ Rate limiting para prevenção de spam

---

## Response Format

Todas as respostas seguem o formato padronizado:

### Success Response
```json
{
  "success": true,
  "message": "Descrição da operação",
  "data": {
    "prova": { /* dados da prova */ }
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Descrição do erro",
  "error": {
    "message": "Detalhes específicos do erro"
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| `200` | OK - Requisição bem-sucedida |
| `201` | Created - Prova criada com sucesso |
| `400` | Bad Request - Dados inválidos |
| `401` | Unauthorized - Token JWT ausente ou inválido |
| `403` | Forbidden - Sem permissão para acessar o recurso |
| `404` | Not Found - Prova não encontrada |
| `429` | Too Many Requests - Rate limit excedido |
| `500` | Internal Server Error - Erro interno do servidor |

---

## Authentication

**Todas as rotas requerem autenticação JWT via header:**

```http
Authorization: Bearer <seu_token_jwt>
```

**Como obter o token:**
1. Faça login em `POST /api/auth/login`
2. Use o token retornado no campo `data.token`
3. Inclua o token no header `Authorization` de todas as requisições

**Exemplo:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://localhost:3000/api/prova
```

---

## Endpoints

### ProvaAgendada (Scheduled Test)

Base path: `/api/prova`

---

#### Create Scheduled Test

Cria uma nova prova agendada para uma turma e matéria específicas.

**Endpoint:** `POST /api/prova`

**Authentication:** Required

**Authorization:** Apenas usuários com função "Professor", "Coordenação" ou "Secretaria"

**Request Body:**
```json
{
  "prova": {
    "TurmaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "MateriaGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "ProvaData": "2026-06-15T14:00:00.000Z",
    "ProvaDescricao": "Prova bimestral de Matemática - Conteúdo: Funções quadráticas e trigonometria",
    "anexosDescricao": [
      "Lista de exercícios preparatórios",
      "Fórmulas permitidas"
    ]
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `prova` | object | ✅ Yes | Objeto contendo dados da prova | Obrigatório |
| `prova.TurmaGUID` | string | ✅ Yes | GUID da turma | UUID v4 (36 caracteres) |
| `prova.MateriaGUID` | string | ✅ Yes | GUID da matéria | UUID v4 (36 caracteres) |
| `prova.ProvaData` | string | ✅ Yes | Data/hora da prova (ISO 8601) | Formato: `YYYY-MM-DDTHH:mm:ss.sssZ` |
| `prova.ProvaDescricao` | string | ❌ No | Descrição da prova | Máximo 1024 caracteres |
| `prova.anexosDescricao` | array | ❌ No | Lista de descrições de anexos | Array de strings |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Prova criada com sucesso",
  "data": {
    "prova": {
      "ProvaAgendadaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "TurmaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "MateriaGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "ProvaData": "2026-06-15T14:00:00.000Z",
      "ProvaDescricao": "Prova bimestral de Matemática - Conteúdo: Funções quadráticas e trigonometria",
      "ProvaStatus": "Agendada",
      "ProvaCreatedAt": "2026-05-17T10:30:00.000Z",
      "ProvaUpdatedAt": "2026-05-17T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Dados inválidos
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "error": {
    "message": "O campo 'TurmaGUID' é obrigatório!"
  }
}
```

**400 Bad Request** - Data no passado
```json
{
  "success": false,
  "message": "Data inválida",
  "error": {
    "message": "A data da prova não pode ser no passado"
  }
}
```

**404 Not Found** - Turma não encontrada
```json
{
  "success": false,
  "message": "Turma não encontrada",
  "error": {
    "message": "A turma informada não existe"
  }
}
```

**404 Not Found** - Matéria não encontrada
```json
{
  "success": false,
  "message": "Matéria não encontrada",
  "error": {
    "message": "A matéria informada não existe"
  }
}
```

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão",
  "error": {
    "message": "Apenas professores, coordenação ou secretaria podem criar provas"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/prova \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "prova": {
      "TurmaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "MateriaGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "ProvaData": "2026-06-15T14:00:00.000Z",
      "ProvaDescricao": "Prova bimestral de Matemática"
    }
  }'
```

---

#### List Scheduled Tests

Retorna lista de provas agendadas com filtros opcionais.

**Endpoint:** `GET /api/prova`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `TurmaGUID` | string | ❌ No | Filtro por GUID da turma | `?TurmaGUID=550e8400-e29b-41d4...` |
| `MateriaGUID` | string | ❌ No | Filtro por GUID da matéria | `?MateriaGUID=6ba7b810-9dad...` |
| `ProvaStatus` | string | ❌ No | Filtro por status | `?ProvaStatus=Agendada` |
| `DataInicio` | string | ❌ No | Filtro de data inicial (ISO 8601) | `?DataInicio=2026-01-01` |
| `DataFim` | string | ❌ No | Filtro de data final (ISO 8601) | `?DataFim=2026-12-31` |

**Status válidos:** `Agendada`, `Realizada`, `Cancelada`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Executado com sucesso",
  "data": {
    "provas": [
      {
        "ProvaAgendadaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "TurmaGUID": "550e8400-e29b-41d4-a716-446655440000",
        "MateriaGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "ProvaData": "2026-06-15T14:00:00.000Z",
        "ProvaDescricao": "Prova bimestral de Matemática",
        "ProvaStatus": "Agendada",
        "ProvaCreatedAt": "2026-05-17T10:30:00.000Z",
        "ProvaUpdatedAt": "2026-05-17T10:30:00.000Z"
      },
      {
        "ProvaAgendadaGUID": "8d8e6679-8536-51ef-b055-f18gd2g01bf8",
        "TurmaGUID": "550e8400-e29b-41d4-a716-446655440000",
        "MateriaGUID": "7cb7b810-9ead-11d1-80b4-00c04fd430c9",
        "ProvaData": "2026-06-20T10:00:00.000Z",
        "ProvaDescricao": "Prova de Português - Interpretação de texto",
        "ProvaStatus": "Agendada",
        "ProvaCreatedAt": "2026-05-17T11:00:00.000Z",
        "ProvaUpdatedAt": "2026-05-17T11:00:00.000Z"
      }
    ],
    "total": 2
  }
}
```

**Success Response (200 OK) - Empty:**
```json
{
  "success": true,
  "message": "Executado com sucesso",
  "data": {
    "provas": [],
    "total": 0
  }
}
```

**cURL Examples:**
```bash
# Listar todas as provas
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/prova

# Filtrar por turma
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/prova?TurmaGUID=550e8400-e29b-41d4-a716-446655440000"

# Filtrar por status e período
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/prova?ProvaStatus=Agendada&DataInicio=2026-06-01&DataFim=2026-06-30"
```

---

#### Get Scheduled Test by ID

Retorna os detalhes de uma prova específica pelo seu GUID.

**Endpoint:** `GET /api/prova/:ProvaAgendadaGUID`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `ProvaAgendadaGUID` | string | ✅ Yes | GUID único da prova | UUID v4 (36 caracteres) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Prova encontrada",
  "data": {
    "prova": {
      "ProvaAgendadaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "TurmaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "MateriaGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "ProvaData": "2026-06-15T14:00:00.000Z",
      "ProvaDescricao": "Prova bimestral de Matemática - Conteúdo: Funções quadráticas e trigonometria",
      "ProvaStatus": "Agendada",
      "ProvaCreatedAt": "2026-05-17T10:30:00.000Z",
      "ProvaUpdatedAt": "2026-05-17T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - GUID inválido
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "error": {
    "message": "O parâmetro 'ProvaAgendadaGUID' é obrigatório!"
  }
}
```

**404 Not Found** - Prova não encontrada
```json
{
  "success": false,
  "message": "Prova não encontrada",
  "error": {
    "message": "Não existe prova com id 7c9e6679-7425-40de-944b-e07fc1f90ae7"
  }
}
```

**cURL Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/prova/7c9e6679-7425-40de-944b-e07fc1f90ae7
```

---

#### Update Scheduled Test

Atualiza os dados de uma prova agendada existente.

**Endpoint:** `PUT /api/prova/:ProvaAgendadaGUID`

**Authentication:** Required

**Authorization:** Apenas o professor que criou ou coordenação/secretaria

**URL Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `ProvaAgendadaGUID` | string | ✅ Yes | GUID único da prova | UUID v4 (36 caracteres) |

**Request Body:**
```json
{
  "prova": {
    "ProvaData": "2026-06-16T14:00:00.000Z",
    "ProvaDescricao": "Prova bimestral de Matemática - Adiada - Novo conteúdo inclui logaritmos",
    "ProvaStatus": "Agendada"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `prova` | object | ✅ Yes | Objeto com campos a atualizar | Pelo menos 1 campo |
| `prova.ProvaData` | string | ❌ No | Nova data/hora da prova | ISO 8601 |
| `prova.ProvaDescricao` | string | ❌ No | Nova descrição | Max 1024 caracteres |
| `prova.ProvaStatus` | string | ❌ No | Novo status | `Agendada`, `Realizada`, `Cancelada` |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Prova atualizada com sucesso",
  "data": {
    "prova": {
      "ProvaAgendadaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "TurmaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "MateriaGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "ProvaData": "2026-06-16T14:00:00.000Z",
      "ProvaDescricao": "Prova bimestral de Matemática - Adiada - Novo conteúdo inclui logaritmos",
      "ProvaStatus": "Agendada",
      "ProvaCreatedAt": "2026-05-17T10:30:00.000Z",
      "ProvaUpdatedAt": "2026-05-17T15:20:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Nenhum campo fornecido
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "error": {
    "message": "É necessário informar pelo menos um campo para atualizar"
  }
}
```

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão",
  "error": {
    "message": "Você não tem autorização para atualizar esta prova"
  }
}
```

**404 Not Found** - Prova não encontrada
```json
{
  "success": false,
  "message": "Prova não encontrada",
  "error": {
    "message": "Não existe prova com id 7c9e6679-7425-40de-944b-e07fc1f90ae7"
  }
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/api/prova/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "prova": {
      "ProvaStatus": "Realizada"
    }
  }'
```

---

#### Delete Scheduled Test

Exclui uma prova agendada do sistema.

**Endpoint:** `DELETE /api/prova/:ProvaAgendadaGUID`

**Authentication:** Required

**Authorization:** Apenas o professor que criou ou coordenação/secretaria

**URL Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `ProvaAgendadaGUID` | string | ✅ Yes | GUID único da prova | UUID v4 (36 caracteres) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Prova excluída com sucesso",
  "data": null
}
```

**Error Responses:**

**404 Not Found** - Prova não encontrada
```json
{
  "success": false,
  "message": "Prova não encontrada",
  "error": {
    "message": "Não existe prova com id 7c9e6679-7425-40de-944b-e07fc1f90ae7"
  }
}
```

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão",
  "error": {
    "message": "Você não tem autorização para excluir esta prova"
  }
}
```

**cURL Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/prova/7c9e6679-7425-40de-944b-e07fc1f90ae7
```

---

## Data Models

### ProvaAgendada (Scheduled Test)

| Field | Type | Description |
|-------|------|-------------|
| `ProvaAgendadaGUID` | string | UUID v4 único da prova (PK) |
| `TurmaGUID` | string | GUID da turma vinculada (FK) |
| `MateriaGUID` | string | GUID da matéria vinculada (FK) |
| `ProvaData` | datetime | Data e hora da prova (UTC) |
| `ProvaDescricao` | string | Descrição/conteúdo da prova (max 1024 chars) |
| `ProvaStatus` | enum | Status: `Agendada`, `Realizada`, `Cancelada` |
| `ProvaCreatedAt` | datetime | Data/hora de criação (UTC) |
| `ProvaUpdatedAt` | datetime | Data/hora da última atualização (UTC) |

---

## Business Rules

### Creation Rules

1. **Data da Prova:** Não pode ser no passado
2. **Turma e Matéria:** Devem existir no sistema
3. **Status Inicial:** Sempre criado como "Agendada"
4. **Permissões:** Apenas professores, coordenação ou secretaria podem criar

### Update Rules

1. **Alteração de Status:**
   - `Agendada` → `Realizada` (após a data da prova)
   - `Agendada` → `Cancelada` (cancelamento)
   - `Realizada` e `Cancelada` não podem retornar para `Agendada`

2. **Alteração de Data:**
   - Permitida apenas enquanto status for `Agendada`
   - Nova data não pode ser no passado

3. **Permissões:**
   - Professor criador pode editar suas provas
   - Coordenação/Secretaria podem editar qualquer prova da escola

### Delete Rules

1. **Quando Permitido:**
   - Provas com status `Agendada` podem ser excluídas
   - Provas `Realizadas` ou `Canceladas` devem ser mantidas para histórico

2. **Permissões:**
   - Mesmas regras de update (criador + admin)

### Notification Rules (Futuro)

1. **Criação:** Notificar todos os alunos da turma
2. **Atualização:** Notificar se houver mudança de data ou cancelamento
3. **Lembrete:** Notificar alunos 1 dia antes da prova

### Rate Limiting

- **Limite:** 30 requisições por minuto por usuário
- **Reset:** A cada minuto
- **Response:** HTTP 429 Too Many Requests

---

## Examples

### Complete Workflow

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"cpf":"123.456.789-00","senha":"senha123"}' \
  | jq -r '.data.token')

# 2. Criar prova
PROVA_ID=$(curl -X POST http://localhost:3000/api/prova \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prova": {
      "TurmaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "MateriaGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "ProvaData": "2026-06-15T14:00:00.000Z",
      "ProvaDescricao": "Prova bimestral de Matemática"
    }
  }' | jq -r '.data.prova.ProvaAgendadaGUID')

# 3. Ver prova
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/prova/$PROVA_ID

# 4. Listar provas da turma
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/prova?TurmaGUID=550e8400-e29b-41d4-a716-446655440000"

# 5. Atualizar status após realização
curl -X PUT http://localhost:3000/api/prova/$PROVA_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prova": {"ProvaStatus": "Realizada"}}'
```

---

**Última atualização:** 17/05/2026  
**Versão da API:** 1.0.0  
**Autor:** Eduardo Tagliamento
