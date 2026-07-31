# Migração técnica: Zod + TanStack Query + react-hook-form (módulo Tarefas)

**Data:** 2026-07-30
**Status:** Piloto (Tarefas) implementado — ver checklists §6/§7. Segunda leva (`conteudo` + `provaagendada`), terceira leva (`grupotarefa` + `convitegrupotarefa`), quarta leva (`grupoprojeto` + `convitegrupoprojeto`), quinta leva (`projeto`), sexta leva (`pendencia`), sétima leva (`categoriaconteudo`) e oitava leva (`calendario` + `gradehoraria` + `horarioturma`) implementadas — ver seção 9. `tsc --noEmit` limpo (raiz e frontend) e `next build` passando em todas as levas. Módulos de Tarefas, Projetos e Pendências 100% migrados. Seção "Conteúdo / Avaliação" do backlog zerada. `categoriaconteudo` e `gradehoraria` migrados no backend por completo; no frontend, só os consumidores que mapeavam limpo pro padrão de hooks foram migrados — ver ressalvas na seção 9.
**Escopo:** piloto original era só o módulo de Tarefas (`TarefaAcademica` — digital/física/lista, questões, alternativas, respostas); a seção 9 documenta a expansão pros demais domínios do app, feita módulo a módulo conforme priorizado com o usuário — não é um rollout de uma vez só.

---

## 0. Por que isso agora

Depois de fechar a implementação da tarefa tipo "lista" (`docs/PLANO_IMPLEMENTACAO_TAREFA_LISTA.md`), avaliamos o que uma biblioteca nova agregaria ao projeto. Três pontos de dor concretos, observados direto no código desta sessão (não é uma sugestão genérica de livro de arquitetura):

1. **Validação no backend é 100% manual e duplicada.** `backend/middlewares/tarefaacademica.middleware.ts` tem ~20 validators, todos escritos à mão (checagem de campo por campo, regex de GUID copiada, `throw new ErrorResponse(...)` repetido). `validateCreateBody` e `validateBatchCreateBody` são ~95% idênticos. Isso já causou bug real nesta sessão: o campo `AnexoCaminho` foi esquecido em mais de um lugar do tipo `QuestaoAnexoResumo` (backend e os dois arquivos de tipo do frontend) até eu notar e corrigir manualmente.
2. **Toda tela de tarefa reimplementa o mesmo boilerplate de fetch.** `useState` de loading/erro/dado + `useEffect` + `fetch` cru + "depois de uma mutation, chamo a função de carregar de novo na mão" — esse exato padrão aparece em `TarefaForm.tsx`, `VisualizadorItemModal.tsx`, `tarefas/page.tsx` e `tarefas/[tarefaGUID]/page.tsx`, sem nenhum cache/dedupe/invalidação automática.
3. **`TarefaForm.tsx` tem mais de 1700 linhas**, boa parte só `setForm(prev => ({...prev, campo: valor}))` repetido pra cada input — maior arquivo do módulo, maior ofensor.

Confirmado com o usuário: as três bibliotecas entram juntas — Zod (backend), TanStack Query (frontend) e react-hook-form + `@hookform/resolvers` (frontend, reaproveitando o mesmo schema Zod usado no backend).

## 1. O que já existe hoje (base pra decisão, confirmado por leitura direta do código)

- **Nenhuma das bibliotecas está instalada** — `zod`, `@tanstack/react-query`, `react-hook-form` e `@hookform/resolvers` não aparecem em nenhum `package.json` do repositório (raiz nem `frontend/`).
- **Não existe validação declarativa em lugar nenhum do backend** — nem `joi`, `yup`, `express-validator`, nada. Todo domínio (não só tarefas) hand-rolla sua própria validação.
- **Toda resposta de erro do backend passa por um único handler global** (`backend/Server.ts::setupErrorMiddleware`), que só sabe montar `{success:false, message, details, timestamp}` corretamente se o erro lançado for `instanceof ErrorResponse` (`backend/utils/ErrorResponse.ts`, classe trivial `(statusCode, message, details?)`). Um erro de outro tipo cai no branch genérico e vira 500 "Erro interno do servidor" — **qualquer adoção de Zod precisa converter `ZodError` pra `ErrorResponse` antes de deixar propagar**, senão perde o status 400 e a mensagem específica.
- **Convenção de mensagem do módulo de tarefas**: `throw new ErrorResponse(400, "Erro na validação de dados", { message: "<mensagem específica>" })` — a mensagem específica sempre fica em `details.message`, nunca na mensagem de topo. (Curiosidade: o frontend hoje só lê o `message` de topo pra montar o `Error()` que aparece no `alert()` — ou seja, o usuário final NUNCA vê a mensagem específica de validação de tarefa hoje, só "Erro na validação de dados" genérico. Vale corrigir isso de brinde durante a migração — ver seção 7.)
- **Rotas de tarefa** (`routes/tarefaacademica.routes.ts`) chamam os validators pelo nome, numa instância `new TarefaAcademicaMiddleware()` sem argumentos, mantendo uma ordem cuidadosa (rotas específicas tipo `/batch` antes do genérico `/:TarefaGUID`). Contanto que a classe mantenha os mesmos nomes de método com a mesma assinatura `(req,res,next)`, a migração pra Zod não precisa tocar nesse arquivo.
- **O controller não valida nada por conta própria** — trata `req.body` como `any`, confia inteiramente na camada de middleware. Migrar só o middleware já basta pra manter o comportamento de hoje.
- **Frontend não tem nenhum client de dados centralizado** — cada `lib/api/*.ts` (uns 30 arquivos) reimplementa `getToken()`/`getHeaders()` e faz `fetch` cru, sem cache. O interceptor global de sessão expirada (`frontend/lib/auth/authFetchInterceptor.ts`) faz monkey-patch em `window.fetch`, então continua funcionando de graça independente de quem chama o `fetch` por baixo — inclusive um `queryFn`/`mutationFn` do TanStack Query.
- **Não existe `providers.tsx`** — o layout raiz (`frontend/app/layout.tsx`) só tem `<AuthProvider>{children}</AuthProvider>`. A convenção do projeto pra estado global é Context + hook no mesmo arquivo, um por domínio (`lib/auth/AuthContext.tsx`, `lib/socket/SocketContext.tsx`, `lib/chat/ChatUIContext.tsx`).
- **Padrão recorrente em `VisualizadorItemModal.tsx`**: quase toda mutation de tarefa chama DUAS coisas depois de salvar — `onProgressoAtualizado()` (avisa a tela-pai, o board de categorias, que também tem progresso pra atualizar) e `await carregarDetalhe()` (recarrega o estado local do próprio modal). São dois escopos de cache diferentes.

## 2. Decisões de arquitetura

