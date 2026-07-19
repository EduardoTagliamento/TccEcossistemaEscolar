# API Documentation - Projeto

**Version:** 1.0.0
**Base URL:** `/api/projeto`
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Criar Projeto](#criar-projeto)
  - [Listar Projetos](#listar-projetos)
  - [Buscar Projeto](#buscar-projeto)
  - [Atualizar Projeto](#atualizar-projeto)
  - [Encerrar Projeto](#encerrar-projeto)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)
- [Examples](#examples)
- [Integration with Other Entities](#integration-with-other-entities)
- [Notes](#notes)

---

## Overview

API do módulo **Projetos** — a atividade-mãe criada por **Professor (FuncaoId=3)** ou **Direção (FuncaoId=6)**, direcionada a turmas específicas da escola ou à escola inteira. Diferente de Tarefa Compartilhada, um Projeto não atribui trabalho individual a alunos — ele apenas define a ideia, a mecânica de pontuação e os limites de grupo; os alunos elegíveis então criam seus próprios grupos com uma proposta (ver [grupoprojeto-api.md](grupoprojeto-api.md)).

**Conceito:**
- `Projeto` pertence a uma `EscolaGUID`, tem um `UsuarioCPFCriador` (Professor ou Direção) e um `ProjetoPublicoAlvo` (`'Escola'` ou `'Turmas'`).
- Quando `ProjetoPublicoAlvo='Turmas'`, as turmas elegíveis ficam em `projetoturma` (N:N).
- Não há exclusão física — só `PATCH .../encerrar` (ver Business Rules).

**Permissões:**
- **Criar**: apenas Professor ou Direção ativos na escola informada.
- **Atualizar/Encerrar**: apenas o `UsuarioCPFCriador` do projeto.
- **Listar/Buscar**: qualquer usuário autenticado — a listagem já filtra por elegibilidade/autoria conforme o papel do usuário (ver Business Rules).

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

### Criar Projeto

Cria um novo projeto. Apenas Professor ou Direção da escola informada.

**Endpoint:** `POST /api/projeto`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
  "ProjetoTitulo": "Feira de Ciências 2026",
  "ProjetoDescricao": "Projetos multidisciplinares apresentados em banca aberta ao público.",
  "ProjetoMecanicaPontuacao": "Cada grupo é avaliado por banca de professores em critérios de originalidade, execução e apresentação.",
  "ProjetoPublicoAlvo": "Turmas",
  "TurmasGUID": ["880e8400-e29b-41d4-a716-446655440001", "880e8400-e29b-41d4-a716-446655440002"],
  "ProjetoGrupoMinPessoas": 2,
  "ProjetoGrupoMaxPessoas": 5,
  "ProjetoInscricaoPrazoData": "2026-08-15T23:59:59.000Z",
  "ProjetoEntregaPrazoData": "2026-09-01T23:59:59.000Z"
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|--------------|------------|
| `EscolaGUID` | string | ✅ Yes | UUID da escola | UUID v4 |
| `ProjetoTitulo` | string | ✅ Yes | Título do projeto | 1-128 caracteres |
| `ProjetoDescricao` | string | ✅ Yes | A ideia do projeto | 1-2048 caracteres |
| `ProjetoMecanicaPontuacao` | string | ❌ No | Texto livre descrevendo como o projeto será avaliado | máx. 1024 caracteres |
| `ProjetoPublicoAlvo` | string | ✅ Yes | `'Escola'` ou `'Turmas'` | enum |
| `TurmasGUID` | string[] | ⚠️ Condicional | Obrigatório e não-vazio se `ProjetoPublicoAlvo='Turmas'` | UUIDs v4 |
| `ProjetoGrupoMinPessoas` | number | ✅ Yes | Mínimo de pessoas por grupo | inteiro ≥ 1 |
| `ProjetoGrupoMaxPessoas` | number | ✅ Yes | Máximo de pessoas por grupo | inteiro ≥ `ProjetoGrupoMinPessoas` |
| `ProjetoInscricaoPrazoData` | string (ISO 8601) | ✅ Yes | Prazo para criar/entrar em grupos | data futura |
| `ProjetoEntregaPrazoData` | string (ISO 8601) | ❌ No | Prazo final do projeto | ≥ `ProjetoInscricaoPrazoData` |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Projeto criado com sucesso",
  "data": {
    "projeto": {
      "ProjetoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "UsuarioCPFCriador": "12345678901",
      "NomeCriador": "Maria Professora",
      "ProjetoTitulo": "Feira de Ciências 2026",
      "ProjetoDescricao": "Projetos multidisciplinares apresentados em banca aberta ao público.",
      "ProjetoMecanicaPontuacao": "Cada grupo é avaliado por banca de professores...",
      "ProjetoPublicoAlvo": "Turmas",
      "TurmasGUID": ["880e8400-e29b-41d4-a716-446655440001", "880e8400-e29b-41d4-a716-446655440002"],
      "ProjetoGrupoMinPessoas": 2,
      "ProjetoGrupoMaxPessoas": 5,
      "ProjetoInscricaoPrazoData": "2026-08-15T23:59:59.000Z",
      "ProjetoEntregaPrazoData": "2026-09-01T23:59:59.000Z",
      "ProjetoStatus": "Aberto",
      "TotalGrupos": 0,
      "CreatedAt": "2026-07-19T10:00:00.000Z",
      "UpdatedAt": "2026-07-19T10:00:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Validação de campo (middleware)
```json
{ "success": false, "message": "Erro na validação de dados", "details": { "message": "O campo 'ProjetoTitulo' é obrigatório e deve ter entre 1 e 128 caracteres." } }
```

**400 Bad Request** - `TurmasGUID` ausente com `ProjetoPublicoAlvo='Turmas'`
```json
{ "success": false, "message": "TurmasGUID é obrigatório quando ProjetoPublicoAlvo é \"Turmas\"" }
```

**400 Bad Request** - Turma de outra escola
```json
{ "success": false, "message": "Todas as turmas devem pertencer à escola informada em EscolaGUID" }
```

**400 Bad Request** - Prazo no passado
```json
{ "success": false, "message": "ProjetoInscricaoPrazoData não pode ser no passado" }
```

**403 Forbidden** - Usuário não é Professor/Direção na escola
```json
{ "success": false, "message": "Apenas Professor ou Direção podem criar um projeto" }
```

**404 Not Found** - Turma inexistente
```json
{ "success": false, "message": "Turmas não encontradas", "details": { "message": "As seguintes turmas não existem: ..." } }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/projeto \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000", "ProjetoTitulo": "Feira de Ciências 2026", "ProjetoDescricao": "...", "ProjetoPublicoAlvo": "Escola", "ProjetoGrupoMinPessoas": 2, "ProjetoGrupoMaxPessoas": 5, "ProjetoInscricaoPrazoData": "2026-08-15T23:59:59.000Z" }'
```

---

### Listar Projetos

Lista projetos de uma escola. O resultado depende do papel do usuário autenticado (ver Business Rules).

**Endpoint:** `GET /api/projeto?EscolaGUID={guid}`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EscolaGUID` | string | ✅ Yes | UUID da escola |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Projetos listados com sucesso",
  "data": {
    "projetos": [
      {
        "ProjetoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
        "UsuarioCPFCriador": "12345678901",
        "ProjetoTitulo": "Feira de Ciências 2026",
        "ProjetoPublicoAlvo": "Turmas",
        "ProjetoStatus": "Aberto",
        "ProjetoInscricaoPrazoData": "2026-08-15T23:59:59.000Z",
        "CreatedAt": "2026-07-19T10:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

**Error Responses:**

**400 Bad Request** - `EscolaGUID` ausente/inválido
```json
{ "success": false, "message": "Erro na validação de dados", "details": { "message": "O parâmetro 'EscolaGUID' é obrigatório na query string." } }
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/projeto?EscolaGUID=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Buscar Projeto

Detalhe de um projeto específico (com nome do criador, turmas elegíveis e total de grupos).

**Endpoint:** `GET /api/projeto/:projetoGUID`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projetoGUID` | string | ✅ Yes | UUID do projeto |

**Success Response (200 OK):** mesma forma do objeto `projeto` retornado em [Criar Projeto](#criar-projeto).

**Error Responses:**

**404 Not Found**
```json
{ "success": false, "message": "Projeto não encontrado" }
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/projeto/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Atualizar Projeto

Atualiza campos do projeto. Apenas o criador.

**Endpoint:** `PATCH /api/projeto/:projetoGUID`

**Request Body (todos opcionais, ao menos um obrigatório):**
```json
{ "ProjetoTitulo": "Feira de Ciências 2026 — Edição Especial", "ProjetoGrupoMaxPessoas": 6 }
```

| Field | Type | Validation |
|-------|------|------------|
| `ProjetoTitulo` | string | 1-128 caracteres |
| `ProjetoDescricao` | string | 1-2048 caracteres |
| `ProjetoMecanicaPontuacao` | string \| null | máx. 1024 caracteres |
| `ProjetoGrupoMinPessoas` | number | inteiro ≥ 1 |
| `ProjetoGrupoMaxPessoas` | number | inteiro ≥ 1 |
| `ProjetoInscricaoPrazoData` | string (ISO 8601) | data válida |
| `ProjetoEntregaPrazoData` | string (ISO 8601) \| null | data válida |

**Success Response (200 OK):**
```json
{ "success": true, "message": "Projeto atualizado com sucesso", "data": { "projeto": { /* ... */ } } }
```

**Error Responses:**

**400 Bad Request** - Nenhum campo enviado / validação
```json
{ "success": false, "message": "Erro na validação de dados", "details": { "message": "Envie ao menos um campo para atualizar: ..." } }
```

**403 Forbidden** - Não é o criador
```json
{ "success": false, "message": "Apenas o criador pode atualizar o projeto" }
```

**404 Not Found**
```json
{ "success": false, "message": "Projeto não encontrado" }
```

**cURL Example:**
```bash
curl -X PATCH https://api.example.com/api/projeto/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "ProjetoGrupoMaxPessoas": 6 }'
```

---

### Encerrar Projeto

Encerra o projeto (`ProjetoStatus='Encerrado'`). Não há endpoint de exclusão física — ver Notes.

**Endpoint:** `PATCH /api/projeto/:projetoGUID/encerrar`

**Success Response (200 OK):**
```json
{ "success": true, "message": "Projeto encerrado com sucesso", "data": null }
```

**Error Responses:**

**400 Bad Request** - Já encerrado
```json
{ "success": false, "message": "Projeto já está encerrado" }
```

**403 Forbidden**
```json
{ "success": false, "message": "Apenas o criador pode encerrar o projeto" }
```

**404 Not Found**
```json
{ "success": false, "message": "Projeto não encontrado" }
```

**cURL Example:**
```bash
curl -X PATCH https://api.example.com/api/projeto/7c9e6679-7425-40de-944b-e07fc1f90ae7/encerrar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Data Models

### Projeto Entity

```typescript
type ProjetoPublicoAlvo = 'Escola' | 'Turmas';
type ProjetoStatus = 'Aberto' | 'Encerrado';

interface Projeto {
  ProjetoGUID: string;
  EscolaGUID: string;
  UsuarioCPFCriador: string;
  ProjetoTitulo: string;
  ProjetoDescricao: string;
  ProjetoMecanicaPontuacao: string | null;
  ProjetoPublicoAlvo: ProjetoPublicoAlvo;
  ProjetoGrupoMinPessoas: number;
  ProjetoGrupoMaxPessoas: number;
  ProjetoInscricaoPrazoData: Date;
  ProjetoEntregaPrazoData: Date | null;
  ProjetoStatus: ProjetoStatus;
  CreatedAt: Date;
  UpdatedAt: Date;
}

interface ProjetoDTO extends Projeto {
  NomeCriador: string;
  TurmasGUID: string[];
  TotalGrupos: number;
}
```

### Database Schema

```sql
CREATE TABLE projeto (
  ProjetoGUID CHAR(36) NOT NULL PRIMARY KEY,
  EscolaGUID CHAR(36) NOT NULL,
  UsuarioCPFCriador VARCHAR(14) NOT NULL,
  ProjetoTitulo VARCHAR(128) NOT NULL,
  ProjetoDescricao VARCHAR(2048) NOT NULL,
  ProjetoMecanicaPontuacao VARCHAR(1024) NULL,
  ProjetoPublicoAlvo ENUM('Escola','Turmas') NOT NULL DEFAULT 'Turmas',
  ProjetoGrupoMinPessoas INT NOT NULL DEFAULT 1,
  ProjetoGrupoMaxPessoas INT NOT NULL,
  ProjetoInscricaoPrazoData DATETIME NOT NULL,
  ProjetoEntregaPrazoData DATETIME NULL,
  ProjetoStatus ENUM('Aberto','Encerrado') NOT NULL DEFAULT 'Aberto',
  CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID) ON DELETE CASCADE,
  FOREIGN KEY (UsuarioCPFCriador) REFERENCES usuario(UsuarioCPF) ON DELETE RESTRICT
);

CREATE TABLE projetoturma (
  ProjetoGUID CHAR(36) NOT NULL,
  TurmaGUID CHAR(36) NOT NULL,
  PRIMARY KEY (ProjetoGUID, TurmaGUID),
  FOREIGN KEY (ProjetoGUID) REFERENCES projeto(ProjetoGUID) ON DELETE CASCADE,
  FOREIGN KEY (TurmaGUID) REFERENCES turma(TurmaGUID) ON DELETE CASCADE
);
```

---

## Business Rules

1. **Criação restrita a Professor/Direção** — `ProjetoService.criarProjeto` valida `EscolaxUsuarioxFuncaoDAO.isProfessorOuDirecaoEmEscola` (FuncaoId 3 ou 6, Status='Ativo') antes de qualquer outra validação.
2. **Público-alvo condicional** — `ProjetoPublicoAlvo='Turmas'` exige `TurmasGUID` não-vazio; cada turma deve existir e pertencer à mesma `EscolaGUID` do projeto (`ProjetoService.criarProjeto`).
3. **Listagem depende do papel** — Professor/Direção vê os projetos que **ele criou** (`ProjetoDAO.findAll` filtrado por `UsuarioCPFCriador`); Aluno vê os **elegíveis** (`ProjetoDAO.findElegiveisParaAluno`: público `'Escola'`, ou `'Turmas'` com matrícula ativa em alguma turma vinculada).
4. **Atualizar/Encerrar restrito ao criador** — `ProjetoService.atualizarProjeto`/`encerrarProjeto` comparam `UsuarioCPFCriador` com o CPF autenticado (403 se diferente).
5. **Sem exclusão física** — não existe `DELETE /api/projeto/:projetoGUID`; a única forma de finalizar um projeto é `PATCH .../encerrar` (decisão de design, ver `docs/PLANO_IMPLEMENTACAO_PROJETOS.md`, Seção 7 ponto 3).
6. **Prazos** — `ProjetoInscricaoPrazoData` não pode ser no passado na criação; `ProjetoEntregaPrazoData`, se informado, deve ser ≥ `ProjetoInscricaoPrazoData`.
7. **Notificação de criação** — ao criar, `projeto_criado` é disparado (assíncrono, não bloqueia a resposta) para os alunos elegíveis: fan-out por `EscolaxUsuarioxFuncaoDAO.findUsuariosAtivosByEscolaEFuncoes` se `'Escola'`, ou pelas matrículas das turmas vinculadas se `'Turmas'`.

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | Erro na validação de dados | Campo obrigatório ausente/mal formatado |
| 400 | TurmasGUID é obrigatório quando ProjetoPublicoAlvo é "Turmas" | Público `'Turmas'` sem lista de turmas |
| 400 | Todas as turmas devem pertencer à escola informada em EscolaGUID | Turma de outra escola |
| 400 | ProjetoInscricaoPrazoData não pode ser no passado | Prazo inválido na criação |
| 400 | ProjetoEntregaPrazoData deve ser posterior ao prazo de inscrição | Prazo de entrega anterior ao de inscrição |
| 400 | Envie ao menos um campo para atualizar | `PATCH` sem nenhum campo |
| 400 | Projeto já está encerrado | Encerrar um projeto já `Encerrado` |
| 401 | Não autenticado | Token ausente/inválido |
| 403 | Apenas Professor ou Direção podem criar um projeto | Usuário sem FuncaoId 3/6 ativa na escola |
| 403 | Apenas o criador pode atualizar/encerrar o projeto | CPF autenticado ≠ `UsuarioCPFCriador` |
| 404 | Projeto não encontrado | `projetoGUID` inexistente |
| 404 | Turmas não encontradas | `TurmasGUID` com GUID inexistente |

---

## Examples

### Cenário 1: Professor cria projeto para turmas específicas
```bash
POST /api/projeto
{ "EscolaGUID": "...", "ProjetoTitulo": "Hackathon", "ProjetoDescricao": "...", "ProjetoPublicoAlvo": "Turmas", "TurmasGUID": ["..."], "ProjetoGrupoMinPessoas": 2, "ProjetoGrupoMaxPessoas": 5, "ProjetoInscricaoPrazoData": "2026-08-15T23:59:59.000Z" }
# Response 201
```

### Cenário 2: Aluno lista projetos elegíveis
```bash
GET /api/projeto?EscolaGUID=550e8400-e29b-41d4-a716-446655440000
# (chamado por CPF de Aluno) Response 200 — só projetos 'Escola' ou 'Turmas' onde o aluno está matriculado
```

### Cenário 3: Não-criador tenta encerrar (❌ Erro)
```bash
PATCH /api/projeto/7c9e6679-7425-40de-944b-e07fc1f90ae7/encerrar
# usuário autenticado ≠ UsuarioCPFCriador

Response 403:
{ "success": false, "message": "Apenas o criador pode encerrar o projeto" }
```

---

## Integration with Other Entities

- **Projeto → GrupoProjeto**: um projeto tem N grupos, cada um criado manualmente por um aluno — ver [grupoprojeto-api.md](grupoprojeto-api.md).
- **Projeto → Turma**: turmas elegíveis via `projetoturma` (N:N) — ver [turma-api.md](turma-api.md).
- **Projeto → Matrícula**: elegibilidade de aluno resolvida via matrícula ativa (`ProjetoDAO.usuarioElegivel`) — ver [matricula-api.md](matricula-api.md).
- **Projeto → Notificação**: dispara `projeto_criado` — ver [notificacao-api.md](notificacao-api.md).

---

## Notes

- Todas as datas são retornadas em ISO 8601.
- `TotalGrupos` no `ProjetoDTO` é calculado via subquery a cada leitura, não é um contador persistido.
- Diferente de Tarefa Compartilhada, o Projeto não cria nenhum grupo automaticamente — grupos surgem quando um aluno chama `POST /api/grupoprojeto`.
