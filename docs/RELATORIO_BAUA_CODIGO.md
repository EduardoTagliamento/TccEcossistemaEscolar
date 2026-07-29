# Relatório: Board Bauá x Estado real do código

> ⚠️ **A partir de 2026-07-29, "o que falta fazer" vive em `docs/RELATORIO_BAUA_CODIGO_2.md`** — lista enxuta, só de pendências, sem a narrativa/justificativas. Este arquivo continua sendo a fonte da auditoria completa (board Kanban x código, comparação seção por seção, histórico de correções de bugs), mas **não é mais o lugar de checar o que está pendente** — os blocos "✅ Status atualizado" e o checklist no fim seguem aqui como histórico, porém podem estar desatualizados a partir de agora; o `_2` é quem deve ser mantido corrente daqui pra frente.

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

**✅ Status atualizado (2026-07-22):** Login, Cadastro, Criar-escola e a Landing page **já foram migrados** para os componentes novos do design system (`frontend/components/auth/AuthBrandShell.tsx`, `AuthButton.tsx`, `AuthIcon.tsx`, `AuthInput.tsx`, `AuthGreenShell.tsx`, `BauaLogo.tsx`) — confirmado por grep: `1cc47b`/`169162`/`ebebeb` não aparecem mais em nenhum desses 4 CSS. Uma tela nova também nasceu já no padrão novo: `frontend/app/verificar-email/page.tsx` (fluxo de verificação de e-mail, ligado à integração Resend/Brevo documentada em `docs/PLANEJAMENTO_VERIFICACAO_EMAIL_RESEND.md`/`_BREVO.md`). **`saiba-mais` é a única página institucional que ainda não recebeu o rework** — continua com cor fixa e sem os componentes novos.

**✅ Status atualizado (2026-07-29):** `saiba-mais` recebeu o rework um dia depois deste relatório — commit `6b27275` (2026-07-23, "fix saiba-mais"). Não usa `AuthBrandShell` (é uma página de conteúdo/institucional, sem formulário — mesmo padrão da landing page), mas redeclara localmente os mesmos tokens do Bauá Design System usados em `page.module.css` (landing page); `1cc47b`/`169162`/`ebebeb` não aparecem mais em `saiba-mais/page.module.css`. Também confirmado o reposicionamento pedido nos post-its de Login/Cadastro (imagem/marca à esquerda, formulário à direita, espelhado): `AuthBrandShell` tem o `brandPanel` à esquerda por padrão (`/login`) e a prop `invertido` (usada só em `/cadastro`) espelha os lados — o rework de 2026-07-22 cobriu tanto cores/componentes quanto o posicionamento.

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

**✅ Status atualizado (2026-07-19):** dashboard reconstruído ponta a ponta nesta sessão, endereçando a maior parte dos post-its:
- Rebuild visual contra o design system Bauá real (`Dashboard Escola.dc.html` + tokens do projeto `689c269f`) — cores/tipografia/espaçamento deixaram de usar CSS Variables genéricas.
- **Navbar deixou de existir só na home** — foi extraída para `frontend/app/dashboard/[escolaGUID]/_components/DashboardNavbar.tsx` e montada em `layout.tsx`, então agora é persistente em toda navegação dentro de `/dashboard/[escolaGUID]/**` (era um pedido direto do usuário, fora do board original, mas resolve na prática o problema de "reorganizar conteúdo central" ao dar navegação consistente).
- Conteúdo central da home trocado: os cards de estatística placeholder (`Usuários: --`, `Atividades: --`, `Sistema: Ativo`) e o aviso "Dashboard em desenvolvimento" foram **removidos**; no lugar entraram 3 blocos com dado real — Histórico de Pendências (`GET /api/pendencia`), Tarefas a se esgotar (aluno, ordenadas por prazo) e Avisos gerais (`GET /api/notificacao`, categoria `Aviso`) — isso é o mais próximo que se chegou do post-it "histórico de comunicados recentes" sem inventar um módulo novo.
- Sino de notificações trocou de navegação de página inteira para um dropdown inline (fetch das notificações recentes + "ver todas").
- ⚠️ **Divergência encontrada:** `frontend/refs/Dashboard_ref.png` (imagem de referência anexada ao repo) é um mockup de um produto não relacionado ("Ferretto", plataforma de vestibular) — não bate em nada com o design system Bauá real. Foi tratada como não aplicável e ignorada nesta reconstrução; vale confirmar se é o arquivo errado antes de usá-la de novo como referência.
- Pendente: os post-its "ícones de acesso rápido às matérias" e "identidade visual de entidades (turmas/matérias)" dependem do módulo de Matérias (seção 9), que segue não iniciado.

**✅ Status atualizado (2026-07-29):** os 2 post-its pendentes acima foram fechados. A home já linkava pra Matérias (widgets "Tarefas a se esgotar"/"Avaliações pendentes" com deep-link pro item), mas só com texto puro — não existia nenhum card com a identidade visual (capa/cor) da matéria, só a navbar tinha o ícone "Matérias". Adicionada seção "Minhas Matérias" na home (`frontend/app/dashboard/[escolaGUID]/page.tsx`), acima dos widgets, reaproveitando o `MateriaTurmaCard` já usado na tela `/materias` — mostra até 6 matérias (aluno: turma+professor; professor: sem aluno matriculado, cai pra visão de professor) com capa/cor reais e link direto, mais "Ver todas".

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

**✅ Status atualizado (2026-07-19):** as 3 telas acima (Tarefa/Prova/Conteúdo) foram **condensadas numa tela só**, a pedido direto do usuário: `frontend/app/dashboard/[escolaGUID]/cadastro/page.tsx`, com seletor de abas e a lógica de cada formulário extraída para `TarefaForm.tsx`/`ProvaAgendadaForm.tsx`/`ConteudoForm.tsx` na mesma pasta (lógica de validação/API praticamente inalterada, só desacoplada de "página inteira" para "conteúdo de aba"). As rotas antigas (`/crud-tarefa`, `/crud-provaagendada`, `/crud-conteudo`) agora são redirects simples para `/cadastro?aba=...`. Item da navbar "Cadastro" (visível só para Professor) leva direto pra essa tela nova.

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

