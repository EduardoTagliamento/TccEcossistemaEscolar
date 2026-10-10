# Spec — Simulados no Banco de Questões (2026-10-10)

## Pedido original (verbatim)

> adicione uma função do professor/aluno no banco de questão (aliás, professor n tá vendo o ícone) de criar simulados, como que funcionaria: o aluno/professor apertaria em um botão que redirecionaria para uma nova tela, nela ela pode selecionar o número de questões, depois pode selecionar: "ah quero fazer 5 de eletrostática e 3 de dinâmica", tendo uma flag de randomizada ou não, se for não randomizada, vai aparecer um modelo tinder onde vai aparecer a preview das questão, e você pode rejeitar ou não, até chegar nas quantidades pré determinadas, ao final, vai fazer as questões para fazer no próprio chat, ou clicar em gerar um pdf com as questões

## Decisões já tomadas (perguntadas ao usuário em 2026-10-10)

1. **Alcance**: professor pode **atribuir o simulado a uma turma** (não é só prática pessoal) — "tentar conectar naquele modelo de tarefa lista".
2. **"Fazer no próprio chat"** = a interface web do Banco de Questões (o componente `PraticaQuestoes` já existente), **não** o chatbot do WhatsApp.
3. **Persistência**: o simulado em si é **avulso** (não existe uma tela "Meus simulados" pra reabrir depois) — mas as questões individuais feitas durante ele continuam caindo no tracking de progresso que já existe (`questaobancoprogresso` — aba "Feitas" do histórico), então nada se perde de verdade.
4. **PDF**: inclui **gabarito no final** (página separada com as respostas certas).
5. **Resultado no site**: ao terminar um simulado feito na interface web, mostrar uma barra de resultado com porcentagem de acerto (pedido adicional, 2026-10-10).

## 0. Bug a corrigir primeiro

`frontend/app/dashboard/[escolaGUID]/_components/DashboardNavbar.tsx` só mostra o ícone "Banco de Questões" pra `isAluno`:

```ts
...(isAluno
  ? [{ key: 'banco-questoes', href: ..., label: 'Banco de Questões', icon: 'award' }]
  : []),
```

O backend (`routes/questaobanco.routes.ts`) já libera leitura pra **qualquer usuário autenticado** ("Leitura: qualquer usuário autenticado (aluno praticando, spec item 12)") — nunca teve restrição de papel. É só a navbar que esconde o ícone do professor. Fix: trocar a condição pra `isProfessor || isAluno`, igual já é feito pro item "Matérias" logo acima.

## 1. Por que isso NÃO precisa de uma tabela `simulado` nova

A tentação óbvia é criar `simulado` + `simuladoquestao`. Mas juntando as decisões 1-3 acima, dá pra resolver os dois casos de uso reaproveitando infraestrutura que já existe e já é madura, sem nenhuma tabela nova:

### Caso A — uso pessoal (professor ou aluno praticando sozinho)

Como é **avulso** (decisão 3), o simulado não precisa sobreviver além da sessão em que foi montado. Tudo que ele é, na prática, é **uma lista ordenada de `QuestaoBancoGUID`** — e isso já existe inteiramente no cliente, montado a partir do endpoint que já existe:

- `GET /api/questaobanco?SubMateriaGlobalGUID=X&...` (já existe, `listarQuestoes` no frontend) retorna todas as questões `Validado` de uma submatéria.
- Randomizada: embaralha esse array no cliente e corta nas primeiras N por submatéria pedida.
- Não-randomizada: mostra essas questões uma a uma no modal Tinder; o que for aceito entra na lista final.
- Pra "fazer no site": a lista final (já são objetos `QuestaoBanco` completos, não só GUIDs — não precisa re-buscar nada) alimenta `<PraticaQuestoes questoes={lista} />`, o componente que a prática normal já usa. Cada questão respondida já dispara `QuestaoBancoAPI.registrarResposta(...)`, que é o mesmo endpoint que grava em `questaobancoprogresso` — por isso a decisão 3 ("nada se perde") já é verdade de graça, zero código novo.
- Pra "gerar PDF": único backend novo necessário pro caso A (ver seção 3).

