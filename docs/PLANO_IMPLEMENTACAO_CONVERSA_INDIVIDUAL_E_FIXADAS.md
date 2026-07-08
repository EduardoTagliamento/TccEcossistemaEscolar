# Plano de Implementação — Conversas Individuais e Mensagens Fixadas

**Fase 2 do módulo de Chat/WebSocket**
**Pré-requisito:** Fase 1 (grupos) concluída e funcionando.

---

## 1. Escopo

| Feature | Descrição |
|---|---|
| **Conversa Individual (1:1)** | Qualquer usuário pode iniciar uma conversa com qualquer outro usuário. A conversa só existe quando alguém a inicia. |
| **Mensagens Fixadas** | Qualquer participante pode fixar/desafixar mensagens, tanto em conversas individuais quanto em grupos. Em grupos, permissão granular por função é preparada mas implementada no futuro. |

---

## 2. Alterações no Schema SQL

### 2.1 Tabela `mensagem_fixada` (nova)

```sql
-- TABELA: mensagem_fixada
-- Mensagens fixadas em qualquer tipo de conversa
-- Individual: qualquer participante pode fixar/desafixar
-- Grupo: qualquer membro pode fixar/desafixar (permissão granular = futuro)
CREATE TABLE `tccecossistemaescolar`.`mensagem_fixada` (
  `MensagemGUID`  CHAR(36)     NOT NULL,
  `ConversaGUID`  CHAR(36)     NOT NULL,
  `FixadaPorCPF`  VARCHAR(14)  NOT NULL,
  `FixadaAt`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MensagemGUID`),
  INDEX `idx_mf_conversa` (`ConversaGUID`),
  CONSTRAINT `FK_MensagemFixada_Mensagem`
    FOREIGN KEY (`MensagemGUID`) REFERENCES `tccecossistemaescolar`.`mensagem` (`MensagemGUID`)
    ON DELETE CASCADE,
  CONSTRAINT `FK_MensagemFixada_Conversa`
    FOREIGN KEY (`ConversaGUID`) REFERENCES `tccecossistemaescolar`.`conversa` (`ConversaGUID`)
    ON DELETE CASCADE,
  CONSTRAINT `FK_MensagemFixada_Usuario`
    FOREIGN KEY (`FixadaPorCPF`) REFERENCES `tccecossistemaescolar`.`usuario` (`UsuarioCPF`)
);
```

> A tabela `conversa_individual` já existe desde a Fase 1 com a estrutura correta:
> ```sql
> CREATE TABLE `tccecossistemaescolar`.`conversa_individual` (
>   `ConversaGUID`        CHAR(36)     NOT NULL,
>   `ConversaIndUsr1CPF`  VARCHAR(14)  NOT NULL,
>   `ConversaIndUsr2CPF`  VARCHAR(14)  NOT NULL,
>   PRIMARY KEY (`ConversaGUID`),
>   UNIQUE KEY `UK_ConversaInd_Usuarios` (`ConversaIndUsr1CPF`, `ConversaIndUsr2CPF`),
>   ...
> );
> ```
> **IMPORTANTE:** O par `(Usr1CPF, Usr2CPF)` é armazenado em ordem canônica (menor CPF lexicográfico primeiro). Isso garante que a UNIQUE KEY cubra ambos os sentidos da conversa.

---

## 3. Estrutura de Arquivos

### 3.1 Arquivos novos

```
backend/
├── entities/
│   └── conversa-individual.model.ts          # NEW — entidade da conversa individual
├── repositories/
│   └── conversa-individual.repository.ts     # NEW — ConversaIndividualDAO
└── services/
    └── conversa-individual.service.ts        # NEW — lógica de criar/buscar conversa 1:1