**✅ Status atualizado (2026-07-29):** já são dinâmicos — `carregarContadores()` busca via `Promise.all` os totais reais de cursos/matérias/turmas/alunos/professores/secretaria/coordenação (uma chamada por API, com `.catch()` individual pra não derrubar os outros contadores se um endpoint falhar) e popula o número em cada card. Não há mock/placeholder nessa tela.

### Tela de dados
- **Board:** Backend ✅ | Frontend ✅
- **Post-it:** incluir filtro de pesquisa na listagem.
- **Código real:** módulo bem populado — `gestao-dados/cursos/page.tsx`, `gestao-dados/alunos/page.tsx`, `gestao-dados/professores/page.tsx`, `gestao-dados/materias/page.tsx`, `gestao-dados/turmas/page.tsx`, `gestao-dados/turmas/[turmaGUID]/cronograma/page.tsx`. Ação pendente: adicionar filtro de pesquisa.

**✅ Status atualizado (2026-07-29):** filtro já existe — o componente compartilhado `BaseTabelaDados` (`frontend/components/gestao-dados/BaseTabelaDados.tsx`) tem um campo de busca embutido (prop `filtrarPor`), e as 7 telas de listagem (cursos, alunos, professores, matérias, turmas, secretaria, coordenação) já passam sua própria função de filtro.

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

**✅ Status atualizado (2026-07-19):** frontend implementado nesta sessão — `frontend/app/dashboard/[escolaGUID]/chat/page.tsx` (lista de conversas + painel de mensagens), conexão WebSocket única e compartilhada (`frontend/lib/socket/SocketContext.tsx`, montada no `layout.tsx`), `socket.io-client` instalado. Cobre: lista com prévia/não-lidas, histórico paginado, envio em tempo real, digitando, fixar/desafixar/editar/apagar mensagem, iniciar conversa individual, e **upload de imagem/arquivo em anexo** (endpoint novo `POST /api/upload/mensagem/:conversaGUID`, 10MB, imagens + documentos comuns). Layout inspirado no design system atual (`689c269f`), não há tela dedicada de chat no design system oficial — confirmado por busca direta nos dois projetos Bauá.
- **Pendente (ver checklist no fim do documento):** reações a mensagens (decidido que entra no escopo, mas não implementado — só a bolha de mensagem foi construída, sem funcionalidade de reagir); gestão de Representante/Vice-Representante (kick/promover) na "lista no grupo" pedida pelo post-it — os endpoints já existem (`docs/routes/conversa-api.md`), mas não há UI; recibo de leitura visual (evento `mensagem_lida` existe, não é consumido no frontend).

**✅ Status atualizado (2026-07-22):** a "bolha de chat minimizada ao navegar pra fora da tela de chat" (estilo Instagram Web), que estava listada como "em andamento", **está pronta** — `frontend/app/dashboard/[escolaGUID]/_components/MinimizedChatBubble.tsx`, com "Expandir" levando direto de volta pra conversa que estava minimizada. Reconfirmado por leitura direta do código que reações, kick/promover (2ª tela de membros) e recibo de leitura **continuam pendentes** — nenhuma menção a painel de membros com ações administrativas em `chat/page.tsx`, `meuPapelNoGrupo` (Líder/Representante/Vice-Representante) hoje só controla permissão de fixar/apagar mensagem, não gestão de membros.

**✅ Status atualizado (2026-07-29):** os 3 pendentes acima **já foram resolvidos** — commit `68d8cf3` "att chat" (2026-07-23), documento nunca tinha sido atualizado pra refletir isso.
- **Reações a mensagens:** tabela `mensagem_reacao` (PK composta `MensagemGUID+UsuarioCPF+ReacaoEmoji`, permite múltiplas reações independentes por usuário na mesma mensagem, estilo Discord), 6 emojis fixos (`👍❤️😂😮😢🙏`). Backend: `MensagemDAO.toggleReacao`, `MensagemService.reagir` (emite `reacao_atualizada` via socket), `POST /api/conversa/:guid/mensagem/:msgGuid/reacao` + evento WS `reagir_mensagem`. Frontend: chips de reação + emoji picker no menu de ações da mensagem, já renderizados em `chat/page.tsx`.
- **Gestão de Representante/Vice-Representante:** endpoints `PUT`/`DELETE /api/conversa/:guid/permissao/representante` (Coordenação/Direção) e `.../vice-representante` (Representante ou Líder de tarefa) já tinham UI — `frontend/app/dashboard/[escolaGUID]/chat/GerenciarGrupoModal.tsx`, aberto pelo botão de engrenagem "Gerenciar grupo" em `chat/page.tsx`. **Não existe "kick" de membro no módulo de chat/conversa** — isso é proposital: turma nunca teve expulsão via chat (matrícula controla saída), e grupo de tarefa já tinha isso antes desta rodada num módulo separado (`GrupoTarefaService.expulsarMembro`, só o Líder), reaproveitado pelo mesmo modal.
- **Recibo de leitura:** evento `mensagem_lida` (payload `{ConversaGUID, UsuarioCPF, LidaAt}`) já é escutado em `chat/page.tsx` (`handleMensagemLida`), com check simples/duplo e contador "✓✓ N" pra grupos.

---

## 8. Secretaria (pág. 7)

**Especificação do board:** administrado principalmente pela secretaria, também coordenação/direção.

### Cadastro de eventos
- **Board:** Backend ✅ | Frontend ⬜
- **Post-its:** cadastrar eventos da escola; evento cadastrado vai direto para o calendário.
- **Código real:** `backend/controllers/evento.controller.ts` (285 linhas) + `routes/evento.routes.ts` prontos. Nenhuma pasta frontend dedicada — ⬜ do board confere.

**✅ Status atualizado (2026-07-22):** tela implementada — `frontend/app/dashboard/[escolaGUID]/cadastro-evento/page.tsx`, visível só a Coordenação/Secretaria/Direção (gate real no backend, retorna 403 pros demais papéis). Segue o mesmo padrão de formulário controlado + lista com ações inline usado em `cadastro/TarefaForm.tsx`, com upload/vínculo de anexo ao evento (`vincularAnexoEvento`).