**Nenhuma tabela nova. Nenhum endpoint novo de leitura.** Só precisa: a tela de composição (nova), o modal Tinder (novo componente), e o endpoint de PDF (novo).

### Caso B — professor atribui a uma turma

Aqui sim precisa persistir (os alunos da turma vão abrir isso depois, em momentos diferentes) — mas em vez de inventar `simulado`/`simuladoquestao` do zero, a entidade certa já existe: **`TarefaAcademica` com `TarefaTipoEntrega = 'lista'`** (o "quiz estilo Forms" que já tem professor-cria-questões, aluno-responde, correção automática de objetiva, tudo pronto em `backend/services/tarefaacademica.service.ts`).

O que falta é só um **atalho de criação**: em vez do professor digitar cada questão no construtor manual, ele escolhe questões do Banco de Questões (do jeito descrito no pedido: quantidade por submatéria, randomizada ou Tinder) e o backend **copia** essas questões pra dentro da tarefa-lista nova, usando o método que já existe:

```
criarQuestoesBatch(TarefaGUID, questoesData: QuestaoCreateDTO[], professorGUID)
```

(`backend/services/tarefaacademica.service.ts`, já usado pelo construtor manual do `TarefaForm`). Cada `QuestaoBanco` escolhida vira um `QuestaoCreateDTO`:

| `QuestaoBanco` (banco de questões) | → | `QuestaoCreateDTO` (tarefa lista) |
|---|---|---|
| `Enunciado` | → | `QuestaoEnunciado` |
| (fixo) | → | `QuestaoTipo: 'objetiva'` |
| `Alternativas[].AlternativaTexto` | → | `Alternativas[].AlternativaTexto` |
| `Alternativas[].AlternativaCorreta` | → | `Alternativas[].AlternativaCorreta` |
| — | → | `AlternativaPontos`: pontuação definida na criação da tarefa (ver seção 2.3) |

**Importante**: é uma **cópia**, não uma referência. Se a questão original do banco for editada/removida depois, a prova já atribuída não muda — é o comportamento certo pra uma prova que já foi "publicada" pra uma turma. Isso também significa que simulados atribuídos NÃO entram no tracking de `questaobancoprogresso` (não é a mesma linha de banco de questões) — eles usam o tracking de tarefa normal (`tarefaacademicaMatricula`, correção do professor), que é o mecanismo certo pra essa modalidade (é uma tarefa real, com prazo, nota, etc.).

Consequência prática: **o professor, nesse fluxo, nunca abre o `PraticaQuestoes`** — ele termina a composição e é redirecionado pra tela normal da tarefa criada (`/dashboard/[escolaGUID]/materias/.../tarefas/[tarefaGUID]`), de onde edita prazo/revisa/acompanha como qualquer outra tarefa-lista.

## 2. Fluxo da nova tela (`/dashboard/[escolaGUID]/banco-questoes/simulado`)

Botão de entrada: na home do Banco de Questões (`banco-questoes/page.tsx`), ao lado do link "Ver questões feitas e marcadas" — "Criar simulado".

### 2.1. Etapa 1 — Composição

- Escolher 1 matéria (reaproveita `MateriaGlobalAPI.listarMateriasGlobais`).
- Dentro da matéria, uma lista das submatérias com um campo de quantidade cada (`listarSubMaterias` já existente) — "5 de Eletrostática", "3 de Dinâmica", etc. Quantidade máxima limitada pela contagem real validada daquela submatéria (reaproveita `contarQuestoesValidadas`).
- Toggle **Randomizada** (default ligado).
- **Só pro professor**: toggle extra **"Fazer eu mesmo" vs. "Atribuir a uma turma"**.
  - Se "Atribuir a uma turma": aparece o seletor de turma (das turmas em que ele leciona essa matéria — `listarTurmasComCapaProfessor`) + data de prazo (igual o resto do `TarefaForm`).
