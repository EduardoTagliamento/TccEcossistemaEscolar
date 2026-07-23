# Planejamento: Chat — Melhorias (Reações, Gestão de Grupo, Recibo de Leitura)

**Data:** 2026-07-23
**Status:** Spec em revisão
**Escopo:** Três gaps confirmados do módulo de Chat (`docs/RELATORIO_BAUA_CODIGO.md`, seção 7): (1) reações a mensagens — funcionalidade 100% nova; (2) UI de gestão de grupo (promover/remover Representante e Vice-Representante) — backend já existe por inteiro, falta só a tela; (3) recibo de leitura visual (✓/✓✓ estilo WhatsApp) em conversas individuais — backend já emite o evento, falta consumo + um campo novo no DTO de detalhe da conversa.

---

## 0. Resumo executivo

**O que existe hoje:**
- Reações: nada — nenhuma tabela, DAO, service, rota ou UI menciona "reação"/"reagir" no repositório.
- Gestão de grupo: backend completo (`backend/services/conversa-permissao.service.ts`, 4 métodos; `backend/controllers/conversa.controller.ts`; rotas em `routes/conversa.routes.ts`; evento WS `permissao_atualizada` já emitido). Frontend não tem nenhum listener para `permissao_atualizada`, nenhum botão/modal de gestão, e o `MembroDTO` retornado por `GET /api/conversa/:guid` não expõe nome do usuário — só `UsuarioCPF`.
- Recibo de leitura: backend já persiste (`mensagem_leitura`) e já emite `mensagem_lida` via WebSocket (`{ConversaGUID, UsuarioCPF, LidaAt}`, ver `backend/websocket/conversa.handler.ts`). O frontend (`frontend/app/dashboard/[escolaGUID]/chat/page.tsx`) não escuta esse evento e não tem indicação visual de "enviada" vs "lida" nas bolhas próprias.

**O que falta, por bloco:**
1. Reações: 1 tabela nova (`mensagem_reacao`), 1 endpoint REST + 1 evento WS (toggle), enriquecimento do `MensagemDTO` com o agregado de reações, e UI de picker + chips no chat.
2. Gestão de grupo: enriquecer `MembroDTO` com `UsuarioNome` (1 query nova no backend, aditiva), consumir os 4 endpoints já existentes a partir de um modal novo no frontend, e escutar `permissao_atualizada`.
3. Recibo de leitura: 1 campo novo (`UltimaLeituraParceiro`) no DTO de detalhe da conversa (derivado de `mensagem_leitura` já existente, sem migration), escutar `mensagem_lida` no frontend, e renderizar ✓/✓✓ nas bolhas próprias de conversas individuais.

**Blocos de trabalho (ordem de dependência):** ver Seção 6. Os três blocos são independentes entre si (não há dependência cruzada) e podem ser implementados e revisados em qualquer ordem — a spec os documenta juntos por serem os três itens pendentes do mesmo relatório de gaps, não porque compartilhem código.

---

## 1. Decisões de negócio a confirmar com o usuário

Nenhuma das perguntas abaixo foi validada ainda — são a base para o restante do documento, que assume a recomendação de cada uma (marcado explicitamente) só para poder detalhar o resto da spec sem travar. **Nenhuma implementação deve começar antes dessas respostas serem confirmadas ou corrigidas.**

| # | Pergunta | Recomendação (assumida no resto do documento) |
|---|---|---|
| 1 | **Reações — modelo de dado:** uma reação ativa por usuário por mensagem (reagir de novo com o mesmo emoji remove; com outro emoji substitui — estilo Telegram/Slack) **ou** múltiplas reações simultâneas do mesmo usuário na mesma mensagem (estilo Discord, 👍 e ❤️ ao mesmo tempo)? | **Single-reaction-per-user.** Mais simples: `PRIMARY KEY (MensagemGUID, UsuarioCPF)` já resolve unicidade, sem tabela de junção adicional nem regra de "no máximo N reações por usuário". |
| 2 | **Reações — paleta de emojis:** lista fixa e pequena (👍 ❤️ 😂 😮 😢 🙏) exibida num picker simples ao lado da mensagem, **ou** emoji livre (picker completo tipo `emoji-mart`)? | **Lista fixa.** Sem dependência nova no frontend, sem preocupação de renderização de fonte de emoji exótica, e cobre o que o post-it original pedia ("reações a mensagens", sem exigir emoji livre). |
| 3 | **Recibo de leitura — escopo:** aplicar só em conversas **individuais** (✓ enviada / ✓✓ lida, estilo WhatsApp — "lida" é binário porque só há 1 outro participante), **ou** também em grupos (onde "lida" viraria algo tipo "lida por 3 de 8")? | **Só individual.** Grupos já têm sinalização de não lidas agregada por conversa (`NaoLidas` na lista lateral); replicar "lida por N de M" por mensagem em grupo é um cálculo e uma UI mais caros, fora do gap original. |
| 4 | **Gestão de grupo — nome dos membros:** hoje `MembroDTO` (`GET /api/conversa/:guid`) só tem `UsuarioCPF`. Enriquecer o backend (`ConversaService.buscarConversa`, novo campo `UsuarioNome` via query em lote), **ou** resolver client-side chamando `GET /api/usuario/:cpf` por membro (evita mudança de backend, mas gera N requisições por abertura da tela)? | **Enriquecer o backend.** Mudança pequena e aditiva (só acrescenta um campo ao DTO existente, não quebra contrato), evita N+1 requisições. |
| 5 | **Gestão de grupo — escopo real:** confirmar que "gestão de grupo" aqui é **só** expor UI para as 4 ações já existentes no backend (definir/remover Representante, definir/remover Vice-Representante) e **NÃO** inclui "kick" (remover um membro do grupo por completo). Grupos de Turma são derivados automaticamente da matrícula do aluno — não existe endpoint de remoção de membro do grupo, e não faria sentido sem também remover o aluno da turma (fluxo de outro módulo). | **Confirmar exclusão de "kick" do escopo.** O post-it original do board mencionava "kick" como funcionalidade administrativa desejada — por isso esta pergunta precisa de confirmação explícita, não é só uma nota de rodapé. |
| 6 | **Reações — via REST, WebSocket, ou os dois?** O padrão do projeto para ações de mensagem (fixar/desafixar/editar/deletar) é ter as duas vias — endpoint REST idempotente (funciona mesmo se o socket cair) **e** handler WebSocket equivalente chamando o mesmo método de service, ambos emitindo o mesmo evento de broadcast. | **Seguir o mesmo padrão**, por consistência: REST `POST /api/conversa/:guid/mensagem/:msgGuid/reacao` + WS `reagir_mensagem`, os dois chamando `MensagemService.reagir()` e emitindo `reacao_atualizada`. |