### Registro de Auditoria
- **Board:** Backend 🔁 (em revisão) | Frontend ⬜
- **Post-its:** ver ações por usuário da escola; sistema de filtro.
- **Código real:** **não existe controller, rota, entidade ou serviço de auditoria.** A única menção a "auditoria" no backend é um comentário em `backend/Server.ts:229` ("Útil para logging e auditoria") sobre um middleware de pré-roteamento genérico — não há persistência de ações por usuário nem filtro. O 🔁 do board provavelmente reflete essa intenção genérica de logging, mas na prática **a feature em si está mais próxima de ⬜ do que de 🔁**.

**✅ Status atualizado (2026-07-22):** essa leitura ficou desatualizada — **o módulo já existe ponta a ponta**, conforme `docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md`: backend completo (`backend/entities/registroauditoria.model.ts`, `backend/repositories/registroauditoria.repository.ts`, `backend/services/auditoria.service.ts`, `backend/services/auditoria.scheduler.ts` — job de expurgo por retenção diferenciada, `backend/controllers/auditoria.controller.ts`, `routes/auditoria.routes.ts`, registrado em `/api/auditoria`) e frontend (`frontend/app/dashboard/[escolaGUID]/auditoria/page.tsx`, com filtro por categoria/entidade, badges por categoria de sensibilidade, `frontend/lib/api/auditoria.api.ts`). Acesso restrito a Coordenação/Secretaria/Direção (403 no backend para os demais). **Falta apenas confirmar se a migration `2026-07-21-add-registro-auditoria.sql` já rodou contra o banco real** (ver checklist).

### Cadastro de pendências / Tela de pendência
- **Board:** Backend ✅ | Frontend ⬜ (nas 2)
- **Post-its:** pendência associada a usuário responsável e/ou pendência específica a resolver; tela de pendência deve seguir o padrão da tela de tarefa.
- **Código real:** `backend/controllers/pendencia.controller.ts` (390 linhas) + `routes/pendencia.routes.ts` prontos e robustos. Nenhuma tela frontend dedicada encontrada — ⬜ confere.

**✅ Status atualizado (2026-07-22):** tela implementada — `frontend/app/dashboard/[escolaGUID]/cadastro-pendencia/page.tsx`, mesmo padrão do cadastro de evento acima. Seletor de destinatário reaproveita `AlunoAPI.listarAlunos`/`ProfessorAPI.listarProfessores` (não existe endpoint genérico de "buscar todos os usuários da escola com nome" — decisão documentada no próprio arquivo); Coordenação/Secretaria/Direção não aparecem como destinatário possível.

### Notificações
- **Board:** Backend ⬜ | Frontend ⬜
- **Post-its:** cobrir tudo que o usuário recebe (avisos, tarefas, provas, mensagens); sistema de filtro; envio por e-mail e WhatsApp.
- **Código real:** confirmado — nenhuma rota, controller ou entidade de notificação no backend. Item genuinamente não iniciado nas duas pontas, como o board indica.

**⚠️ Correção (2026-07-19):** essa leitura ficou desatualizada — hoje **backend e frontend de Notificações já existem e funcionam**: `backend/services/notificacao.service.ts`, catálogo de tipos + preferências por usuário, envio de e-mail via Resend, canal WhatsApp com interface pronta mas sem provedor conectado ainda (decisão do usuário: fica fora de escopo por ora), WebSocket `notificacao:nova` na room pessoal do usuário, e as telas `frontend/app/dashboard/[escolaGUID]/notificacoes/page.tsx` + `.../notificacoes/configuracoes/page.tsx`. Nesta sessão o sino da navbar também passou a abrir um dropdown com as notificações recentes (em vez de navegar pra página cheia).
- **Pendente:** toast em tempo real ouvindo `notificacao:nova` (decisão confirmada: deve aparecer em todas as telas do dashboard) — ainda não implementado, o dropdown hoje só busca a lista ao abrir, não reage a eventos WS em tempo real; paginação/retenção do feed — sem decisão fechada ainda.
- **Reconfirmado (2026-07-22):** `notificacao:nova` ainda não é escutado em nenhum lugar do frontend (busca direta, zero ocorrências) — o toast em tempo real segue sem implementação. O commit `att notificação e resend` desta data mexeu em `.env`/`perfil/page.tsx`, não no toast.

**✅ Status atualizado (2026-07-29):** as duas pendências acima foram fechadas. Toast em tempo real: `frontend/app/dashboard/[escolaGUID]/_components/NotificacaoToastListener.tsx` já existe e está montado em `frontend/app/dashboard/[escolaGUID]/layout.tsx` — escuta `notificacao:nova` via WebSocket em toda tela do dashboard, com clique navegando pro link da notificação e marcando como lida (implementado em sessão anterior a esta auditoria, a documentação é que estava desatualizada). Paginação/retenção: decisão do usuário foi "expurgar lidas antigas" (não lidas nunca são apagadas automaticamente); implementado nesta sessão — `NotificacaoDAO.deleteLidasAntigas()` + `NotificacaoService.expurgarLidasAntigas()` + job diário `expurgo_notificacoes_lidas` (03:30, `NotificacaoScheduler`) expurgando lidas com mais de 30 dias; frontend da tela `/notificacoes` passou a paginar com `limit`/`offset` (30 por página) + botão "Carregar mais".

---

## 9. Matérias (pág. 8)

**Especificação do board:** só professores (admins da matéria) e alunos; professor vê tarefas da turma e material que fez upload; aluno vê tudo que o professor postou de forma facilitada.

### Tela geral das matérias / Tela específica da matéria / Prova (visão do aluno) / Tarefa (visão do aluno)
- **Board:** Backend ⬜ | Frontend ⬜ (nas 4)
- **Post-its relevantes:** card por matéria + filtro + clique leva à tela específica; conteúdos organizados por data; aluno revisa notas da prova e recebe **recomendações de estudo geradas por IA**; professor pode anexar vídeo-resumo; aluno pode anexar tarefa quando entrega for digital; descrição da tarefa em destaque no topo.
- **Código real:** existe `backend/controllers/materia.controller.ts` + `routes/materia.routes.ts`, mas é um CRUD básico de matéria (usado como cadastro/lookup em `gestao-dados/materias`), **não** as telas específicas de matéria descritas aqui (feed do professor, visão do aluno, notas, recomendação por IA). A pasta `backend/ai/` existe mas contém apenas `README.txt` — nenhuma lógica de recomendação por IA implementada ainda. O board está correto: este módulo é pendente ponta a ponta, e é o único que menciona uma feature de IA ainda não iniciada.

