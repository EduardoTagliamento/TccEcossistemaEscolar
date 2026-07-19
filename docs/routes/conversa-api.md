# API Documentation - Conversa (Mensagens / Chat)

**Version:** 1.0.0
**Base URL:** `/api/conversa`
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Start/Get Individual Conversation](#startget-individual-conversation)
  - [List Conversas](#list-conversas)
  - [Get Conversa by ID](#get-conversa-by-id)
  - [List Mensagens (Histórico Paginado)](#list-mensagens-histórico-paginado)
  - [List Mensagens Fixadas](#list-mensagens-fixadas)
  - [Pin Mensagem](#pin-mensagem)
  - [Unpin Mensagem](#unpin-mensagem)
  - [Delete Mensagem](#delete-mensagem)
  - [Edit Mensagem](#edit-mensagem)
  - [Set Representante (Turma)](#set-representante-turma)
  - [Remove Representante (Turma)](#remove-representante-turma)
  - [Set Vice-Representante](#set-vice-representante)
  - [Remove Vice-Representante](#remove-vice-representante)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)
- [Examples](#examples)
- [Integration with Other Entities](#integration-with-other-entities)
- [Notes](#notes)

---

## Overview

API de **mensagens/chat** do Ecossistema Escolar, com dois tipos de conversa:
- **Individual** (`ConversaTipo='Individual'`): conversa 1:1 entre dois usuários, criada/recuperada de forma idempotente.
- **Grupo** (`ConversaTipo='Grupo'`): conversa de múltiplos participantes, de dois subtipos (`ConversaGrupoTipo`): `Turma` (todos os alunos/professores de uma turma) ou `Tarefa` (membros de um [GrupoTarefa](grupotarefa-api.md)).

**Importante:** este módulo REST **não expõe endpoint para enviar mensagem** (`POST /:guid/mensagem`) — o envio de mensagens de texto acontece via **WebSocket** (`backend/websocket/SocketServer`), não coberto por esta documentação de rotas HTTP. A API REST cobre: listar conversas/histórico, editar/deletar/fixar/desafixar mensagens, iniciar conversa individual, e gerenciar papéis (Representante/Vice-Representante) em grupos de Turma.

**Conceito:**
- Toda conversa de Grupo tem membros com uma `MembroFuncao`: `Membro`, `Lider` (grupos de Tarefa), `Representante`/`Vice-Representante` (grupos de Turma).
- Conversas de grupo são criadas automaticamente por outros módulos (ex.: `ConversaGrupoService` a partir de [grupotarefa-api.md](grupotarefa-api.md)), não por um `POST` direto nesta API.
- Mensagens têm soft delete (`MensagemDeletedAt`) e podem ser editadas (`MensagemEditadaAt`) e fixadas (`mensagem_fixada`).

**Permissões:**
- Todas as rotas exigem que o usuário seja **participante** da conversa (`ConversaDAO.isParticipante`).
- Deletar mensagem de terceiros, fixar/desafixar em grupo, e gerenciar Representante/Vice-Representante têm regras de papel específicas — ver [Business Rules](#business-rules).

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
  "message": "Descrição do erro",
  "details": { /* opcional */ }
}
```

> Vários endpoints deste módulo retornam `204 No Content` sem corpo (`unpinMensagem`, `deletarMensagem`, `removerRepresentante`, `removerViceRepresentante`).

---

## Endpoints

### Start/Get Individual Conversation

Cria (ou recupera, se já existir) a conversa 1:1 entre o usuário autenticado e outro usuário. **Idempotente**: chamar de novo com o mesmo par de CPFs retorna a mesma conversa. Registrada **antes** de `GET /:guid` na ordem de rotas para não colidir com o literal `individual`.

**Endpoint:** `POST /api/conversa/individual`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{ "DestinatarioCPF": "98765432100" }
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `DestinatarioCPF` | string | ✅ Yes | CPF do outro participante | Não vazio; diferente do CPF do usuário autenticado |

**Success Response (201 Created — conversa nova):**
```json
{
  "success": true,
  "message": "Conversa individual criada",
  "data": { "ConversaGUID": "550e8400-e29b-41d4-a716-446655440000", "isNova": true }
}
```

**Success Response (200 OK — conversa já existia):**
```json
{
  "success": true,
  "message": "Conversa individual recuperada",
  "data": { "ConversaGUID": "550e8400-e29b-41d4-a716-446655440000", "isNova": false }
}
```

**Error Responses:**

**400 Bad Request** - `DestinatarioCPF` ausente
```json
{ "success": false, "message": "DestinatarioCPF é obrigatório" }
```

**400 Bad Request** - Tentando conversar consigo mesmo
```json
{ "success": false, "message": "Não é possível iniciar uma conversa consigo mesmo" }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/conversa/individual \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "DestinatarioCPF": "98765432100" }'
```

---

### List Conversas

Lista todas as conversas ativas (grupo + individuais) em que o usuário participa, com a última mensagem e contador de não lidas de cada uma.

**Endpoint:** `GET /api/conversa`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Conversas listadas",
  "data": [
    {
      "ConversaGUID": "660e8400-e29b-41d4-a716-446655440001",
      "ConversaTipo": "Grupo",
      "ConversaGrupoNome": "1º Ano A",
      "ConversaGrupoTipo": "Turma",
      "ParceiroCPF": null,
      "ParceiroNome": null,
      "TagContextual": null,
      "UltimaMensagem": {
        "MensagemConteudo": "Bom dia, turma!",
        "MensagemRemetenteCPF": "12345678901",
        "RemetenteNome": "Prof. João",
        "MensagemCreatedAt": "2026-07-17T09:00:00.000Z"
      },
      "NaoLidas": 3
    },
    {
      "ConversaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "ConversaTipo": "Individual",
      "ConversaGrupoNome": null,
      "ConversaGrupoTipo": null,
      "ParceiroCPF": "98765432100",
      "ParceiroNome": "Maria Souza",
      "TagContextual": null,
      "UltimaMensagem": null,
      "NaoLidas": 0
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/conversa \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Get Conversa by ID

Retorna os detalhes de uma conversa: dados de grupo/parceiro, membros (se grupo), últimas 30 mensagens e mensagens fixadas.

**Endpoint:** `GET /api/conversa/:guid`

**URL Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `guid` | string | ✅ Yes | UUID da conversa | 36 caracteres |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Conversa encontrada",
  "data": {
    "ConversaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "ConversaTipo": "Grupo",
    "ConversaGrupoNome": "1º Ano A",
    "ConversaGrupoTipo": "Turma",
    "Membros": [
      { "UsuarioCPF": "12345678901", "MembroFuncao": "Representante", "MembroEntradaAt": "2026-02-01T08:00:00.000Z" }
    ],
    "ParceiroCPF": null,
    "ParceiroNome": null,
    "TagContextual": null,
    "MensagensFixadas": [],
    "Mensagens": [
      {
        "MensagemGUID": "770e8400-e29b-41d4-a716-446655440002",
        "ConversaGUID": "660e8400-e29b-41d4-a716-446655440001",
        "MensagemRemetenteCPF": "12345678901",
        "MensagemConteudo": "Bom dia, turma!",
        "MensagemTipo": "Texto",
        "MensagemCreatedAt": "2026-07-17T09:00:00.000Z",
        "MensagemDeletedAt": null,
        "MensagemEditadaAt": null
      }
    ],
    "HasMore": false
  }
}
```

**Error Responses:**

**400 Bad Request** - GUID inválido
```json
{ "success": false, "message": "ConversaGUID inválido", "details": { "message": "O identificador da conversa deve ser um UUID de 36 caracteres" } }
```

**403 Forbidden** - Não é participante
```json
{ "success": false, "message": "Você não faz parte desta conversa" }
```

**404 Not Found** - Conversa não existe ou está `Inativa`
```json
{ "success": false, "message": "Conversa não encontrada" }
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/conversa/660e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### List Mensagens (Histórico Paginado)

Retorna o histórico de mensagens da conversa, paginado por cursor (`before`).

**Endpoint:** `GET /api/conversa/:guid/mensagem`

**Query Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `limit` | number | ❌ No | Quantidade de mensagens | Padrão 30; máximo 100 (`Math.min(limit, 100)`) |
| `before` | string | ❌ No | `MensagemGUID` de referência para buscar mensagens anteriores a ele | — |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Histórico carregado",
  "data": {
    "Mensagens": [
      {
        "MensagemGUID": "770e8400-e29b-41d4-a716-446655440002",
        "ConversaGUID": "660e8400-e29b-41d4-a716-446655440001",
        "MensagemRemetenteCPF": "12345678901",
        "MensagemConteudo": "Bom dia, turma!",
        "MensagemTipo": "Texto",
        "MensagemCreatedAt": "2026-07-17T09:00:00.000Z",
        "MensagemEditadaAt": null
      }
    ],
    "HasMore": true
  }
}
```

**Error Responses:**

**403 Forbidden** - Não é participante
```json
{ "success": false, "message": "Você não faz parte desta conversa" }
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/conversa/660e8400-e29b-41d4-a716-446655440001/mensagem?limit=30&before=770e8400-e29b-41d4-a716-446655440002" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### List Mensagens Fixadas

**Endpoint:** `GET /api/conversa/:guid/fixadas`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Mensagens fixadas listadas",
  "data": [
    {
      "MensagemGUID": "770e8400-e29b-41d4-a716-446655440002",
      "ConversaGUID": "660e8400-e29b-41d4-a716-446655440001",
      "MensagemConteudo": "Prova dia 25/07!",
      "MensagemRemetenteCPF": "12345678901",
      "MensagemCreatedAt": "2026-07-17T09:00:00.000Z",
      "FixadaPorCPF": "12345678901",
      "FixadaAt": "2026-07-17T09:05:00.000Z"
    }
  ]
}
```

**Error Responses:**

**403 Forbidden** - Não é participante

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/conversa/660e8400-e29b-41d4-a716-446655440001/fixadas \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Pin Mensagem

Fixa uma mensagem no topo da conversa. Emite evento WebSocket `mensagem_fixada` para os participantes conectados.

**Endpoint:** `POST /api/conversa/:guid/mensagem/:msgGuid/fixar`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | UUID da conversa |
| `msgGuid` | string | ✅ Yes | UUID da mensagem |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Mensagem fixada",
  "data": {
    "MensagemGUID": "770e8400-e29b-41d4-a716-446655440002",
    "ConversaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "MensagemConteudo": "Prova dia 25/07!",
    "MensagemRemetenteCPF": "12345678901",
    "MensagemCreatedAt": "2026-07-17T09:00:00.000Z",
    "FixadaPorCPF": "98765432100",
    "FixadaAt": "2026-07-17T10:00:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - GUIDs inválidos

**403 Forbidden** - Em grupo, quem fixa não é Líder/Representante/Vice-Representante
```json
{ "success": false, "message": "Apenas o Líder, Representante ou Vice-Representante pode fixar mensagens em grupos" }
```
> Em conversas **individuais**, qualquer participante pode fixar (sem checagem de papel).

**403 Forbidden** - Não é participante da conversa

**404 Not Found** - Mensagem não pertence a esta conversa, ou está deletada
```json
{ "success": false, "message": "Mensagem não encontrada nesta conversa" }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/conversa/660e8400-e29b-41d4-a716-446655440001/mensagem/770e8400-e29b-41d4-a716-446655440002/fixar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Unpin Mensagem

**Endpoint:** `DELETE /api/conversa/:guid/mensagem/:msgGuid/fixar`

**Success Response:** `204 No Content` (sem corpo).

**Error Responses:** mesmas de `Pin Mensagem` (papel exigido em grupo; participante; mensagem existente).

**cURL Example:**
```bash
curl -X DELETE https://api.example.com/api/conversa/660e8400-e29b-41d4-a716-446655440001/mensagem/770e8400-e29b-41d4-a716-446655440002/fixar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Delete Mensagem

Soft delete de uma mensagem (`MensagemDeletedAt`). Emite evento WebSocket `mensagem_deletada`.

**Endpoint:** `DELETE /api/conversa/:guid/mensagem/:msgGuid`

**Success Response:** `204 No Content`.

**Error Responses:**

**403 Forbidden** - Não é participante

**403 Forbidden** - Tentando deletar mensagem de outro em conversa individual
```json
{ "success": false, "message": "Você só pode deletar suas próprias mensagens em conversas individuais" }
```

**403 Forbidden** - Em grupo de Tarefa, quem deleta mensagem de outro não é Líder
```json
{ "success": false, "message": "Apenas o Líder pode deletar mensagens de outros membros" }
```

**403 Forbidden** - Em grupo de Turma, quem deleta mensagem de outro não é Representante/Vice-Representante
```json
{ "success": false, "message": "Apenas o Representante ou Vice-Representante pode deletar mensagens de outros membros" }
```

**404 Not Found**
```json
{ "success": false, "message": "Mensagem não encontrada nesta conversa" }
```

**cURL Example:**
```bash
curl -X DELETE https://api.example.com/api/conversa/660e8400-e29b-41d4-a716-446655440001/mensagem/770e8400-e29b-41d4-a716-446655440002 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Edit Mensagem

Edita o conteúdo de uma mensagem própria. Emite evento WebSocket `mensagem_editada`.

**Endpoint:** `PATCH /api/conversa/:guid/mensagem/:msgGuid`

**Request Body:**
```json
{ "MensagemConteudo": "Bom dia, turma! (correção: prova dia 26/07)" }
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `MensagemConteudo` | string | ✅ Yes | Novo conteúdo | 1-4000 caracteres |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Mensagem editada",
  "data": {
    "MensagemGUID": "770e8400-e29b-41d4-a716-446655440002",
    "ConversaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "MensagemRemetenteCPF": "12345678901",
    "MensagemConteudo": "Bom dia, turma! (correção: prova dia 26/07)",
    "MensagemTipo": "Texto",
    "MensagemCreatedAt": "2026-07-17T09:00:00.000Z",
    "MensagemEditadaAt": "2026-07-17T10:10:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request** - `MensagemConteudo` ausente/vazio/longo demais (middleware, checagem 4000 caracteres) ou (service, checagem redundante 1-4000)
```json
{ "success": false, "message": "MensagemConteudo é obrigatório" }
```

**403 Forbidden** - Não é participante, ou não é o remetente original
```json
{ "success": false, "message": "Você só pode editar suas próprias mensagens" }
```

**404 Not Found**
```json
{ "success": false, "message": "Mensagem não encontrada nesta conversa" }
```

**cURL Example:**
```bash
curl -X PATCH https://api.example.com/api/conversa/660e8400-e29b-41d4-a716-446655440001/mensagem/770e8400-e29b-41d4-a716-446655440002 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "MensagemConteudo": "Bom dia, turma! (correção: prova dia 26/07)" }'
```

---

### Set Representante (Turma)

Define o Representante do grupo de conversa de uma Turma. Só se aplica a grupos `ConversaGrupoTipo='Turma'`. Se já houver um Representante, ele (e todos os Vice-Representantes) voltam a `Membro` antes de aplicar o novo.

**Endpoint:** `PUT /api/conversa/:guid/permissao/representante`

**Request Body:**
```json
{ "UsuarioCPF": "12345678901" }
```

**Success Response (200 OK):**
```json
{ "success": true, "message": "Representante definido" }
```

**Error Responses:**

**400 Bad Request** - `UsuarioCPF` ausente
```json
{ "success": false, "message": "UsuarioCPF é obrigatório" }
```

**400 Bad Request** - Operação em grupo que não é de Turma
```json
{ "success": false, "message": "Esta operação é exclusiva para grupos de Turma" }
```

**400 Bad Request** - Alvo não é membro da conversa
```json
{ "success": false, "message": "Usuário não é membro desta conversa" }
```

**403 Forbidden** - Solicitante não é Coordenação/Direção da escola da turma
```json
{ "success": false, "message": "Apenas Coordenação ou Direção pode realizar esta operação" }
```

**404 Not Found** - Turma vinculada ao grupo não existe
```json
{ "success": false, "message": "Turma não encontrada" }
```

**cURL Example:**
```bash
curl -X PUT https://api.example.com/api/conversa/660e8400-e29b-41d4-a716-446655440001/permissao/representante \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "UsuarioCPF": "12345678901" }'
```

---

### Remove Representante (Turma)

**Endpoint:** `DELETE /api/conversa/:guid/permissao/representante`

**Success Response:** `204 No Content`.

**Error Responses:**

**400 Bad Request** - Grupo não é de Turma

**403 Forbidden** - Não é Coordenação/Direção

**404 Not Found** - Não há Representante definido na conversa
```json
{ "success": false, "message": "Não há Representante nesta conversa" }
```

**cURL Example:**
```bash
curl -X DELETE https://api.example.com/api/conversa/660e8400-e29b-41d4-a716-446655440001/permissao/representante \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Set Vice-Representante

Delega um Vice-Representante. Em grupo de Turma, só o **Representante** pode delegar; em grupo de Tarefa, só o **Líder** pode.

**Endpoint:** `PUT /api/conversa/:guid/permissao/vice-representante`

**Request Body:**
```json
{ "UsuarioCPF": "98765432100" }
```

**Success Response (200 OK):**
```json
{ "success": true, "message": "Vice-Representante definido" }
```

**Error Responses:**

**400 Bad Request** - `UsuarioCPF` ausente

**400 Bad Request** - Alvo não é membro
```json
{ "success": false, "message": "Usuário não é membro desta conversa" }
```

**400 Bad Request** - Alvo já é Líder ou Representante
```json
{ "success": false, "message": "Líder ou Representante não pode ser Vice-Representante" }
```

**403 Forbidden** - Solicitante não tem o papel correto para delegar
```json
{ "success": false, "message": "Apenas o Representante pode delegar Vice-Representante neste grupo" }
```
```json
{ "success": false, "message": "Apenas o Líder pode delegar Vice-Representante neste grupo" }
```

**404 Not Found** - Conversa/grupo não encontrado

**cURL Example:**
```bash
curl -X PUT https://api.example.com/api/conversa/660e8400-e29b-41d4-a716-446655440001/permissao/vice-representante \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "UsuarioCPF": "98765432100" }'
```

---

### Remove Vice-Representante

**Endpoint:** `DELETE /api/conversa/:guid/permissao/vice-representante/:cpf`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | ✅ Yes | UUID da conversa |
| `cpf` | string | ✅ Yes | CPF do Vice-Representante a remover |

**Success Response:** `204 No Content`.

**Error Responses:**

**400 Bad Request** - CPF inválido/ausente
```json
{ "success": false, "message": "CPF inválido" }
```

**400 Bad Request** - Alvo não é Vice-Representante
```json
{ "success": false, "message": "Usuário não é Vice-Representante desta conversa" }
```

**403 Forbidden** - Solicitante não tem o papel correto

**cURL Example:**
```bash
curl -X DELETE https://api.example.com/api/conversa/660e8400-e29b-41d4-a716-446655440001/permissao/vice-representante/98765432100 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Data Models

### Conversa / ConversaGrupo / ConversaIndividual

```typescript
type ConversaTipo = 'Individual' | 'Grupo';
type ConversaStatus = 'Ativa' | 'Inativa';
type ConversaGrupoTipo = 'Turma' | 'Tarefa';
type MembroFuncao = 'Membro' | 'Lider' | 'Representante' | 'Vice-Representante';

interface Conversa {
  ConversaGUID: string;
  ConversaTipo: ConversaTipo;
  ConversaStatus: ConversaStatus;
  ConversaCreatedAt: Date;
  ConversaUpdatedAt: Date;
}

interface ConversaGrupo {
  ConversaGUID: string;
  ConversaGrupoNome: string;        // até 100 caracteres
  ConversaGrupoTipo: ConversaGrupoTipo;
  ConversaGrupoRefGUID: string;     // aponta para TurmaGUID (Turma) ou GrupoTarefaGUID (Tarefa)
}

interface ConversaIndividual {
  ConversaGUID: string;
  ConversaIndUsr1CPF: string;       // par normalizado: menor CPF
  ConversaIndUsr2CPF: string;       // par normalizado: maior CPF
}

interface ConversaGrupoMembro {
  ConversaGUID: string;
  MembroUsuarioCPF: string;
  MembroFuncao: MembroFuncao;
  MembroStatus: 'Ativo' | 'Inativo';
  MembroEntradaAt: Date;
  MembroSaidaAt: Date | null;
}
```

### Mensagem / MensagemLeitura / MensagemFixada

```typescript
interface Mensagem {
  MensagemGUID: string;
  ConversaGUID: string;
  MensagemRemetenteCPF: string;
  MensagemConteudo: string;         // 1-4000 caracteres
  MensagemTipo: 'Texto' | 'Arquivo' | 'Imagem';
  MensagemCreatedAt: Date;
  MensagemDeletedAt: Date | null;   // soft delete
  MensagemEditadaAt: Date | null;
}

interface MensagemLeitura {
  MensagemGUID: string;
  UsuarioCPF: string;
  MensagemLidaAt: Date;
}

interface MensagemFixada {
  MensagemGUID: string;
  ConversaGUID: string;
  FixadaPorCPF: string;
  FixadaAt: Date;
}
```

### Database Schema

```sql
CREATE TABLE `conversa` (
  `ConversaGUID`      CHAR(36)                     NOT NULL,
  `ConversaTipo`      ENUM('Individual', 'Grupo')  NOT NULL,
  `ConversaStatus`    ENUM('Ativa', 'Inativa')     NOT NULL DEFAULT 'Ativa',
  `ConversaCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ConversaUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ConversaGUID`)
);

CREATE TABLE `conversa_grupo` (
  `ConversaGUID`          CHAR(36)                NOT NULL,
  `ConversaGrupoNome`     VARCHAR(100)            NOT NULL,
  `ConversaGrupoTipo`     ENUM('Turma', 'Tarefa') NOT NULL,
  `ConversaGrupoRefGUID`  CHAR(36)                NOT NULL,
  PRIMARY KEY (`ConversaGUID`),
  CONSTRAINT `FK_ConversaGrupo_Conversa` FOREIGN KEY (`ConversaGUID`) REFERENCES `conversa` (`ConversaGUID`) ON DELETE CASCADE
);

CREATE TABLE `conversa_individual` (
  `ConversaGUID`        CHAR(36)     NOT NULL,
  `ConversaIndUsr1CPF`  VARCHAR(14)  NOT NULL,
  `ConversaIndUsr2CPF`  VARCHAR(14)  NOT NULL,
  PRIMARY KEY (`ConversaGUID`),
  UNIQUE KEY `UK_ConversaInd_Usuarios` (`ConversaIndUsr1CPF`, `ConversaIndUsr2CPF`),
  CONSTRAINT `FK_ConversaInd_Conversa` FOREIGN KEY (`ConversaGUID`) REFERENCES `conversa` (`ConversaGUID`) ON DELETE CASCADE,
  CONSTRAINT `FK_ConversaInd_Usr1` FOREIGN KEY (`ConversaIndUsr1CPF`) REFERENCES `usuario` (`UsuarioCPF`),
  CONSTRAINT `FK_ConversaInd_Usr2` FOREIGN KEY (`ConversaIndUsr2CPF`) REFERENCES `usuario` (`UsuarioCPF`)
);

-- ⚠️ A confirmar: o ENUM abaixo, tal como está em sql.txt, só define ('Membro', 'Lider') —
-- mas o código (ConversaGrupoDAO.setFuncao / ConversaPermissaoService) também grava e lê
-- os valores 'Representante' e 'Vice-Representante'. O schema de referência provavelmente
-- foi ampliado por uma migration não presente no repositório.
CREATE TABLE `conversa_grupo_membro` (
  `ConversaGUID`      CHAR(36)                   NOT NULL,
  `MembroUsuarioCPF`  VARCHAR(14)                NOT NULL,
  `MembroFuncao`      ENUM('Membro', 'Lider', 'Representante', 'Vice-Representante') NOT NULL DEFAULT 'Membro',
  `MembroStatus`      ENUM('Ativo', 'Inativo')   NOT NULL DEFAULT 'Ativo',
  `MembroEntradaAt`   TIMESTAMP                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `MembroSaidaAt`     TIMESTAMP                  NULL,
  PRIMARY KEY (`ConversaGUID`, `MembroUsuarioCPF`),
  CONSTRAINT `FK_ConversaGrupoMembro_Conversa` FOREIGN KEY (`ConversaGUID`) REFERENCES `conversa` (`ConversaGUID`) ON DELETE CASCADE,
  CONSTRAINT `FK_ConversaGrupoMembro_Usuario` FOREIGN KEY (`MembroUsuarioCPF`) REFERENCES `usuario` (`UsuarioCPF`)
);

CREATE TABLE `mensagem` (
  `MensagemGUID`          CHAR(36)                             NOT NULL,
  `ConversaGUID`          CHAR(36)                             NOT NULL,
  `MensagemRemetenteCPF`  VARCHAR(14)                          NOT NULL,
  `MensagemConteudo`      TEXT                                 NOT NULL,
  `MensagemTipo`          ENUM('Texto', 'Arquivo', 'Imagem')   NOT NULL DEFAULT 'Texto',
  `MensagemCreatedAt`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `MensagemDeletedAt`     TIMESTAMP NULL,
  PRIMARY KEY (`MensagemGUID`),
  CONSTRAINT `FK_Mensagem_Conversa` FOREIGN KEY (`ConversaGUID`) REFERENCES `conversa` (`ConversaGUID`),
  CONSTRAINT `FK_Mensagem_Remetente` FOREIGN KEY (`MensagemRemetenteCPF`) REFERENCES `usuario` (`UsuarioCPF`)
);

CREATE TABLE `mensagem_leitura` (
  `MensagemGUID`   CHAR(36)    NOT NULL,
  `UsuarioCPF`     VARCHAR(14) NOT NULL,
  `MensagemLidaAt` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MensagemGUID`, `UsuarioCPF`),
  CONSTRAINT `FK_MensagemLeitura_Mensagem` FOREIGN KEY (`MensagemGUID`) REFERENCES `mensagem` (`MensagemGUID`) ON DELETE CASCADE,
  CONSTRAINT `FK_MensagemLeitura_Usuario` FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario` (`UsuarioCPF`)
);

CREATE TABLE `mensagem_fixada` (
  `MensagemGUID`  CHAR(36)     NOT NULL,
  `ConversaGUID`  CHAR(36)     NOT NULL,
  `FixadaPorCPF`  VARCHAR(14)  NOT NULL,
  `FixadaAt`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MensagemGUID`),
  CONSTRAINT `FK_MensagemFixada_Mensagem` FOREIGN KEY (`MensagemGUID`) REFERENCES `mensagem` (`MensagemGUID`) ON DELETE CASCADE,
  CONSTRAINT `FK_MensagemFixada_Conversa` FOREIGN KEY (`ConversaGUID`) REFERENCES `conversa` (`ConversaGUID`) ON DELETE CASCADE,
  CONSTRAINT `FK_MensagemFixada_Usuario` FOREIGN KEY (`FixadaPorCPF`) REFERENCES `usuario` (`UsuarioCPF`)
);
```

Fonte: `backend/database/sql.txt`.

---

## Business Rules

1. **Conversa individual é idempotente e normalizada** — `POST /individual` ordena o par de CPFs (`[remetente, destinatario].sort()`) antes de checar/gravar, para que a `UNIQUE KEY (ConversaIndUsr1CPF, ConversaIndUsr2CPF)` cubra ambos os sentidos da conversa (`ConversaIndividualService.iniciarConversa`).
2. **Toda ação exige participação** — praticamente todos os endpoints (exceto criação de conversa individual) verificam `ConversaDAO.isParticipante(conversaGUID, usuarioCPF)` antes de prosseguir, retornando 403 caso contrário.
3. **Papéis de moderação diferem por tipo de grupo**: em grupo de **Tarefa**, quem pode agir sobre mensagens/fixação de outros é o `Lider`; em grupo de **Turma**, é o `Representante` ou `Vice-Representante` (`MensagemService.deletarMensagem`/`fixarMensagem`/`desafixarMensagem`).
4. **Fixar/desafixar em conversa individual não exige papel** — qualquer participante pode fixar/desafixar, diferente de grupo.
5. **Editar mensagem é sempre exclusivo do autor** — mesmo Líder/Representante não podem editar mensagem de outro (só deletar).
6. **Gestão de Representante é exclusiva de Coordenação/Direção**, e só se aplica a grupos `ConversaGrupoTipo='Turma'` — verificado contra a escola da turma via `escolaxusuarioxfuncao.isCoordOuDirecaoEmEscola` (`ConversaPermissaoService#assertCoordOuDirecao`).
7. **Definir novo Representante substitui o atual** — o Representante anterior (e todos os Vice-Representantes) voltam a `Membro` antes do novo assumir (`ConversaPermissaoService.definirRepresentante`).
8. **Delegação de Vice-Representante depende do papel do delegante**: em Turma, só o Representante delega; em Tarefa, só o Líder (`#assertRepresentanteOuLider`).
9. **Líder/Representante não pode virar Vice-Representante** — checagem explícita em `definirViceRepresentante`.
10. **Todas as mudanças de estado emitem eventos WebSocket** (`mensagem_deletada`, `mensagem_editada`, `mensagem_fixada`, `mensagem_desafixada`, `permissao_atualizada`) para os clientes conectados àquela conversa via `SocketServer.emit`.
11. **Envio de mensagem de texto não é REST** — não existe `POST /:guid/mensagem`; `MensagemService.enviar` é chamado a partir do handler de WebSocket (fora do escopo desta documentação de rotas HTTP).

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | `ConversaGUID`/`MensagemGUID` inválido | Parâmetro de rota fora do formato (36 caracteres) |
| 400 | `DestinatarioCPF`/`UsuarioCPF`/`MensagemConteudo` obrigatório | Body ausente/vazio |
| 400 | Não é possível iniciar uma conversa consigo mesmo | `DestinatarioCPF === usuário autenticado` |
| 400 | `MensagemConteudo` não pode exceder 4000 caracteres / deve ter entre 1 e 4000 caracteres | Texto muito longo/curto |
| 400 | Esta operação é exclusiva para grupos de Turma | Representante/Vice em grupo de Tarefa |
| 400 | Usuário não é membro desta conversa | Alvo de Representante/Vice não pertence ao grupo |
| 400 | Líder ou Representante não pode ser Vice-Representante | Conflito de papel |
| 400 | Usuário não é Vice-Representante desta conversa | Remoção de Vice em quem não tem o papel |
| 403 | Você não faz parte desta conversa | Ação em conversa da qual não é participante |
| 403 | Você só pode deletar/editar suas próprias mensagens (...) | Ação sobre mensagem de outro sem o papel exigido |
| 403 | Apenas o Líder/Representante/Vice-Representante pode... | Fixar/desafixar/deletar em grupo sem papel adequado |
| 403 | Apenas Coordenação ou Direção pode realizar esta operação | Gestão de Representante por não-admin |
| 403 | Apenas o Representante/Líder pode delegar Vice-Representante neste grupo | Delegação por quem não tem o papel |
| 404 | Conversa não encontrada | GUID inexistente ou `ConversaStatus='Inativa'` |
| 404 | Mensagem não encontrada nesta conversa | `msgGuid` inexistente, de outra conversa, ou já deletada |
| 404 | Turma não encontrada | Grupo de Turma sem turma correspondente |
| 404 | Não há Representante nesta conversa | Remoção de Representante inexistente |

---

## Examples

### Cenário 1: Iniciar conversa individual e depois recuperá-la
```bash
POST /api/conversa/individual
{ "DestinatarioCPF": "98765432100" }
# Response 201, isNova=true

POST /api/conversa/individual
{ "DestinatarioCPF": "98765432100" }
# Response 200, isNova=false (mesma ConversaGUID)
```

### Cenário 2: Coordenação define Representante da turma
```bash
PUT /api/conversa/660e8400-e29b-41d4-a716-446655440001/permissao/representante
{ "UsuarioCPF": "12345678901" }
# Response 200
```

### Cenário 3: Aluno comum tenta fixar mensagem em grupo (❌ Erro)
```bash
POST /api/conversa/660e8400-e29b-41d4-a716-446655440001/mensagem/770e8400-e29b-41d4-a716-446655440002/fixar
# usuário é Membro comum, não Representante/Vice/Líder

Response 403:
{ "success": false, "message": "Apenas o Líder, Representante ou Vice-Representante pode fixar mensagens em grupos" }
```

---

## Integration with Other Entities

- **Conversa (Grupo/Tarefa) → GrupoTarefa**: conversas de grupo de Tarefa são criadas/mantidas por `ConversaGrupoService`, chamado a partir de `GrupoTarefaService` — ver [grupotarefa-api.md](grupotarefa-api.md).
- **Conversa (Grupo/Turma) → Turma**: `ConversaGrupoRefGUID` aponta para `TurmaGUID` — ver [turma-api.md](turma-api.md).
- **Conversa → Matricula/EscolaxUsuarioxFuncao**: verificação de Coordenação/Direção usa `escolaxusuarioxfuncao.isCoordOuDirecaoEmEscola` — ver [escolaxusuarioxfuncao-api.md](escolaxusuarioxfuncao-api.md).

---

## Notes

- Este módulo tem uma camada WebSocket paralela (`backend/websocket/SocketServer`) responsável pelo envio de mensagens em tempo real e pela emissão dos eventos citados nas Business Rules — não documentada aqui (fora do escopo de rotas HTTP/REST).
- `MembroFuncao` no schema de referência (`sql.txt`) só lista `Membro`/`Lider`; o código usa também `Representante`/`Vice-Representante` — ver nota ⚠️ no schema acima.
- Datas retornadas em ISO 8601.
