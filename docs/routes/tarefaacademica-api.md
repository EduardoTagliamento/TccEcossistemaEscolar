# API Documentation - Tarefa Acadêmica (Academic Task)

**Version:** 1.0.0  
**Base URL:** `/api/tarefa`  
**Content-Type:** `application/json`  
**Authentication:** Required (JWT Bearer Token)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [TarefaAcademica (Academic Task)](#tarefaacademica-academic-task)
    - [Create Academic Task](#create-academic-task)
    - [List Academic Tasks](#list-academic-tasks)
    - [Get Academic Task by ID](#get-academic-task-by-id)
    - [Update Academic Task](#update-academic-task)
    - [Delete Academic Task](#delete-academic-task)
    - [Submit Attachment to Task](#submit-attachment-to-task)
    - [Remove Attachment from Task](#remove-attachment-from-task)
- [Data Models](#data-models)
- [Business Rules](#business-rules)

---

## Overview

API REST para gerenciamento de tarefas acadêmicas do Ecossistema Escolar. Esta API fornece endpoints para criar, listar, atualizar, deletar tarefas e gerenciar entregas de alunos.

**Tecnologias:**
- Node.js + Express + TypeScript
- MySQL (database)
- Arquitetura MVC em camadas

**Key Features:**
- 📝 Criação e gestão de tarefas por professores
- 📤 Entrega digital ou física de tarefas
- 📎 Anexos vinculados às tarefas
- ✅ Marcação de conclusão (feito/não feito)
- 📅 Controle de prazos e datas de realização
- 🔒 Autenticação JWT obrigatória
- 📊 Filtros por aluno, matéria, status e período

---

## Response Format

Todas as respostas seguem o formato padronizado:

### Success Response
```json
{
  "success": true,
  "message": "Descrição da operação",
  "data": {
    "tarefa": { /* dados da tarefa */ }
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
| `201` | Created - Tarefa criada com sucesso |
| `400` | Bad Request - Dados inválidos |
| `401` | Unauthorized - Token JWT ausente ou inválido |
| `403` | Forbidden - Sem permissão para acessar o recurso |
| `404` | Not Found - Tarefa não encontrada |
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
  http://localhost:3000/api/tarefa
```

---

## Endpoints

### TarefaAcademica (Academic Task)

Base path: `/api/tarefa`

---

#### Create Academic Task

Cria uma nova tarefa acadêmica para um aluno específico em uma matéria/turma.

**Endpoint:** `POST /api/tarefa`

**Authentication:** Required

**Authorization:** Apenas usuários com função "Professor", "Coordenação" ou "Secretaria"

**Request Body:**
```json
{
  "tarefa": {
    "MatriculaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "matXprofXturxescGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "TarefaTitulo": "Resolução de Exercícios - Funções Quadráticas",
    "TarefaConteudo": "Resolver os exercícios 1 a 15 da página 87 do livro didático. Mostrar todos os cálculos.",
    "TarefaPrazoData": "2026-05-25T23:59:59.000Z",
    "TarefaTipoEntrega": "digital",
    "anexosDescricao": [
      "Lista de exercícios complementares",
      "Gabarito comentado"
    ]
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `tarefa` | object | ✅ Yes | Objeto contendo dados da tarefa | Obrigatório |
| `tarefa.MatriculaGUID` | string | ✅ Yes | GUID da matrícula do aluno | UUID v4 (36 caracteres) |
| `tarefa.matXprofXturxescGUID` | string | ✅ Yes | GUID do vínculo matéria-professor-turma-escola | UUID v4 (36 caracteres) |
| `tarefa.TarefaTitulo` | string | ✅ Yes | Título da tarefa | 3-128 caracteres |
| `tarefa.TarefaConteudo` | string | ❌ No | Descrição detalhada da tarefa | Máximo 1024 caracteres |
| `tarefa.TarefaPrazoData` | string | ✅ Yes | Data/hora limite para entrega (ISO 8601) | Formato: `YYYY-MM-DDTHH:mm:ss.sssZ` |
| `tarefa.TarefaTipoEntrega` | string | ✅ Yes | Tipo de entrega | `digital` ou `fisica` |
| `tarefa.anexosDescricao` | array | ❌ No | Lista de descrições de anexos | Array de strings |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Tarefa criada com sucesso",
  "data": {
    "tarefa": {
      "TarefaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "MatriculaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "matXprofXturxescGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "TarefaTitulo": "Resolução de Exercícios - Funções Quadráticas",
      "TarefaConteudo": "Resolver os exercícios 1 a 15 da página 87 do livro didático. Mostrar todos os cálculos.",
      "TarefaPostagemData": "2026-05-17T10:30:00.000Z",
      "TarefaPrazoData": "2026-05-25T23:59:59.000Z",
      "TarefaTipoEntrega": "digital",
      "TarefaFeito": false,
      "TarefaRealizacaoData": null,
      "TarefaCreatedAt": "2026-05-17T10:30:00.000Z",
      "TarefaUpdatedAt": "2026-05-17T10:30:00.000Z"
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
    "message": "O campo 'TarefaTitulo' é obrigatório!"
  }
}
```

**400 Bad Request** - Prazo no passado
```json
{
  "success": false,
  "message": "Data inválida",
  "error": {
    "message": "O prazo da tarefa não pode ser no passado"
  }
}
```

**404 Not Found** - Matrícula não encontrada
```json
{
  "success": false,
  "message": "Matrícula não encontrada",
  "error": {
    "message": "A matrícula informada não existe"
  }
}
```

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão",
  "error": {
    "message": "Apenas professores, coordenação ou secretaria podem criar tarefas"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/tarefa \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tarefa": {
      "MatriculaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "matXprofXturxescGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "TarefaTitulo": "Resolução de Exercícios",
      "TarefaPrazoData": "2026-05-25T23:59:59.000Z",
      "TarefaTipoEntrega": "digital"
    }
  }'
```

---

#### List Academic Tasks

Retorna lista de tarefas acadêmicas com filtros opcionais.

**Endpoint:** `GET /api/tarefa`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `MatriculaGUID` | string | ❌ No | Filtro por GUID da matrícula | `?MatriculaGUID=550e8400-e29b...` |
| `matXprofXturxescGUID` | string | ❌ No | Filtro por vínculo matéria-professor-turma | `?matXprofXturxescGUID=6ba7b810...` |
| `TarefaFeito` | boolean | ❌ No | Filtro por status de conclusão | `?TarefaFeito=true` |
| `DataInicio` | string | ❌ No | Filtro de data inicial (ISO 8601) | `?DataInicio=2026-01-01` |
| `DataFim` | string | ❌ No | Filtro de data final (ISO 8601) | `?DataFim=2026-12-31` |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Executado com sucesso",
  "data": {
    "tarefas": [
      {
        "TarefaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "MatriculaGUID": "550e8400-e29b-41d4-a716-446655440000",
        "matXprofXturxescGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "TarefaTitulo": "Resolução de Exercícios - Funções Quadráticas",
        "TarefaConteudo": "Resolver os exercícios 1 a 15 da página 87 do livro didático.",
        "TarefaPostagemData": "2026-05-17T10:30:00.000Z",
        "TarefaPrazoData": "2026-05-25T23:59:59.000Z",
        "TarefaTipoEntrega": "digital",
        "TarefaFeito": false,
        "TarefaRealizacaoData": null,
        "TarefaCreatedAt": "2026-05-17T10:30:00.000Z",
        "TarefaUpdatedAt": "2026-05-17T10:30:00.000Z"
      },
      {
        "TarefaGUID": "8d8e6679-8536-51ef-b055-f18gd2g01bf8",
        "MatriculaGUID": "550e8400-e29b-41d4-a716-446655440000",
        "matXprofXturxescGUID": "7cb7b810-9ead-11d1-80b4-00c04fd430c9",
        "TarefaTitulo": "Redação - Texto Dissertativo",
        "TarefaConteudo": "Escrever uma redação dissertativa com tema livre.",
        "TarefaPostagemData": "2026-05-17T11:00:00.000Z",
        "TarefaPrazoData": "2026-05-30T23:59:59.000Z",
        "TarefaTipoEntrega": "fisica",
        "TarefaFeito": true,
        "TarefaRealizacaoData": "2026-05-20T14:30:00.000Z",
        "TarefaCreatedAt": "2026-05-17T11:00:00.000Z",
        "TarefaUpdatedAt": "2026-05-20T14:30:00.000Z"
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
    "tarefas": [],
    "total": 0
  }
}
```

**cURL Examples:**
```bash
# Listar todas as tarefas
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/tarefa

# Filtrar por matrícula (aluno específico)
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/tarefa?MatriculaGUID=550e8400-e29b-41d4-a716-446655440000"

# Filtrar tarefas pendentes
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/tarefa?TarefaFeito=false"

# Filtrar por período
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/tarefa?DataInicio=2026-05-01&DataFim=2026-05-31"
```

---

#### Get Academic Task by ID

Retorna os detalhes de uma tarefa específica pelo seu GUID.

**Endpoint:** `GET /api/tarefa/:TarefaGUID`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `TarefaGUID` | string | ✅ Yes | GUID único da tarefa | UUID v4 (36 caracteres) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Tarefa encontrada",
  "data": {
    "tarefa": {
      "TarefaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "MatriculaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "matXprofXturxescGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "TarefaTitulo": "Resolução de Exercícios - Funções Quadráticas",
      "TarefaConteudo": "Resolver os exercícios 1 a 15 da página 87 do livro didático. Mostrar todos os cálculos.",
      "TarefaPostagemData": "2026-05-17T10:30:00.000Z",
      "TarefaPrazoData": "2026-05-25T23:59:59.000Z",
      "TarefaTipoEntrega": "digital",
      "TarefaFeito": false,
      "TarefaRealizacaoData": null,
      "TarefaCreatedAt": "2026-05-17T10:30:00.000Z",
      "TarefaUpdatedAt": "2026-05-17T10:30:00.000Z"
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
    "message": "O parâmetro 'TarefaGUID' é obrigatório!"
  }
}
```

**404 Not Found** - Tarefa não encontrada
```json
{
  "success": false,
  "message": "Tarefa não encontrada",
  "error": {
    "message": "Não existe tarefa com id 7c9e6679-7425-40de-944b-e07fc1f90ae7"
  }
}
```

**cURL Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/tarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7
```

---

#### Update Academic Task

Atualiza os dados de uma tarefa acadêmica existente.

**Endpoint:** `PUT /api/tarefa/:TarefaGUID`

**Authentication:** Required

**Authorization:** Professor criador, aluno da tarefa, ou coordenação/secretaria

**URL Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `TarefaGUID` | string | ✅ Yes | GUID único da tarefa | UUID v4 (36 caracteres) |

**Request Body:**
```json
{
  "tarefa": {
    "TarefaTitulo": "Resolução de Exercícios - Funções Quadráticas (Atualizado)",
    "TarefaConteudo": "Resolver os exercícios 1 a 20 da página 87 e 88 do livro didático.",
    "TarefaPrazoData": "2026-05-27T23:59:59.000Z",
    "TarefaTipoEntrega": "digital",
    "TarefaFeito": true
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `tarefa` | object | ✅ Yes | Objeto com campos a atualizar | Pelo menos 1 campo |
| `tarefa.TarefaTitulo` | string | ❌ No | Novo título | 3-128 caracteres |
| `tarefa.TarefaConteudo` | string | ❌ No | Nova descrição | Max 1024 caracteres |
| `tarefa.TarefaPrazoData` | string | ❌ No | Novo prazo | ISO 8601 |
| `tarefa.TarefaTipoEntrega` | string | ❌ No | Novo tipo de entrega | `digital` ou `fisica` |
| `tarefa.TarefaFeito` | boolean | ❌ No | Marcar como feito/não feito | true/false |

> **💡 Nota:** Quando `TarefaFeito` é marcado como `true`, o campo `TarefaRealizacaoData` é automaticamente preenchido com a data/hora atual.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Tarefa atualizada com sucesso",
  "data": {
    "tarefa": {
      "TarefaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "MatriculaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "matXprofXturxescGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "TarefaTitulo": "Resolução de Exercícios - Funções Quadráticas (Atualizado)",
      "TarefaConteudo": "Resolver os exercícios 1 a 20 da página 87 e 88 do livro didático.",
      "TarefaPostagemData": "2026-05-17T10:30:00.000Z",
      "TarefaPrazoData": "2026-05-27T23:59:59.000Z",
      "TarefaTipoEntrega": "digital",
      "TarefaFeito": true,
      "TarefaRealizacaoData": "2026-05-20T14:30:00.000Z",
      "TarefaCreatedAt": "2026-05-17T10:30:00.000Z",
      "TarefaUpdatedAt": "2026-05-20T14:30:00.000Z"
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
    "message": "Você não tem autorização para atualizar esta tarefa"
  }
}
```

**404 Not Found** - Tarefa não encontrada
```json
{
  "success": false,
  "message": "Tarefa não encontrada",
  "error": {
    "message": "Não existe tarefa com id 7c9e6679-7425-40de-944b-e07fc1f90ae7"
  }
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/api/tarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tarefa": {
      "TarefaFeito": true
    }
  }'
```

---

#### Delete Academic Task

Exclui uma tarefa acadêmica do sistema.

**Endpoint:** `DELETE /api/tarefa/:TarefaGUID`

**Authentication:** Required

**Authorization:** Apenas o professor criador ou coordenação/secretaria

**URL Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `TarefaGUID` | string | ✅ Yes | GUID único da tarefa | UUID v4 (36 caracteres) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Tarefa excluída com sucesso",
  "data": null
}
```

**Error Responses:**

**404 Not Found** - Tarefa não encontrada
```json
{
  "success": false,
  "message": "Tarefa não encontrada",
  "error": {
    "message": "Não existe tarefa com id 7c9e6679-7425-40de-944b-e07fc1f90ae7"
  }
}
```

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão",
  "error": {
    "message": "Você não tem autorização para excluir esta tarefa"
  }
}
```

**cURL Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/tarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7
```

---

#### Submit Attachment to Task

Vincula um anexo (entrega) a uma tarefa acadêmica existente.

**Endpoint:** `POST /api/tarefa/:TarefaGUID/anexo-entrega`

**Authentication:** Required

**Authorization:** Apenas o aluno da tarefa pode enviar anexos de entrega

**URL Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `TarefaGUID` | string | ✅ Yes | GUID único da tarefa | UUID v4 (36 caracteres) |

**Request Body:**
```json
{
  "anexo": {
    "AnexoGUID": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `anexo` | object | ✅ Yes | Objeto contendo GUID do anexo | Obrigatório |
| `anexo.AnexoGUID` | string | ✅ Yes | GUID do anexo a vincular | UUID v4 (36 caracteres) |

> **💡 Nota:** O anexo deve ter sido previamente enviado via `POST /api/anexo` pelo mesmo aluno.

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Anexo vinculado com sucesso",
  "data": {
    "relacao": {
      "RelacaoAnexoGUID": "9e9f7780-9647-62fg-c166-g29he3h12cg9",
      "AnexoGUID": "550e8400-e29b-41d4-a716-446655440000",
      "TarefaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "RelacaoCreatedAt": "2026-05-20T14:30:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Anexo já vinculado
```json
{
  "success": false,
  "message": "Anexo já vinculado",
  "error": {
    "message": "Este anexo já está vinculado a esta tarefa"
  }
}
```

**403 Forbidden** - Anexo não pertence ao aluno
```json
{
  "success": false,
  "message": "Sem permissão",
  "error": {
    "message": "Você só pode vincular seus próprios anexos"
  }
}
```

**404 Not Found** - Anexo não encontrado
```json
{
  "success": false,
  "message": "Anexo não encontrado",
  "error": {
    "message": "Não existe anexo com id 550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/tarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7/anexo-entrega \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "anexo": {
      "AnexoGUID": "550e8400-e29b-41d4-a716-446655440000"
    }
  }'
```

---

#### Remove Attachment from Task

Remove o vínculo entre um anexo e uma tarefa acadêmica.

**Endpoint:** `DELETE /api/tarefa/:TarefaGUID/anexo-entrega/:AnexoGUID`

**Authentication:** Required

**Authorization:** Aluno da tarefa ou professor/coordenação

**URL Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `TarefaGUID` | string | ✅ Yes | GUID único da tarefa | UUID v4 (36 caracteres) |
| `AnexoGUID` | string | ✅ Yes | GUID único do anexo | UUID v4 (36 caracteres) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Anexo desvinculado com sucesso",
  "data": null
}
```

**Error Responses:**

**404 Not Found** - Vínculo não encontrado
```json
{
  "success": false,
  "message": "Vínculo não encontrado",
  "error": {
    "message": "Não existe vínculo entre este anexo e esta tarefa"
  }
}
```

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão",
  "error": {
    "message": "Você não tem autorização para remover este anexo"
  }
}
```

**cURL Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/tarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7/anexo-entrega/550e8400-e29b-41d4-a716-446655440000
```

---

## Data Models

### TarefaAcademica (Academic Task)

| Field | Type | Description |
|-------|------|-------------|
| `TarefaGUID` | string | UUID v4 único da tarefa (PK) |
| `MatriculaGUID` | string | GUID da matrícula do aluno (FK) |
| `matXprofXturxescGUID` | string | GUID do vínculo matéria-professor-turma-escola (FK) |
| `TarefaTitulo` | string | Título da tarefa (3-128 chars) |
| `TarefaConteudo` | string | Descrição detalhada (max 1024 chars) |
| `TarefaPostagemData` | datetime | Data/hora de criação da tarefa (UTC) |
| `TarefaPrazoData` | datetime | Data/hora limite para entrega (UTC) |
| `TarefaTipoEntrega` | enum | Tipo: `digital` ou `fisica` |
| `TarefaFeito` | boolean | Status de conclusão (true/false) |
| `TarefaRealizacaoData` | datetime | Data/hora de conclusão (UTC, null se não feito) |
| `TarefaCreatedAt` | datetime | Data/hora de criação do registro (UTC) |
| `TarefaUpdatedAt` | datetime | Data/hora da última atualização (UTC) |

---

## Business Rules

### Creation Rules

1. **Prazo da Tarefa:** Deve ser no futuro
2. **Matrícula:** Deve existir e estar ativa
3. **Vínculo Matéria-Professor-Turma:** Deve existir
4. **Data de Postagem:** Preenchida automaticamente com a data/hora atual
5. **Status Inicial:** Sempre criado como `TarefaFeito = false`

### Update Rules

1. **Marcar como Feito:**
   - Quando `TarefaFeito` muda de `false` para `true`, `TarefaRealizacaoData` é preenchido automaticamente
   - Professor pode marcar como feito/não feito
   - Aluno pode marcar apenas como feito

2. **Alteração de Prazo:**
   - Professor pode alterar a qualquer momento
   - Aluno não pode alterar prazo

3. **Permissões:**
   - **Professor criador:** Pode editar todos os campos
   - **Aluno da tarefa:** Pode editar apenas `TarefaFeito`
   - **Coordenação/Secretaria:** Pode editar todos os campos de qualquer tarefa

### Delete Rules

1. **Permissões:**
   - Apenas professor criador, coordenação ou secretaria
   - Aluno não pode excluir tarefas

2. **Efeitos Cascata:**
   - Anexos vinculados são desvinculados (registro deletado de `relacaoanexos`)
   - Arquivos físicos dos anexos NÃO são excluídos

### Attachment Rules

1. **Vinculação:**
   - Aluno pode vincular apenas seus próprios anexos
   - Anexo deve existir e pertencer ao aluno
   - Mesmo anexo não pode ser vinculado múltiplas vezes à mesma tarefa

2. **Tipos de Entrega:**
   - **Digital:** Anexos obrigatórios para conclusão
   - **Física:** Anexos opcionais (apenas para referência)

3. **Desvinculação:**
   - Aluno pode desvincular antes do prazo
   - Professor/coordenação pode desvincular a qualquer momento

### Notification Rules (Futuro)

1. **Criação:** Notificar aluno sobre nova tarefa
2. **Prazo Próximo:** Lembrete 1 dia antes do prazo
3. **Prazo Vencido:** Notificar aluno de tarefa atrasada
4. **Conclusão:** Notificar professor quando aluno marcar como feito

---

## Examples

### Complete Workflow - Student Perspective

```bash
# 1. Login como aluno
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"cpf":"123.456.789-00","senha":"senha123"}' \
  | jq -r '.data.token')

# 2. Ver minhas tarefas pendentes
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/tarefa?MatriculaGUID=550e8400-e29b-41d4-a716-446655440000&TarefaFeito=false"

# 3. Upload do arquivo de entrega
ANEXO_ID=$(curl -X POST http://localhost:3000/api/anexo \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@trabalho.pdf" \
  -F "EscolaGUID=6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  | jq -r '.data.anexo.AnexoGUID')

# 4. Vincular anexo à tarefa
curl -X POST http://localhost:3000/api/tarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7/anexo-entrega \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"anexo\": {\"AnexoGUID\": \"$ANEXO_ID\"}}"

# 5. Marcar tarefa como concluída
curl -X PUT http://localhost:3000/api/tarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tarefa": {"TarefaFeito": true}}'
```

### Complete Workflow - Teacher Perspective

```bash
# 1. Login como professor
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"cpf":"987.654.321-00","senha":"prof123"}' \
  | jq -r '.data.token')

# 2. Criar tarefa
TAREFA_ID=$(curl -X POST http://localhost:3000/api/tarefa \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tarefa": {
      "MatriculaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "matXprofXturxescGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "TarefaTitulo": "Resolução de Exercícios",
      "TarefaPrazoData": "2026-05-25T23:59:59.000Z",
      "TarefaTipoEntrega": "digital"
    }
  }' | jq -r '.data.tarefa.TarefaGUID')

# 3. Ver todas as tarefas da turma
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/tarefa?matXprofXturxescGUID=6ba7b810-9dad-11d1-80b4-00c04fd430c8"

# 4. Atualizar prazo
curl -X PUT http://localhost:3000/api/tarefa/$TAREFA_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tarefa": {"TarefaPrazoData": "2026-05-27T23:59:59.000Z"}}'

# 5. Ver tarefas concluídas
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/tarefa?matXprofXturxescGUID=6ba7b810-9dad-11d1-80b4-00c04fd430c8&TarefaFeito=true"
```

---

**Última atualização:** 17/05/2026  
**Versão da API:** 1.0.0  
**Autor:** Eduardo Tagliamento
