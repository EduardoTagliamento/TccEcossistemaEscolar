# Relatório: Board Bauá x Estado real do código

> Fonte primária: `Bauá (1).pdf` (12 páginas, board Kanban com post-its), lido diretamente nesta sessão em alta resolução — a transcrição abaixo corrige pontos que estavam ilegíveis em `docs/PENDENCIAS_BAUA.md`.
> Método: para cada item do board, o diretório do projeto foi inspecionado (rotas, controllers, entidades, páginas Next.js) para confirmar se o checkbox do board (✅/🔁/⬜) reflete o estado real do repositório.
> Data: 2026-07-17.
> Atualização (2026-07-19): adicionadas subseções "Especificação proposta" nas seções 7, 8, 9 e 11 (Chat, Secretaria, Matérias, Configuração do usuário — módulos onde o board e o código concordam que não há implementação real), com estado atual do código, modelo de dados/endpoints propostos e decisões em aberto a confirmar com o dono do produto antes de codar. A seção "Notificações" (dentro da 8) foi corrigida nesta atualização: o texto anterior dizia que backend e frontend estavam ausentes, o que não é mais verdade — ver detalhes na própria seção e na nota da tabela-resumo.

## Achado principal

**Os checkboxes "Frontend ⬜" do board não significam "não existe código".** Em vários módulos marcados como pendentes, a tela já está implementada e funcional — o checkbox parece registrar "ainda não foi revisado/aprovado no design" ou "post-its de ajuste ainda abertos", não ausência de implementação. Confirmado nos seguintes casos:

| Item do board | Board diz | Código real |
|---|---|---|
| Login | Frontend ⬜ | `frontend/app/login/page.tsx` — 210 linhas, formulário completo, integrado a `AuthContext` |
| Cadastro | Frontend ⬜ | `frontend/app/cadastro/page.tsx` — 333 linhas, formulário completo |
| Saiba mais | Frontend ⬜ | `frontend/app/saiba-mais/page.tsx` — 131 linhas, página completa |
| Escolha de escolas | Frontend ⬜ | `frontend/app/selecionar-escola/page.tsx` — busca escolas do usuário via `/api/usuario/:cpf/escolas`, lista completa e funcional |
| Cadastro de escola | Frontend ⬜ | `frontend/app/criar-escola/page.tsx` — formulário completo com upload de logo, `ColorPicker`, validação |
| Cadastro de tarefa | Frontend ⬜ | `frontend/app/dashboard/[escolaGUID]/crud-tarefa/page.tsx` — **1108 linhas** |
| Cadastro de prova | Frontend ⬜ | `frontend/app/dashboard/[escolaGUID]/crud-provaagendada/page.tsx` — **890 linhas** |
| Cadastro do conteúdo | Frontend ⬜ | `frontend/app/dashboard/[escolaGUID]/crud-conteudo/page.tsx` — **757 linhas** |
| Configuração da escola | Frontend ⬜ / Backend 🔁 | `frontend/app/dashboard/[escolaGUID]/configuracoes/page.tsx` — cronograma de turmas, grade horária, intervalos, já implementado e ligado a `lib/api/escolaconfiguracao.api.ts` |
| Tela principal de tarefas (aluno) | Frontend ⬜ | `frontend/app/dashboard/[escolaGUID]/tarefas/page.tsx` — 248 linhas, já lista tarefas |

Isso não invalida os post-its (ajustes de layout, UX, mensagens de erro etc. continuam válidos como pendências reais), mas muda a natureza do trabalho: **não é "criar a tela do zero", é "revisar/ajustar a tela que já existe"** contra os pontos anotados nos post-its.

**Achado secundário — cores fixas fora do design system.** O item já sinalizado para a landing page (`#1cc47b` / `#169162` / `#ebebeb` em vez das variáveis de `frontend/styles/globals.css`) **não é exclusivo da landing page**. O mesmo padrão aparece em:
- `frontend/app/login/page.module.css`
- `frontend/app/cadastro/page.module.css`
- `frontend/app/saiba-mais/page.module.css`
- `frontend/app/criar-escola/page.module.css` (inclusive como valor inicial de estado no `page.tsx`: `useState('#1cc47b')`)

`frontend/app/dashboard/[escolaGUID]/page.module.css` continua sendo a referência correta de uso das CSS Variables (já confirmado em sessão anterior). Vale um rework consolidado dessas 4 telas de auth/institucional, não só da landing page.

---

## 1. Autenticação & Onboarding (pág. 1 do PDF)

### Login
- **Board:** Backend ✅ | Frontend ⬜
- **Post-its (transcrição revisada):** "Colocar uma imagem/ícone na esquerda"; "Jogar o login para a direita"; "Talvez colocar funcionamento como no de fora [referência externa]"; "Talvez colocar o logo [...] no canto" — a caligrafia do 4º post-it segue parcialmente ilegível.
- **Código real:** `frontend/app/login/page.tsx` (210 linhas) + `page.module.css` (cor fixa `#1cc47b` presente). Tela funcional, não um esqueleto.
- **Ação real pendente:** reposicionar imagem/ilustração e formulário conforme post-its + migrar cores para variáveis do design system.

### Cadastro
- **Board:** Backend ✅ | Frontend ⬜
- **Post-its:** "O cadastro já funciona de forma igual ao de login"; "cadastro para a direita"; "ícones pelo cadastro"; "imagem na esquerda".
- **Código real:** `frontend/app/cadastro/page.tsx` (333 linhas), já com validações. `page.module.css` também tem cor fixa.
- **Ação real pendente:** mesmo alinhamento do login (espelhado) + cores.

### Landing-page
- **Board:** Backend ✅ | Frontend ✅
- **Post-its:** "Isso já transmite confiança em você?"; "Não tem nenhuma sugestão de argumentação [de persuasão]?"; "Talvez colocar um argumento/seção de perguntas frequentes?"
- **Código real:** `frontend/app/page.tsx` + `page.module.css` — **já em rework nesta sessão** (agente `frontend` disparado em paralelo a este relatório, usando MCP `claude_design` para importar o design oficial e eliminar `#1cc47b`/`#169162`/`#ebebeb`).
- **Pendência de conteúdo (fora do escopo visual):** os 3 post-its acima são sobre **copy/persuasão**, não layout — vale revisar depois se a página aborda confiança, argumentos de venda e FAQ. Isso é uma decisão de conteúdo, não só de design system.

### Saiba mais
- **Board:** Backend ✅ | Frontend ⬜
- **Post-it:** "Avaliar se essa seta é realmente necessária" (elemento de navegação/scroll).
- **Código real:** `frontend/app/saiba-mais/page.tsx` (131 linhas) já implementado, com cor fixa em `page.module.css`.
- **Ação real pendente:** decidir sobre a seta de navegação + cores do design system.