| # | Decisão | Motivo |
|---|---|---|
| 1 | Zod entra via um **adapter** (`backend/utils/zodValidate.ts`), não substitui a classe `TarefaAcademicaMiddleware` | Preserva o contrato de erro atual (`ErrorResponse`) e não exige tocar nas rotas |
| 2 | `zodValidate(schema, origem)` retorna um middleware Express; se a validação falhar, converte pro MESMO formato de erro de hoje | Sem isso, `ZodError` cru vira 500 genérico no handler global |
| 3 | Cada método da classe vira `nomeDoMetodo = zodValidate(Schema, 'body');` — mesmo nome, mesma assinatura | Zero mudança em `routes/tarefaacademica.routes.ts` |
| 4 | `validateCreateBody` e `validateBatchCreateBody` colapsam num `TarefaCreateBodySchema` só | Hoje são ~95% duplicados |
| 5 | GUID: adota a regex solta que `tarefaacademica.middleware.ts` já usa (não a estrita de `conteudo.middleware.ts`) | Mantém compatibilidade com o que já está gravado |
| 6 | Controller não muda | Já trata `req.body` como `any`, não precisa do tipo inferido do Zod pra funcionar igual a hoje |
| 7 | `QueryClientProvider` novo em `frontend/lib/query/QueryProvider.tsx`, montado no layout raiz, por cima do `AuthProvider` | Segue a convenção de Context-por-domínio já usada no projeto |
| 8 | Nenhuma mudança no interceptor de 401/sessão expirada | Ele já intercepta `window.fetch` globalmente, funciona pra qualquer `queryFn` sem ajuste |
| 9 | Hooks novos em `frontend/lib/tarefas/` (pasta-por-domínio, como `lib/auth/`, `lib/socket/`) — só funções `useQuery`/`useMutation`, sem Context próprio | Não precisa de estado global próprio, só do `QueryClientProvider` já montado |
| 10 | Chave de query: `['tarefa', guid]`, `['tarefas', filtros]`, `['tarefa', guid, 'questoes']`, etc. (ver seção 5) | Consistência entre os hooks |
| 11 | `onProgressoAtualizado` continua igual, só `carregarDetalhe()` vira invalidação de query | O board de categorias (tela-pai) está fora do escopo desta migração |
| 12 | `react-hook-form` + `@hookform/resolvers` (resolver Zod) em `TarefaForm.tsx` | Confirmado com o usuário — é o único arquivo grande o bastante pra compensar (1700+ linhas, majoritariamente form state manual). `VisualizadorItemModal.tsx` fica de fora: tem só campos soltos (nota, pontos, texto de resposta), não compensa |
| 13 | Schemas Zod duplicados manualmente entre backend e frontend (sem compartilhar arquivo) | Repositório não tem workspace/monorepo configurado entre `package.json` raiz e `frontend/package.json` — juntar de verdade é uma melhoria futura separada |

## 3. Pacotes novos

- **Backend** (`package.json` da raiz): `zod`
- **Frontend** (`frontend/package.json`): `@tanstack/react-query`, `zod`, `react-hook-form`, `@hookform/resolvers`

## 4. Ordem recomendada de execução

1. **Backend — adapter + schemas**: `backend/utils/zodValidate.ts`, `backend/schemas/tarefaacademica.schema.ts` (todos os schemas, ver checklist §6), trocar os métodos de `tarefaacademica.middleware.ts` um a um, validando cada um contra o formato de erro atual antes de ir pro próximo.
2. **Frontend — infraestrutura**: `QueryProvider.tsx` + montagem no layout raiz, `frontend/lib/tarefas/` com os hooks de leitura primeiro (menor risco, sem mutation).
3. **Frontend — telas de leitura simples**: `tarefas/page.tsx` (só listagem).
4. **Frontend — telas com mutation**: `tarefas/[tarefaGUID]/page.tsx`, depois `VisualizadorItemModal.tsx` (mais complexo, por causa do padrão duplo `onProgressoAtualizado` + `carregarDetalhe`).
5. **Frontend — `TarefaForm.tsx`**: primeiro migra pra `useQuery`/`useMutation` (fetch/mutate), depois pra `react-hook-form` + resolver Zod por cima — é o arquivo mais arriscado de mexer (maior, mais estado local hoje), fica por último de propósito.

## 5. Schema Zod compartilhado (mesma forma nos dois lados, ver decisão #13)

Campos principais a modelar (nomes batem com os DTOs já existentes em `backend/services/tarefaacademica.service.ts` e `frontend/types/tarefaacademica.ts`):

