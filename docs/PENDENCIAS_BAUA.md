# Pendências do Ecossistema Bauá

> Base: board de planejamento `Bauá (1).pdf` (12 páginas, formato Kanban com post-its).
> Data de extração: 2026-07-17.
>
> **Legenda de status** (ícones do board):
> - ✅ **Pronto** — checkbox marcado
> - 🔁 **Em revisão / retrabalho** — ícone de seta (distinto do check), indicando que existe algo pronto mas que precisa ser revisitado
> - ⬜ **Pendente / não iniciado** — checkbox vazio
>
> As anotações manuscritas (post-its roxos) do board estão em letra pequena e parcialmente ilegíveis na captura do PDF; os pontos abaixo são a melhor leitura possível. Onde a caligrafia não permitiu uma transcrição confiável, isso está sinalizado explicitamente — vale conferir o board original antes de tratar esses itens como especificação fechada.

---

## 1. Autenticação & Onboarding (pág. 1)

### Login
- **Backend:** ✅ Pronto | **Frontend:** ⬜ Pendente
- Post-its apontam ajustes de layout (reposicionamento de imagem/ilustração, alinhamento do formulário de login) — **texto manuscrito pouco legível, revisar no board original**.

### Cadastro
- **Backend:** ✅ Pronto | **Frontend:** ⬜ Pendente
- Post-its mencionam posicionamento do formulário e dos ícones/imagem de apoio — **texto manuscrito pouco legível, revisar no board original**.

### Landing-page
- **Backend:** ✅ Pronto | **Frontend:** ✅ Pronto (já implementada)
- Post-its levantam dúvidas do tipo "isso já transmite confiança?", "falta algum argumento de persuasão?", "tem alguma dúvida frequente que falta responder?".
- **Rework de cores concluído (2026-07-17):** `frontend/app/page.module.css` foi reescrito para eliminar todas as cores fixas em hexadecimal (`#1cc47b`, `#169162`, `#ebebeb` etc.), agora usando exclusivamente as CSS Variables de `frontend/styles/globals.css` (`--color-primary`, `--color-primary-dark`, `--color-primary-light`, `--bg-secondary`, `--bg-tertiary`, `--bg-dark`, `--text-on-primary`, `--text-tertiary`, `--shadow-*`, `--radius-*`, `--spacing-*` etc.). O MCP `claude_design` continuou indisponível nesta sessão (ferramentas `mcp__claude_design__*` não apareceram no conjunto de ferramentas do subagente, mesmo com o cwd correto em `TccEcossistemaEscolar`), então foi usado o fallback já documentado: `frontend/app/dashboard/[escolaGUID]/page.module.css` como referência de aplicação das variáveis do tema. `frontend/app/page.tsx` não precisou de alterações (não tinha cores hardcoded; todas as classes CSS referenciadas foram preservadas, assim como o comportamento em JS — redirect se autenticado, smooth scroll, IntersectionObserver da nav flutuante e das animações de card). Build de produção (`next build`) validado com sucesso.
- **Pendência remanescente:** ainda vale revisitar com base no design real do Claude Design (`Landing Page.dc.html`) assim que o MCP `claude_design` estiver acessível em uma sessão, para validar tipografia, espaçamento e conteúdo persuasivo — o rework atual resolveu apenas o problema de cores fixas, usando as variáveis genéricas do tema como fonte de verdade (não o design importado).

### Saiba mais
- **Backend:** ✅ Pronto | **Frontend:** ⬜ Pendente
- Post-it: "avaliar se essa seta é realmente necessária" (referente a algum elemento de navegação/scroll da página).

---

## 2. Escolas (pág. 2)

### Escolha de escolas
- **Backend:** 🔁 Em revisão | **Frontend:** ⬜ Pendente
- Post-it indica que não existem ainda exemplos/wireframes de referência para essa tela.

### Cadastro de escola
- **Backend:** ✅ Pronto | **Frontend:** ⬜ Pendente
- Post-its: revisar alguma validação/mensagem de erro no formulário; criar um exemplo com mais dados de amostra.

---

## 3. Dashboard / Masterpage (pág. 2)

- **Backend:** 🔁 Em revisão | **Frontend:** ⬜ Pendente
- Post-its apontam vários pontos de UX: reorganizar o conteúdo central (dúvida sobre o que exibir no topo da dashboard); revisar o histórico de comunicados mais recentes; ícones de acesso rápido às matérias que direcionam para as "matérias"; ajustar botões de funcionamento/pendências pelos professores; identidade visual de entidades (turmas/matérias) — **detalhes finos pouco legíveis, revisar no board original**.