---

## 2. Escolas (pág. 2)

### Escolha de escolas
- **Board:** Backend 🔁 (em revisão) | Frontend ⬜
- **Post-it:** não existem ainda exemplos/wireframes de referência para essa tela (anotação sobre falta de material de design, não sobre o código).
- **Código real:** `frontend/app/selecionar-escola/page.tsx` já busca e lista escolas do usuário via `/api/usuario/{cpf}/escolas`, com tratamento de loading/erro.
- **Observação:** o board provavelmente marcou Frontend ⬜ porque não há wireframe formal para comparar/validar o visual — não porque a tela não funcione.

### Cadastro de escola
- **Board:** Backend ✅ | Frontend ⬜
- **Post-its:** revisar validação/mensagem de erro no formulário; criar exemplo com mais dados de amostra.
- **Código real:** `frontend/app/criar-escola/page.tsx`, formulário completo com upload de logo (`components/ColorPicker`), validação de e-mail (`lib/validators/email`), mas usa cores fixas em hex como estado inicial.

---

## 3. Dashboard / Masterpage (pág. 2)

- **Board:** Backend 🔁 | Frontend ⬜
- **Post-its (8 ao todo, vários pouco legíveis mesmo na leitura direta do PDF):** reorganizar conteúdo central; dúvida sobre o que exibir no topo; histórico de comunicados recentes; ícones de acesso rápido às matérias; botões de funcionamento/pendências dos professores; identidade visual de entidades (turmas/matérias).
- **Código real:** `frontend/app/dashboard/[escolaGUID]/page.tsx` + `page.module.css` existem (é a página raiz do dashboard, correta em uso das CSS Variables). Não foi possível confirmar em detalhe todos os 8 pontos sem abrir o arquivo por completo — recomenda-se revisão dedicada, é o item mais aberto do board.

---

## 4. Cadastro de Conteúdo Acadêmico (pág. 3)

**Especificação do board:** só professores; cadastro de tarefas, provas e materiais de aula.

### Cadastro de tarefa
- **Board:** Backend ✅ | Frontend ⬜
- **Post-its:** ver se tem algo para mudar; mover histórico de tarefas antigas para outro lugar; histórico deve mostrar só as recém-criadas.
- **Código real:** `frontend/app/dashboard/[escolaGUID]/crud-tarefa/page.tsx` — **1108 linhas**, claramente não um esqueleto. Backend: `backend/controllers/tarefaacademica.controller.ts` + `routes/tarefaacademica.routes.ts`.
- **Ação real pendente:** separar histórico antigo x recente (filtro/UX), não criação da tela.

### Cadastro de prova
- **Board:** Backend ✅ | Frontend ⬜
- **Post-its:** mesmos do item acima.
- **Código real:** `frontend/app/dashboard/[escolaGUID]/crud-provaagendada/page.tsx` — 890 linhas. Backend: `backend/controllers/provaagendada.controller.ts`.

### Cadastro do conteúdo
- **Board:** Backend ✅ | Frontend ⬜
- **Post-its:** permitir anexo de conteúdo de aula; opção de anexo automático do professor; suportar duas opções de anexo (arquivo e link YouTube/MP4).
- **Código real:** `frontend/app/dashboard/[escolaGUID]/crud-conteudo/page.tsx` — 757 linhas. Backend: `backend/controllers/conteudo.controller.ts` + `backend/middlewares/conteudo-upload.middleware.ts` (já existe upload de anexo). **Falta confirmar** se a opção "link do YouTube/MP4" (alternativa ao upload de arquivo) já está implementada no formulário — não verificado em detalhe nesta passada.

---

## 5. Calendário (pág. 4)

**Especificação do board:** visível para qualquer função; calendário geral de eventos, avisos, feriados, comunicados, provas, tarefas e anotações.

### Calendário
- **Board:** Backend ✅ | Frontend ✅ ("pronto" escrito ao lado do checkbox)
- **Post-it:** "ver se tem algo para mudar" (revisão geral, sem item específico).
- **Código real:** `frontend/app/dashboard/[escolaGUID]/calendario/page.tsx` — 858 linhas. Confirmado robusto.

### Modal de dia
- **Board:** Backend ✅ | Frontend ⬜
- **Post-its:** ver se tem algo para mudar; melhorar alinhamento; padronizar cards de evento.
- **Código real:** faz parte do mesmo `calendario/page.tsx` (858 linhas) — não há arquivo separado, é um componente/modal interno. Ação pendente é puramente visual (alinhamento e padronização de cards), não criação.

### Modal anotação
- **Board:** Backend ✅ | Frontend ✅ ("pronto")
- **Post-it:** "ver se tem algo para mudar".
- **Código real:** idem, componente dentro de `calendario/page.tsx`. Backend: `backend/controllers/anotacao.controller.ts`.

---

## 6. Gestão de Dados da Escola (pág. 5)

**Especificação do board:** só direção/coordenação; cadastro de dados da escola (secretaria + coordenação).

### Main page
- **Board:** Backend 🔁 | Frontend ⬜
- **Post-its:** melhorar visual geral; dinamizar os cards de dados (hoje estáticos).
- **Código real:** `frontend/app/dashboard/[escolaGUID]/gestao-dados/page.tsx` existe. Confirma-se via código que os cards mostrados na página (contagem de turmas/matérias/alunos etc.) precisam ser checados se já são dinâmicos ou ainda estáticos — não confirmado em detalhe.

### Tela de dados
- **Board:** Backend ✅ | Frontend ✅
- **Post-it:** incluir filtro de pesquisa na listagem.
- **Código real:** módulo bem populado — `gestao-dados/cursos/page.tsx`, `gestao-dados/alunos/page.tsx`, `gestao-dados/professores/page.tsx`, `gestao-dados/materias/page.tsx`, `gestao-dados/turmas/page.tsx`, `gestao-dados/turmas/[turmaGUID]/cronograma/page.tsx`. Ação pendente: adicionar filtro de pesquisa.

### Tela de importação / Tela de adição
- **Board:** Backend ✅ | Frontend ✅ ("pronto")
- **Post-it:** "ver se tem algo para mudar" em ambas.
- **Código real:** funcionalidade de import via planilha existe (visível na tela do board com "Upload de Planilha"); não localizado arquivo dedicado separado — provavelmente parte das telas de `cursos`/`turmas` listadas acima.

---

## 7. Chat (pág. 6)

**Especificação do board:** qualquer função; conversas individuais e em grupo.

