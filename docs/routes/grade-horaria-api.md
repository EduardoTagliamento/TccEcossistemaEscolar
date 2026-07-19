# API Documentation - Grade Horária (Agendamento Automático)

**Version:** 1.0.0
**Base URL:** `/api/grade-horaria`
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Calcular Datas](#calcular-datas)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)
- [Examples](#examples)
- [Integration with Other Entities](#integration-with-other-entities)
- [Notes](#notes)

---

## Overview

API auxiliar de **agendamento automático**: dado uma matéria e uma lista de escolhas de turma+semana, calcula a data/hora exata em que a próxima aula daquela matéria ocorre em cada turma, usando o [cronograma da turma](cronograma-turma-api.md) já montado. Usada pelo frontend para pré-preencher a data de uma Prova Agendada ou Tarefa Acadêmica ("agendar na próxima aula da turma X") sem o usuário precisar calcular manualmente o dia/horário.

Este módulo não tem entidade própria persistida — reaproveita inteiramente `HorarioTurmaService` (mesmo service usado por [cronograma-turma-api.md](cronograma-turma-api.md)), apenas expondo o método `calcularDatas` num endpoint independente de uma turma específica na URL, para poder receber várias turmas de uma vez em uma única chamada.

**Permissões:**
- Requer apenas autenticação — não há checagem de vínculo do usuário com a escola/turma nesta rota (o cálculo é apenas de leitura sobre dados já públicos do cronograma).

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

---

## Endpoints

### Calcular Datas

Para cada `TurmaGUID` informado, encontra a ocorrência da matéria no cronograma daquela turma e calcula a data/hora da aula na semana de referência (`SemanaBase`), com deslocamento opcional em minutos.

**Endpoint:** `POST /api/grade-horaria/calcular-datas`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
  "Escolhas": [
    { "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001", "SemanaBase": "2026-07-20" },
    { "TurmaGUID": "990e8400-e29b-41d4-a716-446655440002", "SemanaBase": "2026-07-20", "DiaSemana": "Quarta", "DeslocamentoMinutos": 60 }
  ]
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `MateriaGUID` | string | ✅ Yes | UUID da matéria a calcular | UUID v4 |
| `Escolhas` | array | ✅ Yes | Lista de escolhas (uma por turma) | Array não vazio |
| `Escolhas[].TurmaGUID` | string | ✅ Yes | UUID da turma | UUID v4 |
| `Escolhas[].SemanaBase` | string | ✅ Yes | Qualquer data dentro da semana desejada | Formato `YYYY-MM-DD` (aceita string ISO completa, mas só a parte de data é validada por regex de prefixo) |
| `Escolhas[].DiaSemana` | string | ⚠️ Condicional | Dia da semana a usar como referência | Um dos 7 dias; **obrigatório apenas se a matéria tiver mais de uma ocorrência semanal nessa turma** (ver `status: "escolherDia"`) |
| `Escolhas[].DeslocamentoMinutos` | number | ❌ No | Minutos a somar/subtrair da hora de início da aula (pode ser negativo) | Número |

**Success Response (200 OK) — todos os casos possíveis de `status` por turma:**
```json
{
  "success": true,
  "message": "Datas calculadas com sucesso",
  "data": {
    "resultados": [
      {
        "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
        "status": "ok",
        "DataCalculada": "2026-07-20T07:00:00.000Z",
        "DiaSemana": "Segunda",
        "HoraBase": "07:00"
      },
      {
        "TurmaGUID": "990e8400-e29b-41d4-a716-446655440002",
        "status": "ok",
        "DataCalculada": "2026-07-22T08:00:00.000Z",
        "DiaSemana": "Quarta",
        "HoraBase": "07:00"
      },
      {
        "TurmaGUID": "aa0e8400-e29b-41d4-a716-446655440003",
        "status": "escolherDia",
        "Ocorrencias": [
          { "DiaSemana": "Segunda", "HoraInicio": "07:00", "HoraFim": "07:50" },
          { "DiaSemana": "Quinta", "HoraInicio": "09:50", "HoraFim": "10:40" }
        ]
      },
      {
        "TurmaGUID": "bb1e8400-e29b-41d4-a716-446655440004",
        "status": "semCronograma"
      },
      {
        "TurmaGUID": "cc2e8400-e29b-41d4-a716-446655440005",
        "status": "erro",
        "mensagem": "Turma não encontrada."
      }
    ]
  }
}
```

> Nota: a resposta é sempre **200 OK**, mesmo quando uma ou mais escolhas individuais falham — o resultado por turma é reportado dentro do array `resultados[]`, com `status` diferenciando sucesso (`ok`) de situações que exigem ação do usuário (`escolherDia`, `semCronograma`) ou erro (`erro`). Não há status HTTP de erro para falhas por-turma; apenas erros de validação global do body (ver abaixo) retornam 4xx.

**Error Responses:**

**400 Bad Request** - `MateriaGUID` ausente/inválido
```json
{ "success": false, "message": "MateriaGUID inválido", "details": { "message": "MateriaGUID é obrigatório e deve ser um UUID válido" } }
```

**400 Bad Request** - `Escolhas` ausente/vazio/não é array
```json
{ "success": false, "message": "Escolhas inválido", "details": { "message": "Escolhas é obrigatório e deve ser um array não vazio" } }
```

**400 Bad Request** - Item de `Escolhas` com `TurmaGUID`/`SemanaBase`/`DiaSemana`/`DeslocamentoMinutos` inválido
```json
{ "success": false, "message": "TurmaGUID inválido", "details": { "message": "Cada escolha deve ter um TurmaGUID válido" } }
```
```json
{ "success": false, "message": "SemanaBase inválida", "details": { "message": "Cada escolha deve ter SemanaBase no formato YYYY-MM-DD" } }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/grade-horaria/calcular-datas \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "Escolhas": [
      { "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001", "SemanaBase": "2026-07-20" }
    ]
  }'
```

---

## Data Models

### Request/Result DTOs (não persistidos)

```typescript
type DiaSemana = "Segunda" | "Terca" | "Quarta" | "Quinta" | "Sexta" | "Sabado" | "Domingo";

interface EscolhaCalculoDTO {
  TurmaGUID: string;
  SemanaBase: string;              // "YYYY-MM-DD" — qualquer data dentro da semana desejada
  DiaSemana?: DiaSemana;           // obrigatório só se houver ambiguidade (>1 ocorrência/semana)
  DeslocamentoMinutos?: number;    // pode ser negativo
}

interface OcorrenciaCalculoDTO {
  DiaSemana: DiaSemana;
  HoraInicio: string;              // "HH:MM"
  HoraFim: string;                 // "HH:MM"
}

interface ResultadoCalculoDTO {
  TurmaGUID: string;
  status: "ok" | "semCronograma" | "escolherDia" | "erro";
  DataCalculada?: string;          // ISO 8601 — presente só quando status="ok"
  DiaSemana?: DiaSemana;
  HoraBase?: string;                // "HH:MM"
  Ocorrencias?: OcorrenciaCalculoDTO[]; // presente só quando status="escolherDia"
  mensagem?: string;                // presente só quando status="erro"
}
```

Não há tabela própria — o cálculo é feito em memória sobre `horarioturma` (ver [cronograma-turma-api.md](cronograma-turma-api.md)).

---

## Business Rules

1. **Uma escolha por turma, processada independentemente** — `HorarioTurmaService.calcularDatas` itera `Escolhas[]`; a falha de uma turma (turma inexistente, sem cronograma, ambígua) não impede o cálculo das demais.
2. **`status: "semCronograma"`** — a matéria não está alocada em nenhum slot do cronograma daquela turma (turma sem grade montada, ou matéria ainda não posicionada — ver [cronograma-turma-api.md](cronograma-turma-api.md)).
3. **`status: "escolherDia"`** — a matéria ocorre mais de uma vez por semana nessa turma e `DiaSemana` não foi informado na escolha; a resposta inclui `Ocorrencias[]` com todos os dias/horários possíveis para o cliente perguntar ao usuário e reenviar a escolha com `DiaSemana` preenchido.
4. **`status: "erro"`** — turma não encontrada, ou `DiaSemana` informado não corresponde a nenhuma ocorrência real da matéria naquela turma (`mensagem` explica o motivo).
5. **`status: "ok"`** — usa `calcularDataAulaNaSemana(SemanaBase, DiaSemana, HoraInicio, DeslocamentoMinutos)` (`backend/utils/gradeHoraria.util.ts`) para converter a combinação semana-base + dia + hora-base + deslocamento em uma data/hora absoluta (`DataCalculada`).
6. **`DeslocamentoMinutos` permite pequenos ajustes** — por exemplo, agendar uma prova 10 minutos após o início da aula, sem precisar que o cliente refaça o cálculo manualmente.
7. **Resposta HTTP sempre 200 (sucesso de transporte)** — falhas de negócio por turma individual não geram status HTTP de erro; apenas falhas de validação do body inteiro (`MateriaGUID`/`Escolhas` ausente/mal formatado) retornam 400.

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | MateriaGUID inválido | Ausente ou não é UUID v4 |
| 400 | Escolhas inválido | Ausente, não é array, ou vazio |
| 400 | TurmaGUID inválido | Item de `Escolhas` sem `TurmaGUID` válido |
| 400 | SemanaBase inválida | Item de `Escolhas` sem `SemanaBase` no formato `YYYY-MM-DD` |
| 400 | DiaSemana inválido | Valor fora do enum de dias da semana |
| 400 | DeslocamentoMinutos inválido | Valor informado não é número |

> Não há erros 401/403/404 específicos deste endpoint documentados no código — apenas 400 de validação do middleware (`GradeHorariaMiddleware.validarCalcularDatas`); autenticação é garantida pelo `AuthMiddleware` global do router.

---

## Examples

### Cenário 1: Agendar prova na próxima aula de duas turmas
```bash
POST /api/grade-horaria/calcular-datas
{
  "MateriaGUID": "660e8400-...",
  "Escolhas": [
    { "TurmaGUID": "880e8400-...", "SemanaBase": "2026-07-20" },
    { "TurmaGUID": "990e8400-...", "SemanaBase": "2026-07-20" }
  ]
}
# Response 200, cada turma com status "ok" e sua DataCalculada
```

### Cenário 2: Matéria com mais de uma aula por semana na turma (frontend precisa perguntar)
```bash
POST /api/grade-horaria/calcular-datas
{ "MateriaGUID": "660e8400-...", "Escolhas": [ { "TurmaGUID": "aa0e8400-...", "SemanaBase": "2026-07-20" } ] }

Response 200:
{ "data": { "resultados": [ { "TurmaGUID": "aa0e8400-...", "status": "escolherDia", "Ocorrencias": [ ... ] } ] } }
# Cliente reenvia com "DiaSemana": "Quinta", por exemplo
```

---

## Integration with Other Entities

- **Grade Horária → HorarioTurma**: reaproveita `HorarioTurmaService` e a tabela `horarioturma` — ver [cronograma-turma-api.md](cronograma-turma-api.md).
- **Grade Horária → TarefaAcademica**: usado para preencher `DatasPorMatricula` no agendamento automático de tarefas — ver [tarefaacademica-api.md](tarefaacademica-api.md).
- **Grade Horária → ProvaAgendada**: usado de forma análoga para sugerir a data de uma prova agendada — ver [provaagendada-api.md](provaagendada-api.md).

---

## Notes

- Rota montada em `/api/grade-horaria` (prefixo próprio), diferente do cronograma da turma que fica sob `/api/turma/:turmaGUID/cronograma`.
- `calcularDataAulaNaSemana` está em `backend/utils/gradeHoraria.util.ts`, compartilhado também pela validação de intervalos de `EscolaConfiguracao` (ver [escolaconfiguracao-api.md](escolaconfiguracao-api.md)).
- Todas as datas de resposta são ISO 8601.