---

## 4. Cadastro de Conteúdo Acadêmico (pág. 3)

**Especificação do módulo:**
- Só pode ser visto por professores.
- Representa o cadastro de tarefas, provas e materiais dados em aula.

### Cadastro de tarefa
- **Backend:** ✅ Pronto | **Frontend:** ⬜ Pendente
- Pendências: verificar se há algo a mudar no formulário; garantir histórico das tarefas antigas em local separado; garantir que o histórico mostre somente tarefas recém-criadas por padrão.

### Cadastro de prova
- **Backend:** ✅ Pronto | **Frontend:** ⬜ Pendente
- Mesmas pendências do item acima (revisão de formulário e separação de histórico antigo x recente).

### Cadastro do conteúdo
- **Backend:** ✅ Pronto | **Frontend:** ⬜ Pendente
- Pendências: permitir anexos de conteúdo de aula; oferecer opção de anexo do professor automaticamente; suportar duas opções de anexo — arquivo e link do YouTube/MP4.

---

## 5. Calendário (pág. 4)

**Especificação do módulo:**
- Pode ser visto por qualquer função.
- Representa o calendário geral de eventos, avisos, feriados, comunicados, provas, tarefas e anotações.

### Calendário
- **Backend:** ✅ Pronto | **Frontend:** ✅ Pronto
- Post-it: "ver se tem algo para mudar" (revisão geral pendente, sem item específico).

### Modal de dia
- **Backend:** ✅ Pronto | **Frontend:** ⬜ Pendente
- Pendências: melhorar o alinhamento visual; padronizar os cards de evento dentro do modal.

### Modal anotação
- **Backend:** ✅ Pronto | **Frontend:** ✅ Pronto
- Post-it: "ver se tem algo para mudar" (revisão geral pendente, sem item específico).

---

## 6. Gestão de Dados da Escola (pág. 5)

**Especificação do módulo:**
- Só pode ser visto por direção/coordenação.
- Representa o cadastro de dados da escola.
- Cobre gestão de dados da secretaria e gestão de dados da coordenação.

### Main page
- **Backend:** 🔁 Em revisão | **Frontend:** ⬜ Pendente
- Pendências: melhorar de alguma forma o visual geral; dinamizar os cards de dados (hoje estáticos).

### Tela de dados
- **Backend:** ✅ Pronto | **Frontend:** ✅ Pronto
- Pendência: avaliar inclusão de filtro de pesquisa na listagem.

### Tela de importação
- **Backend:** ✅ Pronto | **Frontend:** ✅ Pronto
- Post-it: "ver se tem algo para mudar" (revisão geral pendente, sem item específico).

### Tela de adição
- **Backend:** ✅ Pronto | **Frontend:** ✅ Pronto
- Post-it: "ver se tem algo para mudar" (revisão geral pendente, sem item específico).

---

## 7. Chat (pág. 6)

**Especificação do módulo:**
- Pode ser visto por qualquer função.
- Representa a conversa, tanto individual quanto em grupos, entre os usuários.

### Main page
- **Backend:** ✅ Pronto | **Frontend:** ⬜ Pendente
- Pendências: tela precisa listar todos os grupos e conversas; separar visualmente grupo x conversas individuais; inspirar layout no do WhatsApp.

### Conversa
- **Backend:** ✅ Pronto | **Frontend:** ⬜ Pendente
- Pendências: garantir visualização das mensagens; inspirar layout no do Discord; se for conversa individual, exibir foto e nick da pessoa no topo.

### Lista no grupo
- **Backend:** ✅ Pronto | **Frontend:** ⬜ Pendente
- Pendências: definir funcionalidades administrativas (kick, definir administradores, gerenciar membros); inspirar layout no do WhatsApp.

---

## 8. Secretaria (pág. 7)

**Especificação do módulo:**
- Administrado principalmente pela secretaria, mas também por coordenação e direção.

### Cadastro de eventos
- **Backend:** ✅ Pronto | **Frontend:** ⬜ Pendente
- Pendência: evento cadastrado deve refletir direto no calendário da escola.

### Registro de Auditoria
- **Backend:** 🔁 Em revisão | **Frontend:** ⬜ Pendente
- Pendências: exibir as ações realizadas por usuário da escola; incluir sistema de filtro.

### Cadastro de pendências
- **Backend:** ✅ Pronto | **Frontend:** ⬜ Pendente
- Pendências: cada pendência criada deve estar associada a um usuário responsável e/ou a uma pendência específica a resolver.