### Main page / Conversa / Lista no grupo
- **Board:** Backend ✅ (nas 3) | Frontend ⬜ (nas 3)
- **Post-its:**
  - Main page: tela lista todos os grupos e conversas; separar grupo x conversas individuais (em abas?); layout inspirado no WhatsApp.
  - Conversa: layout inspirado no Discord; se individual, mostrar foto e nick no topo; se grupo, permitir ver membros em segunda tela.
  - Lista no grupo: funções administrativas para o admin/líder do grupo (kick, promover); layout WhatsApp.
- **Código real:** aqui a marcação ⬜ do board **bate com o código** — não existe nenhuma pasta `chat`/`conversa` sob `frontend/app/dashboard/[escolaGUID]/`. O backend, por outro lado, é sólido: `backend/controllers/conversa.controller.ts` (203 linhas), `backend/websocket/conversa.handler.ts` + `backend/websocket/SocketServer.ts` (infraestrutura de tempo real já existe), `routes/conversa.routes.ts`.
- **Conclusão:** este é o módulo onde o gap frontend é real e total — vale priorizar, já que o backend (incluindo WebSocket) está pronto e sem uso.

#### Especificação proposta

**Estado atual do código (confirmado por leitura):**
- Backend maduro e já documentado: `backend/controllers/conversa.controller.ts` (203 linhas) + `backend/services/conversa.service.ts`, `mensagem.service.ts`, `conversa-individual.service.ts`, `conversa-permissao.service.ts`, `conversa-grupo.service.ts` + `backend/repositories/conversa.repository.ts`, `conversa-grupo.repository.ts`, `mensagem.repository.ts` + `routes/conversa.routes.ts`. Tudo isso já está descrito endpoint a endpoint em `docs/routes/conversa-api.md`.
- WebSocket já implementado: `backend/websocket/conversa.handler.ts` (eventos `join_conversa`, `send_mensagem`, `mark_as_read`, `typing`, `pin_mensagem`, `unpin_mensagem`, `deletar_mensagem`, `editar_mensagem`) + `backend/websocket/SocketServer.ts` (autenticação JWT na conexão, room pessoal `usuario:<CPF>` criada automaticamente para todo usuário conectado — reaproveitável pelo módulo de Notificações, ver seção 8).
- Conversas de grupo são criadas **automaticamente** por outros módulos via `ConversaGrupoService` (`criarGrupoTurma` ao criar Turma; `criarConversaParaGrupoTarefa` ao criar GrupoTarefa) — não existe (nem deve existir) um `POST` direto de "criar grupo" na API de Conversa.
- `MensagemTipo` já reserva `'Texto' | 'Arquivo' | 'Imagem'` no schema (`backend/entities/mensagem.model.ts` / `docs/routes/conversa-api.md`), mas `MensagemService.enviar()` (`backend/services/mensagem.service.ts`) só aceita conteúdo de texto — **não há upload de anexo/imagem para chat implementado**.
- Zero frontend: nenhuma pasta `chat`/`conversa` em `frontend/app/dashboard/[escolaGUID]/`, e `socket.io-client` **não está** nas dependências de `frontend/package.json` — a infraestrutura de conexão WS do lado do cliente também precisa ser criada do zero.
- Padrão reaproveitável para "buscar contato" (iniciar conversa individual): `GET /api/escolaxusuarioxfuncao?EscolaGUID=...` (`routes/escolaxusuarioxfuncao.routes.ts`) já lista usuários vinculados a uma escola com `FuncaoId`.

**Modelo de dados novo/alterado:** nenhum — todo o schema (`conversa`, `conversa_grupo`, `conversa_individual`, `conversa_grupo_membro`, `mensagem`, `mensagem_leitura`, `mensagem_fixada`) já existe e está documentado em `docs/routes/conversa-api.md`. O único ponto em aberto é se upload de anexo em mensagem entra no escopo (ver decisões abaixo).

**Endpoints propostos:**

| Método | Rota | Descrição |
|---|---|---|
| — | — | Nenhum endpoint REST novo necessário para o MVP — os 13 endpoints REST + 7 eventos WS já existentes cobrem list/get/histórico/fixar/deletar/editar/individual/permissões |
| POST | `/api/upload/mensagem/:conversaGUID` ⚠️ A confirmar | Upload de imagem/arquivo anexado a uma mensagem, reaproveitando `backend/middlewares/upload.middleware.ts` (mesmo padrão hoje usado para logo de escola) — só necessário se anexo entrar no escopo do MVP |

**Regras de negócio propostas (mapeando as 3 telas do board):**
- **Main page**: consumir `GET /api/conversa` (já retorna `ConversaTipo`, nome de grupo/parceiro, última mensagem, contagem de não lidas); separar aba Grupo x Individual é decisão de UI sobre um campo que já vem na resposta.
- **Conversa**: `GET /api/conversa/:guid` para o estado inicial (histórico + membros + fixadas), depois `GET /api/conversa/:guid/mensagem?before=` para paginação por scroll; conectar ao WS (`join_conversa` ao abrir a tela, `send_mensagem`/`typing`/`mark_as_read` nas interações do usuário).
- **Lista no grupo** (funções administrativas do board: kick/promover): já coberto pela API existente — `PUT/DELETE /api/conversa/:guid/permissao/representante` e `.../vice-representante` para grupos de Turma (exclusivo de Coordenação/Direção), e pelos endpoints de `GrupoTarefaController`/`ConviteGrupoTarefaController` para grupos de Tarefa (exclusivo do Líder) — não precisa de rota nova, só uma tela que consuma o que já existe.

**Decisões a confirmar com o usuário:**
1. Upload de imagem/arquivo em mensagem entra no escopo do MVP de chat, ou o lançamento inicial é só texto? (o schema já reserva `MensagemTipo='Arquivo'/'Imagem'`, mas não há endpoint de upload nem UI de anexo implementados hoje.) **✅ Decidido (2026-07-19):** entra no MVP. (Nota de execução: a primeira versão do frontend de Chat já foi implementada antes desta resposta chegar, só com texto — upload está sendo adicionado agora como follow-up.)
2. "Iniciar nova conversa individual": qualquer usuário pode iniciar conversa com qualquer outro usuário da mesma escola, ou deve haver alguma restrição por função (ex.: aluno não poder iniciar conversa direta com qualquer professor sem vínculo de turma)? Hoje `ConversaIndividualService.iniciarConversa` não aplica nenhuma restrição além de "CPFs diferentes". **✅ Decidido (2026-07-19):** backend fica livre (sem restrição), mas o botão de "iniciar conversa" só aparece na UI em contextos específicos — ex.: na lista de membros de uma turma (para colegas da mesma turma), e futuramente na tela de matéria (para iniciar chat com o professor daquela matéria). Ou seja, a restrição é de descoberta/UX, não de autorização no backend.
3. As referências do board ("layout inspirado no WhatsApp" para a lista/main page; "inspirado no Discord" para a conversa) são só inspiração visual, ou implicam requisitos funcionais desses produtos (reações a mensagens, respostas em thread, etc.) que hoje não existem no backend? **✅ Decidido (2026-07-19):** inspiração visual, mas reações a mensagens entram no escopo (não apenas visual — é uma feature funcional a implementar).
4. Chegada de nova mensagem deve gerar uma notificação no módulo de Notificações (seção 8) quando o destinatário não está com a conversa aberta, ou o aviso fica isolado dentro do próprio chat (badge de não lida só ao entrar na conversa)? Hoje `NotificacaoService` não dispara nada para mensagens novas — só o WS `nova_mensagem` na room da conversa. **✅ Decidido (2026-07-19):** sim, deve gerar notificação.
5. A conexão WebSocket do frontend para o Chat deve compartilhar a mesma infraestrutura de conexão que o módulo de Notificações vai precisar (ver seção 8), já que ambos dependem do mesmo `SocketServer`? Isso afeta ordem de implementação. **✅ Decidido (2026-07-19):** compartilhada (já implementado assim — `frontend/lib/socket/SocketContext.tsx` monta a conexão no layout do dashboard, reaproveitável por Notificações).

