# Ecossistema Escolar (Bauá)

> Última atualização: 2026-07-23. Este arquivo é um resumo vivo para orientar sessões do Claude Code neste repositório — não repete o que já está em `.github/claude-instructions.md` (fonte canônica de padrões) nem em `docs/RELATORIO_BAUA_CODIGO.md` / `docs/PENDENCIAS_BAUA.md` (histórico detalhado do levantamento feito contra o board de planejamento). Consulte esses três arquivos quando precisar de mais profundidade.

## 1. Do que se trata o projeto

**Bauá — Ecossistema Escolar** é um TCC: uma plataforma educacional inspirada no Google Classroom, para gestão de escolas, turmas, conteúdo acadêmico, comunicação e (futuramente) recomendações via IA. Atende três perfis: alunos, professores/coordenação/secretaria e a escola como entidade multi-tenant (cada escola tem tema de cores e dados próprios, isolados por `EscolaGUID`).

- **Autor:** Eduardo Tagliamento (+ Henrique Cruz, Vithor Maximus)
- **Backend:** Node.js + TypeScript + Express + MySQL 8, hospedado no Railway (deploy automático a cada push em `main`)
- **Frontend:** Next.js 14 (App Router) + React 18 + TypeScript, também no Railway
- **Escopo funcional:** autenticação, escolas, turmas/cursos/matérias, tarefas e provas, calendário, chat em tempo real (WebSocket), notificações, projetos/hackathon, registro de auditoria, gestão de dados via planilha

## 2. Patterns do projeto

Fonte canônica e completa: **`.github/claude-instructions.md`**. Resumo do que importa lembrar ao editar código:

- **Arquitetura MVC em camadas estritas:** `Middleware → Controller → Service → DAO (Repository) → Database`, com `Entities` como domínio. Cada camada só conhece a camada imediatamente abaixo — nunca pule camadas (ex.: controller não toca DAO/pool direto).
- **Nomenclatura:** Controllers `*Control` (`*.controller.ts`), Services `*Service` (`*.service.ts`), DAOs `*DAO` (`*.repository.ts`), Entities `*.model.ts`, Middlewares `*.middleware.ts`, Routers `*Roteador` (`*.routes.ts` + factory function com DI manual).
- **Métodos CRUD:** controller `store/index/show/update/destroy` ↔ DAO `create/findAll/findByGUID/update/delete`.
- **Encapsulamento:** sempre `#campo` (privado JS nativo), nunca `private` do TypeScript. Getters/setters validam e normalizam.
- **DTOs obrigatórios:** entidade nunca é exposta na API. Service converte para DTO (Buffer → base64, Date → ISOString).
- **Banco:** notação húngara `TabelaNomeCampo` (ex.: `EscolaGUID`, `UsuarioCPF`), tudo `CHAR(36)` UUID v4 (nunca autoincrement), queries sempre parametrizadas (`?`), status em string PT-BR (`"Ativa"/"Inativa"` etc.).
- **Singleton do banco:** sempre `MysqlDatabase.getInstance()`, nunca `new MysqlDatabase()`.
- **Erros:** `ErrorResponse(statusCode, message, details?)` lançado em service/DAO/middleware; controller sempre `try/catch → next(error)`; handler global em `Server.ts` formata `{ success, message, data|details }`.
- **Async/await sempre**, nunca `.then()/.catch()`.
- **Logging com emojis** por camada (`⬆️` constructor, `🔵` controller, `🟣` service, `🟢` DAO, `🔷` middleware) — todo método loga na primeira linha.
- **Auth:** JWT em `Authorization: Bearer`, 24h, decodificado por `AuthMiddleware.authenticate` → `req.user`; bcrypt 10 rounds.
- **Idioma do código:** português em variáveis, métodos, mensagens e nomes de tabela/campo.
- **Workflow de feature nova:** Entity → SQL/migration → DAO → Service → Middleware → Controller → Router → registrar em `Server.ts`.

> ⚠️ Existe uma segunda pasta `.github/copilot-instructions/` com convenções ligeiramente divergentes (usa `bind()` em vez de arrow functions, `private`/getters `getX()` em vez de `#campo`). Ela parece mais antiga — **`.github/claude-instructions.md` é a referência que bate com o código real** e deve prevalecer em caso de conflito.

Pastas-chave: `backend/{controllers,services,repositories,entities,middlewares,database,external,websocket}`, `routes/*.routes.ts` (DI wiring), `frontend/app/**` (App Router — `frontend/pages` e `frontend/src` são resíduos legados não usados), `docs/routes/*-api.md` (documentação Swagger-like por módulo).

## 3. Estado atual — o que falta fazer

Quase todo o backend REST já existe e está registrado em `backend/Server.ts` (30+ módulos). O trabalho restante é majoritariamente **frontend, refinamento de UX e um módulo novo (Matérias)**. Lista abaixo verificada diretamente contra o código em 2026-07-23 (não apenas contra os relatórios antigos, que ficaram parcialmente desatualizados pelos commits de 20–22/07).

### 🔴 Módulo não iniciado: Matérias (visão professor/aluno)
- Existe apenas o CRUD administrativo básico (`gestao-dados/materias`, cadastro/lookup). **Não existem** as telas reais do módulo:
  - Tela geral das matérias (card por matéria + filtro)
  - Tela específica da matéria (materiais/provas/vídeos por data)
  - Visão do aluno na prova (notas + recomendação de estudo por IA)
  - Visão do aluno na tarefa (entrega digital de anexo pelo aluno)
- Tabela `prova_nota` (lançamento de notas) ainda não existe.
- Recomendação por IA: **adiada deliberadamente** pelo usuário ("veremos futuramente sobre IA") — não é esquecimento, é decisão de escopo. `backend/ai/` só tem `README.txt`.