> Convenção de leitura do restante do documento: toda vez que uma seção técnica depende de uma dessas 6 decisões, ela cita o número da pergunta entre colchetes, ex. `[decisão #1]`.

---

## 1.1 Decisões confirmadas pelo usuário (2026-07-23) — substituem as recomendações acima

O usuário respondeu às 6 perguntas divergindo da recomendação em 3 delas. As seções técnicas abaixo (3-6) foram atualizadas para refletir o que segue — o texto original das seções permanece como registro histórico do raciocínio, mas onde há conflito, **isto aqui vale**:

1. **Reações — múltiplas reações simultâneas (não single-reaction).** Um usuário pode reagir com 👍 E ❤️ na mesma mensagem ao mesmo tempo (estilo Discord). Schema ajustado: `PRIMARY KEY (MensagemGUID, UsuarioCPF, ReacaoEmoji)` em vez de `(MensagemGUID, UsuarioCPF)`. Toggle passa a ser por par `(usuário, emoji)`: clicar num emoji que o usuário ainda não usou nessa mensagem → adiciona; clicar num emoji que ele já usou → remove. Sem "trocar" (não existe mais esse caso — cada emoji é independente).
2. **Recibo de leitura — também em grupos, não só individual.** Achado importante ao revisar o schema: `mensagem_leitura` **já é granular por mensagem** (`PRIMARY KEY (MensagemGUID, UsuarioCPF)`, uma linha por par mensagem×leitor — não é um "cursor" por conversa como a Seção 4.3 original supôs). Isso torna "lida por N de M" trivial sem migration nova: basta agregar `mensagem_leitura` por `MensagemGUID`. Design atualizado (substitui a Seção 4.3 inteira):
   - `MensagemDTO` ganha `Leitores: string[]` (CPFs que já leram, excluindo o próprio remetente) em vez de `ConversaDetalheDTO.UltimaLeituraParceiro`.
   - Batch query (usada em `listarHistorico`, `buscarConversa`): `SELECT ml.MensagemGUID, ml.UsuarioCPF FROM mensagem_leitura ml INNER JOIN mensagem m ON m.MensagemGUID = ml.MensagemGUID WHERE ml.MensagemGUID IN (...) AND ml.UsuarioCPF != m.MensagemRemetenteCPF`.
   - Nenhuma mudança no evento `mensagem_lida` (`{ConversaGUID, UsuarioCPF, LidaAt}`) — o frontend, ao receber esse evento (de outro usuário), aplica um patch local: toda mensagem já carregada com `MensagemCreatedAt <= LidaAt` e remetente diferente de `UsuarioCPF` ganha esse CPF em `Leitores` (client-side, sem nova requisição — `markAllAsRead` no backend já garante que isso é exatamente o que aconteceu no banco).
   - Renderização: conversa individual → ✓ (Leitores vazio) / ✓✓ (parceiro em Leitores). Grupo → ✓ / "✓✓ {Leitores.length}" com tooltip "Lida por N de M" (M = `conversaAtiva.Membros.length - 1`, calculado no cliente, sem campo novo de denominador no backend).
