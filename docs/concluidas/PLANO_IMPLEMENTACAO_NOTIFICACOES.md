# Plano de Implementação — Sistema de Notificações

**Status:** ✅ Implementado (backend completo + frontend mínimo). Ver seção 9 para a lista de arquivos.
**Pré-requisito de leitura:** `docs/plano-tecnico-tarefas-calendario-notificacoes.md` (plano anterior, mais genérico — este documento o substitui e o adapta à arquitetura real do projeto).

---

## 1. Objetivo

Um sistema central de notificações com dois modos:

- **Avisos** — disparados por uma ação (ex.: professor postou tarefa) → sempre em tempo real.
- **Lembretes** — disparados por cron (ex.: tarefa vence amanhã) → job diário.

Toda notificação sempre aparece no sino/feed in-app. Além disso, cada usuário escolhe — por tipo de notificação — se também quer receber por **e-mail** (Resend, já integrado) e/ou **WhatsApp** (Evolution API, ainda não integrada — o gancho fica pronto mas inerte).

---

## 2. Modelo de dados

Segue o padrão do projeto: `entities/*.model.ts` (classe com campos privados) → `repositories/*.repository.ts` (DAO, SQL cru via `mysql2`) → `services` → `controllers` → `routes`, registrados em `backend/Server.ts`. Chaves primárias em GUID (`uuid`), exceto tabelas de alto volume/log, que usam `AUTO_INCREMENT` (mesmo padrão de `verificacao_email`).

### 2.1 `notificacaotipo` — catálogo (dado estático, seed via migration)

```sql
CREATE TABLE `notificacaotipo` (
  `NotificacaoTipoId` INT NOT NULL AUTO_INCREMENT,
  `NotificacaoTipoSlug` VARCHAR(50) NOT NULL UNIQUE,      -- ex: 'tarefa_postada' — usado no código, não o Id
  `NotificacaoTipoDescricao` VARCHAR(150) NOT NULL,       -- label pra tela de configurações
  `NotificacaoTipoCategoria` ENUM('Aviso','Lembrete') NOT NULL,
  `NotificacaoTipoEmailPadrao` BOOLEAN NOT NULL DEFAULT FALSE,
  `NotificacaoTipoWhatsappPadrao` BOOLEAN NOT NULL DEFAULT FALSE,
  `NotificacaoTipoAtivo` BOOLEAN NOT NULL DEFAULT TRUE,   -- kill-switch sem apagar linha
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`NotificacaoTipoId`)
);
```

### 2.2 `notificacaotipofuncao` — quais papéis (`funcao`) veem cada tipo

```sql
CREATE TABLE `notificacaotipofuncao` (
  `NotificacaoTipoId` INT NOT NULL,
  `FuncaoId` INT NOT NULL,
  PRIMARY KEY (`NotificacaoTipoId`, `FuncaoId`),
  CONSTRAINT FK_NTF_Tipo FOREIGN KEY (`NotificacaoTipoId`) REFERENCES `notificacaotipo`(`NotificacaoTipoId`) ON DELETE CASCADE,
  CONSTRAINT FK_NTF_Funcao FOREIGN KEY (`FuncaoId`) REFERENCES `funcao`(`FuncaoId`) ON DELETE CASCADE
);
```

Um mesmo tipo (ex. `pendencia_criada`) pode se aplicar a vários papéis (Aluno, Professor, Coordenação, Secretaria, Direção) sem duplicar linhas de catálogo — evita ter `aluno.pendencia_criada` / `professor.pendencia_criada` / `gestao.pendencia_criada` quase idênticos.

### 2.3 `notificacao` — feed in-app (uma linha por destinatário por evento)

