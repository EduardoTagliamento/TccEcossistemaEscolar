# API Documentation - Turma

**Version:** 1.0.0  
**Base URL:** `/api/turma`  
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Create Turma](#create-turma)
  - [List Turmas](#list-turmas)
  - [Get Turma by ID](#get-turma-by-id)
  - [Update Turma](#update-turma)
  - [Delete Turma](#delete-turma)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)

---

## Overview

API para gerenciamento de turmas/classes do sistema educacional.

**Conceito:**
- Turma = Classe/Sala de aula (ex: 1º Ano A, 2º Período B, Técnico Info 3A)
- Vinculada a uma escola específica
- Pode ser técnica (com curso) ou comum (sem curso)
- Identificador único composto: EscolaGUID + TurmaSerie + TurmaNome

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

### Create Turma

Cria uma nova turma no sistema.

**Endpoint:** `POST /api/turma`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "turma": {
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "TurmaSerie": "1º Ano",
    "TurmaNome": "A",
    "TurmaIsTecnico": true,
    "CursoGUID": "770e8400-e29b-41d4-a716-446655440001",
    "TurmaStatus": "Ativa"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `turma` | object | ✅ Yes | Objeto contendo dados da turma | Obrigatório |
| `turma.EscolaGUID` | string | ✅ Yes | UUID da escola | UUID v4 válido |
| `turma.TurmaSerie` | string | ✅ Yes | Série/período | 1-20 caracteres |
| `turma.TurmaNome` | string | ✅ Yes | Nome/identificador | 1-50 caracteres |
| `turma.TurmaIsTecnico` | boolean | ✅ Yes | É turma técnica? | true/false |
| `turma.CursoGUID` | string/null | ❌ No* | UUID do curso | *Obrigatório se TurmaIsTecnico=true |
| `turma.TurmaStatus` | string | ❌ No | Status inicial | "Ativa", "Inativa" ou "Encerrada" (padrão: "Ativa") |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Turma criada com sucesso",
  "data": {
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "TurmaSerie": "1º Ano",
    "TurmaNome": "A",
    "TurmaIsTecnico": true,
    "CursoGUID": "770e8400-e29b-41d4-a716-446655440001",
    "TurmaStatus": "Ativa",
    "TurmaCreatedAt": "2026-05-12T10:30:00.000Z",
    "TurmaUpdatedAt": "2026-05-12T10:30:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - Dados inválidos
```json
{
  "success": false,
  "message": "TurmaSerie deve ter entre 1 e 20 caracteres"
}
```

**400 Bad Request** - Turma técnica requer curso
```json
{
  "success": false,
  "message": "Turma técnica requer curso",
  "details": {
    "message": "Turmas técnicas (TurmaIsTecnico=true) devem ter um CursoGUID vinculado"
  }
}
```

**400 Bad Request** - Turma técnica requer escola técnica
```json
{
  "success": false,
  "message": "Turma técnica requer escola técnica",
  "details": {
    "message": "Esta escola não permite criação de turmas técnicas. Configure EscolaIsTecnica=true primeiro."
  }
}
```

**400 Bad Request** - Curso de escola diferente
```json
{
  "success": false,
  "message": "Curso de escola diferente",
  "details": {
    "message": "O curso informado não pertence a esta escola",
    "escolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "cursoEscolaGUID": "999e8400-e29b-41d4-a716-446655440000"
  }
}
```

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão",
  "details": {
    "message": "Você não tem permissão para realizar esta operação. Apenas Coordenação e Direção podem gerenciar turmas."
  }
}
```

**404 Not Found** - Escola não encontrada
```json
{
  "success": false,
  "message": "Escola não encontrada"
}
```

**404 Not Found** - Curso não encontrado
```json
{
  "success": false,
  "message": "Curso não encontrado"
}
```

**409 Conflict** - Identificador único duplicado
```json
{
  "success": false,
  "message": "Já existe uma turma com esta série e nome nesta escola",
  "details": {
    "escolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "turmaSerie": "1º Ano",
    "turmaNome": "A"
  }
}
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/turma \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "turma": {
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "TurmaSerie": "1º Ano",
      "TurmaNome": "A",
      "TurmaIsTecnico": true,
      "CursoGUID": "770e8400-e29b-41d4-a716-446655440001"
    }
  }'
```

---

### List Turmas

Lista turmas com filtros opcionais.

**Endpoint:** `GET /api/turma`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EscolaGUID` | string | ❌ No | Filtrar por escola (UUID) |
| `CursoGUID` | string | ❌ No | Filtrar por curso (UUID) |
| `TurmaIsTecnico` | boolean | ❌ No | Filtrar por tipo (técnica ou não) |
| `TurmaStatus` | string | ❌ No | Filtrar por status ("Ativa", "Inativa", "Encerrada") |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "TurmaSerie": "1º Ano",
      "TurmaNome": "A",
      "TurmaIsTecnico": true,
      "CursoGUID": "770e8400-e29b-41d4-a716-446655440001",
      "TurmaStatus": "Ativa",
      "TurmaCreatedAt": "2026-05-12T10:30:00.000Z",
      "TurmaUpdatedAt": "2026-05-12T10:30:00.000Z"
    },
    {
      "TurmaGUID": "880e8400-e29b-41d4-a716-446655440002",
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "TurmaSerie": "2º Ano",
      "TurmaNome": "B",
      "TurmaIsTecnico": false,
      "CursoGUID": null,
      "TurmaStatus": "Ativa",
      "TurmaCreatedAt": "2026-05-12T11:00:00.000Z",
      "TurmaUpdatedAt": "2026-05-12T11:00:00.000Z"
    }
  ],
  "total": 2
}
```

**cURL Examples:**
```bash
# Listar todas as turmas de uma escola
curl -X GET "https://api.example.com/api/turma?EscolaGUID=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Listar turmas técnicas de um curso específico
curl -X GET "https://api.example.com/api/turma?CursoGUID=770e8400-e29b-41d4-a716-446655440001&TurmaIsTecnico=true" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Listar turmas ativas não-técnicas
curl -X GET "https://api.example.com/api/turma?TurmaIsTecnico=false&TurmaStatus=Ativa" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Get Turma by ID

Busca uma turma específica pelo UUID.

**Endpoint:** `GET /api/turma/:guid`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | UUID da turma |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "TurmaSerie": "1º Ano",
    "TurmaNome": "A",
    "TurmaIsTecnico": true,
    "CursoGUID": "770e8400-e29b-41d4-a716-446655440001",
    "TurmaStatus": "Ativa",
    "TurmaCreatedAt": "2026-05-12T10:30:00.000Z",
    "TurmaUpdatedAt": "2026-05-12T10:30:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - UUID inválido
```json
{
  "success": false,
  "message": "TurmaGUID deve ser um UUID válido"
}
```

**404 Not Found** - Turma não encontrada
```json
{
  "success": false,
  "message": "Turma não encontrada"
}
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/turma/880e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Update Turma

Atualiza dados de uma turma existente.

**Endpoint:** `PUT /api/turma/:guid`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | UUID da turma |

**Request Body:**
```json
{
  "turma": {
    "TurmaSerie": "2º Ano",
    "TurmaNome": "A",
    "TurmaStatus": "Encerrada"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `turma` | object | ✅ Yes | Objeto com campos a atualizar | Pelo menos 1 campo |
| `turma.TurmaSerie` | string | ❌ No | Nova série | 1-20 caracteres |
| `turma.TurmaNome` | string | ❌ No | Novo nome | 1-50 caracteres |
| `turma.TurmaIsTecnico` | boolean | ❌ No | Novo tipo | true/false |
| `turma.CursoGUID` | string/null | ❌ No | Novo curso | UUID ou null |
| `turma.TurmaStatus` | string | ❌ No | Novo status | "Ativa", "Inativa" ou "Encerrada" |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Turma atualizada com sucesso",
  "data": {
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "TurmaSerie": "2º Ano",
    "TurmaNome": "A",
    "TurmaIsTecnico": true,
    "CursoGUID": "770e8400-e29b-41d4-a716-446655440001",
    "TurmaStatus": "Encerrada",
    "TurmaCreatedAt": "2026-05-12T10:30:00.000Z",
    "TurmaUpdatedAt": "2026-05-12T16:45:00.000Z"
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

**404 Not Found** - Turma não encontrada
```json
{
  "success": false,
  "message": "Turma não encontrada"
}
```

**cURL Example:**
```bash
curl -X PUT https://api.example.com/api/turma/880e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "turma": {
      "TurmaStatus": "Encerrada"
    }
  }'
```

---

### Delete Turma

Inativa uma turma (soft delete).

**Endpoint:** `DELETE /api/turma/:guid`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | UUID da turma |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Turma excluída com sucesso"
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

**404 Not Found** - Turma não encontrada
```json
{
  "success": false,
  "message": "Turma não encontrada"
}
```

**cURL Example:**
```bash
curl -X DELETE https://api.example.com/api/turma/880e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Data Models

### Turma Entity

```typescript
interface Turma {
  TurmaGUID: string;             // UUID v4
  EscolaGUID: string;            // FK para escola
  TurmaSerie: string;            // 1-20 caracteres (ex: "1º Ano", "Ensino Médio")
  TurmaNome: string;             // 1-50 caracteres (ex: "A", "Matutino", "TEC-01")
  TurmaIsTecnico: boolean;       // true = técnica, false = comum
  CursoGUID: string | null;      // FK para curso (obrigatório se TurmaIsTecnico=true)
  TurmaStatus: 'Ativa' | 'Inativa' | 'Encerrada';
  TurmaCreatedAt: Date;
  TurmaUpdatedAt: Date;
}
```

### Database Schema

```sql
CREATE TABLE turma (
  TurmaGUID CHAR(36) PRIMARY KEY,
  EscolaGUID CHAR(36) NOT NULL,
  TurmaSerie VARCHAR(20) NOT NULL,
  TurmaNome VARCHAR(50) NOT NULL,
  TurmaIsTecnico TINYINT(1) NOT NULL DEFAULT 0,
  CursoGUID CHAR(36) NULL,
  TurmaStatus ENUM('Ativa', 'Inativa', 'Encerrada') NOT NULL DEFAULT 'Ativa',
  TurmaCreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  TurmaUpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID),
  FOREIGN KEY (CursoGUID) REFERENCES curso(CursoGUID),
  UNIQUE KEY unique_escola_serie_nome (EscolaGUID, TurmaSerie, TurmaNome)
);
```

---

## Business Rules

### 1. Identificador Único Composto
- Combinação única: `EscolaGUID + TurmaSerie + TurmaNome`
- Exemplos válidos na mesma escola:
  - ✅ "1º Ano" + "A"
  - ✅ "1º Ano" + "B"
  - ✅ "2º Ano" + "A"
- Exemplos inválidos (duplicidade):
  - ❌ "1º Ano" + "A" (se já existe)

### 2. Turmas Técnicas Requerem Escola Técnica
- Se `TurmaIsTecnico = true`, a escola deve ter `EscolaIsTecnica = true`
- Validação ocorre no service layer
- Mensagem de erro: "Turma técnica requer escola técnica"

### 3. Turmas Técnicas Requerem Curso
- Se `TurmaIsTecnico = true` → `CursoGUID` é **obrigatório**
- Se `TurmaIsTecnico = false` → `CursoGUID` deve ser **null**
- Service força `CursoGUID = null` automaticamente para turmas não-técnicas em escolas não-técnicas

### 4. Curso Deve Pertencer à Mesma Escola
- `curso.EscolaGUID` deve ser igual a `turma.EscolaGUID`
- Validação impede vínculo entre escola A e curso da escola B

### 5. Permissões de Escrita
- **Coordenação** (FuncaoId=1) com Status='Ativo'
- **Direção** (FuncaoId=6) com Status='Ativo'
- Validação via `escolaxusuarioxfuncao.findByTripla(cpf, escolaGUID, funcaoId)`

### 6. Soft Delete
- DELETE não remove do banco, apenas muda `TurmaStatus` para 'Inativa'
- Preserva histórico de matrículas

### 7. Status "Encerrada"
- Turmas podem ser marcadas como "Encerrada" ao fim do período letivo
- Diferença de "Inativa": Encerrada = completada, Inativa = desativada/cancelada

### 8. Conversão Automática (Escola Não-Técnica)
- Se escola não é técnica:
  - Service força `TurmaIsTecnico = false`
  - Service força `CursoGUID = null`
  - Impede criação de turmas técnicas

---

## Error Codes

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | BAD_REQUEST | TurmaSerie deve ter entre 1 e 20 caracteres | Campo muito curto/longo |
| 400 | BAD_REQUEST | TurmaNome deve ter entre 1 e 50 caracteres | Campo muito curto/longo |
| 400 | BAD_REQUEST | Turma técnica requer curso | TurmaIsTecnico=true sem CursoGUID |
| 400 | BAD_REQUEST | Turma técnica requer escola técnica | Escola não é técnica |
| 400 | BAD_REQUEST | Curso de escola diferente | Curso não pertence à escola da turma |
| 403 | FORBIDDEN | Sem permissão | Usuário não é Coordenação/Direção |
| 404 | NOT_FOUND | Escola não encontrada | EscolaGUID inexistente |
| 404 | NOT_FOUND | Curso não encontrado | CursoGUID inexistente |
| 404 | NOT_FOUND | Turma não encontrada | TurmaGUID inexistente |
| 409 | CONFLICT | Já existe uma turma com esta série e nome | Unique constraint violado |
| 500 | INTERNAL_ERROR | Erro interno ao criar turma | Erro no banco/servidor |

---

## Examples

### Cenário 1: Criar Turma Técnica (✅ Sucesso)
```bash
POST /api/turma
{
  "turma": {
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "TurmaSerie": "1º Módulo",
    "TurmaNome": "Informática A",
    "TurmaIsTecnico": true,
    "CursoGUID": "770e8400-e29b-41d4-a716-446655440001"
  }
}

Response 201:
{
  "success": true,
  "message": "Turma criada com sucesso",
  "data": { /* turma criada */ }
}
```

### Cenário 2: Criar Turma Comum (✅ Sucesso)
```bash
POST /api/turma
{
  "turma": {
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "TurmaSerie": "8º Ano",
    "TurmaNome": "B",
    "TurmaIsTecnico": false,
    "CursoGUID": null  // ou omitir
  }
}

Response 201:
{
  "success": true,
  "message": "Turma criada com sucesso",
  "data": {
    "TurmaGUID": "...",
    "TurmaIsTecnico": false,
    "CursoGUID": null
  }
}
```

### Cenário 3: Tentar Criar Turma Técnica sem Curso (❌ Erro)
```bash
POST /api/turma
{
  "turma": {
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "TurmaSerie": "1º Ano",
    "TurmaNome": "A",
    "TurmaIsTecnico": true,
    "CursoGUID": null  // ❌ Falta curso
  }
}

Response 400:
{
  "success": false,
  "message": "Turma técnica requer curso"
}
```

### Cenário 4: Listar Turmas Técnicas de um Curso
```bash
GET /api/turma?CursoGUID=770e8400-e29b-41d4-a716-446655440001&TurmaIsTecnico=true

Response 200:
{
  "success": true,
  "data": [
    {
      "TurmaGUID": "...",
      "TurmaSerie": "1º Módulo",
      "TurmaNome": "Informática A",
      "CursoGUID": "770e8400-e29b-41d4-a716-446655440001"
    }
  ],
  "total": 1
}
```

---

## Integration with Other Entities

### Turma → Matrícula (1:N)
```typescript
// Alunos são matriculados em turmas
interface Matricula {
  MatriculaGUID: string;
  UsuarioCPF: string;      // Aluno
  TurmaGUID: string;       // FK para turma
  MatriculaStatus: string;
}
```

### Turma → Professor (N:N via materiaxprofessorxturma)
```typescript
// Professores são alocados em matéria+turma
interface MaterialProfessorTurma {
  MatProfTurGUID: string;
  MateriaGUID: string;     // Matéria lecionada
  TurmaGUID: string;       // FK para turma
  UsuarioCPF: string;      // Professor
  AlocacaoStatus: string;
}
```

---

## Notes

- Todas as datas são retornadas em formato ISO 8601
- UUIDs são gerados automaticamente no backend (uuid v4)
- Boolean fields retornam como `true`/`false` (não 0/1)
- UNIQUE constraint impede duplicidade (escola + série + nome)
- Soft delete preserva histórico de matrículas e alocações de professores
- Status "Encerrada" permite marcar turmas do ano letivo anterior
- **Decisão de Design:** TurmaSerie separado de TurmaNome permite flexibilidade organizacional
