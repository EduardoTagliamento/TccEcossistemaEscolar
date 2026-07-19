# API Documentation - Calendário

**Version:** 1.0.0
**Base URL:** `/api/calendario`
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Get Calendário](#get-calendário)
  - [Get Detalhes do Dia](#get-detalhes-do-dia)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)
- [Examples](#examples)
- [Integration with Other Entities](#integration-with-other-entities)
- [Notes](#notes)

---

## Overview

API somente leitura que agrega, em uma única linha do tempo, os **avisos de calendário** (tarefas e provas agendadas) visíveis para o usuário autenticado em uma escola. Não é uma entidade própria persistida — o resultado é calculado em tempo real via `UNION` de `tarefaacademica`/`tarefaacademica_matricula` com `provaagendada`/`provaagendada_turma` (`backend/repositories/calendario.repository.ts::buscarAvisosCalendario`).

**Conceito:**
- Um "aviso" (`CalendarioAviso`) representa uma tarefa (visível para o aluno matriculado ou para o professor alocado na matéria/turma) ou uma prova agendada (visível para os alunos da turma ou o professor da matéria).
- `TipoAviso` distingue `tarefa` de `prova`; `StatusTexto` é calculado (`Feita`/`Atrasada`/`Pendente` para tarefa; `ProvaStatus` bruto para prova).
- `PermiteMarcarFeito`/`PermiteEnviarAnexo` só são `true` para tarefas — provas não têm essas ações.

**Permissões:**
- Requer autenticação e vínculo ativo (`Status='Ativo'`) do usuário com a `EscolaGUID` informada (`escolaxusuarioxfuncao.findAll`), independente da função — qualquer papel (Aluno, Professor, Coordenação, Secretaria, Direção) pode consultar seu próprio calendário.

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
  "details": { /* detalhes adicionais, opcional */ }
}
```

---

## Endpoints

### Get Calendário

Lista os avisos (tarefas + provas) do usuário autenticado em uma escola, com filtros opcionais de período e tipo.

**Endpoint:** `GET /api/calendario`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `EscolaGUID` | string | ✅ Yes | UUID da escola | Deve ser UUID válido |
| `DataInicio` | string | ❌ No | Início do período (ISO 8601) | Data válida; se combinado com `DataFim`, deve ser anterior |
| `DataFim` | string | ❌ No | Fim do período (ISO 8601) | Data válida |
| `TipoAviso` | string | ❌ No | Filtra por tipo | `tarefa` ou `prova` |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Calendário carregado",
  "data": {
    "avisos": [
      {
        "TipoAviso": "tarefa",
        "AvisoId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "MatriculaGUID": "550e8400-e29b-41d4-a716-446655440000",
        "DataPrazo": "2026-07-25T23:59:59.000Z",
        "Titulo": "Resolução de Exercícios",
        "Descricao": "Resolver os exercícios 1 a 15 da página 87.",
        "StatusBoolean": false,
        "StatusTexto": "Pendente",
        "TipoEntrega": "digital",
        "QtdAnexosDescricao": 1,
        "QtdAnexosEntrega": 0,
        "PermiteMarcarFeito": true,
        "PermiteEnviarAnexo": true,
        "IconeTipo": "tarefa",
        "CreatedAt": "2026-07-17T10:00:00.000Z"
      },
      {
        "TipoAviso": "prova",
        "AvisoId": "8d8e6679-8536-51ef-b055-f18gd2g01bf8",
        "MatriculaGUID": null,
        "DataPrazo": "2026-07-28T14:00:00.000Z",
        "Titulo": "Matemática",
        "Descricao": "Prova bimestral - Funções",
        "StatusBoolean": null,
        "StatusTexto": "Agendada",
        "TipoEntrega": null,
        "QtdAnexosDescricao": 2,
        "QtdAnexosEntrega": 0,
        "PermiteMarcarFeito": false,
        "PermiteEnviarAnexo": false,
        "IconeTipo": "prova",
        "CreatedAt": "2026-07-10T09:00:00.000Z"
      }
    ],
    "total": 2
  }
}
```

**Error Responses:**

**400 Bad Request** - `EscolaGUID` ausente/inválido
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "details": { "message": "O parâmetro 'EscolaGUID' é obrigatório." }
}
```

**400 Bad Request** - Filtros de data inválidos
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "details": { "message": "O filtro 'DataInicio' deve ser anterior a 'DataFim'." }
}
```

**401 Unauthorized** - Sem `UsuarioCPF` no token
```json
{
  "success": false,
  "message": "Usuário não autenticado",
  "details": { "message": "É necessário estar autenticado para consultar o calendário." }
}
```

**403 Forbidden** - Sem vínculo ativo com a escola
```json
{
  "success": false,
  "message": "Sem permissão",
  "details": { "message": "Você não possui vínculo ativo com esta escola." }
}
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/calendario?EscolaGUID=550e8400-e29b-41d4-a716-446655440000&TipoAviso=tarefa" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Get Detalhes do Dia

Retorna apenas os avisos cuja `DataPrazo` cai dentro do dia informado (00:00:00 a 23:59:59, no fuso do servidor).

**Endpoint:** `GET /api/calendario/dia/:data`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `data` | string | ✅ Yes | Dia a consultar | Formato `YYYY-MM-DD` |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EscolaGUID` | string | ✅ Yes | UUID da escola |
| `TipoAviso` | string | ❌ No | `tarefa` ou `prova` |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Detalhes do dia carregados",
  "data": {
    "avisos": [
      {
        "TipoAviso": "prova",
        "AvisoId": "8d8e6679-8536-51ef-b055-f18gd2g01bf8",
        "DataPrazo": "2026-07-28T14:00:00.000Z",
        "Titulo": "Matemática",
        "StatusTexto": "Agendada"
      }
    ],
    "total": 1
  }
}
```

**Error Responses:**

**400 Bad Request** - Parâmetro `data` fora do formato
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "details": { "message": "O parâmetro 'data' deve estar no formato YYYY-MM-DD." }
}
```

**400 Bad Request** - `EscolaGUID` ausente (mesma validação de `validateFilters`, aplicada antes de `validateDiaParam`)
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "details": { "message": "O parâmetro 'EscolaGUID' é obrigatório." }
}
```

**403 Forbidden** - Sem vínculo ativo com a escola
```json
{
  "success": false,
  "message": "Sem permissão",
  "details": { "message": "Você não possui vínculo ativo com esta escola." }
}
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/calendario/dia/2026-07-28?EscolaGUID=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Data Models

### CalendarioAviso (calculado, não persistido)

```typescript
type CalendarioTipoAviso = "tarefa" | "prova";

interface CalendarioAviso {
  TipoAviso: CalendarioTipoAviso;
  AvisoId: string;                          // TarefaGUID ou ProvaAgendadaGUID
  MatriculaGUID: string | null;             // preenchido só para tarefa
  DataPrazo: Date;                          // TarefaPrazoData(Matricula) ou ProvaData(Turma)
  Titulo: string;
  Descricao: string | null;
  StatusBoolean: boolean | null;            // TarefaFeito (tarefa) ou null (prova)
  StatusTexto: string;                      // "Feita"/"Atrasada"/"Pendente" (tarefa) ou ProvaStatus (prova)
  TipoEntrega: "digital" | "fisica" | null; // só tarefa
  QtdAnexosDescricao: number;
  QtdAnexosEntrega: number;
  PermiteMarcarFeito: boolean;              // true só para tarefa
  PermiteEnviarAnexo: boolean;              // true só para tarefa
  IconeTipo: "tarefa" | "prova";
  CreatedAt: Date | null;
}

interface CalendarioFilters {
  DataInicio?: Date;
  DataFim?: Date;
  TipoAviso?: CalendarioTipoAviso;
}
```

Fonte: `backend/entities/calendario.model.ts`. Não há tabela própria — o modelo é montado por `UNION` sobre `tarefaacademica`, `tarefaacademica_matricula`, `provaagendada`, `provaagendada_turma` (ver `backend/repositories/calendario.repository.ts`).

---

## Business Rules

1. **Somente leitura** — não há `POST`/`PUT`/`DELETE`; o calendário é derivado de Tarefa e ProvaAgendada.
2. **Visibilidade por matrícula ou alocação** — uma tarefa aparece se `matricula.UsuarioCPF = usuarioCPF` (aluno dono) OU se existe alocação ativa (`materiaxprofessorxturma.AlocacaoStatus='Ativa'`) do usuário na matéria/turma da tarefa (professor); mesma lógica para prova, usando `provaagendada_turma` (`backend/repositories/calendario.repository.ts`).
3. **Vínculo ativo obrigatório** — usuário precisa ter registro em `escolaxusuarioxfuncao` com `Status='Ativo'` para a `EscolaGUID` consultada, senão 403 (`backend/services/calendario.service.ts::buscarCalendario`).
4. **`StatusTexto` da tarefa é calculado no SQL** — `Feita` se `TarefaFeito=1`; `Atrasada` se o prazo já passou (comparado em UTC-3, `DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)`); senão `Pendente`.
5. **Prazo por matrícula sobrepõe o prazo padrão** — usa `COALESCE(tarefaacademica_matricula.TarefaPrazoDataMatricula, tarefaacademica.TarefaPrazoData)`, refletindo a possibilidade de prazo individual por aluno (ver `tarefaacademica-api.md`).
6. **`GET /dia/:data` reaplica `validateFilters`** — a mesma validação de `EscolaGUID`/`TipoAviso` da rota de listagem roda antes de `validateDiaParam`, então erros de `EscolaGUID` também aparecem nessa rota.
7. **Filtro `TipoAviso` é aplicado em memória** — o service busca ambos os tipos e filtra depois (`avisos.filter(...)`), não no SQL.

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | Erro na validação de dados — `EscolaGUID` obrigatório/inválido | Parâmetro ausente ou não-UUID |
| 400 | Erro na validação de dados — `DataInicio`/`DataFim` inválida ou fora de ordem | Data mal formatada ou intervalo invertido |
| 400 | Erro na validação de dados — `TipoAviso` inválido | Valor fora de `tarefa`/`prova` |
| 400 | Erro na validação de dados — `data` fora do formato | `GET /dia/:data` com formato diferente de `YYYY-MM-DD` |
| 401 | Usuário não autenticado | Token ausente/inválido (não deveria passar do `AuthMiddleware`) |
| 403 | Sem permissão | Usuário sem vínculo `Ativo` na `EscolaGUID` |

---

## Examples

### Cenário 1: Aluno consulta seu calendário do mês
```bash
GET /api/calendario?EscolaGUID=550e8400-e29b-41d4-a716-446655440000&DataInicio=2026-07-01&DataFim=2026-07-31
# Response 200 — tarefas da matrícula do aluno + provas da turma dele no período
```

### Cenário 2: Professor consulta só as provas
```bash
GET /api/calendario?EscolaGUID=550e8400-e29b-41d4-a716-446655440000&TipoAviso=prova
# Response 200 — provas das turmas/matérias em que o professor está alocado (AlocacaoStatus='Ativa')
```

### Cenário 3: Consultar sem vínculo com a escola (❌ Erro)
```bash
GET /api/calendario?EscolaGUID=999e8400-e29b-41d4-a716-446655440099
# usuário não tem registro Ativo em escolaxusuarioxfuncao para essa escola

Response 403:
{
  "success": false,
  "message": "Sem permissão",
  "details": { "message": "Você não possui vínculo ativo com esta escola." }
}
```

---

## Integration with Other Entities

- **Calendário ← TarefaAcademica**: cada linha `TipoAviso='tarefa'` é derivada de `tarefaacademica` + `tarefaacademica_matricula` — ver [tarefaacademica-api.md](tarefaacademica-api.md).
- **Calendário ← ProvaAgendada**: cada linha `TipoAviso='prova'` é derivada de `provaagendada` + `provaagendada_turma` — ver [provaagendada-api.md](provaagendada-api.md).
- **Calendário ← EscolaxUsuarioxFuncao**: a checagem de permissão usa o mesmo vínculo tripla (Escola+Usuário+Função) documentado em [escolaxusuarioxfuncao-api.md](escolaxusuarioxfuncao-api.md), mas aqui aceita qualquer `FuncaoId`, desde que `Status='Ativo'`.

---

## Notes

- Datas retornadas em ISO 8601 (UTC).
- Este endpoint não pagina — retorna todos os avisos do período filtrado de uma vez; para períodos muito longos, o cliente deve filtrar `DataInicio`/`DataFim`.
- `AvisoId` não é um GUID de uma entidade "Calendario" própria — é o `TarefaGUID` ou `ProvaAgendadaGUID` original, útil para navegar direto ao recurso de origem.
