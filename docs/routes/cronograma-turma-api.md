# API Documentation - Cronograma da Turma (HorarioTurma)

**Version:** 1.0.0
**Base URL:** `/api/turma/:turmaGUID/cronograma`
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Get Cronograma](#get-cronograma)
  - [Alocar Slot](#alocar-slot)
  - [Remover Slot](#remover-slot)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)
- [Examples](#examples)
- [Integration with Other Entities](#integration-with-other-entities)
- [Notes](#notes)

---

## Overview

API para montar o **cronograma semanal (grade horária) de uma turma**: para cada alocação `MateriaGUID+UsuarioCPF+TurmaGUID` já existente ([professor-api.md](professor-api.md)), o Coordenador/Diretor posiciona as aulas semanais em dias e horários específicos, respeitando a configuração de horário letivo da escola ([escolaconfiguracao-api.md](escolaconfiguracao-api.md)).

**Conceito:**
- Cada linha em `horarioturma` é um **slot preenchido**: um dia da semana + horário de início/fim, ocupado por uma alocação (`MatProfTurGUID`).
- O "banco" (`BancoItemDTO[]`) é a lista de alocações ativas da turma **ainda não totalmente posicionadas** no cronograma — quantas aulas por semana a matéria deveria ter (`AulasPorSemana`, herdado da matéria se não sobrescrito na alocação) vs. quantas já foram alocadas (`AulasAlocadas`) vs. quantas faltam (`AulasRestantes`).
- Rotas montadas em um router **separado** do CRUD de Turma, mas sob o mesmo prefixo `/api/turma` (não colide porque os caminhos têm mais segmentos: `/:turmaGUID/cronograma...`).

**Permissões:**
- **Leitura** (`GET .../cronograma`): qualquer usuário autenticado, sem checagem de vínculo com a escola/turma.
- **Escrita** (`POST`/`DELETE` de slot): apenas **Coordenação** (FuncaoId=1) ou **Direção** (FuncaoId=6), com `Status='Ativo'` na escola da turma.

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

### Get Cronograma

Retorna os slots já preenchidos do cronograma da turma e o "banco" de alocações com aulas ainda não posicionadas.

**Endpoint:** `GET /api/turma/:turmaGUID/cronograma`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `turmaGUID` | string | ✅ Yes | UUID da turma | UUID v4 |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Cronograma obtido com sucesso",
  "data": {
    "cronograma": {
      "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
      "Slots": [
        {
          "HorarioTurmaGUID": "cc1e8400-e29b-41d4-a716-446655440010",
          "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
          "MatProfTurGUID": "990e8400-e29b-41d4-a716-446655440001",
          "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
          "MateriaNome": "Matemática",
          "UsuarioCPF": "12345678901",
          "UsuarioNome": "João Silva",
          "DiaSemana": "Segunda",
          "HoraInicio": "07:00",
          "HoraFim": "07:50"
        }
      ],
      "Banco": [
        {
          "MatProfTurGUID": "990e8400-e29b-41d4-a716-446655440001",
          "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
          "MateriaNome": "Matemática",
          "UsuarioCPF": "12345678901",
          "UsuarioNome": "João Silva",
          "AulasPorSemana": 5,
          "AulasAlocadas": 1,
          "AulasRestantes": 4
        }
      ]
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - `turmaGUID` inválido
```json
{ "success": false, "message": "TurmaGUID inválido", "details": { "message": "O parâmetro turmaGUID deve ser um UUID válido" } }
```

**404 Not Found** - Turma não encontrada
```json
{ "success": false, "message": "Turma não encontrada", "details": { "message": "Não existe turma com id 880e8400-..." } }
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/turma/880e8400-e29b-41d4-a716-446655440001/cronograma \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Alocar Slot

Posiciona uma aula (de uma alocação já existente) em um dia+horário do cronograma da turma.

**Endpoint:** `POST /api/turma/:turmaGUID/cronograma/slot`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "slot": {
    "MatProfTurGUID": "990e8400-e29b-41d4-a716-446655440001",
    "DiaSemana": "Segunda",
    "HoraInicio": "07:00",
    "HoraFim": "07:50"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `slot` | object | ✅ Yes | Objeto com os dados do slot | Obrigatório |
| `slot.MatProfTurGUID` | string | ✅ Yes | UUID da alocação (matéria+professor+turma) | UUID v4; deve ser alocação `Ativa` desta turma |
| `slot.DiaSemana` | string | ✅ Yes | Dia da semana | Um de `Segunda`, `Terca`, `Quarta`, `Quinta`, `Sexta`, `Sabado`, `Domingo`; deve estar entre os dias letivos configurados da escola |
| `slot.HoraInicio` | string | ✅ Yes | Início do slot | Formato `HH:MM` |
| `slot.HoraFim` | string | ✅ Yes | Fim do slot | Formato `HH:MM`; posterior a `HoraInicio` |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Matéria alocada no cronograma com sucesso",
  "data": {
    "slot": {
      "HorarioTurmaGUID": "cc1e8400-e29b-41d4-a716-446655440010",
      "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001",
      "MatProfTurGUID": "990e8400-e29b-41d4-a716-446655440001",
      "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
      "MateriaNome": "Matemática",
      "UsuarioCPF": "12345678901",
      "UsuarioNome": "João Silva",
      "DiaSemana": "Segunda",
      "HoraInicio": "07:00",
      "HoraFim": "07:50"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - `slot`/`MatProfTurGUID`/`DiaSemana`/horários ausentes ou fora do formato (middleware)

**400 Bad Request** - Alocação não é `Ativa`/não é desta turma (service)
```json
{ "success": false, "message": "Alocação inválida", "details": { "message": "Esta matéria+professor não está alocada (ativa) nesta turma." } }
```

**400 Bad Request** - Escola sem configuração de horário
```json
{ "success": false, "message": "Escola sem configuração de horário", "details": { "message": "Configure os horários da escola antes de montar o cronograma da turma." } }
```

**400 Bad Request** - Dia não letivo para a escola
```json
{ "success": false, "message": "Dia não letivo", "details": { "message": "\"Sabado\" não está entre os dias letivos configurados para esta escola." } }
```

**400 Bad Request** - Matéria/alocação sem `AulasPorSemana` configurado (nem na Matéria, nem na alocação)
```json
{ "success": false, "message": "Aulas por semana não configuradas", "details": { "message": "Defina quantas aulas por semana esta matéria tem (no cadastro da matéria ou na alocação desta turma) antes de montar o cronograma." } }
```

**401 Unauthorized**
```json
{ "success": false, "message": "Usuário não autenticado", "data": null }
```

**403 Forbidden** - Sem permissão
```json
{ "success": false, "message": "Sem permissão", "details": { "message": "Você não tem permissão para realizar esta operação. Apenas Coordenação e Direção podem gerenciar o cronograma da turma." } }
```

**404 Not Found** - Turma não encontrada

**409 Conflict** - Limite de aulas semanais já atingido para esta alocação
```json
{ "success": false, "message": "Limite de aulas semanais atingido", "details": { "message": "Todas as aulas semanais desta matéria já foram alocadas nesta turma." } }
```

**409 Conflict** - Horário já ocupado nesta turma
```json
{ "success": false, "message": "Horário ocupado", "details": { "message": "Já existe uma matéria alocada neste horário para esta turma." } }
```

**409 Conflict** - Conflito de horário do professor (já leciona em outra turma no mesmo horário)
```json
{
  "success": false,
  "message": "Conflito de horário do professor",
  "details": {
    "message": "João Silva já leciona Física na turma 2º Ano B às 07:00-07:50 de Segunda.",
    "conflito": { "MateriaNome": "Física", "TurmaSerie": "2º Ano", "TurmaNome": "B", "HoraInicio": "07:00", "HoraFim": "07:50", "DiaSemana": "Segunda" }
  }
}
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/turma/880e8400-e29b-41d4-a716-446655440001/cronograma/slot \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "slot": {
      "MatProfTurGUID": "990e8400-e29b-41d4-a716-446655440001",
      "DiaSemana": "Segunda",
      "HoraInicio": "07:00",
      "HoraFim": "07:50"
    }
  }'
```

---

### Remover Slot

Remove uma aula do cronograma (o slot "volta para o banco" — a alocação continua existindo, só deixa de estar posicionada).

**Endpoint:** `DELETE /api/turma/:turmaGUID/cronograma/slot/:horarioTurmaGUID`

**URL Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `turmaGUID` | string | ✅ Yes | UUID da turma | UUID v4 |
| `horarioTurmaGUID` | string | ✅ Yes | UUID do slot | UUID v4; deve pertencer a esta turma |

**Success Response (200 OK):**
```json
{ "success": true, "message": "Matéria removida do horário (voltou para o banco)", "data": null }
```

**Error Responses:**

**400 Bad Request** - GUID inválido

**401 Unauthorized**
```json
{ "success": false, "message": "Usuário não autenticado", "data": null }
```

**403 Forbidden** - Sem permissão (mesma regra de `Alocar Slot`)

**404 Not Found** - Turma ou slot não encontrado
```json
{ "success": false, "message": "Slot não encontrado", "details": { "message": "Este horário não existe no cronograma desta turma." } }
```

**cURL Example:**
```bash
curl -X DELETE https://api.example.com/api/turma/880e8400-e29b-41d4-a716-446655440001/cronograma/slot/cc1e8400-e29b-41d4-a716-446655440010 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Data Models

### HorarioTurma (Slot)

```typescript
type DiaSemana = "Segunda" | "Terca" | "Quarta" | "Quinta" | "Sexta" | "Sabado" | "Domingo";

interface HorarioTurmaDTO {
  HorarioTurmaGUID: string;
  TurmaGUID: string;
  MatProfTurGUID: string;   // FK para materiaxprofessorxturma
  MateriaGUID: string;
  MateriaNome: string;
  UsuarioCPF: string;       // professor
  UsuarioNome: string;
  DiaSemana: DiaSemana;
  HoraInicio: string;       // "HH:MM"
  HoraFim: string;          // "HH:MM"
}

interface BancoItemDTO {
  MatProfTurGUID: string;
  MateriaGUID: string;
  MateriaNome: string;
  UsuarioCPF: string;
  UsuarioNome: string;
  AulasPorSemana: number | null;   // alocação.AulasPorSemana ?? materia.MateriaAulasPorSemanaPadrao
  AulasAlocadas: number;           // quantos slots já existem para esta alocação
  AulasRestantes: number | null;   // max(0, AulasPorSemana - AulasAlocadas)
}

interface CronogramaTurmaDTO {
  TurmaGUID: string;
  Slots: HorarioTurmaDTO[];
  Banco: BancoItemDTO[];
}
```

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS `horarioturma` (
  `HorarioTurmaGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `TurmaGUID` CHAR(36) NOT NULL,
  `MatProfTurGUID` CHAR(36) NOT NULL,
  `DiaSemana` ENUM('Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo') NOT NULL,
  `HoraInicio` VARCHAR(5) NOT NULL,
  `HoraFim` VARCHAR(5) NOT NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_horarioturma_turma_dia_hora` (`TurmaGUID`, `DiaSemana`, `HoraInicio`),
  INDEX `idx_horarioturma_matproftur` (`MatProfTurGUID`),
  CONSTRAINT `FK_HorarioTurma_Turma` FOREIGN KEY (`TurmaGUID`)
    REFERENCES `turma` (`TurmaGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_HorarioTurma_MatProfTur` FOREIGN KEY (`MatProfTurGUID`)
    REFERENCES `materiaxprofessorxturma` (`MatProfTurGUID`) ON UPDATE CASCADE ON DELETE CASCADE
);
```

Fonte: `backend/database/migrations/2026-07-14-add-horarioturma.sql`.

---

## Business Rules

1. **Sem linha = slot vazio** — o cronograma não é uma matriz pré-preenchida; só existem linhas para os slots efetivamente ocupados.
2. **`UNIQUE (TurmaGUID, DiaSemana, HoraInicio)`** — impede dois slots no mesmo horário exato da mesma turma (redundante com a checagem de aplicação "Horário ocupado", mas garantida também no banco).
3. **Só é possível alocar aulas de uma alocação `Ativa` desta turma** — `MatProfTurGUID` deve existir, pertencer à `turmaGUID` da URL, e estar com `AlocacaoStatus='Ativa'` (`HorarioTurmaService.alocarSlot`).
4. **Depende da configuração de horário da escola** — `DiaSemana` do slot precisa estar entre `EscolaConfiguracao.DiasSemana`; se a escola não tiver configuração salva, 400 "Escola sem configuração de horário" (ver [escolaconfiguracao-api.md](escolaconfiguracao-api.md)).
5. **`AulasPorSemana` obrigatório antes de alocar** — resolvido como `alocacao.AulasPorSemana ?? materia.MateriaAulasPorSemanaPadrao`; se ambos forem `null`, bloqueia a alocação (400).
6. **Respeita o limite de aulas semanais da matéria** — se `AulasAlocadas >= AulasPorSemana` para aquela alocação, novo slot é rejeitado (409 "Limite de aulas semanais atingido").
7. **Sem conflito de horário do professor entre turmas** — antes de criar o slot, verifica se o mesmo professor já tem outra aula (em qualquer turma) que colida com o intervalo `HoraInicio`-`HoraFim` no mesmo `DiaSemana` (`HorarioTurmaDAO.findConflitoProfessor`), retornando 409 com os detalhes da aula conflitante.
8. **Remover slot não afeta a alocação** — `DELETE` só apaga a linha de `horarioturma`; a alocação (`materiaxprofessorxturma`) continua ativa e volta a aparecer no "banco" com uma vaga a mais.
9. **Permissão de escrita: Coordenação ou Direção** — mesmo padrão usado em Matéria/Turma/EscolaConfiguracao (`escolaxusuarioxfuncao.findByTripla(cpf, escolaGUID, funcaoId)` para `funcaoId` 1 ou 6); leitura (`GET`) não exige vínculo com a escola.

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | TurmaGUID/HorarioTurmaGUID inválido | Parâmetro de rota mal formatado |
| 400 | Dados inválidos / MatProfTurGUID inválido / DiaSemana inválido / Horário inválido | Falha de validação do middleware no `POST` |
| 400 | Alocação inválida | `MatProfTurGUID` não é `Ativa`/não é desta turma |
| 400 | Escola sem configuração de horário | Escola sem `EscolaConfiguracao` salva |
| 400 | Dia não letivo | `DiaSemana` fora dos dias letivos configurados |
| 400 | Aulas por semana não configuradas | Nem a alocação nem a matéria têm `AulasPorSemana` |
| 401 | Usuário não autenticado | Token ausente/inválido |
| 403 | Sem permissão | Usuário não é Coordenação/Direção ativa na escola |
| 404 | Turma não encontrada | `turmaGUID` inexistente |
| 404 | Slot não encontrado | `horarioTurmaGUID` inexistente ou de outra turma |
| 409 | Limite de aulas semanais atingido | `AulasAlocadas >= AulasPorSemana` |
| 409 | Horário ocupado | Já existe slot nesse dia+hora para a turma |
| 409 | Conflito de horário do professor | Professor já tem aula em outra turma no mesmo dia+hora |

---

## Examples

### Cenário 1: Montar o cronograma de uma turma
```bash
GET /api/turma/880e8400-.../cronograma
# Response 200, Banco mostra Matemática com AulasRestantes=5

POST /api/turma/880e8400-.../cronograma/slot
{ "slot": { "MatProfTurGUID": "990e8400-...", "DiaSemana": "Segunda", "HoraInicio": "07:00", "HoraFim": "07:50" } }
# Response 201, agora AulasRestantes=4
```

### Cenário 2: Tentar alocar em horário já ocupado pelo mesmo professor em outra turma (❌ Erro)
```bash
POST /api/turma/990e8400-.../cronograma/slot
{ "slot": { "MatProfTurGUID": "770e8400-...", "DiaSemana": "Segunda", "HoraInicio": "07:00", "HoraFim": "07:50" } }
# mesmo professor já leciona outra turma nesse exato horário

Response 409:
{ "success": false, "message": "Conflito de horário do professor", "details": { "message": "..." } }
```

---

## Integration with Other Entities

- **HorarioTurma → EscolaConfiguracao**: depende da configuração de horário letivo da escola — ver [escolaconfiguracao-api.md](escolaconfiguracao-api.md).
- **HorarioTurma → MaterialProfessorTurma**: cada slot ocupa uma alocação existente — ver [professor-api.md](professor-api.md).
- **HorarioTurma → Turma**: um cronograma por turma — ver [turma-api.md](turma-api.md).
- **HorarioTurma → Grade Horária (agendamento automático)**: `HorarioTurmaService.calcularDatas` (exposto em `POST /api/grade-horaria/calcular-datas`) usa os mesmos slots para calcular data/hora de Prova/Tarefa — ver [grade-horaria-api.md](grade-horaria-api.md).

---

## Notes

- Horários (`HoraInicio`/`HoraFim`) são strings simples `HH:MM`, não `Date` — mesma convenção de `EscolaConfiguracao`.
- O router deste módulo (`HorarioTurmaRoteador`) é montado separadamente do CRUD de Turma (`TurmaRoteador`), ambos sob `/api/turma`, sem colisão de rotas por terem mais segmentos de path.
