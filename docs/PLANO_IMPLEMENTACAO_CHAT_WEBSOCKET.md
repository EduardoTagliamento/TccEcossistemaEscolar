# PLANO DE IMPLEMENTAÇÃO — Chat com WebSocket

**Data de criação:** 2026-07-08  
**Status:** 🟡 Spec — aguardando aprovação  
**Complexidade:** Alta  
**Módulo:** `chat`

---

## 1. VISÃO GERAL

Sistema de mensagens em tempo real usando Socket.io, com dois tipos de conversa:

| Tipo        | Escopo desta spec | Observação                         |
|-------------|-------------------|------------------------------------|
| **Grupo**   | ✅ Implementar     | Turma e Tarefa Compartilhada       |
| **Individual** | ⬜ Terreno pronto | Tabela criada, sem rotas/handlers  |

Grupos são **criados e gerenciados exclusivamente pelo sistema** — não há criação manual pelo usuário.

---

## 2. ESCOPO

### Incluso
- Tabelas SQL para conversas (individual + grupo), membros e mensagens
- Socket.io integrado ao servidor Express existente
- Grupos do tipo `Turma`: criados com a turma, membros sincronizados, encerrados com a turma
- Grupos do tipo `Tarefa`: criados com tarefas compartilhadas, encerrados no prazo via cron
- Hooks nos serviços existentes (TurmaService, MatriculaService, TarefaAcademicaService)
- REST API para listagem de conversas e histórico de mensagens (paginado)
- WebSocket para envio/recebimento em tempo real, indicador de digitação, leitura

### Excluído desta fase
- Criação de grupos manuais pelo usuário
- Upload de arquivos/imagens no chat
- Notificações push (mobile)
- Funções de membro (Lider/Representante) — campos criados, sem lógica de negócio ainda
- Frontend (será planejado em fase separada após aprovação do backend)

---

## 3. SCHEMA SQL

