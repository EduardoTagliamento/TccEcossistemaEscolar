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
  - [React to Mensagem (toggle)](#react-to-mensagem-toggle)
  - [Set Representante (Turma)](#set-representante-turma)
  - [Remove Representante (Turma)](#remove-representante-turma)
  - [Set Vice-Representante](#set-vice-representante)
  - [Remove Vice-Representante](#remove-vice-representante)
- [Data Models](#data-models)
- [WebSocket Events](#websocket-events)
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

**Importante:** este módulo REST **não expõe endpoint para enviar mensagem** (`POST /:guid/mensagem`) — o envio de mensagens (texto ou anexo) acontece via **WebSocket** (`backend/websocket/SocketServer`), não coberto por esta documentação de rotas HTTP. A API REST cobre: listar conversas/histórico, editar/deletar/fixar/desafixar mensagens, iniciar conversa individual, gerenciar papéis (Representante/Vice-Representante) em grupos de Turma, e o **upload de anexo de mensagem** (ver abaixo) — que é REST porque é um upload de arquivo, mas só devolve a URL; a `Mensagem` em si ainda é criada via WS.

**Anexos (imagem/arquivo) — atualizado 2026-07-19:** `MensagemTipo` (`'Texto' | 'Arquivo' | 'Imagem'`) agora é aceito de ponta a ponta. Fluxo: (1) `POST /api/upload/mensagem/:conversaGUID` (multipart/form-data, campo `arquivo`, documentado em `upload-api`/`routes/upload.routes.ts`) faz upload pro Cloudflare R2 e devolve `{ fileUrl, fileName, fileSize, mimeType, mensagemTipo }`; (2) o cliente emite `send_mensagem` via WS com `{ ConversaGUID, MensagemConteudo: fileUrl, MensagemTipo: mensagemTipo }` — `MensagemConteudo` guarda a URL pública do anexo (reaproveita a coluna `TEXT` existente, sem migration nova). Limite: 10MB; tipos aceitos: imagens (png/jpeg/jpg/gif/webp) + documentos comuns (pdf/doc/docx/xls/xlsx/ppt/pptx/zip/txt). O upload exige que o usuário seja participante da conversa (mesma regra de `isParticipante` das demais rotas).

**Conceito:**
- Toda conversa de Grupo tem membros com uma `MembroFuncao`: `Membro`, `Lider` (grupos de Tarefa), `Representante`/`Vice-Representante` (grupos de Turma).
- Conversas de grupo são criadas automaticamente por outros módulos (ex.: `ConversaGrupoService` a partir de [grupotarefa-api.md](grupotarefa-api.md)), não por um `POST` direto nesta API.
- Mensagens têm soft delete (`MensagemDeletedAt`) e podem ser editadas (`MensagemEditadaAt`), fixadas (`mensagem_fixada`) e **reagidas** (`mensagem_reacao`, novo — ver abaixo).

**Reações a mensagens (atualizado 2026-07-23):** qualquer participante pode reagir a uma mensagem com um dos 6 emojis de uma paleta fixa (`👍 ❤️ 😂 😮 😢 🙏`). Um mesmo usuário pode ter várias reações simultâneas e independentes na mesma mensagem (ex.: 👍 e ❤️ ao mesmo tempo) — não é "uma reação por usuário". Reagir de novo com o **mesmo** emoji remove só aquela reação (toggle por par usuário+emoji). Endpoint REST (`POST .../reacao`) e evento WebSocket (`reagir_mensagem`/`reacao_atualizada`) seguem o mesmo padrão das demais ações de mensagem (fixar/editar/deletar): as duas vias chamam o mesmo `MensagemService.reagir()` e emitem o mesmo evento de broadcast.

**Recibo de leitura visual (atualizado 2026-07-23):** o `MensagemDTO` (retornado em toda listagem/histórico/detalhe de mensagem) ganhou o campo `Leitores: string[]` — CPFs de quem já leu aquela mensagem, excluindo o próprio remetente. Aplica-se tanto a conversas individuais quanto a grupos (o front usa isso para renderizar ✓/✓✓ em individuais e "✓✓ lida por N de M" em grupos). Não há endpoint novo — é reaproveitamento agregado da tabela `mensagem_leitura`, que já era granular por mensagem×leitor. O evento WebSocket `mensagem_lida` não mudou de payload; o frontend passou a escutá-lo para atualizar `Leitores` localmente (patch client-side), sem requisição adicional.

**Gestão de grupo — UI nova sobre endpoints já existentes (atualizado 2026-07-23):** os 4 endpoints de permissão (Representante/Vice-Representante, abaixo) não mudaram. O que mudou foram dois campos novos em DTOs já existentes, necessários para a tela de gestão de grupo do chat: `ConversaDetalheDTO.ConversaGrupoRefGUID` (GUID da Turma ou do GrupoTarefa por trás do grupo) e `MembroDTO.UsuarioNome` (nome do membro, antes só havia `UsuarioCPF`). "Expulsar membro" continua **não sendo** um endpoint desta API — em grupos de Tarefa, o frontend chama `DELETE /api/grupotarefa/:grupoGUID/membros/:cpf` (ver [grupotarefa-api.md](grupotarefa-api.md)); grupos de Turma nunca têm expulsão via chat. Os eventos WebSocket `permissao_atualizada` e `membro_saiu` já existiam no backend e agora também são consumidos pelo frontend do chat (ver [WebSocket Events](#websocket-events)).

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
    "ConversaGrupoRefGUID": "aa0e8400-e29b-41d4-a716-446655440099",
    "Membros": [
      { "UsuarioCPF": "12345678901", "UsuarioNome": "Prof. João", "MembroFuncao": "Representante", "MembroEntradaAt": "2026-02-01T08:00:00.000Z" }
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
        "MensagemEditadaAt": null,
        "Reacoes": [
          { "Emoji": "👍", "Quantidade": 2, "UsuariosCPF": ["111.111.111-11", "222.222.222-22"] }
        ],
        "Leitores": ["111.111.111-11"]
      }
    ],
    "HasMore": false
  }
}
```

> `ConversaGrupoRefGUID` (novo) só é preenchido para `ConversaTipo='Grupo'` (`null` em conversas Individuais) — aponta para `TurmaGUID` ou `GrupoTarefaGUID` conforme `ConversaGrupoTipo`, e é usado pelo frontend para acionar ações do domínio de origem (ex.: expulsar membro de Grupo de Tarefa) a partir da tela de chat. `UsuarioNome` em `Membros[]` e `Reacoes`/`Leitores` em cada mensagem também são novos — ver [Data Models](#data-models).

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
        "MensagemEditadaAt": null,
        "Reacoes": [],
        "Leitores": []
      }
    ],
    "HasMore": true
  }
}
```

> `Reacoes` e `Leitores` (novos) são sempre presentes em todo `MensagemDTO` — `[]` quando não há reação/leitura ainda, nunca `undefined`.

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
    "MensagemEditadaAt": "2026-07-17T10:10:00.000Z",
    "Reacoes": [],
    "Leitores": []
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

### React to Mensagem (toggle)

Reage (ou remove a própria reação) a uma mensagem com um emoji da paleta fixa. **Toggle por par (usuário, emoji)**: se o usuário autenticado ainda não reagiu com aquele emoji nessa mensagem, adiciona; se já reagiu com o mesmo emoji, remove. Um mesmo usuário pode ter múltiplas reações simultâneas e independentes na mesma mensagem (ex.: 👍 e ❤️ ao mesmo tempo) — não existe limite de 1 reação por usuário, nem "troca" de emoji. Disponível também via WebSocket (evento `reagir_mensagem`, ver [WebSocket Events](#websocket-events)), chamando o mesmo `MensagemService.reagir()` e emitindo o mesmo evento `reacao_atualizada`.

**Endpoint:** `POST /api/conversa/:guid/mensagem/:msgGuid/reacao`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `guid` | string | ✅ Yes | UUID da conversa | 36 caracteres |
| `msgGuid` | string | ✅ Yes | UUID da mensagem | 36 caracteres |

**Request Body:**
```json
{ "ReacaoEmoji": "👍" }
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `ReacaoEmoji` | string | ✅ Yes | Emoji da reação | Um dos 6 suportados: `👍 ❤️ 😂 😮 😢 🙏` (`EMOJIS_REACAO_PERMITIDOS`, `backend/repositories/mensagem.repository.ts`) |

**Success Response (200 OK — mesmo quando o resultado é remoção):**
```json
{
  "success": true,
  "message": "Reação atualizada",
  "data": {
    "ConversaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "MensagemGUID": "770e8400-e29b-41d4-a716-446655440002",
    "Reacoes": [
      { "Emoji": "👍", "Quantidade": 2, "UsuariosCPF": ["111.111.111-11", "222.222.222-22"] }
    ],
    "AtorCPF": "222.222.222-22",
    "Acao": "adicionada"
  }
}
```
`Acao` é `"adicionada"` ou `"removida"` (nunca `"trocada"` — cada par usuário+emoji é independente, ver regra de negócio acima).

**Error Responses:**

**400 Bad Request** - `ReacaoEmoji` ausente ou fora da paleta permitida (validado em `ConversaMiddleware.validarReacaoBody`, e novamente no service — defesa em profundidade para o caminho WebSocket, que não passa pelo middleware Express)
```json
{ "success": false, "message": "ReacaoEmoji deve ser um dos suportados: 👍 ❤️ 😂 😮 😢 🙏" }
```

**403 Forbidden** - Não é participante da conversa
```json
{ "success": false, "message": "Você não faz parte desta conversa" }
```

**404 Not Found** - Mensagem não pertence a esta conversa, ou está deletada
```json
{ "success": false, "message": "Mensagem não encontrada nesta conversa" }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/conversa/660e8400-e29b-41d4-a716-446655440001/mensagem/770e8400-e29b-41d4-a716-446655440002/reacao \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "ReacaoEmoji": "👍" }'
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

### `MembroDTO` / `ConversaDetalheDTO` — resposta enriquecida (não são tabelas)

`GET /:guid` (grupo) retorna `Membros: MembroDTO[]` — enriquecido com o nome do usuário via `ConversaGrupoDAO.findMembrosComNome()` (`JOIN usuario`, `backend/repositories/conversa-grupo.repository.ts`), **não** um campo da tabela `conversa_grupo_membro` (que não tem coluna de nome):

```typescript
interface MembroDTO {
  UsuarioCPF: string;
  UsuarioNome: string; // NOVO (2026-07-23) — via JOIN, não é coluna de conversa_grupo_membro
  MembroFuncao: MembroFuncao;
  MembroEntradaAt: string; // ISO 8601
}

interface ConversaDetalheDTO {
  ConversaGUID: string;
  ConversaTipo: 'Individual' | 'Grupo';
  ConversaGrupoNome: string | null;
  ConversaGrupoTipo: 'Turma' | 'Tarefa' | null;
  ConversaGrupoRefGUID: string | null; // NOVO (2026-07-23) — TurmaGUID ou GrupoTarefaGUID; null em conversa Individual
  Membros: MembroDTO[];
  ParceiroCPF: string | null;
  ParceiroNome: string | null;
  TagContextual: string | null;
  MensagensFixadas: MensagemFixadaDTO[];
  Mensagens: MensagemDTO[];
  HasMore: boolean;
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

// NOVO (2026-07-23) — reação (emoji) de um usuário a uma mensagem.
// Múltiplas reações simultâneas e independentes por usuário na mesma
// mensagem (PK composta pelos 3 campos, não só MensagemGUID+UsuarioCPF).
interface MensagemReacao {
  MensagemGUID: string;
  UsuarioCPF: string;
  ReacaoEmoji: '👍' | '❤️' | '😂' | '😮' | '😢' | '🙏';
  ReacaoCreatedAt: Date;
}
```

### `MensagemDTO` — resposta enriquecida (não é uma tabela)

`GET /:guid`, `GET /:guid/mensagem`, `PATCH /:guid/mensagem/:msgGuid` e o evento `nova_mensagem`/`mensagem_editada` retornam a mensagem já enriquecida com os agregados de `mensagem_reacao` e `mensagem_leitura` — calculados em batch no service (`backend/services/mensagem.service.ts`, `backend/services/conversa.service.ts`), nunca colunas persistidas em `mensagem`:

```typescript
interface MensagemReacaoResumo {
  Emoji: string;
  Quantidade: number;
  UsuariosCPF: string[]; // quem reagiu com este emoji
}

interface MensagemDTO {
  MensagemGUID: string;
  ConversaGUID: string;
  MensagemRemetenteCPF: string;
  MensagemConteudo: string;
  MensagemTipo: 'Texto' | 'Arquivo' | 'Imagem';
  MensagemCreatedAt: string;      // ISO 8601
  MensagemEditadaAt: string | null;
  Reacoes: MensagemReacaoResumo[]; // NOVO — sempre presente, [] se não houver reação
  Leitores: string[];              // NOVO — CPFs que já leram, excluindo o remetente; sempre presente, [] se ninguém leu ainda
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

-- NOVO (2026-07-23) — migration backend/database/migrations/2026-07-23-chat-melhorias.sql.
-- Reações múltiplas e independentes por usuário na mesma mensagem — toggle
-- é feito por par (MensagemGUID, UsuarioCPF, ReacaoEmoji), não por usuário só.
CREATE TABLE `mensagem_reacao` (
  `MensagemGUID`     CHAR(36)                                   NOT NULL,
  `UsuarioCPF`       VARCHAR(14)                                NOT NULL,
  `ReacaoEmoji`      ENUM('👍', '❤️', '😂', '😮', '😢', '🙏')   NOT NULL,
  `ReacaoCreatedAt`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MensagemGUID`, `UsuarioCPF`, `ReacaoEmoji`),
  INDEX `idx_mensagemreacao_mensagem` (`MensagemGUID`),
  CONSTRAINT `FK_MensagemReacao_Mensagem` FOREIGN KEY (`MensagemGUID`) REFERENCES `mensagem` (`MensagemGUID`) ON DELETE CASCADE,
  CONSTRAINT `FK_MensagemReacao_Usuario` FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario` (`UsuarioCPF`) ON DELETE CASCADE
);
```

Fonte: `backend/database/sql.txt:421-439` e `backend/database/migrations/2026-07-23-chat-melhorias.sql` (tabela `mensagem_reacao`, PK composta `(MensagemGUID, UsuarioCPF, ReacaoEmoji)` — reflete múltiplas reações simultâneas e independentes por usuário na mesma mensagem); demais tabelas em `backend/database/sql.txt`.

---

## WebSocket Events

Este módulo REST convive com uma camada WebSocket (`backend/websocket/conversa.handler.ts`, registrado via `backend/websocket/SocketServer`) responsável pelo envio de mensagens em tempo real e pela emissão de eventos de broadcast para os clientes conectados à room da conversa (`io.to(ConversaGUID)`/`SocketServer.emit(conversaGUID, ...)`). A tabela abaixo cobre os eventos relevantes para este recurso — não é uma documentação completa da camada WS (fora do escopo de rotas HTTP), mas os eventos ligados a Reações, Recibo de Leitura e Gestão de Grupo passaram a ser tratados explicitamente aqui porque **são regra de negócio, não detalhe de implementação**.

| Direção | Evento | Payload | Emitido por | Consumo no frontend |
|---|---|---|---|---|
| Client → Server | `reagir_mensagem` | `{ ConversaGUID, MensagemGUID, ReacaoEmoji }` | — (recebido) | **NOVO (2026-07-23)** — equivalente WebSocket do `POST .../reacao`; chama o mesmo `MensagemService.reagir()` |
| Server → Client | `reacao_atualizada` | `{ ConversaGUID, MensagemGUID, Reacoes: MensagemReacaoResumo[], AtorCPF, Acao: 'adicionada' \| 'removida' }` | `MensagemService.reagir()` (tanto via REST quanto via WS) | **NOVO (2026-07-23)** — consumido pelo chat para atualizar os chips de reação da mensagem em tempo real |
| Server → Client | `mensagem_lida` | `{ ConversaGUID, UsuarioCPF, LidaAt }` | `conversa.handler.ts` (handler `mark_as_read`), sem mudança de payload | Já existia no backend; **agora também consumido pelo frontend (atualizado 2026-07-23)** — ao receber, o chat aplica um patch client-side: toda mensagem já carregada com remetente diferente de `UsuarioCPF` e `MensagemCreatedAt <= LidaAt` ganha esse CPF em `Leitores`, sem nova requisição |
| Server → Client | `permissao_atualizada` | `{ ConversaGUID, UsuarioCPF, NovaFuncao }` | `ConversaPermissaoService` (4 métodos de Representante/Vice-Representante) | Já existia no backend; **agora também consumido pelo frontend (atualizado 2026-07-23)** — a tela de gestão de grupo re-busca a conversa inteira (`GET /:guid`) ao receber, em vez de aplicar patch pontual (o backend não emite evento para os efeitos colaterais de rebaixamento, ver Business Rules #7) |
| Server → Client | `membro_saiu` | `{ ConversaGUID, UsuarioCPF }` | `ConversaGrupoService` (emitido quando um membro é expulso de Grupo de Tarefa via `DELETE /api/grupotarefa/:grupoGUID/membros/:cpf`, ou sai do grupo) | Já existia no backend; **agora também consumido pelo frontend (atualizado 2026-07-23)** — a tela de gestão de grupo re-busca a lista de membros ao receber |
| Server → Client | `mensagem_deletada` / `mensagem_editada` / `mensagem_fixada` / `mensagem_desafixada` | Ver Business Rules #10 | `MensagemService` | Já existia e já era consumido |
| Server → Client | `nova_mensagem` | `MensagemDTO` (com `Reacoes`/`Leitores` já presentes, ambos `[]` para mensagem recém-criada) | `conversa.handler.ts` (handler `send_mensagem` → `MensagemService.enviar()`) | Já existia e já era consumido |

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
10. **Todas as mudanças de estado emitem eventos WebSocket** (`mensagem_deletada`, `mensagem_editada`, `mensagem_fixada`, `mensagem_desafixada`, `permissao_atualizada`, `reacao_atualizada`, `mensagem_lida`, `membro_saiu`) para os clientes conectados àquela conversa via `SocketServer.emit`/`io.to(ConversaGUID)` — ver [WebSocket Events](#websocket-events).
11. **Envio de mensagem de texto não é REST** — não existe `POST /:guid/mensagem`; `MensagemService.enviar` é chamado a partir do handler de WebSocket (fora do escopo desta documentação de rotas HTTP).
12. **Reagir a mensagem é ação de qualquer participante, sem hierarquia** (`MensagemService.reagir()`) — diferente de fixar/desafixar/deletar mensagem de terceiro, que exigem papel (Líder/Representante/Vice-Representante) em grupo. Só exige `ConversaDAO.isParticipante` e mensagem existente/não deletada, mesma checagem usada em editar/deletar/fixar.
13. **Reação — múltiplas simultâneas, toggle por par (usuário, emoji)** — um usuário pode reagir com vários emojis diferentes na mesma mensagem ao mesmo tempo (`mensagem_reacao`, PK composta `(MensagemGUID, UsuarioCPF, ReacaoEmoji)`). Reagir de novo com o mesmo emoji remove só aquela reação (`MensagemDAO.toggleReacao`); não existe "trocar" de emoji (cada par é independente).
14. **Emoji restrito à paleta fixa** (`👍 ❤️ 😂 😮 😢 🙏`), validado em duas camadas: `ConversaMiddleware.validarReacaoBody` (400, caminho REST) e novamente no service/`ENUM` do MySQL (defesa em profundidade — protege também o caminho WebSocket, que não passa pelo middleware Express).
15. **Reagir não exige `ConversaStatus='Ativa'`** — por paridade com fixar/editar/deletar (nenhuma dessas ações valida o status da conversa; só `enviar()` faz essa checagem). Reagir a mensagem de conversa/grupo já encerrado permanece possível.
16. **Reagir não dispara notificação in-app** — por paridade com fixar/desafixar (que também não chamam `getNotificacaoService().disparar()`); só `enviar()` notifica.
17. **`Leitores` é agregado de `mensagem_leitura`, não um cursor por conversa** — `mensagem_leitura` já era granular por par `(MensagemGUID, UsuarioCPF)`; `MensagemDTO.Leitores` é o resultado de agregar essas linhas por mensagem, excluindo o remetente (`MensagemDAO.findLeitoresPorMensagens`/`agruparLeitoresPorMensagem`). Aplica-se tanto a conversas Individuais quanto a Grupo (sem distinção de `ConversaTipo` no backend — a distinção de renderização, se houver, é decisão de frontend).
18. **`ConversaGrupoRefGUID` e `UsuarioNome` são enriquecimentos aditivos, sem regra de autorização nova** — só passam a ser expostos por `ConversaService.buscarConversa()`; a autorização de quem pode ver a conversa continua sendo a mesma checagem de `isParticipante` (regra #2).

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
| 400 | `ReacaoEmoji` deve ser um dos suportados: 👍 ❤️ 😂 😮 😢 🙏 | Emoji ausente ou fora da paleta fixa (`validarReacaoBody`, e novamente no service) |
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

### Cenário 4: Reagir e depois remover a mesma reação (toggle)
```bash
POST /api/conversa/660e8400-e29b-41d4-a716-446655440001/mensagem/770e8400-e29b-41d4-a716-446655440002/reacao
{ "ReacaoEmoji": "👍" }
# Response 200, Acao="adicionada", Reacoes=[{ "Emoji": "👍", "Quantidade": 1, "UsuariosCPF": ["222.222.222-22"] }]

POST /api/conversa/660e8400-e29b-41d4-a716-446655440001/mensagem/770e8400-e29b-41d4-a716-446655440002/reacao
{ "ReacaoEmoji": "👍" }
# Response 200, Acao="removida", Reacoes=[]
```

### Cenário 5: Emoji fora da paleta suportada (❌ Erro)
```bash
POST /api/conversa/660e8400-e29b-41d4-a716-446655440001/mensagem/770e8400-e29b-41d4-a716-446655440002/reacao
{ "ReacaoEmoji": "🔥" }

Response 400:
{ "success": false, "message": "ReacaoEmoji deve ser um dos suportados: 👍 ❤️ 😂 😮 😢 🙏" }
```

---

## Integration with Other Entities

- **Conversa (Grupo/Tarefa) → GrupoTarefa**: conversas de grupo de Tarefa são criadas/mantidas por `ConversaGrupoService`, chamado a partir de `GrupoTarefaService` — ver [grupotarefa-api.md](grupotarefa-api.md).
- **Conversa (Grupo/Turma) → Turma**: `ConversaGrupoRefGUID` aponta para `TurmaGUID` — ver [turma-api.md](turma-api.md).
- **Conversa → Matricula/EscolaxUsuarioxFuncao**: verificação de Coordenação/Direção usa `escolaxusuarioxfuncao.isCoordOuDirecaoEmEscola` — ver [escolaxusuarioxfuncao-api.md](escolaxusuarioxfuncao-api.md).

---

## Notes

- Este módulo tem uma camada WebSocket paralela (`backend/websocket/SocketServer`, handlers em `backend/websocket/conversa.handler.ts`) responsável pelo envio de mensagens em tempo real e pela emissão dos eventos citados nas Business Rules — cobertura resumida em [WebSocket Events](#websocket-events) (não é documentação completa da camada WS, que segue fora do escopo de rotas HTTP/REST).
- `MembroFuncao` no schema de referência (`sql.txt`) só lista `Membro`/`Lider`; o código usa também `Representante`/`Vice-Representante` — ver nota ⚠️ no schema acima.
- Datas retornadas em ISO 8601.
- **Reações (2026-07-23):** modelo é múltiplas reações simultâneas por usuário (estilo Discord), não single-reaction — decisão de negócio confirmada pelo usuário, documentada em `docs/PLANO_IMPLEMENTACAO_CHAT_MELHORIAS.md`, seção 1.1, item 1 (substitui a recomendação original da seção 1, que era single-reaction).
- **Recibo de leitura (2026-07-23):** `MensagemDTO.Leitores` cobre Individual **e** Grupo (decisão de negócio confirmada pelo usuário, `docs/PLANO_IMPLEMENTACAO_CHAT_MELHORIAS.md`, seção 1.1, item 2 — diverge da recomendação original da seção 1, que restringia a Individual e usava um campo de cursor `UltimaLeituraParceiro` no `ConversaDetalheDTO`, nunca implementado).
- **"Kick" de membro de grupo (2026-07-23):** já existia antes desta rodada de melhorias (`GrupoTarefaService.expulsarMembro`, só em Grupo de Tarefa, só o Líder) e não é endpoint desta API — ver `docs/PLANO_IMPLEMENTACAO_CHAT_MELHORIAS.md`, seção 1.1, item 3, e [grupotarefa-api.md](grupotarefa-api.md). Grupos de Turma nunca têm expulsão via chat.