```

### 3.2 Arquivos modificados

```
backend/
├── database/
│   └── sql.txt                               # ADD: tabela mensagem_fixada
├── repositories/
│   ├── conversa.repository.ts                # ADD: isParticipante(), atualizar findAllByUsuarioCPF
│   └── mensagem.repository.ts                # ADD: pin, unpin, findPinned
├── services/
│   ├── conversa.service.ts                   # UPDATE: buscarConversa + DTOs + individual
│   └── mensagem.service.ts                   # ADD: fixarMensagem, desafixarMensagem, listarFixadas
├── controllers/
│   └── conversa.controller.ts                # ADD: storeIndividual, pinMensagem, unpinMensagem, listarFixadas
├── middlewares/
│   └── conversa.middleware.ts                # ADD: validarIniciarIndividual, validarMsgGUID
└── websocket/
    ├── conversa.handler.ts                   # UPDATE: join_conversa + ADD: pin/unpin events
    └── SocketServer.ts                       # UPDATE: injetar ConversaIndividualDAO + MensagemService no handler
routes/
└── conversa.routes.ts                        # ADD: POST /individual, POST/DELETE /:guid/mensagem/:msgGuid/fixar, GET /:guid/fixadas
```

---

## 4. Entidades

### 4.1 `backend/entities/conversa-individual.model.ts`

```typescript
export default class ConversaIndividual {
  #ConversaGUID!: string;
  #ConversaIndUsr1CPF!: string;  // menor CPF (canônico)
  #ConversaIndUsr2CPF!: string;  // maior CPF (canônico)