```sql
-- =====================================================
-- TABELA: conversa
-- Base polimórfica de uma conversa (individual ou grupo)
-- =====================================================
CREATE TABLE `tccecossistemaescolar`.`conversa` (
  `ConversaGUID`     CHAR(36)                      NOT NULL,
  `ConversaTipo`     ENUM('Individual', 'Grupo')   NOT NULL,
  `ConversaStatus`   ENUM('Ativa', 'Inativa')      NOT NULL DEFAULT 'Ativa',
  `ConversaCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ConversaUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ConversaGUID`),
  INDEX `idx_conversa_tipo`   (`ConversaTipo`),
  INDEX `idx_conversa_status` (`ConversaStatus`)
);

-- =====================================================
-- TABELA: conversa_grupo
-- Dados específicos de conversas em grupo
-- ConversaGrupoRefGUID aponta para TurmaGUID ou TarefaGUID
-- =====================================================
CREATE TABLE `tccecossistemaescolar`.`conversa_grupo` (
  `ConversaGUID`        CHAR(36)                  NOT NULL,
  `ConversaGrupoNome`   VARCHAR(100)              NOT NULL,
  `ConversaGrupoTipo`   ENUM('Turma', 'Tarefa')   NOT NULL,
  `ConversaGrupoRefGUID` CHAR(36)                 NOT NULL,
  PRIMARY KEY (`ConversaGUID`),
  INDEX `idx_cg_ref` (`ConversaGrupoRefGUID`),
  CONSTRAINT `FK_ConversaGrupo_Conversa`
    FOREIGN KEY (`ConversaGUID`) REFERENCES `conversa` (`ConversaGUID`)
    ON DELETE CASCADE
);

-- =====================================================
-- TABELA: conversa_individual
-- Terreno para conversas 1:1 (não usado nesta fase)
-- Garante unicidade do par de usuários
-- =====================================================
CREATE TABLE `tccecossistemaescolar`.`conversa_individual` (
  `ConversaGUID`          CHAR(36)     NOT NULL,
  `ConversaIndUsr1CPF`    VARCHAR(14)  NOT NULL,
  `ConversaIndUsr2CPF`    VARCHAR(14)  NOT NULL,
  PRIMARY KEY (`ConversaGUID`),
  UNIQUE KEY `UK_ConversaInd_Usuarios` (`ConversaIndUsr1CPF`, `ConversaIndUsr2CPF`),
  CONSTRAINT `FK_ConversaInd_Conversa`
    FOREIGN KEY (`ConversaGUID`) REFERENCES `conversa` (`ConversaGUID`)
    ON DELETE CASCADE,
  CONSTRAINT `FK_ConversaInd_Usr1`
    FOREIGN KEY (`ConversaIndUsr1CPF`) REFERENCES `usuario` (`UsuarioCPF`),
  CONSTRAINT `FK_ConversaInd_Usr2`
    FOREIGN KEY (`ConversaIndUsr2CPF`) REFERENCES `usuario` (`UsuarioCPF`)
);

-- =====================================================
-- TABELA: conversa_grupo_membro
-- Membros de um grupo — soft remove via MembroStatus
-- MembroFuncao preparado para Lider (sem lógica ainda)
-- =====================================================
CREATE TABLE `tccecossistemaescolar`.`conversa_grupo_membro` (
  `ConversaGUID`    CHAR(36)                      NOT NULL,
  `MembroUsuarioCPF` VARCHAR(14)                  NOT NULL,
  `MembroFuncao`    ENUM('Membro', 'Lider')        NOT NULL DEFAULT 'Membro',
  `MembroStatus`    ENUM('Ativo', 'Inativo')       NOT NULL DEFAULT 'Ativo',
  `MembroEntradaAt` TIMESTAMP                     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `MembroSaidaAt`   TIMESTAMP                     NULL,
  PRIMARY KEY (`ConversaGUID`, `MembroUsuarioCPF`),
  INDEX `idx_cgm_usuario` (`MembroUsuarioCPF`),
  INDEX `idx_cgm_status`  (`MembroStatus`),
  CONSTRAINT `FK_ConversaGrupoMembro_Conversa`
    FOREIGN KEY (`ConversaGUID`) REFERENCES `conversa` (`ConversaGUID`)
    ON DELETE CASCADE,
  CONSTRAINT `FK_ConversaGrupoMembro_Usuario`
    FOREIGN KEY (`MembroUsuarioCPF`) REFERENCES `usuario` (`UsuarioCPF`)
);

-- =====================================================
-- TABELA: mensagem
-- Mensagens de qualquer tipo de conversa
-- Soft delete via MensagemDeletedAt
-- =====================================================
CREATE TABLE `tccecossistemaescolar`.`mensagem` (
  `MensagemGUID`       CHAR(36)                               NOT NULL,
  `ConversaGUID`       CHAR(36)                               NOT NULL,
  `MensagemRemetenteCPF` VARCHAR(14)                          NOT NULL,
  `MensagemConteudo`   TEXT                                   NOT NULL,
  `MensagemTipo`       ENUM('Texto', 'Arquivo', 'Imagem')     NOT NULL DEFAULT 'Texto',
  `MensagemCreatedAt`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `MensagemDeletedAt`  TIMESTAMP NULL,
  PRIMARY KEY (`MensagemGUID`),
  INDEX `idx_mensagem_conversa`  (`ConversaGUID`),
  INDEX `idx_mensagem_remetente` (`MensagemRemetenteCPF`),
  INDEX `idx_mensagem_created`   (`MensagemCreatedAt`),
  CONSTRAINT `FK_Mensagem_Conversa`
    FOREIGN KEY (`ConversaGUID`) REFERENCES `conversa` (`ConversaGUID`),
  CONSTRAINT `FK_Mensagem_Remetente`
    FOREIGN KEY (`MensagemRemetenteCPF`) REFERENCES `usuario` (`UsuarioCPF`)
);

-- =====================================================
-- TABELA: mensagem_leitura
-- Rastreia leitura por usuário (grupos têm múltiplos leitores)
-- =====================================================
CREATE TABLE `tccecossistemaescolar`.`mensagem_leitura` (
  `MensagemGUID`   CHAR(36)    NOT NULL,
  `UsuarioCPF`     VARCHAR(14) NOT NULL,
  `MensagemLidaAt` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MensagemGUID`, `UsuarioCPF`),
  CONSTRAINT `FK_MensagemLeitura_Mensagem`
    FOREIGN KEY (`MensagemGUID`) REFERENCES `mensagem` (`MensagemGUID`)
    ON DELETE CASCADE,
  CONSTRAINT `FK_MensagemLeitura_Usuario`
    FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario` (`UsuarioCPF`)
);
```

