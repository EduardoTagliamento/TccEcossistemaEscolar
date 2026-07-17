# Plano de Implementação — Permissões em Grupos de Conversa

**Fase 3 do módulo de Chat/WebSocket**
**Pré-requisito:** Fases 1 e 2 concluídas (grupos + individual + mensagens fixadas).

---

## 1. Escopo

Permissões só existem em conversas de **grupo** (Individual não tem hierarquia de roles).

| Tipo de grupo | Role privilegiado | Como é definido |
|---|---|---|
| **Turma** | Representante + Vice-Representante | Representante: definido pela Coordenação ou Direção; Vice: delegado pelo Representante |
| **Tarefa Compartilhada** | Líder | `grupotarefa.UsuarioCPFLider` — definido no ato de formação do grupo |

### 1.1 Poderes dos roles

| Ação | Membro | Vice-Representante | Representante | Líder (Tarefa) |
|---|---|---|---|---|
| Enviar mensagem | ✅ | ✅ | ✅ | ✅ |
| Editar própria mensagem | ✅ | ✅ | ✅ | ✅ |
| Deletar própria mensagem | ✅ | ✅ | ✅ | ✅ |
| Deletar mensagem de outros | ❌ | ✅ | ✅ | ✅ |
| Fixar/Desafixar mensagem | ❌ | ✅ | ✅ | ✅ |
| Delegar/Remover Vice-Representante | ❌ | ❌ | ✅ | N/A |
| Ser definido como Representante | N/A | N/A | (coordenação/direção) | N/A |

**Em conversas individuais:** qualquer participante pode editar e deletar somente as **próprias** mensagens.

---

## 2. Correções na Fase 1 identificadas nesta spec

### 2.1 Bug: `ConversaGrupoRefGUID` errado para grupos de Tarefa

A implementação atual em `TarefaAcademicaService.criarTarefa()` chama:
```typescript
conversaGrupoService.criarGrupoTarefa(tarefaGUID, tarefaTitulo, matriculasGUID)
```
e armazena `ConversaGrupoRefGUID = TarefaGUID`.

**Isso está errado.** A entidade correta para grupos de tarefa é `grupotarefa`, e uma tarefa pode ter N grupos distintos (`GrupoTarefa`). Cada `GrupoTarefa` precisa de sua própria conversa.

**Correção:**
- Remover a chamada de `criarGrupoTarefa` do `TarefaAcademicaService`
- Adicionar o hook em `GrupoTarefaService` quando um `GrupoTarefa` é criado
- `ConversaGrupoRefGUID = GrupoTarefaGUID`
- `UsuarioCPFLider` do `grupotarefa` é adicionado como `MembroFuncao = 'Lider'`

### 2.2 Bug: `findGruposTarefasExpirados` JOIN incorreto

A query atual faz `JOIN tarefaacademica ON ta.TarefaGUID = cg.ConversaGrupoRefGUID`, mas com a correção acima, o `refGUID` passa a ser `GrupoTarefaGUID`. O JOIN precisa passar por `grupotarefa`:

```sql
-- QUERY CORRIGIDA
SELECT cg.ConversaGUID, cg.ConversaGrupoRefGUID
FROM conversa_grupo cg
INNER JOIN conversa c ON c.ConversaGUID = cg.ConversaGUID
INNER JOIN grupotarefa gt ON gt.GrupoTarefaGUID = cg.ConversaGrupoRefGUID
INNER JOIN tarefaacademica ta ON ta.TarefaGUID = gt.TarefaGUID
WHERE cg.ConversaGrupoTipo = 'Tarefa'
  AND ta.TarefaPrazoData < NOW()
  AND c.ConversaStatus = 'Ativa'
```

---

## 3. Observações sobre o sistema existente

### 3.1 Funções no sistema (`funcao` table) — campo `FuncaoId=6` não documentado

O sistema tem as seguintes funções cadastradas. O `FuncaoId=6` (Direção) existe no banco mas **não está documentado no `sql.txt`**:

```
FuncaoId=1  →  Coordenacao
FuncaoId=2  →  Secretaria
FuncaoId=3  →  Professor
FuncaoId=4  →  Responsavel
FuncaoId=5  →  Aluno
FuncaoId=6  →  Direcao        ← DOCUMENTAR
```

Quem pode definir o Representante: usuário com `FuncaoId IN (1, 6)` com `Status = 'Ativo'` na escola da turma.

### 3.2 `MembroFuncao` atual em `conversa_grupo_membro`