  get ConversaGUID()       { return this.#ConversaGUID; }
  get ConversaIndUsr1CPF() { return this.#ConversaIndUsr1CPF; }
  get ConversaIndUsr2CPF() { return this.#ConversaIndUsr2CPF; }

  // setter validado para GUID
  set ConversaGUID(v: string) {
    if (!v || v.length !== 36) throw new Error('ConversaGUID inválido');
    this.#ConversaGUID = v;
  }

  toJSON() {
    return {
      ConversaGUID: this.#ConversaGUID,
      ConversaIndUsr1CPF: this.#ConversaIndUsr1CPF,
      ConversaIndUsr2CPF: this.#ConversaIndUsr2CPF,
    };
  }

  static fromDatabase(row: {
    ConversaGUID: string;
    ConversaIndUsr1CPF: string;
    ConversaIndUsr2CPF: string;
  }): ConversaIndividual {
    const obj = new ConversaIndividual();
    obj.#ConversaGUID       = row.ConversaGUID;
    obj.#ConversaIndUsr1CPF = row.ConversaIndUsr1CPF;
    obj.#ConversaIndUsr2CPF = row.ConversaIndUsr2CPF;
    return obj;
  }
}
```

---

## 5. DAOs

### 5.1 `backend/repositories/conversa-individual.repository.ts` (novo)

```typescript
export class ConversaIndividualDAO {
  // Cria registro na tabela conversa_individual
  // cpf1 e cpf2 já devem estar normalizados (menor → Usr1, maior → Usr2)
  async create(conversaGUID: string, cpf1: string, cpf2: string): Promise<void>

  // Busca conversa pelo par canônico de CPFs
  // O service normaliza o par antes de chamar este método
  async findByPair(cpf1Canonico: string, cpf2Canonico: string): Promise<ConversaIndividual | null>

  // Verifica se um CPF é participante de uma conversa individual
  async isMembro(conversaGUID: string, usuarioCPF: string): Promise<boolean>

  // Retorna o CPF do OUTRO participante
  async getParceiroGUID(conversaGUID: string, meuCPF: string): Promise<string | null>
}
```

**Query `isMembro`:**
```sql
SELECT 1 FROM conversa_individual
WHERE ConversaGUID = ?
  AND (ConversaIndUsr1CPF = ? OR ConversaIndUsr2CPF = ?)
LIMIT 1
```

**Query `getParceiroGUID`:**
```sql
SELECT
  CASE WHEN ConversaIndUsr1CPF = ? THEN ConversaIndUsr2CPF
       ELSE ConversaIndUsr1CPF
  END AS ParceiroCPF
FROM conversa_individual
WHERE ConversaGUID = ?
LIMIT 1
```

### 5.2 Alterações em `backend/repositories/conversa.repository.ts`

**Adicionar método `isParticipante` — verificação unificada por tipo:**

```typescript
async isParticipante(conversaGUID: string, usuarioCPF: string): Promise<boolean>
```

```sql
SELECT 1 FROM conversa c
WHERE c.ConversaGUID = ?
  AND c.ConversaStatus = 'Ativa'
  AND (
    (c.ConversaTipo = 'Grupo' AND EXISTS (
      SELECT 1 FROM conversa_grupo_membro cgm
      WHERE cgm.ConversaGUID = c.ConversaGUID
        AND cgm.MembroUsuarioCPF = ?
        AND cgm.MembroStatus = 'Ativo'
    ))
    OR
    (c.ConversaTipo = 'Individual' AND EXISTS (
      SELECT 1 FROM conversa_individual ci
      WHERE ci.ConversaGUID = c.ConversaGUID
        AND (ci.ConversaIndUsr1CPF = ? OR ci.ConversaIndUsr2CPF = ?)
    ))
  )
LIMIT 1
```
Params: `[conversaGUID, usuarioCPF, usuarioCPF, usuarioCPF]`

**Atualizar `findAllByUsuarioCPF` com UNION:**

```sql
-- Conversas de grupo (ativo membro)
SELECT c.* FROM conversa c
INNER JOIN conversa_grupo_membro cgm ON cgm.ConversaGUID = c.ConversaGUID
WHERE cgm.MembroUsuarioCPF = ?
  AND cgm.MembroStatus = 'Ativo'
  AND c.ConversaStatus = 'Ativa'
UNION
-- Conversas individuais
SELECT c.* FROM conversa c
INNER JOIN conversa_individual ci ON ci.ConversaGUID = c.ConversaGUID
WHERE (ci.ConversaIndUsr1CPF = ? OR ci.ConversaIndUsr2CPF = ?)
  AND c.ConversaStatus = 'Ativa'
ORDER BY ConversaUpdatedAt DESC
```
Params: `[usuarioCPF, usuarioCPF, usuarioCPF]`

### 5.3 Alterações em `backend/repositories/mensagem.repository.ts`

**Adicionar 3 métodos:**

```typescript
// Fixa uma mensagem (INSERT IGNORE — idempotente)
async pinMessage(mensagemGUID: string, conversaGUID: string, fixadaPorCPF: string): Promise<{ FixadaAt: Date }>

// Remove pin de uma mensagem
async unpinMessage(mensagemGUID: string): Promise<void>

// Lista mensagens fixadas de uma conversa (com conteúdo da mensagem)
async findPinnedMessages(conversaGUID: string): Promise<MensagemFixadaRow[]>
```

**Query `findPinnedMessages`:**
```sql
SELECT
  mf.MensagemGUID,
  mf.ConversaGUID,
  mf.FixadaPorCPF,
  mf.FixadaAt,
  m.MensagemConteudo,
  m.MensagemRemetenteCPF,
  m.MensagemCreatedAt
FROM mensagem_fixada mf
INNER JOIN mensagem m ON m.MensagemGUID = mf.MensagemGUID
WHERE mf.ConversaGUID = ?
  AND m.MensagemDeletedAt IS NULL
ORDER BY mf.FixadaAt DESC
```

---

## 6. Services

### 6.1 `backend/services/conversa-individual.service.ts` (novo)

```typescript
export default class ConversaIndividualService {
  #conversaDAO: ConversaDAO;
  #conversaIndividualDAO: ConversaIndividualDAO;

  // Inicia ou recupera uma conversa 1:1 (idempotente)
  async iniciarConversa(
    remetenteCPF: string,
    destinatarioCPF: string
  ): Promise<{ ConversaGUID: string; isNova: boolean }>
}
```

**Lógica de `iniciarConversa`:**
1. Normaliza o par: `[cpfMin, cpfMax] = [min(a,b), max(a,b)]` (comparação lexicográfica)
2. `conversaIndividualDAO.findByPair(cpfMin, cpfMax)`
3. Se encontrado → retorna `{ ConversaGUID, isNova: false }`
4. Se não → `conversaDAO.create(uuid(), 'Individual')` + `conversaIndividualDAO.create(guid, cpfMin, cpfMax)` → retorna `{ ConversaGUID, isNova: true }`

**Não há hook de evento no WebSocket** — o frontend já recebe o `ConversaGUID` via REST e conecta via WebSocket normalmente.

### 6.2 Alterações em `backend/services/conversa.service.ts`

**Atualizar DTOs:**

```typescript
// ConversaListItemDTO — adicionar campos para individual
export interface ConversaListItemDTO {
  ConversaGUID: string;
  ConversaTipo: 'Individual' | 'Grupo';
  // Grupo
  ConversaGrupoNome: string | null;
  ConversaGrupoTipo: 'Turma' | 'Tarefa' | null;
  // Individual
  ParceiroCPF: string | null;
  ParceiroNome: string | null;
  TagContextual: string | null;  // sempre null por ora; futuro frontend calcula
  // Comum
  UltimaMensagem: { ... } | null;
  NaoLidas: number;
}

// ConversaDetalheDTO — adicionar campos individual + fixadas
export interface ConversaDetalheDTO {
  ConversaGUID: string;
  ConversaTipo: 'Individual' | 'Grupo';
  // Grupo
  ConversaGrupoNome: string | null;
  ConversaGrupoTipo: 'Turma' | 'Tarefa' | null;
  Membros: MembroDTO[];           // vazio para individual
  // Individual
  ParceiroCPF: string | null;
  ParceiroNome: string | null;
  TagContextual: string | null;
  // Comum
  MensagensFixadas: MensagemFixadaDTO[];
  Mensagens: any[];
  HasMore: boolean;
}

export interface MensagemFixadaDTO {
  MensagemGUID: string;
  ConversaGUID: string;
  MensagemConteudo: string;
  MensagemRemetenteCPF: string;
  MensagemCreatedAt: string;
  FixadaPorCPF: string;
  FixadaAt: string;
}
```

**Atualizar `buscarConversa`:**
- Substituir `conversaGrupoDAO.isMembro()` por `conversaDAO.isParticipante()` (unificado)
- Se tipo `Individual`: buscar `ConversaIndividualDAO.getParceiroGUID()` + nome do parceiro
- Se tipo `Grupo`: lógica existente (buscar grupo + membros)
- Sempre incluir `MensagensFixadas` na resposta do `show`

**Atualizar `listarConversas`:**
- Para conversas individuais: buscar `ParceiroCPF` + `ParceiroNome` via `ConversaIndividualDAO.getParceiroGUID()` + JOIN com `usuario`
- `TagContextual: null` (a ser calculado futuramente)
- `ConversaIndividualDAO` deve ser injetado no construtor de `ConversaService`

**Construtor atualizado:**
```typescript
constructor(
  conversaDAO: ConversaDAO,
  conversaGrupoDAO: ConversaGrupoDAO,
  conversaIndividualDAO: ConversaIndividualDAO,
  mensagemDAO: MensagemDAO
)
```

### 6.3 Alterações em `backend/services/mensagem.service.ts`

**Adicionar 3 métodos:**

```typescript
// Fixa mensagem — valida participação + valida que mensagem pertence à conversa
async fixarMensagem(
  mensagemGUID: string,
  conversaGUID: string,
  usuarioCPF: string
): Promise<MensagemFixadaDTO>

// Desafixa — mesmas validações
async desafixarMensagem(
  mensagemGUID: string,
  conversaGUID: string,
  usuarioCPF: string
): Promise<void>

// Lista fixadas — valida participação
async listarMensagensFixadas(
  conversaGUID: string,
  usuarioCPF: string
): Promise<MensagemFixadaDTO[]>
```

**Lógica de `fixarMensagem`:**
1. `conversaDAO.isParticipante(conversaGUID, usuarioCPF)` → 403 se não participante
2. Verificar que a mensagem existe e pertence à conversa: `SELECT 1 FROM mensagem WHERE MensagemGUID = ? AND ConversaGUID = ? AND MensagemDeletedAt IS NULL`
3. `mensagemDAO.pinMessage(mensagemGUID, conversaGUID, usuarioCPF)` — INSERT IGNORE (idempotente)
4. Emitir via `SocketServer.emit(conversaGUID, 'mensagem_fixada', dto)` (lazy import)
5. Retornar DTO

**Lógica de `desafixarMensagem`:**
1. `conversaDAO.isParticipante(conversaGUID, usuarioCPF)` → 403
2. `mensagemDAO.unpinMessage(mensagemGUID)`
3. Emitir `SocketServer.emit(conversaGUID, 'mensagem_desafixada', { ConversaGUID, MensagemGUID, DesafixadaPorCPF })`

**Nota sobre permissões de grupo no futuro:**
Quando roles de grupo forem implementados (Fase N), adicionar verificação: se `ConversaTipo === 'Grupo'`, checar se o usuário tem permissão de fixar. O campo `MembroFuncao` já está preparado na tabela `conversa_grupo_membro`.

**Construtor atualizado** (adicionar `conversaDAO`):
```typescript
constructor(
  mensagemDAO: MensagemDAO,
  conversaGrupoDAO: ConversaGrupoDAO,
  conversaDAO: ConversaDAO
)
```
*(já existe — confirmar injeção de `conversaDAO` para chamar `isParticipante`)*

---

## 7. Controller

### 7.1 Alterações em `backend/controllers/conversa.controller.ts`

**Adicionar 4 handlers:**

```typescript
// POST /api/conversa/individual
storeIndividual = async (req, res, next): Promise<void>
// Body: { DestinatarioCPF }
// Response: { ConversaGUID, isNova }

// POST /api/conversa/:guid/mensagem/:msgGuid/fixar
pinMensagem = async (req, res, next): Promise<void>
// Response: 201 + MensagemFixadaDTO

// DELETE /api/conversa/:guid/mensagem/:msgGuid/fixar
unpinMensagem = async (req, res, next): Promise<void>
// Response: 204

// GET /api/conversa/:guid/fixadas
listarFixadas = async (req, res, next): Promise<void>
// Response: 200 + MensagemFixadaDTO[]
```

**Construtor atualizado** (adicionar `conversaIndividualService`):
```typescript
constructor(
  conversaService: ConversaService,
  mensagemService: MensagemService,
  conversaIndividualService: ConversaIndividualService
)
```

---

## 8. Middleware

### 8.1 Alterações em `backend/middlewares/conversa.middleware.ts`

**Adicionar 2 validadores:**

```typescript
// Valida body de POST /api/conversa/individual
static validarIniciarIndividual = (req, res, next): void
// Regras:
//   DestinatarioCPF: string, obrigatório
//   DestinatarioCPF !== req.user.UsuarioCPF (não pode conversar consigo mesmo)

// Valida :msgGuid param (usado em /mensagem/:msgGuid/fixar)
static validarMsgGUID = (req, res, next): void
// Regras: msgGuid.length === 36
```

---

## 9. REST API

### Rotas existentes (sem alteração de comportamento, mas com DTOs atualizados)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/conversa` | Lista conversas do usuário (agora inclui individuais) |
| `GET` | `/api/conversa/:guid` | Detalhe + mensagens (agora funciona para individual também; inclui `MensagensFixadas`) |
| `GET` | `/api/conversa/:guid/mensagem` | Histórico paginado por cursor |

### Rotas novas

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/conversa/individual` | Inicia ou recupera conversa 1:1 (idempotente) |
| `GET` | `/api/conversa/:guid/fixadas` | Lista mensagens fixadas da conversa |
| `POST` | `/api/conversa/:guid/mensagem/:msgGuid/fixar` | Fixa uma mensagem |
| `DELETE` | `/api/conversa/:guid/mensagem/:msgGuid/fixar` | Desafixa uma mensagem |

**IMPORTANTE:** `POST /api/conversa/individual` deve ser registrado ANTES de `GET /api/conversa/:guid` no router para evitar conflito de rota (Express interpretaria "individual" como um `:guid`).

#### `POST /api/conversa/individual`
```json
// Body
{ "DestinatarioCPF": "123.456.789-00" }

// Response 200 (já existe) ou 201 (nova)
{
  "success": true,
  "message": "Conversa individual pronta",
  "data": {
    "ConversaGUID": "uuid-da-conversa",
    "isNova": true
  }
}
```

#### `POST /api/conversa/:guid/mensagem/:msgGuid/fixar`
```json
// Response 201
{
  "success": true,
  "message": "Mensagem fixada",
  "data": {
    "MensagemGUID": "...",
    "ConversaGUID": "...",
    "MensagemConteudo": "...",
    "MensagemRemetenteCPF": "...",
    "MensagemCreatedAt": "ISO",
    "FixadaPorCPF": "...",
    "FixadaAt": "ISO"
  }
}
```

---

## 10. WebSocket

### 10.1 Atualização do handler `join_conversa`

O handler atual usa `conversaGrupoDAO.isMembro()` — só funciona para grupos. Deve ser substituído por `conversaDAO.isParticipante()`:

```typescript
socket.on('join_conversa', async ({ ConversaGUID }) => {
  const isParticipante = await conversaDAO.isParticipante(ConversaGUID, usuario.UsuarioCPF);
  if (!isParticipante) {
    socket.emit('erro', { message: 'Acesso negado a esta conversa' });
    return;
  }
  socket.join(ConversaGUID);
  socket.emit('join_conversa_ok', { ConversaGUID });
});
```

### 10.2 Novos eventos — Mensagens Fixadas

| Direção | Evento | Payload |
|---|---|---|
| Cliente → Servidor | `pin_mensagem` | `{ ConversaGUID, MensagemGUID }` |
| Cliente → Servidor | `unpin_mensagem` | `{ ConversaGUID, MensagemGUID }` |
| Servidor → Cliente | `mensagem_fixada` | `MensagemFixadaDTO` |
| Servidor → Cliente | `mensagem_desafixada` | `{ ConversaGUID, MensagemGUID, DesafixadaPorCPF }` |

**Handler `pin_mensagem`:**
```typescript
socket.on('pin_mensagem', async ({ ConversaGUID, MensagemGUID }) => {
  try {
    const dto = await mensagemService.fixarMensagem(MensagemGUID, ConversaGUID, usuario.UsuarioCPF);
    // mensagemService já emite para a room via SocketServer.emit — não emitir aqui novamente
  } catch (err: any) {
    socket.emit('erro', { message: err.message || 'Erro ao fixar mensagem' });
  }
});
```

**Handler `unpin_mensagem`:**
```typescript
socket.on('unpin_mensagem', async ({ ConversaGUID, MensagemGUID }) => {
  try {
    await mensagemService.desafixarMensagem(MensagemGUID, ConversaGUID, usuario.UsuarioCPF);
    // mensagemService já emite para a room via SocketServer.emit
  } catch (err: any) {
    socket.emit('erro', { message: err.message || 'Erro ao desafixar mensagem' });
  }
});
```

### 10.3 Atualização de `HandlerDeps` em `conversa.handler.ts`

```typescript
interface HandlerDeps {
  conversaDAO: ConversaDAO;              // NOVO (para isParticipante)
  mensagemService: MensagemService;
}
// conversaGrupoDAO removido do HandlerDeps (não é mais necessário aqui)
```

### 10.4 Atualização de `SocketServer.ts`

```typescript
// Adicionar ao bloco de deps:
const conversaIndividualDAO = new ConversaIndividualDAO(db);

// Instanciar MensagemService com nova assinatura
const mensagemService = new MensagemService(mensagemDAO, conversaGrupoDAO, conversaDAO);

// registerConversaHandlers recebe conversaDAO em vez de conversaGrupoDAO
registerConversaHandlers(io, socket, { conversaDAO, mensagemService });
```

---

## 11. Factory (`routes/conversa.routes.ts`)

```typescript
export function conversaRouterFactory(): Router {
  const db = new MysqlDatabase();
  const conversaDAO = new ConversaDAO(db);
  const conversaGrupoDAO = new ConversaGrupoDAO(db);
  const conversaIndividualDAO = new ConversaIndividualDAO(db);
  const mensagemDAO = new MensagemDAO(db);

  const conversaService = new ConversaService(
    conversaDAO, conversaGrupoDAO, conversaIndividualDAO, mensagemDAO
  );
  const mensagemService = new MensagemService(mensagemDAO, conversaGrupoDAO, conversaDAO);
  const conversaIndividualService = new ConversaIndividualService(conversaDAO, conversaIndividualDAO);
  const controller = new ConversaController(conversaService, mensagemService, conversaIndividualService);

  router.use(AuthMiddleware.authenticate);

  // IMPORTANTE: rota literal ANTES de /:guid
  router.post('/individual',
    ConversaMiddleware.validarIniciarIndividual,
    controller.storeIndividual
  );

  router.get('/', controller.index);
  router.get('/:guid', ConversaMiddleware.validarGUID, controller.show);
  router.get('/:guid/mensagem', ConversaMiddleware.validarGUID, controller.listarMensagens);
  router.get('/:guid/fixadas', ConversaMiddleware.validarGUID, controller.listarFixadas);
  router.post('/:guid/mensagem/:msgGuid/fixar',
    ConversaMiddleware.validarGUID,
    ConversaMiddleware.validarMsgGUID,
    controller.pinMensagem
  );
  router.delete('/:guid/mensagem/:msgGuid/fixar',
    ConversaMiddleware.validarGUID,
    ConversaMiddleware.validarMsgGUID,
    controller.unpinMensagem
  );

  return router;
}
```

---

## 12. Decisões de Design

### 12.1 Normalização canônica do par CPF

A UNIQUE KEY em `conversa_individual` está em `(Usr1CPF, Usr2CPF)`. Para garantir unicidade independente de quem inicia a conversa, o service normaliza o par antes de persistir:

```typescript
const [cpfMin, cpfMax] = [remetenteCPF, destinatarioCPF].sort();
// cpfMin → ConversaIndUsr1CPF
// cpfMax → ConversaIndUsr2CPF
```

Isso garante que a UNIQUE KEY seja suficiente sem precisar de dupla verificação no banco.

### 12.2 `isParticipante` unificado no `ConversaDAO`

Em vez de ter dois DAOs sendo chamados sequencialmente (um para grupo, um para individual), um único método `isParticipante` no `ConversaDAO` cobre ambos os tipos com uma query SQL eficiente usando `EXISTS`.

Isso simplifica todos os pontos de validação de acesso: `ConversaService`, `MensagemService`, e o handler WebSocket todos chamam `conversaDAO.isParticipante()`.

### 12.3 Tag Contextual — campo preparado, lógica diferida

O campo `TagContextual: string | null` é retornado nos DTOs, sempre `null` na implementação atual. Futuramente, será calculado via JOINs com `escolaxusuarioxfuncao` e `matricula` para determinar a relação entre os participantes (ex: "Professor", "Aluno", "Colega"). A camada de apresentação do frontend consumirá este campo diretamente.

### 12.4 Permissões de fixar em grupo — futuro

Na Fase 2, qualquer membro do grupo pode fixar/desafixar mensagens. Quando o sistema de permissões de grupo for implementado, a verificação em `MensagemService.fixarMensagem()` será estendida para checar `MembroFuncao` antes de permitir a ação. O campo já existe na tabela `conversa_grupo_membro`.

### 12.5 `pin_mensagem` via WebSocket vs. REST

Ambos os canais (REST e WebSocket) fixam mensagens. O service emite o evento WebSocket independentemente de qual canal acionou a ação. Isso garante que todos na sala recebam a atualização em tempo real mesmo quando a ação ocorre via REST.

---

## 13. Sequência de Implementação

1. **SQL** — adicionar tabela `mensagem_fixada` em `sql.txt` e executar no banco
2. **Entidade** — `conversa-individual.model.ts`
3. **DAO** — `conversa-individual.repository.ts` + métodos em `conversa.repository.ts` + métodos em `mensagem.repository.ts`
4. **Service** — `conversa-individual.service.ts` + atualizar `conversa.service.ts` + `mensagem.service.ts`
5. **Controller + Middleware** — novos handlers e validadores em arquivos existentes
6. **WebSocket** — atualizar `conversa.handler.ts` + `SocketServer.ts`
7. **Router** — atualizar `conversa.routes.ts`
8. **Compilar** — `tsc --noEmit` deve passar com zero erros
