# API Documentation - Matéria

**Version:** 1.0.0  
**Base URL:** `/api/materia`  
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Create Matéria](#create-materia)
  - [List Matérias](#list-materias)
  - [Get Matéria by ID](#get-materia-by-id)
  - [Update Matéria](#update-materia)
  - [Delete Matéria](#delete-materia)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)

---

## Overview

API para gerenciamento de matérias/disciplinas do sistema educacional.

**Conceito:**
- Matéria = Disciplina/Subject (ex: Matemática, Português, Química)
- Vinculada a uma escola específica
- Pode ser técnica ou comum
- Usado para alocação de professores em turmas

**Permissões:**
- **Coordenação** (FuncaoId=1) ou **Direção** (FuncaoId=6) podem criar/editar/excluir
- Todas as funções podem listar e visualizar

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
  "message": "Operação realizada com sucesso",
  "data": { /* dados */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Descrição do erro",
  "details": { /* detalhes adicionais */ }
}
```

---

## Endpoints

### Create Matéria

Cria uma nova matéria no sistema.

**Endpoint:** `POST /api/materia`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "materia": {
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "MateriaNome": "Matemática Avançada",
    "MateriaIsTecnico": false,
    "MateriaStatus": "Ativa"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `materia` | object | ✅ Yes | Objeto contendo dados da matéria | Obrigatório |
| `materia.EscolaGUID` | string | ✅ Yes | UUID da escola | UUID v4 válido |
| `materia.MateriaNome` | string | ✅ Yes | Nome da matéria | 3-100 caracteres |
| `materia.MateriaIsTecnico` | boolean | ✅ Yes | É matéria técnica? | true/false |
| `materia.MateriaStatus` | string | ❌ No | Status inicial | "Ativa" ou "Inativa" (padrão: "Ativa") |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Matéria criada com sucesso",
  "data": {
    "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "MateriaNome": "Matemática Avançada",
    "MateriaIsTecnico": false,
    "MateriaStatus": "Ativa",
    "MateriaCreatedAt": "2026-05-12T10:30:00.000Z",
    "MateriaUpdatedAt": "2026-05-12T10:30:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - Dados inválidos
```json
{
  "success": false,
  "message": "MateriaNome deve ter entre 3 e 100 caracteres"
}
```

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão",
  "details": {
    "message": "Você não tem permissão para realizar esta operação. Apenas Coordenação e Direção podem gerenciar matérias."
  }
}
```

**404 Not Found** - Escola não encontrada
```json
{
  "success": false,
  "message": "Escola não encontrada",
  "details": {
    "message": "Não existe escola com id 550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**409 Conflict** - Nome duplicado ou regra de negócio violada
```json
{
  "success": false,
  "message": "Matéria técnica requer escola técnica",
  "details": {
    "message": "Esta escola não permite criação de matérias técnicas. Configure EscolaIsTecnica=true primeiro."
  }
}
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/materia \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "materia": {
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "MateriaNome": "Matemática Avançada",
      "MateriaIsTecnico": false,
      "MateriaStatus": "Ativa"
    }
  }'
```

---

### List Matérias

Lista matérias com filtros opcionais.

**Endpoint:** `GET /api/materia`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EscolaGUID` | string | ❌ No | Filtrar por escola (UUID) |
| `MateriaIsTecnico` | boolean | ❌ No | Filtrar por tipo (técnica ou não) |
| `MateriaStatus` | string | ❌ No | Filtrar por status ("Ativa" ou "Inativa") |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "MateriaNome": "Matemática Avançada",
      "MateriaIsTecnico": false,
      "MateriaStatus": "Ativa",
      "MateriaCreatedAt": "2026-05-12T10:30:00.000Z",
      "MateriaUpdatedAt": "2026-05-12T10:30:00.000Z"
    },
    {
      "MateriaGUID": "660e8400-e29b-41d4-a716-446655440002",
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "MateriaNome": "Redes de Computadores",
      "MateriaIsTecnico": true,
      "MateriaStatus": "Ativa",
      "MateriaCreatedAt": "2026-05-12T11:00:00.000Z",
      "MateriaUpdatedAt": "2026-05-12T11:00:00.000Z"
    }
  ],
  "total": 2
}
```

**cURL Example:**
```bash
# Listar todas as matérias de uma escola
curl -X GET "https://api.example.com/api/materia?EscolaGUID=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Listar apenas matérias técnicas ativas
curl -X GET "https://api.example.com/api/materia?MateriaIsTecnico=true&MateriaStatus=Ativa" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Get Matéria by ID

Busca uma matéria específica pelo UUID.

**Endpoint:** `GET /api/materia/:guid`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | UUID da matéria |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "MateriaNome": "Matemática Avançada",
    "MateriaIsTecnico": false,
    "MateriaStatus": "Ativa",
    "MateriaCreatedAt": "2026-05-12T10:30:00.000Z",
    "MateriaUpdatedAt": "2026-05-12T10:30:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - UUID inválido
```json
{
  "success": false,
  "message": "MateriaGUID deve ser um UUID válido"
}
```

**404 Not Found** - Matéria não encontrada
```json
{
  "success": false,
  "message": "Matéria não encontrada",
  "details": {
    "message": "Não existe matéria com id 660e8400-e29b-41d4-a716-446655440001"
  }
}
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/materia/660e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Update Matéria

Atualiza dados de uma matéria existente.

**Endpoint:** `PUT /api/materia/:guid`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | UUID da matéria |

**Request Body:**
```json
{
  "materia": {
    "MateriaNome": "Matemática Aplicada",
    "MateriaStatus": "Inativa"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `materia` | object | ✅ Yes | Objeto com campos a atualizar | Pelo menos 1 campo |
| `materia.MateriaNome` | string | ❌ No | Novo nome | 3-100 caracteres |
| `materia.MateriaStatus` | string | ❌ No | Novo status | "Ativa" ou "Inativa" |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Matéria atualizada com sucesso",
  "data": {
    "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "MateriaNome": "Matemática Aplicada",
    "MateriaIsTecnico": false,
    "MateriaStatus": "Inativa",
    "MateriaCreatedAt": "2026-05-12T10:30:00.000Z",
    "MateriaUpdatedAt": "2026-05-12T14:20:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - Dados inválidos
```json
{
  "success": false,
  "message": "É necessário fornecer ao menos um campo para atualização"
}
```

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão"
}
```

**404 Not Found** - Matéria não encontrada
```json
{
  "success": false,
  "message": "Matéria não encontrada"
}
```

**cURL Example:**
```bash
curl -X PUT https://api.example.com/api/materia/660e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "materia": {
      "MateriaNome": "Matemática Aplicada",
      "MateriaStatus": "Inativa"
    }
  }'
```

---

### Delete Matéria

Inativa uma matéria (soft delete).

**Endpoint:** `DELETE /api/materia/:guid`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | UUID da matéria |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Matéria excluída com sucesso"
}
```

**Error Responses:**

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão"
}
```

**404 Not Found** - Matéria não encontrada
```json
{
  "success": false,
  "message": "Matéria não encontrada"
}
```

**cURL Example:**
```bash
curl -X DELETE https://api.example.com/api/materia/660e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Data Models