- Botão "Continuar".

### 2.2. Etapa 2 — Seleção (só se Randomizada = não)

Modal/tela em cartão único, estilo Tinder, **uma submatéria por vez** (começa pela primeira da lista, avança pra próxima só quando a quota dela for atingida):

- Mostra a preview da questão (enunciado + alternativas, sem indicar qual é a correta — não é pra responder agora, é só pra decidir se ela entra no simulado).
- Dois botões: **Aceitar** (conta pra quota) / **Rejeitar** (descarta, não volta a aparecer).
- Barra de progresso por submatéria: "3 de 5 aceitas — Eletrostática".
- Se o pool da submatéria acabar antes de bater a quota (raro, mas possível com poucas questões cadastradas), avisa e deixa seguir com o que foi aceito até ali, ou voltar e reduzir a quantidade pedida.

Se Randomizada = sim, pula direto pra 2.3 com a seleção já feita no cliente (embaralhar + cortar, por submatéria).

### 2.3. Etapa 3 — Destino

- **Professor + "Atribuir a uma turma"**: chama o novo endpoint (seção 4.2), que cria a `TarefaAcademica` tipo `lista` com as questões copiadas. Pontuação de cada questão: dividir o total de pontos padrão de uma tarefa-lista (hoje definido na criação manual, mesmo default) igualmente entre as N questões escolhidas. Redireciona pra tela da tarefa criada.
- **Pessoal (professor "eu mesmo" ou aluno)**: duas opções lado a lado —
  - **"Fazer agora"** → abre `<PraticaQuestoes questoes={lista} />` na mesma tela (ver seção 5 — resumo com barra de porcentagem).
  - **"Gerar PDF"** → chama o endpoint da seção 4.1, baixa o arquivo.
  - (as duas não são exclusivas — pode fazer no site E baixar o PDF depois, a lista de GUIDs já montada serve pros dois)

## 3. Novo componente: `ModalTinderQuestoes`

`frontend/components/banco-questoes/ModalTinderQuestoes.tsx` — recebe `{ submateria, quantidade, pool: QuestaoBanco[], onConcluir(aceitas: QuestaoBanco[]) }`. Reaproveita o parser de enunciado (`renderEnunciado`/`renderInlineTokens`) que já existe dentro de `PraticaQuestoes.tsx` — vale extrair pra um util compartilhado (`frontend/lib/banco-questoes/renderEnunciado.tsx`) já que vai ser usado nos dois lugares.

## 4. Endpoints novos

### 4.1. `POST /api/questaobanco/simulado/pdf`

- Body: `{ QuestaoGUIDs: string[] }` (ordem define a ordem no PDF).
- Busca as questões (reaproveita `QuestaoBancoService`/`QuestaoBancoDAO` já existentes, método novo `buscarVariasPorGUID` ou um loop sobre `findById`), valida que todas são `Status='Validado'`.
- Gera o PDF com **pdfkit** (biblioteca nova — pura JS, sem Chromium/binário nativo, segura pra instalar e rodar no Railway; não existe nenhuma lib de geração de PDF no projeto hoje, só `pdfjs-dist` que é só leitura). Conteúdo simples, só texto (confirmado: `Enunciado`/`AlternativaTexto` são strings puras, sem imagem embutida na questão — não precisa de HTML/puppeteer):
  - Cabeçalho "Simulado — gerado em DD/MM/AAAA".
  - Questão 1, 2, 3... com enunciado + alternativas A-E.
  - Página final: "Gabarito" com a lista `1-C, 2-A, 3-D...` (decisão 4).
- Resposta: stream do PDF (`Content-Type: application/pdf`, `Content-Disposition: attachment`).
- Rota pública de leitura autenticada (igual o resto do banco de questões) — não precisa de guard extra, mas AINDA PRECISA validar que todos os GUIDs enviados existem e estão `Validado` (não confiar na lista do cliente às ciegas — alguém podia mandar GUID de questão `Pendente`, que não devia ser visível fora da fila de validação).