```sql
ENUM('Membro', 'Lider')   ← atual
```

Precisa ser ampliado:
```sql
ENUM('Membro', 'Lider', 'Representante', 'Vice-Representante')
```

- Grupos de **Tarefa**: usa `'Membro'` e `'Lider'`
- Grupos de **Turma**: usa `'Membro'`, `'Representante'` e `'Vice-Representante'`

### 3.3 Edição de mensagem — campo novo na tabela `mensagem`

Editar mensagem requer rastrear quando foi editada. Adicionar `MensagemEditadaAt TIMESTAMP NULL`.

---

## 4. Alterações no Schema SQL

### 4.1 Documentar `FuncaoId=6` (Direção)

```sql
INSERT INTO `tccecossistemaescolar`.`funcao` (`FuncaoId`, `FuncaoNome`) VALUES
  (6, 'Direcao')
ON DUPLICATE KEY UPDATE `FuncaoNome` = VALUES(`FuncaoNome`);
```

### 4.2 `conversa_grupo_membro` — ampliar ENUM

```sql
ALTER TABLE `tccecossistemaescolar`.`conversa_grupo_membro`
MODIFY COLUMN `MembroFuncao`
  ENUM('Membro', 'Lider', 'Representante', 'Vice-Representante')
  NOT NULL DEFAULT 'Membro';
```

### 4.3 `mensagem` — adicionar coluna de edição

```sql
ALTER TABLE `tccecossistemaescolar`.`mensagem`
ADD COLUMN `MensagemEditadaAt` TIMESTAMP NULL DEFAULT NULL
  AFTER `MensagemCreatedAt`;
```

---

## 5. Estrutura de Arquivos

### 5.1 Arquivos novos

```
backend/
└── services/
    └── conversa-permissao.service.ts          # NEW — atribuição de roles
backend/
└── database/
    └── migrations/
        └── 2026-07-08-conversa-permissoes.sql # NEW — ALTER TABLE (todos os schemas acima)
```

### 5.2 Arquivos modificados

```
backend/
├── database/
│   └── sql.txt                                    # ADD: INSERT Direcao + ALTERs
├── entities/
│   ├── conversa-grupo-membro.model.ts             # UPDATE: tipo MembroFuncao
│   └── mensagem.model.ts                          # ADD: MensagemEditadaAt field
├── repositories/
│   ├── conversa-grupo.repository.ts               # ADD: setFuncao, getFuncao, findByFuncao
│   │                                              # FIX: findGruposTarefasExpirados query
│   └── mensagem.repository.ts                     # ADD: softDelete, edit
├── services/
│   ├── conversa-grupo.service.ts                  # FIX: remover criarGrupoTarefa da TarefaService
│   │                                              # ADD: criarGrupoGrupoTarefa (nova assinatura)
│   │                                              # ADD: adicionarMembroGrupoTarefa, removerMembroGrupoTarefa
│   ├── mensagem.service.ts                        # ADD: deletarMensagem, editarMensagem
│   │                                              # UPDATE: fixar/desafixar com verificação de role
│   └── tarefaacademica.service.ts                 # REMOVE: chamada a criarGrupoTarefa
├── services/
│   └── grupotarefa.service.ts                     # ADD: hook de criação/membros para conversa
├── controllers/
│   └── conversa.controller.ts                     # ADD: definirRepresentante, vice, deletar, editar
├── middlewares/
│   └── conversa.middleware.ts                     # ADD: validarCPFBody, validarCPFParam, validarEditarBody
└── websocket/
    └── conversa.handler.ts                        # ADD: deletar_mensagem, editar_mensagem events
routes/
└── conversa.routes.ts                             # ADD: novas rotas + injeção deps
```

---

## 6. Entidades modificadas

### 6.1 `conversa-grupo-membro.model.ts`

```typescript
type MembroFuncaoTipo = 'Membro' | 'Lider' | 'Representante' | 'Vice-Representante';
```

Atualizar type no getter, setter (validação) e `ConversaGrupoMembroRow` interface no DAO.

### 6.2 `mensagem.model.ts`

```typescript
#MensagemEditadaAt: Date | null = null;

get MensagemEditadaAt(): Date | null { return this.#MensagemEditadaAt; }

set MensagemEditadaAt(value: Date | null) {
  if (value !== null && (!(value instanceof Date) || isNaN(value.getTime()))) {
    throw new Error('MensagemEditadaAt deve ser uma data válida ou null');
  }
  this.#MensagemEditadaAt = value;
}
```