---

## 4. ESTRUTURA DE ARQUIVOS

```
backend/
├── entities/
│   ├── conversa.model.ts              # Base polimórfica
│   ├── conversa-grupo.model.ts        # Dados do grupo
│   ├── conversa-grupo-membro.model.ts # Membros
│   └── mensagem.model.ts              # Mensagens
│
├── repositories/
│   ├── conversa.repository.ts         # CRUD base + listagem por usuário
│   ├── conversa-grupo.repository.ts   # CRUD grupo + gerência de membros
│   └── mensagem.repository.ts         # CRUD + paginação + leitura
│
├── services/
│   ├── conversa.service.ts            # Orquestra conversas (lista, detalhes)
│   ├── conversa-grupo.service.ts      # Criação/encerramento de grupos + membros
│   └── mensagem.service.ts            # Envio, leitura, histórico
│
├── controllers/
│   ├── conversa.controller.ts         # GET /api/conversa, GET /api/conversa/:guid
│   └── mensagem.controller.ts         # GET /api/conversa/:guid/mensagem
│
├── middlewares/
│   └── conversa.middleware.ts         # Validação de acesso à conversa
│
├── websocket/
│   ├── SocketServer.ts                # Inicializa socket.io, expõe instância
│   ├── ws.auth.middleware.ts          # Autentica JWT no handshake
│   └── conversa.handler.ts            # Registra todos os eventos WS
│
├── services/                          # (pasta existente)
│   └── cleanup.scheduler.ts           # + cron para encerrar grupos de tarefa expirada
│
routes/
├── conversa.routes.ts
└── mensagem.routes.ts
```

---

## 5. ENTIDADES (DOMAIN MODELS)

### 5.1 Conversa
```
#ConversaGUID    string
#ConversaTipo    'Individual' | 'Grupo'
#ConversaStatus  'Ativa' | 'Inativa'
#ConversaCreatedAt  Date
#ConversaUpdatedAt  Date
```

### 5.2 ConversaGrupo
```
#ConversaGUID          string  (FK → conversa)
#ConversaGrupoNome     string  (1-100 chars)
#ConversaGrupoTipo     'Turma' | 'Tarefa'
#ConversaGrupoRefGUID  string  (TurmaGUID ou TarefaGUID)
```

### 5.3 ConversaGrupoMembro
```
#ConversaGUID      string
#MembroUsuarioCPF  string
#MembroFuncao      'Membro' | 'Lider'
#MembroStatus      'Ativo' | 'Inativo'
#MembroEntradaAt   Date
#MembroSaidaAt     Date | null
```

### 5.4 Mensagem
```
#MensagemGUID         string
#ConversaGUID         string
#MensagemRemetenteCPF string
#MensagemConteudo     string  (1-4000 chars)
#MensagemTipo         'Texto' | 'Arquivo' | 'Imagem'
#MensagemCreatedAt    Date
#MensagemDeletedAt    Date | null
```

---

## 6. DAOs — MÉTODOS PRINCIPAIS

### ConversaDAO
```
findAllByUsuarioCPF(cpf)         → Conversa[] (todas ativas do usuário)
findByGUID(guid)                 → Conversa | null
create(guid, tipo)               → void
setStatus(guid, status)          → void
```

### ConversaGrupoDAO
```
create(guid, nome, tipo, refGUID)  → void
findByRefGUID(refGUID)             → ConversaGrupo | null
updateNome(guid, nome)             → void
addMembro(guid, cpf)               → void
removeMembro(guid, cpf)            → void  (soft: MembroStatus=Inativo, MembroSaidaAt=NOW)
findMembros(guid)                  → ConversaGrupoMembro[]
isMembro(guid, cpf)                → boolean
```