**Status (2026-07-19):** segue 100% não iniciado. Usuário decidiu adiar deliberadamente ("veremos futuramente sobre IA") tanto a fonte de dado de entrada da recomendação quanto a escolha de provedor — não é uma pendência esquecida, é adiamento consciente. As demais partes do módulo (tela geral, tela específica, notas de prova, entrega digital de tarefa) não têm decisão de adiamento — seguem simplesmente não implementadas.

**✅ Status atualizado (2026-07-29):** módulo implementado ponta a ponta em várias sessões desde 2026-07-23, via spec-first (`docs/PLANO_IMPLEMENTACAO_MATERIAS.md`). Não é mais "não iniciado" — é o módulo mais robusto adicionado ao app desde este relatório. Resumo do que existe hoje:

**Navegação e identidade visual**
- Ícone "Matérias" na navbar (Professor + Aluno), com badge vermelho de pendência agregada.
- 3 telas: grid de matérias (card por matéria, aluno vê a turma dele automaticamente; professor escolhe matéria → turma), tela de categorias (compartilhada aluno/professor).
- Capa/cor customizável por (Matéria, Professor) e por Turma (trocável por Representante/Vice-Representante ou Coordenação/Direção como fallback).

**Categorias**
- Sistema de categorias com ordem manual (drag-and-drop nativo HTML5, sem lib nova), escopo (Professor, Matéria, Turma).
- "Gerenciar categorias" (board geral): categoria "do professor" replicada por turma sob o mesmo nome, criação/reordenação em massa, mover itens fan-out (conteúdo/prova) entre turmas de uma vez.
- Categoria por nome nos formulários de criação (`ConteudoForm`/`TarefaForm`/`ProvaAgendadaForm`) — resolve/cria automaticamente por turma, sem exigir GUID.
- Editar (renomear) e excluir categoria a partir da tela de turma, com escolha **"só esta turma" vs. "todas as turmas com essa categoria"** (endpoints `PATCH`/`DELETE .../geral`). Excluir categoria com itens não apaga os itens — eles caem para um grupo "Sem categoria" visível na tela (antes eram descartados silenciosamente).

**Consumo de conteúdo/tarefa/prova (visualizador unificado)**
- Modal único (`VisualizadorItemModal`) para os 6 tipos de item: vídeo, texto, imagem paginada, tarefa digital, tarefa presencial, prova.
- Progresso do aluno: vídeo por tempo assistido (upload nativo **e** link do YouTube via YouTube IFrame Player API — não é mais um `<iframe>` mudo), imagem por página vista, texto instantâneo, prova instantânea ao abrir ("já vi").
- Barra de progresso escondida na visão do professor (só aluno tem progresso pessoal — antes aparecia sempre vazia/zerada, o que confundia).
- Entrega de tarefa digital: upload real de anexo pelo aluno, escopado por matrícula (`TarefaMatriculaGUID` — corrigido um bug real onde o anexo de um aluno aparecia como se fosse compartilhado entre todos os alunos da mesma tarefa).
- Nota manual (professor) + nota automática 0 via scheduler a cada 5 minutos para quem perde o prazo sem entregar.
- Avaliação do professor: abas Pendentes / Avaliados / Atrasados / Sem postagem, navegação aluno a aluno, nome do aluno (não GUID cru), anexo de entrega individual com download.
- Editar (reabre o formulário de criação pré-preenchido) e excluir tarefa/prova/conteúdo direto do visualizador (só professor) — exclusão de conteúdo/prova (fan-out em N turmas) com escolha "só esta turma" vs. "todas as turmas".
- Estatísticas por item (ícone gráfico, só professor): média de % da turma + ranking de alunos (nome, matrícula, % e nota quando aplicável), com exportação para planilha Excel (.xlsx, contendo nome e `MatriculaGUID`).

**Dashboard**
- Seções "tarefas pendentes" (aluno) e "avaliações pendentes" (professor), linkando direto para o item no módulo Matérias.

**Correções de segurança encontradas e fechadas no caminho**
- `atualizarTarefa`/`excluirTarefa` e `atualizarProva`/`excluirProva` não validavam que quem editava era o professor responsável (só checavam "autenticado") — qualquer professor conseguia mexer em tarefa/prova de outro. Corrigido.
- `removerAnexo` (tarefa) não validava dono do anexo — corrigido junto com o escopo por matrícula.

**✅ Status atualizado (2026-07-29):** os dois gaps de edição/navegação abaixo foram fechados nesta rodada:
- **Editar mídia de um Conteúdo já publicado** — `PUT /api/conteudo/:guid` passou a aceitar multipart e, além de título/descrição, substitui a mídia conforme o `ConteudoTipo` (imutável): HTML sanitizado (texto), link (cronometrado por link) ou re-upload de arquivo(s) que substitui o(s) anterior(es) no R2 (cronometrado por upload, ou todas as páginas do paginado de uma vez). `ConteudoForm` (usado pelo ícone de editar do visualizador) mostra os campos de mídia também em modo edição, com tipo/origem travados. Turmas distribuídas continuam imutáveis por este endpoint.
- **Formulário de tarefa/prova no visualizador vs. `/tarefas/[tarefaGUID]`** — em vez de replicar a UI de grupo (convite, expulsar, transferir liderança) dentro do `VisualizadorItemModal`, foi adicionado um link "Gerenciar grupo" (visível só pro aluno, quando `TarefaCompartilhada=true`) que leva direto pra tela `/tarefas/[tarefaGUID]` já existente — antes só alcançável navegando manualmente, sem nenhum ponto de entrada a partir de Matérias.

