# API Documentation - Registro de Auditoria

**Version:** 1.0.0
**Base URL:** `/api/auditoria`
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [List Registros de Auditoria](#list-registros-de-auditoria)
  - [Get Registro de Auditoria by ID](#get-registro-de-auditoria-by-id)
  - [List Categorias de Auditoria](#list-categorias-de-auditoria)
- [Sub-feature: Último Acesso do Usuário na Escola](#sub-feature-último-acesso-do-usuário-na-escola)
  - [Registrar Último Acesso](#registrar-último-acesso)
  - [Exposição em Endpoints Existentes](#exposição-em-endpoints-existentes)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)
- [Examples](#examples)
- [Integration with Other Entities](#integration-with-other-entities)
- [Notes](#notes)

---

## Overview

API de **consulta somente leitura** do Registro de Auditoria — um módulo transversal que registra, para cada escola, quem fez o quê (criação/edição/exclusão), quando e em qual entidade. Não guarda diff campo a campo (antes/depois); cada linha é só o fato de que uma ação de escrita ocorreu.

**Conceito:**
- `RegistroAuditoria` = 1 fato imutável: `UsuarioCPFAtor` executou `AcaoTipo` (`Create`/`Update`/`Delete`) sobre `EntidadeTipo`/`EntidadeGUID`, na escola `EscolaGUID`, em `CreatedAt`.
- Cada registro tem uma `CategoriaAuditoriaId` (catálogo estático `categoriaauditoria`) que define a sensibilidade da ação e o prazo de retenção antes do expurgo automático (job de limpeza, fora do escopo desta API HTTP).
- O registro é criado **apenas internamente**, como efeito colateral de outras operações de escrita do sistema — chamando `getAuditoriaService().registrar()` (`backend/services/auditoria.service.ts`) ao final de métodos `store`/`update`/`destroy` de dezenas de outros services (`matricula`, `turma`, `escolaxusuarioxfuncao`, `pendencia`, `evento`, etc.). Essa chamada nunca lança erro — uma falha ao registrar auditoria (ex.: banco fora do ar) não pode derrubar a operação de negócio que a originou.
- Ações de leitura (`GET`/`index`/`show`) **não** geram registro de auditoria — só Create/Update/Delete.

**Permissões:**
- **Consultar** (`GET /api/auditoria`, `GET /api/auditoria/:guid`): apenas **Coordenação** (FuncaoId=1), **Secretaria** (FuncaoId=2) ou **Direção** (FuncaoId=6), com vínculo `Status='Ativo'` na `EscolaGUID` consultada.
- **Consultar catálogo de categorias** (`GET /api/auditoria/categorias`): qualquer usuário autenticado (sem restrição de papel, sem filtro por escola — é um catálogo estático global).
- **Não há criação/edição/exclusão via HTTP.** Ver [Business Rules](#business-rules), regra 6.

Documento de planejamento completo (decisões de negócio, categorias, prazos de retenção): `docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md`.

---

## Authentication

Todas as rotas requerem autenticação JWT (`router.use(AuthMiddleware.authenticate)` em `routes/auditoria.routes.ts`, aplicado a todo o router).

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
  "details": { /* detalhes adicionais, quando aplicável */ }
}
```

---

## Endpoints

### List Registros de Auditoria

Lista os registros de auditoria de uma escola, com filtros combináveis (AND) e paginação. Restrito a Coordenação/Secretaria/Direção.

**Endpoint:** `GET /api/auditoria`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|--------------|------------|
| `EscolaGUID` | string | ✅ Yes | Escola cujos registros serão consultados | UUID; sem ele o endpoint retorna `400` |
| `UsuarioCPFAtor` | string | ❌ No | Filtra pelo CPF de quem executou a ação | — |
| `AcaoTipo` | string | ❌ No | Filtra pelo tipo de ação | `Create`, `Update` ou `Delete`; qualquer outro valor retorna `400` |
| `EntidadeTipo` | string | ❌ No | Filtra pelo nome lógico da entidade afetada (ex.: `matricula`, `turma`, `pendencia`) | Correspondência exata (não é `LIKE`) |
| `CategoriaAuditoriaId` | number | ❌ No | Filtra pela categoria de sensibilidade | Inteiro, ver [tabela de categorias](#categorias-de-sensibilidade-e-retenção) |
| `dataInicio` | string | ❌ No | Início do intervalo (`CreatedAt >= dataInicio`), inclusive | Data/datetime aceito pelo MySQL (ex. ISO 8601) |
| `dataFim` | string | ❌ No | Fim do intervalo (`CreatedAt <= dataFim`), inclusive | Data/datetime aceito pelo MySQL |
| `limit` | number | ❌ No | Tamanho da página | Padrão **50**; teto **100** (valores maiores são truncados para 100, `backend/repositories/registroauditoria.repository.ts`) |
| `offset` | number | ❌ No | Deslocamento da página | Padrão 0 |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Registros de auditoria listados com sucesso",
  "data": {
    "registros": [
      {
        "RegistroAuditoriaGUID": "9b1e4f2a-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
        "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
        "UsuarioCPFAtor": "123.456.789-00",
        "AcaoTipo": "Update",
        "EntidadeTipo": "matricula",
        "EntidadeGUID": "RA-2026-00123",
        "EntidadeDescricao": "Matrícula de João Silva transferida para 9ºA",
        "CategoriaAuditoriaId": 3,
        "CreatedAt": "2026-07-20T14:32:10.000Z"
      },
      {
        "RegistroAuditoriaGUID": "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
        "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
        "UsuarioCPFAtor": "987.654.321-00",
        "AcaoTipo": "Create",
        "EntidadeTipo": "evento",
        "EntidadeGUID": "770e8400-e29b-41d4-a716-446655440001",
        "EntidadeDescricao": "Evento \"Reunião de Pais\" criado",
        "CategoriaAuditoriaId": 2,
        "CreatedAt": "2026-07-20T10:05:00.000Z"
      }
    ],
    "total": 2
  }
}
```

> `total` reflete o número de itens retornados **nesta página** (`registros.length`), não a contagem total de registros que atendem aos filtros — não há `COUNT(*)` separado neste endpoint.

**Error Responses:**

**400 Bad Request** - `EscolaGUID` ausente
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "details": {
    "message": "O parâmetro 'EscolaGUID' é obrigatório."
  }
}
```

**400 Bad Request** - `AcaoTipo` inválido
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "details": {
    "message": "AcaoTipo deve ser 'Create', 'Update' ou 'Delete'."
  }
}
```

**401 Unauthorized** - Não autenticado
```json
{
  "success": false,
  "message": "Token não fornecido",
  "details": {
    "message": "Você precisa estar autenticado para acessar este recurso"
  }
}
```

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão",
  "details": {
    "message": "Você não tem permissão para consultar o registro de auditoria desta escola. Apenas Coordenação, Secretaria ou Direção."
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/auditoria?EscolaGUID=550e8400-e29b-41d4-a716-446655440000&AcaoTipo=Delete&dataInicio=2026-07-01&dataFim=2026-07-21&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Get Registro de Auditoria by ID

Busca um registro de auditoria específico. Restrito a Coordenação/Secretaria/Direção.

**Endpoint:** `GET /api/auditoria/:RegistroAuditoriaGUID`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `RegistroAuditoriaGUID` | string | ✅ Yes | GUID do registro de auditoria |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EscolaGUID` | string | ✅ Yes | Escola do registro (usada para checar permissão **e** para confirmar que o registro pertence a esta escola) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Executado com sucesso",
  "data": {
    "registro": {
      "RegistroAuditoriaGUID": "9b1e4f2a-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "UsuarioCPFAtor": "123.456.789-00",
      "AcaoTipo": "Update",
      "EntidadeTipo": "matricula",
      "EntidadeGUID": "RA-2026-00123",
      "EntidadeDescricao": "Matrícula de João Silva transferida para 9ºA",
      "CategoriaAuditoriaId": 3,
      "CreatedAt": "2026-07-20T14:32:10.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - `EscolaGUID` ausente
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "details": {
    "message": "O parâmetro 'EscolaGUID' é obrigatório."
  }
}
```

**403 Forbidden** - Sem permissão (mesmo corpo de erro do `index`, ver acima)

**404 Not Found** - Registro não encontrado (ou pertence a outra escola — o service não distingue os dois casos, para não vazar dado entre escolas)
```json
{
  "success": false,
  "message": "Registro de auditoria não encontrado",
  "details": {
    "message": "Não existe registro de auditoria com guid 9b1e4f2a-... para esta escola"
  }
}
```

> Não há validação de formato de `RegistroAuditoriaGUID` no controller — um GUID mal formado simplesmente não bate com nenhuma linha e cai no mesmo `404` acima (`backend/services/auditoria.service.ts`, `buscarPorId`).

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/auditoria/9b1e4f2a-2c3d-4e5f-8a9b-0c1d2e3f4a5b?EscolaGUID=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### List Categorias de Auditoria

Lista o catálogo estático de categorias de sensibilidade/retenção, usado para popular filtros/legenda na tela. Não exige papel específico — qualquer usuário autenticado pode consultar.

**Endpoint:** `GET /api/auditoria/categorias`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Catálogo de categorias de auditoria",
  "data": {
    "categorias": [
      {
        "CategoriaAuditoriaId": 1,
        "CategoriaAuditoriaNome": "Trivial",
        "CategoriaAuditoriaRetencaoDias": 90,
        "CategoriaAuditoriaDescricao": "Ações de baixo impacto: preferências, marcar pendência como feita, editar nome de grupo/turma"
      },
      {
        "CategoriaAuditoriaId": 2,
        "CategoriaAuditoriaNome": "Operacional",
        "CategoriaAuditoriaRetencaoDias": 365,
        "CategoriaAuditoriaDescricao": "Rotina acadêmica: eventos, conteúdo, tarefas, provas, matérias, cursos, horários"
      },
      {
        "CategoriaAuditoriaId": 3,
        "CategoriaAuditoriaNome": "DadosPessoais",
        "CategoriaAuditoriaRetencaoDias": 730,
        "CategoriaAuditoriaDescricao": "Criação/edição/exclusão de usuário, matrícula, vínculo escola-usuário-função, dados de responsável/aluno"
      },
      {
        "CategoriaAuditoriaId": 4,
        "CategoriaAuditoriaNome": "Financeiro",
        "CategoriaAuditoriaRetencaoDias": 730,
        "CategoriaAuditoriaDescricao": "Reservado para módulo financeiro (não implementado hoje)"
      },
      {
        "CategoriaAuditoriaId": 5,
        "CategoriaAuditoriaNome": "SegurancaConta",
        "CategoriaAuditoriaRetencaoDias": 365,
        "CategoriaAuditoriaDescricao": "Troca de senha, verificação de e-mail, mudança de função/permissão de um usuário na escola"
      }
    ]
  }
}
```

**Error Responses:**

**401 Unauthorized** - Não autenticado (mesmo corpo de erro do `AuthMiddleware`, ver seção List Registros de Auditoria acima)

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/auditoria/categorias \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Sub-feature: Último Acesso do Usuário na Escola

> **Isto não é um registro de auditoria.** É um único timestamp por usuário+escola, sobrescrito a cada acesso — não uma linha nova por login, e estruturalmente fora de `registroauditoria`/`categoriaauditoria` (tabela própria, `usuarioxescolaacesso`). Documentado aqui, junto de Auditoria, por afinidade temática de planejamento (`docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md`, Seção 3.4), mas é uma feature estruturalmente separada — não passa pelo `AuditoriaService` nem é retornada pelos endpoints acima.

**Objetivo:** permitir que a escola (Coordenação/Secretaria/Direção) veja se um usuário (aluno/professor/etc.) está de fato usando o sistema, sem manter um histórico completo de acessos.

**Onde vive:** tabela `usuarioxescolaacesso` (PK composta `UsuarioCPF + EscolaGUID`), atualizada via `INSERT ... ON DUPLICATE KEY UPDATE` com throttle de 1 hora (`backend/repositories/usuarioxescolaacesso.repository.ts` — o `UPDATE` só é efetivado se já se passou mais de 1 hora desde o último acesso registrado).

---

### Registrar Último Acesso

Registra/atualiza (upsert com throttle) o "último acesso" do próprio usuário autenticado numa escola. Endpoint pensado para ser chamado pelo frontend no mount da navbar do dashboard (fire-and-forget), não em toda requisição.

**Endpoint:** `POST /api/usuario/:UsuarioCPF/escolas/:EscolaGUID/acesso`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|--------------|------------|
| `UsuarioCPF` | string | ✅ Yes | CPF do usuário cujo acesso será registrado | Formato `XXX.XXX.XXX-XX` (`UsuarioMiddleware.validateCpfParam`) |
| `EscolaGUID` | string | ✅ Yes | Escola acessada | — |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Acesso registrado com sucesso",
  "data": {}
}
```

**Error Responses:**

**400 Bad Request** - CPF em formato inválido
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "details": {
    "message": "O CPF deve estar no formato XXX.XXX.XXX-XX"
  }
}
```

**401 Unauthorized** - Não autenticado (mesmo corpo de erro do `AuthMiddleware`, ver seção List Registros de Auditoria acima)

**403 Forbidden** - Tentando registrar o acesso de outro usuário
```json
{
  "success": false,
  "message": "Sem permissão",
  "details": {
    "message": "Só é possível registrar o próprio acesso."
  }
}
```

> Restrição vem de `req.user.UsuarioCPF === params.UsuarioCPF` (`backend/controllers/escolaxusuarioxfuncao.controller.ts`, método `registrarAcesso`) — impede que um usuário force a atualização do "último acesso" de outro.

**cURL Example:**
```bash
curl -X POST "https://api.example.com/api/usuario/123.456.789-00/escolas/550e8400-e29b-41d4-a716-446655440000/acesso" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Exposição em Endpoints Existentes

Nenhuma rota nova além da acima — os dois endpoints já existentes abaixo foram **estendidos** para incluir `UltimoAcessoEm` no payload de resposta (documentação completa desses endpoints em [usuario-escolas-api.md](usuario-escolas-api.md) e [escolaxusuarioxfuncao-api.md](escolaxusuarioxfuncao-api.md); só o campo novo é detalhado aqui):

| Método | Rota | Campo novo | Onde é populado |
|---|---|---|---|
| GET | `/api/usuario/:cpf/escolas` | `UltimoAcessoEm` (string ISO ou `null`) por escola do array retornado | `EscolaxUsuarioxFuncaoService.findEscolasByUsuario` — sempre populado, já que a rota já é por usuário |
| GET | `/api/escolaxusuarioxfuncao?EscolaGUID=` | `UltimoAcessoEm` (string ISO ou `null`) por vínculo retornado | `EscolaxUsuarioxFuncaoService.findAll` — **só populado quando o filtro `EscolaGUID` é informado** na query; sem esse filtro, o campo vem sempre `null` (`backend/services/escolaxusuarioxfuncao.service.ts`) |

Exemplo de item de `GET /api/usuario/:cpf/escolas?EscolaGUID=...` (recorte, campo novo em destaque):
```json
{
  "escola": { "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000", "EscolaNome": "Colégio Exemplo" },
  "funcoes": [ { "FuncaoId": 5, "FuncaoNome": "Aluno", "Status": "Ativo" } ],
  "UltimoAcessoEm": "2026-07-21T08:15:00.000Z"
}
```

Exemplo de item de `GET /api/escolaxusuarioxfuncao?EscolaGUID=...` (recorte, campo novo em destaque):
```json
{
  "EscolaxUsuarioxFuncaoId": 42,
  "UsuarioCPF": "123.456.789-00",
  "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
  "FuncaoId": 5,
  "FuncaoNome": "Aluno",
  "Status": "Ativo",
  "UltimoAcessoEm": "2026-07-21T08:15:00.000Z"
}
```

Se o usuário nunca acessou a escola (nenhuma linha em `usuarioxescolaacesso`), `UltimoAcessoEm` vem `null` em ambos os endpoints.

---

## Data Models

### RegistroAuditoria Entity

```typescript
export type AcaoAuditoriaTipo = "Create" | "Update" | "Delete";

interface RegistroAuditoria {
  RegistroAuditoriaGUID: string;      // UUID v4
  EscolaGUID: string;                 // FK para escola
  UsuarioCPFAtor: string;             // Quem executou a ação (req.user.UsuarioCPF no momento)
  AcaoTipo: AcaoAuditoriaTipo;
  EntidadeTipo: string;               // Nome lógico do recurso, ex.: "matricula", "turma", "pendencia"
  EntidadeGUID: string;                // PK do registro afetado (referência polimórfica, sem FK física)
  EntidadeDescricao: string | null;   // Rótulo legível opcional (ex.: nome/título do registro afetado)
  CategoriaAuditoriaId: number;       // FK para categoriaauditoria
  CreatedAt: Date;                    // Momento em que a ação ocorreu
}
```

### CategoriaAuditoria Entity

```typescript
interface CategoriaAuditoria {
  CategoriaAuditoriaId: number;
  CategoriaAuditoriaNome: string;              // Ex.: Trivial, Operacional, DadosPessoais, Financeiro, SegurancaConta
  CategoriaAuditoriaRetencaoDias: number;       // Prazo de retenção antes do expurgo automático
  CategoriaAuditoriaDescricao: string | null;
}
```

### UsuarioXEscolaAcesso (sub-feature "último acesso")

```typescript
interface UsuarioXEscolaAcesso {
  UsuarioCPF: string;      // PK composta
  EscolaGUID: string;      // PK composta
  UltimoAcessoEm: Date;    // Sobrescrito a cada acesso (throttle de 1h)
}
```

### Database Schema

```sql
-- Catálogo estático de categorias de sensibilidade/retenção
CREATE TABLE `categoriaauditoria` (
  `CategoriaAuditoriaId` TINYINT UNSIGNED NOT NULL,
  `CategoriaAuditoriaNome` VARCHAR(40) NOT NULL,
  `CategoriaAuditoriaRetencaoDias` INT NOT NULL,
  `CategoriaAuditoriaDescricao` VARCHAR(255) NULL,
  PRIMARY KEY (`CategoriaAuditoriaId`)
);

-- Tabela de fatos (sem diff antes/depois)
CREATE TABLE `registroauditoria` (
  `RegistroAuditoriaGUID` CHAR(36) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `UsuarioCPFAtor` VARCHAR(14) NOT NULL,
  `AcaoTipo` ENUM('Create','Update','Delete') NOT NULL,
  `EntidadeTipo` VARCHAR(60) NOT NULL,
  `EntidadeGUID` VARCHAR(36) NOT NULL,
  `EntidadeDescricao` VARCHAR(255) NULL,
  `CategoriaAuditoriaId` TINYINT UNSIGNED NOT NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`RegistroAuditoriaGUID`),
  INDEX `idx_registroauditoria_escola` (`EscolaGUID`),
  INDEX `idx_registroauditoria_ator` (`UsuarioCPFAtor`),
  INDEX `idx_registroauditoria_entidade` (`EntidadeTipo`, `EntidadeGUID`),
  INDEX `idx_registroauditoria_data` (`CreatedAt`),
  INDEX `idx_registroauditoria_categoria` (`CategoriaAuditoriaId`),
  CONSTRAINT `FK_RegistroAuditoria_Escola` FOREIGN KEY (`EscolaGUID`) REFERENCES `escola` (`EscolaGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_RegistroAuditoria_Ator` FOREIGN KEY (`UsuarioCPFAtor`) REFERENCES `usuario` (`UsuarioCPF`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `FK_RegistroAuditoria_Categoria` FOREIGN KEY (`CategoriaAuditoriaId`) REFERENCES `categoriaauditoria` (`CategoriaAuditoriaId`) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Sub-feature "último acesso" (NÃO é registro de auditoria)
CREATE TABLE `usuarioxescolaacesso` (
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `UltimoAcessoEm` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`UsuarioCPF`, `EscolaGUID`),
  CONSTRAINT `FK_UsuarioEscolaAcesso_Usuario` FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario` (`UsuarioCPF`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `FK_UsuarioEscolaAcesso_Escola` FOREIGN KEY (`EscolaGUID`) REFERENCES `escola` (`EscolaGUID`) ON UPDATE CASCADE ON DELETE RESTRICT
);
```

Fonte: `backend/database/migrations/2026-07-21-add-registro-auditoria.sql`.

### Categorias de Sensibilidade e Retenção

| `CategoriaAuditoriaId` | Nome | Retenção | Exemplos de `EntidadeTipo` |
|---|---|---|---|
| 1 | `Trivial` | 90 dias | Preferências, marcar pendência como feita, editar nome de grupo/turma |
| 2 | `Operacional` | 365 dias (1 ano) | Criação/edição de evento, conteúdo, tarefa, prova, matéria, curso, horário |
| 3 | `DadosPessoais` | 730 dias (2 anos) | Criação/edição/exclusão de `usuario`, `matricula`, vínculo `escolaxusuarioxfuncao`, dados de responsável/aluno |
| 4 | `Financeiro` | 730 dias (2 anos) | Reservado para módulo financeiro (não implementado no repositório atual) |
| 5 | `SegurancaConta` | 365 dias (1 ano) | Troca de senha, verificação de e-mail, mudança de função/permissão de um usuário na escola |

Fonte: seed em `backend/database/migrations/2026-07-21-add-registro-auditoria.sql` e `docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md` (Seção 1.1). Prazos são o expurgo final — a exclusão física (sem soft delete) é feita por um job agendado que compara `CreatedAt` de cada registro contra a retenção da própria `CategoriaAuditoriaId` (`RegistroAuditoriaDAO.deleteExpiradosPorCategoria`), fora do escopo desta API HTTP.

---

## Business Rules

1. **Sem endpoints de escrita expostos.** Não existe `POST`/`PATCH`/`DELETE` em `/api/auditoria` (`routes/auditoria.routes.ts`). A única forma de um registro ser criado é internamente, via `getAuditoriaService().registrar()`, chamada pelos services de escrita de outros módulos do projeto (`backend/services/auditoria.service.ts`). Isso preserva a integridade do log — se fosse possível apagar/editar registros manualmente pela API, o "registro de auditoria" deixaria de servir como auditoria confiável.
2. **Cobertura: só Create/Update/Delete.** Ações de leitura (`GET`) nunca geram registro — decisão de negócio confirmada em `docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md` (Seção 4, regra 2).
3. **Sem diff campo a campo.** O registro não guarda valor antigo/novo por campo — só o fato de que a ação ocorreu, quem fez, sobre qual entidade, quando (`backend/entities/registroauditoria.model.ts`).
4. **Consulta restrita por papel e por escola.** `GET /api/auditoria` e `GET /api/auditoria/:guid` exigem `EscolaGUID` na query e checam `EscolaxUsuarioxFuncaoDAO.isCoordSecretariaOuDirecaoEmEscola(usuarioCPF, escolaGUID)` — `FuncaoId IN (1, 2, 6)` com `Status = 'Ativo'` (`backend/repositories/escolaxusuarioxfuncao.repository.ts`). Qualquer outro papel, ou vínculo inativo, recebe `403` (`backend/controllers/auditoria.controller.ts`).
5. **`GET /api/auditoria/:guid` não vaza dado entre escolas.** Se o registro existe mas pertence a outra escola, o retorno é `404` (idêntico ao caso de GUID inexistente) — não `403`/`200` com dado de outra escola (`AuditoriaService.buscarPorId`, `backend/services/auditoria.service.ts`).
6. **Falha ao registrar auditoria nunca derruba a operação de negócio.** `AuditoriaService.registrar()` captura qualquer erro internamente (`console.error`) e nunca propaga — mesma garantia usada por `NotificacaoService.disparar()` (`backend/services/auditoria.service.ts`, `backend/services/notificacao.service.ts`).
7. **Paginação com teto.** `GET /api/auditoria` usa `limit` padrão de 50 e teto de 100 (valores maiores ou ausentes são normalizados), ordenado sempre por `CreatedAt DESC` (mais recente primeiro) (`backend/repositories/registroauditoria.repository.ts`).
8. **Retenção diferenciada por categoria.** Cada `CategoriaAuditoriaId` tem seu próprio prazo (`CategoriaAuditoriaRetencaoDias`); o expurgo é calculado registro a registro contra a retenção da sua própria categoria, não um prazo único para toda a tabela (`RegistroAuditoriaDAO.deleteExpiradosPorCategoria`). Exclusão física, sem soft delete.
9. **Catálogo de categorias é estático e global.** `GET /api/auditoria/categorias` não filtra por escola nem exige papel específico além de estar autenticado — é o mesmo catálogo para todas as escolas do sistema (`categoriaauditoria`, seed via migration).
10. **"Último acesso" é uma feature separada, com regras próprias.** Não usa `CategoriaAuditoriaId`, não é auditável/consultável via `/api/auditoria`, e só pode ser atualizado pelo próprio usuário (`req.user.UsuarioCPF === :UsuarioCPF`, senão `403`) — ver [Sub-feature](#sub-feature-último-acesso-do-usuário-na-escola) acima.
11. **Throttle de 1 hora no upsert de "último acesso".** `POST /api/usuario/:cpf/escolas/:escolaGUID/acesso` só efetiva a atualização se já se passou mais de 1 hora desde o `UltimoAcessoEm` gravado anteriormente para aquele par usuário+escola — evita `UPDATE` a cada refresh de página (`backend/repositories/usuarioxescolaacesso.repository.ts`).

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | Erro na validação de dados — "O parâmetro 'EscolaGUID' é obrigatório." | `GET /api/auditoria` ou `GET /api/auditoria/:guid` sem `EscolaGUID` na query |
| 400 | Erro na validação de dados — "AcaoTipo deve ser 'Create', 'Update' ou 'Delete'." | `AcaoTipo` inválido na query de `GET /api/auditoria` |
| 400 | Erro na validação de dados — "O CPF deve estar no formato XXX.XXX.XXX-XX" | `:UsuarioCPF` mal formatado em `POST /api/usuario/:cpf/escolas/:escolaGUID/acesso` |
| 401 | Token não fornecido / Token mal formatado / Token vazio / Token inválido | Ausência ou falha de validação do JWT (`AuthMiddleware.authenticate`) em qualquer rota deste documento |
| 403 | Sem permissão — "Você não tem permissão para consultar o registro de auditoria desta escola. Apenas Coordenação, Secretaria ou Direção." | Usuário autenticado não é Coordenação/Secretaria/Direção ativa na `EscolaGUID` consultada |
| 403 | Sem permissão — "Só é possível registrar o próprio acesso." | `POST /api/usuario/:cpf/escolas/:escolaGUID/acesso` chamado com `:cpf` diferente do usuário autenticado |
| 404 | Registro de auditoria não encontrado | `RegistroAuditoriaGUID` inexistente, ou pertencente a outra escola |
| 500 | Erro interno do servidor | Falha inesperada de banco/servidor (tratamento genérico do `ErrorResponse`) |

---

## Examples

### Cenário 1: Coordenação lista registros de auditoria de exclusões recentes (✅ Sucesso)
```bash
GET /api/auditoria?EscolaGUID=550e8400-e29b-41d4-a716-446655440000&AcaoTipo=Delete&limit=10
Authorization: Bearer <token de Coordenação>

Response 200:
{
  "success": true,
  "message": "Registros de auditoria listados com sucesso",
  "data": {
    "registros": [
      {
        "RegistroAuditoriaGUID": "...",
        "AcaoTipo": "Delete",
        "EntidadeTipo": "evento",
        "EntidadeGUID": "...",
        "CategoriaAuditoriaId": 2,
        "CreatedAt": "2026-07-19T18:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### Cenário 2: Professor tenta consultar auditoria (❌ Erro 403)
```bash
GET /api/auditoria?EscolaGUID=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token de Professor>

Response 403:
{
  "success": false,
  "message": "Sem permissão",
  "details": {
    "message": "Você não tem permissão para consultar o registro de auditoria desta escola. Apenas Coordenação, Secretaria ou Direção."
  }
}
```

### Cenário 3: Filtrar ações de um usuário específico dentro de um período ("ver ações por usuário da escola")
```bash
GET /api/auditoria?EscolaGUID=550e8400-e29b-41d4-a716-446655440000&UsuarioCPFAtor=123.456.789-00&dataInicio=2026-07-01T00:00:00&dataFim=2026-07-21T23:59:59
Authorization: Bearer <token de Secretaria>

Response 200:
{
  "success": true,
  "message": "Registros de auditoria listados com sucesso",
  "data": { "registros": [ /* ... */ ], "total": 3 }
}
```

### Cenário 4: Frontend registra "último acesso" no mount da navbar (✅ Sucesso, sem bloquear a UI)
```bash
POST /api/usuario/123.456.789-00/escolas/550e8400-e29b-41d4-a716-446655440000/acesso
Authorization: Bearer <token do próprio usuário>

Response 200:
{
  "success": true,
  "message": "Acesso registrado com sucesso",
  "data": {}
}
```

### Cenário 5: Usuário tenta registrar o acesso de outro CPF (❌ Erro 403)
```bash
POST /api/usuario/999.888.777-66/escolas/550e8400-e29b-41d4-a716-446655440000/acesso
Authorization: Bearer <token de 123.456.789-00>

Response 403:
{
  "success": false,
  "message": "Sem permissão",
  "details": {
    "message": "Só é possível registrar o próprio acesso."
  }
}
```

---

## Integration with Other Entities

### RegistroAuditoria → Escola (N:1)
Cada registro pertence a exatamente uma escola (`EscolaGUID`, `ON DELETE CASCADE` — excluir a escola apaga seus registros de auditoria).

### RegistroAuditoria → Usuario (N:1, `UsuarioCPFAtor`)
O ator da ação é sempre um `Usuario` existente (`ON DELETE RESTRICT` — não é possível excluir fisicamente um usuário que já tem histórico de auditoria).

### RegistroAuditoria → CategoriaAuditoria (N:1)
Cada registro tem exatamente uma categoria de sensibilidade (`ON DELETE RESTRICT` — o catálogo é estático e não deve ser removido enquanto houver registros vinculados).

### RegistroAuditoria → (qualquer entidade do sistema) via `EntidadeTipo`/`EntidadeGUID`
Referência **polimórfica sem FK física** (mesmo padrão de `NotificacaoEntidadeTipo`/`GUID`) — `EntidadeGUID` pode apontar para `matricula`, `pendencia`, `evento`, `turma`, `usuario`, `escolaxusuarioxfuncao`, entre outras. Se o registro original for excluído fisicamente depois, `EntidadeGUID` fica "órfão" no log — comportamento esperado para um log de auditoria (não deve ser apagado em cascata quando o dado original some).

### UsuarioXEscolaAcesso → Usuario e Escola (N:1 cada)
`UsuarioCPF` e `EscolaGUID` referenciam `usuario`/`escola` com `ON DELETE RESTRICT`. Não referencia `escolaxusuarioxfuncao` (grãos diferentes — um usuário pode, em teoria, ter mais de uma `FuncaoId` na mesma escola, enquanto "último acesso" é um valor único por usuário+escola).

### Este módulo consome `EscolaxUsuarioxFuncaoDAO`
`AuditoriaController` usa `EscolaxUsuarioxFuncaoDAO.isCoordSecretariaOuDirecaoEmEscola` (ver [escolaxusuarioxfuncao-api.md](escolaxusuarioxfuncao-api.md)) para validar permissão de consulta — não há duplicação dessa lógica dentro do módulo de auditoria.

---

## Notes

- Todas as datas (`CreatedAt`, `UltimoAcessoEm`) são retornadas em formato ISO 8601 (UTC).
- `RegistroAuditoriaGUID` é gerado automaticamente no backend (`uuid` v4) — nunca enviado pelo client, já que não há endpoint de criação exposto.
- **Sem soft delete** em `registroauditoria` — o expurgo por retenção é exclusão física (`DELETE`), decisão de negócio deliberada (dado que já passou do prazo de retenção deve ser removido de fato, não só marcado).
- **Sem soft delete** em `usuarioxescolaacesso` — é um valor mutável por natureza (upsert), não um log.
- O job de expurgo por retenção e o mecanismo de disparo do "último acesso" no frontend (mount de `DashboardNavbar`) são detalhados no plano de implementação (`docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md`, Seções 4 e 3.4) e não fazem parte da superfície HTTP documentada aqui.
- `EntidadeTipo` é uma string estável escolhida por cada service que dispara `registrar()` (ex.: `"matricula"`, `"turma"`, `"escolaxusuarioxfuncao"`) — não é derivada dinamicamente do nome da classe/tabela, para não quebrar filtros salvos se o código for refatorado.
- A cobertura de instrumentação (quais services chamam `getAuditoriaService().registrar()`) evolui junto com o projeto — este documento cobre a API de consulta, estável independentemente de quais módulos já foram instrumentados em um dado momento.
