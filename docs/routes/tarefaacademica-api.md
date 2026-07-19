# API Documentation - Tarefa Acadêmica (Academic Task)

**Version:** 2.0.0 (modelo normalizado: 1 tarefa → N alunos)
**Base URL:** `/api/tarefa`
**Content-Type:** `application/json`
**Authentication:** Required (JWT Bearer Token)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Create Academic Task](#create-academic-task)
  - [Create Academic Task (Batch alias)](#create-academic-task-batch-alias)
  - [List Academic Tasks](#list-academic-tasks)
  - [Get Academic Task by ID](#get-academic-task-by-id)
  - [Update Academic Task](#update-academic-task)
  - [Mark as Done / Undone](#mark-as-done--undone)
  - [Delete Academic Task](#delete-academic-task)
  - [Submit Attachment to Task (Entrega)](#submit-attachment-to-task-entrega)
  - [Remove Attachment from Task](#remove-attachment-from-task)
  - [List Anexos (Materiais de Apoio)](#list-anexos-materiais-de-apoio)
  - [Link Anexo (Material de Apoio)](#link-anexo-material-de-apoio)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)
- [Examples](#examples)
- [Integration with Other Entities](#integration-with-other-entities)
- [Notes](#notes)

---

## Overview

API REST para gerenciamento de tarefas acadêmicas do Ecossistema Escolar, no **modelo normalizado**: uma tarefa é criada **uma única vez** com dados compartilhados (título, conteúdo, prazo padrão, tipo de entrega) e atribuída a **N alunos** de uma vez (`MatriculasGUID[]`), através da tabela de junção `tarefaacademica_matricula`. Cada aluno tem sua própria atribuição (`TarefaFeito`, `TarefaRealizacaoData`, e opcionalmente um prazo individual).

**Tecnologias:** Node.js + Express + TypeScript, MySQL, arquitetura MVC em camadas.

**Key Features:**
- Criação em lote: 1 requisição atribui a tarefa a vários alunos simultaneamente.
- Suporte a **tarefas compartilhadas/em grupo** (`TarefaCompartilhada`, `TarefaMinPessoas`, `TarefaMaxPessoas`) — integra com o módulo de grupos (ver [grupotarefa-api.md](grupotarefa-api.md) e [convitegrupotarefa-api.md](convitegrupotarefa-api.md)).
- Suporte a **prazo individual por aluno** (`DatasPorMatricula`), usado pelo agendamento automático de grade horária (ver [grade-horaria-api.md](grade-horaria-api.md)).
- Entrega digital ou física; anexos de entrega (aluno) e anexos de material de apoio (professor), ambos via a tabela genérica `relacaoanexos`/`relacaoanexostarefa`.
- Marcação de conclusão por aluno, individual (não afeta os demais atribuídos).
- Autenticação JWT obrigatória em todas as rotas.

---

## Authentication

**Todas as rotas requerem autenticação JWT via header:**

```http
Authorization: Bearer <seu_token_jwt>
```

**Como obter o token:**
1. Faça login em `POST /api/auth/login`
2. Use o token retornado no campo `data.token`
3. Inclua o token no header `Authorization` de todas as requisições

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
  "message": "Erro na validação de dados",
  "error": {
    "message": "Detalhes específicos do erro"
  }
}
```

> Nota: erros de negócio lançados pelo `TarefaAcademicaService` usam o formato padrão do projeto (`ErrorResponse` → `{ success: false, message, details }`); os exemplos abaixo seguem o texto literal encontrado no código (`backend/controllers/tarefaacademica.controller.ts`, `backend/services/tarefaacademica.service.ts`, `backend/middlewares/tarefaacademica.middleware.ts`).

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| `200` | OK - Requisição bem-sucedida |
| `201` | Created - Tarefa(s)/vínculo criado com sucesso |
| `400` | Bad Request - Dados inválidos |
| `401` | Unauthorized - Token JWT ausente/inválido, ou `req.user` não resolvido |
| `403` | Forbidden - Sem permissão para o recurso (anexo de outra escola, etc.) |
| `404` | Not Found - Tarefa, matrícula, atribuição ou anexo não encontrado |
| `500` | Internal Server Error - Erro interno / serviço de anexos não configurado |

---

## Endpoints

### Create Academic Task

Cria uma tarefa acadêmica (dados compartilhados) e a atribui de uma vez a **uma ou mais matrículas**. Suporta tarefa individual, tarefa compartilhada/em grupo (`TarefaCompartilhada=true`) e prazo individual por aluno via `DatasPorMatricula` (usado pelo agendamento automático de grade horária).

**Endpoint:** `POST /api/tarefa`

**Authentication:** Required

**Request Body:**
```json
{
  "tarefa": {
    "MatriculasGUID": [
      "550e8400-e29b-41d4-a716-446655440000",
      "660e8400-e29b-41d4-a716-446655440001"
    ],
    "matXprofXturxescGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "TarefaTitulo": "Resolução de Exercícios - Funções Quadráticas",
    "TarefaConteudo": "Resolver os exercícios 1 a 15 da página 87 do livro didático.",
    "TarefaPrazoData": "2026-07-25T23:59:59.000Z",
    "TarefaTipoEntrega": "digital",
    "anexosDescricao": ["770e8400-e29b-41d4-a716-446655440002"],
    "TarefaCompartilhada": false,
    "DatasPorMatricula": {
      "550e8400-e29b-41d4-a716-446655440000": "2026-07-26T23:59:59.000Z"
    }
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `tarefa` | object | ✅ Yes | Objeto contendo dados da tarefa | Obrigatório |
| `tarefa.MatriculasGUID` | string[] | ✅ Yes | GUIDs das matrículas que receberão a tarefa | Array não vazio; cada item 1-36 caracteres; todas devem existir |
| `tarefa.matXprofXturxescGUID` | string | ✅ Yes | GUID do vínculo matéria-professor-turma | UUID v4 |
| `tarefa.TarefaTitulo` | string | ✅ Yes | Título da tarefa | 1-128 caracteres |
| `tarefa.TarefaConteudo` | string | ❌ No | Descrição detalhada | Máx. 1024 caracteres |
| `tarefa.TarefaPrazoData` | string | ✅ Yes | Prazo padrão (ISO 8601) | Data válida; futura (ou, se houver `DatasPorMatricula`, o prazo efetivo é o menor entre elas — ver Business Rules) |
| `tarefa.TarefaTipoEntrega` | string | ✅ Yes | Tipo de entrega | `digital` ou `fisica` |
| `tarefa.anexosDescricao` | string[] | ❌ No | GUIDs de anexos já enviados (material de apoio da tarefa) | Cada item UUID v4 |
| `tarefa.TarefaCompartilhada` | boolean | ❌ No | Se a tarefa é feita em grupo | Padrão `false`; se `true`, exige `TarefaMinPessoas`/`TarefaMaxPessoas` |
| `tarefa.TarefaMinPessoas` | number \| null | ⚠️ Condicional | Mínimo de pessoas por grupo | Obrigatório e ≥1 se `TarefaCompartilhada=true`; deve ser `null` se `false` |
| `tarefa.TarefaMaxPessoas` | number \| null | ⚠️ Condicional | Máximo de pessoas por grupo | Obrigatório e ≥`TarefaMinPessoas` se `TarefaCompartilhada=true`; deve ser `null` se `false` |
| `tarefa.DatasPorMatricula` | object | ❌ No | Mapa `MatriculaGUID → data ISO` com prazo individual (override do prazo padrão para aquele aluno) | Cada chave deve estar em `MatriculasGUID`; cada data válida e futura |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Tarefa criada com sucesso",
  "data": {
    "tarefa": {
      "TarefaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "matXprofXturxescGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "TarefaTitulo": "Resolução de Exercícios - Funções Quadráticas",
      "TarefaConteudo": "Resolver os exercícios 1 a 15 da página 87 do livro didático.",
      "TarefaPostagemData": "2026-07-17T10:30:00.000Z",
      "TarefaPrazoData": "2026-07-25T23:59:59.000Z",
      "TarefaTipoEntrega": "digital",
      "TarefaCompartilhada": false,
      "TarefaMinPessoas": null,
      "TarefaMaxPessoas": null,
      "MatriculasAtribuidas": [
        {
          "TarefaMatriculaGUID": "8a1e6679-7425-40de-944b-e07fc1f90aa1",
          "MatriculaGUID": "550e8400-e29b-41d4-a716-446655440000",
          "TarefaPrazoData": "2026-07-26T23:59:59.000Z",
          "TarefaFeito": false,
          "TarefaRealizacaoData": null
        },
        {
          "TarefaMatriculaGUID": "9b2e6679-7425-40de-944b-e07fc1f90aa2",
          "MatriculaGUID": "660e8400-e29b-41d4-a716-446655440001",
          "TarefaPrazoData": "2026-07-25T23:59:59.000Z",
          "TarefaFeito": false,
          "TarefaRealizacaoData": null
        }
      ],
      "CreatedAt": "2026-07-17T10:30:00.000Z",
      "UpdatedAt": "2026-07-17T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - `MatriculasGUID` ausente/vazio (middleware)
```json
{ "success": false, "message": "Erro na validação de dados", "error": { "message": "O campo 'MatriculasGUID' deve conter ao menos uma matrícula." } }
```

**400 Bad Request** - Demais campos obrigatórios/formato (middleware — `tarefa`, `matXprofXturxescGUID`, `TarefaTitulo`, `TarefaPrazoData`, `TarefaTipoEntrega`, `anexosDescricao`, `DatasPorMatricula`, cada um com mensagem específica listada em [Error Codes](#error-codes))

**400 Bad Request** - Prazo no passado (service)
```json
{ "success": false, "message": "Prazo inválido", "details": { "message": "O prazo da tarefa não pode ser no passado." } }
```

**400 Bad Request** - Prazo individual no passado (service)
```json
{ "success": false, "message": "Prazo inválido", "details": { "message": "O prazo calculado para o aluno 550e8400-... não pode ser no passado." } }
```

**400 Bad Request** - Tarefa compartilhada sem limites, ou individual com limites (entidade — `TarefaAcademica.validarCompartilhada()`)
```json
{ "message": "Tarefa compartilhada requer TarefaMinPessoas e TarefaMaxPessoas" }
```

**404 Not Found** - Alguma matrícula não existe (service)
```json
{ "success": false, "message": "Matrículas não encontradas", "details": { "message": "As seguintes matrículas não existem: 550e8400-..." } }
```

**401 Unauthorized** - Sem `UsuarioCPF` no token (service)
```json
{ "success": false, "message": "Usuário não autenticado", "details": { "message": "É necessário estar autenticado para criar uma tarefa." } }
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/tarefa \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tarefa": {
      "MatriculasGUID": ["550e8400-e29b-41d4-a716-446655440000"],
      "matXprofXturxescGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "TarefaTitulo": "Resolução de Exercícios",
      "TarefaPrazoData": "2026-07-25T23:59:59.000Z",
      "TarefaTipoEntrega": "digital"
    }
  }'
```

---

### Create Academic Task (Batch alias)

Endpoint alternativo, com o **mesmo body e as mesmas validações** de `POST /api/tarefa` (chama internamente o mesmo fluxo de criação). Existe como rota separada para clareza semântica do lado do frontend ao atribuir uma tarefa a múltiplos alunos; **sempre cria exatamente 1 tarefa** (atribuída a N matrículas) — não itera criando várias tarefas distintas.

**Endpoint:** `POST /api/tarefa/batch`

**Authentication:** Required

**Request Body:** idêntico ao de `POST /api/tarefa` (ver acima).

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "1 tarefa(s) criada(s) com sucesso",
  "data": {
    "tarefas": [ { "TarefaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "MatriculasAtribuidas": [ /* ... */ ] } ],
    "count": 1
  }
}
```

**Error Responses:** mesmas de `POST /api/tarefa` (mesma validação `validateBatchCreateBody`, funcionalmente idêntica a `validateCreateBody`, exceto que não valida `DatasPorMatricula`).

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/tarefa/batch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tarefa": {
      "MatriculasGUID": ["550e8400-...", "660e8400-..."],
      "matXprofXturxescGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "TarefaTitulo": "Redação",
      "TarefaPrazoData": "2026-07-30T23:59:59.000Z",
      "TarefaTipoEntrega": "fisica"
    }
  }'
```

---

### List Academic Tasks

Retorna lista de tarefas com filtros opcionais. Cada tarefa retornada já traz `MatriculasAtribuidas` com o status individual de cada aluno.

**Endpoint:** `GET /api/tarefa`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `matXprofXturxescGUID` | string | ❌ No | Filtro pelo vínculo matéria-professor-turma | UUID v4 |
| `TarefaCompartilhada` | boolean | ❌ No | Filtra tarefas em grupo (`true`) ou individuais (`false`) | `"true"`/`"false"` |
| `DataInicio` | string | ❌ No | Filtro de data inicial | ISO 8601 |
| `DataFim` | string | ❌ No | Filtro de data final | ISO 8601; deve ser posterior a `DataInicio` |

> Nota: o middleware (`validateFilters`) também aceita `MatriculaGUID` e `TarefaFeito` na query, mas o controller atual (`TarefaAcademicaControl.index`) **não repassa esses dois filtros** ao service — ⚠️ A confirmar: aparenta ser um filtro remanescente do modelo antigo (pré-normalização) ainda validado mas não mais aplicado.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Executado com sucesso",
  "data": {
    "tarefas": [
      {
        "TarefaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "matXprofXturxescGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "TarefaTitulo": "Resolução de Exercícios - Funções Quadráticas",
        "TarefaConteudo": "Resolver os exercícios 1 a 15 da página 87 do livro didático.",
        "TarefaPostagemData": "2026-07-17T10:30:00.000Z",
        "TarefaPrazoData": "2026-07-25T23:59:59.000Z",
        "TarefaTipoEntrega": "digital",
        "TarefaCompartilhada": false,
        "TarefaMinPessoas": null,
        "TarefaMaxPessoas": null,
        "MatriculasAtribuidas": [
          { "TarefaMatriculaGUID": "8a1e6679-...", "MatriculaGUID": "550e8400-...", "TarefaPrazoData": "2026-07-25T23:59:59.000Z", "TarefaFeito": false, "TarefaRealizacaoData": null }
        ],
        "CreatedAt": "2026-07-17T10:30:00.000Z",
        "UpdatedAt": "2026-07-17T10:30:00.000Z"
      }
    ],
    "total": 1
  }
}
```

**Error Responses:**

**400 Bad Request** - Filtro inválido (`matXprofXturxescGUID` não é UUID, `TarefaFeito` fora de `true`/`false`, datas inválidas ou fora de ordem)

**cURL Examples:**
```bash
# Listar tarefas de uma alocação (matéria+professor+turma)
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/tarefa?matXprofXturxescGUID=6ba7b810-9dad-11d1-80b4-00c04fd430c8"

# Filtrar tarefas em grupo
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/tarefa?TarefaCompartilhada=true"

# Filtrar por período
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/tarefa?DataInicio=2026-07-01&DataFim=2026-07-31"
```

---

### Get Academic Task by ID

**Endpoint:** `GET /api/tarefa/:TarefaGUID`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `TarefaGUID` | string | ✅ Yes | GUID único da tarefa | UUID v4 |

**Success Response (200 OK):** mesmo formato do item de `tarefas[]` em List, embrulhado em `data.tarefa`.

**Error Responses:**

**400 Bad Request** - GUID inválido
```json
{ "success": false, "message": "Erro na validação de dados", "error": { "message": "O parâmetro 'TarefaGUID' deve ser um UUID válido." } }
```

**404 Not Found**
```json
{ "success": false, "message": "Tarefa não encontrada", "details": { "message": "Não existe tarefa com id 7c9e6679-7425-40de-944b-e07fc1f90ae7" } }
```

**cURL Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/tarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7
```

---

### Update Academic Task

Atualiza os **dados compartilhados** da tarefa (afeta todos os alunos atribuídos). `TarefaCompartilhada` é **imutável** após a criação — não pode ser alterado via este endpoint. `TarefaFeito` também não pertence mais a este endpoint (ver [Mark as Done / Undone](#mark-as-done--undone)).

**Endpoint:** `PUT /api/tarefa/:TarefaGUID`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TarefaGUID` | string | ✅ Yes | GUID único da tarefa |

**Request Body:**
```json
{
  "tarefa": {
    "TarefaTitulo": "Resolução de Exercícios (Atualizado)",
    "TarefaConteudo": "Resolver os exercícios 1 a 20.",
    "TarefaPrazoData": "2026-07-27T23:59:59.000Z",
    "TarefaTipoEntrega": "digital"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `tarefa` | object | ✅ Yes | Objeto com campos a atualizar | Pelo menos 1 dos 4 campos abaixo |
| `tarefa.TarefaTitulo` | string | ❌ No | Novo título | 1-128 caracteres, não vazio |
| `tarefa.TarefaConteudo` | string | ❌ No | Nova descrição | Máx. 1024 caracteres |
| `tarefa.TarefaPrazoData` | string | ❌ No | Novo prazo padrão | ISO 8601; futuro |
| `tarefa.TarefaTipoEntrega` | string | ❌ No | Novo tipo de entrega | `digital` ou `fisica` |
| `tarefa.TarefaMinPessoas` | number \| null | ❌ No | Só editável se a tarefa já for `TarefaCompartilhada=true` | ≥1 |
| `tarefa.TarefaMaxPessoas` | number \| null | ❌ No | Só editável se a tarefa já for `TarefaCompartilhada=true` | ≥`TarefaMinPessoas` |

> `TarefaMinPessoas`/`TarefaMaxPessoas` não são validados pelo `TarefaAcademicaMiddleware.validateUpdateBody` (que só reconhece os 4 primeiros campos), mas **são** aceitos e validados pelo `TarefaAcademicaService.atualizarTarefa` — ⚠️ A confirmar: o middleware pode estar defasado em relação ao service.

**Success Response (200 OK):** mesmo formato do `Get Academic Task by ID`, com os campos atualizados.

**Error Responses:**

**400 Bad Request** - Nenhum campo fornecido (middleware)
```json
{ "success": false, "message": "Erro na validação de dados", "error": { "message": "É necessário fornecer ao menos um campo para atualização: TarefaTitulo, TarefaConteudo, TarefaPrazoData, TarefaTipoEntrega" } }
```

**400 Bad Request** - Novo prazo no passado (service)
```json
{ "success": false, "message": "Prazo inválido", "details": { "message": "O novo prazo da tarefa não pode ser no passado." } }
```

**400 Bad Request** - Limites de pessoas em tarefa não-compartilhada (service)
```json
{ "success": false, "message": "Operação inválida", "details": { "message": "Não é possível definir limites de pessoas em tarefa individual." } }
```

**404 Not Found**
```json
{ "success": false, "message": "Tarefa não encontrada", "details": { "message": "Não existe tarefa com id 7c9e6679-7425-40de-944b-e07fc1f90ae7" } }
```

**401 Unauthorized** - Sem `UsuarioCPF` no token
```json
{ "success": false, "message": "Usuário não autenticado", "details": { "message": "É necessário estar autenticado para atualizar uma tarefa." } }
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/api/tarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "tarefa": { "TarefaPrazoData": "2026-07-27T23:59:59.000Z" } }'
```

---

### Mark as Done / Undone

Marca (ou desmarca) a atribuição de **um aluno específico** como feita. Diferente do modelo antigo, não é mais parte do `PUT` genérico — é uma ação individual por matrícula, feita via `PATCH`.

**Endpoint:** `PATCH /api/tarefa/:TarefaGUID/marcar-feito`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TarefaGUID` | string | ✅ Yes | GUID único da tarefa |

**Request Body:**
```json
{ "MatriculaGUID": "550e8400-e29b-41d4-a716-446655440000", "TarefaFeito": true }
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `MatriculaGUID` | string | ✅ Yes | Matrícula do aluno cuja atribuição será alterada | 1-36 caracteres |
| `TarefaFeito` | boolean | ✅ Yes | `true` para marcar como feita, `false` para desmarcar | Booleano |

> Quando `TarefaFeito` muda para `true`, `TarefaRealizacaoData` é preenchida automaticamente pelo repositório; ao desmarcar (`false`), o comportamento de `TarefaRealizacaoData` segue a implementação do `TarefaAcademicaMatriculaDAO.update` (⚠️ A confirmar se ele limpa a data ao desmarcar — não há checagem explícita na camada de service).

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Tarefa marcada como feita",
  "data": {
    "atribuicao": {
      "TarefaMatriculaGUID": "8a1e6679-7425-40de-944b-e07fc1f90aa1",
      "MatriculaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "TarefaPrazoData": "2026-07-25T23:59:59.000Z",
      "TarefaFeito": true,
      "TarefaRealizacaoData": "2026-07-20T14:30:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - `MatriculaGUID`/`TarefaFeito` ausente ou tipo errado (middleware)
```json
{ "success": false, "message": "Erro na validação de dados", "error": { "message": "O campo 'TarefaFeito' é obrigatório e deve ser um booleano." } }
```

**404 Not Found** - Aluno não tem essa tarefa atribuída
```json
{ "success": false, "message": "Atribuição não encontrada", "details": { "message": "Aluno 550e8400-... não possui a tarefa 7c9e6679-..." } }
```

**401 Unauthorized**
```json
{ "success": false, "message": "Usuário não autenticado", "details": { "message": "É necessário estar autenticado para marcar tarefa." } }
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/api/tarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7/marcar-feito \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "MatriculaGUID": "550e8400-e29b-41d4-a716-446655440000", "TarefaFeito": true }'
```

---

### Delete Academic Task

Exclui a tarefa (dados compartilhados) e, em cascata (`ON DELETE CASCADE` no schema), todas as atribuições em `tarefaacademica_matricula` e os vínculos em `relacaoanexostarefa`.

**Endpoint:** `DELETE /api/tarefa/:TarefaGUID`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TarefaGUID` | string | ✅ Yes | GUID único da tarefa |

**Success Response (200 OK):**
```json
{ "success": true, "message": "Tarefa excluída com sucesso", "data": null }
```

**Error Responses:**

**404 Not Found**
```json
{ "success": false, "message": "Tarefa não encontrada", "error": { "message": "Não existe tarefa com id 7c9e6679-7425-40de-944b-e07fc1f90ae7" } }
```

**401 Unauthorized**
```json
{ "success": false, "message": "Usuário não autenticado", "details": { "message": "É necessário estar autenticado para excluir uma tarefa." } }
```

**cURL Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/tarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7
```

---

### Submit Attachment to Task (Entrega)

Vincula um anexo **de entrega** (resposta do aluno) a uma tarefa já enviada via `POST /api/anexo`. Só é permitido para tarefas com `TarefaTipoEntrega='digital'`.

**Endpoint:** `POST /api/tarefa/:TarefaGUID/anexo-entrega`

**Authentication:** Required

**Request Body:**
```json
{ "AnexoGUID": "550e8400-e29b-41d4-a716-446655440000" }
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `AnexoGUID` | string | ✅ Yes | GUID do anexo a vincular como entrega | UUID v4 |

**Success Response (200 OK):**
```json
{ "success": true, "message": "Anexo de entrega vinculado com sucesso", "data": null }
```

**Error Responses:**

**400 Bad Request** - `AnexoGUID` ausente/inválido (middleware)
```json
{ "success": false, "message": "Erro na validação de dados", "error": { "message": "O campo 'AnexoGUID' deve ser um UUID válido." } }
```

**400 Bad Request** - Tarefa não aceita entrega digital (service)
```json
{ "success": false, "message": "Tipo de entrega inválido", "details": { "message": "Esta tarefa não aceita entrega digital." } }
```

**404 Not Found** - Tarefa ou anexo não encontrado
```json
{ "success": false, "message": "Tarefa não encontrada", "details": { "message": "Não existe tarefa com id 7c9e6679-..." } }
```
```json
{ "success": false, "message": "Anexo não encontrado", "details": { "message": "Não existe anexo com id 550e8400-..." } }
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/tarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7/anexo-entrega \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "AnexoGUID": "550e8400-e29b-41d4-a716-446655440000" }'
```

---

### Remove Attachment from Task

Remove o vínculo de um anexo de **entrega** de uma tarefa.

**Endpoint:** `DELETE /api/tarefa/:TarefaGUID/anexo-entrega/:AnexoGUID`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `TarefaGUID` | string | ✅ Yes | GUID único da tarefa |
| `AnexoGUID` | string | ✅ Yes | GUID único do anexo |

**Success Response (200 OK):**
```json
{ "success": true, "message": "Anexo removido da tarefa com sucesso", "data": null }
```

**Error Responses:**

**400 Bad Request** - GUID inválido (`TarefaGUID` ou `AnexoGUID` fora do formato UUID)

**404 Not Found** - Tarefa não encontrada
```json
{ "success": false, "message": "Tarefa não encontrada", "details": { "message": "Não existe tarefa com id 7c9e6679-..." } }
```

**cURL Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/tarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7/anexo-entrega/550e8400-e29b-41d4-a716-446655440000
```

---

### List Anexos (Materiais de Apoio)

Lista os anexos de **material de apoio** vinculados à tarefa (enviados pelo professor na criação via `anexosDescricao`, ou depois via `POST .../anexos`) — distintos dos anexos de entrega do aluno.

**Endpoint:** `GET /api/tarefa/:TarefaGUID/anexos`

**Authentication:** Required

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Anexos listados com sucesso",
  "data": {
    "anexos": [
      { "AnexoGUID": "770e8400-e29b-41d4-a716-446655440002", "AnexoNomeOriginal": "lista-exercicios.pdf", "AnexoTamanho": 102400 }
    ],
    "total": 1
  }
}
```

**Error Responses:**

**401 Unauthorized** - Sem token
```json
{ "success": false, "message": "Não autenticado" }
```

**404 Not Found** - Tarefa não encontrada
```json
{ "success": false, "message": "Tarefa não encontrada" }
```

**500 Internal Server Error** - Serviço de anexos não configurado (só ocorre se o router for montado sem `RelacaoAnexosService`)

**cURL Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/tarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7/anexos
```

---

### Link Anexo (Material de Apoio)

Vincula um anexo adicional como material de apoio da tarefa (mesmo mecanismo de `anexosDescricao` na criação, mas endpoint dedicado para adicionar depois).

**Endpoint:** `POST /api/tarefa/:TarefaGUID/anexos`

**Authentication:** Required

**Request Body:**
```json
{ "AnexoGUID": "770e8400-e29b-41d4-a716-446655440002" }
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Anexo vinculado à tarefa com sucesso",
  "data": {
    "relacao": {
      "RelacaoAnexoGUID": "9e9f7780-9647-62fg-c166-g29he3h12cg9",
      "AnexoGUID": "770e8400-e29b-41d4-a716-446655440002",
      "TarefaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "PendenciaGUID": null,
      "EventoGUID": null,
      "RelacaoCreatedAt": "2026-07-18T09:00:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - `AnexoGUID` ausente
```json
{ "success": false, "message": "AnexoGUID é obrigatório" }
```

**403 Forbidden** - Anexo de outra escola
```json
{ "success": false, "message": "Anexo não pertence à mesma escola do recurso" }
```

**404 Not Found** - Anexo ou tarefa não encontrado

**409 Conflict** - Anexo já vinculado a esta tarefa
```json
{ "success": false, "message": "Anexo já vinculado a esta tarefa" }
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/tarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7/anexos \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "AnexoGUID": "770e8400-e29b-41d4-a716-446655440002" }'
```

---

## Data Models

### TarefaAcademica (dados compartilhados)

| Field | Type | Description |
|-------|------|-------------|
| `TarefaGUID` | string | UUID v4 único da tarefa (PK) |
| `matXprofXturxescGUID` | string | GUID do vínculo matéria-professor-turma-escola (FK) |
| `TarefaTitulo` | string | Título da tarefa (1-128 chars) |
| `TarefaConteudo` | string \| null | Descrição detalhada (máx. 1024 chars) |
| `TarefaPostagemData` | datetime | Data/hora de criação da tarefa (preenchida automaticamente) |
| `TarefaPrazoData` | datetime | Prazo padrão da tarefa (usado quando o aluno não tem override) |
| `TarefaTipoEntrega` | enum | `digital` ou `fisica` |
| `TarefaCompartilhada` | boolean | Se `true`, tarefa é feita em grupo (integra com GrupoTarefa) |
| `TarefaMinPessoas` | number \| null | Mínimo de pessoas por grupo (obrigatório se `TarefaCompartilhada`) |
| `TarefaMaxPessoas` | number \| null | Máximo de pessoas por grupo (obrigatório se `TarefaCompartilhada`) |
| `CreatedAt` / `UpdatedAt` | datetime \| null | Timestamps do registro |

### TarefaAcademicaMatricula (atribuição por aluno — N:N)

| Field | Type | Description |
|-------|------|-------------|
| `TarefaMatriculaGUID` | string | UUID v4 (PK) |
| `TarefaGUID` | string | FK para `tarefaacademica` |
| `MatriculaGUID` | string | FK para `matricula` |
| `TarefaPrazoDataMatricula` | datetime \| null | Override de prazo individual (agendamento automático); se `null`, usa `TarefaPrazoData` da tarefa |
| `TarefaFeito` | boolean | Status de conclusão deste aluno |
| `TarefaRealizacaoData` | datetime \| null | Preenchida ao marcar como feito |
| `CreatedAt` / `UpdatedAt` | datetime | Timestamps |

### Database Schema

```sql
CREATE TABLE `tarefaacademica` (
  `TarefaGUID` CHAR(36) NOT NULL,
  `matXprofXturxescGUID` CHAR(36) NOT NULL COMMENT 'FK para materiaxprofessorxturma',
  `TarefaTitulo` VARCHAR(255) NOT NULL,
  `TarefaConteudo` TEXT,
  `TarefaPostagemData` DATETIME NOT NULL,
  `TarefaPrazoData` DATETIME NOT NULL,
  `TarefaTipoEntrega` VARCHAR(50) NOT NULL DEFAULT 'Arquivo',
  `TarefaCompartilhada` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Se TRUE, tarefa é feita em grupos',
  `TarefaMinPessoas` INT NULL COMMENT 'Mínimo de pessoas por grupo (obrigatório se compartilhada)',
  `TarefaMaxPessoas` INT NULL COMMENT 'Máximo de pessoas por grupo (obrigatório se compartilhada)',
  `TarefaCreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `TarefaUpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`TarefaGUID`),
  INDEX `idx_matXprofXturxescGUID` (`matXprofXturxescGUID`),
  INDEX `idx_prazo_postagem` (`TarefaPrazoData`, `TarefaPostagemData`),
  INDEX `idx_tarefa_compartilhada` (`TarefaCompartilhada`),
  CONSTRAINT `CHK_TarefaMinPessoas` CHECK (`TarefaMinPessoas` >= 1),
  CONSTRAINT `CHK_TarefaMaxPessoas` CHECK (`TarefaMaxPessoas` >= `TarefaMinPessoas`),
  CONSTRAINT `fk_tarefa_alocacao` FOREIGN KEY (`matXprofXturxescGUID`)
    REFERENCES `materiaxprofessorxturma` (`MatProfTurGUID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tarefaacademica_matricula` (
  `TarefaMatriculaGUID` CHAR(36) NOT NULL,
  `TarefaGUID` CHAR(36) NOT NULL COMMENT 'FK para tarefaacademica',
  `MatriculaGUID` CHAR(36) NOT NULL COMMENT 'FK para matricula',
  `TarefaPrazoDataMatricula` DATETIME NULL COMMENT 'Override de prazo individual',
  `TarefaFeito` BOOLEAN NOT NULL DEFAULT FALSE,
  `TarefaRealizacaoData` DATETIME NULL,
  `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`TarefaMatriculaGUID`),
  UNIQUE KEY `uq_tarefa_matricula` (`TarefaGUID`, `MatriculaGUID`),
  INDEX `idx_tarefa` (`TarefaGUID`),
  INDEX `idx_matricula` (`MatriculaGUID`),
  INDEX `idx_feito` (`TarefaFeito`),
  CONSTRAINT `fk_tarefamatricula_tarefa` FOREIGN KEY (`TarefaGUID`)
    REFERENCES `tarefaacademica` (`TarefaGUID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_tarefamatricula_matricula` FOREIGN KEY (`MatriculaGUID`)
    REFERENCES `matricula` (`MatriculaGUID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Fontes: `backend/database/migrations/refactor-tarefa-normalized.sql`, `backend/database/migrations/2026-05-29-add-tarefa-compartilhada.sql`. ⚠️ A confirmar: a coluna `TarefaPrazoDataMatricula` referenciada pelo código (`backend/repositories/tarefaacademica-matricula.repository.ts`, `backend/services/calendario.service.ts`) não foi localizada em nenhum arquivo `.sql` do repositório — provavelmente adicionada por migration não versionada.

---

## Business Rules

### Creation Rules

1. **1 tarefa → N alunos (normalizado)**: uma única linha em `tarefaacademica` (dados compartilhados) e N linhas em `tarefaacademica_matricula` (uma por matrícula em `MatriculasGUID`), criadas em lote via `TarefaAcademicaMatriculaDAO.createBatch` (`backend/services/tarefaacademica.service.ts::criarTarefa`).
2. **Todas as matrículas devem existir**: se qualquer GUID de `MatriculasGUID` não for encontrado, a criação inteira falha com 404 antes de gravar qualquer coisa.
3. **Prazo padrão vs. prazo por matrícula**: se `DatasPorMatricula` for fornecido, o `TarefaPrazoData` "base" da tarefa passa a ser o **menor** prazo entre os informados (`Math.min(...)`), garantindo que a tarefa nunca apareça com prazo posterior ao prazo mais cedo de qualquer aluno; cada aluno com override individual tem seu próprio `TarefaPrazoDataMatricula`.
4. **Tarefa compartilhada exige limites**: `TarefaCompartilhada=true` obriga `TarefaMinPessoas` e `TarefaMaxPessoas` (`TarefaMaxPessoas >= TarefaMinPessoas >= 1`); `TarefaCompartilhada=false` exige que ambos sejam `null` (`TarefaAcademica.validarCompartilhada()`).
5. **Anexos de descrição são best-effort**: cada GUID em `anexosDescricao` só é vinculado se o `AnexoDAO.findById` encontrar o anexo — GUIDs inválidos são silenciosamente ignorados (não geram erro 404), diferente do endpoint dedicado `POST .../anexos`.
6. **`TarefaCompartilhada` é imutável**: não há campo para alterá-la em `PUT /:TarefaGUID` — uma vez criada como compartilhada (ou individual), não pode mudar (evita inconsistência com grupos já formados).

### Update Rules

1. Afeta os **dados compartilhados** — título, conteúdo, prazo padrão e tipo de entrega — refletidos para todos os alunos que não tenham override individual de prazo.
2. `TarefaMinPessoas`/`TarefaMaxPessoas` só podem ser alterados se a tarefa já for `TarefaCompartilhada=true` (caso contrário, 400 "Não é possível definir limites de pessoas em tarefa individual").
3. Novo prazo (`TarefaPrazoData`) deve ser futuro no momento da chamada.

### Mark as Done Rules

1. **Ação individual por matrícula**: `PATCH /:TarefaGUID/marcar-feito` recebe `MatriculaGUID` explícito no body — quem chama pode ser o próprio aluno (marcando a si mesmo) ou, em tese, qualquer usuário autenticado, já que o endpoint **não valida no controller/service que `usuarioCPF` corresponde ao dono da `MatriculaGUID`** — ⚠️ A confirmar: possível lacuna de autorização (comparar com o padrão de `pendencia.marcarComoFeito`, que valida `pendencia.UsuarioCPF === usuarioCPF`).
2. A atribuição (`TarefaMatriculaGUID`) precisa existir para a combinação `TarefaGUID + MatriculaGUID`, senão 404.

### Delete Rules

1. `DELETE /:TarefaGUID` remove a tarefa; `ON DELETE CASCADE` nas FKs remove automaticamente as atribuições (`tarefaacademica_matricula`) e os vínculos de anexo (`relacaoanexostarefa`) — não há soft delete.
2. Arquivos físicos dos anexos **não** são excluídos (permanecem em `/uploads/anexos/`; ver [anexo-api.md](anexo-api.md)).

### Attachment Rules

1. **Dois tipos de anexo distintos**: "material de apoio" (`anexosDescricao` na criação, ou `POST/GET /:TarefaGUID/anexos`, via `relacaoanexos`) vs. "entrega do aluno" (`POST/DELETE /:TarefaGUID/anexo-entrega[/:AnexoGUID]`, via `TarefaAcademicaDAO.vincularAnexo(..., "resposta")`/`relacaoanexostarefa`) — são mecanismos de persistência diferentes no código, ainda que conceitualmente análogos.
2. **Entrega só para tipo digital**: `POST /:TarefaGUID/anexo-entrega` retorna 400 se `TarefaTipoEntrega !== 'digital'`.
3. **Vinculação de material de apoio** valida que o anexo pertence à mesma escola do recurso e impede duplicidade (409 se já vinculado) — mesma lógica de `RelacaoAnexosService.vincularAnexo` usada em Evento/Pendência.

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | Erro na validação de dados — `tarefa`/`MatriculasGUID`/`matXprofXturxescGUID`/`TarefaTitulo`/`TarefaPrazoData`/`TarefaTipoEntrega`/`anexosDescricao`/`DatasPorMatricula` | Campo ausente ou fora do formato esperado (middleware) |
| 400 | Prazo inválido | `TarefaPrazoData` (ou algum valor de `DatasPorMatricula`) no passado |
| 400 | Tarefa compartilhada requer TarefaMinPessoas e TarefaMaxPessoas / TarefaMinPessoas deve ser >= 1 / TarefaMaxPessoas deve ser >= TarefaMinPessoas / Tarefa individual não pode ter limites de pessoas | `validarCompartilhada()` da entidade |
| 400 | Operação inválida | `PUT` tentando definir min/max pessoas em tarefa não-compartilhada |
| 400 | `MatriculaGUID`/`TarefaFeito` obrigatório | `PATCH .../marcar-feito` com body incompleto |
| 400 | `AnexoGUID` é obrigatório / deve ser um UUID válido | Faltando ou mal formatado em endpoints de anexo |
| 400 | Tipo de entrega inválido | `POST .../anexo-entrega` em tarefa `fisica` |
| 401 | Usuário não autenticado / Não autenticado | Token ausente/inválido, ou `req.user` não resolvido |
| 403 | Anexo não pertence à mesma escola do recurso | Anexo de material de apoio de escola diferente |
| 404 | Tarefa não encontrada | `TarefaGUID` inexistente |
| 404 | Matrículas não encontradas | Algum GUID de `MatriculasGUID` inexistente na criação |
| 404 | Atribuição não encontrada | `PATCH .../marcar-feito` para matrícula sem essa tarefa |
| 404 | Anexo não encontrado | `AnexoGUID` inexistente |
| 409 | Anexo já vinculado a esta tarefa | Duplicidade em material de apoio |
| 500 | Serviço de anexos não configurado | Router de anexos montado sem `RelacaoAnexosService` |

---

## Examples

### Cenário 1: Professor cria tarefa individual para uma turma inteira
```bash
POST /api/tarefa
{
  "tarefa": {
    "MatriculasGUID": ["550e8400-...", "660e8400-...", "770e8400-..."],
    "matXprofXturxescGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "TarefaTitulo": "Lista de Exercícios 3",
    "TarefaPrazoData": "2026-08-01T23:59:59.000Z",
    "TarefaTipoEntrega": "digital"
  }
}
# Response 201 — 1 tarefa criada, 3 atribuições (uma por aluno)
```

### Cenário 2: Aluno marca sua atribuição como feita
```bash
PATCH /api/tarefa/7c9e6679-7425-40de-944b-e07fc1f90ae7/marcar-feito
{ "MatriculaGUID": "550e8400-e29b-41d4-a716-446655440000", "TarefaFeito": true }
# Response 200 — só a atribuição desse aluno muda; os outros dois continuam TarefaFeito=false
```

### Cenário 3: Tarefa compartilhada (em grupo) sem definir os limites (❌ Erro)
```bash
POST /api/tarefa
{
  "tarefa": {
    "MatriculasGUID": ["550e8400-..."],
    "matXprofXturxescGUID": "6ba7b810-...",
    "TarefaTitulo": "Trabalho em grupo",
    "TarefaPrazoData": "2026-08-10T23:59:59.000Z",
    "TarefaTipoEntrega": "digital",
    "TarefaCompartilhada": true
  }
}

Response 400:
{ "message": "Tarefa compartilhada requer TarefaMinPessoas e TarefaMaxPessoas" }
```

### Cenário 4: Agendamento automático com prazo individual por aluno
```bash
POST /api/tarefa
{
  "tarefa": {
    "MatriculasGUID": ["550e8400-...", "660e8400-..."],
    "matXprofXturxescGUID": "6ba7b810-...",
    "TarefaTitulo": "Estudo dirigido",
    "TarefaPrazoData": "2026-08-05T23:59:59.000Z",
    "TarefaTipoEntrega": "fisica",
    "DatasPorMatricula": {
      "550e8400-...": "2026-08-03T23:59:59.000Z",
      "660e8400-...": "2026-08-06T23:59:59.000Z"
    }
  }
}
# Response 201 — TarefaPrazoData da tarefa vira 2026-08-03 (a menor data), cada aluno mantém seu próprio prazo em MatriculasAtribuidas
```

---

## Integration with Other Entities

- **TarefaAcademica → Matricula**: cada atribuição (`tarefaacademica_matricula`) referencia uma matrícula ativa — ver [matricula-api.md](matricula-api.md).
- **TarefaAcademica → MaterialProfessorTurma**: `matXprofXturxescGUID` referencia a alocação do professor — ver [professor-api.md](professor-api.md).
- **TarefaAcademica ↔ GrupoTarefa**: quando `TarefaCompartilhada=true`, os alunos se organizam em grupos usando os endpoints de [grupotarefa-api.md](grupotarefa-api.md) e [convitegrupotarefa-api.md](convitegrupotarefa-api.md), respeitando `TarefaMinPessoas`/`TarefaMaxPessoas`.
- **TarefaAcademica → Calendário**: cada atribuição aparece em `GET /api/calendario` como um aviso `TipoAviso='tarefa'` — ver [calendario-api.md](calendario-api.md).
- **TarefaAcademica ↔ RelacaoAnexos/RelacaoAnexosTarefa ↔ Anexo**: ver [anexo-api.md](anexo-api.md).
- **TarefaAcademica ← Grade Horária**: `DatasPorMatricula` é o mecanismo usado pelo agendamento automático (`POST /api/grade-horaria/calcular-datas`) para calcular prazos individuais respeitando o cronograma de cada turma — ver [grade-horaria-api.md](grade-horaria-api.md).

---

## Notes

- Datas retornadas em ISO 8601 (UTC).
- `TarefaGUID` é gerado no backend (`uuid v4`); `TarefaMatriculaGUID` também.
- O modelo antigo (1 tarefa = 1 aluno, com `MatriculaGUID` singular) foi migrado para o modelo atual por `backend/database/migrations/refactor-tarefa-normalized.sql`; a tabela `tarefaacademica_old_backup` pode ainda existir em bancos que rodaram a migration sem limpeza posterior.
- Vários `console.log` de debug (`🔍 DEBUG`) permanecem no controller/service para depuração de `TarefaCompartilhada` — não afetam a resposta HTTP, apenas os logs do servidor.

**Última atualização:** 17/07/2026
**Versão da API:** 2.0.0