**Ainda faltando / fora de escopo (decisão do usuário, não esquecimento):**
- [ ] **Tarefa tipo "lista"** (7º tipo de tarefa, mencionado no board original como "futuramente") — nunca entrou em nenhuma fase, os tipos implementados são só digital e presencial.
- [ ] **Recomendação de estudo por IA** — adiada deliberadamente ("veremos futuramente"), sem fonte de dado nem provedor escolhidos. `backend/ai/` segue só com README.
- [ ] **Nota de prova** (`prova_nota`) — fora de escopo desta fase; prova hoje é só leitura (data + conteúdo) + registro de "já vi", sem lançamento de nota.
- [ ] **Categoria "do representante"** (representante/vice-representante de turma criar categoria própria, sem depender do professor) — o hook de permissão já existe no backend, mas nenhuma UI foi ligada; função confirmada como "futura" desde o spec original.

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

**✅ Status atualizado (2026-07-19):** implementado parcialmente. Nova tela `frontend/app/dashboard/[escolaGUID]/perfil/page.tsx`, acessível pelo dropdown do avatar (item "Meu Perfil") — cobre dado cadastral (nome/e-mail/telefone via `PUT /api/usuario/:UsuarioCPF`), upload de foto (`POST/DELETE /api/upload/foto-usuario/:UsuarioCPF`, novo, mesmos limites do logo de escola — 1MB, PNG/JPG/JPEG) e troca de senha (`PATCH /api/usuario/:UsuarioCPF/senha`, novo, bcrypt). Coluna nova `usuario.UsuarioFotoUrl` — migration escrita mas **ainda não executada contra o banco real** (ver checklist).

**✅ Status atualizado (2026-07-21):** seção "Preferências de acessibilidade" implementada na mesma tela `/perfil` — 5 controles: tema (claro/escuro/sistema), modo daltônico, tamanho de texto (pequeno/médio/grande), reduzir animações e alto contraste. Persistência por conta via `PUT /api/usuario/:UsuarioCPF` (campos `UsuarioTema`/`UsuarioModoDaltonico`/`UsuarioEscalaFonte`/`UsuarioReduzirMovimento`/`UsuarioAltoContraste`, colunas novas — migration `2026-07-21-add-usuario-preferencias-visuais.sql`, **ainda não executada contra o banco real**, ver checklist), sem `localStorage`. Aplicado via atributos `data-theme`/`data-daltonico`/`data-font-scale`/`data-reduzir-movimento`/`data-alto-contraste` em `<html>` (`frontend/lib/theme/tema.ts`, disparado pelo `AuthContext` assim que o usuário autenticado carrega, com script de boot em `frontend/app/layout.tsx` pra evitar flash antes disso). Modo daltônico é um par de cores segura (verde/vermelho semântico → azul/laranja), **não** um filtro de simulação por tipo (protanopia/deuteranopia/tritanopia) — o post-it original citava esses tipos, mas o objetivo real (remover dependência só-de-cor nos estados de sucesso/erro) foi resolvido sem simulação, que segue fora de escopo.
- **Cobertura de CSS (dark/daltônico/alto-contraste):** `frontend/styles/globals.css` (base, incl. `[data-theme="dark"]` que já existia mas nunca era ativado — agora é), `DashboardNavbar.module.css`, home do dashboard (`page.module.css`), `perfil/page.module.css`, `configuracoes/page.module.css` (config. da escola). Resto do app (gestão de dados, calendário, tarefas, chat, projetos etc.) não foi coberto nesta rodada. Escala de fonte é global de fato (escala o `font-size` raiz, afeta todo conteúdo em `rem`), mas texto em `px` (comum em títulos grandes herdados do design system) não escala.

**✅ Status atualizado (2026-07-29):** essa leitura ficou parcialmente desatualizada — em sessões posteriores a esta, **gestão de dados** (7 telas + main page), **calendário**, **projetos** (4 telas) e a maior parte de **tarefas** já foram cobertos (grep confirma `data-theme="dark"`/`data-alto-contraste` em todos os `page.module.css` desses módulos). Existiam, porém, **9 arquivos** com cor hardcoded (fora do sistema de tokens, portanto realmente sem tema escuro/daltônico/alto-contraste), agora corrigidos: `Toast.module.css` (usado em todo o app), os 4 modais de grupo de tarefa (`ConviteGrupoModal`/`ConvitesPendentesModal`/`SolicitarEntradaModal`/`TransferirLiderancaModal`), `MinimizedChatBubble.module.css` (bolha de chat minimizada), e os componentes do módulo Matérias `ItemProgressoBar.module.css`/`MateriaTurmaCard.module.css`. A correção seguiu dois padrões já usados no resto do app: componentes que consomem os tokens globais (`--bg-primary`/`--text-secondary`/`--color-success`/`--color-error` etc.) passaram a usá-los em vez de hex fixo (cobertura automática, sem bloco de override); `MinimizedChatBubble.module.css`, que já redeclarava tokens do Bauá Design System localmente mas sem os overrides, ganhou o bloco `:global(html[data-theme="dark"])`/`[data-alto-contraste="true"]` correspondente (mesmo padrão de `VisualizadorItemModal.module.css`). Cadastro de conteúdo/tarefa/prova (`ConteudoForm`/`TarefaForm`/`ProvaAgendadaForm.module.css`) e a tela de Notificações já usavam só tokens globais — sem cor hardcoded, portanto já cobertos, mesmo sem bloco de override próprio.

### Configuração da escola
- **Board:** Backend 🔁 | Frontend ⬜
- **Post-its:** só acesso direção/coordenação; informar cronograma das turmas; alterar informações da escola; avaliar restringir customização de cor ao representante legal da escola.
- **Código real:** **discrepância relevante** — `frontend/app/dashboard/[escolaGUID]/configuracoes/page.tsx` já implementa cronograma de turmas, grade horária, dias letivos e intervalos, consumindo `lib/api/escolaconfiguracao.api.ts`. Backend: `backend/controllers/escolaconfiguracao.controller.ts` + `routes/escolaconfiguracao.routes.ts` também existem. O board marca Frontend ⬜, mas a tela de cronograma (um dos 4 post-its) já está pronta. **O que falta de fato**, pelo que dá para inferir sem abrir o arquivo por completo: alterar informações gerais da escola (nome/e-mail/logo fora do cronograma) e a regra de restringir customização de cor ao representante legal — vale confirmar com o board original quais dessas ainda não estão na tela atual.

