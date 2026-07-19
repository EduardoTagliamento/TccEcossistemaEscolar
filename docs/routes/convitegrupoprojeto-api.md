# API Documentation - Convite de Grupo de Projeto (ConviteGrupoProjeto)

**Version:** 1.0.0
**Base URL:** `/api/convitegrupoprojeto`
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Enviar Convite (Líder → Aluno)](#enviar-convite-líder--aluno)
  - [Solicitar Entrada (Aluno → Grupo)](#solicitar-entrada-aluno--grupo)
  - [Listar Pendentes](#listar-pendentes)
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

API para o fluxo de **entrada em grupos de projeto fechados** (`GrupoProjeto.GrupoProjetoVisibilidade='Fechado'` — ver [grupoprojeto-api.md](grupoprojeto-api.md)). Espelha [convitegrupotarefa-api.md](convitegrupotarefa-api.md) nos dois sentidos possíveis:
- **Convite**: o líder do grupo convida um aluno específico.
- **Solicitação**: um aluno elegível solicita entrada em um grupo já existente.

Ambos usam a mesma entidade (`ConviteGrupoProjeto`), diferenciada por `ConviteTipo` (`Convite` ou `Solicitacao`), e o mesmo par de ações de resposta (`aceitar`/`recusar`).

**Diferença deliberada em relação a `ConviteGrupoTarefa`:** o limite de vagas (`TotalMembros < ProjetoGrupoMaxPessoas`) é validado tanto no **envio** do convite/solicitação quanto na **aceitação** — no módulo original de Tarefa Compartilhada isso ficou como `// TODO` não implementado; aqui foi implementado desde o início (ver `docs/PLANO_IMPLEMENTACAO_PROJETOS.md`, Seção 4 regra 6).

**Permissões:**
- **Enviar convite**: apenas o líder do grupo-alvo.
- **Solicitar entrada**: qualquer aluno elegível ao projeto (matrícula ativa em turma elegível), desde que não participe de outro grupo do mesmo projeto.
- **Aceitar/Recusar convite**: apenas o próprio convidado (`UsuarioCPFConvidado`).
- **Aceitar/Recusar solicitação**: apenas o líder do grupo-alvo da solicitação.
- **Listar pendentes**: cada usuário vê apenas convites recebidos por ele e solicitações recebidas por grupos onde ele é líder.

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

**Endpoint:** `POST /api/convitegrupoprojeto/:grupoGUID/convites`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grupoGUID` | string | ✅ Yes | UUID do grupo que está convidando |

**Request Body:**
```json
{ "UsuarioCPFConvidado": "98765432100" }
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Convite enviado com sucesso",
  "data": {
    "convite": {
      "ConviteGUID": "cc2e8400-e29b-41d4-a716-446655440003",
      "GrupoProjetoGUID": "aa0e8400-e29b-41d4-a716-446655440001",
      "UsuarioCPFConvidado": "98765432100",
      "ConviteTipo": "Convite",
      "ConviteStatus": "Pendente",
      "CreatedAt": "2026-07-19T10:00:00.000Z",
      "UpdatedAt": "2026-07-19T10:00:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Validação / grupo cheio / já é membro
```json
{ "success": false, "message": "Grupo já atingiu o limite máximo de integrantes" }
```
```json
{ "success": false, "message": "Usuário já é membro do grupo" }
```

**403 Forbidden** - Quem envia não é o líder, ou convidado não é elegível
```json
{ "success": false, "message": "Apenas o líder pode enviar convites" }
```
```json
{ "success": false, "message": "O aluno convidado não é elegível para participar deste projeto" }
```

**404 Not Found**
```json
{ "success": false, "message": "Grupo não encontrado" }
```

**409 Conflict**
```json
{ "success": false, "message": "Já existe um convite pendente para este usuário" }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/convitegrupoprojeto/aa0e8400-e29b-41d4-a716-446655440001/convites \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "UsuarioCPFConvidado": "98765432100" }'
```

---

### Solicitar Entrada (Aluno → Grupo)

**Endpoint:** `POST /api/convitegrupoprojeto/:grupoGUID/solicitacoes`

**Request Body:** nenhum (o solicitante é sempre o usuário do token).

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Solicitação enviada com sucesso",
  "data": {
    "solicitacao": {
      "ConviteGUID": "dd3e8400-e29b-41d4-a716-446655440004",
      "GrupoProjetoGUID": "aa0e8400-e29b-41d4-a716-446655440001",
      "UsuarioCPFConvidado": "11122233344",
      "ConviteTipo": "Solicitacao",
      "ConviteStatus": "Pendente",
      "CreatedAt": "2026-07-19T10:05:00.000Z",
      "UpdatedAt": "2026-07-19T10:05:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Grupo cheio / já é membro
```json
{ "success": false, "message": "Grupo já atingiu o limite máximo de integrantes" }
```

**403 Forbidden** - Solicitante não elegível
```json
{ "success": false, "message": "Você não é elegível para participar deste projeto" }
```

**404 Not Found**
```json
{ "success": false, "message": "Grupo não encontrado" }
```

**409 Conflict** - Já existe solicitação pendente, ou já participa de outro grupo do projeto
```json
{ "success": false, "message": "Já existe uma solicitação pendente" }
```
```json
{ "success": false, "message": "Você já participa de outro grupo neste projeto" }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/convitegrupoprojeto/aa0e8400-e29b-41d4-a716-446655440001/solicitacoes \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Listar Pendentes

**Endpoint:** `GET /api/convitegrupoprojeto/pendentes`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Convites listados com sucesso",
  "data": {
    "convites": [
      {
        "ConviteGUID": "cc2e8400-e29b-41d4-a716-446655440003",
        "GrupoProjetoGUID": "aa0e8400-e29b-41d4-a716-446655440001",
        "GrupoProjetoNome": "Equipe Alfa",
        "LiderCPF": "12345678901",
        "LiderNome": "João Silva",
        "UsuarioCPFConvidado": "98765432100",
        "NomeConvidado": "Maria Souza",
        "ConviteTipo": "Convite",
        "ConviteStatus": "Pendente",
        "ProjetoTitulo": "Feira de Ciências 2026",
        "ProjetoInscricaoPrazoData": "2026-08-15T23:59:59.000Z",
        "TotalMembros": 1,
        "MaxPessoas": 5,
        "CreatedAt": "2026-07-19T10:00:00.000Z"
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
curl -X GET https://api.example.com/api/convitegrupoprojeto/pendentes \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Aceitar Convite/Solicitação

Ao aceitar, o usuário é adicionado a `usuarioxgrupoprojeto`, respeitando o limite de vagas (`GrupoProjetoService.entrarNoGrupoComLimiteDeVagas`), e um registro `Entrada` é criado em `historicogrupoprojeto`.

**Endpoint:** `PATCH /api/convitegrupoprojeto/:conviteGUID/aceitar`

**Success Response (200 OK):**
```json
{ "success": true, "message": "Convite aceito com sucesso", "data": null }
```
ou, para solicitação:
```json
{ "success": true, "message": "Solicitacao aceito com sucesso", "data": null }
```

**Error Responses:**

**400 Bad Request** - Já respondido / grupo cheio
```json
{ "success": false, "message": "Convite não está mais pendente" }
```
```json
{ "success": false, "message": "Grupo já atingiu o limite máximo de integrantes" }
```

**403 Forbidden**
```json
{ "success": false, "message": "Você não pode aceitar este convite" }
```
```json
{ "success": false, "message": "Apenas o líder pode aceitar solicitações" }
```

**404 Not Found**
```json
{ "success": false, "message": "Convite não encontrado" }
```

**cURL Example:**
```bash
curl -X PATCH https://api.example.com/api/convitegrupoprojeto/cc2e8400-e29b-41d4-a716-446655440003/aceitar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Recusar Convite/Solicitação

Mesma lógica de autorização de `aceitar`, mas só atualiza `ConviteStatus` (sem tocar em `usuarioxgrupoprojeto`).

**Endpoint:** `PATCH /api/convitegrupoprojeto/:conviteGUID/recusar`

**Success Response (200 OK):**
```json
{ "success": true, "message": "Convite recusado", "data": null }
```

**Error Responses:** mesmas de `aceitar` (400 status não-pendente, 403 autorização, 404 não encontrado).

**cURL Example:**
```bash
curl -X PATCH https://api.example.com/api/convitegrupoprojeto/cc2e8400-e29b-41d4-a716-446655440003/recusar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Data Models

```typescript
type ConviteTipo = 'Convite' | 'Solicitacao';
type ConviteStatus = 'Pendente' | 'Aceito' | 'Recusado';

interface ConviteGrupoProjeto {
  ConviteGUID: string;
  GrupoProjetoGUID: string;
  UsuarioCPFConvidado: string;
  ConviteTipo: ConviteTipo;
  ConviteStatus: ConviteStatus;
  CreatedAt: Date;
  UpdatedAt: Date;
}

interface ConviteGrupoProjetoDTO {
  ConviteGUID: string;
  GrupoProjetoGUID: string;
  GrupoProjetoNome: string | null;
  LiderCPF: string;
  LiderNome: string;
  UsuarioCPFConvidado: string;
  NomeConvidado: string;
  ConviteTipo: ConviteTipo;
  ConviteStatus: ConviteStatus;
  ProjetoTitulo: string;
  ProjetoInscricaoPrazoData: string;
  TotalMembros: number;
  MaxPessoas: number;
  CreatedAt: Date;
}
```

### Database Schema

```sql
CREATE TABLE convitegrupoprojeto (
  ConviteGUID CHAR(36) NOT NULL PRIMARY KEY,
  GrupoProjetoGUID CHAR(36) NOT NULL,
  UsuarioCPFConvidado VARCHAR(14) NOT NULL,
  ConviteTipo ENUM('Convite','Solicitacao') NOT NULL,
  ConviteStatus ENUM('Pendente','Aceito','Recusado') NOT NULL DEFAULT 'Pendente',
  CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (GrupoProjetoGUID) REFERENCES grupoprojeto(GrupoProjetoGUID) ON DELETE CASCADE,
  FOREIGN KEY (UsuarioCPFConvidado) REFERENCES usuario(UsuarioCPF) ON DELETE CASCADE
);
```

Diferente de `convitegrupotarefa`, **não há status `Expirado`** — decisão deliberada para não herdar um estado morto sem rotina de expiração associada (ver `docs/PLANO_IMPLEMENTACAO_PROJETOS.md`, Seção 3.5).

---

## Business Rules

1. **Dois fluxos, uma entidade** — `ConviteTipo='Convite'` (líder → aluno) e `ConviteTipo='Solicitacao'` (aluno → grupo) compartilham tabela e endpoints de resposta, com autorização oposta (`ConviteGrupoProjetoService.aceitar`/`recusar`).
2. **Sem duplicidade pendente** — `ConviteGrupoProjetoDAO.existeConvitePendente` bloqueia novo convite/solicitação enquanto já houver um `Pendente` para a mesma combinação grupo+usuário (409).
3. **Elegibilidade sempre validada** — tanto `enviarConvite` quanto `solicitarEntrada` chamam `ProjetoDAO.usuarioElegivel` antes de criar o registro (403 se o aluno não tem matrícula elegível).
4. **Limite de vagas validado no envio E na aceitação** — diferente do TODO de `ConviteGrupoTarefaService`, aqui `enviarConvite`/`solicitarEntrada` já bloqueiam se `TotalMembros >= ProjetoGrupoMaxPessoas`, e `aceitar` reforça a mesma checagem via `GrupoProjetoService.entrarNoGrupoComLimiteDeVagas`.
5. **1 participação por aluno por projeto** — `solicitarEntrada` bloqueia (409) se o solicitante já integra outro grupo do mesmo `ProjetoGUID` — substitui a validação "estar sozinho" (nunca implementada) de `ConviteGrupoTarefaService.solicitarEntrada`.
6. **Aceitar é transacional** — `ConviteGrupoProjetoService.aceitar` abre uma transação própria (`BEGIN`/`COMMIT`/`ROLLBACK`) cobrindo as duas escritas: `GrupoProjetoService.entrarNoGrupoComLimiteDeVagas` (que aceita a mesma `PoolConnection` como parâmetro opcional e a repassa para `contarMembros`/`create`/registro de histórico) e `ConviteGrupoProjetoDAO.updateStatus`. Se qualquer uma falhar, tudo é revertido e o convite permanece `Pendente` de forma consistente — mesma proteção que `ConviteGrupoTarefaService.aceitar` já tinha.
7. **Recusar não move o membro** — só atualiza `ConviteStatus`, sem tocar em `usuarioxgrupoprojeto` nem gerar histórico.
8. **Sem expiração automática** — não há `Expirado` no enum nem rotina de expiração.

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | Erro na validação de dados | `grupoGUID`/`conviteGUID`/`UsuarioCPFConvidado` inválido |
| 400 | Grupo já atingiu o limite máximo de integrantes | Vagas esgotadas no envio ou na aceitação |
| 400 | Usuário já é membro do grupo | Convite para quem já está no grupo |
| 400 | Convite não está mais pendente | `aceitar`/`recusar` em convite já respondido |
| 401 | Não autenticado | Token ausente/inválido |
| 403 | Apenas o líder pode enviar convites | `enviarConvite` chamado por não-líder |
| 403 | O aluno convidado não é elegível / Você não é elegível | Elegibilidade falhou |
| 403 | Você não pode aceitar/recusar este convite | Convite respondido por CPF diferente do convidado |
| 403 | Apenas o líder pode aceitar/recusar solicitações | Solicitação respondida por quem não é líder do grupo |
| 404 | Grupo não encontrado | `grupoGUID` inexistente |
| 404 | Convite não encontrado | `conviteGUID` inexistente |
| 409 | Já existe um convite/uma solicitação pendente | Duplicidade grupo+usuário |
| 409 | Você já participa de outro grupo neste projeto | Segunda participação no mesmo projeto |

---

## Examples

### Cenário 1: Líder convida aluno, aluno aceita
```bash
POST /api/convitegrupoprojeto/aa0e8400-e29b-41d4-a716-446655440001/convites
{ "UsuarioCPFConvidado": "98765432100" }
# Response 201 — convite "Pendente"

PATCH /api/convitegrupoprojeto/cc2e8400-e29b-41d4-a716-446655440003/aceitar
# (chamado pelo CPF convidado) Response 200 — aluno entra no grupo
```

### Cenário 2: Aluno solicita entrada, líder recusa
```bash
POST /api/convitegrupoprojeto/aa0e8400-e29b-41d4-a716-446655440001/solicitacoes
# Response 201

PATCH /api/convitegrupoprojeto/dd3e8400-e29b-41d4-a716-446655440004/recusar
# (chamado pelo líder do grupo) Response 200
```

### Cenário 3: Solicitação em grupo já cheio (❌ Erro)
```bash
POST /api/convitegrupoprojeto/aa0e8400-e29b-41d4-a716-446655440001/solicitacoes
# grupo já com TotalMembros == ProjetoGrupoMaxPessoas

Response 400:
{ "success": false, "message": "Grupo já atingiu o limite máximo de integrantes" }
```

---

## Integration with Other Entities

- **ConviteGrupoProjeto → GrupoProjeto**: todo convite/solicitação é sobre um grupo específico — ver [grupoprojeto-api.md](grupoprojeto-api.md).
- **ConviteGrupoProjeto → Projeto**: `ConviteGrupoProjetoDTO` inclui `ProjetoTitulo`/`ProjetoInscricaoPrazoData`/`MaxPessoas` — ver [projeto-api.md](projeto-api.md).
- **ConviteGrupoProjeto → Notificação**: dispara `convite_grupo_projeto` e `solicitacao_grupo_projeto` — ver [notificacao-api.md](notificacao-api.md).

---

## Notes

- Não há endpoint para cancelar um convite/solicitação enviado (só é possível aceitar/recusar do lado do destinatário/líder) — mesmo comportamento de `convitegrupotarefa`.
- Todas as datas são retornadas em ISO 8601.