### MensagemDAO
```
create(guid, conversaGUID, remetenteCPF, conteudo, tipo)   → void
findByConversa(conversaGUID, limit, before?)               → Mensagem[]  (cursor-based)
markAsRead(mensagemGUID, usuarioCPF)                       → void
markAllAsRead(conversaGUID, usuarioCPF)                    → void
countNaoLidas(conversaGUID, usuarioCPF)                    → number
```

---

## 7. SERVICES — LÓGICA DE NEGÓCIO

### ConversaGrupoService

| Método | Gatilho | Responsabilidade |
|--------|---------|-----------------|
| `criarGrupoTurma(turma)` | `TurmaService.store()` (após inserção) | Cria `conversa` + `conversa_grupo` + popula membros via matrícula ativa |
| `encerrarGrupoTurma(turmaGUID)` | `TurmaService.update()` ao setar `TurmaStatus = Inativa/Encerrada` | Define `ConversaStatus = Inativa` |
| `sincronizarNomeGrupoTurma(turmaGUID, novoNome)` | `TurmaService.update()` ao alterar `TurmaNome` | Atualiza `ConversaGrupoNome` |
| `adicionarMembroTurma(turmaGUID, usuarioCPF)` | `MatriculaService.store()` | Adiciona membro ao grupo da turma |
| `removerMembroTurma(turmaGUID, usuarioCPF)` | `MatriculaService.update()` (status → Transferida/Cancelada) | Soft remove do grupo |
| `criarGrupoTarefa(tarefa)` | `TarefaAcademicaService.store()` se `TarefaCompartilhada = true` | Cria `conversa` + `conversa_grupo` + popula membros das matrículas da tarefa |
| `encerrarGruposTarefasExpiradas()` | `CleanupScheduler` (cron diário 00:05) | Desativa grupos cujo `TarefaPrazoData < NOW()` |

### MensagemService
- `enviar(conversaGUID, remetenteCPF, conteudo)`: valida acesso, persiste, retorna DTO
- `listarHistorico(conversaGUID, usuarioCPF, limit, before?)`: valida acesso, busca paginada
- `marcarComoLida(conversaGUID, usuarioCPF)`: insere em `mensagem_leitura`

---

## 8. PONTOS DE INTEGRAÇÃO (HOOKS NOS SERVIÇOS EXISTENTES)

### 8.1 TurmaService (turma.service.ts)

```
store(data)  →  [existente] cria turma
               + criarGrupoTurma(turma)          ← NOVO

update(guid, data)
  se TurmaNome mudou:
    + sincronizarNomeGrupoTurma(guid, novoNome)  ← NOVO
  se TurmaStatus → Inativa | Encerrada:
    + encerrarGrupoTurma(guid)                   ← NOVO
```

### 8.2 MatriculaService (matricula.service.ts)

```
store(data)  →  [existente] cria matrícula
               + adicionarMembroTurma(turmaGUID, usuarioCPF)   ← NOVO

update(guid, data)
  se MatriculaStatus → Transferida | Cancelada | Concluida:
    + removerMembroTurma(turmaGUID, usuarioCPF)                ← NOVO
```

### 8.3 TarefaAcademicaService (tarefaacademica.service.ts)

```
store(data)
  se TarefaCompartilhada = true:
    + criarGrupoTarefa(tarefa)                   ← NOVO
```

### 8.4 CleanupScheduler (cleanup.scheduler.ts)

```
+ cron('0 5 0 * * *')  →  encerrarGruposTarefasExpiradas()    ← NOVO
```

---

## 9. REST API

### Autenticação
Todos os endpoints exigem `Authorization: Bearer {token}` (middleware `authMiddleware` existente).

### Endpoints

#### `GET /api/conversa`
Lista todas as conversas ativas do usuário autenticado.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "ConversaGUID": "...",
      "ConversaTipo": "Grupo",
      "ConversaGrupoNome": "1A — Turma de Manhã",
      "ConversaGrupoTipo": "Turma",
      "UltimaMensagem": {
        "MensagemConteudo": "Boa tarde pessoal",
        "MensagemRemetenteNome": "Ana",
        "MensagemCreatedAt": "2026-07-08T14:30:00.000Z"
      },
      "NaoLidas": 3
    }
  ]
}
```

#### `GET /api/conversa/:ConversaGUID`
Detalhes da conversa + últimas 30 mensagens.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "ConversaGUID": "...",
    "ConversaTipo": "Grupo",
    "ConversaGrupoNome": "...",
    "Membros": [{ "UsuarioCPF": "...", "UsuarioNome": "...", "MembroFuncao": "Membro" }],
    "Mensagens": []
  }
}
```