**✅ Status atualizado (2026-07-22):** seção "Identidade da Escola" implementada na mesma tela, visível **só para Direção** (`FuncaoId` 6 — nota explícita na UI: "Visível apenas para a Direção"), cobrindo `EscolaNome` e as 4 cores (`EscolaCorPriEs/Cl`, `EscolaCorSecEs/Cl`). Isso resolve a regra "restringir customização de cor ao representante legal" (interpretando Direção como o representante legal da escola) e parte de "alterar informações da escola". **Ainda falta:** e-mail e logo da escola não têm campo nessa tela (busca direta por `EscolaEmail`/`EscolaLogo`/upload de logo em `configuracoes/page.tsx` não encontrou nada) — permanecem pendentes.

**✅ Status atualizado (2026-07-29):** e-mail e logo/ícone da escola também foram adicionados à seção "Identidade da Escola" — commit `4a0970e` (2026-07-23, um dia depois deste relatório). Campo `EscolaEmail` (validado, `input type="email"`) e upload de ícone (`EscolaIcone`, PNG/JPG até 1MB, com preview e opção de remover), ambos salvos junto com nome/cores no mesmo botão "Salvar Identidade da Escola" (`PUT /api/escola/:guid`). Confirmado ponta a ponta: coluna/campo existe em `backend/entities/escola.model.ts`, `backend/repositories/escola.repository.ts`, `backend/services/escola.service.ts` e migration `001_add_escola_logo.sql`. Nada mais pendente nessa seção.

---

## 12. Módulo em standby (pág. 11)

- Texto literal do post-it: **"a mimir, volte mais tarde nesse módulo"** — confirmado na leitura direta do PDF, sem mais contexto. Não há nome de módulo nem especificação. Nenhuma pista adicional encontrada no código que sugira qual conteúdo estava planejado aqui.
- **Ação:** só a equipe consegue esclarecer o que essa página reservava.

---

## 13. Projetos / Hackathon (pág. 12)

**Especificação do board:** só professores (criadores) ou direção/coordenação (criadores) e alunos; cenários como feira técnica/hackathon; como uma "tarefa compartilhada" mas para a escola inteira ou público definido pelo professor.

### Tela de criação de projeto / Tela de ver grupos e criar
- **Board:** Backend ⬜ | Frontend ⬜ (nas 2)
- **Post-its:** professor cria a ideia do projeto e a mecânica de pontuação; alunos criam grupos com suas "propostas"; grupo pode ser aberto ao público ou fechado por convite; avaliar se professor também pode adicionar/remover integrantes de grupos já formados.
- **Código real:** confirmado — nenhuma entidade, controller ou rota com "projeto"/"hackathon" no backend. Nada em frontend também. Board correto, módulo 100% não iniciado.

**✅ Status atualizado (2026-07-19):** implementado ponta a ponta nesta sessão via spec-first (`docs/PLANO_IMPLEMENTACAO_PROJETOS.md`, com decisões de negócio confirmadas pelo usuário na Seção 1). Diferente de Tarefa Compartilhada, os grupos de projeto podem reunir alunos de turmas diferentes da escola, e nada é criado automaticamente — o aluno cria seu próprio grupo com uma proposta.
- **Backend:** 6 tabelas novas (`projeto`, `projetoturma`, `grupoprojeto`, `usuarioxgrupoprojeto`, `convitegrupoprojeto`, `historicogrupoprojeto` — migration `2026-07-19-add-projetos.sql`, **ainda não executada contra o banco real**, ver checklist), 3 módulos completos (`Projeto`/`GrupoProjeto`/`ConviteGrupoProjeto`, DAO→Service→Controller→Middleware→Routes), notificações novas (`projeto_criado`, `convite_grupo_projeto`, `solicitacao_grupo_projeto`, `removido_grupo_projeto`, `projeto_pontuacao_atribuida`), documentação Swagger-like em `docs/routes/{projeto,grupoprojeto,convitegrupoprojeto}-api.md`.
- **Frontend:** `frontend/app/dashboard/[escolaGUID]/projetos` (lista), `crud-projeto` (criação, Professor/Direção), `projetos/[projetoGUID]` (detalhe + grupos), `projetos/[projetoGUID]/grupos/[grupoGUID]` (detalhe do grupo).
- **Regras confirmadas:** criador pode ser Professor OU Direção (extensão do usuário sobre o post-it original, que só citava professor); criador do projeto também pode adicionar/remover membros de qualquer grupo (não só o líder aluno); grupo `Fechado` aceita convite do líder E solicitação do aluno; só o criador do projeto atribui pontuação; mecânica de pontuação é texto livre + nota numérica manual (sem critérios estruturados por ora).

---

## Resumo — onde o board e o código concordam vs. divergem

**Estado original (2026-07-17), antes do trabalho desta sessão:**

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

**Recomendação prática (válida na época):** tratar a coluna da esquerda como "criar do zero" e a da direita como "revisar/ajustar contra os post-its" — são esforços de tamanho muito diferentes, e o board sozinho não deixa essa distinção clara.

---

## Correções de bugs em produção (2026-07-22)

Sessão focada em estabilização, não em features novas do board. Achados relevantes:

- **`relacaoanexos` inexistente:** as rotas de anexos de Tarefa/Pendência/Evento (`POST`/`GET /api/{tarefa,pendencia,evento}/:GUID/anexos`) quebravam em produção com `Table 'railway.relacaoanexos' doesn't exist`. Causa raiz: `backend/repositories/relacaoanexos.repository.ts` foi escrito contra uma tabela pivot unificada que **nunca existiu** — o schema real (confirmado via `SHOW CREATE TABLE` direto no banco Railway nesta sessão) já tinha o design correto de 4 tabelas separadas por recurso (`relacaoanexostarefa`, `relacaoanexospendencia`, `relacaoanexosevento`, `relacaoanexosprova`), usado corretamente por outro arquivo (`backend/repositories/anexo.repository.ts`). O repositório foi reescrito para usar as tabelas certas — **sem precisar de nenhuma migration nova**. Commit `cb33974` "fix anexos".
- **`fix vinculos` (commit `c61ff1c`):** bug de permissão em `pendencia.service.ts`, `evento.service.ts` e `anotacao.service.ts` — o código checava só `vinculos[0]` (primeiro vínculo escola-usuário-função retornado) em vez de verificar se **qualquer** vínculo ativo do usuário atendia à regra. Quebrava para usuários com mais de uma função na mesma escola (ex.: Professor que também é Coordenador). Corrigido para `vinculos.some(...)`.
- **`fix-pendencia-timestamps.sql` / `fix-evento-schema.sql` (commit `b7c14e9`/`98b805c`):** as tabelas `pendencia` e `evento` foram criadas manualmente em produção com nomes de coluna divergentes do código (`CreatedAt`/`UpdatedAt` sem prefixo; `EventoConteudo`/`EventoDataHora` em vez de `EventoDescricao`/`EventoData`). **Confirmado nesta sessão via `SHOW CREATE TABLE` real** que essas duas migrations **já foram executadas** em produção — os nomes de coluna corretos já estão lá.
- Evento também ganhou persistência de `UsuarioCPF` (quem criou o evento), campo que existia na tabela mas nunca era populado pelo código.

