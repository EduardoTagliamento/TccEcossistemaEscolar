# Relatório: Board Bauá x Estado real do código

> Fonte primária: `Bauá (1).pdf` (12 páginas, board Kanban com post-its), lido diretamente nesta sessão em alta resolução — a transcrição abaixo corrige pontos que estavam ilegíveis em `docs/PENDENCIAS_BAUA.md`.
> Método: para cada item do board, o diretório do projeto foi inspecionado (rotas, controllers, entidades, páginas Next.js) para confirmar se o checkbox do board (✅/🔁/⬜) reflete o estado real do repositório.
> Data: 2026-07-17.

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

---

## 8. Secretaria (pág. 7)

**Especificação do board:** administrado principalmente pela secretaria, também coordenação/direção.

### Cadastro de eventos
- **Board:** Backend ✅ | Frontend ⬜
- **Post-its:** cadastrar eventos da escola; evento cadastrado vai direto para o calendário.
- **Código real:** `backend/controllers/evento.controller.ts` (285 linhas) + `routes/evento.routes.ts` prontos. Nenhuma pasta frontend dedicada — ⬜ do board confere.

### Registro de Auditoria
- **Board:** Backend 🔁 (em revisão) | Frontend ⬜
- **Post-its:** ver ações por usuário da escola; sistema de filtro.
- **Código real:** **não existe controller, rota, entidade ou serviço de auditoria.** A única menção a "auditoria" no backend é um comentário em `backend/Server.ts:229` ("Útil para logging e auditoria") sobre um middleware de pré-roteamento genérico — não há persistência de ações por usuário nem filtro. O 🔁 do board provavelmente reflete essa intenção genérica de logging, mas na prática **a feature em si está mais próxima de ⬜ do que de 🔁**.

### Cadastro de pendências / Tela de pendência
- **Board:** Backend ✅ | Frontend ⬜ (nas 2)
- **Post-its:** pendência associada a usuário responsável e/ou pendência específica a resolver; tela de pendência deve seguir o padrão da tela de tarefa.
- **Código real:** `backend/controllers/pendencia.controller.ts` (390 linhas) + `routes/pendencia.routes.ts` prontos e robustos. Nenhuma tela frontend dedicada encontrada — ⬜ confere.

### Notificações
- **Board:** Backend ⬜ | Frontend ⬜
- **Post-its:** cobrir tudo que o usuário recebe (avisos, tarefas, provas, mensagens); sistema de filtro; envio por e-mail e WhatsApp.
- **Código real:** confirmado — nenhuma rota, controller ou entidade de notificação no backend. Item genuinamente não iniciado nas duas pontas, como o board indica.

---

## 9. Matérias (pág. 8)

**Especificação do board:** só professores (admins da matéria) e alunos; professor vê tarefas da turma e material que fez upload; aluno vê tudo que o professor postou de forma facilitada.

### Tela geral das matérias / Tela específica da matéria / Prova (visão do aluno) / Tarefa (visão do aluno)
- **Board:** Backend ⬜ | Frontend ⬜ (nas 4)
- **Post-its relevantes:** card por matéria + filtro + clique leva à tela específica; conteúdos organizados por data; aluno revisa notas da prova e recebe **recomendações de estudo geradas por IA**; professor pode anexar vídeo-resumo; aluno pode anexar tarefa quando entrega for digital; descrição da tarefa em destaque no topo.
- **Código real:** existe `backend/controllers/materia.controller.ts` + `routes/materia.routes.ts`, mas é um CRUD básico de matéria (usado como cadastro/lookup em `gestao-dados/materias`), **não** as telas específicas de matéria descritas aqui (feed do professor, visão do aluno, notas, recomendação por IA). A pasta `backend/ai/` existe mas contém apenas `README.txt` — nenhuma lógica de recomendação por IA implementada ainda. O board está correto: este módulo é pendente ponta a ponta, e é o único que menciona uma feature de IA ainda não iniciada.

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
| Notificações (ponta a ponta) | Cadastro de tarefa, prova, conteúdo (crud-tarefa/crud-provaagendada/crud-conteudo) |
| Matérias (as 4 telas, incl. recomendação por IA) | Modal de dia (dentro do calendário já implementado) |
| Tarefa compartilhada (frontend) | Tela principal de tarefas do aluno |
| Configuração do usuário | Configuração da escola (parcialmente — cronograma já pronto) |
| Projetos/Hackathon (ponta a ponta) | — |
| Registro de Auditoria (mais perto de ⬜ do que de 🔁) | — |

**Recomendação prática:** ao planejar o próximo sprint de frontend, tratar a coluna da esquerda como "criar do zero" e a da direita como "revisar/ajustar contra os post-its" — são esforços de tamanho muito diferentes, e o board sozinho não deixa essa distinção clara.