---

## 8. Secretaria (pág. 7)

**Especificação do board:** administrado principalmente pela secretaria, também coordenação/direção.

### Cadastro de eventos
- **Board:** Backend ✅ | Frontend ⬜
- **Post-its:** cadastrar eventos da escola; evento cadastrado vai direto para o calendário.
- **Código real:** `backend/controllers/evento.controller.ts` (285 linhas) + `routes/evento.routes.ts` prontos. Nenhuma pasta frontend dedicada — ⬜ do board confere.

#### Especificação proposta

**Estado atual do código:** CRUD completo já documentado em `docs/routes/evento-api.md` (Create/List/Get/Update/Delete + anexos via `relacaoanexos`, `EventoStatus` `Agendado`/`Realizado`/`Cancelado`, permissão de escrita restrita a Coordenação/Secretaria/Direção). A única leitura hoje é indireta: `frontend/app/dashboard/[escolaGUID]/calendario/page.tsx` já busca e lista eventos para exibição no calendário — mas não há UI de cadastro/edição, a criação só é possível chamando a API diretamente.

**Modelo de dados novo/alterado:** nenhum — schema já existe e documentado em `evento-api.md`.

**Endpoints propostos:** nenhum novo — o CRUD de `POST/GET/PUT/DELETE /api/evento` já cobre o que os post-its pedem, inclusive "evento cadastrado vai direto para o calendário" (já é verdade hoje, pois o calendário lê da mesma fonte de dado).

**Regras de negócio propostas:** formulário reaproveitando o mesmo padrão de anexo já usado em Tarefa/Conteúdo (`relacaoanexos`); campos conforme `evento-api.md` (nome, descrição, data, status).

**Decisões a confirmar com o usuário:**
1. A tela de cadastro de evento deve viver dentro do módulo "Secretaria" (nova rota `frontend/app/dashboard/[escolaGUID]/secretaria/eventos`) ou como um atalho dentro do próprio Calendário, já que "evento cadastrado vai direto pro calendário"? O board trata como páginas separadas (pág. 7 "Secretaria" vs. pág. 4 "Calendário"), mas isso é decisão de navegação/IA. **✅ Decidido (2026-07-19):** nos dois — cadastro acessível tanto de dentro de Secretaria quanto como atalho no Calendário.

### Registro de Auditoria
- **Board:** Backend 🔁 (em revisão) | Frontend ⬜
- **Post-its:** ver ações por usuário da escola; sistema de filtro.
- **Código real:** **não existe controller, rota, entidade ou serviço de auditoria.** A única menção a "auditoria" no backend é um comentário em `backend/Server.ts:229` ("Útil para logging e auditoria") sobre um middleware de pré-roteamento genérico — não há persistência de ações por usuário nem filtro. O 🔁 do board provavelmente reflete essa intenção genérica de logging, mas na prática **a feature em si está mais próxima de ⬜ do que de 🔁**.

#### Especificação proposta

**Estado atual do código:** confirmado ausente. Nenhuma tabela `log_auditoria` (ou equivalente) em `backend/database/sql.txt`. Os dois únicos artefatos relacionados a "auditoria" no repositório são comentários que não implementam nada disso: `backend/repositories/notificacaoenvio.repository.ts:4` ("Auditoria/idempotência de envio por canal") se refere a rastreio de **envio de notificação** (e-mail/WhatsApp), não a log de ações do usuário; e `backend/Server.ts:233` ("Útil para logging e auditoria") descreve um middleware que só imprime requisições HTTP no console, sem persistir nada em banco.

**Modelo de dados novo/alterado necessário:**
```sql
-- ⚠️ Proposta — não existe hoje; nome de tabela e granularidade de "ação" a validar com o time
CREATE TABLE `log_auditoria` (
  `LogAuditoriaGUID`  CHAR(36)     NOT NULL,
  `EscolaGUID`        CHAR(36)     NOT NULL,
  `UsuarioCPF`        VARCHAR(14)  NOT NULL,
  `LogAcao`           VARCHAR(60)  NOT NULL,   -- ex.: 'Criar', 'Atualizar', 'Excluir', 'Login'
  `LogEntidadeTipo`   VARCHAR(60)  NOT NULL,   -- ex.: 'Tarefa', 'Turma', 'Usuario'
  `LogEntidadeGUID`   CHAR(36)     NULL,
  `LogDescricao`      VARCHAR(500) NULL,
  `LogCreatedAt`       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`LogAuditoriaGUID`),
  CONSTRAINT `FK_LogAuditoria_Escola` FOREIGN KEY (`EscolaGUID`) REFERENCES `escola` (`EscolaGUID`),
  CONSTRAINT `FK_LogAuditoria_Usuario` FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario` (`UsuarioCPF`),
  INDEX `idx_log_escola_data` (`EscolaGUID`, `LogCreatedAt`)
);
```

**Endpoints propostos:**

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/auditoria?EscolaGUID=&UsuarioCPF=&LogAcao=&LogEntidadeTipo=&de=&ate=` ⚠️ A confirmar | Lista de ações filtrável, conforme post-it "sistema de filtro" |

**Regras de negócio propostas:**
- Escrita não-bloqueante: cada service de escrita relevante dispara um registro de auditoria no fim da operação, no mesmo espírito de `NotificacaoService.disparar()` (nunca lança erro que derrube a ação principal do usuário).
- Leitura restrita a perfis administrativos da escola (Coordenação/Direção, por analogia às demais rotas administrativas do módulo Secretaria) — ver decisão 2 abaixo.

