# Migração técnica: Zod + TanStack Query + react-hook-form (módulo Tarefas)

**Data:** 2026-07-30
**Status:** Implementado (backend + frontend). `tsc --noEmit` limpo (raiz e frontend) e `next build` passando. Ver checklists §5/§6.
**Escopo:** só o módulo de Tarefas (`TarefaAcademica` — digital/física/lista, questões, alternativas, respostas). Serve de piloto: se o padrão se provar bom na prática, dá pra estender pro resto do app depois — não é o objetivo desta etapa.

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
- [x] `frontend/app/dashboard/[escolaGUID]/tarefas/[tarefaGUID]/page.tsx` — TanStack Query (fetch de grupo/`GrupoTarefa` continua manual — fora do escopo, é outro domínio)
- [x] `frontend/components/materias/VisualizadorItemModal.tsx` — TanStack Query (parte de tarefa/lista — conteúdo/prova ficam fora do escopo, continuam com fetch manual)
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

## 9. Backlog — expansão pros demais módulos (NÃO iniciado)

Confirmado com o usuário: só o módulo de Tarefas foi migrado até aqui — era o piloto, por decisão explícita (ver seção 0). Esta seção lista os demais domínios do backend/frontend como candidatos a passar pelo mesmo tratamento (adapter Zod no middleware + hooks TanStack Query no client), agrupados por área, com uma estimativa grosseira de tamanho (nº de métodos de validação no middleware atual, quando aplicável). Nenhum destes foi tocado — é só um mapeamento pra priorização futura, não um compromisso de trabalho.

### Conteúdo / Avaliação
- [ ] `conteudo` (`backend/middlewares/conteudo.middleware.ts`, `frontend/lib/api/conteudo.api.ts`) — conteúdo de matéria (texto/vídeo/imagem); é o domínio que hoje fica **fora do escopo** dentro do próprio `VisualizadorItemModal.tsx` (ver seção 8) — migrar isso fecharia esse modal por completo
- [ ] `categoriaconteudo` (`backend/middlewares/categoriaconteudo.middleware.ts`) — categorias/board de conteúdo por turma
- [ ] `provaagendada` (`backend/middlewares/provaagendada.middleware.ts`, ~4 validators) — também aparece parcialmente em `VisualizadorItemModal.tsx` (branch `item.Tipo === 'prova'`), mesma situação do conteúdo
- [ ] `calendario` (`backend/middlewares/calendario.middleware.ts`, ~2 validators)
- [ ] `gradehoraria` / `horarioturma` (`backend/middlewares/gradehoraria.middleware.ts`, `horarioturma.middleware.ts`) — cronograma usado pelo agendamento automático do `TarefaForm.tsx`

### Grupos e convites
- [ ] `grupotarefa` / `convitegrupotarefa` (`backend/middlewares/grupotarefa.middleware.ts` ~5, `convitegrupotarefa.middleware.ts` ~3) — é o domínio usado (sem migrar) em `tarefas/[tarefaGUID]/page.tsx` (ver seção 8, "fetch de grupo continua manual")
- [ ] `grupoprojeto` / `convitegrupoprojeto` (`backend/middlewares/grupoprojeto.middleware.ts` ~8, `convitegrupoprojeto.middleware.ts` ~3)

### Projetos e pendências
- [ ] `projeto` (`backend/middlewares/projeto.middleware.ts`, ~4 validators)
- [ ] `pendencia` (`backend/middlewares/pendencia.middleware.ts`)

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
1. Confirmar com o usuário qual módulo entra primeiro (provavelmente `conteudo`/`provaagendada`, já que fecham o `VisualizadorItemModal.tsx` por completo).
2. Repetir a mesma disciplina desta migração: Explore → schemas Zod → adapter (reaproveitar `backend/utils/zodValidate.ts`, já genérico) → hooks em `frontend/lib/<dominio>/` (mesma convenção de `frontend/lib/tarefas/`) → `tsc --noEmit` + `next build` a cada etapa.
3. Módulos de upload (`multipart/form-data`) precisam de uma variante do adapter Zod ou ficam fora dessa onda.