### Tela de pendência
- **Backend:** ✅ Pronto | **Frontend:** ⬜ Pendente
- Pendências: usuário precisa visualizar a pendência recebida; layout deve seguir o mesmo padrão da tela de tarefa.

### Notificações
- **Backend:** ⬜ Pendente | **Frontend:** ⬜ Pendente
- Pendências: sistema de notificações precisa cobrir tudo que o usuário recebe (avisos, tarefas, provas, mensagens etc.); incluir sistema de filtro; envio também por e-mail e WhatsApp.

---

## 9. Matérias (pág. 8)

**Especificação do módulo:**
- Só pode ser visto por professores (administradores das matérias) e alunos.
- Representa a relação do professor com uma turma específica: ele pode ver as tarefas designadas às turmas e o material explicativo (vídeos, slides) que fez upload.
- Já os alunos podem ver, de forma facilitada, tudo o que o professor daquela matéria postou.

### Tela geral das matérias
- **Backend:** ⬜ Pendente | **Frontend:** ⬜ Pendente
- Pendências: exibir um card para cada matéria; incluir sistema de filtro; permitir clicar no card para ir à tela específica da matéria.

### Tela específica da matéria
- **Backend:** ⬜ Pendente | **Frontend:** ⬜ Pendente
- Pendências: exibir materiais, provas, vídeos e conteúdos organizados por data de postagem; permitir filtro específico por matéria.

### Prova (visão do aluno)
- **Backend:** ⬜ Pendente | **Frontend:** ⬜ Pendente
- Pendências: aluno pode revisar suas notas da prova e ter recomendações de estudo geradas por IA; professor pode anexar vídeo-resumo; definir se apoia mídia combinada (imagem + vídeo).

### Tarefa (visão do aluno)
- **Backend:** ⬜ Pendente | **Frontend:** ⬜ Pendente
- Pendências: aluno pode anexar a tarefa quando a entrega for digital; definir se o aluno vê apenas nota final ou também comentários do professor; descrição da tarefa deve aparecer em destaque no topo.

---

## 10. Tarefas do Aluno (pág. 9)

**Especificação do módulo:**
- Só pode ser visto por alunos.
- Objetivo: organização.

### Tela principal de tarefas
- **Backend:** ✅ Pronto | **Frontend:** ⬜ Pendente
- Pendências: hoje reúne tarefas de todas as matérias misturadas — separar/ordenar cronologicamente; facilitar a visualização das tarefas pendentes; ao clicar em uma tarefa, redirecionar para a tela detalhada descrita no módulo 4 (Cadastro de Conteúdo Acadêmico / prova e tarefa).

### Tarefa compartilhada
- **Backend:** ✅ Pronto | **Frontend:** ⬜ Pendente
- Pendências: permitir buscar grupos disponíveis para a turma do aluno; permitir convidar pessoas caso o aluno seja líder do grupo.

---

## 11. Configurações (pág. 10)

### Configuração do usuário
- **Backend:** ⬜ Pendente | **Frontend:** ⬜ Pendente
- Pendências: permitir alterar informações cadastrais; permitir alterar a foto de perfil; avaliar um "modo daltônico" (paleta acessível para daltonismo).

### Configuração da escola
- **Backend:** 🔁 Em revisão | **Frontend:** ⬜ Pendente
- Pendências: acesso restrito à direção/coordenação; permitir informar o cronograma das turmas; permitir alterar informações da escola; avaliar habilitar seções específicas (ex.: restringir a customização de cores ao representante legal da escola).

---

## 12. Módulo em standby (pág. 11)

- Página do board reservada para um módulo ainda não definido — anotação literal: *"a mimir, volte mais tarde nesse módulo"*.
- **Ação:** confirmar com a equipe qual módulo estava planejado para essa página antes de considerá-lo escopo fechado.

---

## 13. Projetos / Hackathon (pág. 12)

**Especificação do módulo:**
- Só pode ser visto por professores (criadores dos projetos) e alunos.
- Feito para cenários como feira técnica e hackathon.
- Funciona como uma "tarefa compartilhada", mas para a escola inteira ou para o público que o professor definir.

### Tela de criação de projeto
- **Backend:** ⬜ Pendente | **Frontend:** ⬜ Pendente
- Pendência: professor cria a ideia do projeto e a mecânica/sistema de pontuação.

### Tela de ver grupos e criar
- **Backend:** ⬜ Pendente | **Frontend:** ⬜ Pendente
- Pendências: alunos podem criar grupos com suas "propostas"; grupo pode ficar aberto ao público (qualquer um entra) ou fechado por convite; definir se professores também podem adicionar/remover integrantes de grupos já formados.