Atualizar `toJSON()` para incluir o campo. Atualizar `fromDatabase()` para ler da linha.
Atualizar `MensagemRow` interface no DAO.

---

## 7. DAOs

### 7.1 `conversa-grupo.repository.ts` — novos métodos

```typescript
type FuncaoGrupo = 'Membro' | 'Lider' | 'Representante' | 'Vice-Representante';

// Define a função de um membro
async setFuncao(conversaGUID: string, usuarioCPF: string, funcao: FuncaoGrupo): Promise<void>
// UPDATE SET MembroFuncao = ? WHERE ConversaGUID = ? AND MembroUsuarioCPF = ? AND MembroStatus = 'Ativo'

// Retorna a função atual de um membro (null se não for membro ativo)
async getFuncao(conversaGUID: string, usuarioCPF: string): Promise<FuncaoGrupo | null>
// SELECT MembroFuncao FROM conversa_grupo_membro WHERE ConversaGUID = ? AND MembroUsuarioCPF = ? AND MembroStatus = 'Ativo' LIMIT 1

// Retorna membros com uma função específica
async findByFuncao(conversaGUID: string, funcao: FuncaoGrupo): Promise<ConversaGrupoMembro[]>
// SELECT * WHERE ConversaGUID = ? AND MembroFuncao = ? AND MembroStatus = 'Ativo'
```

**Fix `findGruposTarefasExpirados`:** corrigir JOIN conforme seção 2.2.

**Fix `ConversaGrupoMembroRow`:** tipo de `MembroFuncao` deve incluir `'Representante' | 'Vice-Representante'`.

### 7.2 `mensagem.repository.ts` — novos métodos

```typescript
// Soft delete de mensagem (seta MensagemDeletedAt = NOW)
async softDelete(mensagemGUID: string): Promise<void>
// UPDATE mensagem SET MensagemDeletedAt = NOW() WHERE MensagemGUID = ? AND MensagemDeletedAt IS NULL

// Editar conteúdo da mensagem (seta MensagemEditadaAt = NOW)
async edit(mensagemGUID: string, novoConteudo: string): Promise<void>
// UPDATE mensagem SET MensagemConteudo = ?, MensagemEditadaAt = NOW() WHERE MensagemGUID = ? AND MensagemDeletedAt IS NULL
```

---

## 8. Services

### 8.1 `conversa-grupo.service.ts` — correções e adições

**Remover** a chamada existente em `TarefaAcademicaService` e **renomear** o método interno:

```typescript
// NOVO — chamado por GrupoTarefaService após criar um GrupoTarefa
async criarConversaParaGrupoTarefa(
  grupoTarefaGUID: string,    // ConversaGrupoRefGUID (não mais TarefaGUID)
  grupoNome: string,          // GrupoNome ou TarefaTitulo como fallback
  liderCPF: string            // grupotarefa.UsuarioCPFLider → MembroFuncao = 'Lider'
): Promise<void> {
  // 1. Criar conversa + conversa_grupo com refGUID = grupoTarefaGUID
  // 2. addMembro(liderCPF) + setFuncao(liderCPF, 'Lider')
}

// NOVO — chamado por GrupoTarefaService.adicionarMembro()
async adicionarMembroGrupoTarefa(grupoTarefaGUID: string, usuarioCPF: string): Promise<void>

// NOVO — chamado por GrupoTarefaService.expulsarMembro() / sairDoGrupo()
async removerMembroGrupoTarefa(grupoTarefaGUID: string, usuarioCPF: string): Promise<void>
```

**Manter** os métodos de turma intactos (`criarGrupoTurma`, `sincronizarNomeGrupoTurma`, etc.).

**Manter** `criarGrupoTarefa(tarefaGUID, titulo, matriculasGUID)` com `@deprecated` até ser removido do `TarefaAcademicaService` e substituído pela nova assinatura.

### 8.2 `grupotarefa.service.ts` — adicionar hooks de conversa

Adicionar `ConversaGrupoService` como dependência opcional (mesmo padrão de `TurmaService`):

```typescript
#conversaGrupoService?: ConversaGrupoService;

constructor(...deps, conversaGrupoService?: ConversaGrupoService)
```

**Em `criarGruposAutomaticos()`** — após cada `grupoTarefaDAO.create()` bem-sucedido:
```typescript
if (this.#conversaGrupoService) {
  await this.#conversaGrupoService.criarConversaParaGrupoTarefa(
    grupoGUID,
    data.GrupoNome ?? tarefa.TarefaTitulo,
    data.UsuarioCPFLider
  );
}
```