**Decisões a confirmar com o usuário:**
1. Qual o escopo real de "ações" a auditar? O post-it diz apenas "ver ações por usuário da escola" — isso cobre todo CRUD de todo módulo (Tarefa, Turma, Matéria, Usuário, Conversa etc.) ou só ações administrativas sensíveis (exclusão de registros, mudança de permissão/Representante, criação/edição de usuário)? Auditar tudo exige um hook em dezenas de services; auditar só ações sensíveis é um esforço bem menor. **✅ Decidido (2026-07-19):** todo o módulo — auditar todo CRUD, não só ações sensíveis.
2. Quem pode visualizar o log de auditoria — só Direção, ou também Coordenação/Secretaria? O board só diz "administrado principalmente pela secretaria, também coordenação/direção" para o módulo Secretaria como um todo, não especifica para Auditoria em particular. **✅ Decidido (2026-07-19):** os 3 (Direção, Coordenação e Secretaria podem visualizar).
3. Existe requisito de retenção/expiração do log (ex.: manter só 90 dias) ou é histórico indefinido? **✅ Decidido (2026-07-19):** pode expirar, mas os registros mais sensíveis não expiram (retenção diferenciada por tipo de ação — a granularidade exata de "sensível" fica a definir na implementação).
4. O log deve capturar diff "antes/depois" dos campos alterados, ou só "usuário X fez ação Y na entidade Z" sem detalhe do que mudou? **✅ Decidido (2026-07-19):** só "quem fez o quê" (sem diff antes/depois).

> Nota: as respostas destas 4 perguntas + as 2 de "Cadastro de pendências" logo abaixo vieram fora de ordem sequencial estrita e foram remapeadas por correspondência de conteúdo — mapeamento confirmado pelo usuário em 2026-07-19.

### Cadastro de pendências / Tela de pendência
- **Board:** Backend ✅ | Frontend ⬜ (nas 2)
- **Post-its:** pendência associada a usuário responsável e/ou pendência específica a resolver; tela de pendência deve seguir o padrão da tela de tarefa.
- **Código real:** `backend/controllers/pendencia.controller.ts` (390 linhas) + `routes/pendencia.routes.ts` prontos e robustos. Nenhuma tela frontend dedicada encontrada — ⬜ confere.

#### Especificação proposta

**Estado atual do código:** CRUD completo já documentado em `docs/routes/pendencia-api.md` (Create/List/Get/Update/Delete + contadores de pendentes/atrasadas + marcar como feito + anexos via `relacaoanexos`). `UsuarioCPFDestino` já implementa "pendência associada a um usuário responsável"; `PendenciaFeito`/`PendenciaRealizacaoData` seguem o mesmo padrão de conclusão de Tarefa Acadêmica. Permissão de escrita restrita a Coordenação/Secretaria/Direção; só o próprio destinatário marca como feito. Nenhuma tela frontend encontrada.

**Modelo de dados novo/alterado:** nenhum — schema já existe e documentado em `pendencia-api.md`.

**Endpoints propostos:** nenhum novo — o CRUD existente já cobre os post-its.

**Regras de negócio propostas:** post-it pede "seguir o padrão da tela de tarefa" — reaproveitar layout/UX de `frontend/app/dashboard/[escolaGUID]/crud-tarefa/page.tsx` como referência visual, trocando o modelo de dados de matrícula/turma por destinatário único.

**Decisões a confirmar com o usuário:**
1. Pendência pode ter mais de um destinatário por vez (ex.: lançar a mesma pendência para vários alunos de uma turma de uma vez), ou é sempre 1 pendência = 1 usuário, exigindo repetir a criação para cada um? Hoje `PendenciaController.store`/`pendencia-api.md` só aceitam um `UsuarioCPFDestino` por chamada. **✅ Decidido (2026-07-19):** sim, pode abranger todo o módulo/turma de uma vez (múltiplos destinatários numa única criação) — ver nota de reconstrução acima.
2. Quem pode ver pendências de terceiros na tela: só Coordenação/Secretaria/Direção (como já é a regra do backend), ou também Professor? O board não especifica, e a API atual não dá esse acesso a Professor. **✅ Decidido (2026-07-19):** mantém como está hoje (só Coordenação/Secretaria/Direção; Professor não vê pendências de terceiros).

### Notificações
- **Board:** Backend ⬜ | Frontend ⬜
- **Post-its:** cobrir tudo que o usuário recebe (avisos, tarefas, provas, mensagens); sistema de filtro; envio por e-mail e WhatsApp.
- **Código real (atualizado nesta sessão — corrige a leitura anterior desta linha):** ao contrário do que este relatório registrava antes, **o backend está implementado e em uso**: `backend/services/notificacao.service.ts` (327 linhas) dispara notificações in-app, respeita preferência por tipo/usuário/canal (`UsuarioNotificacaoPreferenciaDAO`), envia e-mail via Resend (`NotificacaoEmailChannel`) e tem canal WhatsApp com interface pronta mas **sem provedor conectado ainda** ("Evolution API é trabalho futuro", conforme a própria `docs/routes/notificacao-api.md`). Emite evento WebSocket `notificacao:nova` na room pessoal `usuario:<CPF>` (todo usuário conectado já entra automaticamente nessa room, ver `backend/websocket/SocketServer.ts`). Rotas REST completas em `routes/notificacao.routes.ts`, documentadas em `docs/routes/notificacao-api.md`. **O frontend também já existe**, e não é mais ⬜: `frontend/app/dashboard/[escolaGUID]/notificacoes/page.tsx` (feed com lista, filtro lida/não lida, marcar como lida/todas) e `frontend/app/dashboard/[escolaGUID]/notificacoes/configuracoes/page.tsx` (preferências por tipo/canal).

#### Especificação proposta

**O que de fato falta ("ponta a ponta" no sentido que o board provavelmente quis dizer):**
1. A página `/notificacoes` **não está linkada em nenhum outro lugar do frontend** — busca por `/notificacoes` no código só retorna ela mesma e a tela de configurações; não há ícone de sino/badge em `frontend/app/dashboard/[escolaGUID]/page.tsx` nem em nenhum layout compartilhado do dashboard.
2. `socket.io-client` **não está instalado** em `frontend/package.json` — o evento `notificacao:nova` que o backend já emite nunca é consumido por nenhum cliente. Hoje a única forma de ver uma notificação nova é entrar manualmente na página e dar refresh; não há toast/atualização em tempo real.

**Modelo de dados novo/alterado:** nenhum — schema completo já existe e documentado em `docs/routes/notificacao-api.md`.

**Endpoints propostos:** nenhum novo — falta só consumo real-time do WS já emitido pelo backend (`notificacao:nova`).