3. **Gestão de grupo — "kick" existe, mas só em grupos de Tarefa, e já está implementado (fora do chat).** Confirmado no código: `GrupoTarefaService.expulsarMembro()` (`backend/services/grupotarefa.service.ts:158`) já faz exatamente isso — só o Líder expulsa, o expulso vira líder de um grupo novo próprio automaticamente (regra de negócio de tarefa compartilhada, não deste spec), e já sincroniza a conversa via `ConversaGrupoService.removerMembroGrupoTarefa()`, que já remove o membro de `conversa_grupo_membro` **e já emite** `SocketServer.emit(conversaGUID, 'membro_saiu', {ConversaGUID, UsuarioCPF})`. Já exposto via `DELETE /api/grupotarefa/:grupoGUID/membros/:cpf` e já consumido em `frontend/lib/api/grupotarefa.api.ts::expulsarMembro()` + `frontend/app/dashboard/[escolaGUID]/tarefas/[tarefaGUID]/page.tsx`. **O que falta não é implementar kick — é expor esse botão também dentro do modal de gestão de grupo do chat**, para grupos `ConversaGrupoTipo === 'Tarefa'` onde `meuPapelNoGrupo === 'Lider'`. Para isso:
   - `ConversaDetalheDTO` ganha `ConversaGrupoRefGUID: string | null` (o `GrupoTarefaGUID` ou `TurmaGUID` conforme o tipo) — hoje não exposto, necessário para o frontend chamar `expulsarMembro(grupoRefGUID, cpf)` a partir do chat.
   - Modal de gestão de grupo escuta `membro_saiu` (novo, backend já emite) e re-busca a conversa (mesmo padrão de resync de `permissao_atualizada`).
   - Grupos `ConversaGrupoTipo === 'Turma'` continuam **sem** kick (confirmado pelo usuário: só sai por transferência de turma ou saída da escola, fluxo de outro módulo).
4. **REST + WebSocket para reações — confirmado, sem mudança.**

---

## 2. Estado atual do código (relevante para esta feature)

