# API Documentation - Professor

**Version:** 1.0.0  
**Base URL:** `/api/professor`  
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [List Professores](#list-professores)
  - [Get Professor Alocações](#get-professor-alocações)
  - [Create Alocação](#create-alocação)
  - [List Alocações](#list-alocações)
  - [Get Alocação by ID](#get-alocação-by-id)
  - [Update Alocação](#update-alocação)
  - [Delete Alocação](#delete-alocação)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)

---

## Overview

API para gerenciamento de professores e suas alocações em matérias e turmas.

**Conceitos:**
- **Professor** = Usuario com FuncaoId=3 (não é entidade separada)
- **Alocação** = Vínculo entre Professor + Matéria + Turma (junction table `materiaxprofessorxturma`)
- Um professor pode ter múltiplas alocações (várias matérias, várias turmas)
- Alocação = "Professor X leciona Matéria Y na Turma Z"

**Permissões:**
- **Coordenação** (FuncaoId=1) ou **Direção** (FuncaoId=6) podem criar/editar/excluir alocações
- Todas as funções podem listar professores e alocações

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

### List Professores

Lista todos os professores ativos de uma escola.

**Endpoint:** `GET /api/professor?EscolaGUID=<uuid>`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EscolaGUID` | string | ✅ Yes | UUID da escola |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "UsuarioCPF": "12345678901",
      "UsuarioNome": "João Silva",
      "UsuarioEmail": "joao.silva@escola.com",
      "UsuarioTelefone": "11987654321",
      "UsuarioDataNascimento": "1985-03-15",
      "UsuarioCreatedAt": "2026-05-10T08:00:00.000Z",
      "UsuarioUpdatedAt": "2026-05-10T08:00:00.000Z"
    },
    {
      "UsuarioCPF": "98765432100",
      "UsuarioNome": "Maria Santos",
      "UsuarioEmail": "maria.santos@escola.com",
      "UsuarioTelefone": "11912345678",
      "UsuarioDataNascimento": "1990-07-22",
      "UsuarioCreatedAt": "2026-05-11T09:00:00.000Z",
      "UsuarioUpdatedAt": "2026-05-11T09:00:00.000Z"
    }
  ],
  "total": 2
}
```

**Error Responses:**

**400 Bad Request** - EscolaGUID inválido
```json
{
  "success": false,
  "message": "EscolaGUID deve ser um UUID válido"
}
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/professor?EscolaGUID=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Get Professor Alocações

Busca todas as alocações de um professor específico em uma escola.

**Endpoint:** `GET /api/professor/:cpf/escolas/:escolaGUID/alocacoes`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cpf` | string | ✅ Yes | CPF do professor (11 dígitos) |
| `escolaGUID` | string | ✅ Yes | UUID da escola |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "MatProfTurGUID": "990e8400-e29b-41d4-a716-446655440001",
      "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
      "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
      "UsuarioCPF": "12345678901",
      "AlocacaoStatus": "Ativa",
      "MatProfTurCreatedAt": "2026-05-12T10:00:00.000Z",
      "MatProfTurUpdatedAt": "2026-05-12T10:00:00.000Z"
    },
    {
      "MatProfTurGUID": "990e8400-e29b-41d4-a716-446655440002",
      "MateriaGUID": "660e8400-e29b-41d4-a716-446655440002",
      "TurmaGUID": "880e8400-e29b-41d4-a716-446655440002",
      "UsuarioCPF": "12345678901",
      "AlocacaoStatus": "Ativa",
      "MatProfTurCreatedAt": "2026-05-12T11:00:00.000Z",
      "MatProfTurUpdatedAt": "2026-05-12T11:00:00.000Z"
    }
  ],
  "total": 2
}
```

**Error Responses:**

**400 Bad Request** - CPF inválido
```json
{
  "success": false,
  "message": "UsuarioCPF deve conter exatamente 11 dígitos"
}
```

**400 Bad Request** - EscolaGUID inválido
```json
{
  "success": false,
  "message": "EscolaGUID deve ser um UUID válido"
}
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/professor/12345678901/escolas/550e8400-e29b-41d4-a716-446655440000/alocacoes \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Create Alocação

Cria uma nova alocação (Professor + Matéria + Turma).

**Endpoint:** `POST /api/professor/alocacao`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "alocacao": {
    "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
    "UsuarioCPF": "12345678901",
    "AlocacaoStatus": "Ativa"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `alocacao` | object | ✅ Yes | Objeto contendo dados da alocação | Obrigatório |
| `alocacao.MateriaGUID` | string | ✅ Yes | UUID da matéria | UUID v4 válido |
| `alocacao.TurmaGUID` | string | ✅ Yes | UUID da turma | UUID v4 válido |
| `alocacao.UsuarioCPF` | string | ✅ Yes | CPF do professor | 11 dígitos |
| `alocacao.AlocacaoStatus` | string | ❌ No | Status inicial | "Ativa" ou "Inativa" (padrão: "Ativa") |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Alocação criada com sucesso",
  "data": {
    "MatProfTurGUID": "990e8400-e29b-41d4-a716-446655440001",
    "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
    "UsuarioCPF": "12345678901",
    "AlocacaoStatus": "Ativa",
    "MatProfTurCreatedAt": "2026-05-12T10:00:00.000Z",
    "MatProfTurUpdatedAt": "2026-05-12T10:00:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - Matéria e Turma de escolas diferentes
```json
{
  "success": false,
  "message": "Matéria e turma de escolas diferentes",
  "details": {
    "message": "A matéria e a turma devem pertencer à mesma escola",
    "materiaEscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "turmaEscolaGUID": "999e8400-e29b-41d4-a716-446655440000"
  }
}
```

**400 Bad Request** - Usuário não é professor ativo
```json
{
  "success": false,
  "message": "Usuário não é professor ativo nesta escola",
  "details": {
    "message": "O usuário não está cadastrado como professor ativo (FuncaoId=3, Status='Ativo') nesta escola"
  }
}
```

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão",
  "details": {
    "message": "Você não tem permissão para realizar esta operação. Apenas Coordenação e Direção podem gerenciar alocações."
  }
}
```

**404 Not Found** - Turma não encontrada
```json
{
  "success": false,
  "message": "Turma não encontrada"
}
```

**404 Not Found** - Matéria não encontrada
```json
{
  "success": false,
  "message": "Matéria não encontrada"
}
```

**409 Conflict** - Alocação duplicada
```json
{
  "success": false,
  "message": "Já existe alocação para este professor, matéria e turma",
  "details": {
    "materiaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "turmaGUID": "880e8400-e29b-41d4-a716-446655440001",
    "usuarioCPF": "12345678901"
  }
}
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/professor/alocacao \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "alocacao": {
      "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
      "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
      "UsuarioCPF": "12345678901"
    }
  }'
```

---

### List Alocações

Lista alocações com filtros opcionais.

**Endpoint:** `GET /api/professor/alocacao`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MateriaGUID` | string | ❌ No | Filtrar por matéria (UUID) |
| `TurmaGUID` | string | ❌ No | Filtrar por turma (UUID) |
| `UsuarioCPF` | string | ❌ No | Filtrar por professor (CPF) |
| `AlocacaoStatus` | string | ❌ No | Filtrar por status |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "MatProfTurGUID": "990e8400-e29b-41d4-a716-446655440001",
      "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
      "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
      "UsuarioCPF": "12345678901",
      "AlocacaoStatus": "Ativa",
      "MatProfTurCreatedAt": "2026-05-12T10:00:00.000Z",
      "MatProfTurUpdatedAt": "2026-05-12T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

**cURL Examples:**
```bash
# Listar alocações de uma turma
curl -X GET "https://api.example.com/api/professor/alocacao?TurmaGUID=880e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Listar alocações de um professor
curl -X GET "https://api.example.com/api/professor/alocacao?UsuarioCPF=12345678901" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Listar alocações de uma matéria específica
curl -X GET "https://api.example.com/api/professor/alocacao?MateriaGUID=660e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Get Alocação by ID

Busca uma alocação específica pelo UUID.

**Endpoint:** `GET /api/professor/alocacao/:guid`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | UUID da alocação |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "MatProfTurGUID": "990e8400-e29b-41d4-a716-446655440001",
    "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
    "UsuarioCPF": "12345678901",
    "AlocacaoStatus": "Ativa",
    "MatProfTurCreatedAt": "2026-05-12T10:00:00.000Z",
    "MatProfTurUpdatedAt": "2026-05-12T10:00:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - UUID inválido
```json
{
  "success": false,
  "message": "MatProfTurGUID deve ser um UUID válido"
}
```

**404 Not Found** - Alocação não encontrada
```json
{
  "success": false,
  "message": "Alocação não encontrada"
}
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/professor/alocacao/990e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Update Alocação

Atualiza o status de uma alocação existente.

**Endpoint:** `PUT /api/professor/alocacao/:guid`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | UUID da alocação |

**Request Body:**
```json
{
  "alocacao": {
    "AlocacaoStatus": "Inativa"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `alocacao` | object | ✅ Yes | Objeto com campo a atualizar | Obrigatório |
| `alocacao.AlocacaoStatus` | string | ✅ Yes | Novo status | "Ativa" ou "Inativa" |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Alocação atualizada com sucesso",
  "data": {
    "MatProfTurGUID": "990e8400-e29b-41d4-a716-446655440001",
    "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
    "UsuarioCPF": "12345678901",
    "AlocacaoStatus": "Inativa",
    "MatProfTurCreatedAt": "2026-05-12T10:00:00.000Z",
    "MatProfTurUpdatedAt": "2026-05-12T16:30:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - Status inválido
```json
{
  "success": false,
  "message": "AlocacaoStatus deve ser 'Ativa' ou 'Inativa'"
}
```

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão"
}
```

**404 Not Found** - Alocação não encontrada
```json
{
  "success": false,
  "message": "Alocação não encontrada"
}
```

**cURL Example:**
```bash
curl -X PUT https://api.example.com/api/professor/alocacao/990e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "alocacao": {
      "AlocacaoStatus": "Inativa"
    }
  }'
```

---

### Delete Alocação

Inativa uma alocação (soft delete).

**Endpoint:** `DELETE /api/professor/alocacao/:guid`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | UUID da alocação |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Alocação excluída com sucesso"
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

**404 Not Found** - Alocação não encontrada
```json
{
  "success": false,
  "message": "Alocação não encontrada"
}
```

**cURL Example:**
```bash
curl -X DELETE https://api.example.com/api/professor/alocacao/990e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Data Models

### Professor (Usuario)

**Nota:** Professor NÃO é entidade separada, é um Usuario com FuncaoId=3.

```typescript
// Professor é consultado via escolaxusuarioxfuncao
interface EscolaxUsuarioxFuncao {
  TriplaGUID: string;
  EscolaGUID: string;
  UsuarioCPF: string;
  FuncaoId: number;          // 3 = Professor
  Status: 'Ativo' | 'Inativo';
}

// Dados do professor vêm da tabela usuario
interface Usuario {
  UsuarioCPF: string;        // 11 dígitos
  UsuarioNome: string;
  UsuarioEmail: string;
  UsuarioTelefone: string;
  UsuarioDataNascimento: Date;
  UsuarioCreatedAt: Date;
  UsuarioUpdatedAt: Date;
}
```

### MaterialProfessorTurma (Alocação)

```typescript
interface MaterialProfessorTurma {
  MatProfTurGUID: string;        // UUID v4
  MateriaGUID: string;           // FK para materia
  TurmaGUID: string;             // FK para turma
  UsuarioCPF: string;            // FK para usuario (professor)
  AlocacaoStatus: 'Ativa' | 'Inativa';
  MatProfTurCreatedAt: Date;
  MatProfTurUpdatedAt: Date;
}
```

### Database Schema

```sql
-- Professor é definido em escolaxusuarioxfuncao
-- Não há tabela "professor" separada

-- Tabela de alocações
CREATE TABLE materiaxprofessorxturma (
  MatProfTurGUID CHAR(36) PRIMARY KEY,
  MateriaGUID CHAR(36) NOT NULL,
  TurmaGUID CHAR(36) NOT NULL,
  UsuarioCPF CHAR(11) NOT NULL,
  AlocacaoStatus ENUM('Ativa', 'Inativa') NOT NULL DEFAULT 'Ativa',
  MatProfTurCreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  MatProfTurUpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (MateriaGUID) REFERENCES materia(MateriaGUID),
  FOREIGN KEY (TurmaGUID) REFERENCES turma(TurmaGUID),
  FOREIGN KEY (UsuarioCPF) REFERENCES usuario(UsuarioCPF),
  UNIQUE KEY unique_materia_turma_professor (MateriaGUID, TurmaGUID, UsuarioCPF)
);
```

---

## Business Rules

### 1. Professor = Usuario com FuncaoId=3
- **CRÍTICO:** Professor não é entidade separada
- Professor é identificado via `escolaxusuarioxfuncao` com `FuncaoId=3` e `Status='Ativo'`
- Query para listar professores:
```sql
SELECT DISTINCT u.* FROM usuario u
JOIN escolaxusuarioxfuncao euf ON u.UsuarioCPF = euf.UsuarioCPF
WHERE euf.EscolaGUID = ? AND euf.FuncaoId = 3 AND euf.Status = 'Ativo'
```

### 2. Matéria e Turma Mesma Escola
- `materia.EscolaGUID` deve ser igual a `turma.EscolaGUID`
- Validação impede alocação cruzada entre escolas
- Mensagem de erro: "Matéria e turma de escolas diferentes"

### 3. Professor Deve Ser Ativo na Escola
- Usuário deve ter registro em `escolaxusuarioxfuncao` com:
  - `FuncaoId = 3` (Professor)
  - `Status = 'Ativo'`
  - `EscolaGUID` igual ao da matéria/turma
- Validação via `escolaxusuarioxfuncao.findByTripla(cpf, escolaGUID, 3)`

### 4. Alocação Única (UNIQUE Constraint)
- **CRÍTICO:** Combinação única: `MateriaGUID + TurmaGUID + UsuarioCPF`
- Impede duplicação: mesmo professor não pode lecionar mesma matéria na mesma turma duas vezes
- Mensagem de erro: "Já existe alocação para este professor, matéria e turma"

### 5. Validação Sequencial (6 passos)
Ao criar alocação, service valida:
1. Turma existe
2. Usuário tem permissão (Coordenação/Direção)
3. Matéria existe
4. Matéria e Turma mesma escola
5. Usuario é professor ativo na escola
6. Não há duplicação (UNIQUE constraint)

### 6. Permissões de Escrita
- **Coordenação** (FuncaoId=1) com Status='Ativo'
- **Direção** (FuncaoId=6) com Status='Ativo'
- Validação via `escolaxusuarioxfuncao.findByTripla(cpf, escolaGUID, funcaoId)`

### 7. Soft Delete
- DELETE muda `AlocacaoStatus` para 'Inativa'
- Preserva histórico de alocações

### 8. Update Limitado
- PUT `/alocacao/:guid` só permite alterar `AlocacaoStatus`
- Não permite alterar MateriaGUID, TurmaGUID ou UsuarioCPF (delete e crie novo)

---

## Error Codes

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | BAD_REQUEST | EscolaGUID deve ser um UUID válido | Formato UUID incorreto |
| 400 | BAD_REQUEST | UsuarioCPF deve conter exatamente 11 dígitos | CPF inválido |
| 400 | BAD_REQUEST | Matéria e turma de escolas diferentes | Escola da matéria ≠ escola da turma |
| 400 | BAD_REQUEST | Usuário não é professor ativo nesta escola | CPF não é professor (FuncaoId≠3 ou Status≠'Ativo') |
| 403 | FORBIDDEN | Sem permissão | Usuário não é Coordenação/Direção |
| 404 | NOT_FOUND | Turma não encontrada | TurmaGUID inexistente |
| 404 | NOT_FOUND | Matéria não encontrada | MateriaGUID inexistente |
| 404 | NOT_FOUND | Alocação não encontrada | MatProfTurGUID inexistente |
| 409 | CONFLICT | Já existe alocação para este professor, matéria e turma | UNIQUE constraint violado |
| 500 | INTERNAL_ERROR | Erro interno ao criar alocação | Erro no banco/servidor |

---

## Examples

### Cenário 1: Listar Professores de uma Escola (✅ Sucesso)
```bash
GET /api/professor?EscolaGUID=550e8400-e29b-41d4-a716-446655440000

Response 200:
{
  "success": true,
  "data": [
    {
      "UsuarioCPF": "12345678901",
      "UsuarioNome": "João Silva",
      "UsuarioEmail": "joao.silva@escola.com"
    },
    {
      "UsuarioCPF": "98765432100",
      "UsuarioNome": "Maria Santos",
      "UsuarioEmail": "maria.santos@escola.com"
    }
  ],
  "total": 2
}
```

### Cenário 2: Criar Alocação (Professor leciona Matéria em Turma) (✅ Sucesso)
```bash
POST /api/professor/alocacao
{
  "alocacao": {
    "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
    "UsuarioCPF": "12345678901"
  }
}

Response 201:
{
  "success": true,
  "message": "Alocação criada com sucesso",
  "data": {
    "MatProfTurGUID": "990e8400-e29b-41d4-a716-446655440001",
    "AlocacaoStatus": "Ativa"
  }
}
```

### Cenário 3: Tentar Criar Alocação Duplicada (❌ Erro)
```bash
POST /api/professor/alocacao
{
  "alocacao": {
    "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
    "UsuarioCPF": "12345678901"  // Mesma combinação
  }
}

Response 409:
{
  "success": false,
  "message": "Já existe alocação para este professor, matéria e turma"
}
```

### Cenário 4: Buscar Alocações de um Professor
```bash
GET /api/professor/12345678901/escolas/550e8400-e29b-41d4-a716-446655440000/alocacoes

Response 200:
{
  "success": true,
  "data": [
    {
      "MatProfTurGUID": "990e8400-e29b-41d4-a716-446655440001",
      "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
      "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001"
    }
  ]
}
```

### Cenário 5: Inativar Alocação (Fim do Semestre)
```bash
PUT /api/professor/alocacao/990e8400-e29b-41d4-a716-446655440001
{
  "alocacao": {
    "AlocacaoStatus": "Inativa"
  }
}

Response 200:
{
  "success": true,
  "message": "Alocação atualizada com sucesso",
  "data": {
    "MatProfTurGUID": "990e8400-e29b-41d4-a716-446655440001",
    "AlocacaoStatus": "Inativa"
  }
}
```

---

## Integration with Other Entities

### Professor → Alocação (1:N)
```typescript
// Um professor pode ter várias alocações
// João Silva leciona:
// - Matemática na Turma 1A
// - Matemática na Turma 2B
// - Física na Turma 3C
```

### Alocação → Matéria (N:1)
```typescript
// Uma alocação pertence a uma matéria
interface MaterialProfessorTurma {
  MateriaGUID: string;  // FK para materia
}
```

### Alocação → Turma (N:1)
```typescript
// Uma alocação pertence a uma turma
interface MaterialProfessorTurma {
  TurmaGUID: string;  // FK para turma
}
```

---

## Notes

- Todas as datas são retornadas em formato ISO 8601
- UUIDs são gerados automaticamente no backend (uuid v4)
- **Decisão de Design:** Professor não é entidade separada para evitar redundância (já é Usuario)
- Junction table permite flexibilidade: 1 professor → N matérias, 1 matéria → N professores
- UNIQUE constraint garante integridade (sem duplicação)
- Soft delete preserva histórico de alocações anteriores
- Query JOIN necessária para listar professores (usuario + escolaxusuarioxfuncao)
- **Importante:** Matéria e Turma devem ser da mesma escola