### 🟢 Chat — concluído (2026-07-23)
- [x] Lista de conversas, mensagens em tempo real (WebSocket), digitando, fixar/editar/apagar, anexos de imagem/arquivo
- [x] Bolha de chat minimizada ao navegar para fora da tela (`MinimizedChatBubble` + `ChatUIContext`)
- [x] Reações a mensagens — tabela `mensagem_reacao`, múltiplas reações simultâneas por usuário (não single-reaction), REST + WebSocket (`docs/PLANO_IMPLEMENTACAO_CHAT_MELHORIAS.md`)
- [x] UI de gestão de grupo — modal `GerenciarGrupoModal`: promover/remover Representante e Vice-Representante (Turma); expulsar membro (Tarefa, reaproveitando `expulsarMembro` do módulo GrupoTarefa que já existia)
- [x] Recibo de leitura visual — ✓/✓✓ em conversas individuais **e em grupos** (`Leitores[]` no `MensagemDTO`, decisão do usuário — ampliou o escopo original que previa só individual)
- Pendências residuais de menor impacto (não bloqueiam uso): notificação in-app ao reagir, ordenação de chips por reação mais recente — ver seção 7 de `docs/PLANO_IMPLEMENTACAO_CHAT_MELHORIAS.md`

### 🟡 Notificações (backend/frontend prontos, falta tempo real)
- [x] Catálogo de tipos, preferências por usuário, e-mail via Resend, tela de notificações + configurações, dropdown no sino da navbar
- [ ] Toast em tempo real ouvindo `notificacao:nova` via WebSocket em todas as telas (decisão confirmada, não implementado — dropdown hoje só busca ao abrir)
- [ ] Canal WhatsApp — **stub proposital** (`notificacaoWhatsapp.channel.ts` não envia nada de verdade); fora de escopo até integrar Evolution API
- [ ] Paginação/retenção do feed — sem decisão fechada

### 🟢 Secretaria — praticamente concluído
- [x] Cadastro de eventos (`cadastro-evento`) e gestão de pendências (`cadastro-pendencia`, `pendencias`) já têm tela
- [x] Registro de Auditoria — implementado ponta a ponta (controller/service/migration + tela `auditoria/page.tsx`, 404 linhas)

### 🟡 Configurações
- **Usuário:** [x] dados cadastrais, foto, senha, preferências de acessibilidade (tema/daltônico/fonte/movimento/contraste) — tela `/perfil` completa
- **Escola:** [x] cronograma de turmas/grade horária e edição de nome já existem em `configuracoes/page.tsx`
  - [ ] Restringir customização de cor ao representante legal da escola (regra de permissão ainda não avaliada/implementada)
  - [ ] Confirmar se edição de e-mail/logo da escola está coberta fora do cronograma

### 🟡 Auth / institucional (Login, Cadastro, Saiba mais, Landing, Criar escola)
- [x] Cores fixas em hex já migradas para CSS Variables do design system em `login`, `cadastro`, `criar-escola` e landing page
- [ ] `frontend/app/saiba-mais/page.module.css` ainda tem cores fixas (`#1cc47b`/`#169162`) — único arquivo pendente dessa limpeza
- [ ] Reposicionamento de layout conforme post-its do board (imagem à esquerda/formulário à direita, espelhado em login/cadastro) — ajuste visual, não criação
- [ ] Revisão de copy/persuasão da landing page (confiança, argumentos de venda, FAQ) — decisão de conteúdo, não de layout

### 🟢 Gestão de Dados da Escola — praticamente concluído
- [x] Filtro de busca já implementado em `gestao-dados/alunos` e `gestao-dados/turmas`
- [ ] Confirmar se os cards da home de Gestão de Dados já são dinâmicos (ainda não verificado em detalhe)

### ⚪ Itens em aberto sem dono claro
- [x] ~~Migrations com execução não confirmada~~ — confirmado em 2026-07-23 via agente `mysql`: todas as migrations até `2026-07-22` já estavam aplicadas em produção; a migration nova de chat (`2026-07-23-chat-melhorias.sql`, tabela `mensagem_reacao`) também já foi aplicada. **Nota:** `SHOW CREATE TABLE`/`INFORMATION_SCHEMA` exibem `?` para 5 dos 6 emojis do ENUM `ReacaoEmoji` — confirmado, por teste funcional de INSERT/SELECT, que é só um bug cosmético de exibição do MySQL 9.4 para caracteres de 4 bytes, não corrupção de dado real.
- [ ] "Módulo em standby" (pág. 11 do board original): anotação ilegível ("a mimir, volte mais tarde nesse módulo") — só a equipe consegue esclarecer o escopo
- [ ] `frontend/refs/Dashboard_ref.png` parece ser de outro projeto ("Ferretto") — confirmar se é o arquivo errado antes de reusar como referência de design
- [ ] Cobertura de CSS para tema escuro/daltônico/alto-contraste está limitada a `globals.css` + navbar + home do dashboard + perfil + config. da escola — resto do app (gestão de dados, calendário, tarefas, chat, projetos) ainda não coberto

## 4. Onde olhar para mais detalhe

- `.github/claude-instructions.md` — padrões de arquitetura e convenções (fonte da verdade)
- `docs/RELATORIO_BAUA_CODIGO.md` — auditoria detalhada board×código (2026-07-17/19), com o "porquê" de cada pendência
- `docs/PENDENCIAS_BAUA.md` — leitura original do board de planejamento (post-its)
- `docs/routes/*-api.md` — documentação de cada rota de API
- `docs/PLANO_IMPLEMENTACAO_*.md` — specs de features implementadas recentemente (projetos, notificações, chat, auditoria, etc.)