- **Mensagens (base):** `backend/entities/mensagem.model.ts` (entidade com campos privados `#` e getters/setters validando), `backend/repositories/mensagem.repository.ts` (`MensagemDAO`), `backend/services/mensagem.service.ts` (`MensagemService`, DTO `MensagemDTO` em `mensagem.service.ts:12-20`).
- **Padrão-ouro a replicar (mensagens fixadas):** tabela própria `mensagem_fixada` (não uma coluna em `mensagem`), sem classe de entidade própria — `MensagemDAO` trabalha com rows cruas tipadas (`MensagemFixadaRow`) e o DTO (`MensagemFixadaDTO`) é montado no service (`mensagem.service.ts:239-280`). Emissão de evento sempre via `const { SocketServer } = await import('../websocket/SocketServer'); SocketServer.emit(conversaGUID, 'evento', payload)` — import dinâmico para evitar dependência circular. **Reações deve seguir exatamente esse padrão**: tabela própria `mensagem_reacao`, sem entidade de domínio dedicada, DAO com rows cruas, DTO montado no service.
- **Schema real de mensagens:** `backend/database/sql.txt:366-419` (`mensagem`, `mensagem_leitura`, `mensagem_fixada`). Convenção confirmada: `` `railway`.`nome_tabela` `` no `sql.txt` (mas `` `tccecossistemaescolar`.`nome_tabela` `` — sem prefixo `railway` — nas migrations em `backend/database/migrations/*.sql`, ver `2026-07-08-conversa-permissoes.sql:4` que usa `USE tccecossistemaescolar;`), `UsuarioCPF` é `VARCHAR(14)` (com máscara), GUID `CHAR(36)`, timestamps `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`.
- **Migrations recentes:** nome `AAAA-MM-DD-descricao.sql`, bloco de rollback comentado no fim (ver `backend/database/migrations/2026-07-17-notificacoes.sql`, referência de estilo completo incluindo seed). Última migration confirmada aplicada em produção (Railway) nesta sessão: `2026-07-22-fix-evento-schema.sql`.
- **Permissões de grupo (já implementado):** `backend/services/conversa-permissao.service.ts` — `definirRepresentante`/`removerRepresentante` (só Coordenação/Direção, só grupos `ConversaGrupoTipo = 'Turma'`, valida via `EscolaxUsuarioxFuncaoDAO.isCoordOuDirecaoEmEscola`) e `definirViceRepresentante`/`removerViceRepresentante` (só o `Representante` do grupo, em Turma, ou o `Lider`, em Tarefa). Todos os 4 métodos já emitem `SocketServer.emit(conversaGUID, 'permissao_atualizada', {ConversaGUID, UsuarioCPF, NovaFuncao})` e já disparam notificação in-app (`promovido_representante`, `promovido_vice_representante`, `removido_vice_representante` — catálogo já existe em `notificacaotipo`, seed em `2026-07-17-notificacoes.sql:141-143`).
- **Gap de comportamento a resolver no frontend (não é bug a corrigir no backend):** `definirRepresentante`/`removerRepresentante` também rebaixam efeitos colaterais (Representante anterior e Vices existentes viram `Membro`), mas o backend só emite **um** evento `permissao_atualizada` — o do CPF que foi promovido/removido diretamente pela chamada, não os das demais linhas afetadas como efeito colateral (`conversa-permissao.service.ts:65-72`, `93-101`). Isso significa que o frontend **não pode** fazer patch pontual do estado local a partir do payload do evento — precisa re-buscar a conversa inteira (`ConversaAPI.buscarConversa`) para ficar consistente com o banco. Ver Seção 4.2.
- **Rotas já existentes (Feature 2, sem mudança nesta spec):** `routes/conversa.routes.ts:101-130` — `PUT/DELETE /:guid/permissao/representante`, `PUT/DELETE /:guid/permissao/vice-representante(/:cpf)`.
- **`MembroDTO` atual (a enriquecer, decisão #4):** `backend/services/conversa.service.ts:39-43` — `{UsuarioCPF, MembroFuncao, MembroEntradaAt}`, sem nome. `ConversaGrupoDAO.findMembros()` (`backend/repositories/conversa-grupo.repository.ts:108-118`) retorna entidades `ConversaGrupoMembro` (sem campo de nome — adicionar um campo à entidade quebraria o padrão dela ser um espelho 1:1 da tabela `conversa_grupo_membro`, que não tem coluna de nome). Único chamador de `findMembros()` no repositório inteiro é `ConversaService.buscarConversa()` — seguro adicionar um método novo dedicado sem tocar no existente.
- **Resolução de papel do usuário na escola:** `1=Coordenacao, 2=Secretaria, 3=Professor, 4=Responsavel, 5=Aluno, 6=Direcao`. Já resolvido no frontend em dois lugares, de forma **deliberadamente duplicada** (convenção do projeto — "sem abstração prematura", não existe hook `useFuncoesEscola` compartilhado): `frontend/app/dashboard/[escolaGUID]/_components/DashboardNavbar.tsx:402-422` (`buscarFuncoesDaEscola`, chama `GET /api/usuario/{cpf}/escolas`, filtra `Status === 'Ativo'`) e `frontend/app/dashboard/[escolaGUID]/page.tsx`. A tela de chat (`chat/page.tsx`) **não** tem essa resolução hoje — precisa ser adicionada lá também, duplicando o mesmo padrão de fetch, para decidir se mostra o botão "Gerenciar grupo" com a opção de Representante (Coordenação/Direção only).
- **Recibo de leitura (backend, já existe):** `mensagem_leitura` (`MensagemGUID`, `UsuarioCPF`, `MensagemLidaAt`), `MensagemDAO.markAllAsRead()` (`mensagem.repository.ts:149-162`) insere uma linha por mensagem não lida no momento da chamada, todas com o mesmo timestamp (`NOW()` do batch). Evento WS `mensagem_lida` (`conversa.handler.ts:69-81`) já é emitido com `{ConversaGUID, UsuarioCPF, LidaAt}` toda vez que alguém chama `mark_as_read` — na prática, `LidaAt` representa "todas as mensagens até agora estão lidas por este usuário", o que é exatamente o cursor que a UI de recibo de leitura precisa (ver Seção 4.3 — nenhuma mudança no evento é necessária, só no consumo).
- **Frontend — `chat/page.tsx`:** ~920 linhas, listeners de socket centralizados num único `useEffect` (`page.tsx:192-296`) que hoje trata `nova_mensagem`, `mensagem_editada`, `mensagem_deletada`, `mensagem_fixada`, `mensagem_desafixada`, `usuario_digitando`, `erro` — **sem** `mensagem_lida` nem `permissao_atualizada`. Menu de ações por bolha já existe (`bolhaAcoesWrap`/`bolhaAcoesMenu`, `page.tsx:791-823`) com fixar/editar/apagar — reações se integram nesse mesmo menu/wrap, não como tela nova. `frontend/lib/api/conversa.api.ts` tem os wrappers REST atuais (fixar/desafixar/editar/deletar mensagem, listar conversas/histórico, permissão **não** tem wrappers ainda, reações não existem).
- **Ícones (`chat/icons.tsx`):** glifos extraídos do design system (mcp `claude-design`), lista fechada (`IconName`) sem `check-check` — só existe `'check'` simples. O próprio arquivo já documenta o padrão de reaproveitar um glifo existente em vez de desenhar um novo quando não há um dedicado (`star` reaproveitado para "fixar"). O recibo de leitura deve seguir a mesma prática: compor visualmente o duplo-check a partir de dois `<Icon name="check">` sobrepostos via CSS, sem adicionar glifo novo ao registro.
- **`MinimizedChatBubble`/`ChatUIContext`:** já implementados (`frontend/app/dashboard/[escolaGUID]/_components/MinimizedChatBubble.tsx`, `frontend/lib/chat/ChatUIContext.tsx`) — fora do escopo desta spec, nenhuma mudança prevista neles.

---

## 3. Modelo de dados novo/alterado

Só a **Feature 1 (Reações)** exige migration. Gestão de grupo (Feature 2) e Recibo de leitura (Feature 3) reaproveitam tabelas já existentes (`conversa_grupo_membro`, `usuario`, `mensagem_leitura`) — nenhuma alteração de schema.

### 3.1 `mensagem_reacao` — nova tabela [decisão #1, #2]

```sql
-- =====================================================
-- TABELA: mensagem_reacao
-- Reação (emoji) de um usuário a uma mensagem — 1 reação ativa por
-- usuário por mensagem (reagir de novo com o mesmo emoji remove;
-- com outro emoji substitui). Paleta fixa via ENUM (decisão #2).
-- =====================================================
CREATE TABLE `tccecossistemaescolar`.`mensagem_reacao` (
  `MensagemGUID`     CHAR(36)                                        NOT NULL,
  `UsuarioCPF`       VARCHAR(14)                                     NOT NULL,
  `ReacaoEmoji`      ENUM('👍', '❤️', '😂', '😮', '😢', '🙏')        NOT NULL,
  `ReacaoCreatedAt`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`MensagemGUID`, `UsuarioCPF`),
  INDEX `idx_mensagemreacao_mensagem` (`MensagemGUID`),
  CONSTRAINT `FK_MensagemReacao_Mensagem`
    FOREIGN KEY (`MensagemGUID`) REFERENCES `mensagem` (`MensagemGUID`)
    ON DELETE CASCADE,
  CONSTRAINT `FK_MensagemReacao_Usuario`
    FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario` (`UsuarioCPF`)
    ON DELETE CASCADE
);
```

> Nota: `ON UPDATE CURRENT_TIMESTAMP` em `ReacaoCreatedAt` porque a operação de "trocar de emoji" é um `UPDATE` da mesma linha (mesma PK), não um novo `INSERT` — o timestamp deve refletir a última mudança, não a primeira reação daquele usuário à mensagem.

### 3.2 Migration completa (`backend/database/migrations/2026-07-23-chat-melhorias.sql`)

```sql
-- Migration: Chat — Reações a mensagens
-- Data: 2026-07-23
-- Gestão de grupo e recibo de leitura NÃO precisam de migration
-- (reaproveitam conversa_grupo_membro/usuario/mensagem_leitura já existentes).