```sql
CREATE TABLE `notificacao` (
  `NotificacaoGUID` CHAR(36) NOT NULL,
  `NotificacaoTipoId` INT NOT NULL,
  `UsuarioCPF` VARCHAR(14) NOT NULL,           -- destinatário
  `EscolaGUID` CHAR(36) NOT NULL,
  `NotificacaoTitulo` VARCHAR(150) NOT NULL,
  `NotificacaoConteudo` VARCHAR(500) NULL,
  `NotificacaoEntidadeTipo` VARCHAR(40) NULL,  -- 'tarefa' | 'prova' | 'conteudo' | 'evento' | 'pendencia' | 'grupotarefa' | 'convitegrupotarefa' | 'conversagrupo' | 'conversaindividual' ...
  `NotificacaoEntidadeGUID` VARCHAR(36) NULL,  -- referência polimórfica, sem FK de banco (mesmo padrão de `relacaoanexos`)
  `NotificacaoLink` VARCHAR(255) NULL,         -- deep link pro frontend, ex: /dashboard/{EscolaGUID}/tarefas/{TarefaGUID}
  `NotificacaoLida` BOOLEAN NOT NULL DEFAULT FALSE,
  `NotificacaoLidaData` TIMESTAMP NULL,
  `NotificacaoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`NotificacaoGUID`),
  INDEX `idx_notif_usuario_lida` (`UsuarioCPF`, `NotificacaoLida`),
  INDEX `idx_notif_escola` (`EscolaGUID`),
  INDEX `idx_notif_created` (`NotificacaoCreatedAt`),
  CONSTRAINT FK_Notif_Tipo FOREIGN KEY (`NotificacaoTipoId`) REFERENCES `notificacaotipo`(`NotificacaoTipoId`),
  CONSTRAINT FK_Notif_Usuario FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario`(`UsuarioCPF`) ON DELETE CASCADE,
  CONSTRAINT FK_Notif_Escola FOREIGN KEY (`EscolaGUID`) REFERENCES `escola`(`EscolaGUID`) ON DELETE CASCADE
);
```

### 2.4 `notificacaoenvio` — auditoria de entrega por canal (email/whatsapp)

```sql
CREATE TABLE `notificacaoenvio` (
  `NotificacaoEnvioId` INT NOT NULL AUTO_INCREMENT,
  `NotificacaoGUID` CHAR(36) NOT NULL,
  `NotificacaoEnvioCanal` ENUM('Email','Whatsapp') NOT NULL,
  `NotificacaoEnvioStatus` ENUM('Pendente','Enviado','Falhou') NOT NULL DEFAULT 'Pendente',
  `NotificacaoEnvioProviderId` VARCHAR(100) NULL,   -- id retornado pelo Resend / futuramente Evolution API
  `NotificacaoEnvioErro` VARCHAR(255) NULL,
  `NotificacaoEnvioTentativas` TINYINT NOT NULL DEFAULT 0,
  `NotificacaoEnvioEnviadoData` TIMESTAMP NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`NotificacaoEnvioId`),
  UNIQUE KEY `UQ_Notif_Canal` (`NotificacaoGUID`, `NotificacaoEnvioCanal`),  -- idempotência: nunca 2 envios do mesmo canal pra mesma notificação
  CONSTRAINT FK_Envio_Notif FOREIGN KEY (`NotificacaoGUID`) REFERENCES `notificacao`(`NotificacaoGUID`) ON DELETE CASCADE
);
```

Só é criada uma linha aqui quando o usuário tem aquele canal habilitado para aquele tipo — não para toda notificação. Isso já cobre o pedido de "log de envio pra auditoria/anti-duplicidade" do plano antigo.

### 2.5 `usuarionotificacaopreferencia` — override do usuário (esparsa, não materializada)