### Matéria Entity

```typescript
interface Materia {
  MateriaGUID: string;           // UUID v4
  EscolaGUID: string;            // FK para escola
  MateriaNome: string;           // 3-100 caracteres
  MateriaIsTecnico: boolean;     // true = técnica, false = comum
  MateriaStatus: 'Ativa' | 'Inativa';
  MateriaCreatedAt: Date;
  MateriaUpdatedAt: Date;
}
```

### Database Schema

```sql
CREATE TABLE materia (
  MateriaGUID CHAR(36) PRIMARY KEY,
  EscolaGUID CHAR(36) NOT NULL,
  MateriaNome VARCHAR(100) NOT NULL,
  MateriaIsTecnico TINYINT(1) NOT NULL DEFAULT 0,
  MateriaStatus ENUM('Ativa', 'Inativa') NOT NULL DEFAULT 'Ativa',
  MateriaCreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  MateriaUpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID),
  UNIQUE KEY unique_escola_materia (EscolaGUID, MateriaNome)
);
```

---

## Business Rules

### 1. Nome Único por Escola
- Uma escola não pode ter duas matérias com o mesmo nome
- Validação case-insensitive
- Mensagem de erro: "Já existe uma matéria com este nome nesta escola"

### 2. Matéria Técnica Requer Escola Técnica
- Se `MateriaIsTecnico = true`, a escola deve ter `EscolaIsTecnica = true`
- Validação ocorre no service layer
- Mensagem de erro: "Matéria técnica requer escola técnica"