**Em `aceitarConvite()` ou `adicionarMembro()`** (quando membro entra no grupo):
```typescript
if (this.#conversaGrupoService) {
  await this.#conversaGrupoService.adicionarMembroGrupoTarefa(grupoTarefaGUID, membroCPF);
}
```

**Em `expulsarMembro()` / `sairDoGrupo()`** (quando membro sai):
```typescript
if (this.#conversaGrupoService) {
  await this.#conversaGrupoService.removerMembroGrupoTarefa(grupoTarefaGUID, membroCPF);
}
```

**Em `transferirLideranca()`** — trocar role no conversa group:
```typescript
if (this.#conversaGrupoService) {
  await this.#conversaGrupoService.transferirLiderGrupoTarefa(
    grupoTarefaGUID, antigoLiderCPF, novoLiderCPF
  );
}
```
(Adicionar `transferirLiderGrupoTarefa` em `ConversaGrupoService` que faz `setFuncao(antigo, 'Membro')` e `setFuncao(novo, 'Lider')`)

### 8.3 `conversa-permissao.service.ts` (novo)

```typescript
export default class ConversaPermissaoService {
  #conversaGrupoDAO: ConversaGrupoDAO;
  #conversaDAO: ConversaDAO;
  #turmaDAO: TurmaDAO;
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  // === TURMA — Representante ===

  async definirRepresentante(conversaGUID: string, alvoCPF: string, solicitanteCPF: string): Promise<void>
  async removerRepresentante(conversaGUID: string, solicitanteCPF: string): Promise<void>

  // === TURMA — Vice-Representante ===

  async definirViceRepresentante(conversaGUID: string, alvoCPF: string, solicitanteCPF: string): Promise<void>
  async removerViceRepresentante(conversaGUID: string, alvoCPF: string, solicitanteCPF: string): Promise<void>
}
```

**Lógica de `definirRepresentante`:**
1. `conversaGrupoDAO.findByConversaGUID(conversaGUID)` — validar que existe e é tipo `'Turma'` (400 se não for)
2. `turmaDAO.findById(grupo.ConversaGrupoRefGUID)` → obter `EscolaGUID`
3. Verificar autorização: `escolaxUsuarioxFuncaoDAO.findAll({ UsuarioCPF: solicitanteCPF, EscolaGUID, FuncaoId: [1, 6] })` — 403 se não tiver Coordenação ou Direção ativa
4. `conversaGrupoDAO.isMembro(conversaGUID, alvoCPF)` — 404 se alvo não for membro ativo
5. Rebaixar Representante atual (se houver): `findByFuncao(conversaGUID, 'Representante')` → `setFuncao(_, 'Membro')`
6. `setFuncao(conversaGUID, alvoCPF, 'Representante')`
7. Emit: `SocketServer.emit(conversaGUID, 'permissao_atualizada', { UsuarioCPF: alvoCPF, NovaFuncao: 'Representante' })`

**Lógica de `definirViceRepresentante`:**
1. `getFuncao(conversaGUID, solicitanteCPF) === 'Representante'` — 403 se não for Representante
2. `isMembro(conversaGUID, alvoCPF)` — 404 se alvo não for membro ativo
3. Se alvo já é `'Representante'` → 400 (Representante não pode virar Vice)
4. `setFuncao(conversaGUID, alvoCPF, 'Vice-Representante')`
5. Emit: `SocketServer.emit(conversaGUID, 'permissao_atualizada', { UsuarioCPF: alvoCPF, NovaFuncao: 'Vice-Representante' })`

**Lógica de `removerViceRepresentante`:**
1. `getFuncao(conversaGUID, solicitanteCPF) === 'Representante'` — 403
2. `getFuncao(conversaGUID, alvoCPF) === 'Vice-Representante'` — 400 (não é vice)
3. `setFuncao(conversaGUID, alvoCPF, 'Membro')`
4. Emit: `SocketServer.emit(conversaGUID, 'permissao_atualizada', { UsuarioCPF: alvoCPF, NovaFuncao: 'Membro' })`

**Nota:** verificação de `FuncaoId IN (1, 6)` na tabela `escolaxusuarioxfuncao` deve usar query com `IN`:
```sql
SELECT 1 FROM escolaxusuarioxfuncao
WHERE UsuarioCPF = ? AND EscolaGUID = ?
  AND FuncaoId IN (1, 6) AND Status = 'Ativo'
LIMIT 1
```