---

## Resumo executivo

| Área | Backend | Frontend |
|---|---|---|
| Login / Cadastro / Landing / Saiba mais | ✅✅✅✅ | ⬜⬜(🔧 em rework)⬜ |
| Escolas (escolha/cadastro) | 🔁✅ | ⬜⬜ |
| Dashboard/Masterpage | 🔁 | ⬜ |
| Cadastro de conteúdo acadêmico | ✅✅✅ | ⬜⬜⬜ |
| Calendário | ✅✅✅ | ✅⬜✅ |
| Gestão de dados da escola | 🔁✅✅✅ | ⬜✅✅✅ |
| Chat | ✅✅✅ | ⬜⬜⬜ |
| Secretaria | ✅🔁✅✅⬜ | ⬜⬜⬜⬜⬜ |
| Matérias | ⬜⬜⬜⬜ | ⬜⬜⬜⬜ |
| Tarefas do aluno | ✅✅ | ⬜⬜ |
| Configurações | ⬜🔁 | ⬜⬜ |
| Projetos/Hackathon | ⬜⬜ | ⬜⬜ |

**Maior lacuna geral:** o frontend está bem atrás do backend em praticamente todos os módulos — a maioria das telas com backend pronto ainda não tem interface implementada. Os módulos de Matérias, Configurações e Projetos/Hackathon estão pendentes nas duas pontas (nem backend nem frontend).

---

## Acompanhamento — Rework da Landing Page

**Status: cores fixas eliminadas via fallback (2026-07-17). Revisão de design ainda pendente.**

A tarefa original era refazer `frontend/app/page.tsx` + `frontend/app/page.module.css` (elimina cores fixas em hexadecimal como `#1cc47b`/`#169162`/`#ebebeb`) usando o design real do Claude Design (não apenas as CSS Variables locais de `frontend/styles/globals.css` como fallback).

**Histórico do bloqueio:** em uma sessão anterior, o Claude Code foi aberto com o diretório de trabalho em `tcc/` (pasta pai), não em `tcc/TccEcossistemaEscolar/`, então o MCP `claude_design` e o subagente `frontend` não carregaram. Numa sessão posterior, mesmo já com o cwd correto (`TccEcossistemaEscolar`), o subagente `frontend` foi acionado mas as ferramentas `mcp__claude_design__list_designs` / `get_design` / `import_design` continuaram fora do conjunto de ferramentas disponíveis para ele — motivo exato não confirmado (possivelmente MCP não autorizado/conectado nessa sessão específica).

**O que foi feito:** seguindo o passo de fallback já previsto, `frontend/app/page.module.css` foi reescrito usando `frontend/styles/globals.css` (CSS Variables do tema) como fonte de verdade, tomando `frontend/app/dashboard/[escolaGUID]/page.module.css` como referência de convenção (mapeamento de cores para `--color-primary*`, `--bg-*`, `--text-*`, sombras para `--shadow-*`, border-radius de botões para `--radius-full`, etc.). `frontend/app/page.tsx` não precisou de alterações. Build de produção validado (`next build` compilou com sucesso; erro pré-existente de dependências `react-dropzone`/`xlsx` ausentes em `node_modules` não tem relação com esta mudança).

### Checklist para fechar definitivamente (usar o design real do Claude Design)

1. Abrir uma sessão do Claude Code com o cwd em `TccEcossistemaEscolar`:
   ```
   cd "C:\Users\ContaSelf\Desktop\tcc\TccEcossistemaEscolar"
   claude
   ```
2. Confirmar explicitamente que as ferramentas `mcp__claude_design__list_designs` / `get_design` / `import_design` aparecem no conjunto de ferramentas disponível (não assumir apenas pelo cwd estar correto — validar na prática, inclusive dentro de subagentes disparados via Task).
3. Importar os designs referenciados em `.claude/agents/frontend.md`:
   - Design Sistema / Componentes: `https://claude.ai/design/p/689c269f-be3b-4445-98c6-69b779c38839`
   - Landing Page: `https://claude.ai/design/p/ccdadcfa-a641-4e2d-b42d-428a0e133f63?file=Landing+Page.dc.html`
4. Revisar `frontend/app/page.tsx` + `frontend/app/page.module.css` (já sem cores hardcoded) contra o design importado — ajustar tipografia, espaçamento, layout e copy/persuasão conforme o design real, preservando o comportamento em JS existente.
