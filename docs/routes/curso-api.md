# API Documentation - Curso

**Version:** 1.0.0  
**Base URL:** `/api/curso`  
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Create Curso](#create-curso)
  - [List Cursos](#list-cursos)
  - [Get Curso by ID](#get-curso-by-id)
  - [Update Curso](#update-curso)
  - [Delete Curso](#delete-curso)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)

---

## Overview

API para gerenciamento de cursos técnicos do sistema educacional.

**Conceito:**
- Curso = Formação técnica (ex: Técnico em Informática, Técnico em Enfermagem)
- **IMPORTANTE:** Todos os cursos são técnicos por definição
- Vinculado a uma escola técnica (`EscolaIsTecnica = true`)
- Relacionado a turmas técnicas via `TurmaIsTecnico = true`

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

### Create Curso

Cria um novo curso técnico no sistema.

**Endpoint:** `POST /api/curso`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "curso": {
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "CursoNome": "Técnico em Informática",
    "CursoStatus": "Ativo"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `curso` | object | ✅ Yes | Objeto contendo dados do curso | Obrigatório |
| `curso.EscolaGUID` | string | ✅ Yes | UUID da escola técnica | UUID v4 válido + escola deve ter `EscolaIsTecnica=true` |
| `curso.CursoNome` | string | ✅ Yes | Nome do curso | 3-100 caracteres |
| `curso.CursoStatus` | string | ❌ No | Status inicial | "Ativo" ou "Inativo" (padrão: "Ativo") |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Curso criado com sucesso",
  "data": {
    "CursoGUID": "770e8400-e29b-41d4-a716-446655440001",
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "CursoNome": "Técnico em Informática",
    "CursoStatus": "Ativo",
    "CursoCreatedAt": "2026-05-12T10:30:00.000Z",
    "CursoUpdatedAt": "2026-05-12T10:30:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - Dados inválidos
```json
{
  "success": false,
  "message": "CursoNome deve ter entre 3 e 100 caracteres"
}
```

**400 Bad Request** - Escola não é técnica
```json
{
  "success": false,
  "message": "Cursos só podem ser criados em escolas técnicas",
  "details": {
    "message": "A escola informada não está configurada como escola técnica. Configure EscolaIsTecnica=true primeiro.",
    "escolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "escolaIsTecnica": false
  }
}
```

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão",
  "details": {
    "message": "Você não tem permissão para realizar esta operação. Apenas Coordenação e Direção podem gerenciar cursos."
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

**409 Conflict** - Nome duplicado
```json
{
  "success": false,
  "message": "Já existe um curso com este nome nesta escola",
  "details": {
    "cursoNome": "Técnico em Informática",
    "escolaGUID": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/curso \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "curso": {
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "CursoNome": "Técnico em Informática",
      "CursoStatus": "Ativo"
    }
  }'
```

---

### List Cursos

Lista cursos com filtros opcionais.

**Endpoint:** `GET /api/curso`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EscolaGUID` | string | ❌ No | Filtrar por escola (UUID) |
| `CursoStatus` | string | ❌ No | Filtrar por status ("Ativo" ou "Inativo") |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "CursoGUID": "770e8400-e29b-41d4-a716-446655440001",
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "CursoNome": "Técnico em Informática",
      "CursoStatus": "Ativo",
      "CursoCreatedAt": "2026-05-12T10:30:00.000Z",
      "CursoUpdatedAt": "2026-05-12T10:30:00.000Z"
    },
    {
      "CursoGUID": "770e8400-e29b-41d4-a716-446655440002",
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "CursoNome": "Técnico em Enfermagem",
      "CursoStatus": "Ativo",
      "CursoCreatedAt": "2026-05-12T11:00:00.000Z",
      "CursoUpdatedAt": "2026-05-12T11:00:00.000Z"
    }
  ],
  "total": 2
}
```

**cURL Example:**
```bash
# Listar todos os cursos de uma escola
curl -X GET "https://api.example.com/api/curso?EscolaGUID=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Listar apenas cursos ativos
curl -X GET "https://api.example.com/api/curso?CursoStatus=Ativo" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Get Curso by ID

Busca um curso específico pelo UUID.

**Endpoint:** `GET /api/curso/:guid`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | UUID do curso |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "CursoGUID": "770e8400-e29b-41d4-a716-446655440001",
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "CursoNome": "Técnico em Informática",
    "CursoStatus": "Ativo",
    "CursoCreatedAt": "2026-05-12T10:30:00.000Z",
    "CursoUpdatedAt": "2026-05-12T10:30:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - UUID inválido
```json
{
  "success": false,
  "message": "CursoGUID deve ser um UUID válido"
}
```

**404 Not Found** - Curso não encontrado
```json
{
  "success": false,
  "message": "Curso não encontrado",
  "details": {
    "message": "Não existe curso com id 770e8400-e29b-41d4-a716-446655440001"
  }
}
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/curso/770e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Update Curso

Atualiza dados de um curso existente.

**Endpoint:** `PUT /api/curso/:guid`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | UUID do curso |

**Request Body:**
```json
{
  "curso": {
    "CursoNome": "Técnico em Informática para Internet",
    "CursoStatus": "Inativo"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `curso` | object | ✅ Yes | Objeto com campos a atualizar | Pelo menos 1 campo |
| `curso.CursoNome` | string | ❌ No | Novo nome | 3-100 caracteres |
| `curso.CursoStatus` | string | ❌ No | Novo status | "Ativo" ou "Inativo" |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Curso atualizado com sucesso",
  "data": {
    "CursoGUID": "770e8400-e29b-41d4-a716-446655440001",
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "CursoNome": "Técnico em Informática para Internet",
    "CursoStatus": "Inativo",
    "CursoCreatedAt": "2026-05-12T10:30:00.000Z",
    "CursoUpdatedAt": "2026-05-12T14:20:00.000Z"
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

**404 Not Found** - Curso não encontrado
```json
{
  "success": false,
  "message": "Curso não encontrado"
}
```

**cURL Example:**
```bash
curl -X PUT https://api.example.com/api/curso/770e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "curso": {
      "CursoNome": "Técnico em Informática para Internet",
      "CursoStatus": "Inativo"
    }
  }'
```

---

### Delete Curso

Inativa um curso (soft delete).

**Endpoint:** `DELETE /api/curso/:guid`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | UUID do curso |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Curso excluído com sucesso"
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

**404 Not Found** - Curso não encontrado
```json
{
  "success": false,
  "message": "Curso não encontrado"
}
```

**cURL Example:**
```bash
curl -X DELETE https://api.example.com/api/curso/770e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Data Models

### Curso Entity

```typescript
interface Curso {
  CursoGUID: string;             // UUID v4
  EscolaGUID: string;            // FK para escola (deve ter EscolaIsTecnica=true)
  CursoNome: string;             // 3-100 caracteres
  CursoStatus: 'Ativo' | 'Inativo';
  CursoCreatedAt: Date;
  CursoUpdatedAt: Date;
}
```

**Nota:** Não há campo `CursoIsTecnico` porque **todos os cursos são técnicos por definição**.

### Database Schema

```sql
CREATE TABLE curso (
  CursoGUID CHAR(36) PRIMARY KEY,
  EscolaGUID CHAR(36) NOT NULL,
  CursoNome VARCHAR(100) NOT NULL,
  CursoStatus ENUM('Ativo', 'Inativo') NOT NULL DEFAULT 'Ativo',
  CursoCreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CursoUpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID),
  UNIQUE KEY unique_escola_curso (EscolaGUID, CursoNome)
);
```

---

## Business Rules

### 1. Cursos Apenas em Escolas Técnicas
- **CRÍTICO:** Cursos só podem ser criados em escolas com `EscolaIsTecnica = true`
- Validação ocorre no service layer antes da criação
- Mensagem de erro: "Cursos só podem ser criados em escolas técnicas"

### 2. Nome Único por Escola
- Uma escola não pode ter dois cursos com o mesmo nome
- Validação case-insensitive
- Mensagem de erro: "Já existe um curso com este nome nesta escola"

### 3. Todos os Cursos são Técnicos
- Não existe conceito de "curso não-técnico"
- Não há campo `CursoIsTecnico` no modelo
- Se a escola tem cursos, ela é técnica

### 4. Permissões de Escrita
- **Coordenação** (FuncaoId=1) com Status='Ativo'
- **Direção** (FuncaoId=6) com Status='Ativo'
- Validação via `escolaxusuarioxfuncao.findByTripla(cpf, escolaGUID, funcaoId)`

### 5. Soft Delete
- DELETE não remove do banco, apenas muda `CursoStatus` para 'Inativo'
- Preserva integridade referencial com turmas

### 6. Status Padrão
- Ao criar: `CursoStatus = 'Ativo'` (se não especificado)
- Timestamps automáticos via MySQL

---

## Error Codes

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | BAD_REQUEST | CursoNome deve ter entre 3 e 100 caracteres | Nome muito curto/longo |
| 400 | BAD_REQUEST | Cursos só podem ser criados em escolas técnicas | Escola não é técnica |
| 400 | BAD_REQUEST | EscolaGUID deve ser um UUID válido | Formato UUID incorreto |
| 403 | FORBIDDEN | Sem permissão | Usuário não é Coordenação/Direção |
| 404 | NOT_FOUND | Escola não encontrada | EscolaGUID inexistente |
| 404 | NOT_FOUND | Curso não encontrado | CursoGUID inexistente |
| 409 | CONFLICT | Já existe um curso com este nome | Nome duplicado na escola |
| 500 | INTERNAL_ERROR | Erro interno ao criar curso | Erro no banco/servidor |

---

## Examples

### Cenário 1: Criar Curso em Escola Técnica (✅ Sucesso)
```bash
# Passo 1: Verificar que escola é técnica
GET /api/escola/550e8400-e29b-41d4-a716-446655440000
Response: { "EscolaIsTecnica": true }

# Passo 2: Criar curso
POST /api/curso
{
  "curso": {
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "CursoNome": "Técnico em Informática"
  }
}

Response 201:
{
  "success": true,
  "message": "Curso criado com sucesso",
  "data": { /* curso criado */ }
}
```

### Cenário 2: Tentar Criar Curso em Escola Não-Técnica (❌ Erro)
```bash
POST /api/curso
{
  "curso": {
    "EscolaGUID": "999e8400-e29b-41d4-a716-446655440000",
    "CursoNome": "Técnico em Eletrônica"
  }
}

Response 400:
{
  "success": false,
  "message": "Cursos só podem ser criados em escolas técnicas",
  "details": {
    "message": "A escola informada não está configurada como escola técnica.",
    "escolaGUID": "999e8400-e29b-41d4-a716-446655440000",
    "escolaIsTecnica": false
  }
}
```

### Cenário 3: Listar Cursos Ativos de uma Escola
```bash
GET /api/curso?EscolaGUID=550e8400-e29b-41d4-a716-446655440000&CursoStatus=Ativo

Response 200:
{
  "success": true,
  "data": [
    {
      "CursoGUID": "770e8400-e29b-41d4-a716-446655440001",
      "CursoNome": "Técnico em Informática",
      "CursoStatus": "Ativo"
    },
    {
      "CursoGUID": "770e8400-e29b-41d4-a716-446655440002",
      "CursoNome": "Técnico em Enfermagem",
      "CursoStatus": "Ativo"
    }
  ],
  "total": 2
}
```

---

## Relationship with Turma

Cursos são vinculados a turmas técnicas:

```typescript
// Uma turma técnica DEVE ter um curso
interface Turma {
  TurmaGUID: string;
  EscolaGUID: string;
  TurmaSerie: string;
  TurmaNome: string;
  TurmaIsTecnico: boolean;      // true para turmas técnicas
  CursoGUID: string | null;     // obrigatório se TurmaIsTecnico=true
  TurmaStatus: string;
}
```

**Regra:**
- Se `TurmaIsTecnico = true` → `CursoGUID` é **obrigatório**
- Se `TurmaIsTecnico = false` → `CursoGUID` deve ser **null**

---

## Notes

- Todas as datas são retornadas em formato ISO 8601
- UUIDs são gerados automaticamente no backend (uuid v4)
- Soft delete preserva histórico de turmas vinculadas
- Ao inativar um curso, considere atualizar turmas relacionadas
- Nome do curso pode ser alterado sem quebrar relacionamentos (usa UUID como FK)
- **Decisão de Design:** Não há campo `CursoIsTecnico` porque seria redundante (todos são técnicos)