### 8.4 `mensagem.service.ts` — `deletarMensagem` e `editarMensagem`

```typescript
async deletarMensagem(
  mensagemGUID: string,
  conversaGUID: string,
  usuarioCPF: string
): Promise<void>

async editarMensagem(
  mensagemGUID: string,
  conversaGUID: string,
  usuarioCPF: string,
  novoConteudo: string
): Promise<void>
```

**Lógica de `deletarMensagem`:**
1. `conversaDAO.isParticipante(conversaGUID, usuarioCPF)` — 403 se não for
2. `mensagemDAO.findById(mensagemGUID)` — 404 se não existir ou já deletada
3. Validar que mensagem pertence à conversa: `mensagem.ConversaGUID !== conversaGUID` → 404
4. Verificar permissão:
   - Se mensagem é do próprio `usuarioCPF`: pode deletar (grupos e individual)
   - Se é mensagem de outro:
     - Se `conversaTipo === 'Individual'`: 403 (não pode deletar mensagem do outro em conversa individual)
     - Se `conversaTipo === 'Grupo'`:
       - `funcao = conversaGrupoDAO.getFuncao(conversaGUID, usuarioCPF)`
       - `['Representante', 'Vice-Representante', 'Lider'].includes(funcao)` — 403 se não tiver role
5. `mensagemDAO.softDelete(mensagemGUID)`
6. Emit lazy: `SocketServer.emit(conversaGUID, 'mensagem_deletada', { ConversaGUID, MensagemGUID, DeletadaPorCPF })`

**Lógica de `editarMensagem`:**
1. `conversaDAO.isParticipante(conversaGUID, usuarioCPF)` — 403
2. `mensagemDAO.findById(mensagemGUID)` — 404 se não existir ou deletada
3. Validar que mensagem pertence à conversa: `mensagem.ConversaGUID !== conversaGUID` → 404
4. Apenas o próprio remetente pode editar: `mensagem.MensagemRemetenteCPF !== usuarioCPF` → 403 (roles não têm poder de editar mensagem alheia)
5. `mensagemDAO.edit(mensagemGUID, novoConteudo)`
6. Emit lazy: `SocketServer.emit(conversaGUID, 'mensagem_editada', { ConversaGUID, MensagemGUID, NovoConteudo: novoConteudo, EditadaAt: ... })`

### 8.5 `mensagem.service.ts` — restrição de fixar/desafixar em grupos

Atualizar `fixarMensagem` e `desafixarMensagem` para verificar role antes de executar:

```typescript
const conversa = await this.#conversaDAO.findById(conversaGUID);
if (conversa?.ConversaTipo === 'Grupo') {
  const funcao = await this.#conversaGrupoDAO.getFuncao(conversaGUID, usuarioCPF);
  if (!['Representante', 'Vice-Representante', 'Lider'].includes(funcao ?? '')) {
    throw new ErrorResponse(403, 'Apenas Representante, Vice-Representante ou Líder podem fixar mensagens neste grupo');
  }
}
```

---

## 9. REST API — Novos endpoints

### Permissões de grupo (Turma)

| Método | Rota | Descrição | Autorização |
|---|---|---|---|
| `PUT` | `/api/conversa/:guid/permissao/representante` | Define Representante | Coordenação ou Direção da escola (FuncaoId 1 ou 6) |
| `DELETE` | `/api/conversa/:guid/permissao/representante` | Remove Representante | Coordenação ou Direção da escola |
| `PUT` | `/api/conversa/:guid/permissao/vice-representante` | Define Vice-Representante | Representante do grupo |
| `DELETE` | `/api/conversa/:guid/permissao/vice-representante/:cpf` | Remove Vice-Representante | Representante do grupo |

### Mensagens — deleção e edição

| Método | Rota | Descrição | Autorização |
|---|---|---|---|
| `DELETE` | `/api/conversa/:guid/mensagem/:msgGuid` | Deleta mensagem | Própria msg: qualquer participante; Msg de outro: roles de grupo |
| `PATCH` | `/api/conversa/:guid/mensagem/:msgGuid` | Edita mensagem | Apenas o remetente original |

**Body `PATCH` (editar):**
```json
{ "MensagemConteudo": "novo conteúdo" }
```

**Body `PUT` (definir Representante ou Vice-Representante):**
```json
{ "UsuarioCPF": "123.456.789-00" }
```