### 4.2. `POST /api/tarefa/simulado-de-banco` (nome a confirmar com o padrão de `routes/tarefaacademica.routes.ts`)

- Body: `{ matXprofXturxescGUID, QuestaoGUIDs: string[], TarefaTitulo, TarefaPrazoData, ... (demais campos já exigidos por uma tarefa 'lista' hoje) }`.
- Service novo `criarSimuladoComoTarefa` em `tarefaacademica.service.ts` (ou um service fino separado que **chama** `TarefaAcademicaService` por composição, pra não inchar um arquivo que já tem ~2300 linhas):
  1. Cria a `TarefaAcademica` (`TarefaTipoEntrega: 'lista'`) com os métodos que já existem.
  2. Busca as `QuestaoBanco` escolhidas (mesma validação de "todas `Validado`" da seção 4.1).
  3. Monta o array de `QuestaoCreateDTO` (tabela da seção 1) e chama `criarQuestoesBatch`.
  4. Retorna a tarefa criada (mesmo DTO que a criação manual já retorna).
- Permissão: mesma do resto de criação de tarefa (professor dono da alocação `matXprofXturxescGUID`).

## 5. Resultado com barra de porcentagem (pedido adicional)

`PraticaQuestoes.tsx`, tela de resumo (hoje só "Você acertou X de Y!") — adicionar:
- Barra de progresso visual (`<div style={{width: `${pct}%`}}>`, cor da escola — mesmo padrão de `color-mix`/`--color-primary` já usado no cronograma) mostrando a porcentagem de acerto.
- Como o simulado pode cruzar submatérias, vale também um **detalhamento por submatéria** ("Eletrostática: 4/5 — Dinâmica: 2/3"), já que o objeto `QuestaoBanco` de cada questão já carrega `SubMateriaGlobalGUID` — o componente só precisa agrupar o que já tem em mãos, sem request novo.
- Esse resumo melhorado vale tanto pra prática normal (matéria/submatéria única, breakdown vira redundante com o total) quanto pro simulado — não precisa de uma prop nova pra "ligar/desligar", simplesmente sempre mostra o breakdown quando há mais de uma submatéria nas `questoes` recebidas.

## 6. Resumo do que entra em cada camada

**Backend (2 endpoints novos, 0 tabelas novas):**
- `POST /api/questaobanco/simulado/pdf` (+ instalar `pdfkit`)
- `POST /api/tarefa/simulado-de-banco` (ou nome equivalente dentro de `tarefaacademica.routes.ts`)
- Possível método auxiliar `buscarVariasPorGUID` em `QuestaoBancoDAO` (evita N chamadas `findById` nos dois endpoints acima)

**Frontend:**
- Fix do ícone do professor em `DashboardNavbar.tsx`
- Nova rota `banco-questoes/simulado/page.tsx` (wizard de 3 etapas)
- Novo componente `ModalTinderQuestoes.tsx`
- Util compartilhado `renderEnunciado` (extraído de `PraticaQuestoes.tsx`)
- `PraticaQuestoes.tsx`: resumo com barra de % + breakdown por submatéria
- Cliente de API: `criarSimuladoComoTarefa`, `gerarPdfSimulado` (novo arquivo `lib/api/simulado.api.ts`, ou funções adicionadas em `questaobanco.api.ts`/`tarefaacademica.api.ts`)

## 7. Em aberto / a decidir durante a implementação (não bloqueia começar)

- Nome exato da rota 4.2 e se ela vive em `tarefaacademica.routes.ts` ou num arquivo próprio fino.
- Pontuação padrão por questão ao copiar pra tarefa-lista (hoje a criação manual deixa o professor definir ponto a ponto — pra um simulado de N questões, sugestão é dividir igualmente um total configurável, default 10 pontos).
- Limite máximo de questões por simulado (sugestão: 30, evita PDF/tarefa gigante por engano).
