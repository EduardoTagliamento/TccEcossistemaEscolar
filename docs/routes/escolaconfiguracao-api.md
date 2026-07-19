# API Documentation - Configuração da Escola (Horário Letivo)

**Version:** 1.0.0
**Base URL:** `/api/escola-configuracao`
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Get Configuração](#get-configuração)
  - [Get Slots Calculados](#get-slots-calculados)
  - [Update Configuração](#update-configuração)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)
- [Examples](#examples)
- [Integration with Other Entities](#integration-with-other-entities)
- [Notes](#notes)

---

## Overview

API para gerenciar os parâmetros de horário letivo de uma escola: duração da aula (em minutos), dias da semana com aula, período da manhã e (opcionalmente) da tarde, e intervalos (recreios) — fixos para todos os dias ou variados por dia da semana.

Esta configuração é a base para o cálculo do cronograma (grade horária) de cada turma — ver [cronograma-turma-api.md](cronograma-turma-api.md) — e para o agendamento automático de provas/tarefas — ver [grade-horaria-api.md](grade-horaria-api.md).

**Conceito:**
- `EscolaConfiguracao` — 1 registro por escola (`UNIQUE` em `EscolaGUID`), guardando `MinutosPorAula`, `DiasSemana`, período da manhã, período da tarde (opcional) e `IntervaloVariado`.
- `EscolaConfiguracaoIntervalo` — 0..N intervalos (recreios) filhos da configuração. Se `IntervaloVariado=false`, cada intervalo vale para todos os dias letivos (`DiaSemana=null`). Se `IntervaloVariado=true`, cada intervalo pertence a um `DiaSemana` específico.
- Ao chamar `PUT`, o serviço faz upsert: cria a configuração se ainda não existir para a escola, ou atualiza a existente (e sempre substitui a lista completa de intervalos — não há PATCH parcial de um único intervalo).
- Escolas sem configuração salva ainda respondem ao `GET` com um "rascunho" de valores padrão (`Configurada: false`), para o frontend pré-popular o formulário.

**Permissões:**
- **Coordenação** (FuncaoId=1) ou **Direção** (FuncaoId=6), com `Status='Ativo'` na escola, podem salvar (`PUT`) a configuração.
- Qualquer usuário autenticado pode ler (`GET` configuração e slots) — não há checagem de vínculo com a escola nesses dois endpoints.

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

### Get Configuração

Retorna a configuração de horário letivo da escola. Se a escola ainda não tiver salvo uma configuração, retorna um rascunho com valores padrão (`Configurada: false`), sem persistir nada.

**Endpoint:** `GET /api/escola-configuracao/:escolaGUID`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `escolaGUID` | string | ✅ Yes | UUID da escola |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Configuração da escola obtida com sucesso",
  "data": {
    "configuracao": {
      "EscolaConfiguracaoGUID": "aa0e8400-e29b-41d4-a716-446655440001",
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "MinutosPorAula": 50,
      "DiasSemana": ["Segunda", "Terca", "Quarta", "Quinta", "Sexta"],
      "PeriodoManhaInicio": "07:00",
      "PeriodoManhaFim": "12:20",
      "TemAulaTarde": false,
      "PeriodoTardeInicio": null,
      "PeriodoTardeFim": null,
      "IntervaloVariado": false,
      "Intervalos": [
        { "DiaSemana": null, "IntervaloInicio": "09:30", "IntervaloFim": "09:50" }
      ],
      "Configurada": true,
      "CreatedAt": "2026-07-14T10:00:00.000Z",
      "UpdatedAt": "2026-07-14T10:00:00.000Z"
    }
  }
}
```

**Success Response (200 OK) — escola sem configuração salva (rascunho):**
```json
{
  "success": true,
  "message": "Configuração da escola obtida com sucesso",
  "data": {
    "configuracao": {
      "EscolaConfiguracaoGUID": "",
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "MinutosPorAula": 50,
      "DiasSemana": ["Segunda", "Terca", "Quarta", "Quinta", "Sexta"],
      "PeriodoManhaInicio": "07:00",
      "PeriodoManhaFim": "12:20",
      "TemAulaTarde": false,
      "PeriodoTardeInicio": null,
      "PeriodoTardeFim": null,
      "IntervaloVariado": false,
      "Intervalos": [],
      "Configurada": false,
      "CreatedAt": null,
      "UpdatedAt": null
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - EscolaGUID inválido
```json
{
  "success": false,
  "message": "EscolaGUID inválido",
  "details": { "message": "O parâmetro escolaGUID deve ser um UUID válido" }
}
```

**404 Not Found** - Escola não encontrada
```json
{
  "success": false,
  "message": "Escola não encontrada",
  "details": { "message": "Não existe escola com id 550e8400-e29b-41d4-a716-446655440000" }
}
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/escola-configuracao/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Get Slots Calculados

Calcula e retorna os horários de cada aula ("slots") para cada dia letivo, já descontando os intervalos — pronto para montar o cronograma da turma. Requer que a escola já tenha uma configuração salva.

**Endpoint:** `GET /api/escola-configuracao/:escolaGUID/slots`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `escolaGUID` | string | ✅ Yes | UUID da escola |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Slots de aula calculados com sucesso",
  "data": {
    "slots": [
      {
        "DiaSemana": "Segunda",
        "Manha": [
          { "HoraInicio": "07:00", "HoraFim": "07:50" },
          { "HoraInicio": "07:50", "HoraFim": "08:40" },
          { "HoraInicio": "08:40", "HoraFim": "09:30" },
          { "HoraInicio": "09:50", "HoraFim": "10:40" },
          { "HoraInicio": "10:40", "HoraFim": "11:30" },
          { "HoraInicio": "11:30", "HoraFim": "12:20" }
        ],
        "Tarde": []
      }
    ]
  }
}
```

**Error Responses:**

**400 Bad Request** - EscolaGUID inválido
```json
{
  "success": false,
  "message": "EscolaGUID inválido",
  "details": { "message": "O parâmetro escolaGUID deve ser um UUID válido" }
}
```

**400 Bad Request** - Escola sem configuração de horário
```json
{
  "success": false,
  "message": "Escola sem configuração de horário",
  "details": { "message": "Configure os horários da escola antes de montar o cronograma de uma turma." }
}
```

**404 Not Found** - Escola não encontrada
```json
{
  "success": false,
  "message": "Escola não encontrada",
  "details": { "message": "Não existe escola com id 550e8400-e29b-41d4-a716-446655440000" }
}
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/escola-configuracao/550e8400-e29b-41d4-a716-446655440000/slots \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Update Configuração

Cria (se ainda não existir) ou substitui integralmente a configuração de horário letivo da escola, incluindo a lista completa de intervalos.

**Endpoint:** `PUT /api/escola-configuracao/:escolaGUID`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `escolaGUID` | string | ✅ Yes | UUID da escola |

**Request Body:**
```json
{
  "configuracao": {
    "MinutosPorAula": 50,
    "DiasSemana": ["Segunda", "Terca", "Quarta", "Quinta", "Sexta"],
    "PeriodoManhaInicio": "07:00",
    "PeriodoManhaFim": "12:20",
    "TemAulaTarde": false,
    "PeriodoTardeInicio": null,
    "PeriodoTardeFim": null,
    "IntervaloVariado": false,
    "Intervalos": [
      { "DiaSemana": null, "IntervaloInicio": "09:30", "IntervaloFim": "09:50" }
    ]
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `configuracao` | object | ✅ Yes | Objeto contendo a configuração completa | Obrigatório |
| `configuracao.MinutosPorAula` | number | ✅ Yes | Duração de cada aula em minutos | Inteiro entre 10 e 180 (validado na entidade) |
| `configuracao.DiasSemana` | string[] | ✅ Yes | Dias letivos | Array não vazio; valores válidos: `Segunda`, `Terca`, `Quarta`, `Quinta`, `Sexta`, `Sabado`, `Domingo` |
| `configuracao.PeriodoManhaInicio` | string | ✅ Yes | Início do período da manhã | Formato `HH:MM` |
| `configuracao.PeriodoManhaFim` | string | ✅ Yes | Fim do período da manhã | Formato `HH:MM`; deve ser posterior ao início |
| `configuracao.TemAulaTarde` | boolean | ✅ Yes | Se a escola tem período da tarde | true/false |
| `configuracao.PeriodoTardeInicio` | string/null | ⚠️ Condicional | Início do período da tarde | Obrigatório (`HH:MM`) se `TemAulaTarde=true`; não pode começar antes do fim da manhã |
| `configuracao.PeriodoTardeFim` | string/null | ⚠️ Condicional | Fim do período da tarde | Obrigatório (`HH:MM`) se `TemAulaTarde=true`; posterior ao início da tarde |
| `configuracao.IntervaloVariado` | boolean | ✅ Yes | Se os intervalos variam por dia da semana | true/false |
| `configuracao.Intervalos` | array | ✅ Yes | Lista de intervalos (recreios) | Array (pode ser vazio) |
| `configuracao.Intervalos[].DiaSemana` | string/null | ⚠️ Condicional | Dia do intervalo | Obrigatório e deve estar em `DiasSemana` se `IntervaloVariado=true`; ignorado (tratado como `null`) se `IntervaloVariado=false` |
| `configuracao.Intervalos[].IntervaloInicio` | string | ✅ Yes | Início do intervalo | Formato `HH:MM` |
| `configuracao.Intervalos[].IntervaloFim` | string | ✅ Yes | Fim do intervalo | Formato `HH:MM`; deve ser posterior ao início; o intervalo inteiro precisa estar contido no período da manhã ou da tarde configurado |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Configuração da escola salva com sucesso",
  "data": {
    "configuracao": {
      "EscolaConfiguracaoGUID": "aa0e8400-e29b-41d4-a716-446655440001",
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "MinutosPorAula": 50,
      "DiasSemana": ["Segunda", "Terca", "Quarta", "Quinta", "Sexta"],
      "PeriodoManhaInicio": "07:00",
      "PeriodoManhaFim": "12:20",
      "TemAulaTarde": false,
      "PeriodoTardeInicio": null,
      "PeriodoTardeFim": null,
      "IntervaloVariado": false,
      "Intervalos": [
        { "DiaSemana": null, "IntervaloInicio": "09:30", "IntervaloFim": "09:50" }
      ],
      "Configurada": true,
      "CreatedAt": "2026-07-17T10:00:00.000Z",
      "UpdatedAt": "2026-07-17T10:00:00.000Z"
    },
    "avisos": [
      "O intervalo das 09:35 cai no meio da 3ª aula (08:40–09:30): ela ficaria com só 5 dos 50 minutos antes do intervalo (os outros 45 min seriam cortados). Para não cortar a aula, ajuste o início do intervalo para 08:40 (antes dela) ou 09:30 (depois dela)."
    ]
  }
}
```

**Error Responses:**

**400 Bad Request** - Campo obrigatório ausente/inválido (qualquer um dos campos da tabela acima)
```json
{
  "success": false,
  "message": "Período da manhã inválido",
  "details": { "message": "PeriodoManhaInicio e PeriodoManhaFim são obrigatórios e devem estar no formato HH:MM" }
}
```

**400 Bad Request** - `MinutosPorAula` fora do intervalo permitido (lançado pelo setter da entidade `EscolaConfiguracao`)
```json
{
  "success": false,
  "message": "MinutosPorAula deve estar entre 10 e 180 minutos."
}
```

**400 Bad Request** - Período da manhã inconsistente (início >= fim), ou tarde começando antes do fim da manhã (`validarConsistencia()` da entidade)
```json
{
  "success": false,
  "message": "PeriodoManhaInicio deve ser anterior a PeriodoManhaFim."
}
```

**400 Bad Request** - `DiaSemana` obrigatório em intervalo variado
```json
{
  "success": false,
  "message": "DiaSemana obrigatório",
  "details": { "message": "Com intervalo variado, cada intervalo precisa informar o dia da semana." }
}
```

**400 Bad Request** - `DiaSemana` do intervalo fora dos dias letivos configurados
```json
{
  "success": false,
  "message": "DiaSemana inválido",
  "details": { "message": "O dia \"Sabado\" não está entre os dias letivos configurados." }
}
```

**400 Bad Request** - Intervalo fora do expediente (não cabe inteiro no período da manhã nem no da tarde)
```json
{
  "success": false,
  "message": "Intervalo fora do expediente",
  "details": { "message": "O intervalo 12:30-12:50 não está contido no período da manhã nem no da tarde configurados." }
}
```

**401 Unauthorized** - Usuário não autenticado (falha ao extrair `UsuarioCPF` do token — não deveria ocorrer com o `AuthMiddleware` já aplicado)
```json
{
  "success": false,
  "message": "Usuário não autenticado",
  "data": null
}
```

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão",
  "details": { "message": "Você não tem permissão para realizar esta operação. Apenas Coordenação e Direção podem gerenciar as configurações da escola." }
}
```

**404 Not Found** - Escola não encontrada
```json
{
  "success": false,
  "message": "Escola não encontrada",
  "details": { "message": "Não existe escola com id 550e8400-e29b-41d4-a716-446655440000" }
}
```

**cURL Example:**
```bash
curl -X PUT https://api.example.com/api/escola-configuracao/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "configuracao": {
      "MinutosPorAula": 50,
      "DiasSemana": ["Segunda", "Terca", "Quarta", "Quinta", "Sexta"],
      "PeriodoManhaInicio": "07:00",
      "PeriodoManhaFim": "12:20",
      "TemAulaTarde": false,
      "IntervaloVariado": false,
      "Intervalos": [
        { "DiaSemana": null, "IntervaloInicio": "09:30", "IntervaloFim": "09:50" }
      ]
    }
  }'
```

---

## Data Models

### EscolaConfiguracao Entity

```typescript
interface EscolaConfiguracaoDTO {
  EscolaConfiguracaoGUID: string;      // UUID v4, vazio ("") no rascunho não persistido
  EscolaGUID: string;                  // FK para escola (UNIQUE — 1 config por escola)
  MinutosPorAula: number;              // 10-180
  DiasSemana: DiaSemana[];             // subconjunto de ["Segunda".."Domingo"]
  PeriodoManhaInicio: string;          // "HH:MM"
  PeriodoManhaFim: string;             // "HH:MM"
  TemAulaTarde: boolean;
  PeriodoTardeInicio: string | null;
  PeriodoTardeFim: string | null;
  IntervaloVariado: boolean;
  Intervalos: {
    DiaSemana: DiaSemana | null;       // null quando IntervaloVariado=false
    IntervaloInicio: string;
    IntervaloFim: string;
  }[];
  Configurada: boolean;                // false = rascunho (escola nunca salvou)
  CreatedAt: string | null;            // ISO 8601
  UpdatedAt: string | null;            // ISO 8601
}

type DiaSemana = "Segunda" | "Terca" | "Quarta" | "Quinta" | "Sexta" | "Sabado" | "Domingo";
```

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS `escolaconfiguracao` (
  `EscolaConfiguracaoGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `EscolaGUID` CHAR(36) NOT NULL,
  `MinutosPorAula` INT NOT NULL,
  `DiasSemana` VARCHAR(60) NOT NULL,
  `PeriodoManhaInicio` VARCHAR(5) NOT NULL,
  `PeriodoManhaFim` VARCHAR(5) NOT NULL,
  `TemAulaTarde` TINYINT(1) NOT NULL DEFAULT 0,
  `PeriodoTardeInicio` VARCHAR(5) NULL,
  `PeriodoTardeFim` VARCHAR(5) NULL,
  `IntervaloVariado` TINYINT(1) NOT NULL DEFAULT 0,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_escolaconfiguracao_escola` (`EscolaGUID`),
  CONSTRAINT `FK_EscolaConfiguracao_Escola` FOREIGN KEY (`EscolaGUID`)
    REFERENCES `escola` (`EscolaGUID`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `escolaconfiguracaointervalo` (
  `EscolaConfiguracaoIntervaloGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `EscolaConfiguracaoGUID` CHAR(36) NOT NULL,
  `DiaSemana` ENUM('Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo') NULL,
  `IntervaloInicio` VARCHAR(5) NOT NULL,
  `IntervaloFim` VARCHAR(5) NOT NULL,
  INDEX `idx_escolaconfiguracaointervalo_config` (`EscolaConfiguracaoGUID`),
  CONSTRAINT `FK_EscolaConfiguracaoIntervalo_Config` FOREIGN KEY (`EscolaConfiguracaoGUID`)
    REFERENCES `escolaconfiguracao` (`EscolaConfiguracaoGUID`) ON UPDATE CASCADE ON DELETE CASCADE
);
```

Fonte: `backend/database/migrations/2026-07-14-add-escola-configuracao.sql`.

---

## Business Rules

1. **1 configuração por escola** — `UNIQUE KEY (EscolaGUID)`; `PUT` faz upsert (`backend/services/escolaconfiguracao.service.ts::salvarConfiguracao`).
2. **`MinutosPorAula` entre 10 e 180** — validado no setter de `EscolaConfiguracao` (`backend/entities/escolaconfiguracao.model.ts`).
3. **Período da manhã obrigatório e consistente** — início antes do fim; validado em `EscolaConfiguracao.validarConsistencia()`.
4. **Período da tarde condicional** — só é obrigatório (e validado consistente) quando `TemAulaTarde=true`; não pode começar antes do fim da manhã.
5. **Substituição total dos intervalos** — a cada `PUT`, todos os intervalos anteriores são apagados e recriados a partir do array enviado (`EscolaConfiguracaoDAO.replaceIntervalos`); não existe endpoint para editar um único intervalo.
6. **Intervalo variado vs. fixo** — se `IntervaloVariado=true`, cada intervalo precisa de um `DiaSemana` presente em `DiasSemana`; se `false`, todo intervalo vale para todos os dias letivos (`DiaSemana` forçado para `null`).
7. **Intervalo precisa caber no expediente** — cada intervalo deve estar inteiramente contido no período da manhã ou no da tarde configurado, senão a API retorna 400 "Intervalo fora do expediente".
8. **Avisos não-bloqueantes de aula cortada** — se um intervalo não começar exatamente na borda de uma aula (múltiplo de `MinutosPorAula` a partir do início do período), a operação é aceita mesmo assim, mas a resposta inclui uma mensagem em `avisos` explicando quantos minutos da aula seriam cortados e sugerindo os dois horários de início que resolveriam o desalinhamento (`backend/utils/gradeHoraria.util.ts::calcularAvisoIntervalo`).
9. **Permissão de escrita: Coordenação ou Direção** — mesmo padrão de `escolaxusuarioxfuncao.findByTripla(cpf, escolaGUID, funcaoId)` usado em Matéria/Turma; `GET` (configuração e slots) não exige vínculo do usuário com a escola, apenas autenticação.
10. **Cálculo de slots depende de configuração salva** — `GET /:escolaGUID/slots` retorna 400 se a escola ainda não tiver `EscolaConfiguracao` persistida (o rascunho do `GET /:escolaGUID` não é suficiente).
11. **Slot final "curto"** — na divisão de um período em aulas de `MinutosPorAula`, se sobrar um tempo menor que uma aula completa no fim do período, ainda assim é gerado um último slot mais curto com o tempo restante, em vez de descartá-lo (`calcularSlotsPeriodo`).

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | EscolaGUID inválido | Parâmetro de rota não é UUID válido |
| 400 | Dados inválidos | Campo `configuracao` ausente no body do `PUT` |
| 400 | MinutosPorAula inválido / `MinutosPorAula deve estar entre 10 e 180 minutos.` | Fora do intervalo permitido |
| 400 | DiasSemana inválido | Vazio ou contém valor fora do enum |
| 400 | Período da manhã inválido / Período da tarde inválido | Formato incorreto (`HH:MM`) ou ausente quando obrigatório |
| 400 | `PeriodoManhaInicio deve ser anterior a PeriodoManhaFim.` etc. | Inconsistência de horários (`validarConsistencia`) |
| 400 | TemAulaTarde inválido / IntervaloVariado inválido | Não é booleano |
| 400 | Intervalos inválido / Intervalo inválido | Não é array, ou item sem `IntervaloInicio`/`IntervaloFim` válidos |
| 400 | DiaSemana obrigatório / DiaSemana inválido | Intervalo variado sem dia, ou dia fora dos letivos |
| 400 | Intervalo fora do expediente | Intervalo não cabe no período da manhã nem da tarde |
| 400 | Escola sem configuração de horário | `GET /slots` chamado antes de salvar configuração |
| 401 | Usuário não autenticado | Token ausente/inválido (não deveria passar do `AuthMiddleware`) |
| 403 | Sem permissão | Usuário não é Coordenação/Direção ativa na escola |
| 404 | Escola não encontrada | `escolaGUID` inexistente |

---

## Examples

### Cenário 1: Primeira configuração de uma escola nova (rascunho → salva)
```bash
GET /api/escola-configuracao/550e8400-e29b-41d4-a716-446655440000
# Response 200, "Configurada": false (valores padrão sugeridos)

PUT /api/escola-configuracao/550e8400-e29b-41d4-a716-446655440000
{ "configuracao": { "MinutosPorAula": 45, "DiasSemana": ["Segunda","Terca","Quarta","Quinta","Sexta"], "PeriodoManhaInicio": "07:30", "PeriodoManhaFim": "12:00", "TemAulaTarde": false, "IntervaloVariado": false, "Intervalos": [] } }
# Response 200, "Configurada": true
```

### Cenário 2: Escola com intervalo variado por dia
```bash
PUT /api/escola-configuracao/550e8400-e29b-41d4-a716-446655440000
{
  "configuracao": {
    "MinutosPorAula": 50,
    "DiasSemana": ["Segunda", "Sexta"],
    "PeriodoManhaInicio": "07:00",
    "PeriodoManhaFim": "12:20",
    "TemAulaTarde": false,
    "IntervaloVariado": true,
    "Intervalos": [
      { "DiaSemana": "Segunda", "IntervaloInicio": "09:30", "IntervaloFim": "09:50" },
      { "DiaSemana": "Sexta", "IntervaloInicio": "10:20", "IntervaloFim": "10:40" }
    ]
  }
}
# Response 200
```

### Cenário 3: Tentar salvar sem permissão (❌ Erro)
```bash
PUT /api/escola-configuracao/550e8400-e29b-41d4-a716-446655440000
# usuário autenticado é Aluno (FuncaoId=5)

Response 403:
{
  "success": false,
  "message": "Sem permissão",
  "details": { "message": "Você não tem permissão para realizar esta operação. Apenas Coordenação e Direção podem gerenciar as configurações da escola." }
}
```

---

## Integration with Other Entities

- **EscolaConfiguracao → HorarioTurma**: o cronograma de cada turma (ver [cronograma-turma-api.md](cronograma-turma-api.md)) só pode alocar aulas em dias que estejam em `DiasSemana` e horários dentro dos períodos configurados; `POST /:turmaGUID/cronograma/slot` retorna 400 "Escola sem configuração de horário" se a escola da turma não tiver configuração salva.
- **EscolaConfiguracao → Grade Horária (agendamento automático)**: o cálculo de data de prova/tarefa a partir do cronograma (`POST /api/grade-horaria/calcular-datas`) depende indiretamente da configuração da escola, pois o cronograma é construído sobre esses horários.

---

## Notes

- Datas são retornadas em ISO 8601; horários de aula/intervalo usam string simples `HH:MM` (não `Date`), pois são horários recorrentes, não instantes.
- `EscolaConfiguracaoGUID` no rascunho (`Configurada: false`) vem como string vazia `""` — o frontend não deve tentar usá-lo como UUID até que a configuração seja salva.
- Os `avisos` retornados no `PUT` são puramente informativos (HTTP 200) — não bloqueiam a gravação da configuração.
