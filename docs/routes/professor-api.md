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
  - [Create Professores (Batch)](#create-professores-batch)
  - [Get Professor Alocações](#get-professor-alocações)
  - [Create Alocação](#create-alocação)
  - [List Alocações](#list-alocações)
  - [Get Alocação by ID](#get-alocação-by-id)
  - [Update Alocação](#update-alocação)
  - [Delete Alocação](#delete-alocação)
  - [Get Matérias do Professor Logado](#get-matérias-do-professor-logado)
  - [Get Turmas e Alunos da Alocação](#get-turmas-e-alunos-da-alocação)
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

### Create Professores (Batch)

Cria (ou vincula, se o CPF já existir como usuário) múltiplos professores de uma vez em uma escola: para CPFs novos, cria o `Usuario` com senha temporária gerada automaticamente e envia e-mail de boas-vindas; para CPFs já existentes, apenas cria o vínculo `FuncaoId=3` (Professor) na escola, se ainda não existir. **Este endpoint atualmente só aceita o formato em massa** — enviar um único professor via campo `professor` (singular) retorna 400.

**Endpoint:** `POST /api/professor`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "professores": [
    {
      "UsuarioCPF": "12345678901",
      "UsuarioNome": "João Silva",
      "UsuarioEmail": "joao.silva@escola.com",
      "UsuarioTelefone": "11987654321",
      "UsuarioDataNascimento": "1985-03-15"
    },
    {
      "UsuarioCPF": "98765432100",
      "UsuarioNome": "Maria Santos"
    }
  ],
  "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
  "EscolaNome": "Colégio Exemplo",
  "enviarEmails": true
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `professores` | array | ✅ Yes | Lista de professores a criar/vincular | Array (obrigatoriamente, senão retorna 400 pedindo uso de `POST /api/professor/alocacao`) |
| `professores[].UsuarioCPF` | string | ✅ Yes | CPF do professor | Obrigatório por item |
| `professores[].UsuarioNome` | string | ✅ Yes | Nome do professor | Obrigatório por item |
| `professores[].UsuarioEmail` | string | ❌ No | E-mail (usado para enviar credenciais, se `enviarEmails`) | — |
| `professores[].UsuarioTelefone` | string | ❌ No | Telefone | — |
| `professores[].UsuarioDataNascimento` | string | ❌ No | Data de nascimento | ISO 8601 |
| `EscolaGUID` | string | ✅ Yes | Escola onde os professores serão vinculados (`FuncaoId=3`) | UUID v4 |
| `EscolaNome` | string | ❌ No | Nome da escola, usado no corpo do e-mail | Padrão: `"Escola"` |
| `enviarEmails` | boolean | ❌ No | Se deve disparar e-mails de boas-vindas/aviso | Padrão: `true` |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "1 professores criados, 1 já cadastrados, 0 erros",
  "data": {
    "totalProcessados": 2,
    "criados": 1,
    "existentes": 1,
    "erros": 0,
    "resultados": [
      {
        "item": { "UsuarioCPF": "12345678901", "UsuarioNome": "João Silva" },
        "sucesso": true,
        "mensagem": "Professor criado/vinculado com sucesso",
        "dados": { "UsuarioCPF": "12345678901", "UsuarioNome": "João Silva", "UsuarioStatus": "Ativo" },
        "senhaTemporaria": "Jo@o1234",
        "tipo": "criado"
      },
      {
        "item": { "UsuarioCPF": "98765432100", "UsuarioNome": "Maria Santos" },
        "sucesso": true,
        "mensagem": "Professor já cadastrado nesta escola",
        "dados": { "UsuarioCPF": "98765432100", "UsuarioNome": "Maria Santos" },
        "tipo": "existente"
      }
    ]
  }
}
```

**Error Responses:**

**400 Bad Request** - Formato individual não suportado
```json
{ "success": false, "message": "Para criar professor individual, use POST /api/professor/alocacao após criar o usuário" }
```

**200/201 com item de erro** - CPF ou Nome ausente em um item do lote (não interrompe o lote; o item volta em `resultados` com `tipo: "erro"`)
```json
{ "item": { "UsuarioNome": "Sem CPF" }, "sucesso": false, "mensagem": "CPF é obrigatório", "tipo": "erro" }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/professor \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "professores": [ { "UsuarioCPF": "12345678901", "UsuarioNome": "João Silva", "UsuarioEmail": "joao@escola.com" } ],
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "EscolaNome": "Colégio Exemplo"
  }'
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

Cria uma nova alocação (Professor + Matéria + Turma). Suporta dois formatos de body: **individual** (campo `alocacao`) ou **em massa** (campo `alocacoes`, array — nesse caso `MateriaGUID`/`TurmaGUID` podem ser substituídos por `MateriaNome`/`TurmaNome`, resolvidos internamente por busca na escola). Se já existir uma alocação **inativa** para a mesma tripla (matéria+turma+professor), ela é **reativada** em vez de gerar erro de duplicidade (constraint única no banco).

**Endpoint:** `POST /api/professor/alocacao`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (individual):**
```json
{
  "alocacao": {
    "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
    "UsuarioCPF": "12345678901",
    "AlocacaoStatus": "Ativa",
    "AulasPorSemana": 4
  }
}
```

**Request Body (em massa):**
```json
{
  "alocacoes": [
    { "MateriaNome": "Matemática", "TurmaNome": "1º Ano A", "UsuarioCPF": "12345678901" },
    { "MateriaGUID": "660e8400-e29b-41d4-a716-446655440002", "TurmaGUID": "880e8400-e29b-41d4-a716-446655440002", "UsuarioCPF": "12345678901" }
  ],
  "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Request Parameters (individual):**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `alocacao` | object | ✅ Yes | Objeto contendo dados da alocação | Obrigatório |
| `alocacao.MateriaGUID` | string | ✅ Yes | UUID da matéria | UUID v4 válido |
| `alocacao.TurmaGUID` | string | ✅ Yes | UUID da turma | UUID v4 válido |
| `alocacao.UsuarioCPF` | string | ✅ Yes | CPF do professor | 11 dígitos |
| `alocacao.AlocacaoStatus` | string | ❌ No | Status inicial | "Ativa" ou "Inativa" (padrão: "Ativa") |
| `alocacao.AulasPorSemana` | number \| null | ❌ No | Override, específico desta turma, da quantidade de aulas semanais (por padrão herda o valor configurado na Matéria) | Inteiro ou `null` |

**Request Parameters (em massa):**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `alocacoes` | array | ✅ Yes | Lista de alocações | Array (dispara o modo batch) |
| `alocacoes[].MateriaGUID` ou `MateriaNome` | string | ✅ Yes (um dos dois) | Matéria por UUID ou nome (resolvido internamente) | Nome deve existir na escola |
| `alocacoes[].TurmaGUID` ou `TurmaNome` | string | ✅ Yes (um dos dois) | Turma por UUID ou nome (resolvido internamente, aceita `"Série Nome"` ou só `"Nome"`) | Nome deve existir na escola |
| `alocacoes[].UsuarioCPF` | string | ✅ Yes | CPF do professor | Deve já ser professor `Ativo` na escola |
| `EscolaGUID` | string | ✅ Yes | Escola de referência para resolver nomes | UUID v4 |

**Success Response (201 Created) — individual:**
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
    "AulasPorSemana": 4,
    "MatProfTurCreatedAt": "2026-05-12T10:00:00.000Z",
    "MatProfTurUpdatedAt": "2026-05-12T10:00:00.000Z"
  }
}
```

**Success Response (201 Created) — em massa:**
```json
{
  "success": true,
  "message": "1 alocações criadas, 1 já existentes, 0 erros",
  "data": {
    "totalProcessados": 2,
    "criados": 1,
    "existentes": 1,
    "erros": 0,
    "resultados": [
      { "item": { "MateriaNome": "Matemática", "TurmaNome": "1º Ano A", "UsuarioCPF": "12345678901" }, "sucesso": true, "mensagem": "Alocação criada com sucesso", "tipo": "criado" },
      { "item": { "MateriaGUID": "660e8400-...", "TurmaGUID": "880e8400-...", "UsuarioCPF": "12345678901" }, "sucesso": true, "mensagem": "Alocação já existe", "tipo": "existente" }
    ]
  }
}
```

**Error Responses:**

**400 Bad Request** - `TurmaGUID`/`MateriaGUID` ausente (individual)
```json
{ "success": false, "message": "TurmaGUID é obrigatório", "details": { "message": "O campo TurmaGUID é obrigatório para criar uma alocação" } }
```

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

**409 Conflict** - Alocação `Ativa` duplicada (se a alocação existente estiver `Inativa`, o serviço a **reativa automaticamente** em vez de retornar 409)
```json
{
  "success": false,
  "message": "Alocação já existe",
  "details": {
    "message": "Este professor já está alocado nesta matéria e turma",
    "alocacaoExistente": {
      "MatProfTurGUID": "990e8400-e29b-41d4-a716-446655440001",
      "AlocacaoStatus": "Ativa"
    }
  }
}
```

> No modo em massa (`alocacoes`), erros por item (`Matéria "X" não encontrada`, `Turma "X" não encontrada`, `Usuário não é professor nesta escola`, `Professor inativo`, `Alocação duplicada no lote`) **não** interrompem a requisição nem retornam status de erro — eles aparecem em `data.resultados[].tipo: "erro"`, com a resposta geral ainda em `201`.

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
    "AlocacaoStatus": "Inativa",
    "AulasPorSemana": 5
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `alocacao` | object | ✅ Yes | Objeto com campo(s) a atualizar | Obrigatório |
| `alocacao.AlocacaoStatus` | string | ❌ No | Novo status | "Ativa" ou "Inativa" |
| `alocacao.AulasPorSemana` | number \| null | ❌ No | Novo valor de aulas semanais específico desta turma | Inteiro ou `null` |

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

### Get Matérias do Professor Logado

Retorna as matérias/turmas em que o **professor autenticado** (usuário do próprio token, não um CPF arbitrário) está alocado com `AlocacaoStatus='Ativa'`, filtradas por escola.

**Endpoint:** `GET /api/professor/materias?EscolaGUID=<uuid>`

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
      "MatProfTurGUID": "990e8400-e29b-41d4-a716-446655440001",
      "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
      "MateriaNome": "Matemática",
      "TurmaNome": "A",
      "TurmaSerie": "1º Ano"
    }
  ],
  "total": 1
}
```

**Error Responses:**

**400 Bad Request** - `EscolaGUID` ausente
```json
{ "success": false, "message": "EscolaGUID é obrigatório" }
```

**401 Unauthorized** - Sem token
```json
{ "success": false, "message": "Não autenticado" }
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/professor/materias?EscolaGUID=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Get Turmas e Alunos da Alocação

Retorna, para uma alocação específica do professor autenticado, todas as turmas em que ele leciona **a mesma matéria** dessa alocação (agrupadas por série) e os alunos (matrícula `Ativa`) de cada turma. Usado para telas de lançamento de nota/chamada que precisam trocar de turma sem sair do contexto da matéria.

**Endpoint:** `GET /api/professor/turmas-alunos?MatProfTurGUID=<uuid>`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MatProfTurGUID` | string | ✅ Yes | UUID de uma alocação do professor autenticado |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "series": [
      {
        "TurmaSerie": "1º Ano",
        "turmas": [
          {
            "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
            "TurmaNome": "A",
            "alunos": [
              { "MatriculaGUID": "770e8400-e29b-41d4-a716-446655440001", "UsuarioNome": "Ana Souza" }
            ]
          }
        ]
      }
    ]
  }
}
```

**Error Responses:**

**400 Bad Request** - `MatProfTurGUID` ausente
```json
{ "success": false, "message": "MatProfTurGUID é obrigatório" }
```

**401 Unauthorized** - Sem token
```json
{ "success": false, "message": "Não autenticado" }
```

**403 Forbidden** - Alocação não pertence ao professor autenticado
```json
{ "success": false, "message": "Sem permissão para acessar esta alocação" }
```

**404 Not Found** - Alocação, matéria ou turma não encontrada
```json
{ "success": false, "message": "Alocação não encontrada" }
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/professor/turmas-alunos?MatProfTurGUID=990e8400-e29b-41d4-a716-446655440001" \
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
  AulasPorSemana: number | null; // override específico da turma; null = herda o padrão da Matéria
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
  AulasPorSemana INT NULL,
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
- Mensagem de erro: "Alocação já existe" (409), com `details.alocacaoExistente`
- Se a alocação existente estiver `Inativa`, o service **reativa** em vez de bloquear (não gera novo GUID, pois há constraint única no banco)

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
- PUT `/alocacao/:guid` só permite alterar `AlocacaoStatus` e `AulasPorSemana`
- Não permite alterar MateriaGUID, TurmaGUID ou UsuarioCPF (delete e crie novo)

### 9. Criação de Professores em Massa (`POST /api/professor`)
- Endpoint só aceita o formato em lote (`professores: []`); envio individual retorna 400 pedindo uso de `POST /api/professor/alocacao`.
- Para CPF ainda não cadastrado como `Usuario`, cria o usuário com senha temporária gerada por `gerarSenhaTemporaria()` (hash bcrypt, 10 salt rounds) e dispara e-mail de boas-vindas (se `enviarEmails` e houver e-mail).
- Para CPF já existente como `Usuario`, apenas cria o vínculo `escolaxusuarioxfuncao` com `FuncaoId=3`/`Status='Ativo'`, se ainda não existir; se já for professor na escola, o item volta como `tipo: 'existente'` sem erro.
- Erros por item (CPF/Nome ausente) não interrompem o lote — cada item tem seu próprio resultado em `resultados[]`.
- Envio de e-mails é assíncrono e não bloqueia a resposta HTTP (`EmailAlunoService.enviarEmailsEmLote(...).catch(...)`), então falha no envio de e-mail não afeta o `success` da resposta.

### 10. Criação de Alocações em Massa (`POST /api/professor/alocacao` com `alocacoes[]`)
- Permite referenciar Matéria/Turma por **nome** (`MateriaNome`/`TurmaNome`) em vez de GUID — resolvidos por busca em memória entre todas as matérias/turmas da escola informada em `EscolaGUID`.
- Resolução de turma por nome aceita tanto `"Série Nome"` quanto apenas `"Nome"` (busca por `includes`).
- Detecta duplicatas dentro do próprio lote (`UsuarioCPF+MateriaGUID+TurmaGUID` repetido) antes mesmo de consultar o banco.
- Assim como no modo individual, tripla já existente e `Inativa` é reativada; `Ativa` retorna item com `tipo: 'existente'` (sem erro).
- Requer permissão de escrita (Coordenação/Direção) validada uma única vez para toda a operação, antes do loop.

### 11. Endpoints "auto-contextuais" (`/materias`, `/turmas-alunos`)
- `GET /api/professor/materias` e `GET /api/professor/turmas-alunos` **sempre operam sobre o professor do token** (`req.user.UsuarioCPF`), não aceitam consultar dados de outro professor via parâmetro.
- `GET /api/professor/turmas-alunos` retorna 403 se o `MatProfTurGUID` informado pertencer a outro professor (`alocacaoBase.UsuarioCPF !== usuarioCPF`).

---

## Error Codes

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | BAD_REQUEST | EscolaGUID deve ser um UUID válido | Formato UUID incorreto |
| 400 | BAD_REQUEST | UsuarioCPF deve conter exatamente 11 dígitos | CPF inválido |
| 400 | BAD_REQUEST | TurmaGUID/MateriaGUID é obrigatório | Campo ausente na criação individual de alocação |
| 400 | BAD_REQUEST | Matéria e turma de escolas diferentes | Escola da matéria ≠ escola da turma |
| 400 | BAD_REQUEST | Usuário não é professor ativo nesta escola | CPF não é professor (FuncaoId≠3 ou Status≠'Ativo') |
| 400 | BAD_REQUEST | Para criar professor individual, use POST /api/professor/alocacao após criar o usuário | `POST /api/professor` sem o array `professores` |
| 400 | BAD_REQUEST | EscolaGUID é obrigatório / MatProfTurGUID é obrigatório | Query param ausente em `/materias` ou `/turmas-alunos` |
| 401 | UNAUTHORIZED | Não autenticado | Token ausente/inválido em `/materias` ou `/turmas-alunos` |
| 403 | FORBIDDEN | Sem permissão | Usuário não é Coordenação/Direção |
| 403 | FORBIDDEN | Sem permissão para acessar esta alocação | `MatProfTurGUID` de `/turmas-alunos` pertence a outro professor |
| 404 | NOT_FOUND | Turma não encontrada | TurmaGUID inexistente |
| 404 | NOT_FOUND | Matéria não encontrada | MateriaGUID inexistente |
| 404 | NOT_FOUND | Alocação não encontrada | MatProfTurGUID inexistente |
| 404 | NOT_FOUND | Usuário não é professor nesta escola | `GET /:cpf/escolas/:escolaGUID/alocacoes` para CPF sem vínculo de professor |
| 409 | CONFLICT | Alocação já existe | UNIQUE constraint violado (tripla `Ativa` duplicada) |
| 500 | INTERNAL_ERROR | Erro interno ao criar alocação/professores | Erro no banco/servidor |

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