**Erro 403** se o usuário não é membro da conversa.

#### `GET /api/conversa/:ConversaGUID/mensagem?limit=30&before=<MensagemGUID>`
Histórico paginado — cursor-based pelo `MensagemGUID` mais antigo recebido.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "Mensagens": [...],
    "HasMore": true
  }
}
```

> **Nota:** O envio de mensagens é feito via WebSocket. Não existe `POST /api/mensagem` — a REST serve apenas para leitura.

---

## 10. WEBSOCKET — ARQUITETURA

### 10.1 Integração com o servidor Express

`SocketServer.ts` cria o servidor HTTP explícito e o `Socket.io Server`:

```
app.ts
  → new Server()
  → server.init()
     → httpServer = http.createServer(expressApp)
     → SocketServer.init(httpServer)     ← NOVO
     → httpServer.listen(port)           ← substitui app.listen()
```

### 10.2 Autenticação no handshake

O cliente envia o JWT no campo `auth`:
```js
socket = io({ auth: { token: "Bearer eyJ..." } })
```

`ws.auth.middleware.ts` valida via `JwtService` e injeta `socket.data.usuario`:
```ts
socket.data.usuario = { UsuarioCPF, UsuarioNome, UsuarioEmail }
```

### 10.3 Salas (Rooms)

Cada `ConversaGUID` é uma room do Socket.io:
- Na conexão o usuário entra automaticamente em todas as suas conversas ativas

### 10.4 Eventos — Client → Server

| Evento          | Payload                                     | Descrição                            |
|-----------------|---------------------------------------------|--------------------------------------|
| `join_conversa` | `{ ConversaGUID }`                          | Entra na sala (valida acesso)        |
| `send_mensagem` | `{ ConversaGUID, MensagemConteudo }`        | Envia mensagem (persiste + broadcast)|
| `mark_as_read`  | `{ ConversaGUID }`                          | Marca todas como lidas               |
| `typing`        | `{ ConversaGUID, isTyping: boolean }`       | Indicador de digitação               |

### 10.5 Eventos — Server → Client

| Evento             | Payload                                                    | Descrição                        |
|--------------------|------------------------------------------------------------|----------------------------------|
| `nova_mensagem`    | `{ MensagemGUID, ConversaGUID, Remetente, Conteudo, ... }` | Nova mensagem na sala            |
| `mensagem_lida`    | `{ ConversaGUID, UsuarioCPF, LidaAt }`                    | Alguém leu as mensagens          |
| `membro_entrou`    | `{ ConversaGUID, UsuarioCPF, UsuarioNome }`               | Membro adicionado ao grupo       |
| `membro_saiu`      | `{ ConversaGUID, UsuarioCPF }`                            | Membro removido do grupo         |
| `grupo_encerrado`  | `{ ConversaGUID }`                                        | Grupo desativado (turma/tarefa)  |
| `usuario_digitando`| `{ ConversaGUID, UsuarioCPF, UsuarioNome, isTyping }`     | Forward do evento `typing`       |
| `erro`             | `{ message }`                                             | Erro de validação/acesso         |

---

## 11. MIDDLEWARE DE ACESSO

`conversa.middleware.ts` — validação de pertencimento à conversa (usado nos controllers REST):

```
checkMembroConversa(req, res, next)
  → lê ConversaGUID do param
  → verifica via ConversaGrupoDAO.isMembro(conversaGUID, usuarioCPF)
  → 403 se não for membro
  → next() se autorizado
```

---

## 12. LIFECYLE — GRUPOS DE TURMA

```
Turma criada
  └─► criarGrupoTurma()
       ├─ INSERT conversa (Grupo, Ativa)
       ├─ INSERT conversa_grupo (tipo=Turma, ref=TurmaGUID, nome=TurmaNome)
       └─ para cada matrícula Ativa da turma:
            INSERT conversa_grupo_membro (status=Ativo)