```sql
CREATE TABLE `usuarionotificacaopreferencia` (
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `NotificacaoTipoId` INT NOT NULL,
  `PreferenciaEmailAtivo` BOOLEAN NOT NULL,
  `PreferenciaWhatsappAtivo` BOOLEAN NOT NULL,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`UsuarioCPF`, `NotificacaoTipoId`),
  CONSTRAINT FK_Pref_Usuario FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario`(`UsuarioCPF`) ON DELETE CASCADE,
  CONSTRAINT FK_Pref_Tipo FOREIGN KEY (`NotificacaoTipoId`) REFERENCES `notificacaotipo`(`NotificacaoTipoId`) ON DELETE CASCADE
);
```

**Decisão de design:** só existe linha aqui quando o usuário *muda* o padrão. Se não existe linha, vale o padrão do catálogo (`NotificacaoTipoEmailPadrao`/`WhatsappPadrao`). Isso evita ter que inserir uma linha por usuário por tipo na criação de conta (o que explodiria em escrita a cada novo usuário/tipo) — ver seção 7 (impacto no banco). Preferência é **global por usuário**, não por escola (não existe hoje conceito de "configurações do usuário"; ver seção 6).

### 2.6 Catálogo de tipos (seed da migration)

| Slug | Categoria | Papéis | E-mail padrão | WhatsApp padrão | Gatilho confirmado? |
|---|---|---|---|---|---|
| `materia_postada` | Aviso | Aluno | ✓ | ✓ | ✅ `ConteudoService.criarConteudo()` |
| `prova_postada` | Aviso | Aluno | ✓ | ✓ | ✅ `ProvaAgendadaService.criarProva()` |
| `tarefa_postada` | Aviso | Aluno | ✓ | ✓ | ✅ `TarefaAcademicaService.criarTarefa()` — quando `TarefaCompartilhada=true`, título/conteúdo menciona "tarefa compartilhada" (ver nota 4.3) |
| `pendencia_criada` | Aviso | Aluno, Professor, Coordenação, Secretaria, Direção | ✓ | ✓ | ✅ `PendenciaService.store()` |
| `evento_criado` | Aviso | Aluno, Professor, Coordenação, Secretaria, Direção | ✓ | ✓ | ⚠️ `EventoService` (precisa método de fan-out por FuncaoId — ver 4.2) |
| `convite_grupo` | Aviso | Aluno | ✓ | ✓ | ✅ `ConviteGrupoTarefaService.enviarConvite()` |
| `tarefa_avaliada` | Aviso | Aluno | ✓ | ✓ | ❌ feature de nota/avaliação ainda não existe (ver 4.4) |
| `tarefa_resposta_recebida` | Aviso | Professor | ☐ | ☐ | ✅ `TarefaAcademicaService.marcarComoFeito()` / `enviarAnexoEntrega()` |
| `mensagem_grupo` | Aviso | Todos | ☐ | ☐ | ⚠️ `MensagemService` (confirmar método exato na implementação) |
| `mensagem_individual` | Aviso | Todos | ☐ | ☐ | ⚠️ idem |
| `promovido_representante` | Aviso | Aluno | ✓ | ✓ | ⚠️ `conversa-permissao.service.ts` (confirmar método) |
| `promovido_vice_representante` | Aviso | Aluno | ✓ | ✓ | ⚠️ idem |
| `removido_vice_representante` | Aviso | Aluno | ☐ | ☐ | ⚠️ idem |
| `removido_grupo` | Aviso | Aluno | ☐ | ☐ | ✅ `GrupoTarefaService.expulsarMembro()` |
| `tarefa_prazo_amanha` | Lembrete | Aluno | ✓ | ✓ | 🆕 novo cron job |
| `anotacao_prazo_amanha` | Lembrete | Aluno | ✓ | ✓ | 🆕 novo cron job |
| `prova_prazo_amanha` | Lembrete | Aluno | ✓ | ✓ | 🆕 novo cron job — simetria com lembrete de tarefa |
| `tarefa_prazo_alterado` | Aviso | Aluno | ✓ | ✓ | ⚠️ `TarefaAcademicaService` (método de update de prazo — confirmar na implementação) |
| `matricula_nova_turma` | Aviso | Aluno | ✓ | ✓ | ⚠️ `MatriculaService` (confirmar método de criação) |
| `evento_prazo_amanha` | Lembrete | Aluno, Professor, Coordenação, Secretaria, Direção | ☐ | ☐ | 🆕 novo cron job |

✅ = gatilho já existe e foi localizado no código. ⚠️ = gatilho existe mas o método exato precisa ser confirmado ao implementar (não bloqueia a spec). ❌ = funcionalidade de origem ainda não existe; a linha do catálogo é criada mesmo assim (usuário já pode configurar a preferência), mas o disparo real fica como TODO até a feature de origem (avaliação de tarefa) ser construída. 🆕 = não existe hoje, precisa ser criado.

**Decisões fechadas nesta rodada de validação:**
- ~~`grupo_novo`~~ removido do catálogo — em vez de um tipo separado, `tarefa_postada` passa a variar a mensagem quando a tarefa é compartilhada, então o aluno já entende que um grupo foi formado junto (um "merge" das duas ideias, evitando notificação duplicada).
- As 4 sugestões extras foram todas aceitas e promovidas para o catálogo principal (não são mais "sugestões").
- `evento_criado` e seu lembrete (`evento_prazo_amanha`) agora incluem Coordenação/Secretaria/Direção, além de Aluno/Professor.
- Preferências confirmadas como **globais por usuário** (seção 2.5 já estava desenhada assim).

---

## 3. Camada de disparo — ponto único de entrada

Novo `backend/services/notificacao.service.ts`, método central:

```ts
NotificacaoService.disparar({
  tipoSlug: string,
  destinatarios: string[],       // UsuarioCPF[]
  escolaGUID: string,
  titulo: string,
  conteudo?: string,
  entidadeTipo?: string,
  entidadeGUID?: string,
  link?: string,
})
```

O que faz, por destinatário:
1. Resolve `NotificacaoTipoId` pelo slug (catálogo carregado em memória no boot — muda raramente, evita 1 SELECT por chamada).
2. `INSERT` em `notificacao`.
3. Emite em tempo real via WebSocket (seção 5).
4. Resolve preferência efetiva (`usuarionotificacaopreferencia` OU default do catálogo) e, se e-mail/whatsapp ligados, enfileira o envio (seção 4) — **fire-and-forget**, nunca bloqueia nem derruba a requisição principal se o envio falhar.

Cada service existente (`ConteudoService`, `ProvaAgendadaService`, `TarefaAcademicaService`, `PendenciaService`, `EventoService`, `ConviteGrupoTarefaService`, `GrupoTarefaService`, `MensagemService`, etc.) ganha **uma chamada a mais no fim do método de criação já existente** — não é reescrita, é um hook adicional.

---

## 4. Canais de envio

### 4.1 E-mail
`backend/services/notificacaocanal/notificacaoEmail.channel.ts` — usa `ResendEmailService.getInstance().sendEmail(...)` (já existe, `backend/external/ResendEmailService.ts`). Grava resultado em `notificacaoenvio` (`Enviado` + `NotificacaoEnvioProviderId` do Resend, ou `Falhou` + `NotificacaoEnvioErro`).

### 4.2 WhatsApp
`backend/services/notificacaocanal/notificacaoWhatsapp.channel.ts` — **stub**. Sem Evolution API configurada ainda, o canal apenas loga e não cria linha em `notificacaoenvio` (evita registro `Pendente` eterno). Interface já pronta pra plugar depois: `enviar(destinatarioTelefone, mensagem): Promise<{providerId: string}>`.

### 4.3 Fan-out por papel (para `evento_criado`)
Precisa de um método novo (não existe hoje): `EscolaxUsuarioxFuncaoDAO.findUsuariosAtivosByEscolaEFuncoes(EscolaGUID, FuncaoId[])` em `backend/repositories/escolaxusuarioxfuncao.repository.ts`, retornando `UsuarioCPF[]` com `Status='Ativo'`.

### 4.4 Nota sobre tarefa compartilhada
`GrupoTarefaService.criarGruposAutomaticos()` roda no mesmo momento em que `TarefaAcademicaService.criarTarefa()` cria a tarefa (quando `TarefaCompartilhada=true`). Não existe tipo `grupo_novo` separado — o hook de `tarefa_postada` monta o texto da notificação de forma condicional: se `TarefaCompartilhada=true`, o título/conteúdo inclui "tarefa compartilhada" (ex.: `"Nova tarefa compartilhada: {título}"`), avisando em uma única notificação tanto da tarefa quanto do grupo formado.

### 4.5 Nota sobre `tarefa_avaliada`
`tarefaacademica_matricula` hoje só tem `TarefaFeito`/`TarefaRealizacaoData` (bool de "entregue"), sem campo de nota/status de correção. O tipo entra no catálogo e na tela de configurações, mas o disparo real depende de uma feature de avaliação que ainda não existe — fica documentado como dívida técnica, não bloqueia o resto do sistema.

---

## 5. Tempo real (WebSocket)

`backend/websocket/SocketServer.ts` já autentica cada socket via JWT e guarda `socket.data.usuario.UsuarioCPF`. Falta só: no `connection`, entrar automaticamente numa room pessoal —

```ts
socket.join(`usuario:${socket.data.usuario.UsuarioCPF}`);
```

`NotificacaoService.disparar()` então chama `SocketServer.emit('usuario:' + cpf, 'notificacao:nova', notificacaoJSON)` (o método `SocketServer.emit` já existe e já é usado pelo chat). Nenhuma mudança estrutural no WebSocket, só uma linha a mais no handler de conexão.

---

## 6. API REST e frontend

### 6.1 Rotas novas (`backend/routes/notificacao.routes.ts`, registradas em `Server.ts` como as demais)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/notificacao` | Lista notificações do usuário logado (paginado, filtro `lida`) |
| GET | `/api/notificacao/contador` | Contagem de não lidas (badge do sino) |
| PATCH | `/api/notificacao/:NotificacaoGUID/lida` | Marca uma como lida |
| PATCH | `/api/notificacao/lidas` | Marca todas como lidas |
| GET | `/api/notificacao/tipos` | Catálogo completo (pra montar a tela de configurações) |
| GET | `/api/notificacao/preferencias` | Preferências efetivas do usuário (catálogo + override resolvido) |
| PUT | `/api/notificacao/preferencias/:NotificacaoTipoId` | Atualiza email/whatsapp de um tipo |