USE tccecossistemaescolar;

CREATE TABLE IF NOT EXISTS `mensagem_reacao` (
  `MensagemGUID`     CHAR(36)                                        NOT NULL,
  `UsuarioCPF`       VARCHAR(14)                                     NOT NULL,
  `ReacaoEmoji`      ENUM('👍', '❤️', '😂', '😮', '😢', '🙏')        NOT NULL,
  `ReacaoCreatedAt`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`MensagemGUID`, `UsuarioCPF`),
  INDEX `idx_mensagemreacao_mensagem` (`MensagemGUID`),
  CONSTRAINT `FK_MensagemReacao_Mensagem`
    FOREIGN KEY (`MensagemGUID`) REFERENCES `mensagem` (`MensagemGUID`)
    ON DELETE CASCADE,
  CONSTRAINT `FK_MensagemReacao_Usuario`
    FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario` (`UsuarioCPF`)
    ON DELETE CASCADE
);

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- DROP TABLE IF EXISTS `mensagem_reacao`;
```

Após aplicar, adicionar o bloco correspondente em `backend/database/sql.txt` (seguindo o padrão `` `railway`.`mensagem_reacao` `` usado nas demais tabelas do arquivo, logo após o bloco de `mensagem_fixada`, linha ~419).

### 3.3 DTOs TypeScript novos/alterados (rascunho)

```typescript
// backend/services/mensagem.service.ts

export interface MensagemReacaoResumoDTO {
  Emoji: string;
  Quantidade: number;
  UsuariosCPF: string[]; // quem reagiu com este emoji — usado pra "você e mais 2"
}

export interface MensagemDTO {
  MensagemGUID: string;
  ConversaGUID: string;
  MensagemRemetenteCPF: string;
  MensagemConteudo: string;
  MensagemTipo: 'Texto' | 'Arquivo' | 'Imagem';
  MensagemCreatedAt: string;
  MensagemEditadaAt: string | null;
  Reacoes: MensagemReacaoResumoDTO[]; // NOVO — sempre presente, [] se não houver reação
}
```

```typescript
// backend/services/conversa.service.ts

export interface MembroDTO {
  UsuarioCPF: string;
  UsuarioNome: string; // NOVO [decisão #4]
  MembroFuncao: 'Membro' | 'Lider' | 'Representante' | 'Vice-Representante';
  MembroEntradaAt: string;
}

export interface ConversaDetalheDTO {
  // ...campos existentes inalterados...
  UltimaLeituraParceiro: string | null; // NOVO [decisão #3] — só preenchido se ConversaTipo === 'Individual'
}
```

> **Atenção (achado da Seção 2):** `ConversaService.buscarConversa()` hoje monta `Mensagens: mensagens.map((m) => m.toJSON())` chamando `Mensagem.toJSON()` **diretamente** (não passa pelo `MensagemService.#toDTO()`). Isso significa que o campo `Reacoes` precisa ser mesclado **nos dois lugares**: em `MensagemService` (usado por `listarHistorico`, `enviar`, `editarMensagem`) e em `ConversaService.buscarConversa()` (usado pelo carregamento inicial da tela). Ver Seção 4.1 para o detalhe de implementação dos dois pontos.

---

## 4. Regras de negócio / fluxo

### 4.1 Reações [decisões #1, #2, #6]

1. **Emoji permitido** — só os 6 da paleta fixa (`👍 ❤️ 😂 😮 😢 🙏`), validado em duas camadas: `ConversaMiddleware.validarReacaoBody` (REST, 400 antes de chegar no service) e novamente no `ENUM` do MySQL (defesa em profundidade — protege também o caminho WebSocket, que não passa pelo middleware Express).
2. **Toggle single-reaction** — ao reagir:
   - Se o usuário **não tem** reação nessa mensagem → insere (`Acao: 'adicionada'`).
   - Se o usuário **já reagiu com o mesmo emoji** → remove a linha (`Acao: 'removida'`).
   - Se o usuário **já reagiu com outro emoji** → substitui (`UPDATE`, `Acao: 'trocada'`).
