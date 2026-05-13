# API Documentation - Matrícula

**Version:** 1.0.0  
**Base URL:** `/api/matricula`  
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Create Matrícula](#create-matrícula)
  - [Transfer Aluno](#transfer-aluno)
  - [List Matrículas](#list-matrículas)
  - [Get Matrícula by ID](#get-matrícula-by-id)
  - [Update Matrícula](#update-matrícula)
  - [Delete Matrícula](#delete-matrícula)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)

---

## Overview

API para gerenciamento de matrículas de alunos em turmas.

**Conceito:**
- Matrícula = Vínculo entre Aluno (UsuarioCPF) e Turma (TurmaGUID)
- Um aluno pode ter apenas **1 matrícula ativa** por vez
- RA (Registro Acadêmico) pode ser customizado (1-36 caracteres) ou gerado automaticamente (UUID)
- Sistema de transferência transacional para mover aluno entre turmas

**Permissões:**
- **Coordenação** (FuncaoId=1) ou **Direção** (FuncaoId=6) podem criar/editar/excluir
- **Secretaria** (FuncaoId=2) pode criar/editar/excluir
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

### Create Matrícula

Cria uma nova matrícula de aluno em uma turma.

**Endpoint:** `POST /api/matricula`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "matricula": {
    "MatriculaGUID": "2024001234",
    "UsuarioCPF": "12345678901",
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
    "MatriculaStatus": "Ativa"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `matricula` | object | ✅ Yes | Objeto contendo dados da matrícula | Obrigatório |
| `matricula.MatriculaGUID` | string | ❌ No | RA customizado | 1-36 caracteres (gera UUID se omitido) |
| `matricula.UsuarioCPF` | string | ✅ Yes | CPF do aluno | 11 dígitos |
| `matricula.TurmaGUID` | string | ✅ Yes | UUID da turma | UUID v4 válido |
| `matricula.MatriculaStatus` | string | ❌ No | Status inicial | "Ativa", "Transferida", "Concluida", "Cancelada" (padrão: "Ativa") |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Matrícula criada com sucesso",
  "data": {
    "MatriculaGUID": "2024001234",
    "UsuarioCPF": "12345678901",
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
    "MatriculaStatus": "Ativa",
    "MatriculaCreatedAt": "2026-05-12T10:30:00.000Z",
    "MatriculaUpdatedAt": "2026-05-12T10:30:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - Aluno já tem matrícula ativa
```json
{
  "success": false,
  "message": "Aluno já possui matrícula ativa",
  "details": {
    "message": "O aluno já tem uma matrícula ativa. Conclua, cancele ou transfira a matrícula atual antes de criar uma nova.",
    "matriculaAtual": {
      "MatriculaGUID": "2024001233",
      "TurmaGUID": "880e8400-e29b-41d4-a716-446655440000",
      "MatriculaStatus": "Ativa"
    }
  }
}
```

**400 Bad Request** - Usuário não é aluno
```json
{
  "success": false,
  "message": "Usuário não é aluno nesta escola",
  "details": {
    "message": "O usuário não está cadastrado como aluno (FuncaoId=5) nesta escola"
  }
}
```

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão",
  "details": {
    "message": "Você não tem permissão para realizar esta operação."
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

**404 Not Found** - Usuário não encontrado
```json
{
  "success": false,
  "message": "Usuário não encontrado"
}
```

**409 Conflict** - RA duplicado
```json
{
  "success": false,
  "message": "Já existe uma matrícula com este RA",
  "details": {
    "matriculaGUID": "2024001234"
  }
}
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/matricula \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "matricula": {
      "MatriculaGUID": "2024001234",
      "UsuarioCPF": "12345678901",
      "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001"
    }
  }'
```

---

### Transfer Aluno

Transfere um aluno de uma turma para outra usando transação atômica.

**Endpoint:** `POST /api/matricula/transferir`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "transferencia": {
    "MatriculaGUIDOrigem": "2024001234",
    "TurmaGUIDDestino": "880e8400-e29b-41d4-a716-446655440002",
    "NovoMatriculaGUID": "2024001235"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `transferencia` | object | ✅ Yes | Objeto contendo dados da transferência | Obrigatório |
| `transferencia.MatriculaGUIDOrigem` | string | ✅ Yes | RA da matrícula atual | 1-36 caracteres |
| `transferencia.TurmaGUIDDestino` | string | ✅ Yes | UUID da turma destino | UUID v4 válido |
| `transferencia.NovoMatriculaGUID` | string | ❌ No | Novo RA (opcional) | 1-36 caracteres (gera UUID se omitido) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Transferência realizada com sucesso",
  "data": {
    "matriculaAntiga": {
      "MatriculaGUID": "2024001234",
      "MatriculaStatus": "Transferida"
    },
    "novaMatricula": {
      "MatriculaGUID": "2024001235",
      "UsuarioCPF": "12345678901",
      "TurmaGUID": "880e8400-e29b-41d4-a716-446655440002",
      "MatriculaStatus": "Ativa"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Matrícula não está ativa
```json
{
  "success": false,
  "message": "Matrícula de origem não está ativa",
  "details": {
    "message": "Apenas matrículas ativas podem ser transferidas",
    "statusAtual": "Concluida"
  }
}
```

**400 Bad Request** - Turma destino mesma que origem
```json
{
  "success": false,
  "message": "Turma destino é igual à turma de origem",
  "details": {
    "message": "Selecione uma turma diferente da atual"
  }
}
```

**404 Not Found** - Matrícula origem não encontrada
```json
{
  "success": false,
  "message": "Matrícula de origem não encontrada"
}
```

**404 Not Found** - Turma destino não encontrada
```json
{
  "success": false,
  "message": "Turma destino não encontrada"
}
```

**409 Conflict** - Novo RA duplicado
```json
{
  "success": false,
  "message": "Já existe uma matrícula com este RA",
  "details": {
    "matriculaGUID": "2024001235"
  }
}
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/matricula/transferir \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "transferencia": {
      "MatriculaGUIDOrigem": "2024001234",
      "TurmaGUIDDestino": "880e8400-e29b-41d4-a716-446655440002",
      "NovoMatriculaGUID": "2024001235"
    }
  }'
```

---

### List Matrículas

Lista matrículas com filtros opcionais.

**Endpoint:** `GET /api/matricula`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TurmaGUID` | string | ❌ No | Filtrar por turma (UUID) |
| `UsuarioCPF` | string | ❌ No | Filtrar por aluno (CPF) |
| `MatriculaStatus` | string | ❌ No | Filtrar por status |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "MatriculaGUID": "2024001234",
      "UsuarioCPF": "12345678901",
      "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
      "MatriculaStatus": "Ativa",
      "MatriculaCreatedAt": "2026-05-12T10:30:00.000Z",
      "MatriculaUpdatedAt": "2026-05-12T10:30:00.000Z"
    },
    {
      "MatriculaGUID": "2024001235",
      "UsuarioCPF": "98765432100",
      "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
      "MatriculaStatus": "Ativa",
      "MatriculaCreatedAt": "2026-05-12T11:00:00.000Z",
      "MatriculaUpdatedAt": "2026-05-12T11:00:00.000Z"
    }
  ],
  "total": 2
}
```

**cURL Examples:**
```bash
# Listar matrículas de uma turma
curl -X GET "https://api.example.com/api/matricula?TurmaGUID=880e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Listar matrículas de um aluno
curl -X GET "https://api.example.com/api/matricula?UsuarioCPF=12345678901" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Listar matrículas ativas
curl -X GET "https://api.example.com/api/matricula?MatriculaStatus=Ativa" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Get Matrícula by ID

Busca uma matrícula específica pelo RA.

**Endpoint:** `GET /api/matricula/:guid`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | RA da matrícula (1-36 caracteres) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "MatriculaGUID": "2024001234",
    "UsuarioCPF": "12345678901",
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
    "MatriculaStatus": "Ativa",
    "MatriculaCreatedAt": "2026-05-12T10:30:00.000Z",
    "MatriculaUpdatedAt": "2026-05-12T10:30:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - RA inválido
```json
{
  "success": false,
  "message": "MatriculaGUID deve ter entre 1 e 36 caracteres"
}
```

**404 Not Found** - Matrícula não encontrada
```json
{
  "success": false,
  "message": "Matrícula não encontrada"
}
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/matricula/2024001234 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Update Matrícula

Atualiza dados de uma matrícula existente.

**Endpoint:** `PUT /api/matricula/:guid`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | RA da matrícula |

**Request Body:**
```json
{
  "matricula": {
    "MatriculaStatus": "Concluida"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `matricula` | object | ✅ Yes | Objeto com campos a atualizar | Pelo menos 1 campo |
| `matricula.TurmaGUID` | string | ❌ No | Nova turma | UUID v4 válido |
| `matricula.MatriculaStatus` | string | ❌ No | Novo status | "Ativa", "Transferida", "Concluida", "Cancelada" |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Matrícula atualizada com sucesso",
  "data": {
    "MatriculaGUID": "2024001234",
    "UsuarioCPF": "12345678901",
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
    "MatriculaStatus": "Concluida",
    "MatriculaCreatedAt": "2026-05-12T10:30:00.000Z",
    "MatriculaUpdatedAt": "2026-05-12T18:00:00.000Z"
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

**404 Not Found** - Matrícula não encontrada
```json
{
  "success": false,
  "message": "Matrícula não encontrada"
}
```

**cURL Example:**
```bash
curl -X PUT https://api.example.com/api/matricula/2024001234 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "matricula": {
      "MatriculaStatus": "Concluida"
    }
  }'
```

---

### Delete Matrícula

Inativa uma matrícula (soft delete).

**Endpoint:** `DELETE /api/matricula/:guid`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | RA da matrícula |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Matrícula excluída com sucesso"
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

**404 Not Found** - Matrícula não encontrada
```json
{
  "success": false,
  "message": "Matrícula não encontrada"
}
```

**cURL Example:**
```bash
curl -X DELETE https://api.example.com/api/matricula/2024001234 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Data Models

### Matricula Entity

```typescript
interface Matricula {
  MatriculaGUID: string;         // RA (1-36 caracteres, pode ser customizado)
  UsuarioCPF: string;            // CPF do aluno (11 dígitos)
  TurmaGUID: string;             // FK para turma
  MatriculaStatus: 'Ativa' | 'Transferida' | 'Concluida' | 'Cancelada';
  MatriculaCreatedAt: Date;
  MatriculaUpdatedAt: Date;
}
```

### Database Schema

```sql
CREATE TABLE matricula (
  MatriculaGUID VARCHAR(36) PRIMARY KEY,
  UsuarioCPF CHAR(11) NOT NULL,
  TurmaGUID CHAR(36) NOT NULL,
  MatriculaStatus ENUM('Ativa', 'Transferida', 'Concluida', 'Cancelada') NOT NULL DEFAULT 'Ativa',
  MatriculaCreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  MatriculaUpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (UsuarioCPF) REFERENCES usuario(UsuarioCPF),
  FOREIGN KEY (TurmaGUID) REFERENCES turma(TurmaGUID)
);
```

---

## Business Rules

### 1. RA Customizável
- MatriculaGUID aceita qualquer string de 1-36 caracteres
- Permite RAs customizados: "2024001234", "RA-2024-001", etc.
- Se omitido, gera UUID v4 automaticamente
- Primary key, deve ser único

### 2. Um Aluno = Uma Matrícula Ativa
- **CRÍTICO:** Um aluno só pode ter **1 matrícula com status "Ativa"** por vez
- Validação: `SELECT COUNT(*) FROM matricula WHERE UsuarioCPF = ? AND MatriculaStatus = 'Ativa'`
- Mensagem de erro: "Aluno já possui matrícula ativa"
- Para matricular em nova turma: use `/transferir` ou conclua/cancele matrícula atual

### 3. Usuário Deve Ser Aluno
- UsuarioCPF deve ter FuncaoId=5 (Aluno) na escola da turma
- Validação via escolaxusuarioxfuncao
- Mensagem de erro: "Usuário não é aluno nesta escola"

### 4. Turma Deve Existir e Estar Ativa
- TurmaGUID deve existir
- Recomendado verificar `TurmaStatus = 'Ativa'` (não obrigatório)

### 5. Transferência Transacional
- Endpoint `/transferir` usa **BEGIN TRANSACTION**
- Passos atômicos:
  1. UPDATE matricula antiga: `MatriculaStatus = 'Transferida'`
  2. INSERT nova matricula: `MatriculaStatus = 'Ativa'`
  3. Se erro → ROLLBACK, senão → COMMIT
- Garante consistência: ou ambas operações ocorrem, ou nenhuma

### 6. Permissões de Escrita
- **Coordenação** (FuncaoId=1) com Status='Ativo'
- **Direção** (FuncaoId=6) com Status='Ativo'
- **Secretaria** (FuncaoId=2) com Status='Ativo'

### 7. Status "Transferida"
- Matrícula antiga automaticamente marcada como "Transferida" ao usar `/transferir`
- Não deve ser alterado manualmente (use endpoint de transferência)

### 8. Soft Delete
- DELETE muda `MatriculaStatus` para 'Cancelada'
- Preserva histórico acadêmico

---

## Error Codes

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | BAD_REQUEST | MatriculaGUID deve ter entre 1 e 36 caracteres | RA muito longo |
| 400 | BAD_REQUEST | Aluno já possui matrícula ativa | Violação regra 1 matrícula ativa |
| 400 | BAD_REQUEST | Usuário não é aluno nesta escola | CPF não é aluno (FuncaoId≠5) |
| 400 | BAD_REQUEST | Matrícula de origem não está ativa | Tentou transferir matrícula não-ativa |
| 400 | BAD_REQUEST | Turma destino é igual à turma de origem | Transferência para mesma turma |
| 403 | FORBIDDEN | Sem permissão | Usuário não é Coordenação/Direção/Secretaria |
| 404 | NOT_FOUND | Turma não encontrada | TurmaGUID inexistente |
| 404 | NOT_FOUND | Usuário não encontrado | UsuarioCPF inexistente |
| 404 | NOT_FOUND | Matrícula não encontrada | MatriculaGUID inexistente |
| 409 | CONFLICT | Já existe uma matrícula com este RA | RA duplicado |
| 500 | INTERNAL_ERROR | Erro na transação de transferência | Erro no banco durante TRANSACTION |

---

## Examples

### Cenário 1: Criar Matrícula com RA Customizado (✅ Sucesso)
```bash
POST /api/matricula
{
  "matricula": {
    "MatriculaGUID": "2024001234",
    "UsuarioCPF": "12345678901",
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001"
  }
}

Response 201:
{
  "success": true,
  "message": "Matrícula criada com sucesso",
  "data": {
    "MatriculaGUID": "2024001234",
    "MatriculaStatus": "Ativa"
  }
}
```

### Cenário 2: Criar Matrícula com RA Automático (✅ Sucesso)
```bash
POST /api/matricula
{
  "matricula": {
    "UsuarioCPF": "12345678901",
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001"
  }
}

Response 201:
{
  "success": true,
  "data": {
    "MatriculaGUID": "550e8400-e29b-41d4-a716-446655440123",  // UUID gerado
    "MatriculaStatus": "Ativa"
  }
}
```

### Cenário 3: Tentar Matricular Aluno que já tem Matrícula Ativa (❌ Erro)
```bash
POST /api/matricula
{
  "matricula": {
    "UsuarioCPF": "12345678901",
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440002"
  }
}

Response 400:
{
  "success": false,
  "message": "Aluno já possui matrícula ativa",
  "details": {
    "matriculaAtual": {
      "MatriculaGUID": "2024001234",
      "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001"
    }
  }
}
```

### Cenário 4: Transferir Aluno Entre Turmas (✅ Sucesso)
```bash
POST /api/matricula/transferir
{
  "transferencia": {
    "MatriculaGUIDOrigem": "2024001234",
    "TurmaGUIDDestino": "880e8400-e29b-41d4-a716-446655440002",
    "NovoMatriculaGUID": "2024001235"
  }
}

Response 200:
{
  "success": true,
  "message": "Transferência realizada com sucesso",
  "data": {
    "matriculaAntiga": {
      "MatriculaGUID": "2024001234",
      "MatriculaStatus": "Transferida"
    },
    "novaMatricula": {
      "MatriculaGUID": "2024001235",
      "TurmaGUID": "880e8400-e29b-41d4-a716-446655440002",
      "MatriculaStatus": "Ativa"
    }
  }
}
```

### Cenário 5: Concluir Matrícula (Fim do Ano Letivo)
```bash
PUT /api/matricula/2024001234
{
  "matricula": {
    "MatriculaStatus": "Concluida"
  }
}

Response 200:
{
  "success": true,
  "message": "Matrícula atualizada com sucesso",
  "data": {
    "MatriculaGUID": "2024001234",
    "MatriculaStatus": "Concluida"
  }
}
```

---

## Transaction Flow (Transferir Endpoint)

```sql
-- Fluxo interno do endpoint POST /api/matricula/transferir

BEGIN TRANSACTION;

-- Passo 1: Atualizar matrícula antiga
UPDATE matricula 
SET MatriculaStatus = 'Transferida', MatriculaUpdatedAt = NOW()
WHERE MatriculaGUID = '2024001234';

-- Passo 2: Criar nova matrícula
INSERT INTO matricula (MatriculaGUID, UsuarioCPF, TurmaGUID, MatriculaStatus)
VALUES ('2024001235', '12345678901', '880e8400-...', 'Ativa');

-- Se ambos OK → COMMIT, se erro → ROLLBACK
COMMIT;
```

---

## Route Order Important

⚠️ **ATENÇÃO:** A ordem das rotas é crítica:

```typescript
// ✅ CORRETO
router.post("/transferir", ...)      // Rota específica ANTES
router.post("/:guid", ...)           // Rota com parâmetro DEPOIS

// ❌ ERRADO
router.post("/:guid", ...)           // Express interpreta "transferir" como :guid
router.post("/transferir", ...)      // Esta rota nunca é alcançada
```

---

## Notes

- Todas as datas são retornadas em formato ISO 8601
- MatriculaGUID flexível: aceita UUIDs, RAs numéricos, strings customizadas
- **Regra de Negócio Crítica:** 1 aluno = 1 matrícula ativa (garante integridade)
- Use `/transferir` para mover alunos (garante atomicidade)
- Status "Transferida" é automático (não altere manualmente)
- Soft delete usa status "Cancelada"
- Secretaria tem permissão de escrita (diferente de outros módulos)
