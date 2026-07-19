# API Documentation - Grupo de Projeto (GrupoProjeto)

**Version:** 1.0.0
**Base URL:** `/api/grupoprojeto`
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Criar Grupo](#criar-grupo)
  - [Listar Grupos do Projeto](#listar-grupos-do-projeto)
  - [Buscar Grupo](#buscar-grupo)
  - [Atualizar Grupo](#atualizar-grupo)
  - [Atribuir Pontuação](#atribuir-pontuação)
  - [Entrar no Grupo](#entrar-no-grupo)
  - [Sair do Grupo](#sair-do-grupo)
  - [Adicionar Membro](#adicionar-membro)
  - [Expulsar Membro](#expulsar-membro)
  - [Transferir Liderança](#transferir-liderança)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)
- [Examples](#examples)
- [Integration with Other Entities](#integration-with-other-entities)
- [Notes](#notes)

---

## Overview

API para gerenciamento dos **grupos formados dentro de um Projeto** (ver [projeto-api.md](projeto-api.md)). **Diferente de `GrupoTarefa`, nenhum grupo é criado automaticamente**: um aluno elegível cria seu próprio grupo (vira líder) quando decide participar, com uma proposta obrigatória e uma visibilidade explícita (`Aberto` ou `Fechado`). Grupos de projeto também **podem reunir alunos de turmas diferentes** da mesma escola — por isso `GrupoProjeto` não tem `TurmaGUID` (diferente de `GrupoTarefa`).

**Conceito:**
- `GrupoProjeto` pertence a um `ProjetoGUID`, tem um único `UsuarioCPFLider`, uma `GrupoProjetoProposta` obrigatória e uma `GrupoProjetoVisibilidade` (`Aberto`/`Fechado`).
- Membros (além do líder) ficam em `usuarioxgrupoprojeto`.
- Grupo `Aberto`: qualquer aluno elegível entra diretamente via `POST /:grupoGUID/entrar`.
- Grupo `Fechado`: entrada só via convite do líder ou solicitação aceita — ver [convitegrupoprojeto-api.md](convitegrupoprojeto-api.md).
- Toda ação relevante é registrada em `historicogrupoprojeto`.
- **Não há integração com chat de grupo na v1** (decisão documentada, ver Notes).

**Permissões:**
- **Líder do grupo**: renomeia, edita proposta/visibilidade, expulsa membros, transfere liderança, sai do grupo (se sozinho, dissolve).
- **Criador do Projeto** (Professor/Direção): pode **adicionar** um aluno elegível diretamente a qualquer grupo do seu projeto (sem convite, mesmo se `Fechado`), **expulsar qualquer membro incluindo o líder**, e **atribuir pontuação** — autoridade adicional que não existe em `GrupoTarefa` (decisão confirmada com o usuário, ver `docs/PLANO_IMPLEMENTACAO_PROJETOS.md`, Seção 1 decisão #5 e #7).
- **Membro do grupo**: pode sair (`DELETE /:grupoGUID/sair`).
- Qualquer usuário autenticado pode listar/visualizar grupos de um projeto — a visualização não é restrita a membros (diferente de `GrupoTarefa`), porque grupos `Aberto` precisam ser navegáveis publicamente para que outros alunos decidam entrar.

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

### Criar Grupo

O aluno cria seu próprio grupo (líder = ele mesmo).

**Endpoint:** `POST /api/grupoprojeto`

**Request Body:**
```json
{
  "ProjetoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "GrupoProjetoNome": "Equipe Alfa",
  "GrupoProjetoProposta": "Vamos construir um robô seguidor de linha com sensores infravermelhos.",
  "GrupoProjetoVisibilidade": "Aberto"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `ProjetoGUID` | string | ✅ Yes | UUID v4 |
| `GrupoProjetoNome` | string | ❌ No | máx. 128 caracteres |
| `GrupoProjetoProposta` | string | ✅ Yes | 1-2048 caracteres |
| `GrupoProjetoVisibilidade` | string | ✅ Yes | `'Aberto'` ou `'Fechado'` |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Grupo criado com sucesso",
  "data": {
    "grupo": {
      "GrupoProjetoGUID": "aa0e8400-e29b-41d4-a716-446655440001",
      "ProjetoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "UsuarioCPFLider": "12345678901",
      "NomeLider": "João Silva",
      "GrupoProjetoNome": "Equipe Alfa",
      "GrupoProjetoProposta": "Vamos construir um robô seguidor de linha...",
      "GrupoProjetoVisibilidade": "Aberto",
      "GrupoProjetoPontuacao": null,
      "Membros": [
        { "UsuarioCPF": "12345678901", "UsuarioNome": "João Silva", "DataEntrada": "2026-07-19T10:00:00.000Z", "IsLider": true }
      ],
      "TotalMembros": 1,
      "LimiteMaximo": 5,
      "PodeEntrar": true,
      "CreatedAt": "2026-07-19T10:00:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Validação (middleware)
```json
{ "success": false, "message": "Erro na validação de dados", "details": { "message": "O campo 'GrupoProjetoProposta' é obrigatório e deve ter entre 1 e 2048 caracteres." } }
```

**400 Bad Request** - Projeto encerrado ou prazo vencido
```json
{ "success": false, "message": "Prazo de inscrição do projeto já encerrou" }
```

**403 Forbidden** - Aluno não elegível
```json
{ "success": false, "message": "Você não é elegível para participar deste projeto" }
```

**404 Not Found**
```json
{ "success": false, "message": "Projeto não encontrado" }
```

**409 Conflict** - Já participa de outro grupo no mesmo projeto
```json
{ "success": false, "message": "Você já participa de um grupo neste projeto" }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/grupoprojeto \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "ProjetoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "GrupoProjetoProposta": "...", "GrupoProjetoVisibilidade": "Aberto" }'
```

---

### Listar Grupos do Projeto

**Endpoint:** `GET /api/grupoprojeto/projeto/:projetoGUID`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Grupos listados com sucesso",
  "data": { "grupos": [ /* GrupoProjetoComMembrosDTO[] */ ], "total": 1 }
}
```

**Error Responses:**

**404 Not Found**
```json
{ "success": false, "message": "Projeto não encontrado" }
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/grupoprojeto/projeto/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Buscar Grupo

**Endpoint:** `GET /api/grupoprojeto/:grupoGUID`

**Success Response (200 OK):** objeto `grupo` no mesmo formato de [Criar Grupo](#criar-grupo).

**Error Responses:**

**404 Not Found**
```json
{ "success": false, "message": "Grupo não encontrado" }
```

---

### Atualizar Grupo

Atualiza nome, proposta e/ou visibilidade. Apenas o líder.

**Endpoint:** `PATCH /api/grupoprojeto/:grupoGUID`

**Request Body (ao menos um campo):**
```json
{ "GrupoProjetoVisibilidade": "Fechado" }
```

**Success Response (200 OK):**
```json
{ "success": true, "message": "Grupo atualizado com sucesso", "data": null }
```

**Error Responses:**

**403 Forbidden**
```json
{ "success": false, "message": "Apenas o líder pode atualizar o grupo" }
```

**404 Not Found**
```json
{ "success": false, "message": "Grupo não encontrado" }
```

---

### Atribuir Pontuação

Define/atualiza `GrupoProjetoPontuacao`. Apenas o `UsuarioCPFCriador` do projeto.

**Endpoint:** `PATCH /api/grupoprojeto/:grupoGUID/pontuacao`

**Request Body:**
```json
{ "GrupoProjetoPontuacao": 8.5 }
```

**Success Response (200 OK):**
```json
{ "success": true, "message": "Pontuação atribuída com sucesso", "data": null }
```

**Error Responses:**

**400 Bad Request**
```json
{ "success": false, "message": "GrupoProjetoPontuacao deve ser um número >= 0" }
```

**403 Forbidden** - Não é o criador do projeto
```json
{ "success": false, "message": "Apenas o criador do projeto pode atribuir pontuação" }
```

---

### Entrar no Grupo

Entrada direta — apenas se `GrupoProjetoVisibilidade='Aberto'`.

**Endpoint:** `POST /api/grupoprojeto/:grupoGUID/entrar`

**Success Response (200 OK):**
```json
{ "success": true, "message": "Você entrou no grupo com sucesso", "data": null }
```

**Error Responses:**

**400 Bad Request** - Grupo cheio / já é membro / projeto encerrado
```json
{ "success": false, "message": "Grupo já atingiu o limite máximo de integrantes" }
```

**403 Forbidden** - Grupo fechado ou aluno não elegível
```json
{ "success": false, "message": "Este grupo é fechado — entrada só por convite ou solicitação aceita" }
```

**409 Conflict**
```json
{ "success": false, "message": "Você já participa de outro grupo neste projeto" }
```

---

### Sair do Grupo

**Endpoint:** `DELETE /api/grupoprojeto/:grupoGUID/sair`

**Success Response (200 OK):**
```json
{ "success": true, "message": "Você saiu do grupo", "data": null }
```
Ou, se o líder era o único integrante:
```json
{ "success": true, "message": "Grupo dissolvido — você era o único integrante", "data": null }
```

**Error Responses:**

**400 Bad Request** - Líder com outros membros precisa transferir liderança antes
```json
{ "success": false, "message": "Transfira a liderança para outro membro antes de sair do grupo" }
```

**404 Not Found**
```json
{ "success": false, "message": "Você não é membro deste grupo" }
```

---

### Adicionar Membro

Adiciona um aluno elegível diretamente ao grupo, sem convite — **apenas o criador do projeto**, funciona mesmo em grupo `Fechado`.

**Endpoint:** `POST /api/grupoprojeto/:grupoGUID/membros`

**Request Body:**
```json
{ "UsuarioCPF": "98765432100" }
```

**Success Response (200 OK):**
```json
{ "success": true, "message": "Membro adicionado com sucesso", "data": null }
```

**Error Responses:**

**403 Forbidden**
```json
{ "success": false, "message": "Apenas o criador do projeto pode adicionar membros diretamente" }
```
```json
{ "success": false, "message": "O aluno informado não é elegível para participar deste projeto" }
```

**409 Conflict**
```json
{ "success": false, "message": "O aluno já participa de outro grupo neste projeto" }
```

---

### Expulsar Membro

Remove um membro. Pode ser chamado pelo **líder do grupo** ou pelo **criador do projeto**. Expulsar o próprio líder só é permitido ao criador do projeto — nesse caso, o membro mais antigo é promovido a líder, ou o grupo é dissolvido se não houver mais ninguém.

**Endpoint:** `DELETE /api/grupoprojeto/:grupoGUID/membros/:cpf`

**Success Response (200 OK):**
```json
{ "success": true, "message": "Membro expulso com sucesso", "data": { "novoLiderCPF": null, "grupoDissolvido": false } }
```
Ou, ao expulsar o líder com outros membros:
```json
{ "success": true, "message": "Líder removido — liderança transferida ao membro mais antigo", "data": { "novoLiderCPF": "98765432100", "grupoDissolvido": false } }
```
Ou, ao expulsar o líder sozinho:
```json
{ "success": true, "message": "Líder removido — grupo dissolvido (não havia outros membros)", "data": { "novoLiderCPF": null, "grupoDissolvido": true } }
```

**Error Responses:**

**400 Bad Request** - Auto-expulsão
```json
{ "success": false, "message": "Você não pode expulsar a si mesmo — use a ação de sair do grupo" }
```

**403 Forbidden**
```json
{ "success": false, "message": "Apenas o líder do grupo ou o criador do projeto podem expulsar membros" }
```
```json
{ "success": false, "message": "Apenas o criador do projeto pode remover o líder do grupo" }
```

**404 Not Found**
```json
{ "success": false, "message": "Usuário não é membro deste grupo" }
```

---

### Transferir Liderança

**Endpoint:** `PATCH /api/grupoprojeto/:grupoGUID/transferir-lider`

**Request Body:**
```json
{ "NovoLiderCPF": "98765432100" }
```

**Success Response (200 OK):**
```json
{ "success": true, "message": "Liderança transferida com sucesso", "data": null }
```

**Error Responses:**

**400 Bad Request**
```json
{ "success": false, "message": "Novo líder deve ser um membro do grupo" }
```

**403 Forbidden**
```json
{ "success": false, "message": "Apenas o líder pode transferir a liderança" }
```

---

## Data Models

```typescript
type GrupoProjetoVisibilidade = 'Aberto' | 'Fechado';

interface GrupoProjeto {
  GrupoProjetoGUID: string;
  ProjetoGUID: string;
  UsuarioCPFLider: string;
  GrupoProjetoNome: string | null;
  GrupoProjetoProposta: string;
  GrupoProjetoVisibilidade: GrupoProjetoVisibilidade;
  GrupoProjetoPontuacao: number | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

interface MembroGrupoProjetoDTO {
  UsuarioCPF: string;
  UsuarioNome: string;
  DataEntrada: Date;
  IsLider: boolean;
}

interface GrupoProjetoComMembrosDTO {
  GrupoProjetoGUID: string;
  ProjetoGUID: string;
  UsuarioCPFLider: string;
  NomeLider: string;
  GrupoProjetoNome: string | null;
  GrupoProjetoProposta: string;
  GrupoProjetoVisibilidade: GrupoProjetoVisibilidade;
  GrupoProjetoPontuacao: number | null;
  Membros: MembroGrupoProjetoDTO[];
  TotalMembros: number;
  LimiteMaximo: number;
  PodeEntrar: boolean;
  CreatedAt: Date;
}
```

### Database Schema

```sql
CREATE TABLE grupoprojeto (
  GrupoProjetoGUID CHAR(36) NOT NULL PRIMARY KEY,
  ProjetoGUID CHAR(36) NOT NULL,
  UsuarioCPFLider VARCHAR(14) NOT NULL,
  GrupoProjetoNome VARCHAR(128) NULL,
  GrupoProjetoProposta VARCHAR(2048) NOT NULL,
  GrupoProjetoVisibilidade ENUM('Aberto','Fechado') NOT NULL DEFAULT 'Fechado',
  GrupoProjetoPontuacao DECIMAL(6,2) NULL,
  CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ProjetoGUID) REFERENCES projeto(ProjetoGUID) ON DELETE CASCADE,
  FOREIGN KEY (UsuarioCPFLider) REFERENCES usuario(UsuarioCPF) ON DELETE RESTRICT
);

CREATE TABLE usuarioxgrupoprojeto (
  GrupoProjetoGUID CHAR(36) NOT NULL,
  UsuarioCPF VARCHAR(14) NOT NULL,
  DataEntrada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (GrupoProjetoGUID, UsuarioCPF),
  FOREIGN KEY (GrupoProjetoGUID) REFERENCES grupoprojeto(GrupoProjetoGUID) ON DELETE CASCADE,
  FOREIGN KEY (UsuarioCPF) REFERENCES usuario(UsuarioCPF) ON DELETE CASCADE
);
```

---

## Business Rules

1. **Sem criação automática** — grupos só existem se um aluno chamar `POST /api/grupoprojeto` (diferente de `GrupoTarefa`).
2. **1 grupo por aluno por projeto** — `UsuarioXGrupoProjetoDAO.contarParticipacoesNoProjeto` bloqueia um segundo grupo/entrada no mesmo `ProjetoGUID` (líder ou membro).
3. **Elegibilidade sempre revalidada** — criar grupo, entrar, adicionar membro e aceitar convite/solicitação todos chamam `ProjetoDAO.usuarioElegivel` antes de qualquer escrita.
4. **Limite de vagas aplicado em todo ponto de entrada** — `entrar`, `adicionarMembro` e a aceitação de convite/solicitação (ver [convitegrupoprojeto-api.md](convitegrupoprojeto-api.md)) todos validam `TotalMembros < ProjetoGrupoMaxPessoas` antes de inserir (diferente do TODO não implementado em `ConviteGrupoTarefaService`).
5. **Autoridade dupla sobre o grupo** — líder gerencia seu próprio grupo; o criador do projeto tem autoridade adicional (adicionar membro direto, expulsar até o líder, atribuir pontuação) — decisão confirmada explicitamente com o usuário (não está presente em `GrupoTarefa`).
6. **Expulsão do líder promove o mais antigo** — `GrupoProjetoService.expulsarMembro`, quando o alvo é o líder, busca `UsuarioXGrupoProjetoDAO.findMembroMaisAntigo` e o promove; se não houver ninguém, o grupo é apagado (`ON DELETE CASCADE` remove `usuarioxgrupoprojeto`/`convitegrupoprojeto`/`historicogrupoprojeto`).
7. **Sair exige transferência prévia se líder acompanhado** — `sairGrupo` bloqueia (400) se o líder tentar sair havendo outros membros; só dissolve se ele for o único.
8. **Toda ação gera histórico** — `Entrada`, `Saida`, `Expulsao`, `TransferenciaLider`, `MudancaVisibilidade`, `PontuacaoAtribuida` em `historicogrupoprojeto`.
9. **Visualização pública dentro do projeto** — `buscarGrupo`/`listarGruposDoProjeto` não exigem que o requisitante seja membro (diferente de `GrupoTarefaService.buscarGrupo`), pois grupos `Aberto` precisam ser navegáveis para quem ainda não entrou.

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | Erro na validação de dados | Campo obrigatório ausente/mal formatado |
| 400 | Prazo de inscrição do projeto já encerrou / Projeto está encerrado | Ação de entrada após o prazo |
| 400 | Grupo já atingiu o limite máximo de integrantes | Vagas esgotadas |
| 400 | Você já é membro deste grupo / Usuário já é membro do grupo | Entrada duplicada |
| 400 | Novo líder deve ser um membro do grupo | Transferência para não-membro |
| 400 | Você não pode expulsar a si mesmo | `cpf` do path == ator |
| 400 | Transfira a liderança para outro membro antes de sair do grupo | Líder tentando sair acompanhado |
| 401 | Não autenticado | Token ausente/inválido |
| 403 | Você não é elegível para participar deste projeto | Aluno sem matrícula elegível |
| 403 | Este grupo é fechado — entrada só por convite ou solicitação aceita | `entrar` em grupo `Fechado` |
| 403 | Apenas o líder pode ... | Ação restrita ao líder |
| 403 | Apenas o criador do projeto pode ... | Ação restrita ao criador do projeto |
| 404 | Grupo não encontrado / Projeto não encontrado | GUID inexistente |
| 404 | Usuário não é membro deste grupo / Você não é membro deste grupo | `cpf` alvo não está no grupo |
| 409 | Você já participa de um/outro grupo neste projeto | Segunda participação no mesmo projeto |

---

## Examples

### Cenário 1: Aluno cria grupo aberto, outro aluno entra direto
```bash
POST /api/grupoprojeto
{ "ProjetoGUID": "...", "GrupoProjetoProposta": "...", "GrupoProjetoVisibilidade": "Aberto" }
# Response 201

POST /api/grupoprojeto/aa0e8400-e29b-41d4-a716-446655440001/entrar
# (outro aluno elegível) Response 200
```

### Cenário 2: Criador do projeto remove o líder de um grupo
```bash
DELETE /api/grupoprojeto/aa0e8400-e29b-41d4-a716-446655440001/membros/12345678901
# (chamado pelo UsuarioCPFCriador do projeto, alvo é o líder)
Response 200:
{ "success": true, "message": "Líder removido — liderança transferida ao membro mais antigo", "data": { "novoLiderCPF": "98765432100", "grupoDissolvido": false } }
```

### Cenário 3: Aluno tenta entrar em grupo fechado (❌ Erro)
```bash
POST /api/grupoprojeto/aa0e8400-e29b-41d4-a716-446655440001/entrar
# grupo com GrupoProjetoVisibilidade='Fechado'

Response 403:
{ "success": false, "message": "Este grupo é fechado — entrada só por convite ou solicitação aceita" }
```

---

## Integration with Other Entities

- **GrupoProjeto → Projeto**: todo grupo pertence a um projeto — ver [projeto-api.md](projeto-api.md).
- **GrupoProjeto → ConviteGrupoProjeto**: entrada em grupo `Fechado` — ver [convitegrupoprojeto-api.md](convitegrupoprojeto-api.md).
- **GrupoProjeto → Notificação**: dispara `removido_grupo_projeto` e `projeto_pontuacao_atribuida` — ver [notificacao-api.md](notificacao-api.md).

---

## Notes

- **Sem chat de grupo na v1** — `ConversaGrupoService` (usado por `GrupoTarefa`) rotula toda conversa criada via `criarConversaParaGrupoTarefa` com `RefTipo='Tarefa'`; reaproveitar sem generalizar esse rótulo primeiro misturaria GUIDs de `GrupoProjeto` sob um tipo de referência incorreto. Decisão documentada em `docs/PLANO_IMPLEMENTACAO_PROJETOS.md`, Seção 7 ponto 4 — fica para uma fase futura.
- Todas as datas são retornadas em ISO 8601.
- `LimiteMaximo` em `GrupoProjetoComMembrosDTO` vem de `Projeto.ProjetoGrupoMaxPessoas`, não é armazenado no próprio grupo.