**Regras de negócio propostas:**
- Ícone de sino no header/masterpage do dashboard, com badge de contagem alimentado por `GET /api/notificacao` (contagem de não lidas — nome exato do endpoint conforme `notificacao-api.md`) no carregamento, e atualizado em tempo real via WS.
- Conexão WS única por sessão, reaproveitando a mesma infraestrutura que o módulo de Chat (seção 7) também vai precisar — o backend já coloca automaticamente todo usuário conectado na room pessoal `usuario:<CPF>`, sem exigir nenhum "join" explícito do cliente para notificações.
- Toast/alerta visual ao receber `notificacao:nova` enquanto o usuário está com o app aberto em outra tela.

**Decisões a confirmar com o usuário:**
1. A conexão WebSocket do frontend deve ser uma infraestrutura única e compartilhada entre Chat (seção 7) e Notificações, ou dois módulos independentes? Tecnicamente ambos dependem do mesmo `SocketServer` no backend — compartilhar simplifica, mas amarra a ordem de implementação (se depender do Chat, sai depois dele). **✅ Decidido (2026-07-19):** compartilhada — já implementado assim via `frontend/lib/socket/SocketContext.tsx` no layout do dashboard.
2. O toast de notificação em tempo real deve aparecer em **todas** as telas do dashboard, ou só em algumas? Isso decide onde o "listener" do WS vive (layout raiz do dashboard vs. componente isolado por página). **✅ Decidido (2026-07-19):** em todas as telas do dashboard.
3. Canal WhatsApp: o post-it pede "envio por... WhatsApp", e o código já tem a interface pronta mas sem provedor conectado (Evolution API citada como trabalho futuro). Isso confirma que WhatsApp fica fora do escopo deste ciclo de trabalho? **✅ Decidido (2026-07-19):** sim, o provedor será conectado no futuro, mas fica fora do escopo por ora.
4. Existe limite de paginação/retenção para o feed de notificações (quantas mostrar por padrão, por quanto tempo ficam disponíveis) ou é lista completa sem paginação? Não verificado nesta sessão se `NotificacaoDAO.findAllByUsuario` já pagina. **✅ Decidido (2026-07-19):** nada definido ainda — fica em aberto para decisão futura.

---

## 9. Matérias (pág. 8)

**Especificação do board:** só professores (admins da matéria) e alunos; professor vê tarefas da turma e material que fez upload; aluno vê tudo que o professor postou de forma facilitada.

### Tela geral das matérias / Tela específica da matéria / Prova (visão do aluno) / Tarefa (visão do aluno)
- **Board:** Backend ⬜ | Frontend ⬜ (nas 4)
- **Post-its relevantes:** card por matéria + filtro + clique leva à tela específica; conteúdos organizados por data; aluno revisa notas da prova e recebe **recomendações de estudo geradas por IA**; professor pode anexar vídeo-resumo; aluno pode anexar tarefa quando entrega for digital; descrição da tarefa em destaque no topo.
- **Código real:** existe `backend/controllers/materia.controller.ts` + `routes/materia.routes.ts`, mas é um CRUD básico de matéria (usado como cadastro/lookup em `gestao-dados/materias`), **não** as telas específicas de matéria descritas aqui (feed do professor, visão do aluno, notas, recomendação por IA). A pasta `backend/ai/` existe mas contém apenas `README.txt` — nenhuma lógica de recomendação por IA implementada ainda. O board está correto: este módulo é pendente ponta a ponta, e é o único que menciona uma feature de IA ainda não iniciada.

#### Especificação proposta

**Estado atual do código (confirmado por leitura):**
- `backend/controllers/materia.controller.ts`: CRUD puro (nome, se é técnica, status, vínculo com escola) — sem endpoint de "feed" ou "tela específica". Documentado em `docs/routes/materia-api.md`.
- `backend/ai/README.txt`: só descreve a responsabilidade planejada da camada de IA (orquestrar agentes: `StudyPlannerAgent`, `PerformanceAnalyzerAgent`, `ContentRecommendationAgent`, um `AIProvider` genérico tipo OpenAI) — **nenhum código implementado**, é puramente um plano de arquitetura.
- **Lacuna de dado crítica:** `backend/entities/provaagendada.model.ts` não tem nenhum campo de nota/resultado (`Nota`, `ProvaNota` etc. — grep confirmou ausência total). Não existe hoje nenhuma tabela/entidade que registre a nota do aluno em uma prova. A "recomendação de estudo baseada nas notas da prova" citada no post-it não tem hoje nenhum dado de origem — é pré-requisito de modelo de dados, não só de agente de IA.
- Conteúdo de aula (`backend/controllers/conteudo.controller.ts` + `backend/middlewares/conteudo-upload.middleware.ts`) já suporta anexo de arquivo; não confirmado nesta sessão se já suporta link de vídeo (YouTube/MP4) como alternativa ao upload (ver seção 4 deste relatório, item já marcado como pendente de verificação).

**Modelo de dados novo/alterado necessário:**
```sql
-- ⚠️ Proposta — não existe hoje; nome de tabela/campos a validar com o time
CREATE TABLE `prova_nota` (
  `ProvaNotaGUID`       CHAR(36)     NOT NULL,
  `ProvaAgendadaGUID`   CHAR(36)     NOT NULL,
  `AlunoUsuarioCPF`     VARCHAR(14)  NOT NULL,
  `ProvaNotaValor`      DECIMAL(4,2) NOT NULL,
  `ProvaNotaLancadaEm`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ProvaNotaGUID`),
  UNIQUE KEY `UK_ProvaNota_Aluno` (`ProvaAgendadaGUID`, `AlunoUsuarioCPF`),
  CONSTRAINT `FK_ProvaNota_Prova` FOREIGN KEY (`ProvaAgendadaGUID`) REFERENCES `provaagendada` (`ProvaAgendadaGUID`),
  CONSTRAINT `FK_ProvaNota_Aluno` FOREIGN KEY (`AlunoUsuarioCPF`) REFERENCES `usuario` (`UsuarioCPF`)
);
```
Sem essa tabela (ou equivalente), não há dado de entrada para nenhuma recomendação por IA baseada em desempenho.

**Endpoints propostos:**

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/materia/:guid/feed` ⚠️ A confirmar nome | Tela específica da matéria: conteúdos + tarefas + provas da matéria, organizados por data |
| POST | `/api/provaagendada/:guid/nota` ⚠️ A confirmar | Professor lança a nota do aluno na prova (pré-requisito de dado para a IA) |
| GET | `/api/provaagendada/:guid/nota/:alunoCPF` ⚠️ A confirmar | Aluno consulta a própria nota |
| POST | `/api/ai/recomendacao-estudo` ⚠️ A confirmar | Aluno solicita recomendação de estudo gerada por IA a partir do histórico de notas |

