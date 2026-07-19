# API Documentation - Grupo de Tarefa (GrupoTarefa)

**Version:** 1.0.0
**Base URL:** `/api/grupotarefa`
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [List Grupos da Tarefa](#list-grupos-da-tarefa)
  - [Get Grupo by ID](#get-grupo-by-id)
  - [Update Nome do Grupo](#update-nome-do-grupo)
  - [Expel Membro](#expel-membro)
  - [Transfer Liderança](#transfer-liderança)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)
- [Examples](#examples)
- [Integration with Other Entities](#integration-with-other-entities)
- [Notes](#notes)

---

## Overview

API para gerenciamento dos **grupos formados dentro de uma tarefa compartilhada** (`TarefaAcademica.TarefaCompartilhada=true` — ver [tarefaacademica-api.md](tarefaacademica-api.md)). Não existe endpoint de criação manual de grupo nesta API: um grupo é sempre criado automaticamente pelo backend, **um grupo por aluno, com o próprio aluno como líder**, no momento em que a tarefa compartilhada é atribuída a uma turma (`GrupoTarefaService.criarGruposAutomaticos`, chamado a partir do fluxo de criação de tarefa). Os alunos então se juntam em grupos maiores usando convites/solicitações — ver [convitegrupotarefa-api.md](convitegrupotarefa-api.md).

**Conceito:**
- `GrupoTarefa` pertence a uma `TarefaGUID` + `TurmaGUID`, tem um único `UsuarioCPFLider` e um `GrupoNome` opcional.
- Membros (além do líder) ficam em `usuarioxgrupotarefa`.
- Toda ação relevante (expulsão, transferência de liderança, entrada) é registrada em um histórico (`HistoricoGrupoTarefaService`), não exposto diretamente por rota própria.
- Este módulo se integra com o módulo de Conversa: cada grupo tem uma conversa de grupo associada (criada/atualizada via `ConversaGrupoService`) — ver [conversa-api.md](conversa-api.md).

**Permissões:**
- **Líder do grupo**: pode renomear o grupo, expulsar membros e transferir a liderança.
- **Membro do grupo**: pode visualizar o grupo (`GET /grupo/:grupoGUID`).
- Qualquer usuário autenticado pode listar os grupos de uma tarefa (`GET /:tarefaGUID`) — a rota **não** restringe a alunos matriculados na tarefa (ver Business Rules).

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
  "message": "Descrição do erro"
}
```

---

## Endpoints

### List Grupos da Tarefa

Lista todos os grupos formados para uma tarefa compartilhada, cada um já com a lista de membros.

**Endpoint:** `GET /api/grupotarefa/:tarefaGUID`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `tarefaGUID` | string | ✅ Yes | UUID da tarefa | UUID v4 |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Grupos listados com sucesso",
  "data": {
    "grupos": [
      {
        "GrupoTarefaGUID": "aa0e8400-e29b-41d4-a716-446655440001",
        "TarefaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
        "UsuarioCPFLider": "12345678901",
        "NomeLider": "João Silva",
        "GrupoNome": "Equipe Alfa",
        "Membros": [
          { "UsuarioCPF": "12345678901", "UsuarioNome": "João Silva", "DataEntrada": "2026-07-15T10:00:00.000Z", "IsLider": true },
          { "UsuarioCPF": "98765432100", "UsuarioNome": "Maria Souza", "DataEntrada": "2026-07-16T09:00:00.000Z", "IsLider": false }
        ],
        "TotalMembros": 2,
        "LimiteMaximo": 4,
        "PodeConvidar": true,
        "CreatedAt": "2026-07-15T10:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

**Error Responses:**

**400 Bad Request** - GUID inválido
```json
{ "success": false, "message": "Erro na validação de dados", "details": { "message": "O parâmetro 'tarefaGUID' deve ser um UUID válido." } }
```

**404 Not Found** - Tarefa não encontrada
```json
{ "success": false, "message": "Tarefa não encontrada" }
```

**401 Unauthorized**
```json
{ "success": false, "message": "Não autenticado" }
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/grupotarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Get Grupo by ID

Busca um grupo específico, com a lista completa de membros. Só acessível a quem pertence ao grupo (líder ou membro).

**Endpoint:** `GET /api/grupotarefa/grupo/:grupoGUID`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grupoGUID` | string | ✅ Yes | UUID do grupo |

**Success Response (200 OK):** mesmo formato de item de `grupos[]` acima, embrulhado em `data.grupo`.

**Error Responses:**

**400 Bad Request** - GUID inválido

**403 Forbidden** - Usuário não pertence ao grupo
```json
{ "success": false, "message": "Você não tem acesso a este grupo" }
```

**404 Not Found**
```json
{ "success": false, "message": "Grupo não encontrado" }
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/grupotarefa/grupo/aa0e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Update Nome do Grupo

Renomeia o grupo. Apenas o líder.

**Endpoint:** `PATCH /api/grupotarefa/:grupoGUID/nome`

**Request Body:**
```json
{ "GrupoNome": "Equipe Alfa" }
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `GrupoNome` | string | ✅ Yes | Novo nome do grupo | 1-128 caracteres |

**Success Response (200 OK):**
```json
{ "success": true, "message": "Nome do grupo atualizado com sucesso", "data": null }
```

**Error Responses:**

**400 Bad Request** - Nome ausente/tamanho inválido
```json
{ "success": false, "message": "Erro na validação de dados", "details": { "message": "O campo 'GrupoNome' deve ter entre 1 e 128 caracteres." } }
```

**403 Forbidden** - Não é o líder
```json
{ "success": false, "message": "Apenas o líder pode alterar o nome do grupo" }
```

**404 Not Found**
```json
{ "success": false, "message": "Grupo não encontrado" }
```

**cURL Example:**
```bash
curl -X PATCH https://api.example.com/api/grupotarefa/aa0e8400-e29b-41d4-a716-446655440001/nome \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "GrupoNome": "Equipe Alfa" }'
```

---

### Expel Membro

Remove um membro do grupo. O membro expulso automaticamente recebe um **novo grupo individual próprio** (com ele mesmo como líder), continuando apto a ser convidado/solicitar entrada em outro grupo depois. Operação transacional.

**Endpoint:** `DELETE /api/grupotarefa/:grupoGUID/membros/:cpf`

**URL Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `grupoGUID` | string | ✅ Yes | UUID do grupo | UUID v4 |
| `cpf` | string | ✅ Yes | CPF do membro a expulsar | 11 dígitos |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Membro expulso com sucesso",
  "data": { "novoGrupoGUID": "bb1e8400-e29b-41d4-a716-446655440002" }
}
```

**Error Responses:**

**400 Bad Request** - Líder tentando expulsar a si mesmo
```json
{ "success": false, "message": "Líder não pode expulsar a si mesmo" }
```

**403 Forbidden** - Quem chama não é o líder
```json
{ "success": false, "message": "Apenas o líder pode expulsar membros" }
```

**404 Not Found** - Grupo não encontrado, ou CPF não é membro (não-líder) do grupo
```json
{ "success": false, "message": "Usuário não é membro deste grupo" }
```

**cURL Example:**
```bash
curl -X DELETE https://api.example.com/api/grupotarefa/aa0e8400-e29b-41d4-a716-446655440001/membros/98765432100 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Transfer Liderança

Transfere a liderança do grupo para outro membro. Operação transacional: o líder antigo vira membro comum, o novo líder deixa de aparecer em `usuarioxgrupotarefa` (passa a ser identificado só pelo campo `UsuarioCPFLider`).

**Endpoint:** `PATCH /api/grupotarefa/:grupoGUID/transferir-lider`

**Request Body:**
```json
{ "NovoLiderCPF": "98765432100" }
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `NovoLiderCPF` | string | ✅ Yes | CPF do novo líder | 11 dígitos; deve já ser membro (não-líder) do grupo |

**Success Response (200 OK):**
```json
{ "success": true, "message": "Liderança transferida com sucesso", "data": null }
```

**Error Responses:**

**400 Bad Request** - Novo líder não é membro do grupo
```json
{ "success": false, "message": "Novo líder deve ser um membro do grupo" }
```

**403 Forbidden** - Quem chama não é o líder atual
```json
{ "success": false, "message": "Apenas o líder pode transferir a liderança" }
```

**404 Not Found**
```json
{ "success": false, "message": "Grupo não encontrado" }
```

**cURL Example:**
```bash
curl -X PATCH https://api.example.com/api/grupotarefa/aa0e8400-e29b-41d4-a716-446655440001/transferir-lider \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "NovoLiderCPF": "98765432100" }'
```

---

## Data Models

### GrupoTarefa Entity

```typescript
interface GrupoTarefa {
  GrupoTarefaGUID: string;
  TarefaGUID: string;         // FK para tarefaacademica (TarefaCompartilhada=true)
  TurmaGUID: string;          // FK para turma
  UsuarioCPFLider: string;    // líder atual
  GrupoNome: string | null;   // até 128 caracteres
  CreatedAt: Date;
  UpdatedAt: Date;
}

interface GrupoTarefaComMembrosDTO {
  GrupoTarefaGUID: string;
  TarefaGUID: string;
  TurmaGUID: string;
  UsuarioCPFLider: string;
  NomeLider: string;
  GrupoNome: string | null;
  Membros: MembroGrupoDTO[];  // não inclui o líder
  TotalMembros: number;       // membros + líder
  LimiteMaximo: number;       // TarefaMaxPessoas da tarefa
  PodeConvidar: boolean;      // true se TotalMembros < LimiteMaximo
  CreatedAt: Date;
}

interface MembroGrupoDTO {
  UsuarioCPF: string;
  UsuarioNome: string;
  DataEntrada: Date;
  IsLider: boolean;
}
```

### Database Schema (⚠️ A confirmar: `CREATE TABLE` de `grupotarefa` e `usuarioxgrupotarefa` não localizado em `sql.txt`/`migrations/` — schema inferido do código)

```sql
CREATE TABLE grupotarefa (
  GrupoTarefaGUID CHAR(36) NOT NULL PRIMARY KEY,
  TarefaGUID CHAR(36) NOT NULL,
  TurmaGUID CHAR(36) NOT NULL,
  UsuarioCPFLider CHAR(11) NOT NULL,
  GrupoNome VARCHAR(128) NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (TarefaGUID) REFERENCES tarefaacademica(TarefaGUID),
  FOREIGN KEY (TurmaGUID) REFERENCES turma(TurmaGUID),
  FOREIGN KEY (UsuarioCPFLider) REFERENCES usuario(UsuarioCPF)
);

CREATE TABLE usuarioxgrupotarefa (
  GrupoTarefaGUID CHAR(36) NOT NULL,
  UsuarioCPF CHAR(11) NOT NULL,
  DataEntrada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (GrupoTarefaGUID, UsuarioCPF),

  FOREIGN KEY (GrupoTarefaGUID) REFERENCES grupotarefa(GrupoTarefaGUID),
  FOREIGN KEY (UsuarioCPF) REFERENCES usuario(UsuarioCPF)
);
```

---

## Business Rules

1. **1 aluno = 1 grupo próprio ao ser atribuído a uma tarefa compartilhada** — `GrupoTarefaService.criarGruposAutomaticos` cria, para cada matrícula de cada turma alvo, um grupo com o aluno como único líder (`backend/services/grupotarefa.service.ts`). Não há endpoint de criação manual de grupo nesta API.
2. **Grupo nunca fica "vazio"** — ao expulsar um membro, ele imediatamente recebe um novo grupo individual (não deleta o vínculo do aluno com a tarefa) (`GrupoTarefaService.expulsarMembro`).
3. **Líder não pode se expulsar** — para "sair" do próprio grupo, o fluxo esperado é o líder transferir a liderança e depois usar o mecanismo de convite/solicitação (ver [convitegrupotarefa-api.md](convitegrupotarefa-api.md)).
4. **Transferência de liderança é atômica** — remove o novo líder de `usuarioxgrupotarefa`, adiciona o líder antigo lá, e atualiza `grupotarefa.UsuarioCPFLider`, tudo em uma transação (`GrupoTarefaService.transferirLideranca`).
5. **Renomear é exclusivo do líder** — `PATCH .../nome` valida `grupo.UsuarioCPFLider === usuarioCPF`.
6. **Ações relevantes geram histórico** — expulsão (`Expulsao`) e transferência (`TransferenciaLider`) são registradas via `HistoricoGrupoTarefaService.registrar`, incluindo ator, alvo e detalhes (ex.: `novoGrupoGUID` na expulsão) — não há endpoint de leitura desse histórico nesta API.
7. **Integração com Conversa** — quando configurado (`ConversaGrupoService`), expulsão e transferência de liderança também atualizam a conversa de grupo associada (remoção de participante, sincronização de papel) — ver [conversa-api.md](conversa-api.md).
8. **`GET /:tarefaGUID` não restringe por matrícula** — diferente de `GET /grupo/:grupoGUID` (que exige pertencer ao grupo), a listagem de todos os grupos de uma tarefa não verifica se o usuário autenticado está matriculado nela — ⚠️ A confirmar: possível lacuna de autorização (o parâmetro `usuarioCPF` é recebido pelo service mas não usado para restringir o resultado).

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | Erro na validação de dados — `tarefaGUID`/`grupoGUID`/`cpf` inválido | Parâmetro de rota mal formatado |
| 400 | `GrupoNome` obrigatório ou fora de 1-128 caracteres | Falha de validação do middleware |
| 400 | `NovoLiderCPF` obrigatório ou fora de 11 dígitos | Falha de validação do middleware |
| 400 | Líder não pode expulsar a si mesmo | `cpf` do path igual ao líder |
| 400 | Novo líder deve ser um membro do grupo | CPF informado não é membro não-líder do grupo |
| 401 | Não autenticado | Token ausente/inválido |
| 403 | Você não tem acesso a este grupo | `GET /grupo/:guid` por quem não é membro/líder |
| 403 | Apenas o líder pode alterar o nome do grupo / expulsar membros / transferir a liderança | Ação restrita ao líder feita por outro usuário |
| 404 | Tarefa não encontrada | `tarefaGUID` inexistente |
| 404 | Grupo não encontrado | `grupoGUID` inexistente |
| 404 | Usuário não é membro deste grupo | `cpf` de expulsão não pertence ao grupo (ou é o próprio líder) |

---

## Examples

### Cenário 1: Líder renomeia o grupo
```bash
PATCH /api/grupotarefa/aa0e8400-e29b-41d4-a716-446655440001/nome
{ "GrupoNome": "Equipe Alfa" }
# Response 200
```

### Cenário 2: Líder expulsa um membro
```bash
DELETE /api/grupotarefa/aa0e8400-e29b-41d4-a716-446655440001/membros/98765432100
# Response 200, membro expulso recebe grupo próprio (novoGrupoGUID)
```

### Cenário 3: Membro comum tenta expulsar alguém (❌ Erro)
```bash
DELETE /api/grupotarefa/aa0e8400-e29b-41d4-a716-446655440001/membros/11122233344
# usuário autenticado não é o líder

Response 403:
{ "success": false, "message": "Apenas o líder pode expulsar membros" }
```

---

## Integration with Other Entities

- **GrupoTarefa → TarefaAcademica**: só existe para tarefas com `TarefaCompartilhada=true` — ver [tarefaacademica-api.md](tarefaacademica-api.md).
- **GrupoTarefa ↔ ConviteGrupoTarefa**: entrada/saída de membros passa pelo fluxo de convites/solicitações — ver [convitegrupotarefa-api.md](convitegrupotarefa-api.md).
- **GrupoTarefa → Conversa**: cada grupo tem uma conversa de grupo espelhada, criada/mantida por `ConversaGrupoService` — ver [conversa-api.md](conversa-api.md).
- **GrupoTarefa → Turma**: grupos são criados por turma (`TurmaGUID`), refletindo o vínculo do aluno via `matricula.TurmaGUID` — ver [turma-api.md](turma-api.md).

---

## Notes

- Não há endpoint `POST /api/grupotarefa` — grupos só nascem automaticamente da criação de uma tarefa compartilhada.
- `LimiteMaximo`/`PodeConvidar` no DTO de detalhe do grupo refletem `TarefaMaxPessoas` da tarefa associada, calculados no momento da consulta.
- Todas as datas são retornadas em ISO 8601.