Segue exatamente o padrão de `pendencia.controller.ts`/`pendencia.routes.ts` (auth via `AuthMiddleware.authenticate`, resposta `{success, message, data}`).

### 6.2 Frontend — escopo desta fase

Não existe hoje nenhuma página de configurações **do usuário** (só `configuracoes` de escola, que é outra coisa). Esta spec cobre apenas:
- Sino de notificações (lista + contador) — componente simples, sem MCP de design necessário (lista de texto).
- Tela de preferências (toggles email/whatsapp por tipo, agrupados por categoria).

**Fora do escopo desta fase** (conforme você definiu): notificações em destaque no dashboard principal — isso fica para uma rodada com o agente de frontend usando o design system (Bauá Design System), depois que o backend estiver validado.

---

## 7. Impacto no banco (volumetria)

- `notificacaotipo` / `notificacaotipofuncao`: ~20 linhas, estático. Irrelevante.
- `usuarionotificacaopreferencia`: esparsa por design (seção 2.5) — só cresce quando um usuário efetivamente muda uma preferência. Pior caso realista (todo usuário mexe em tudo): `usuários × tipos`, ainda pequeno.
- `notificacao`: a tabela que cresce de verdade — uma linha por (destinatário × evento). Uma turma de 30 alunos recebendo `tarefa_postada` = 30 linhas numa tarada só. Mitigação: índice `(UsuarioCPF, NotificacaoLida)` já cobre a query mais comum (sino); considerar rotina de expurgo/arquivamento de notificações lidas com +90 dias (não incluída nesta fase, só sinalizada).
- `notificacaoenvio`: só cresce quando o canal está de fato ligado — bem menor que `notificacao`.