**Regras de negócio propostas:**
- Tela geral das matérias: card por matéria (dado já suficiente em `materia-api.md`) + filtro; clique leva à tela específica.
- Tela específica da matéria: conteúdos organizados por data (campo de data já existe em Conteúdo); separação de visão Professor (admin da matéria, pode postar) x Aluno (só consome).
- Prova (visão do aluno): mostrar nota lançada + acionar recomendação de estudo por IA.
- Tarefa (visão do aluno): descrição em destaque no topo; permitir anexo de entrega quando a entrega for digital (não confirmado se já existe endpoint de "entrega de tarefa pelo aluno" — marcar como ⚠️ A confirmar).

**Decisões a confirmar com o usuário:**
1. A "recomendação de estudo gerada por IA" é baseada em qual dado de entrada: só a nota final da prova, respostas por questão (o que exigiria modelar questão/gabarito, que não existe hoje), frequência de acesso ao conteúdo, ou uma combinação? Isso muda completamente o modelo de dados necessário. **✅ Decidido (2026-07-19):** adiado — "veremos futuramente sobre IA" (fora do escopo imediato).
2. Qual provedor de IA será usado (OpenAI ou outro) e há orçamento/chave de API já disponível? `backend/ai/README.txt` cita "AIProvider (OpenAI, etc.)" só como exemplo, não como decisão fechada. **✅ Decidido (2026-07-19):** mesma decisão do item 1 — adiado.
3. Lançamento de nota é responsabilidade de qual função — só o Professor da matéria, ou também Coordenação/Secretaria podem lançar/corrigir? **✅ Decidido (2026-07-19):** só o professor criador da tarefa/prova.
4. "Aluno pode anexar tarefa quando entrega for digital" (post-it) — isso implica um fluxo de entrega/submissão de tarefa (aluno sobe arquivo, professor avalia) que não existe hoje em `tarefaacademica`. Esse fluxo de "entrega" é parte do escopo deste módulo (Matérias) ou de uma feature separada? **✅ Decidido (2026-07-19):** faz parte do escopo de Matérias.
5. "Professor pode anexar vídeo-resumo" — vídeo é upload de arquivo (MP4) ou link externo (YouTube)? Decide se reaproveita `conteudo-upload.middleware.ts` (upload) ou só precisa de um campo de URL. **✅ Decidido (2026-07-19):** pode ser os dois (upload de arquivo OU link externo).

---

## 10. Tarefas do Aluno (pág. 9)

**Especificação do board:** só alunos; foco em organização.

### Tela principal de tarefas
- **Board:** Backend ✅ | Frontend ⬜
- **Post-its:** hoje reúne tarefas de todas as matérias misturadas — separar/ordenar cronologicamente; facilitar visualização das pendentes; clicar na tarefa redireciona para a tela detalhada do módulo 4.
- **Código real:** `frontend/app/dashboard/[escolaGUID]/tarefas/page.tsx` (248 linhas) **já existe e já lista tarefas** — não é uma tela vazia. Backend: `backend/controllers/tarefaacademica.controller.ts`.
- **Ação real pendente:** validar se já ordena cronologicamente/separa pendentes e se o clique já redireciona corretamente — ajuste de UX sobre uma base existente, não criação do zero.

### Tarefa compartilhada
- **Board:** Backend ✅ | Frontend ⬜
- **Post-its:** buscar grupos disponíveis para a turma; convidar pessoas se o aluno for líder do grupo.
- **Código real:** backend robusto — `backend/controllers/grupotarefa.controller.ts` (198 linhas) + `backend/controllers/convitegrupotarefa.controller.ts` + rotas correspondentes. Não encontrada tela frontend dedicada dentro de `tarefas/` — ⬜ do board parece correto aqui.

---

## 11. Configurações (pág. 10)

### Configuração do usuário
- **Board:** Backend ⬜ | Frontend ⬜
- **Post-its:** alterar informação cadastral; alterar foto; "modo daltônico?" (paleta acessível).
- **Código real:** confirmado ausente — não há rota/controller de "configuração de usuário" nem tela dedicada (diferente da configuração de *escola*, ver abaixo). Board correto.

#### Especificação proposta

**Estado atual do código (confirmado por leitura):**
- `backend/entities/usuario.model.ts` não tem campo de foto/avatar nem preferência de paleta/modo daltônico (grep nos getters/setters confirma só `UsuarioCPF`, `UsuarioEmail`, `UsuarioNome`, `UsuarioSenha`, `UsuarioEmailVerificado`).
- `routes/usuario.routes.ts` já tem `PUT /api/usuario/:UsuarioCPF` (atualizar usuário, via `UsuarioMiddleware.validateUpdateBody` + `UsuarioService`) — cobre alteração de dado cadastral básico, mas não foto nem preferências visuais.
- Padrão reaproveitável para upload de foto: `backend/middlewares/upload.middleware.ts` (multer em memória + Cloudflare R2, hoje usado só para logo de escola via `routes/upload.routes.ts` → `POST /api/upload/logo/:EscolaGUID` e `DELETE /api/upload/logo/:EscolaGUID`, implementados em `UploadService`/`UploadController`). O mesmo padrão pode virar `POST/DELETE /api/upload/foto-usuario/:UsuarioCPF`.
- Nenhuma tela dedicada em `frontend/app`.