3. **Participação** — mesma checagem de `enviar`/`fixarMensagem`: `ConversaDAO.isParticipante(conversaGUID, usuarioCPF)`, senão 403.
4. **Mensagem válida** — mensagem deve existir, pertencer à `conversaGUID` informada e não estar soft-deletada (`MensagemDeletedAt IS NULL`), mesma checagem usada em `editarMensagem`/`deletarMensagem`/`fixarMensagem` — senão 404.
5. **Sem checagem de `ConversaStatus`** — por paridade com `fixarMensagem`/`editarMensagem`/`deletarMensagem` (nenhum desses valida `ConversaStatus === 'Ativa'`; só `enviar()` faz essa checagem). Reagir a uma mensagem antiga de uma conversa/grupo já encerrado permanece possível, deliberadamente consistente com o restante das ações de mensagem.
6. **Sem gate de papel em grupo** — diferente de fixar/desafixar (só Líder/Representante/Vice-Representante) e diferente de deletar mensagem de terceiro (só Líder/Representante/Vice-Representante) — reagir é uma ação de **qualquer participante** da conversa, sem hierarquia. Não há precedente similar no código a distinguir aqui; é a leitura mais simples do post-it original ("reações a mensagens", sem menção a controle de quem pode reagir).
7. **Sem notificação in-app** — por paridade com `fixarMensagem`/`desafixarMensagem` (que também não disparam `getNotificacaoService().disparar()`); só `enviar()` dispara notificação de nova mensagem. Reagir não notifica o autor da mensagem nesta v1 (ver Seção 7, item de menor impacto).

### 4.2 Gestão de grupo [decisões #4, #5]