### 3. Permissões de Escrita
- **Coordenação** (FuncaoId=1) com Status='Ativo'
- **Direção** (FuncaoId=6) com Status='Ativo'
- Validação via `escolaxusuarioxfuncao.findByTripla(cpf, escolaGUID, funcaoId)`

### 4. Soft Delete
- DELETE não remove do banco, apenas muda `MateriaStatus` para 'Inativa'
- Preserva integridade referencial com outras tabelas

### 5. Status Padrão
- Ao criar: `MateriaStatus = 'Ativa'` (se não especificado)
- Timestamps automáticos via MySQL

---

## Error Codes

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | BAD_REQUEST | MateriaNome deve ter entre 3 e 100 caracteres | Nome muito curto/longo |
| 400 | BAD_REQUEST | MateriaIsTecnico deve ser booleano | Tipo inválido |
| 400 | BAD_REQUEST | EscolaGUID deve ser um UUID válido | Formato UUID incorreto |
| 403 | FORBIDDEN | Sem permissão | Usuário não é Coordenação/Direção |
| 404 | NOT_FOUND | Escola não encontrada | EscolaGUID inexistente |
| 404 | NOT_FOUND | Matéria não encontrada | MateriaGUID inexistente |
| 409 | CONFLICT | Matéria técnica requer escola técnica | Regra de negócio violada |
| 409 | CONFLICT | Já existe uma matéria com este nome | Nome duplicado na escola |
| 500 | INTERNAL_ERROR | Erro interno ao criar matéria | Erro no banco/servidor |

---

## Examples

### Cenário 1: Criar Matéria Comum
```bash
POST /api/materia
{
  "materia": {
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "MateriaNome": "Português",
    "MateriaIsTecnico": false
  }
}

Response 201:
{
  "success": true,
  "message": "Matéria criada com sucesso",
  "data": { /* matéria criada */ }
}
```

### Cenário 2: Tentar Criar Matéria Técnica em Escola Não-Técnica
```bash
POST /api/materia
{
  "materia": {
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "MateriaNome": "Eletrônica Digital",
    "MateriaIsTecnico": true  // ❌ Escola não é técnica
  }
}

Response 409:
{
  "success": false,
  "message": "Matéria técnica requer escola técnica",
  "details": {
    "message": "Esta escola não permite criação de matérias técnicas."
  }
}
```

### Cenário 3: Listar Matérias Técnicas Ativas
```bash
GET /api/materia?MateriaIsTecnico=true&MateriaStatus=Ativa

Response 200:
{
  "success": true,
  "data": [
    { /* matéria técnica 1 */ },
    { /* matéria técnica 2 */ }
  ],
  "total": 2
}
```

---

## Notes

- Todas as datas são retornadas em formato ISO 8601
- UUIDs são gerados automaticamente no backend (uuid v4)
- Boolean fields retornam como `true`/`false` (não 0/1)
- Soft delete preserva histórico de alocações de professores
- Nome da matéria não pode ser alterado após criação de alocações (recomendação)