Matrícula criada
  └─► adicionarMembroTurma()
       └─ INSERT conversa_grupo_membro (ou UPDATE status=Ativo se já existia)

Matrícula → Transferida | Cancelada | Concluida
  └─► removerMembroTurma()
       └─ UPDATE conversa_grupo_membro SET status=Inativo, MembroSaidaAt=NOW()
       └─ emit 'membro_saiu' para a room via SocketServer

Turma renomeada
  └─► sincronizarNomeGrupoTurma()
       └─ UPDATE conversa_grupo SET ConversaGrupoNome = novoNome

Turma → Inativa | Encerrada
  └─► encerrarGrupoTurma()
       └─ UPDATE conversa SET ConversaStatus = 'Inativa'
       └─ emit 'grupo_encerrado' para a room via SocketServer
```

## 13. LIFECYCLE — GRUPOS DE TAREFA COMPARTILHADA

```
TarefaCompartilhada criada
  └─► criarGrupoTarefa()
       ├─ INSERT conversa (Grupo, Ativa)
       ├─ INSERT conversa_grupo (tipo=Tarefa, ref=TarefaGUID, nome=TarefaTitulo)
       └─ para cada MatriculaGUID atribuída à tarefa (tarefaacademica_matricula):
            INSERT conversa_grupo_membro

Cron diário 00:05
  └─► encerrarGruposTarefasExpiradas()
       └─ SELECT cg.ConversaGUID FROM conversa_grupo cg
            JOIN tarefaacademica ta ON ta.TarefaGUID = cg.ConversaGrupoRefGUID
            JOIN conversa c ON c.ConversaGUID = cg.ConversaGUID
          WHERE cg.ConversaGrupoTipo = 'Tarefa'
            AND ta.TarefaPrazoData < NOW()
            AND c.ConversaStatus = 'Ativa'
       └─ UPDATE conversa SET ConversaStatus = 'Inativa'
       └─ emit 'grupo_encerrado' via SocketServer
```

---

## 14. DEPENDÊNCIAS A ADICIONAR

```bash
npm install socket.io
npm install -D @types/socket.io   # (já incluso no socket.io >= 4)
```

`socket.io` integra-se com o `http.Server` do Node — sem conflito com o Express existente.

---

## 15. SEQUÊNCIA DE IMPLEMENTAÇÃO (10 PASSOS)

1. **SQL** — executar as 5 DDLs no banco e adicionar ao `sql.txt`
2. **Entities** — `conversa.model.ts`, `conversa-grupo.model.ts`, `conversa-grupo-membro.model.ts`, `mensagem.model.ts`
3. **DAOs** — `conversa.repository.ts`, `conversa-grupo.repository.ts`, `mensagem.repository.ts`
4. **Services** — `conversa-grupo.service.ts`, `conversa.service.ts`, `mensagem.service.ts`
5. **Hooks** — modificar `TurmaService`, `MatriculaService`, `TarefaAcademicaService` e `CleanupScheduler`
6. **Controllers** — `conversa.controller.ts`, `mensagem.controller.ts`
7. **Middleware** — `conversa.middleware.ts`
8. **Routers** — `conversa.routes.ts`, `mensagem.routes.ts`
9. **WebSocket** — `SocketServer.ts`, `ws.auth.middleware.ts`, `conversa.handler.ts`
10. **Server.ts + app.ts** — migrar de `app.listen()` para `http.createServer()` + `SocketServer.init()`

---

## 16. DECISÕES DE DESIGN

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Lib WebSocket | `socket.io` | Rooms nativas, reconexão automática, TS suporte |
| Envio de mensagem | Apenas via WS | Consistência; REST só leitura |
| Paginação de histórico | Cursor-based (MensagemGUID) | Sem "page drift" em tempo real |
| Persistência | Banco de dados primeiro, WS segundo | Mensagem nunca se perde se WS cair |
| Grupos manuais | Não permitido | Requisito do sistema |
| Funções de membro | Campo criado, sem lógica | Extensão futura sem ALTER TABLE |
| Individual | Tabela criada, sem handlers | Terreno pronto, sem rotas ainda |