**Modelo de dados novo/alterado necessário:**
```sql
-- ⚠️ Proposta — adicionar coluna em usuario existente
ALTER TABLE `usuario`
  ADD COLUMN `UsuarioFotoUrl` VARCHAR(500) NULL AFTER `UsuarioEmail`;

-- ⚠️ Proposta — só necessária se "modo daltônico" for persistido por usuário (ver decisão 1)
CREATE TABLE `usuario_preferencia_acessibilidade` (
  `UsuarioCPF`      VARCHAR(14) NOT NULL,
  `PaletaAcessivel` ENUM('Padrao','Protanopia','Deuteranopia','Tritanopia') NOT NULL DEFAULT 'Padrao',
  `UpdatedAt`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`UsuarioCPF`),
  CONSTRAINT `FK_UsuarioPrefAcess_Usuario` FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario` (`UsuarioCPF`)
);
```

**Endpoints propostos:**

| Método | Rota | Descrição |
|---|---|---|
| PUT | `/api/usuario/:UsuarioCPF` | Já existe — reaproveitar para alterar nome/e-mail |
| POST | `/api/upload/foto-usuario/:UsuarioCPF` ⚠️ A confirmar | Upload de foto de perfil, reaproveitando `upload.middleware.ts` |
| DELETE | `/api/upload/foto-usuario/:UsuarioCPF` ⚠️ A confirmar | Remove foto, mesmo padrão de `DELETE /api/upload/logo/:EscolaGUID` |
| GET/PUT | `/api/usuario/:UsuarioCPF/acessibilidade` ⚠️ A confirmar | Ler/gravar preferência de paleta acessível, se optado por persistência em banco |

**Regras de negócio propostas:**
- Alterar informação cadastral: reaproveita `PUT /api/usuario/:UsuarioCPF` já existente — checar se os campos que a tela vai expor (nome, e-mail) já são cobertos por `UsuarioMiddleware.validateUpdateBody` (não confirmado em detalhe nesta sessão).
- Alterar foto: novo endpoint de upload, mesmo padrão e limites do logo de escola (1MB, PNG/JPG/JPEG) salvo decisão em contrário.
- Modo daltônico/paleta acessível: se for só front-end (CSS Variables + `localStorage`), não precisa de endpoint novo; se precisar sincronizar entre dispositivos, precisa da tabela nova acima.

**Decisões a confirmar com o usuário:**
1. "Modo daltônico" deve ser uma preferência persistida no backend (sincroniza entre dispositivos) ou puramente local (`localStorage` no navegador, sem tocar o backend)? Decide se `usuario_preferencia_acessibilidade` é necessária. **✅ Decidido (2026-07-19):** multi-dispositivo (persistida no backend).
2. Quais tipos de daltonismo o "modo daltônico" deve cobrir — um único modo genérico de alto contraste, ou paletas específicas (protanopia/deuteranopia/tritanopia)? Decisão de design system, não só de dado. **✅ Decidido (2026-07-19):** tipos específicos (protanopia/deuteranopia/tritanopia), não um modo genérico único.
3. A tela de "Configuração do usuário" também deve permitir troca de senha? O board só cita "informação cadastral" e "foto" — não menciona senha explicitamente, mas é comum em telas de perfil. Hoje não foi encontrado endpoint de troca de senha autenticada (fora do fluxo de "esqueci minha senha", não verificado nesta sessão). **✅ Decidido (2026-07-19):** sim — a tela deve cobrir dado cadastral (incluindo e-mail e telefone), foto, e troca de senha.
4. Upload de foto de usuário tem os mesmos limites do logo de escola (1MB, PNG/JPG/JPEG) ou limites diferentes? **✅ Decidido (2026-07-19):** sim, mesmos limites do logo de escola.
5. Existe alguma regra de moderação/aprovação de foto de perfil (ex.: escola precisa aprovar foto de aluno menor de idade) ou o upload é livre e imediato, como já é para o logo de escola? **✅ Decidido (2026-07-19):** livre e imediato por ora; moderação é uma evolução futura.

### Configuração da escola
- **Board:** Backend 🔁 | Frontend ⬜
- **Post-its:** só acesso direção/coordenação; informar cronograma das turmas; alterar informações da escola; avaliar restringir customização de cor ao representante legal da escola.
- **Código real:** **discrepância relevante** — `frontend/app/dashboard/[escolaGUID]/configuracoes/page.tsx` já implementa cronograma de turmas, grade horária, dias letivos e intervalos, consumindo `lib/api/escolaconfiguracao.api.ts`. Backend: `backend/controllers/escolaconfiguracao.controller.ts` + `routes/escolaconfiguracao.routes.ts` também existem. O board marca Frontend ⬜, mas a tela de cronograma (um dos 4 post-its) já está pronta. **O que falta de fato**, pelo que dá para inferir sem abrir o arquivo por completo: alterar informações gerais da escola (nome/e-mail/logo fora do cronograma) e a regra de restringir customização de cor ao representante legal — vale confirmar com o board original quais dessas ainda não estão na tela atual.

---

## 12. Módulo em standby (pág. 11)

- Texto literal do post-it: **"a mimir, volte mais tarde nesse módulo"** — confirmado na leitura direta do PDF, sem mais contexto. Não há nome de módulo nem especificação. Nenhuma pista adicional encontrada no código que sugira qual conteúdo estava planejado aqui.
- **Ação:** só a equipe consegue esclarecer o que essa página reservava.

---

## 13. Projetos / Hackathon (pág. 12)

**Especificação do board:** só professores (criadores) e alunos; cenários como feira técnica/hackathon; como uma "tarefa compartilhada" mas para a escola inteira ou público definido pelo professor.

### Tela de criação de projeto / Tela de ver grupos e criar
- **Board:** Backend ⬜ | Frontend ⬜ (nas 2)
- **Post-its:** professor cria a ideia do projeto e a mecânica de pontuação; alunos criam grupos com suas "propostas"; grupo pode ser aberto ao público ou fechado por convite; avaliar se professor também pode adicionar/remover integrantes de grupos já formados.
- **Código real:** confirmado — nenhuma entidade, controller ou rota com "projeto"/"hackathon" no backend. Nada em frontend também. Board correto, módulo 100% não iniciado.

---

## Resumo — onde o board e o código concordam vs. divergem

| Concordam (⬜ = realmente não existe) | Divergem (⬜ no board, mas já existe código real) |
|---|---|
| Chat (main page, conversa, lista no grupo) | Login, Cadastro, Saiba mais |
| Secretaria: cadastro de eventos, cadastro/tela de pendência | Escolha de escolas, Cadastro de escola |
| Notificações (ponta a ponta)* | Cadastro de tarefa, prova, conteúdo (crud-tarefa/crud-provaagendada/crud-conteudo) |
| Matérias (as 4 telas, incl. recomendação por IA) | Modal de dia (dentro do calendário já implementado) |
| Tarefa compartilhada (frontend) | Tela principal de tarefas do aluno |
| Configuração do usuário | Configuração da escola (parcialmente — cronograma já pronto) |
| Projetos/Hackathon (ponta a ponta) | — |
| Registro de Auditoria (mais perto de ⬜ do que de 🔁) | — |

\* **Correção (sessão de especificação, ver seção 8 → "Notificações" → Especificação proposta):** ao investigar mais a fundo para propor a especificação técnica, confirmou-se que **backend e frontend de Notificações já existem e estão implementados** (`backend/services/notificacao.service.ts`, `docs/routes/notificacao-api.md`, `frontend/app/dashboard/[escolaGUID]/notificacoes/page.tsx` e `.../notificacoes/configuracoes/page.tsx`) — portanto este item na verdade pertenceria à coluna "Divergem", não a "Concordam". O gap real remanescente é mais estreito do que "ponta a ponta" sugere: falta só (1) linkar a página de notificações em algum ponto de navegação do dashboard (hoje é uma página órfã) e (2) o frontend consumir o evento WebSocket `notificacao:nova` que o backend já emite, para atualização em tempo real (badge/toast) — ver detalhes na especificação proposta da seção 8.

**Recomendação prática:** ao planejar o próximo sprint de frontend, tratar a coluna da esquerda como "criar do zero" e a da direita como "revisar/ajustar contra os post-its" — são esforços de tamanho muito diferentes, e o board sozinho não deixa essa distinção clara.
