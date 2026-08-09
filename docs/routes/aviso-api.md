# API Documentation - Aviso (Comunicado)

**Version:** 1.0.0
**Base URL:** `/api/aviso`
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Create Aviso](#create-aviso)
  - [Get Aviso Não Visualizado](#get-aviso-não-visualizado)
  - [List Avisos](#list-avisos)
  - [Get Aviso by ID](#get-aviso-by-id)
  - [Delete Aviso](#delete-aviso)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)
- [Examples](#examples)
- [Integration with Other Entities](#integration-with-other-entities)
- [Notes](#notes)

---

## Overview

API para **comunicados institucionais** — Direção, Coordenação e Secretaria publicam avisos para a escola inteira ou para turmas específicas. Diferente de Evento/Pendência, `Aviso` não tem data própria (só existe uma vez, sem prazo/expiração) e pode ter anexo opcional.

**Conceito:**
- Ao ser publicado, o aviso aparece **em destaque grande na home** de cada destinatário até a primeira visualização (ver `GET /nao-visualizado`); depois disso, continua acessível pela página de leitura e pela notificação, só não fica mais em destaque.
- Dispara automaticamente uma notificação (`aviso_publicado`) para todos os destinatários — ver [notificacao-api.md](notificacao-api.md).
- Sem edição em v1: só criar e excluir.

**Permissões:**
- **Criar** (`POST /`): só usuários com `FuncaoId` 1 (Coordenação), 2 (Secretaria) ou 6 (Direção) ativos na escola.
- **Listar** (`GET /`): mesma restrição de `POST /` — usado na tela de gestão/histórico de quem publica.
- **Buscar por ID / não-visualizado** (`GET /:guid`, `GET /nao-visualizado`): qualquer usuário com vínculo ativo na escola, desde que o aviso seja `Escola` (todo mundo vê) ou `Turmas` (só quem está matriculado em alguma das turmas-alvo) — staff sempre tem acesso, independente da abrangência.
- **Excluir** (`DELETE /:guid`): só o autor do aviso ou um usuário com `FuncaoId=6` (Direção) ativo na escola.

---

## Authentication

Todas as rotas requerem autenticação JWT.

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

### Create Aviso

**Endpoint:** `POST /api/aviso`

**Request Body:**
```json
{
  "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
  "AvisoTitulo": "Reunião de pais no dia 20",
  "AvisoConteudo": "A reunião de pais e mestres acontecerá no dia 20/08 às 19h, no auditório.",
  "AvisoAbrangencia": "Escola",
  "TurmaGUIDs": [],
  "AnexoGUIDs": ["a1b2c3d4-..."]
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `EscolaGUID` | string | ✅ Yes | UUID da escola | Não vazio |
| `AvisoTitulo` | string | ✅ Yes | Título do comunicado | Não vazio, máx. 150 caracteres |
| `AvisoConteudo` | string | ✅ Yes | Corpo do comunicado | Não vazio, máx. 10000 caracteres |
| `AvisoAbrangencia` | string | ✅ Yes | `"Escola"` ou `"Turmas"` | Enum |
| `TurmaGUIDs` | string[] | Condicional | Turmas-alvo | Obrigatório e não vazio se `AvisoAbrangencia="Turmas"` |
| `AnexoGUIDs` | string[] | ❌ No | Anexos já enviados via `POST /api/anexo` | Cada GUID deve pertencer ao autor |

> `UsuarioCPFAutor` **não** é enviado no body — é sempre o usuário do token.

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Aviso publicado com sucesso",
  "data": {
    "AvisoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "UsuarioCPFAutor": "12345678901",
    "AvisoTitulo": "Reunião de pais no dia 20",
    "AvisoConteudo": "A reunião de pais e mestres acontecerá no dia 20/08 às 19h, no auditório.",
    "AvisoAbrangencia": "Escola",
    "AvisoCreatedAt": "2026-08-09T14:00:00.000Z",
    "Anexos": [],
    "TurmaGUIDs": []
  }
}
```

**Error Responses:**

**400 Bad Request** — validação de schema (`AvisoTitulo é obrigatório`, `AvisoConteudo não pode exceder 10000 caracteres`, `Selecione ao menos uma turma para um aviso de abrangência 'Turmas'`, etc.)

**403 Forbidden** — sem permissão de envio
```json
{ "success": false, "message": "Sem permissão para enviar avisos (apenas Direção, Coordenação ou Secretaria)" }
```

**403 Forbidden** — anexo não pertence ao autor
```json
{ "success": false, "message": "Você só pode anexar arquivos que você mesmo enviou" }
```

**404 Not Found** — `AnexoGUIDs` com GUID inexistente
```json
{ "success": false, "message": "Anexo a1b2c3d4-... não encontrado" }
```

---

### Get Aviso Não Visualizado

Aviso mais recente ainda não visto pelo usuário autenticado, alcançável por ele (escola inteira, ou turma específica via matrícula ativa). Usado pelo banner de destaque na home — `data: null` quando não há nenhum pendente.

**Endpoint:** `GET /api/aviso/nao-visualizado`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EscolaGUID` | string | ✅ Yes | UUID da escola |

**Success Response (200 OK):**
```json
{ "success": true, "data": { "AvisoGUID": "7c9e6679-...", "AvisoTitulo": "Reunião de pais no dia 20", "...": "..." } }
```
ou `{ "success": true, "data": null }` quando não há aviso pendente.

> Nota de rota: registrada **antes** de `GET /:guid` no router para não colidir com a rota de parâmetro.

---

### List Avisos

Lista todos os avisos publicados na escola — usado na tela de gestão/histórico de quem pode enviar.

**Endpoint:** `GET /api/aviso`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EscolaGUID` | string | ✅ Yes | UUID da escola |

**Success Response (200 OK):**
```json
{ "success": true, "data": [ { "AvisoGUID": "...", "AvisoTitulo": "...", "...": "..." } ], "total": 1 }
```

**Error Responses:**

**403 Forbidden**
```json
{ "success": false, "message": "Sem permissão para listar avisos enviados (apenas Direção, Coordenação ou Secretaria)" }
```

---

### Get Aviso by ID

Busca um aviso específico **e marca a visualização** do usuário autenticado como efeito colateral (idempotente — `INSERT IGNORE` em `avisoxusuario`). É assim que a "1ª visualização" citada no banner da home é registrada, sem chamada extra do frontend.

**Endpoint:** `GET /api/aviso/:guid`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "AvisoGUID": "7c9e6679-...",
    "AvisoTitulo": "Reunião de pais no dia 20",
    "AvisoConteudo": "...",
    "AvisoAbrangencia": "Turmas",
    "AvisoCreatedAt": "2026-08-09T14:00:00.000Z",
    "Anexos": [ { "AnexoGUID": "...", "AnexoNomeOriginal": "convite.pdf" } ],
    "TurmaGUIDs": ["11111111-...", "22222222-..."]
  }
}
```

**Error Responses:**

**403 Forbidden** — aviso não destinado ao usuário
```json
{ "success": false, "message": "Este aviso não é destinado a você" }
```

**403 Forbidden** — sem vínculo ativo com a escola
```json
{ "success": false, "message": "Você não tem vínculo ativo com esta escola" }
```

**404 Not Found**
```json
{ "success": false, "message": "Aviso não encontrado" }
```

---

### Delete Aviso

**Endpoint:** `DELETE /api/aviso/:guid`

Exclusão física — `ON DELETE CASCADE` remove junto os vínculos em `avisoxturma`, `relacaoanexosaviso` e `avisoxusuario`.

**Success Response (200 OK):**
```json
{ "success": true, "message": "Aviso excluído com sucesso" }
```

**Error Responses:**

**403 Forbidden**
```json
{ "success": false, "message": "Sem permissão para excluir este aviso (apenas quem enviou ou a Direção)" }
```

**404 Not Found**
```json
{ "success": false, "message": "Aviso não encontrado" }
```

---

## Data Models

### Aviso Entity

```typescript
interface Aviso {
  AvisoGUID: string;
  EscolaGUID: string;
  UsuarioCPFAutor: string;
  AvisoTitulo: string;               // até 150 caracteres
  AvisoConteudo: string;             // até 10000 caracteres
  AvisoAbrangencia: 'Escola' | 'Turmas';
  AvisoCreatedAt: Date;
}

// Retornado pelos endpoints de leitura — Aviso + dados agregados
interface AvisoDTO extends Aviso {
  Anexos: Anexo[];
  TurmaGUIDs: string[];              // só populado quando AvisoAbrangencia = 'Turmas'
}
```

### Database Schema

```sql
CREATE TABLE `aviso` (
  `AvisoGUID` CHAR(36) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `UsuarioCPFAutor` VARCHAR(14) NOT NULL,
  `AvisoTitulo` VARCHAR(150) NOT NULL,
  `AvisoConteudo` TEXT NOT NULL,
  `AvisoAbrangencia` ENUM('Escola','Turmas') NOT NULL,
  `AvisoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`AvisoGUID`),
  CONSTRAINT `FK_Aviso_Escola` FOREIGN KEY (`EscolaGUID`) REFERENCES `escola`(`EscolaGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_Aviso_Usuario` FOREIGN KEY (`UsuarioCPFAutor`) REFERENCES `usuario`(`UsuarioCPF`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Turmas-alvo (só quando AvisoAbrangencia = 'Turmas')
CREATE TABLE `avisoxturma` (
  `AvisoXTurmaGUID` CHAR(36) NOT NULL,
  `AvisoGUID` CHAR(36) NOT NULL,
  `TurmaGUID` CHAR(36) NOT NULL,
  PRIMARY KEY (`AvisoXTurmaGUID`),
  UNIQUE KEY `uq_avisoxturma` (`AvisoGUID`, `TurmaGUID`),
  CONSTRAINT `FK_AvisoXTurma_Aviso` FOREIGN KEY (`AvisoGUID`) REFERENCES `aviso`(`AvisoGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_AvisoXTurma_Turma` FOREIGN KEY (`TurmaGUID`) REFERENCES `turma`(`TurmaGUID`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- Vínculo de anexo (mesmo formato de relacaoanexosevento, sem AnexoTipo)
CREATE TABLE `relacaoanexosaviso` (
  `RelacaoAnexoAvisoGUID` CHAR(36) NOT NULL,
  `AnexoGUID` CHAR(36) NOT NULL,
  `AvisoGUID` CHAR(36) NOT NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`RelacaoAnexoAvisoGUID`),
  CONSTRAINT `FK_RelacaoAnexoAviso_Anexo` FOREIGN KEY (`AnexoGUID`) REFERENCES `anexo`(`AnexoGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_RelacaoAnexoAviso_Aviso` FOREIGN KEY (`AvisoGUID`) REFERENCES `aviso`(`AvisoGUID`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- Rastreio de "visto" — 1 linha por (aviso, usuário) que abriu a página de leitura
CREATE TABLE `avisoxusuario` (
  `AvisoXUsuarioGUID` CHAR(36) NOT NULL,
  `AvisoGUID` CHAR(36) NOT NULL,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `VisualizadoEm` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`AvisoXUsuarioGUID`),
  UNIQUE KEY `uq_avisoxusuario` (`AvisoGUID`, `UsuarioCPF`),
  CONSTRAINT `FK_AvisoXUsuario_Aviso` FOREIGN KEY (`AvisoGUID`) REFERENCES `aviso`(`AvisoGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_AvisoXUsuario_Usuario` FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario`(`UsuarioCPF`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;
```

Fonte: `backend/database/migrations/2026-08-09-aviso.sql`.

---

## Business Rules

1. **Só Direção/Coordenação/Secretaria envia** — `AvisoService.criarAviso` exige `EscolaxUsuarioxFuncaoDAO.isCoordSecretariaOuDirecaoEmEscola(usuarioCPF, EscolaGUID)` (`FuncaoId` 1, 2 ou 6, `Status='Ativo'`).
2. **Sem data própria** — só existe `AvisoCreatedAt` (timestamp de auditoria); não há prazo/expiração/agendamento.
3. **Abrangência define o público** — `Escola`: todos os vínculos ativos da escola, qualquer `FuncaoId` (`findUsuariosAtivosByEscolaEFuncoes(EscolaGUID, [1,2,3,4,5,6])`). `Turmas`: só alunos com matrícula `Ativa` nas turmas selecionadas (`MatriculaDAO.findByTurma`) — mesmo critério de alcance que Tarefa/Prova/Conteúdo usam; não inclui professor/responsável da turma.
4. **Notificação automática** — ao criar, dispara `aviso_publicado` (categoria `Aviso`) pra cada destinatário via `NotificacaoService.disparar`, de forma não-bloqueante (`.catch()`, não atrasa a resposta do `POST`). O autor nunca é notificado do próprio aviso.
5. **"1ª visualização" é registrada no `GET /:guid`** — não existe endpoint separado de "marcar como visto"; abrir a página de leitura já grava a linha em `avisoxusuario` (idempotente via `INSERT IGNORE` + `UNIQUE(AvisoGUID, UsuarioCPF)`).
6. **Banner da home mostra só o mais recente não visto** — `GET /nao-visualizado` nunca empilha vários avisos; avisos mais antigos não vistos continuam acessíveis pela lista/histórico, só não ficam mais em destaque.
7. **Sem edição em v1** — só `POST` (criar) e `DELETE` (excluir); não há `PUT`/`PATCH`.
8. **Exclusão: autor ou Direção** — `AvisoService.excluirAviso` libera se `UsuarioCPFAutor === usuarioCPF` OU se o chamador tem `FuncaoId=6` ativo na escola do aviso.
9. **Anexo precisa pertencer ao autor** — mesma regra de `TarefaAcademicaService.enviarAnexoEntrega`: só é possível vincular um `AnexoGUID` cujo `Anexo.UsuarioCPF` seja o do autor do aviso (o anexo já foi enviado antes via `POST /api/anexo`).

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | `AvisoTitulo`/`AvisoConteudo`/`AvisoAbrangencia` obrigatório ou fora do formato | Falha de validação do middleware |
| 400 | `Selecione ao menos uma turma para um aviso de abrangência 'Turmas'` | `TurmaGUIDs` vazio com `AvisoAbrangencia="Turmas"` |
| 401 | Usuário não autenticado | Token ausente/inválido |
| 403 | Sem permissão para enviar avisos (...) | Chamador não é Direção/Coordenação/Secretaria |
| 403 | Sem permissão para listar avisos enviados (...) | Idem, em `GET /` |
| 403 | Você só pode anexar arquivos que você mesmo enviou | `AnexoGUIDs` com anexo de outro usuário |
| 403 | Este aviso não é destinado a você | `GET /:guid` com abrangência `Turmas` e usuário fora das turmas-alvo |
| 403 | Você não tem vínculo ativo com esta escola | `GET /:guid` sem vínculo `Ativo` |
| 403 | Sem permissão para excluir este aviso (...) | `DELETE` por quem não é autor nem Direção |
| 404 | Aviso não encontrado | GUID inexistente |
| 404 | Anexo ... não encontrado | `AnexoGUIDs` com GUID inexistente |

---

## Examples

### Cenário 1: Publicar aviso pra escola inteira
```bash
POST /api/aviso
{ "EscolaGUID": "550e8400-...", "AvisoTitulo": "Feriado", "AvisoConteudo": "Não haverá aula na sexta.", "AvisoAbrangencia": "Escola" }
# Response 201 — todos os vínculos ativos da escola recebem notificação `aviso_publicado`
```

### Cenário 2: Aluno vê o banner e o aviso some depois
```bash
GET /api/aviso/nao-visualizado?EscolaGUID=550e8400-...
# Response 200, data = { AvisoGUID: "...", ... }

GET /api/aviso/<guid>
# Response 200 — registra avisoxusuario

GET /api/aviso/nao-visualizado?EscolaGUID=550e8400-...
# Response 200, data = null (ou o próximo aviso não visto, se houver)
```

---

## Integration with Other Entities

- **Aviso → Anexo**: anexo é enviado antes via `POST /api/anexo` (ver [anexo-api.md](anexo-api.md)); `Aviso` só recebe o `AnexoGUID` já existente.
- **Aviso → Notificação**: dispara tipo `aviso_publicado` (categoria `Aviso`) — ver [notificacao-api.md](notificacao-api.md). Aparece tanto no sino/toast quanto no widget "Avisos gerais" da home (que já filtra por categoria `Aviso`).
- **Aviso → EscolaxUsuarioxFuncao**: permissão de envio/exclusão e fan-out por escola — ver [escolaxusuarioxfuncao-api.md](escolaxusuarioxfuncao-api.md).
- **Aviso → Matricula/Turma**: fan-out e checagem de acesso quando `AvisoAbrangencia="Turmas"` — ver [turma-api.md](../routes/turma-api.md) e [matricula-api.md](matricula-api.md).

---

## Notes

- Frontend: tela de gestão/criação em `/dashboard/[escolaGUID]/gestao-dados/avisos`, página de leitura em `/dashboard/[escolaGUID]/avisos/[avisoGUID]`, banner de destaque na home (`/dashboard/[escolaGUID]`).
- Ver plano completo em [`docs/PLANO_IMPLEMENTACAO_AVISO_COMUNICADO.md`](../PLANO_IMPLEMENTACAO_AVISO_COMUNICADO.md).