- `TarefaCreateBodySchema` — `MatriculasGUID[]`, `matXprofXturxescGUID` (guid), `TarefaTitulo` (1-128), `TarefaConteudo?` (≤1024), `TarefaPrazoData` (data válida), `TarefaTipoEntrega` (`enum(['digital','fisica','lista'])`), `anexosDescricao?` (guid[]), `DatasPorMatricula?`, `TarefaCompartilhada?`, `TarefaMinPessoas?`, `TarefaMaxPessoas?` — reaproveitado em `/` e `/batch` (decisão #4).
- `TarefaUpdateBodySchema` — versão `.partial()` do de cima (só os campos editáveis), com `.refine()` exigindo pelo menos 1 campo presente.
- `QuestaoPayloadSchema` (usado dentro de create/update/import) — `QuestaoEnunciado`, `QuestaoTipo` (`enum(['objetiva','discursiva'])`), `QuestaoPontosMaximos` (> 0), `QuestaoExplicacao?`, `Alternativas?` (≥2 se objetiva, cada uma com `AlternativaTexto`/`AlternativaCorreta`/`AlternativaPontos`, `.refine()` exigindo exatamente 1 correta), `AnexosGUID?`.
- `ResponderObjetivaBodySchema` — `AlternativaGUID` (guid).
- `ResponderDiscursivaBodySchema` — `Texto` (1-8000).
- `AvaliarQuestaoBodySchema` — `Pontos` (≥0).
- Schemas de params (`TarefaGUID`, `QuestaoGUID`, `RespostaGUID`, `AnexoGUID`, `TarefaMatriculaGUID`) — todos `z.string().regex(GUID_REGEX)` exceto `TarefaMatriculaGUID`, que hoje só exige string 1-36 chars (não é sempre um UUID formal).

No frontend, `TarefaForm.tsx` usa a versão client-side desses schemas via `@hookform/resolvers/zod`, então o mesmo `.refine()` de "exatamente uma alternativa correta" já barra o submit antes de bater no backend.

## 6. Checklist — Backend (Zod)

### Infraestrutura
- [x] `backend/utils/zodValidate.ts` — adapter `zodValidate(schema, origem) => middleware`, convertendo `ZodError` pra `ErrorResponse(400, "Erro na validação de dados", {message})`
- [x] `backend/schemas/tarefaacademica.schema.ts` — arquivo com todos os schemas da seção 5

### Validators migrados (`backend/middlewares/tarefaacademica.middleware.ts`)
- [x] `validateIdParam`
- [x] `validateIdParamWithAnexo`
- [x] `validateCreateBody` (unificado com `validateBatchCreateBody`, ver decisão #4)
- [x] `validateBatchCreateBody`
- [x] `validateUpdateBody`
- [x] `validateMarcarFeitoBody`
- [x] `validateAnexoEntregaBody`
- [x] `validateFilters`
- [x] `validateQuestaoCreateBody`
- [x] `validateQuestoesBatchBody`
- [x] `validateImportarQuestoesBody`
- [x] `validateQuestaoUpdateBody`
- [x] `validateReordenarQuestoesBody`
- [x] `validateTarefaEQuestaoIdParam`
- [x] `validateTarefaEMatriculaIdParam`
- [x] `validateQuestaoIdParam`
- [x] `validateAnexoQuestaoBody`
- [x] `validateResponderObjetivaBody`
- [x] `validateResponderDiscursivaBody`
- [x] `validateRespostaIdParam`
- [x] `validateAvaliarQuestaoBody`

**Validado com:** `tsc --noEmit` limpo na raiz + smoke test isolado (12 casos, cobrindo aceitação de payload válido e rejeição com mensagem/formato de erro idêntico ao `ErrorResponse` original) para os validators mais representativos (`validateIdParam`, `validateCreateBody`, `validateQuestaoCreateBody`, `validateFilters`, `validateUpdateBody`, `validateResponderDiscursivaBody`, `validateImportarQuestoesBody`, `validateReordenarQuestoesBody`).

## 7. Checklist — Frontend

### Infraestrutura
- [x] Instalar `@tanstack/react-query`, `zod`, `react-hook-form`, `@hookform/resolvers`
- [x] `frontend/lib/query/QueryProvider.tsx` (novo) + montagem em `frontend/app/layout.tsx`
- [x] `frontend/lib/tarefas/` — pasta nova pros hooks (`queryKeys.ts`, `useTarefaQueries.ts`, `useTarefaMutations.ts`)

### Hooks de leitura (`useQuery`)
- [x] `useTarefa(tarefaGUID)` — `buscarTarefa`
- [x] `useTarefas(filters)` — `listarTarefas`
- [x] `useTarefaItemDetalhe(tarefaGUID, ehProfessor)` — `buscarTarefaItemDetalhe` (novo, endpoint com `minhaMatricula`, usado pelo `VisualizadorItemModal`; adição não prevista originalmente na spec, necessária pra cobrir esse endpoint)
- [x] `useQuestoes(tarefaGUID)` — `listarQuestoes` (professor)
- [x] `useQuestoesComRespostas(tarefaGUID)` — `buscarQuestoesComRespostas` (aluno)
- [x] `useRespostasAluno(tarefaGUID, matriculaGUID)` — `buscarRespostasAluno` (correção)
- [x] `useEstatisticasItem` / `useEstatisticasPorQuestao`

### Hooks de mutation (`useMutation`)
- [x] `useCriarTarefa` / `useAtualizarTarefa` / `useExcluirTarefa`
- [x] `useCriarQuestao` / `useCriarQuestoesBatch` / `useAtualizarQuestao` / `useExcluirQuestao` / `useReordenarQuestoes`
- [x] `useVincularAnexoQuestao` / `useDesvincularAnexoQuestao`
- [x] `useResponderObjetiva` / `useResponderDiscursiva`
- [x] `useAvaliarQuestaoDiscursiva` / `useAvaliarTarefa`
- [x] `useMarcarComoFeito` / `useEnviarAnexoEntrega`
- [x] `useImportarQuestoesPlanilha`

### Telas convertidas
- [x] `frontend/app/dashboard/[escolaGUID]/tarefas/page.tsx` — TanStack Query
- [x] `frontend/app/dashboard/[escolaGUID]/tarefas/[tarefaGUID]/page.tsx` — TanStack Query (fetch de grupo/`GrupoTarefa` migrado depois, ver seção 9 — hoje 100% TanStack Query)
- [x] `frontend/components/materias/VisualizadorItemModal.tsx` — TanStack Query (parte de tarefa/lista; conteúdo/prova migrados depois, ver seção 9 — hoje o modal inteiro usa TanStack Query)
- [x] `frontend/components/materias/ImportarQuestoesPlanilha.tsx` — TanStack Query
- [x] `frontend/app/dashboard/[escolaGUID]/cadastro/TarefaForm.tsx` — migrado pra `useQuery`/`useMutation` (listagem interna + CRUD de tarefa/questão; a criação em lote por turma e a sincronização de questões em modo edição continuam como orquestração imperativa sequencial — não fazem sentido como hooks declarativos, ver §8)
- [x] `frontend/app/dashboard/[escolaGUID]/cadastro/TarefaForm.tsx` — migrado pra `react-hook-form` + resolver Zod (schema `TarefaFormSchema` espelhando o backend; usa `watch()`/`setValue()`/`reset()` em vez de `register()` — os inputs já eram controlados e a árvore de seleção de alunos/questões/agendamento não são campos RHF, ver §8)

## 8. Riscos e pontos de atenção

- **Não deixar `ZodError` vazar cru** — sempre passar pelo adapter da seção 2, decisão #2. Testar explicitamente que o formato de erro não muda (mesmo `statusCode`, mesmo formato de `details`).
- **`QueryClientProvider` precisa ser instanciado uma vez só por sessão do app** (`useState(() => new QueryClient())`, não `new QueryClient()` direto no corpo do componente) — senão o cache reseta a cada render.
- **Padrão duplo `onProgressoAtualizado` + `carregarDetalhe`** em `VisualizadorItemModal.tsx` — não remover o `onProgressoAtualizado()`, só substituir o `carregarDetalhe()` por invalidação de query.
- **`TarefaForm.tsx` é o arquivo de maior risco** — tem lógica bem específica (agendamento automático via cronograma, seleção de alunos em árvore, sincronização de questões em modo edição) que não é pura validação de campo — o `react-hook-form` cuida do estado dos campos "simples", mas essas partes maiores continuam com lógica própria por cima.
- **Decisão tomada na implementação:** a criação de tarefa em lote (`POST /tarefa/batch`, um payload por turma dentro de um loop `for`) e a sincronização de questões em modo edição (`sincronizarQuestoesEdicao`, diffing criar/atualizar/excluir/reordenar) continuam chamando a API de forma sequencial/imperativa — os hooks de mutation exigem um GUID fixo por hook (regra dos hooks: não dá pra chamar `useMutation` dentro de um loop), então forçar esses fluxos por hooks pré-vinculados não caberia sem reestruturar a orquestração. As mutations de questão dentro de `sincronizarQuestoesEdicao` (que operam sobre `editingGUID`, estável) usam os hooks normalmente — só a criação em lote com GUID variável por iteração ficou com a função de API direta.
- **`TarefaForm.tsx` usa `watch()`/`setValue()`/`reset()` do react-hook-form, não `register()`** — os inputs já eram 100% controlados (`value`/`onChange`) antes da migração; trocar para `register()` exigiria reescrever cada input, sem ganho real já que a validação centralizada (via `zodResolver`) é o que importava. Erros de validação aparecem no mesmo banner de erro genérico que já existia (`{erro && ...}`), não campo a campo — consistente com o padrão do resto do formulário.
- **De brinde, considerar** (fora do escopo obrigatório, mas barato de fazer junto): fazer os `lib/api/tarefaacademica.api.ts`/`materiasmodulo.api.ts` também lerem `details?.message` além do `message` de topo, pra mensagem de erro específica finalmente aparecer pro usuário em vez do genérico "Erro na validação de dados".
- **Esquemas duplicados front/back** (decisão #13) — se um campo mudar de um lado, precisa lembrar de atualizar o outro à mão, exatamente como já acontece hoje com os tipos TS. Não é uma regressão, mas também não resolve esse problema de raiz.

## 9. Backlog — expansão pros demais módulos

Confirmado com o usuário: só o módulo de Tarefas foi migrado no piloto original (ver seção 0). Esta seção lista os demais domínios do backend/frontend como candidatos ao mesmo tratamento (adapter Zod no middleware + hooks TanStack Query no client), agrupados por área. `conteudo` e `provaagendada` já foram migrados (ver detalhes logo abaixo) — o restante segue como mapeamento pra priorização futura, não um compromisso de trabalho.

### ✅ `conteudo` + `provaagendada` (migrados)

Escolhidos como segunda leva porque fechavam por completo o `VisualizadorItemModal.tsx` (as partes de conteúdo/prova que ficaram de fora no piloto — ver nota antiga na seção 8, já atualizada).

- [x] **Backend `provaagendada`** — segue exatamente o mesmo padrão de tarefaacademica (mensagem de topo genérica "Erro na validação de dados", GUID solto). `backend/schemas/provaagendada.schema.ts` (`ProvaIdParamSchema`, `ProvaCreateBodySchema`, `ProvaUpdateBodySchema`, `ProvaFiltersQuerySchema`) + `backend/middlewares/provaagendada.middleware.ts` migrado (4 validators: `validateIdParam`, `validateCreateBody`, `validateUpdateBody`, `validateFilters`).
- [x] **Backend `conteudo`** — domínio com convenção DIFERENTE de tarefaacademica: mensagem de topo é específica por campo (ex. `"MateriaGUID inválido"`, não o genérico "Erro na validação de dados"), GUID é regex **estrita** (UUIDv4), e a classe usa métodos **estáticos** (não instância). Isso motivou estender `backend/utils/zodValidate.ts`: terceiro parâmetro opcional `mensagemTopo` (string ou função `(campo) => string`), default mantém o comportamento genérico já usado por tarefaacademica/provaagendada — mudança 100% retrocompatível. `backend/schemas/conteudo.schema.ts` tem o mapa `MENSAGENS_TOPO`/`mensagemTopoConteudo()`. Migrados: `validarGUID` e `validarCriacao`.
  - **Ressalva importante**: `POST /api/conteudo` é `multipart/form-data` (upload de arquivo via `conteudoUploadMiddleware` antes do middleware de validação) — todo campo não-arquivo chega em `req.body` como **string** (multer), nunca JSON parseado. `ConteudoCriacaoBodySchema` valida exatamente esse nível cru (ex. `TurmasGUID` só verifica string não-vazia, não que é um array de fato) — o `JSON.parse` de `TurmasGUID`/`DatasPorTurma`/`CategoriasPorTurma` continua 100% no `ConteudoController.store()`, intocado. `PUT /:guid` (`atualizarConteudo`) também é multipart mas nunca teve validator de body — nada mudou aí.
  - Validado com `tsc --noEmit` limpo + smoke test isolado (9 casos, incluindo a checagem de que a mensagem de topo por campo de `conteudo` bate exatamente com o middleware original).
- [x] **Frontend — API** — `frontend/lib/api/provaagendada.api.ts` (novo arquivo — não existia nenhum client de API pra ProvaAgendada antes; só existia `registrarVisualizacaoProva` solto em `materiasmodulo.api.ts`, mantido como estava). `frontend/lib/api/conteudo.api.ts` já existia completo, reaproveitado como estava.
- [x] **Frontend — hooks** — `frontend/lib/conteudo/` (`queryKeys.ts`, `useConteudoQueries.ts` com `useConteudo`/`useConteudos`, `useConteudoMutations.ts` com `useExcluirConteudo`/`useRemoverConteudoDeTurma`/`useRegistrarProgressoVideo`/`useRegistrarProgressoTexto`/`useRegistrarProgressoPagina`) e `frontend/lib/provaagendada/` (mesma estrutura, `useProva`/`useProvas`, `useCriarProva`/`useAtualizarProva`/`useExcluirProva`/`useRemoverProvaDeTurma`/`useRegistrarVisualizacaoProva`).
- [x] **Frontend — `VisualizadorItemModal.tsx`** — as branches `item.Tipo.startsWith('conteudo_')` e `item.Tipo === 'prova'` de `carregarDetalhe()` foram removidas por completo (a função inteira foi deletada — não sobrou nada nela depois de tarefa/conteúdo/prova saírem). Estado `conteudo`/`provaDetalhe` (useState) virou `useConteudo`/`useProva` (useQuery). Efeitos de progresso (`registrarProgressoTexto` ao abrir texto, `registrarVisualizacaoProva` ao abrir prova) viraram `useEffect` com um `useRef` guardando o `ItemGUID` já registrado, pra disparar só uma vez por item aberto (não a cada refetch do TanStack Query) — mesmo efeito prático do fetch-uma-vez-por-item original. `handleVideoTimeUpdate`/`handleVideoEnded`/`reportarProgressoYoutube`/o `useEffect` de progresso de página migraram pra `registrarProgressoVideoMutation`/`registrarProgressoPaginaMutation`. `excluirItem()` (branches conteúdo/prova) migrou pra `useExcluirConteudo`/`useRemoverConteudoDeTurma`/`useExcluirProva`/`useRemoverProvaDeTurma`. `onProgressoAtualizado()` continua sendo chamado do mesmo jeito (decisão #11 do piloto, preservada).
- **Não migrado nesta leva** (deliberadamente fora): `ConteudoForm.tsx`/`ProvaAgendadaForm.tsx` (telas de criação/edição, análogas ao `TarefaForm.tsx` — ficam pro próprio ciclo de vida delas, não fazem parte de "fechar o modal"), `categoriaconteudo` (board de categorias, tela-pai que já estava fora do escopo desde o piloto original — decisão #11).

### ✅ `categoriaconteudo` (migrado — backend completo, frontend parcial)

Sétima leva — primeiro domínio "tela-pai" que ficou de fora do escopo desde o piloto original (decisão #11), agora endereçado.

- [x] **Backend** — mesmo padrão de `conteudo` (mensagem de topo específica por campo, GUID estrito), com uma complicação nova: `validarCriacao`/`validarAtualizacao` validam um body ANINHADO (`{ categoria: { MateriaGUID, TurmaGUID, CategoriaNome } }`), não plano. Isso exigiu uma pequena extensão em `backend/utils/zodValidate.ts`: a função `mensagemTopo(campo)` agora recebe o **último** segmento do `path` do issue Zod (era o primeiro) — em `categoriaconteudo` o path de um erro em `categoria.MateriaGUID` é `['categoria', 'MateriaGUID']`, e o nome do campo em si é o último segmento. Mudança 100% retrocompatível: todo domínio anterior que já usava a função (`conteudo`) tem schemas de profundidade 1, onde primeiro e último segmento são o mesmo. `backend/schemas/categoriaconteudo.schema.ts` (12 schemas cobrindo os 10 validators — 2 deles, `validarCriacao`/`validarAtualizacao`, têm o body aninhado) + `backend/middlewares/categoriaconteudo.middleware.ts` migrado (10 validators, todos estáticos). Os campos de "lista completa" (`ordem`, `itens`, `TurmasGUID`) usam `z.unknown().refine(...)` em vez de `z.array()` tipado — necessário pra preservar exatamente o comportamento original de "qualquer desvio de formato (não-array, item do tipo errado, GUID inválido) cai na MESMA mensagem única", em vez de mensagens diferentes por tipo de falha que um `z.array(z.string().regex(...))` produziria.
  - Validado com `tsc --noEmit` limpo + smoke test isolado (26 casos, cobrindo os 10 validators, incluindo os casos de lista vazia permitida vs. proibida — `itens`/`ordem` da categoria "gerais" aceitam lista vazia no original, `ordem`/`TurmasGUID` dos demais exigem não-vazia — replicado fielmente).
- [x] **Frontend — hooks** — `frontend/lib/categoriaconteudo/` (`queryKeys.ts`, `useCategoriaConteudoQueries.ts` com `useCategorias`/`useBoardGeral`/`usePendenciaAgregada`, `useCategoriaConteudoMutations.ts` com todas as 11 mutations do domínio) — criados com paridade completa da API, mesmo que nem todo consumidor tenha sido migrado nesta leva (ver ressalva abaixo).
- [x] **Frontend — `GerenciarCategoriasModal.tsx`** — único consumidor migrado nesta leva: modal autocontido do board "geral" (categorias do professor replicadas em todas as turmas), único `materiaGUID`. Mapeamento limpo porque os 3 endpoints de mutation que ele usa (`criarCategoriaGeral`, `reordenarCategoriasGerais`, `moverItemBoardGeral`) devolvem o `BoardGeral` inteiro já atualizado — em vez de só invalidar e esperar um refetch, o `onSuccess` de cada mutation escreve a resposta direto no cache via `queryClient.setQueryData(...)`, reproduzindo exatamente o `setBoard(resultado)` que existia antes. O drag-and-drop de reordenar categoria continua fazendo a atualização otimista local (agora via `queryClient.setQueryData` em vez de `setState`) antes de disparar a mutation, com `boardQuery.refetch()` como fallback de erro — mesmo comportamento de antes, só trocando o dono do estado (cache do TanStack Query em vez de `useState` do componente).
- **Não migrado nesta leva (deliberado)**:
  - `materias/[materiaGUID]/turmas/[turmaGUID]/page.tsx` (o board de categorias DENTRO de uma turma, com drag-and-drop de categorias E itens) — a fonte de dados principal dessa tela é `MateriasModuloAPI.buscarCategoriasCompletas` (`frontend/lib/api/materiasmodulo.api.ts`), um domínio DIFERENTE e ainda não migrado (fora do escopo declarado desta leva, que é só `categoriaconteudo`). As mutations de `categoriaconteudo` que essa tela usa (`atualizarCategoria`/`excluirCategoria`/`atualizarCategoriaGeral`/`excluirCategoriaGeral`/`reordenarCategorias`/`reordenarItens`) continuam com chamada direta à API — migrá-las pra hooks sem migrar `materiasmodulo` junto criaria uma invalidação de cache que não teria efeito nenhum na tela (que não lê de nenhuma query do TanStack Query hoje). Ficam para quando `materiasmodulo`/o board por-turma entrar em pauta.
  - `TarefaForm.tsx` / `ConteudoForm.tsx` / `ProvaAgendadaForm.tsx` — usam `buscarBoardGeral`/`listarCategorias`/`resolverCategoriaPorNomeParaTurmas` de forma pontual/sob-demanda (abrir dropdown, resolver nome→GUID no submit), embutidos em fluxos de formulário já grandes e já sinalizados como de maior risco (`TarefaForm.tsx`, ver seção 8) — mesma lógica de "não force hooks declarativos em orquestração imperativa" já documentada ali.
  - `DashboardNavbar.tsx` (`verificarPendenciaAgregada`) — é um único booleano derivado pro badge da navbar, não uma tela; baixo risco de qualquer jeito, mas fora do escopo de "consumidor de tela" desta leva.

### ✅ `calendario` + `gradehoraria` + `horarioturma` (migrados)

Oitava leva — os três itens pequenos e relacionados que sobravam em "Conteúdo / Avaliação".

- [x] **Backend `calendario`** — mesmo padrão de tarefaacademica (mensagem de topo genérica "Erro na validação de dados" + `details.message`), GUID solto (`GUID_REGEX` sem exigir versão 4, igual ao middleware original). `backend/schemas/calendario.schema.ts` (`CalendarioFiltrosQuerySchema` com `.superRefine()` pro cross-check `DataInicio <= DataFim`, `CalendarioDiaParamSchema`) + `backend/middlewares/calendario.middleware.ts` migrado (2 validators). Único detalhe de forma: a classe é instanciada (`new CalendarioMiddleware()` em `routes/calendario.routes.ts`), não estática como a maioria dos outros domínios — os métodos continuam sendo class fields (`validateFilters = zodValidate(...)`), então nada mudou na forma de uso, só o corpo.
- [x] **Backend `gradehoraria`** — convenção de mensagem por campo (igual `conteudo`/`categoriaconteudo`), GUID estrito, método estático único (`validarCalcularDatas`). `backend/schemas/gradehoraria.schema.ts` valida um array `Escolhas` não vazio de objetos `{ TurmaGUID, SemanaBase, DiaSemana?, DeslocamentoMinutos? }` — usa `z.array(EscolhaSchema)` (não o padrão `z.unknown().refine()` de `categoriaconteudo`) porque aqui cada item tem uma FORMA fixa e sempre conhecida (não é uma lista "solta" de GUIDs/nomes), então deixar o Zod validar objeto-a-objeto com mensagens específicas por campo é mais preciso e continua batendo com o comportamento original (que também verificava campo a campo dentro do `for`).
- [x] **Backend `horarioturma`** — mesma convenção de `gradehoraria`, com um detalhe novo: `validarCriacaoSlot` valida um body aninhado `{ slot: {...} }` (igual `categoriaconteudo`), então já aproveita o ajuste "último segmento do path" feito na leva anterior. Combinação HoraInicio/HoraFim tratada com um `.superRefine()` que só roda depois que os dois campos já passaram no formato individual — replica a semântica de curto-circuito do middleware original (`!isHoraValida(...) || !isHoraValida(...)` primeiro, comparação de ordem depois). `backend/schemas/horarioturma.schema.ts` (3 schemas) + `backend/middlewares/horarioturma.middleware.ts` migrado (3 validators).
  - Validado com `tsc --noEmit` limpo + smoke test isolado (24 casos cobrindo os 7 validators dos três domínios).
- [x] **Frontend `horarioturma`** — `frontend/lib/api/horarioturma.api.ts` já existia completo, reaproveitado. `frontend/lib/horarioturma/` (`queryKeys.ts`, `useHorarioTurmaQueries.ts` com `useCronograma`, `useHorarioTurmaMutations.ts` com `useAlocarSlot`/`useRemoverSlot`). Tela migrada: `gestao-dados/turmas/[turmaGUID]/cronograma/page.tsx` (grade drag-and-drop de matéria×horário) — só o cronograma virou query/mutations; `turma`/`escolaconfiguracao` (dados de turma e slots de horário da escola) continuam com fetch manual, são domínios diferentes fora de escopo.
- [x] **Frontend `calendario`** — não existia `calendario.api.ts` nenhum: a única tela que usa esse endpoint (`dashboard/[escolaGUID]/calendario/page.tsx`) chamava `fetch('/api/calendario?...')` cru, direto (relativo, via o rewrite de dev do `next.config.js` pro backend), sem passar pelo padrão `API_URL` que todo outro `lib/api/*.ts` do projeto usa. Criado `frontend/lib/api/calendario.api.ts` (`listarCalendario`) seguindo o padrão normal, + `frontend/lib/calendario/` (`queryKeys.ts`, `useCalendarioQueries.ts` com `useCalendario`). A tela tinha uma função `carregarCalendario()` só que buscava TRÊS coisas de domínios diferentes de uma vez (avisos de `calendario`, anotações de `anotacao`, eventos de `evento`) — separada em `avisosQuery` (novo hook) + `carregarAnotacoesEEventos()` (o que sobrou, ainda manual, domínios fora de escopo). Efeito colateral positivo: os 4 handlers de CRUD de anotação chamavam a função inteira (recarregando avisos+eventos também, sem necessidade — criar/editar/excluir uma anotação nunca muda a lista de avisos de tarefa/prova); agora chamam só `carregarAnotacoesEEventos()`, cortando 2 round-trips desnecessários por ação. Já `handleToggleTarefaFisica` (marca tarefa física como feita) genuinamente precisa atualizar `avisos` — usa `avisosQuery.refetch()`.
- **Não migrado nesta leva**: `gradehoraria.api.calcularDatas` (usado ad-hoc dentro de `TarefaForm.tsx`/`ProvaAgendadaForm.tsx` pra resolver data automática a partir do cronograma) — mesma decisão da leva de `categoriaconteudo`: chamada pontual/sob-demanda embutida em formulário já grande e sinalizado como de maior risco, não uma tela com ciclo de vida "carrega → mostra → mutation" que se beneficie de virar hook.

### ✅ `grupotarefa` + `convitegrupotarefa` (migrados)

Terceira leva — fecha 100% o módulo de Tarefas (o fetch de grupo que ainda ficava manual em `tarefas/[tarefaGUID]/page.tsx`).

- [x] **Backend** — mesmo padrão de tarefaacademica/provaagendada (mensagem de topo genérica, GUID solto). `backend/schemas/grupotarefa.schema.ts` (`TarefaGUIDParamSchema`, `GrupoGUIDParamSchema`, `GrupoAndMembroParamsSchema`, `NomeGrupoBodySchema`, `TransferirLiderBodySchema`) + `backend/middlewares/grupotarefa.middleware.ts` migrado (5 validators). `backend/schemas/convitegrupotarefa.schema.ts` (`ConviteGrupoGUIDParamSchema`, `ConviteGUIDParamSchema`, `EnviarConviteBodySchema`) + `backend/middlewares/convitegrupotarefa.middleware.ts` migrado (3 validators). Único detalhe novo: CPF em `params`/`body` chega às vezes mascarado (`123.456.789-01`) — o schema usa `.transform(v => v.replace(/\D/g,''))` antes do `.refine()` de 11 dígitos, igual ao middleware original fazia manualmente.
  - Validado com `tsc --noEmit` limpo + smoke test isolado (8 casos, incluindo CPF mascarado sendo limpo corretamente).
- [x] **Frontend — API** — `frontend/lib/api/grupotarefa.api.ts` e `convitegrupotarefa.api.ts` já existiam completos, reaproveitados. Dois bugs pré-existentes corrigidos ao empacotar em hooks (não é comportamento novo, é correção): `listarGruposDaTarefa` estava tipado como `GrupoTarefa[]` mas o backend sempre devolveu `GrupoTarefaComMembrosDTO[]` (com `Membros`) — corrigido o tipo de retorno pra `GrupoTarefaComMembros[]`; `transferirLideranca` enviava `{ NovoCPFLider }` no body mas o backend sempre esperou `{ NovoLiderCPF }` — a chamada de transferência de liderança **nunca funcionou** em produção (sempre batia 400 de validação). Corrigido pro nome de campo certo.
- [x] **Frontend — hooks** — `frontend/lib/grupotarefa/` (`useGruposDaTarefa`, `useGrupoComMembros`, `useAtualizarNomeGrupo`, `useExpulsarMembro`, `useTransferirLideranca`) e `frontend/lib/convitegrupotarefa/` (`useConvitesPendentes`, `useEnviarConvite`, `useSolicitarEntrada`, `useAceitarConvite`, `useRecusarConvite`).
- [x] **Frontend — telas/componentes** — `tarefas/[tarefaGUID]/page.tsx` (o fetch manual de "meu grupo" virou duas queries encadeadas: `useGruposDaTarefa` lista os grupos da tarefa — já vem com `Membros` de cada um — e acha o grupo do usuário no cliente; `useGrupoComMembros` busca o detalhe completo só desse grupo). `ConviteGrupoModal.tsx`, `TransferirLiderancaModal.tsx`, `ConvitesPendentesModal.tsx`, `SolicitarEntradaModal.tsx` — todos os 4 modais migrados (eram os únicos consumidores desses fetches manuais). Como as mutations já invalidam `grupoTarefaKeys.all`/`conviteGrupoTarefaKeys.pendentes` sozinhas, o antigo padrão "callback `recarregarGrupo` chamado manualmente após cada ação" virou só `queryClient.invalidateQueries(...)` — os modais continuam recebendo os mesmos props (`onConviteEnviado`, `onTransferido`, etc.), só a implementação por trás mudou.
- **Não migrado nesta leva**: `ConviteGrupoModal.tsx` tem um TODO pré-existente de dados mockados (busca de "alunos disponíveis da turma" ainda não tem endpoint real) — fora do escopo, não é uma regressão desta migração.

### ✅ `grupoprojeto` + `convitegrupoprojeto` (migrados)

Quarta leva — análogo direto da terceira (`grupotarefa`/`convitegrupotarefa`), mesmo padrão aplicado agora ao módulo de Projetos.

- [x] **Backend** — mesmo padrão genérico ("Erro na validação de dados" + `details.message`, GUID solto, CPF às vezes mascarado limpo via `.transform()`). `backend/schemas/grupoprojeto.schema.ts` (8 schemas: `ProjetoGUIDParamSchema`, `GrupoGUIDParamSchema`, `GrupoAndMembroParamsSchema`, `CreateGrupoBodySchema`, `UpdateGrupoBodySchema`, `PontuacaoBodySchema`, `AdicionarMembroBodySchema`, `TransferirLiderBodySchema`) + `grupoprojeto.middleware.ts` migrado (8 validators). `backend/schemas/convitegrupoprojeto.schema.ts` (3 schemas, idêntico em forma ao `convitegrupotarefa.schema.ts`) + `convitegrupoprojeto.middleware.ts` migrado (3 validators).
  - Validado com `tsc --noEmit` limpo + smoke test isolado (8 casos).
- [x] **Frontend — API** — `frontend/lib/api/grupoprojeto.api.ts` e `convitegrupoprojeto.api.ts` já existiam completos e corretos (sem bugs de nome de campo desta vez, ao contrário da leva de `grupotarefa`), só reaproveitados.
- [x] **Frontend — hooks** — `frontend/lib/grupoprojeto/` (`useGruposDoProjeto`, `useGrupo`, `useCriarGrupo`, `useAtualizarGrupo`, `useAtualizarPontuacao`, `useEntrarGrupo`, `useSairGrupo`, `useAdicionarMembro`, `useExpulsarMembro`, `useTransferirLideranca`) e `frontend/lib/convitegrupoprojeto/` (`useConvitesPendentes`, `useEnviarConvite`, `useSolicitarEntrada`, `useAceitarConvite`, `useRecusarConvite` — só `useSolicitarEntrada` tem consumidor real hoje, os demais existem pra paridade com a API mas não têm UI que os chame ainda, ver nota abaixo).
- [x] **Frontend — telas** — `projetos/[projetoGUID]/page.tsx` (lista de grupos do projeto + criar grupo + entrar em grupo aberto — `buscarProjeto`/`encerrarProjeto`, do domínio `projeto` fora de escopo, continuam com fetch manual, mesmo split que `VisualizadorItemModal.tsx` fez entre tarefa/conteúdo) e `projetos/[projetoGUID]/grupos/[grupoGUID]/page.tsx` (o mais denso: 8 ações diferentes — entrar, solicitar entrada, sair, expulsar, transferir liderança, alternar visibilidade, adicionar membro, atribuir pontuação — todas migradas pra mutations; o wrapper `executar()` que existia pra centralizar mensagem de sucesso/erro continua, só perdeu o `carregarDados()` manual no final porque as mutations já invalidam a query sozinhas).
- **Não migrado nesta leva**: `projetos/page.tsx` (listagem, só usa o domínio `projeto`, não toca em grupo — nada a fazer aqui). `listarPendentes`/`aceitarConvite`/`recusarConvite` de `convitegrupoprojeto` não têm nenhum componente consumidor hoje (não existe um "ConvitesPendentesModal" equivalente pro módulo de Projetos) — os hooks foram criados por paridade/futuro, mas não há UI pra testar agora.

### Grupos e convites — restante
(nenhum — os dois domínios de grupo já migrados)

### ✅ `projeto` (migrado)

Quinta leva — fecha o módulo de Projetos por completo (as duas telas de grupo migradas na leva anterior ainda tinham `buscarProjeto`/`encerrarProjeto` com fetch manual, chamados em paralelo com os dados de grupo via `Promise.all`).

- [x] **Backend** — mesmo padrão genérico. `backend/schemas/projeto.schema.ts` (`ProjetoGUIDParamSchema`, `EscolaGUIDQuerySchema`, `CreateProjetoBodySchema`, `UpdateProjetoBodySchema`) + `backend/middlewares/projeto.middleware.ts` migrado (4 validators). Duas validações cruzadas via `superRefine`: `TurmasGUID` obrigatório e não-vazio só quando `ProjetoPublicoAlvo === 'Turmas'`, e `ProjetoGrupoMaxPessoas >= ProjetoGrupoMinPessoas`.
  - Validado com `tsc --noEmit` limpo + smoke test isolado (8 casos).
- [x] **Frontend — API** — `frontend/lib/api/projeto.api.ts` já existia completo e correto, só reaproveitado.
- [x] **Frontend — hooks** — `frontend/lib/projeto/` (`useProjetos`, `useProjeto`, `useCriarProjeto`, `useAtualizarProjeto`, `useEncerrarProjeto`).
- [x] **Frontend — telas** — `projetos/page.tsx` (listagem; a checagem de permissão de criação via `/api/usuario/:cpf/escolas` continua manual, é outro domínio), `crud-projeto/page.tsx` (criação; a listagem de turmas elegíveis continua manual, é do domínio `turma`), `projetos/[projetoGUID]/page.tsx` e `.../grupos/[grupoGUID]/page.tsx` — os dois últimos perderam de vez o fetch manual de `projeto` que tinha sobrado da leva anterior; agora os dois domínios (`projeto` + `grupoprojeto`) rodam em paralelo via dois hooks independentes em vez de `Promise.all` manual.

### ✅ `pendencia` (migrado)

Sexta leva — item avulso que sobrava da seção "Projetos e pendências".

- [x] **Backend** — terceiro contrato de erro distinto dos vistos até aqui: a mensagem específica vai **direto no topo** do `ErrorResponse` (`new ErrorResponse(400, "<mensagem>")`, só 2 argumentos — sem `details` nenhum), diferente tanto do genérico de tarefaacademica/provaagendada/grupotarefa/grupoprojeto/projeto (`details.message`) quanto do campo-específico-com-details de `conteudo`. Isso motivou uma terceira extensão em `backend/utils/zodValidate.ts`: 4º parâmetro opcional `opcoes: { semDetails?: boolean }` — quando `true`, a mensagem do próprio issue Zod vira a mensagem de topo e nenhum `details` é passado pro `ErrorResponse`; default `false` preserva 100% o comportamento das cinco levas anteriores (retrocompatível). GUID usa a regex estrita (UUIDv4), igual a `conteudo`. `backend/schemas/pendencia.schema.ts` (`PendenciaGUIDParamSchema`, `CreatePendenciaBodySchema`, `UpdatePendenciaBodySchema`, `PendenciaQueryParamsSchema`, `PendenciaQueryContadorSchema`) + `backend/middlewares/pendencia.middleware.ts` migrado (5 validators, todos estáticos, mesmos nomes/assinaturas de antes).
  - **Simplificação deliberada**: o `validarUpdate` original testava "pelo menos um campo" com uma assimetria (`!PendenciaTitulo` e `!PendenciaPrazoData` — falsy, então string vazia também contava como "ausente" — vs. `PendenciaConteudo === undefined` — estrito). O schema novo usa um `.refine()` uniforme checando `!== undefined` nos três campos. Diferença de comportamento só no caso extremo de mandar `PendenciaTitulo: ""` explicitamente sem mais nada — antes era tratado como "nenhum campo fornecido", agora passa a validação de "pelo menos um campo" e cai na checagem de tamanho mínimo de 3 caracteres (rejeitado de qualquer forma, só que com mensagem diferente).
  - Validado com `tsc --noEmit` limpo + smoke test isolado (18 casos, incluindo a confirmação de que cada mensagem de erro bate exatamente com a string do middleware original e que nenhum dos casos usa `details`).
- [x] **Frontend — API** — `frontend/lib/api/pendencia.api.ts` já existia completo e correto (CRUD + anexos + contador), só reaproveitado.
- [x] **Frontend — hooks** — `frontend/lib/pendencia/` (`queryKeys.ts`, `usePendenciaQueries.ts` com `usePendencias`/`usePendencia`/`useAnexosPendencia`/`useContadorPendencias`, `usePendenciaMutations.ts` com `useCriarPendencia`/`useAtualizarPendencia`/`useExcluirPendencia`/`useMarcarComoFeito`/`useVincularAnexoPendencia`).
- [x] **Frontend — telas** — `pendencias/page.tsx` ("Minhas Pendências", listagem), `pendencias/[pendenciaGUID]/page.tsx` (detalhe/recebimento — anexar arquivo e concluir viraram mutations), `cadastro-pendencia/page.tsx` (CRUD administrativo), `dashboard/[escolaGUID]/page.tsx` (widget "Pendências" da home).
- [x] **`DashboardNavbar.tsx`** — o contador "Minhas Pendências" (`contarPendencias`) virou `useContadorPendencias`. Isso permitiu remover de vez o evento customizado `window.dispatchEvent(new CustomEvent('baua:pendencia-atualizada'))`/listener que existia só pra sincronizar o badge da navbar (montada uma única vez no layout, nunca remonta) com o `PATCH .../feito` disparado em outra tela: como o `QueryClientProvider` é global (`frontend/app/layout.tsx`) e `useMarcarComoFeito`/`useCriarPendencia`/`useAtualizarPendencia`/`useExcluirPendencia` invalidam `pendenciaKeys.all` (`['pendencia']`), a invalidação por prefixo do TanStack Query já derruba o cache do contador da navbar automaticamente, de qualquer tela — o evento customizado virou redundante.
- **Não migrado nesta leva**: `POST /:PendenciaGUID/anexos` (vincular anexo) não tinha — e continua sem ter — um Zod schema de body dedicado no backend (o controller já valida `AnexoGUID` manualmente com `if (!AnexoGUID)`); não foi tocado por estar fora do padrão de "validators existentes no middleware", que era o escopo desta leva.

### Projetos e pendências — restante
(nenhum — os três domínios já migrados)

### Gestão de dados (escola/pessoas)
- [ ] `usuario` (`backend/middlewares/usuario.middleware.ts`, ~4 validators)
- [ ] `professor` (`backend/middlewares/professor.middleware.ts`)
- [ ] `aluno` (`frontend/lib/api/aluno.api.ts` — sem middleware próprio identificado, verificar rota real)
- [ ] `turma` / `curso` / `materia` (`backend/middlewares/turma.middleware.ts`, `curso.middleware.ts`, `materia.middleware.ts`)
- [ ] `matricula` (`backend/middlewares/matricula.middleware.ts`)
- [ ] `escola` / `escolaconfiguracao` / `escolaxusuarioxfuncao` (`backend/middlewares/escola.middleware.ts` ~4, `escolaconfiguracao.middleware.ts`, `escolaxusuarioxfuncao.middleware.ts` ~4)

### Comunicação
- [ ] `conversa` (`backend/middlewares/conversa.middleware.ts`) — chat
- [ ] `notificacao` (rota existe — `routes/notificacao.routes.ts` — mas sem middleware de validação dedicado hoje)
- [ ] `anotacao` (`backend/middlewares/anotacao.middleware.ts`)

### Outros
- [ ] `anexo` / `upload` (`backend/middlewares/anexo.middleware.ts` ~3, `anexo-upload.middleware.ts`, `conteudo-upload.middleware.ts`, `upload.middleware.ts`) — cuidado: upload usa `multipart/form-data`, não JSON puro — o adapter Zod atual (`zodValidate`) só cobre `body`/`params`/`query`, precisaria de ajuste ou ficar de fora
- [ ] `evento` (`backend/middlewares/evento.middleware.ts`)
- [ ] `auditoria` (rota existe — `routes/auditoria.routes.ts` — checar se tem validação hoje)
- [ ] `verificacao-email` (`backend/middlewares/verificacao-email.middleware.ts`, ~3 validators)
- [ ] `auth` (`backend/middlewares/auth.middleware.ts`) — sensível (login/token); se migrar, tratar com cuidado redobrado e testes extras antes de qualquer merge

### Antes de priorizar qualquer um destes
1. Confirmar com o usuário qual módulo entra primeiro.
2. Repetir a mesma disciplina desta migração: Explore → schemas Zod → adapter (reaproveitar `backend/utils/zodValidate.ts`, já genérico, incluindo o `mensagemTopo` opcional adicionado na leva do `conteudo` — hoje lido pelo ÚLTIMO segmento do `path` do issue, ajuste feito na leva do `categoriaconteudo` pra suportar body aninhado — e o `opcoes.semDetails` adicionado na leva do `pendencia`) → hooks em `frontend/lib/<dominio>/` (mesma convenção de `frontend/lib/tarefas/`) → `tsc --noEmit` + `next build` a cada etapa.
3. Módulos de upload (`multipart/form-data`) **não precisam necessariamente de um adapter diferente** — `zodValidate` já funciona normalmente contra `req.body` pós-multer, só que todo campo não-arquivo chega como string (nunca array/objeto JSON já parseado). Dá pra validar o nível cru (presença, formato, enum) sem tocar no parsing — foi exatamente o que `conteudo.schema.ts`/`ConteudoCriacaoBodySchema` fez, deixando o `JSON.parse` de campos tipo `TurmasGUID` onde já estava, no controller. Só vale reavaliar se algum domínio futuro precisar validar a ESTRUTURA pós-parse (não é o caso de `conteudo`).