1. **Nenhuma nova regra de autorização** — as 4 regras já existem e já são aplicadas no backend (`ConversaPermissaoService`): Coordenação/Direção define/remove Representante (só grupos de Turma); Representante (Turma) ou Líder (Tarefa) define/remove Vice-Representante. O frontend só decide **quando mostrar o botão** — a autorização real continua sendo o 403 do backend.
2. **Gate visual do botão "Gerenciar grupo"** no cabeçalho da conversa: aparece quando `ConversaTipo === 'Grupo'` **e** (o usuário é Coordenação/Direção na escola **e** `ConversaGrupoTipo === 'Turma'`) **ou** (`meuPapelNoGrupo` é `'Representante'` ou `'Lider'`). Se nenhuma dessas condições vale, o botão fica oculto (usuário comum não vê ação que não pode executar) — mas mesmo que o botão aparecesse para alguém sem permissão, o backend rejeitaria com 403.
3. **Sem "kick"** — confirmado como fora de escopo (decisão #5). O modal de gestão de grupo só expõe as 4 ações de papel (definir/remover Representante, definir/remover Vice-Representante), nunca remoção de membro.
4. **Resync após mudança de papel, não patch pontual** — ao receber `permissao_atualizada` (ou após uma ação própria bem-sucedida), o frontend deve chamar `ConversaAPI.buscarConversa(guid)` de novo e substituir `conversaAtiva` inteiro, em vez de tentar atualizar só o `UsuarioCPF` do payload — porque o backend não emite eventos para os efeitos colaterais (Representante/Vices anteriores rebaixados a `Membro` silenciosamente, ver Seção 2). Isso garante que a lista de membros exibida sempre reflita o banco, ao custo de 1 requisição REST extra por mudança de papel (evento raro, não crítico de performance).

### 4.3 Recibo de leitura [decisão #3]

1. **Escopo:** só `ConversaTipo === 'Individual'`. Em grupos, a tela continua usando o mecanismo já existente de contagem agregada (`NaoLidas` na lista lateral) — nenhuma mudança visual por mensagem em grupo.
2. **Cursor de leitura, não lista por mensagem:** como `mark_as_read`/`markAllAsRead` marca **todas** as mensagens não lidas da conversa até aquele instante (não uma mensagem específica), o estado necessário na tela é só "qual foi o `MensagemCreatedAt` mais recente que o parceiro já leu" — não uma lista de "quem leu o quê". Isso é obtido como `MAX(m.MensagemCreatedAt)` das mensagens com linha em `mensagem_leitura` para o `UsuarioCPF` do parceiro, dentro da conversa.
3. **Carregamento inicial:** `ConversaService.buscarConversa()` calcula esse cursor uma vez (nova query) e retorna em `UltimaLeituraParceiro` — só quando `ConversaTipo === 'Individual'`.
4. **Atualização em tempo real, sem query nova:** o evento `mensagem_lida` já emitido (`{ConversaGUID, UsuarioCPF, LidaAt}`) já contém exatamente o novo cursor — `LidaAt` é o instante em que o parceiro leu, e `markAllAsRead` já garante que **tudo** que existia até `LidaAt` foi marcado como lido. O frontend só precisa, ao receber esse evento (e `UsuarioCPF` for o **parceiro**, não o próprio usuário), fazer `setUltimaLeituraParceiro(payload.LidaAt)` — nenhuma requisição adicional.
5. **Renderização:** para cada mensagem própria (`mine === true`) em conversa individual, mostrar:
   - Um único check (✓) sempre, ao lado do horário — "enviada".
   - Um segundo check sobreposto, com cor de destaque (✓✓, estilo WhatsApp) se `new Date(mensagem.MensagemCreatedAt) <= new Date(ultimaLeituraParceiro)` — "lida".
   - Sem "entregue" intermediário (não há esse conceito no schema atual — só enviado/lido).

---

## 5. API — novos endpoints (esboço)

### 5.1 Reações (novo)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/conversa/:guid/mensagem/:msgGuid/reacao` | Reage a uma mensagem (toggle: adiciona, troca ou remove a reação do usuário autenticado) |

Body: `{ "ReacaoEmoji": "👍" }`. Resposta `200` sempre (mesmo quando o resultado é remoção), body com o agregado atualizado:
```json
{
  "success": true,
  "message": "Reação atualizada",
  "data": {
    "MensagemGUID": "...",
    "ConversaGUID": "...",
    "Reacoes": [
      { "Emoji": "👍", "Quantidade": 2, "UsuariosCPF": ["111.111.111-11", "222.222.222-22"] }
    ]
  }
}
```

### 5.2 Gestão de grupo (nenhum endpoint novo — já existentes, só passam a ser consumidos)

| Método | Rota | Já implementado em |
|---|---|---|
| PUT | `/api/conversa/:guid/permissao/representante` | `routes/conversa.routes.ts:102-107` |
| DELETE | `/api/conversa/:guid/permissao/representante` | `routes/conversa.routes.ts:110-114` |
| PUT | `/api/conversa/:guid/permissao/vice-representante` | `routes/conversa.routes.ts:117-122` |
| DELETE | `/api/conversa/:guid/permissao/vice-representante/:cpf` | `routes/conversa.routes.ts:125-130` |

### 5.3 Recibo de leitura (nenhum endpoint novo — campo novo no já existente)

| Método | Rota | Mudança |
|---|---|---|
| GET | `/api/conversa/:guid` | Resposta ganha o campo `UltimaLeituraParceiro: string \| null` |

### 5.4 Eventos WebSocket

| Direção | Evento | Payload | Status |
|---|---|---|---|
| Client → Server | `reagir_mensagem` | `{ ConversaGUID, MensagemGUID, ReacaoEmoji }` | **NOVO** |
| Server → Client | `reacao_atualizada` | `{ ConversaGUID, MensagemGUID, Reacoes: MensagemReacaoResumoDTO[], AtorCPF, Acao: 'adicionada' \| 'trocada' \| 'removida' }` | **NOVO** |
| Server → Client | `permissao_atualizada` | `{ ConversaGUID, UsuarioCPF, NovaFuncao }` | Já existe — frontend passa a escutar |
| Server → Client | `mensagem_lida` | `{ ConversaGUID, UsuarioCPF, LidaAt }` | Já existe — frontend passa a escutar |

---

## 6. Fases de implementação sugeridas

1. **Migration** — `backend/database/migrations/2026-07-23-chat-melhorias.sql` (tabela `mensagem_reacao`) + atualizar `backend/database/sql.txt`.
2. **Backend — Reações**
   - `MensagemDAO` (`backend/repositories/mensagem.repository.ts`): `upsertReacao(mensagemGUID, usuarioCPF, emoji)`, `removeReacao(mensagemGUID, usuarioCPF)`, `findReacaoDoUsuario(mensagemGUID, usuarioCPF)`, `findReacoesByMensagem(mensagemGUID)`, `findReacoesByConversa(conversaGUID)` (batch, usado em `listarHistorico`/`buscarConversa`).
   - `MensagemService.reagir(mensagemGUID, conversaGUID, usuarioCPF, emoji)` — regras da Seção 4.1, emite `reacao_atualizada` via `SocketServer.emit`.
   - Mesclar `Reacoes` no `MensagemDTO` em `#toDTO()`, `listarHistorico()`, e também em `ConversaService.buscarConversa()` (que hoje bypassa o DTO — ver nota da Seção 3.3).
   - `ConversaController.reagirMensagem`, `ConversaMiddleware.validarReacaoBody` (valida `ReacaoEmoji` contra a paleta fixa).
   - Rota `POST /:guid/mensagem/:msgGuid/reacao` em `routes/conversa.routes.ts` (registrar após a rota de fixar, mesma seção de rotas de mensagem).
   - Handler WS `reagir_mensagem` em `backend/websocket/conversa.handler.ts`, espelhando `pin_mensagem`/`unpin_mensagem`.
3. **Backend — Recibo de leitura**
   - `MensagemDAO.findUltimaLeituraPorUsuario(conversaGUID, usuarioCPF): Promise<Date | null>`.
   - `ConversaService.buscarConversa()`: no branch `ConversaTipo === 'Individual'`, resolver o CPF do parceiro (já feito via `ConversaIndividualDAO.getParceiroInfo`) e popular `UltimaLeituraParceiro`.
4. **Backend — Gestão de grupo (enriquecimento)**
   - `ConversaGrupoDAO.findMembrosComNome(conversaGUID)` — novo método com `JOIN usuario`, retorna rows cruas (não mexe em `findMembros()` existente nem na entidade `ConversaGrupoMembro`).
   - `ConversaService.buscarConversa()`: trocar a chamada por `findMembrosComNome` e popular `MembroDTO.UsuarioNome`.
5. **Frontend — `conversa.api.ts`**
   - Tipos: `MensagemReacaoResumo`, `Mensagem.Reacoes?`, `ConversaMembro.UsuarioNome`, `ConversaDetalhe.UltimaLeituraParceiro`.
   - Funções: `reagirMensagem(conversaGUID, mensagemGUID, emoji)`, `definirRepresentante(conversaGUID, usuarioCPF)`, `removerRepresentante(conversaGUID)`, `definirViceRepresentante(conversaGUID, usuarioCPF)`, `removerViceRepresentante(conversaGUID, usuarioCPF)`.
6. **Frontend — `chat/page.tsx`**
   - Reações: novo estado `pickerReacaoAbertoGUID`, handler `handleReagir(mensagem, emoji)` (emite `reagir_mensagem` via socket, otimista opcional), listener `reacao_atualizada` no `useEffect` de listeners já existente, renderização de chips de reação agregada abaixo da bolha + botão de picker no `bolhaAcoesWrap`.
   - Recibo de leitura: estado `ultimaLeituraParceiro`, inicializado em `carregarConversaAtiva` a partir de `detalhe.UltimaLeituraParceiro`, listener `mensagem_lida` (só atualiza se `payload.UsuarioCPF !== usuario?.UsuarioCPF`), renderização condicional do duplo-check nas bolhas próprias de conversa individual.
   - Gestão de grupo: fetch de `funcoesEscola` (duplicando o padrão de `DashboardNavbar.buscarFuncoesDaEscola`), botão "Gerenciar grupo" no `painelHeader` (gate da Seção 4.2), listener `permissao_atualizada` (dispara resync via `ConversaAPI.buscarConversa`, Seção 4.2 item 4), estado `gerenciarGrupoModalAberto`.
7. **Frontend — novo componente** `frontend/app/dashboard/[escolaGUID]/chat/GerenciarGrupoModal.tsx` + `GerenciarGrupoModal.module.css` (arquivo irmão de `NovaConversaModal.tsx`, mesmo padrão de pasta plana já usado em `chat/`). Lista membros com nome, badge de papel atual, e botões de ação conforme o gate da Seção 4.2.
8. **Documentação Swagger-like** — atualizar `docs/routes/conversa-api.md` (novo endpoint de reação, novos campos nos DTOs de mensagem/conversa/membro) e a entrada correspondente em `docs/routes/README.md` — via o modo 2 do agente de documentação, depois que o código estiver implementado.

---

## 7. Pontos ainda em aberto (assunções que adotei — revisar antes de codar)

As 6 perguntas de maior impacto (modelo de dado de reação, paleta de emoji, escopo do recibo de leitura, enriquecimento de nome, escopo de "kick", REST+WS) já estão na Seção 1 aguardando confirmação explícita. Os pontos abaixo têm impacto menor/isolado — adotei um default razoável em cada um para não travar a spec, mas seguem marcados para revisão:

1. **Notificação in-app ao reagir** — assumi que reagir **não** dispara notificação (Seção 4.1, item 7), por paridade com fixar/desafixar. Se o usuário quiser notificar o autor da mensagem quando alguém reage (padrão comum em apps de chat), seria um novo `notificacaotipo` (`reacao_mensagem`) e uma chamada a `getNotificacaoService().disparar()` em `MensagemService.reagir()` — fácil de adicionar depois, não bloqueia o resto da spec.
2. **Limite de emoji distintos por mensagem exibidos como chips** — não assumi nenhum limite (todos os emojis com pelo menos 1 reação aparecem). Se a paleta é fixa em 6 (decisão #2), o pior caso são 6 chips por mensagem — não deveria precisar de "mostrar mais".
3. **`ReacaoCreatedAt` exposto no DTO** — não incluí no `MensagemReacaoResumoDTO` (Seção 3.3) porque o agregado por emoji não tem um timestamp único (cada `UsuarioCPF` do array reagiu em momentos diferentes). Se for necessário ordenar chips por "reação mais recente primeiro", precisaria expandir o DTO para incluir timestamp por usuário — não implementado nesta v1.
4. **Migration do arquivo `2026-07-19-add-projetos.sql` já existe no repositório e não tem relação com esta spec** — mencionado aqui só para registrar que o nome de arquivo `2026-07-23-chat-melhorias.sql` proposto na Seção 3.2 não colide com nenhuma migration existente (confirmado via listagem de `backend/database/migrations/`).
5. **`MinimizedChatBubble`/bolha flutuante** — confirmado fora de escopo (Seção 2); não propus nenhuma mudança nela para refletir reações ou recibo de leitura na prévia da bolha minimizada. Se o usuário quiser isso, é uma extensão de fase 2, fora desta spec.