Nada aqui é uma tabela de auditoria de sistema — é só o rastro operacional necessário pro produto (sino + anti-duplicidade de envio). A avaliação de um **registro de auditoria geral** (quem alterou o quê, quando, valores antes/depois) é um pedido separado seu, tratado na seção 8.

---

## 8. Depois de notificações: avaliação de auditoria (não implementar agora)

Combinado: só depois que notificações estiverem no ar, eu entrego uma **análise separada** (documento, não código) cobrindo:
- O que um registro de auditoria deveria capturar (ator, ação, entidade afetada, valores antes/depois, IP/user-agent, timestamp) e quais ações do sistema entram no escopo (login, alterações em `usuario`/`escola`/`matricula`/notas, mudanças de função/papel, mudança de preferências de notificação, etc.).
- Opções de arquitetura (tabela `auditoria` dedicada vs. log estruturado fora do MySQL transacional vs. binlog) e o trade-off de cada uma.
- Estimativa de volumetria e o quanto isso pesa no MySQL de produção (Railway), com estratégia de retenção/particionamento.

---

## 9. Arquivos a criar (implementação, após validação desta spec)

**Backend:**
- Migration `backend/database/migrations/<data>-notificacoes.sql` (+ seed do catálogo) e `.ts` runner, seguindo o padrão de `add-escola-configuracao.ts`
- `backend/entities/notificacao.model.ts`, `notificacaotipo.model.ts`, `usuarionotificacaopreferencia.model.ts`
- `backend/repositories/notificacao.repository.ts`, `notificacaotipo.repository.ts`, `usuarionotificacaopreferencia.repository.ts`
- `backend/services/notificacao.service.ts`, `backend/services/notificacaocanal/notificacaoEmail.channel.ts`, `notificacaoWhatsapp.channel.ts`
- `backend/services/notificacao.scheduler.ts` (cron dos lembretes — mesma lib `node-cron` do `CleanupScheduler`)
- `backend/controllers/notificacao.controller.ts`, `backend/routes/notificacao.routes.ts`
- Hooks de uma linha nos services listados na seção 3
- Ajuste em `backend/websocket/SocketServer.ts` (join da room pessoal)