---

## Checklist — Pendências restantes (atualizado em 2026-07-22)

Trabalho realizado nesta sessão (2026-07-19): módulo Projetos completo, Chat completo (texto + anexo), dashboard reconstruído contra o design system real, navbar tornada persistente em todo o dashboard, telas de cadastro de Tarefa/Prova/Conteúdo condensadas numa só, tela de configuração do usuário nova, sino de notificações virou dropdown. Detalhes em cada seção acima. Itens marcados `[x]` foram concluídos nesta sessão; `[ ]` seguem em aberto.

**Trabalho adicional identificado em 2026-07-22** (não fruto desta sessão de auditoria, mas confirmado por leitura direta do código/git log — o relatório estava desatualizado nesses pontos): Registro de Auditoria completo (backend+frontend), telas de Cadastro de Evento e Cadastro de Pendência, rework de design system em Login/Cadastro/Criar-escola/Landing page, seção "Identidade da Escola" (nome+cores, restrita à Direção), bolha de chat minimizada. Mais 3 correções de bugs em produção (ver seção acima). Todos os itens abaixo já refletem esse estado.

**Trabalho adicional identificado em 2026-07-29:** módulo Matérias implementado ponta a ponta (ver seção 9 acima) — telas de navegação, categorias, visualizador unificado de conteúdo/tarefa/prova com progresso real (incl. YouTube), avaliação de tarefa pelo professor, edição/exclusão de itens e categorias com escopo por turma, estatísticas por item com exportação Excel. Duas lacunas de segurança encontradas e fechadas no caminho (update/delete de tarefa/prova sem checagem de professor responsável). O checklist "### Matérias" abaixo já reflete esse estado. Também confirmado nesta data que os 3 pendentes de Chat (reações, gestão de Representante/Vice, recibo de leitura) já tinham sido implementados desde 2026-07-23 (commit `68d8cf3`) — o relatório só nunca tinha sido atualizado pra refletir isso.

### Migrations escritas, faltando confirmar execução contra o banco real
- [x] `backend/database/migrations/2026-07-22-fix-pendencia-timestamps.sql` — **confirmado executado** via `SHOW CREATE TABLE pendencia` direto no Railway nesta sessão (colunas já vêm como `PendenciaCreatedAt`/`PendenciaUpdatedAt`)
- [x] `backend/database/migrations/2026-07-22-fix-evento-schema.sql` — **confirmado executado** via `SHOW CREATE TABLE evento` direto no Railway nesta sessão (colunas já vêm como `EventoDescricao`/`EventoData`/`EventoCreatedAt`/`EventoUpdatedAt`)
- [ ] `backend/database/migrations/2026-07-19-add-projetos.sql` — 6 tabelas do módulo Projetos + seeds de notificação — **execução não confirmada**, verificar
- [ ] `backend/database/migrations/2026-07-19-add-usuario-foto-e-senha.sql` — coluna `usuario.UsuarioFotoUrl` — **execução não confirmada**, verificar
- [ ] `backend/database/migrations/2026-07-21-add-usuario-preferencias-visuais.sql` — colunas `usuario.UsuarioTema`/`UsuarioModoDaltonico`/`UsuarioEscalaFonte`/`UsuarioReduzirMovimento`/`UsuarioAltoContraste` — **execução não confirmada**, verificar
- [ ] `backend/database/migrations/2026-07-21-add-registro-auditoria.sql` — tabelas `categoriaauditoria`/`registroauditoria`/`usuarioxescolaacesso` — **execução não confirmada**, verificar (o código do módulo já está pronto ponta a ponta, ver seção 8)

### Chat
- [x] Lista de conversas, painel de mensagens, tempo real via WebSocket, anexos de imagem/arquivo
- [x] Bolha de chat minimizada ao navegar pra fora da tela de chat (estilo Instagram Web) — `MinimizedChatBubble.tsx`
- [x] Reações a mensagens — tabela `mensagem_reacao`, evento `reacao_atualizada`, chips + emoji picker em `chat/page.tsx` (commit `68d8cf3`, 2026-07-23)
- [x] Gestão de Representante/Vice-Representante na tela de grupo — `GerenciarGrupoModal.tsx` (kick propriamente dito não existe no módulo de chat por design: turma não expulsa via chat, grupo de tarefa reaproveita `GrupoTarefaService.expulsarMembro` já existente)
- [x] Recibo de leitura visual (`mensagem_lida`) — consumido em `chat/page.tsx` (`handleMensagemLida`), check simples/duplo + contador em grupo

### Notificações
- [x] Dropdown no sino da navbar (lista recente + link "ver todas")
- [x] Toast em tempo real ouvindo `notificacao:nova` via WebSocket, em todas as telas — `NotificacaoToastListener.tsx`, montado no layout do dashboard
- [x] Paginação/retenção do feed — decisão: expurgo automático só de lidas (30 dias, não lidas nunca somem); feed pagina 30 por vez com "Carregar mais"
- [ ] Canal WhatsApp — decidido fora de escopo por ora (Evolution API, trabalho futuro)

### Secretaria
- [x] Tela de cadastro de eventos — `cadastro-evento/page.tsx`
- [x] Tela de cadastro/gestão de pendências — `cadastro-pendencia/page.tsx`
- [x] Registro de Auditoria — ponta a ponta (backend completo + `auditoria/page.tsx`, filtro por categoria/entidade, scheduler de expurgo por retenção); falta só confirmar execução da migration (ver acima)

