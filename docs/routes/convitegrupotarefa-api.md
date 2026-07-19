# API Documentation - Convite de Grupo de Tarefa (ConviteGrupoTarefa)

**Version:** 1.0.0
**Base URL:** `/api/convitegrupotarefa`
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Enviar Convite (Líder → Aluno)](#enviar-convite-líder--aluno)
  - [Solicitar Entrada (Aluno → Grupo)](#solicitar-entrada-aluno--grupo)
  - [List Pendentes](#list-pendentes)
  - [Aceitar Convite/Solicitação](#aceitar-convitesolicitação)
  - [Recusar Convite/Solicitação](#recusar-convitesolicitação)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)
- [Examples](#examples)
- [Integration with Other Entities](#integration-with-other-entities)
- [Notes](#notes)

---

## Overview

API para o fluxo de **entrada de alunos em grupos de tarefa compartilhada** (ver [grupotarefa-api.md](grupotarefa-api.md)), nos dois sentidos possíveis:
- **Convite**: o líder de um grupo convida um aluno específico.
- **Solicitação**: um aluno (sozinho no próprio grupo, ainda sem entrar em nenhum outro) solicita entrada em um grupo já existente.

Ambos os fluxos usam a mesma entidade (`ConviteGrupoTarefa`), diferenciada pelo campo `ConviteTipo` (`Convite` ou `Solicitacao`), e o mesmo par de ações de resposta (`aceitar`/`recusar`) — quem responde muda conforme o tipo: convite é respondido pelo convidado, solicitação é respondida pelo líder.

**Permissões:**
- **Enviar convite**: apenas o líder do grupo-alvo.
- **Solicitar entrada**: qualquer aluno autenticado (a validação de que ele está "sozinho" no próprio grupo está marcada como `TODO` no código atual — ver Business Rules).
- **Aceitar/Recusar convite**: apenas o próprio convidado (`UsuarioCPFConvidado`).
- **Aceitar/Recusar solicitação**: apenas o líder do grupo-alvo da solicitação.
- **Listar pendentes**: qualquer usuário autenticado vê apenas os convites/solicitações relevantes para ele (ver `ConviteGrupoTarefaDAO.findAllComDetalhes`).

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

### Enviar Convite (Líder → Aluno)

O líder de um grupo convida um aluno específico para entrar.

**Endpoint:** `POST /api/convitegrupotarefa/:grupoGUID/convites`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `grupoGUID` | string | ✅ Yes | UUID do grupo que está convidando | UUID v4 |

**Request Body:**
```json
{ "UsuarioCPFConvidado": "98765432100" }
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `UsuarioCPFConvidado` | string | ✅ Yes | CPF do aluno convidado | 11 dígitos |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Convite enviado com sucesso",
  "data": {
    "convite": {
      "ConviteGUID": "cc2e8400-e29b-41d4-a716-446655440003",
      "GrupoTarefaGUID": "aa0e8400-e29b-41d4-a716-446655440001",
      "UsuarioCPFConvidado": "98765432100",
      "ConviteTipo": "Convite",
      "ConviteStatus": "Pendente",
      "CreatedAt": "2026-07-17T10:00:00.000Z",
      "UpdatedAt": "2026-07-17T10:00:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - `UsuarioCPFConvidado` ausente/inválido (middleware)
```json
{ "success": false, "message": "Erro na validação de dados", "details": { "message": "O campo 'UsuarioCPFConvidado' deve ter 11 dígitos numéricos." } }
```

**400 Bad Request** - Convidado já é membro do grupo (service)
```json
{ "success": false, "message": "Usuário já é membro do grupo" }
```

**403 Forbidden** - Quem envia não é o líder
```json
{ "success": false, "message": "Apenas o líder pode enviar convites" }
```

**404 Not Found** - Grupo não encontrado
```json
{ "success": false, "message": "Grupo não encontrado" }
```

**409 Conflict** - Já existe convite/solicitação pendente para esse usuário nesse grupo
```json
{ "success": false, "message": "Já existe um convite pendente para este usuário" }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/convitegrupotarefa/aa0e8400-e29b-41d4-a716-446655440001/convites \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "UsuarioCPFConvidado": "98765432100" }'
```

---

### Solicitar Entrada (Aluno → Grupo)

Um aluno solicita entrada em um grupo já existente (não precisa ser convidado).

**Endpoint:** `POST /api/convitegrupotarefa/:grupoGUID/solicitacoes`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grupoGUID` | string | ✅ Yes | UUID do grupo em que se deseja entrar |

**Request Body:** nenhum (o solicitante é sempre o usuário do token).

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Solicitação enviada com sucesso",
  "data": {
    "solicitacao": {
      "ConviteGUID": "dd3e8400-e29b-41d4-a716-446655440004",
      "GrupoTarefaGUID": "aa0e8400-e29b-41d4-a716-446655440001",
      "UsuarioCPFConvidado": "11122233344",
      "ConviteTipo": "Solicitacao",
      "ConviteStatus": "Pendente",
      "CreatedAt": "2026-07-17T10:05:00.000Z",
      "UpdatedAt": "2026-07-17T10:05:00.000Z"
    }
  }
}
```

**Error Responses:**

**404 Not Found** - Grupo não encontrado
```json
{ "success": false, "message": "Grupo não encontrado" }
```

**409 Conflict** - Já existe solicitação pendente
```json
{ "success": false, "message": "Já existe uma solicitação pendente" }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/convitegrupotarefa/aa0e8400-e29b-41d4-a716-446655440001/solicitacoes \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

> ⚠️ A confirmar: a validação de que o solicitante está "sozinho" no próprio grupo (pré-condição de negócio documentada no cabeçalho do controller/roteador) está marcada como `// TODO: Implementar validação completa` em `ConviteGrupoTarefaService.solicitarEntrada` — atualmente não é aplicada.

---

### List Pendentes

Lista todos os convites e solicitações pendentes relevantes para o usuário autenticado (convites recebidos por ele, e solicitações recebidas por grupos onde ele é líder).

**Endpoint:** `GET /api/convitegrupotarefa/pendentes`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Convites listados com sucesso",
  "data": {
    "convites": [
      {
        "ConviteGUID": "cc2e8400-e29b-41d4-a716-446655440003",
        "GrupoTarefaGUID": "aa0e8400-e29b-41d4-a716-446655440001",
        "GrupoNome": "Equipe Alfa",
        "LiderCPF": "12345678901",
        "LiderNome": "João Silva",
        "UsuarioCPFConvidado": "98765432100",
        "NomeConvidado": "Maria Souza",
        "ConviteTipo": "Convite",
        "ConviteStatus": "Pendente",
        "TarefaTitulo": "Trabalho em grupo - Revolução Industrial",
        "TarefaPrazoData": "2026-08-10T23:59:59.000Z",
        "TotalMembros": 1,
        "MaxPessoas": 4,
        "CreatedAt": "2026-07-17T10:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

**Error Responses:**

**401 Unauthorized**
```json
{ "success": false, "message": "Não autenticado" }
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/convitegrupotarefa/pendentes \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Aceitar Convite/Solicitação

Aceita um convite (respondido pelo convidado) ou uma solicitação (respondida pelo líder do grupo). Ao aceitar, o usuário é adicionado a `usuarioxgrupotarefa` do grupo-alvo. Operação transacional.

**Endpoint:** `PATCH /api/convitegrupotarefa/:conviteGUID/aceitar`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conviteGUID` | string | ✅ Yes | UUID do convite/solicitação |

**Success Response (200 OK):**
```json
{ "success": true, "message": "Convite aceito com sucesso", "data": null }
```
ou, para solicitação:
```json
{ "success": true, "message": "Solicitacao aceito com sucesso", "data": null }
```

**Error Responses:**

**400 Bad Request** - Convite já respondido/expirado
```json
{ "success": false, "message": "Convite não está mais pendente" }
```

**403 Forbidden** - Convidado tentando aceitar convite de outra pessoa, ou não-líder tentando aceitar solicitação
```json
{ "success": false, "message": "Você não pode aceitar este convite" }
```
```json
{ "success": false, "message": "Apenas o líder pode aceitar solicitações" }
```

**404 Not Found** - Convite ou grupo não encontrado
```json
{ "success": false, "message": "Convite não encontrado" }
```

**cURL Example:**
```bash
curl -X PATCH https://api.example.com/api/convitegrupotarefa/cc2e8400-e29b-41d4-a716-446655440003/aceitar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Recusar Convite/Solicitação

Recusa um convite ou solicitação. Mesma lógica de autorização de `aceitar`, mas sem alterar `usuarioxgrupotarefa`.

**Endpoint:** `PATCH /api/convitegrupotarefa/:conviteGUID/recusar`

**Success Response (200 OK):**
```json
{ "success": true, "message": "Convite recusado", "data": null }
```

**Error Responses:** mesmas de `aceitar` (400 status não-pendente, 403 autorização, 404 não encontrado).

**cURL Example:**
```bash
curl -X PATCH https://api.example.com/api/convitegrupotarefa/cc2e8400-e29b-41d4-a716-446655440003/recusar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Data Models

### ConviteGrupoTarefa Entity

```typescript
type ConviteTipo = 'Convite' | 'Solicitacao';
type ConviteStatus = 'Pendente' | 'Aceito' | 'Recusado' | 'Expirado';

interface ConviteGrupoTarefa {
  ConviteGUID: string;
  GrupoTarefaGUID: string;         // FK para grupotarefa
  UsuarioCPFConvidado: string;     // convidado (Convite) ou solicitante (Solicitacao)
  ConviteTipo: ConviteTipo;
  ConviteStatus: ConviteStatus;
  CreatedAt: Date;
  UpdatedAt: Date;
}

interface ConviteGrupoTarefaDTO {
  ConviteGUID: string;
  GrupoTarefaGUID: string;
  GrupoNome: string | null;
  LiderCPF: string;
  LiderNome: string;
  UsuarioCPFConvidado: string;
  NomeConvidado: string;
  ConviteTipo: ConviteTipo;
  ConviteStatus: ConviteStatus;
  TarefaTitulo: string;
  TarefaPrazoData: string;
  TotalMembros: number;
  MaxPessoas: number;
  CreatedAt: Date;
}
```

### Database Schema (⚠️ A confirmar: `CREATE TABLE` de `convitegrupotarefa` não localizado em `sql.txt`/`migrations/` — schema inferido do código)

```sql
CREATE TABLE convitegrupotarefa (
  ConviteGUID CHAR(36) NOT NULL PRIMARY KEY,
  GrupoTarefaGUID CHAR(36) NOT NULL,
  UsuarioCPFConvidado CHAR(11) NOT NULL,
  ConviteTipo ENUM('Convite','Solicitacao') NOT NULL,
  ConviteStatus ENUM('Pendente','Aceito','Recusado','Expirado') NOT NULL DEFAULT 'Pendente',
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (GrupoTarefaGUID) REFERENCES grupotarefa(GrupoTarefaGUID),
  FOREIGN KEY (UsuarioCPFConvidado) REFERENCES usuario(UsuarioCPF)
);
```

---

## Business Rules

1. **Dois fluxos, uma entidade** — `ConviteTipo='Convite'` (líder → aluno) e `ConviteTipo='Solicitacao'` (aluno → grupo) compartilham a tabela e os endpoints de resposta (`aceitar`/`recusar`), mas têm regras de autorização opostas: convite é aceito/recusado pelo `UsuarioCPFConvidado`; solicitação é aceita/recusada pelo `UsuarioCPFLider` do grupo (`ConviteGrupoTarefaService.aceitar`/`recusar`).
2. **Sem duplicidade pendente** — `existeConvitePendente(grupoGUID, cpf)` bloqueia novo convite/solicitação enquanto já houver um `Pendente` para a mesma combinação grupo+usuário (409).
3. **Convite bloqueado se o convidado já é membro** — `enviarConvite` verifica `grupoTarefaDAO.usuarioPertenceAoGrupo` antes de criar o convite.
4. **Aceitar é transacional** — adiciona o usuário a `usuarioxgrupotarefa`, muda `ConviteStatus` para `Aceito` e registra histórico (`HistoricoTipo='Entrada'`), tudo dentro de uma transação (`ConviteGrupoTarefaService.aceitar`).
5. **Aceitar/recusar exige status `Pendente`** — convites já respondidos ou expirados retornam 400 "Convite não está mais pendente".
6. **Limite de vagas do grupo não é validado no envio do convite** — o código de `enviarConvite` tem um comentário `// TODO: Validar limite máximo` — atualmente é possível convidar/aceitar além de `TarefaMaxPessoas` sem bloqueio automático no service (⚠️ A confirmar).
7. **Validação de "aluno sozinho" não implementada** — `solicitarEntrada` tem `// TODO: Implementar validação completa` para a pré-condição "só posso solicitar entrada em outro grupo se estiver sozinho no meu" (⚠️ A confirmar).
8. **Recusar não move o membro** — diferente de `aceitar`, `recusar` só atualiza `ConviteStatus`, sem tocar em `usuarioxgrupotarefa` nem gerar histórico.

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | Erro na validação de dados — `grupoGUID`/`conviteGUID`/`UsuarioCPFConvidado` inválido | Parâmetro/body mal formatado |
| 400 | Usuário já é membro do grupo | Convite para quem já está no grupo |
| 400 | Convite não está mais pendente | `aceitar`/`recusar` em convite já respondido |
| 401 | Não autenticado | Token ausente/inválido |
| 403 | Apenas o líder pode enviar convites | `enviarConvite` chamado por não-líder |
| 403 | Você não pode aceitar/recusar este convite | Convite respondido por CPF diferente do convidado |
| 403 | Apenas o líder pode aceitar/recusar solicitações | Solicitação respondida por quem não é líder do grupo |
| 404 | Grupo não encontrado | `grupoGUID` inexistente |
| 404 | Convite não encontrado | `conviteGUID` inexistente |
| 409 | Já existe um convite pendente / Já existe uma solicitação pendente | Duplicidade para a mesma combinação grupo+usuário |

---

## Examples

### Cenário 1: Líder convida aluno, aluno aceita
```bash
POST /api/convitegrupotarefa/aa0e8400-e29b-41d4-a716-446655440001/convites
{ "UsuarioCPFConvidado": "98765432100" }
# Response 201 — convite "Pendente"

PATCH /api/convitegrupotarefa/cc2e8400-e29b-41d4-a716-446655440003/aceitar
# (chamado pelo CPF convidado) Response 200 — aluno entra no grupo
```

### Cenário 2: Aluno solicita entrada, líder recusa
```bash
POST /api/convitegrupotarefa/aa0e8400-e29b-41d4-a716-446655440001/solicitacoes
# Response 201

PATCH /api/convitegrupotarefa/dd3e8400-e29b-41d4-a716-446655440004/recusar
# (chamado pelo líder do grupo) Response 200
```

### Cenário 3: Não-convidado tenta aceitar convite de outro (❌ Erro)
```bash
PATCH /api/convitegrupotarefa/cc2e8400-e29b-41d4-a716-446655440003/aceitar
# usuário autenticado ≠ UsuarioCPFConvidado

Response 403:
{ "success": false, "message": "Você não pode aceitar este convite" }
```

---

## Integration with Other Entities

- **ConviteGrupoTarefa → GrupoTarefa**: todo convite/solicitação é sobre um grupo específico — ver [grupotarefa-api.md](grupotarefa-api.md).
- **ConviteGrupoTarefa → TarefaAcademica**: `ConviteGrupoTarefaDTO` inclui `TarefaTitulo`/`TarefaPrazoData`/`MaxPessoas` da tarefa associada ao grupo, para exibição direta na lista de pendentes — ver [tarefaacademica-api.md](tarefaacademica-api.md).

---

## Notes

- Não há endpoint para cancelar um convite/solicitação enviado (só é possível aceitar/recusar do lado do destinatário/líder).
- `ConviteStatus='Expirado'` existe no enum mas não há rotina/endpoint visível neste módulo que o defina automaticamente — ⚠️ A confirmar mecanismo de expiração.
- Todas as datas são retornadas em ISO 8601.