**Frontend:**
- `frontend/app/dashboard/[escolaGUID]/notificacoes/page.tsx` (sino/lista)
- `frontend/app/dashboard/[escolaGUID]/notificacoes/configuracoes/page.tsx` (preferências)
- `frontend/lib/api/notificacao.api.ts`

**Docs:**
- `docs/routes/notificacao-api.md` (mesmo padrão de `escolaconfiguracao-api.md`)

---

## 10. Decisões de validação (fechadas)

1. **`grupo_novo`** — removido; mesclado em `tarefa_postada` (ver 4.4).
2. **Sugestões extras** — todas as 4 aceitas: `prova_prazo_amanha`, `tarefa_prazo_alterado`, `matricula_nova_turma`, `evento_prazo_amanha`.
3. **`evento_criado`/`evento_prazo_amanha`** — incluem também Coordenação/Secretaria/Direção.
4. **Escopo da preferência** — global por usuário (não por escola).
5. **WhatsApp** — confirmado: só o gancho fica pronto (interface `enviar()`), sem tentativa de envio real até a Evolution API ser integrada; nenhuma linha de `notificacaoenvio` é criada para esse canal enquanto isso.

Catálogo final: 20 tipos (16 Aviso + 4 Lembrete). ✅ Implementado — ver seção 9 e `docs/routes/notificacao-api.md`.