### Matérias
- [x] As 4 telas (geral, específica, prova-visão-aluno, tarefa-visão-aluno) — implementadas via visualizador unificado (`VisualizadorItemModal`) + telas de navegação matéria/turma/categoria
- [x] Entrega digital de tarefa pelo aluno — upload real de anexo, escopado por matrícula (bug de anexo "compartilhado entre alunos" corrigido no caminho)
- [x] Progresso de conteúdo (vídeo incl. YouTube, texto, imagem paginada) e visualização de prova
- [x] Categorias (ordem manual, escopo por turma, editar/excluir em massa "categoria geral", itens órfãos não são apagados)
- [x] Avaliação de tarefa pelo professor (nota manual + zeramento automático por prazo, abas Pendentes/Avaliados/Atrasados/Sem postagem, nome do aluno)
- [x] Editar/excluir tarefa/prova/conteúdo direto do visualizador, com escolha "só esta turma" vs. "todas as turmas" pra conteúdo/prova
- [x] Estatísticas por item (média da turma + ranking) com exportação para Excel (nome + `MatriculaGUID`)
- [x] Editar mídia de um Conteúdo já publicado (texto/link/arquivo, por tipo) — antes só título/descrição
- [x] Link "Gerenciar grupo" no visualizador para tarefa compartilhada, levando à tela `/tarefas/[tarefaGUID]`
- [ ] Lançamento de nota de prova — fora de escopo desta fase (tabela `prova_nota` nunca criada; prova é só leitura + registro de "já vi")
- [ ] Recomendação por IA — adiada deliberadamente pelo usuário ("veremos futuramente"); `backend/ai/` só tem README
- [ ] Tarefa tipo "lista" (7º tipo, mencionado como "futuramente" no board original) — nunca implementado, só digital/presencial existem
- [ ] Categoria "do representante" (aluno representante de turma criar categoria própria) — hook de permissão pronto no backend, sem UI ligada

### Configuração do usuário
- [x] Dado cadastral (nome/e-mail/telefone), foto de perfil, troca de senha — tela `/perfil`, acessível pelo dropdown do avatar
- [x] Preferências de acessibilidade (tema claro/escuro/sistema, modo daltônico, tamanho de texto, reduzir animações, alto contraste) — persistidas por conta, sem `localStorage`; cobertura de CSS limitada a `globals.css` + navbar + home do dashboard + perfil + config. da escola (resto do app não coberto nesta rodada)

### Configuração da escola
- [x] Alterar nome e cores da escola (seção "Identidade da Escola", restrita à Direção)
- [x] Restringir customização de cor ao representante legal (interpretado como Direção/`FuncaoId` 6)
- [x] Alterar e-mail e logo da escola — campos já existem na seção "Identidade da Escola" (`configuracoes/page.tsx`, `EscolaEmail`/`EscolaIcone`, endpoint `PUT /api/escola/:guid`), adicionados no commit `4a0970e` (2026-07-23), depois do snapshot original deste relatório (2026-07-22)

### Auth / institucional (Login, Cadastro, Saiba mais, Landing page)
- [x] Migrar cores fixas (`#1cc47b`/`#169162`/`#ebebeb`) para o design system em `login`, `cadastro`, `criar-escola`, landing page — feito via componentes novos `AuthBrandShell`/`AuthButton`/`AuthIcon`/`AuthInput`/`AuthGreenShell`/`BauaLogo`
- [x] `saiba-mais` recebeu o rework — commit `6b27275` (2026-07-23, "fix saiba-mais"), depois do snapshot original: tokens do Bauá Design System redeclarados localmente em `.container` (mesmo padrão de `page.module.css`/landing page), sem `#1cc47b`/`#169162`/`#ebebeb` (confirmado por grep). Não usa `AuthBrandShell` porque não é um formulário — é uma página de conteúdo, mesmo padrão da landing page
- [x] Reposicionamento conforme post-its (imagem/marca à esquerda, formulário à direita, espelhado em login/cadastro) — confirmado: `AuthBrandShell.tsx` tem o `brandPanel` à esquerda por padrão (usado em `/login`) e a prop `invertido` (usada em `/cadastro`) espelha os lados
- [ ] Revisão de copy/persuasão da landing page (confiança, argumentos de venda, FAQ) — decisão de conteúdo, não de layout

### Bugs de produção (2026-07-22)
- [x] `relacaoanexos` inexistente — anexos de Tarefa/Pendência/Evento quebravam com "Table doesn't exist"; repositório reescrito para usar as tabelas reais (`relacaoanexostarefa`/`relacaoanexospendencia`/`relacaoanexosevento`), sem migration nova
- [x] Bug de permissão multi-função (`vinculos[0]` em vez de `vinculos.some(...)`) em Pendência/Evento/Anotação — corrigia acesso incorreto para usuários com mais de uma função na mesma escola
- [x] Schema de `pendencia`/`evento` corrigido e **confirmado executado em produção** (nomes de coluna renomeados para bater com o código)

### Outros
- [ ] `frontend/refs/Dashboard_ref.png` parece pertencer a um projeto não relacionado ("Ferretto") — confirmar se é o arquivo errado antes de usar como referência de novo
- [ ] Módulo em standby (pág. 11 do board) — sem informação suficiente no PDF original; só a equipe consegue esclarecer o que essa página reservava
- [x] Filtro de pesquisa na listagem de Gestão de Dados (post-it da seção 6) — já existe via `BaseTabelaDados` (prop `filtrarPor`) nas 7 telas de listagem
- [x] Cards da home de Gestão de Dados já são dinâmicos (post-it da seção 6) — contadores reais via API, não estático
- [x] Atalho visual "Minhas Matérias" na home do dashboard (post-its da seção 3) — seção nova com `MateriaTurmaCard` (capa/cor reais), antes só existia como ícone na navbar
- [x] Cobertura de CSS de acessibilidade (dark/daltônico/alto-contraste) em Toast, modais de grupo de tarefa, bolha de chat minimizada e componentes do módulo Matérias — gestão de dados/calendário/projetos/tarefas já estavam cobertos de sessões anteriores (documentação é que estava desatualizada)