---

## 10. WebSocket — Novos eventos

| Direção | Evento | Payload |
|---|---|---|
| Cliente → Servidor | `deletar_mensagem` | `{ ConversaGUID, MensagemGUID }` |
| Cliente → Servidor | `editar_mensagem` | `{ ConversaGUID, MensagemGUID, NovoConteudo }` |
| Servidor → Cliente | `mensagem_deletada` | `{ ConversaGUID, MensagemGUID, DeletadaPorCPF }` |
| Servidor → Cliente | `mensagem_editada` | `{ ConversaGUID, MensagemGUID, NovoConteudo, EditadaAt }` |
| Servidor → Cliente | `permissao_atualizada` | `{ ConversaGUID, UsuarioCPF, NovaFuncao }` |

Os handlers de WS para `deletar_mensagem` e `editar_mensagem` delegam ao service (que emite o broadcast). Não emitir no handler para evitar duplicata.

---

## 11. Decisões de Design

### 11.1 Único Representante por grupo de Turma
Ao definir um novo Representante, o anterior é automaticamente rebaixado para `Membro`. Vice-Representantes não têm limite de quantidade.

### 11.2 Vice-Representante — sem poder de delegação
Vice-Representante tem os mesmos poderes operacionais (deletar outros, fixar, desafixar) mas NÃO pode nomear ou remover outros Vice-Representantes. Só o Representante delega.

### 11.3 Edição é exclusiva do remetente
Mesmo Representante/Lider não pode editar mensagem de outro membro. Editar é sempre um poder pessoal. Deletar de outros é um poder de moderação.

### 11.4 Lider do GrupoTarefa — imutável via conversa
A transferência de Liderança do `grupotarefa` (`UsuarioCPFLider`) já tem seu próprio fluxo em `GrupoTarefaService`. Quando isso ocorre, o role no `conversa_grupo_membro` é sincronizado via `transferirLiderGrupoTarefa`.

### 11.5 Perda de role ao sair do grupo
Soft-remove em `conversa_grupo_membro` (MembroStatus = 'Inativo') preserva o histórico. Se o membro retornar, volta como `Membro` (nunca restaura role antigo).

### 11.6 `FuncaoId=6` — Direção
Campo existente no banco mas não documentado. A query de autorização usa `FuncaoId IN (1, 6)` para cobrir Coordenação e Direção. Se novos roles administrativos forem criados, basta adicionar IDs ao array.

---

## 12. Atualização da injeção de dependências

### `conversaRouterFactory()`

```typescript
// Adicionar:
const conversaPermissaoService = new ConversaPermissaoService(
  conversaGrupoDAO, conversaDAO, turmaDAO, escolaxUsuarioxFuncaoDAO
);
const controller = new ConversaController(
  conversaService, mensagemService, conversaIndividualService, conversaPermissaoService
);
```

### Rotas do `grupotarefa` (factory existente)

Adicionar `ConversaGrupoService` ao `GrupoTarefaService`:
```typescript
const conversaGrupoService = new ConversaGrupoService(conversaDAO, conversaGrupoDAO, matriculaDAO);
const grupoTarefaService = new GrupoTarefaService(...deps, conversaGrupoService);
```

---

## 13. Sequência de Implementação

1. **SQL** — documentar `FuncaoId=6` + ALTER TABLE `conversa_grupo_membro` + ALTER TABLE `mensagem` (arquivo de migration + `sql.txt`)
2. **Entidades** — atualizar `ConversaGrupoMembro` (tipo) e `Mensagem` (campo `MensagemEditadaAt`)
3. **DAOs** — `setFuncao`, `getFuncao`, `findByFuncao` em `ConversaGrupoDAO`; fix `findGruposTarefasExpirados`; `softDelete`, `edit` em `MensagemDAO`
4. **Services** — criar `ConversaPermissaoService`; corrigir `criarGrupoTarefa` em `TarefaAcademicaService`; adicionar métodos em `ConversaGrupoService`; hooks em `GrupoTarefaService`; `deletarMensagem`, `editarMensagem`, restrição de fixar em `MensagemService`
5. **Controller + Middleware** — novos handlers e validadores
6. **WebSocket** — `deletar_mensagem`, `editar_mensagem` no handler
7. **Routers** — novas rotas + injeção de `ConversaPermissaoService`; route de grupotarefa recebe `ConversaGrupoService`
8. **Compilar** — `tsc --noEmit` zero erros
