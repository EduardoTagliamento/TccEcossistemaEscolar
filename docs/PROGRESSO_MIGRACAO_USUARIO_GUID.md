# Progresso: migração CPF -> UsuarioGUID

**Objetivo:** trocar a PK de `usuario` de `UsuarioCPF` para `UsuarioGUID` em todo o sistema (schema + backend + frontend), sem soluções temporárias/bridges. Contexto de decisão completo em `docs/PLANO_MIGRACAO_USUARIO_PK_GUID.md`.

**Como retomar se a sessão for interrompida (leia isto primeiro):**
1. Rode `npx tsc --noEmit -p .` na raiz do repo. A lista de erros é o checklist exato do que ainda falta — cada erro é um call site que espera uma propriedade que não existe mais (ex.: `request.user?.UsuarioCPF`, `usuarioDAO.findById`).
2. **`npx tsc` NÃO cobre tudo.** Existem bugs de permissão e de fan-out de notificação que são silenciosos (comparam `string` com `string`, TypeScript não reclama) — ver seção "Achados críticos" abaixo antes de considerar qualquer tabela "pronta".
3. Nunca assuma que um arquivo é "renomeação pura" sem ler o arquivo inteiro. Um mesmo arquivo frequentemente mistura identidade do ATOR (quem está fazendo a ação — sempre pode virar `UsuarioGUID`, vem de `req.user.UsuarioGUID`) com dado de ASSUNTO de outra tabela ainda não migrada (tem que continuar `UsuarioCPF` até aquela tabela específica ser migrada). Exemplos reais dessa mistura: `matricula.service.ts` (aluno é assunto, mas grava em `conversa_grupo_membro`/`notificacao` que citavam CPF antes delas migrarem), `aviso.service.ts` (autor vs. dono do anexo).
4. Esta é a ÚNICA fonte da verdade sobre o progresso — não existe outro lugar com esse estado. Mantenha-a atualizada a cada tabela concluída, não só no fim da sessão.
5. **Este projeto não tem banco de dev/staging** — `.env` aponta pro Railway de produção. O script de migração de schema só deve rodar com `--apply --confirm-production` depois que TODAS as tabelas abaixo estiverem `[x]`. Até lá, só `--check` (leitura).
6. **⚠️ PORTABILIDADE: há mudanças NÃO commitadas** (checar `git status --short` pra número atual — 17 arquivos ao fim da sessão de 2026-08-10). Este markdown descreve código que existe SÓ no disco local até alguém commitar. Se for continuar em outra máquina, PRIMEIRO `git add` + `git commit` (e `git push`) tudo, ou copiar a working tree inteira — senão a sessão nova vai ler este arquivo descrevendo um trabalho que não existe onde ela está rodando. **Lembrete de política deste projeto: não commitar automaticamente** — deixe as mudanças no working tree e avise o usuário; só commite se ele pedir explicitamente.

## Status atual
Último `npx tsc --noEmit -p .`: **0 erros** ✅ (era 199 no início da sessão de 2026-08-10, 0 antes da migração começar). `npm install` rodado nesta sessão pra trazer `winston` (só faltava em `node_modules`, já estava no `package.json`) — os 7 erros de ruído somem junto. **Isto fecha a fase de compile-correctness do backend TypeScript** — todo call site que esperava `UsuarioCPF`/`req.user?.UsuarioCPF`/`usuarioDAO.findById` inexistente foi corrigido ou teve a resolução CPF↔GUID explicitada. Script de migração de schema: `backend/database/migrations/2026-08-10-usuario-guid-pk.ts`, escrito e validado por auditoria read-only contra o schema real de produção (39 FKs em 38 tabelas), **ainda não executado**.

**⚠️ `npx tsc` limpo NÃO significa migração completa.** Ver seção "Depois que TODAS as tabelas acima estiverem `[x]`" no fim deste arquivo — 0 erros só prova que o código consumidor não MENTE mais sobre CPF vs. GUID; as 27 tabelas listadas em "Tabelas ainda não migradas" continuam usando CPF de verdade no schema. O frontend começou a ser migrado nesta sessão (ver seção "Frontend" abaixo) — **ainda incompleto**, com um ponto de retomada claro documentado.

**⚠️ Mudanças NÃO commitadas na sessão de 2026-08-10** (checar `git status --short` pra número atual) — mesma advertência de portabilidade do topo deste arquivo: se for continuar em outra máquina, commitar/copiar a working tree primeiro.

## 🖥️ Frontend — EM ANDAMENTO (iniciado 2026-08-10, mesma sessão)

**Como retomar:** `cd frontend && npx tsc --noEmit -p .` — igual ao backend, isto é o checklist vivo. Hoje dá **0 erros**, mas isso é bem mais fraco que no backend: o frontend não tem contrato compartilhado com o backend (é tudo `fetch` com URL/body montados à mão), então `tsc` só pega os efeitos em cascata de mudanças de *tipo* dentro do próprio frontend (ex.: `AuthContext.Usuario.UsuarioCPF` virar `string | null`) — **não pega** uma URL montada errado tipo `` `/api/usuario/${usuario.UsuarioCPF}` `` quando `UsuarioCPF` deveria ser `UsuarioGUID` (template literal aceita qualquer tipo). Achamos vários bugs assim só por leitura manual/grep, não por erro de compilação. Ver "Próximo passo" no fim desta seção pra achados que ainda faltam auditar do mesmo jeito.

### Descoberta principal: o frontend estava desalinhado de sessões *anteriores*, não só desta

Antes de tocar em qualquer página, descobrimos que várias rotas que o frontend chama **já tinham sido migradas pra GUID em sessões passadas** (não nesta) sem o frontend ter sido atualizado junto — ou seja, funcionalidades básicas já estavam quebradas em produção antes desta sessão começar:
- `PUT/PATCH/DELETE/GET /api/usuario/:UsuarioCPF...` → já era `:UsuarioGUID`. Perfil (editar dados, trocar senha, upload/remover foto) e o "gate" de quais escolas o usuário tem acesso (`GET /api/usuario/:id/escolas`, chamado em **12 arquivos** — literalmente toda página do dashboard usa isso pra saber se o usuário pode estar ali) estavam **completamente quebrados**.
- `PUT /api/escola/:guid/transferir-direcao` já esperava `{ NovoDirecaoGUID }`, frontend mandava `{ NovoDirecaoCPF }` — "Tornar Direção" (Coordenação → Direção) quebrado.
- `POST /api/escolaxusuarioxfuncao` (criar vínculo) já esperava `{ UsuarioGUID, ... }`, frontend mandava `{ UsuarioCPF, ... }` — "Adicionar à Coordenação/Secretaria" quebrado.
- `GET /api/escolaxusuarioxfuncao` não retorna mais `UsuarioCPF` no DTO (só `UsuarioGUID`) — toda tabela de Coordenação/Secretaria (nome, busca, remover, reativar, "Tornar Direção") ia quebrar ao ler `vinculo.UsuarioCPF` (undefined).

Ou seja: **antes de qualquer trabalho novo de migração**, a sessão já corrigiu regressões reais de produção causadas por trabalho migratório anterior sem o frontend ter acompanhado. Isso é o principal risco apontado na seção "Riscos principais" do `PLANO_MIGRACAO_USUARIO_PK_GUID.md` (esquecer um ponto de leitura/escrita) se materializando de verdade.

### O que foi corrigido nesta sessão

1. **`frontend/lib/auth/AuthContext.tsx`** — base de tudo. `Usuario.UsuarioGUID: string` adicionado (não existia — o `usuario` do contexto vem de `GET /api/auth/me`, que já retorna `UsuarioGUID` desde sempre, só não estava tipado no frontend). `UsuarioCPF` virou `string | null` (usuário de piloto pode não ter CPF — é literalmente a motivação original de toda a migração, ver seção 1 do `PLANO_MIGRACAO_USUARIO_PK_GUID.md`). Essa mudança de tipo foi usada de propósito como "forçador de compilação" — todo call site que quebrou com isso *tinha* que ser revisto.
2. **Rotas de identidade própria (self-service), backend + frontend:**
   - `frontend/lib/api/usuario.api.ts`: `atualizarUsuario`/`trocarSenha` agora usam `UsuarioGUID`. `buscarUsuarioPorCPF` (usado por Secretaria/Coordenação pra vincular alguém já cadastrado) precisava continuar aceitando CPF como *input* (é a Secretaria digitando o CPF de outra pessoa, não o próprio usuário) — mas `GET /api/usuario/:UsuarioGUID` não aceita mais CPF nenhum. **Endpoint novo no backend**: `GET /api/usuario/busca-cpf?cpf=` (query string, não path — mantém o espírito da correção de LGPD de não voltar a colocar CPF na URL) + `UsuarioService.findByCPF` + `UsuarioController.buscarPorCPF`.
   - `frontend/lib/api/upload.api.ts`: `uploadFotoUsuario`/`removerFotoUsuario` agora usam `UsuarioGUID`.
   - `frontend/app/dashboard/[escolaGUID]/perfil/page.tsx`: todos os 5 call sites (dados cadastrais, foto, senha, preferências de acessibilidade) trocados pra `usuario.UsuarioGUID`.
   - **12 arquivos** com `` fetch(`/api/usuario/${usuario.UsuarioCPF}/escolas`) `` → `UsuarioGUID` (achado por grep de template literal, não por erro de tsc): `auditoria`, `chat`, `configuracoes`, `gestao-dados/avisos`, `gestao-dados/coordenacao`, `gestao-dados` (hub), `materias`, `materias/[materiaGUID]/turmas/[turmaGUID]`, `dashboard/[escolaGUID]` (raiz), `projetos`, `_components/DashboardNavbar.tsx`, `selecionar-escola`.
3. **`GET /api/materia/aluno/:usuarioGUID`** (era `:usuarioCPF`) — **decisão revertida desta sessão**: no bloco de trabalho anterior (fechamento de erros de tsc do backend) essa rota tinha sido deixada em CPF de propósito, resolvendo pra GUID só internamente no service, pra não precisar mexer no frontend. Mas isso **bloqueia exatamente o cenário que motivou a migração inteira**: usuário de piloto sem CPF não conseguiria listar as próprias matérias (não tem CPF pra montar a URL). Revertido pra GUID de verdade: `materia.service.ts` (`listarMateriasDoAluno` não resolve mais CPF→GUID, já recebe GUID), `materia.controller.ts`, `routes/materia.routes.ts`, `frontend/lib/api/materiasmodulo.api.ts`, e os 3 call sites (`materias/page.tsx`, `materias/[materiaGUID]/turmas/[turmaGUID]/page.tsx`, `dashboard/[escolaGUID]/page.tsx`).
4. **Vínculo Coordenação/Secretaria** (`frontend/lib/api/escolaxusuarioxfuncao.api.ts`):
   - `EscolaxUsuarioxFuncao.UsuarioCPF` → `UsuarioGUID` (é o identificador de verdade agora). `criarVinculo`/`listarVinculos` idem.
   - Mas a tabela de Coordenação/Secretaria **mostrava CPF pro staff** (dado informativo útil, não usado como identificador) — pra não perder essa UX, o backend passou a devolver `UsuarioCPF` **também**, só como campo informativo: `UsuarioDAO.findNomesECPFsByGUIDs` (novo, ao lado do já existente `findNomesByGUIDs`), `EscolaxUsuarioxFuncaoDTO.UsuarioCPF: string | null` adicionado, `toDTO`/`findAll`/`findById`/`criarVinculosEmMassa` repassando o CPF junto do nome.
   - `frontend/lib/api/escola.api.ts`: `transferirDirecao` agora manda `NovoDirecaoGUID`.
   - `coordenacao/page.tsx` + `secretaria/page.tsx`: `criarVinculo` usa `usuarioEncontrado.UsuarioGUID`; coluna de CPF na tabela trata `null` (`formatarCPF(valor) → (valor ? formatarCPF(valor) : '—')`); filtro de busca trata `null`; `transferirDirecao` usa `candidatoDirecao.UsuarioGUID`.
   - `criarVinculosEmMassa` (importação por planilha) **continua CPF** — é fluxo diferente por natureza (staff digita/importa uma lista de CPFs de pessoas que podem nem ter conta ainda; o backend resolve/cria por CPF). Não mexido, está correto como está.
5. **`professor.api.ts`/`aluno.api.ts`** — mesmo padrão do achado do item 2: `ProfessorDTO`/DTO de usuário do aluno não tinham `UsuarioGUID` nenhum (só CPF, porque o domínio de professor/aluno em si — alocação matéria×turma, matrícula — genuinely continua CPF, tabelas não migradas). Mas as ações de "editar dados cadastrais" e "reativar" desses usuários passam por `PUT /api/usuario/:UsuarioGUID`, que não aceita CPF. Corrigido:
   - `backend/services/professor.service.ts`: `ProfessorDTO.UsuarioGUID` adicionado (o dado já estava disponível em `toProfessorDTO`, só não era exposto).
   - `frontend/lib/api/professor.api.ts`: `atualizarProfessor`/`reativarProfessor` agora recebem `usuarioGUID`. `frontend/lib/professor/useProfessorMutations.ts` e `gestao-dados/professores/page.tsx` atualizados nos call sites.
   - `frontend/lib/api/aluno.api.ts`: `Matricula.UsuarioCPF` → `UsuarioGUID` (o `MatriculaDTO` do backend já só retorna GUID — outro achado de desalinhamento pré-existente). `atualizarAluno` agora recebe `usuarioGUID`. `Usuario.UsuarioCPF` virou `string | null` + `UsuarioGUID` adicionado. `gestao-dados/alunos/page.tsx` e `cadastro-pendencia/page.tsx`/`NovaConversaModal.tsx` (consomem `aluno.usuario`) ajustados com filtro/guard de nulo.
   - `inativarProfessor` (`escolaxusuarioxfuncao/:escolaGUID/:cpf/3`) — **achado, não corrigido, fora do escopo desta migração**: essa rota nunca existiu no formato que o frontend chama (`EscolaxUsuarioxFuncao` só tem `DELETE /:EscolaxUsuarioxFuncaoId`, um ID numérico, não uma tripla escola/pessoa/função). Não é um problema de CPF vs. GUID — é uma feature "Inativar professor" que está quebrada por outro motivo, provavelmente desde antes de qualquer migração. Deixado como estava (só trocado `cpf: string` por `cpf: professor.UsuarioCPF ?? ''` pra compilar), sinalizado aqui pra não confundir com trabalho desta migração.

### Padrão usado para decidir CPF vs. GUID em cada arquivo

Igual ao backend: cada tabela que o dado toca decide. Se o dado vai para uma tabela **já migrada** (`usuario` propriamente dito via `/api/usuario/*`, `escolaxusuarioxfuncao`, `matricula`, `notificacao`, `registroauditoria`) → `UsuarioGUID`. Se vai para uma tabela **ainda não migrada** (`conversa_individual`/`conversa_grupo_membro`, `pendencia`, `sugestao`, `questaobanco`, `materialdidatico`, `materiaxprofessorxturma`, `anexo`, `conteudo`) → continua CPF, só com `?? ''`/`!!valor` de proteção porque `UsuarioCPF` do usuário logado agora pode ser `null`.

### 🛑 Onde parei — próximo passo

Estava investigando **`frontend/lib/api/notificacao.api.ts`** (`Notificacao.UsuarioCPF: string`, linha 31) quando a sessão foi pausada. **Achado ainda não confirmado nem corrigido**: `notificacao` é uma tabela já migrada (`notificacao.service.ts` no backend usa `UsuarioGUID` em `disparar({destinatarios})`), então esse campo no frontend é suspeito do mesmo jeito que `EscolaxUsuarioxFuncao.UsuarioCPF` e `Matricula.UsuarioCPF` eram — provavelmente devia ser `UsuarioGUID`. **Não dá pra assumir sem checar**: falta (1) ler o DTO real que `backend/services/notificacao.service.ts` devolve pro feed do sino de notificação, (2) ler `frontend/lib/api/notificacao.api.ts` inteiro pra ver quem consome esse campo e como, (3) aplicar o mesmo padrão de correção dos itens acima se confirmado.

Depois de `notificacao.api.ts`, a auditoria sistemática ainda não cobriu (grep author: `grep -rln "UsuarioCPF" frontend --include="*.ts" --include="*.tsx" | grep -v .next` tinha ~53 arquivos no início da sessão; os de maior risco — self-service, vínculos, professor/aluno — já foram cobertos):
- `frontend/lib/api/conversa.api.ts`, `convitegrupoprojeto.api.ts`, `convitegrupotarefa.api.ts`, `grupoprojeto.api.ts`, `horarioturma.api.ts`, `categoriaconteudo.api.ts`, `conteudo.api.ts`, `anexo.api.ts`, `auditoria.api.ts`, `aviso.api.ts`, `pendencia.api.ts` — provavelmente legítimos (tabelas não migradas), mas nenhum foi lido a fundo procurando o padrão "campo deveria ser GUID mas backend já migrou" como achamos em notificacao/escolaxusuarioxfuncao/matricula.
- Páginas/componentes que ainda não foram lidos width a mesma atenção: `gestao-dados/coordenacao` e `secretaria` foram cobertos; `gestao-dados/page.tsx` (hub) só teve a URL de `/escolas` corrigida, resto não auditado; `chat/GerenciarGrupoModal.tsx`, `TransferirLiderancaModal.tsx`, `SolicitarEntradaModal.tsx`, `configuracoes/page.tsx` (corpo, não só o gate de `/escolas`) — não abertos ainda.
- `frontend/types/anotacao.ts`, `convitegrupotarefa.ts`, `grupotarefa.ts`, `projeto.ts` — não olhados.
- **Método recomendado pra continuar**: repetir a técnica que funcionou aqui — grep por `UsuarioCPF` no arquivo, e pra cada ocorrência perguntar "a tabela dona já foi migrada?" (checar a lista "Tabelas/serviços migrados nesta sessão (11)" e "Tabelas ainda não migradas (27 restantes)" acima). Se migrada → provavelmente é um bug igual aos que achamos. Se não migrada → provavelmente correto como está, só garantir `null`-safety.

### Continuação — `provaagendada` + `conteudo`/`conteudoprogresso` + `materialdidatico` + `anexo` + stragglers finais (2026-08-10, mesma sessão) — ZERAMENTO DOS ERROS

**51 → 0 erros**, em blocos:
- **`provaagendada.service.ts`+`.controller.ts`** (9 erros): mesmo padrão `#resolverCPFAtor`, `ProvaAgendada`/`ProvaAgendadaTurma` sem CPF próprio (ator só entra em `#validarProfessorResponsavel` → `materiaxprofessorxturma`, não migrada, e em `categoria.UsuarioCPF` de `categoriaconteudo`). **Achado real**: `#notificarProvaPostada` fazia `SELECT DISTINCT UsuarioCPF FROM matricula` (SQL cru) — coluna não existe mais, 0 destinatários sempre. Corrigido pra `UsuarioGUID`.
- **`conteudo.service.ts`+`.controller.ts`** (8 erros): `conteudo` TEM `UsuarioCPF` próprio (autor, tabela não migrada) — ator precisa virar CPF real pra persistir E pra comparar com `categoria.UsuarioCPF`, mas auditoria já quer GUID. Mesmo achado de SQL cru quebrado em `#notificarMateriaPostada` (`matricula.UsuarioCPF` → `UsuarioGUID`).
- **`conteudoprogresso.service.ts`+`.controller.ts`** (4 erros): bug silencioso puro — `usuarioCPF` era só um nome errado, o valor sempre foi passado pra `matriculaDAO.findMatriculaAtivaByUsuario` (já GUID). Rename direto, sem resolução.
- **`materialdidatico.service.ts`+`.controller.ts`** (4 erros): `materialdidatico`/`materialdidaticopagina` têm `CriadoPorCPF`/`RevisadoPorCPF` próprios (não migradas) — mas `#validarPermissaoEscrita` chamava `findByTripla` (já GUID) passando CPF por engano. Corrigido nos dois sentidos: `findByTripla` recebe GUID direto, `CriadoPorCPF`/`revisar()` resolvem CPF via `#resolverCPFAtor`.
- **`anexo.service.ts`+`.controller.ts`** (5 erros): mesmo padrão de mistura — `anexo.UsuarioCPF` (própria tabela, dono do arquivo) precisa de CPF real; `escolaxusuarioxfuncaoDAO.findAll`/`isCoordOuDirecaoEmEscola` (já migradas) precisam de GUID. `validarPermissaoLeitura`/`validarPermissaoEscrita` resolvem os dois a partir do GUID recebido.
- **Stragglers finais** (`assunto`, `escolaconfiguracao`, `materiacustomizacao`, `sugestao`, `questaobanco`, `request-logger.middleware.ts`, `routes/upload.routes.ts`, `verificacao-email.service.ts`, `conversa-grupo.service.ts`): mesmo catálogo de padrões já documentado acima. Notas específicas:
  - `materiacustomizacao.controller.ts`: a rota `GET /api/materia/:guid/customizacao?UsuarioCPF=` permitia consultar customização de QUALQUER professor por CPF via query param — nunca usada pelo frontend (`materiasmodulo.api.ts` só chama sem esse param). Removida (dead code), endpoint agora só resolve o ator via `req.user.UsuarioGUID`.
  - `sugestao.service.ts`/`questaobanco.service.ts`: não tinham `UsuarioDAO` — injetado; `SugestaoCreateDTO.UsuarioCPF` renomeado pra `UsuarioGUID` (resolvido internamente antes de persistir, já que `sugestao`/`questaobanco` guardam CPF real de autor).
  - `verificacao-email.service.ts`: `usuarioDAO.findById(cpf)` → `findByCPF(cpf)` (método não existia); `obterCpfPorEmail` agora trata `UsuarioCPF` nulo (usuário sem CPF cadastrado) em vez de assumir sempre presente.
  - `conversa-grupo.service.ts`: **fecha o gap documentado na sessão anterior** — `criarGrupoTurma` lia `matricula.UsuarioCPF` (coluna não existe mais); `UsuarioDAO` injetado, resolve `matricula.UsuarioGUID → CPF` antes de `conversaGrupoDAO.addMembro` (que ainda é CPF, `conversa_grupo_membro` não migrada). **5 sites de instanciação atualizados**: `grupotarefa.routes.ts`, `turma.routes.ts`, `matricula.routes.ts`, `cleanup.scheduler.ts` (o 5º era só um exemplo em doc, não código).
  - `routes/upload.routes.ts`: `verificarParticipanteConversa` chamava `conversaDAO.isParticipante(conversaGUID, usuarioCPF)` direto de `req.user` — `conversa_grupo_membro`/`conversa_individual` ainda CPF, então agora resolve GUID→CPF via `UsuarioDAO` antes de chamar.
  - `questaobanco.service.ts`: havia um **segundo site de instanciação** não óbvio — `getQuestaoBancoService()` (singleton usado por `ProvaAgendadaRecomendacaoService`), além do `routes/questaobanco.routes.ts`. Lição: sempre `grep -rn "new XService("` em `backend/` E `routes/`, não só `routes/` — singletons/factories internos escapam uma busca só em `routes/`.
  - `npm install` rodado ao final pra resolver os 7 erros de `winston` ausente em `node_modules` (estava no `package.json`, nunca instalado nesta working tree).

### Continuação — `horarioturma.service.ts` + `.controller.ts` (2026-08-10, mesma sessão)

**57 → 51 erros.** Mesmo domínio e mesmo padrão de `turma`/`materia`: `horarioturma` não tem coluna CPF/GUID própria, todo `usuarioCPF` era identidade do ATOR (flui só pra `validarPermissaoEscrita`/auditoria) — renomeado em bloco pra `usuarioGUID`. Dois achados idênticos aos de `materia.service.ts`:
- `this.#usuarioDAO.findById(alocacao.UsuarioCPF)` (2 ocorrências, em `obterCronograma` e `alocarSlot`) — método inexistente; corrigido pra `findByCPF`, já que `alocacao.UsuarioCPF` é CPF real do professor vindo de `materiaxprofessorxturma` (não migrada), não GUID.
- `UsuarioCPFAtor:` nas duas chamadas de `getAuditoriaService().registrar()` → `UsuarioGUIDAtor:`.

Controller: os 2 `req.user?.UsuarioCPF` (`store`/`destroy`) → `req.user?.UsuarioGUID`, sem exceções. Nenhuma mudança de DI necessária (assinatura do construtor não mudou de forma, só a semântica do parâmetro).

### Continuação — `turma.service.ts` + `materia.service.ts` (+ controllers) (2026-08-10, mesma sessão)

**74 → 57 erros.** Diferente dos blocos anteriores: `turma`, `materia` e `horarioturma` (essa última ainda não tocada) **não têm nenhuma coluna CPF/GUID própria** — são dado curricular puro. Todo "usuarioCPF" que aparecia nesses services era, na real, sempre a identidade do ATOR (pra checagem de permissão via `EscolaxUsuarioxFuncaoDAO.findByTripla`, já migrada) — nunca dado persistido. Isso permitiu renomear em bloco (`sed`) em vez do padrão método-a-método usado em `tarefaacademica`/`categoriaconteudo`.

- **`turma.service.ts`**: `UsuarioDAO` injetado, todo `usuarioCPF` virou `usuarioGUID` (flui só pra `validarPermissaoEscrita`/auditoria, ambos já GUID). **Uma exceção real**: `validarPermissaoCapaTurma` também chama `conversaGrupoService.getFuncaoNaTurma()` (domínio `conversa_grupo_membro`, ainda CPF) — isolado com um `#resolverCPF` local só pra esse caminho.
- **`turma.controller.ts`**: `req.user?.UsuarioCPF` → `req.user?.UsuarioGUID` em bloco, sem exceções.
- **`routes/turma.routes.ts`**: `UsuarioDAO` adicionado à DI do `TurmaService`.
- **`materia.service.ts`**: mesmo tratamento. Achado extra: `this.#usuarioDAO.findById(alocacao.UsuarioCPF)` era um método inexistente (bug pré-existente, `tsc` sugeria `findByGUID` — **sugestão errada**, o valor ali é CPF de verdade vindo de `materiaxprofessorxturma` não migrada, então a correção certa foi `findByCPF`).
- **`materia.service.ts` — bug silencioso real**: `listarMateriasDoAluno` passava `usuarioCPF` direto pra `matriculaDAO.findMatriculaAtivaByUsuario()`, que já exige GUID desde a migração de `matricula` (`tsc` não pega, `string`/`string`). A rota `GET /api/materia/aluno/:usuarioCPF` recebe CPF real do frontend (via perfil completo carregado no `AuthContext`, não via JWT — então não dá pra simplesmente virar `:usuarioGUID` sem mexer em 3 call sites do frontend). Resolvido **sem mudar o contrato de API**: o service resolve `usuarioCPF → UsuarioGUID` internamente via `UsuarioDAO.findByCPF` antes de chamar `matriculaDAO`. Controller e rota continuam recebendo/repassando CPF como sempre.
- **`materia.controller.ts`**: os 3 `req.user?.UsuarioCPF` (em `store`/`update`/`destroy`) → `req.user?.UsuarioGUID`. O `:usuarioCPF` de `listarDoAluno` foi deixado intocado (é CPF real, ver ponto acima).

`horarioturma.service.ts`/`.controller.ts` (mesmos 2 padrões de bug) foi resolvido logo em seguida, ver seção abaixo.

### Continuação — `categoriaconteudo` + `conversa` (2026-08-10, mesma sessão)

`categoriaconteudo.controller.ts` (17 erros) e `conversa.controller.ts` (14 erros) resolvidos por completo — junto com todos os services que eles chamam, mesmo padrão dos blocos anteriores (**107 → 74 erros**).

**`categoriaconteudo.service.ts`** (18 métodos públicos, todos CPF — `categoriaconteudo` e `materiaxprofessorxturma` não migradas): `UsuarioDAO` injetado, `#resolverCPFAtor` adicionado, todo ator renomeado pra `*GUID`. Achados extras (bugs reais, SQL cru, não pegos pelo `tsc`):
- `#buscarInfoPorMatricula`/`#buscarInfoPorMatriculaTarefa`... não, essas são do `tarefaacademica.service.ts` (já corrigidas na sessão anterior). Aqui o achado foi: **4 ocorrências** de `INNER JOIN usuario u ON u.UsuarioCPF = m.UsuarioCPF` (contra `matricula`, que só tem GUID) em `buscarEstatisticasItem` — corrigido pra `ON u.UsuarioGUID = m.UsuarioGUID`.
- `verificarPendencia`/`verificarPendenciaAgregada` chamavam `matriculaDAO.findMatriculaAtivaByUsuario(usuarioCPF)` — esse método já exige `UsuarioGUID` desde a migração de `matricula` (bug silencioso, `tsc` não pega comparação `string`/`string`). Corrigido.

**`conversa.service.ts` + `mensagem.service.ts` + `conversa-individual.service.ts` + `conversa-permissao.service.ts`** (todos CPF — `conversa`/`mensagem`/`mensagem_fixada`/`mensagem_reacao`/`conversa_individual`/`conversa_grupo_membro` não migradas): mesmo tratamento, `UsuarioDAO` injetado em todos os 4, ator renomeado pra `*GUID` em cada método público chamado pelo controller. Achados extras:
- `ConversaPermissaoService.#assertCoordOuDirecao` chamava `escolaFuncaoDAO.isCoordOuDirecaoEmEscola(solicitanteCPF, ...)` — `escolaxusuarioxfuncao` **já está migrada** (exige GUID) — bug silencioso corrigido (esse método não precisa de resolução CPF nenhuma, só passar o GUID direto). Já `#assertRepresentanteOuLider` continua CPF (`conversa_grupo_membro` não migrada) — os dois métodos convivem no mesmo service com necessidades opostas.
- `MensagemService.#notificarMensagemGrupo` e `ConversaPermissaoService.#notificarPromocao` passavam CPF direto pro `notificacao.disparar()` (que já exige GUID) — mesmo padrão de bug já visto em outros services, corrigido resolvendo CPF→GUID antes de notificar.

**Efeito colateral obrigatório: WebSocket.** Mudar as assinaturas de `MensagemService.fixarMensagem/desafixarMensagem/deletarMensagem/editarMensagem/reagir` pra GUID quebrava `backend/websocket/conversa.handler.ts` (chama esses mesmos métodos) e `backend/websocket/SocketServer.ts` (que já estava com **erro de compilação pré-existente**: `decoded.UsuarioCPF` não existe mais em `DecodedToken`, e a room pessoal `usuario:${cpf}` nunca batia com `notificacao.service.ts`, que já emite em `usuario:${UsuarioGUID}` — bug real de notificação em tempo real quebrada). Corrigido:
- `SocketServer.ts`: middleware de auth do socket agora resolve `UsuarioGUID` (do JWT) → `UsuarioCPF` (via `UsuarioDAO`, uma vez por conexão) e guarda os dois em `socket.data.usuario`; a room pessoal virou `usuario:${UsuarioGUID}` (bate com `notificacao.service.ts` agora).
- `conversa.handler.ts`: `usuario` tipado com os dois campos; `enviar`/`marcarComoLida`/`isParticipante` (ainda CPF, não mexidos) usam `usuario.UsuarioCPF`; os 5 métodos migrados usam `usuario.UsuarioGUID`.
- **Isso NÃO fecha a seção "Websocket" pendente do checklist abaixo** — só desbloqueou o que já quebrava por causa da mudança de assinatura nesta sessão. `enviar()`/`marcarComoLida()` continuam CPF (deliberado, fora do escopo desta rodada).

**`conversa.middleware.ts`**: `validarIniciarIndividual` comparava `req.body.DestinatarioCPF` com `req.user?.UsuarioCPF` (quebrado) pra bloquear "conversa consigo mesmo" — removida a checagem redundante (o `ConversaIndividualService.iniciarConversa()` já corrigido faz a mesma verificação internamente, com o CPF resolvido de verdade); a validação de formato via Zod continua.

**Não fechado nesta rodada** (achado durante o trabalho, fora do escopo do pedido): `conversa-grupo.service.ts` linha ~48 (`criarGrupoTurma`) ainda lê `matricula.UsuarioCPF` — 1 erro de `tsc`. Precisa de `UsuarioDAO` + resolver GUID→CPF (mesmo padrão), e tem **5 sites de instanciação** pra atualizar (`grupotarefa.routes.ts`, `matricula.routes.ts`, `turma.routes.ts`, `cleanup.scheduler.ts`). Deixado de fora por ser um consumidor diferente do `ConversaController` (criação de grupo de chat ao criar turma, não faz parte do fluxo pedido).

### Continuação — `tarefaacademica.service.ts` + `.controller.ts` (2026-08-10, mesma sessão)

O maior bloco pendente (38 erros combinados: 11 no service, 27 no controller) foi resolvido por completo, mesmo padrão dos 6 domínios acima. Notas específicas deste arquivo (é o service mais complexo do domínio "tarefa", cobre professor E aluno):

- **Identidade do aluno**: `tarefaacademica_matricula`/`tarefaacademica_resposta` referenciam o aluno só via `MatriculaGUID`/`TarefaMatriculaGUID` (FK pra `matricula`, já 100% GUID) — **nunca guardaram CPF do aluno diretamente**. Então todo fluxo do lado do aluno (`marcarComoFeito`, `enviarAnexoEntrega`, `removerAnexo` no ramo de entrega, `responderObjetiva`/`responderDiscursiva`/`buscarQuestoesComRespostas`/`#resolverAtribuicaoListaDoAluno`, `listarPendentesAluno`) virou GUID puro, sem nenhuma resolução CPF↔GUID necessária.
- **Identidade do professor**: só o *avaliador* é CPF ainda (`TarefaAvaliadoPorCPF` em `tarefaacademica_matricula`, `RespostaAvaliadoPorCPF` em `tarefaacademica_resposta`) — e o vínculo professor↔alocação (`materiaxprofessorxturma.UsuarioCPF`, não migrada) também. Todo método do professor (`criarTarefa`, `atualizarTarefa`, `excluirTarefa`, `avaliarTarefa`, `criarQuestao*`, `atualizarQuestao`, `excluirQuestao`, `reordenarQuestoes`, `vincularAnexoQuestao`, `desvincularAnexoQuestao`, `buscarRespostasAluno`, `avaliarQuestaoDiscursiva`) resolve CPF via `#resolverCPFAtor` só onde essas duas tabelas exigem.
- **`#buscarInfoPorMatricula`/`#buscarInfoPorMatriculaTarefa`** (helpers privados com SQL cru) faziam `JOIN usuario u ON u.UsuarioCPF = m.UsuarioCPF` contra `matricula` — **bug real não pego pelo `tsc`** (matricula não tem mais coluna CPF; o JOIN silenciosamente retornava 0 linhas em produção). Corrigido pra `JOIN ... ON u.UsuarioGUID = m.UsuarioGUID`, e o Map retornado agora carrega `UsuarioGUID` em vez de `UsuarioCPF`.
- **`#notificarTarefaRespostaRecebida`** tinha o mesmo tipo de bug: `destinatarios: [info.ProfessorCPF]` passando CPF pro `notificacao.disparar()` (que já exige GUID) — corrigido resolvendo o professor via `usuarioDAO.findByCPF`.
- **`listarPendentesAluno`/`listarPendentesAvaliacaoProfessor`** (SQL cru) tinham `WHERE m.UsuarioCPF = ?` / `JOIN usuario u ON u.UsuarioCPF = m.UsuarioCPF` contra `matricula` — mesmo bug, mesma correção.
- Controller: os 27 erros eram todos `request.user?.UsuarioCPF` — renomeados em bloco (incluindo os dois `?UsuarioCPF=` query-param overrides em `pendentesAluno`/`pendentesAvaliacaoProfessor`, que viraram `?UsuarioGUID=` — mudança de contrato de API, avisar frontend se algo depender desse query param).

**`UsuarioDAO` injetado em `TarefaAcademicaService`** — `routes/tarefaacademica.routes.ts` atualizado com a nova dependência.

### Sessão em 2026-08-10 (retomada) — o que foi corrigido

Foco: as "quebras já existentes AGORA" (seção abaixo, agora majoritariamente resolvida) + auditoria completa do "Achado crítico #1" para os domínios `grupotarefa`/`convitegrupotarefa`/`professor`/`grupoprojeto`/`convitegrupoprojeto`/`projeto`. Nenhuma tabela nova foi migrada (schema inalterado) — o trabalho foi 100% em código consumidor que já quebrava ou tinha bug silencioso.

**Padrão estabelecido e replicado em todos os arquivos abaixo** (usar como referência para os arquivos que faltam):
- Toda tabela ainda-não-migrada continua exigindo CPF nos métodos internos do seu DAO/service.
- Todo método público de service que recebe a identidade do ATOR (quem faz a ação, hoje só disponível como `UsuarioGUID` via `req.user.UsuarioGUID`) teve seu parâmetro renomeado de `*CPF` para `*GUID`, e resolve o CPF internamente via `UsuarioDAO.findByGUID(usuarioGUID)?.UsuarioCPF` (ou um helper privado `#resolverCPFAtor`) **antes** de usar esse CPF em chamadas para tabelas ainda não migradas (histórico, `usuarioxgrupo*`, etc.).
- Toda chamada a `getAuditoriaService().registrar({ UsuarioCPFAtor: ... })` foi trocada para `UsuarioGUIDAtor: usuarioGUID` (usando o GUID original do ator, sem round-trip extra ao banco) — `registroauditoria` já foi migrada nesta sessão anterior.
- Toda chamada a `getNotificacaoService().disparar({ destinatarios: [...] })` que estava passando CPF foi corrigida para resolver e passar `UsuarioGUID` — `notificacao` já foi migrada.
- Parâmetros que são o **assunto/alvo** de uma ação vindos de `req.params`/`req.body` (ex.: `:cpf` na URL, `UsuarioCPFConvidado` no body) continuam CPF — eles não vêm de `req.user`, então não quebraram, e a tabela dona ainda não foi migrada.
- Em cada service afetado foi injetado `UsuarioDAO` no construtor — isso mudou a assinatura do construtor, então todo `routes/*.routes.ts` que faz a DI manual desses services foi atualizado junto (senão o `new XService(...)` fica com um argumento faltando).

**Arquivos corrigidos** (services + controllers + routes de DI):
- `backend/services/grupotarefa.service.ts` + `backend/controllers/grupotarefa.controller.ts` + `routes/grupotarefa.routes.ts`
- `backend/services/convitegrupotarefa.service.ts` + `backend/controllers/convitegrupotarefa.controller.ts` + `routes/convitegrupotarefa.routes.ts`
- `backend/services/professor.service.ts` + `backend/controllers/professor.controller.ts` (não precisou de routes — DI já tinha `UsuarioDAO`)
- `backend/services/grupoprojeto.service.ts` + `backend/controllers/grupoprojeto.controller.ts` + `routes/grupoprojeto.routes.ts`
- `backend/services/convitegrupoprojeto.service.ts` + `backend/controllers/convitegrupoprojeto.controller.ts` + `routes/convitegrupoprojeto.routes.ts`
- `backend/services/projeto.service.ts` + `backend/controllers/projeto.controller.ts` + `routes/projeto.routes.ts`

Essas 6 tabelas (`grupotarefa`, `convitegrupotarefa`, `grupoprojeto`, `convitegrupoprojeto`, `projeto` — mais o domínio `professor`/`materiaxprofessorxturma`) **continuam não migradas no schema** (ainda usam CPF como antes) — só o código consumidor foi corrigido para não quebrar/mentir sobre GUID vs CPF enquanto elas não são migradas. Migrar essas tabelas de verdade ainda está pendente (ver checklist abaixo).

## O que cada tabela precisa
**entity** (model.ts) · **repository** (queries SQL) · **service** (regras de negócio, inclusive checagens de permissão via `escolaxusuarioxfuncao` e fan-out de notificação) · **controller** (inclusive `request.user?.UsuarioCPF`) · **routes** (`:UsuarioCPF` na URL, se houver) · **schema Zod** (validação de params/body) · **frontend** (api client + páginas — NADA do frontend foi tocado ainda nesta migração, ver seção final).

---

## ✅ Núcleo de identidade — CONCLUÍDO
- [x] `usuario` (entity, repository, service, controller, middleware, schema Zod, routes)
- [x] Auth (`auth.service.ts`, `JwtService.ts`, `auth.middleware.ts`) — claim do JWT e `req.user` agora só têm `UsuarioGUID`, não `UsuarioCPF`
- [x] Upload de foto de perfil (`upload.service.ts`/`.controller.ts`, `routes/upload.routes.ts`) — rota `/foto-usuario/:UsuarioGUID`
- [x] `plataformaAdmin.guard.ts`

## ✅ Tabelas/serviços migrados nesta sessão (11)

| Tabela/arquivo | Notas |
|---|---|
| `escolaxusuarioxfuncao` | **Crítico pro piloto** (define escolas/papéis do usuário). `usuarioDAO.findNomesByCPFs` → `findNomesByGUIDs`. Todos os métodos de checagem de permissão (`findByTripla`, `isCoordOuDirecaoEmEscola`, `isProfessorOuDirecaoEmEscola`, `isCoordSecretariaOuDirecaoEmEscola`, `usuarioExists`, `findRepresentanteLegal`, `findUsuariosAtivosByEscolaEFuncoes`) migrados pra exigir `UsuarioGUID` — isso é o que criou o "achado crítico" abaixo (~15 services externos ainda não corrigidos). |
| `usuarioxescolaacesso` | Migrada junto (dependência direta, "último acesso na escola"). |
| `registroauditoria` | `UsuarioCPFAtor` → `UsuarioGUIDAtor`. Migrada cedo de propósito — é o parâmetro de auditoria em quase todo service de escrita. |
| `matricula` | **Crítico pro piloto.** Input (`MatriculaCreateDTO.UsuarioCPF`, `TransferenciaDTO.UsuarioCPF`) continua CPF (resolvido internamente via `usuarioDAO.findByCPF`) — decisão deliberada pra não quebrar o contrato do frontend. Downstream não migrado (`conversa_grupo_membro`, `anexo`) recebe o CPF real resolvido, não o GUID. |
| `notificacao` + `usuarionotificacaopreferencia` | `getNotificacaoService().disparar()` agora exige `destinatarios: UsuarioGUID[]`. `notificacao.scheduler.ts` corrigido (queries de `matricula`/`anotacao` ajustadas). |
| `aviso` + `avisoxusuario` | `UsuarioCPFAutor` → `UsuarioGUIDAutor`. `AvisoService` ganhou dependência de `UsuarioDAO` só pra resolver o CPF do autor na checagem de dono do anexo (`anexo` não migrada). |
| `anotacao` | Simples, auto-contida (nota pessoal, dono = ator sempre). |
| `evento` | Criador do evento. Fan-out de notificação já usava `findUsuariosAtivosByEscolaEFuncoes` (GUID) — sem ajuste. |
| `pendencia` | Input (`PendenciaCreateDTO.UsuarioCPFDestino`) continua CPF, resolvido internamente. |
| `redefinicao_senha` | Auto-contida, sem ripple em outros arquivos. |
| `escola.service.ts`/`.controller.ts` (não é tabela nova) | 4 métodos quebrados pela migração de `escolaxusuarioxfuncao`, corrigidos. **`transferirDirecao` mudou de contrato de API**: body agora exige `NovoDirecaoGUID` (antes `NovoDirecaoCPF`) — avisar frontend. |
| `curso.service.ts`/`.controller.ts` (não é tabela nova) | Renomeação pura (só usava CPF pra permissão+auditoria). |

Efeitos colaterais corrigidos junto (arquivos que não são "tabelas" mas quebraram por causa das migrações acima): `relacaoanexos.service.ts` (comparava `pendencia.UsuarioCPF`), `calendario.service.ts`/`.repository.ts` (SQL cru com `matricula.UsuarioCPF`).

## ⬜ Tabelas ainda não migradas (27 restantes)

Convenção de nome de coluna nova: trecho "CPF" vira "GUID" (ex.: `UsuarioCPFLider` → `UsuarioGUIDLider`).

- [ ] `anexo` — UsuarioCPF (é bridge usado por `aviso.service.ts`, `matricula.service.ts`, `relacaoanexos.service.ts` — migrar isso provavelmente simplifica os três)
- [ ] `categoriaconteudo` — UsuarioCPF (UNIQUE composta)
- [ ] `conteudo` — UsuarioCPF
- [ ] `conversa_grupo_membro` — MembroUsuarioCPF (PK composta) — é bridge usado por `matricula.service.ts`
- [ ] `conversa_individual` — ConversaIndUsr1CPF + ConversaIndUsr2CPF (UNIQUE composta, 2 FKs na mesma tabela)
- [ ] `convitegrupoprojeto` — UsuarioCPFConvidado (código consumidor já corrigido em 2026-08-10 — ver seção "Sessão em 2026-08-10" no topo — mas a tabela em si segue com PK/coluna CPF)
- [ ] `convitegrupotarefa` — UsuarioCPFConvidado (código consumidor já corrigido em 2026-08-10, idem acima)
- [ ] `grupoprojeto` — UsuarioCPFLider (código consumidor já corrigido em 2026-08-10, idem acima)
- [ ] `grupotarefa` — UsuarioCPFLider (UNIQUE composta) — quebra conhecida **corrigida em 2026-08-10** (código consumidor; tabela em si segue não migrada)
- [ ] `historicogrupoprojeto` — UsuarioCPFAtor (nota: `UsuarioCPFAlvo` existe mas NÃO tem FK — ver alerta)
- [ ] `historicogrupotarefa` — não apareceu na auditoria de FK real (provavelmente sem FK enforced em produção) — checar schema real antes de migrar
- [ ] `materiacustomizacao` — UsuarioCPF (UNIQUE composta)
- [ ] `materialdidatico` — CriadoPorCPF
- [ ] `materialdidaticopagina` — RevisadoPorCPF (nullable)
- [ ] `materiaxprofessorxturma` — UsuarioCPF (UNIQUE composta) — usada em `calendario.repository.ts` como bridge CPF (lado professor). `professor.service.ts`/`.controller.ts` (o domínio "Professor" gira em torno desta tabela) já teve seu código consumidor corrigido em 2026-08-10 — achado crítico #1 completo (todas as chamadas a `findByTripla`/`validarPermissaoEscrita` resolvem CPF↔GUID corretamente agora).
- [ ] `mensagem` — MensagemRemetenteCPF
- [ ] `mensagem_fixada` — FixadaPorCPF
- [ ] `mensagem_leitura` — UsuarioCPF (PK composta)
- [ ] `mensagem_reacao` — UsuarioCPF (PK composta)
- [ ] `projeto` — UsuarioCPFCriador — quebra conhecida **corrigida em 2026-08-10** (código consumidor; tabela em si segue não migrada)
- [ ] `questaobanco` — CriadoPorCPF
- [ ] `sugestao` — UsuarioCPF
- [ ] `tarefaacademica_matricula` — TarefaAvaliadoPorCPF (nullable) — **já tem quebra conhecida, ver abaixo**
- [ ] `tarefaacademica_resposta` — RespostaAvaliadoPorCPF (nullable)
- [ ] `usuarioxgrupoprojeto` — UsuarioCPF (PK composta)
- [ ] `usuarioxgrupotarefa` — UsuarioCPF (UNIQUE composta)
- [ ] `verificacao_email` — UsuarioCPF

## ⬜ Websocket
- [ ] `backend/websocket/SocketServer.ts` + `conversa.handler.ts` — salas/identificação de usuário conectado hoje por CPF

---

## ⚠️ Quebras já existentes AGORA (não é preciso esperar a tabela "dona" — corrigir já)

Estes arquivos leem a identidade do aluno a partir de `matricula`, que JÁ foi migrada (é `UsuarioGUID` agora, não `UsuarioCPF`). Não precisa esperar a tabela "dona" de cada arquivo (`grupotarefa`/`projeto`/`tarefaacademica_matricula`/`conteudo`/`provaagendada`) ser migrada pra corrigir isso — o problema é inteiramente do lado `matricula`, já pronto:

**Pegos pelo `tsc` (erro de compilação, propriedade não existe):**
- [x] `backend/services/grupotarefa.service.ts` — **corrigido** (2026-08-10)
- [x] `backend/services/professor.service.ts` — **corrigido** (2026-08-10)
- [x] `backend/services/projeto.service.ts` — **corrigido** (2026-08-10): `#notificarProjetoCriado` agora usa `matricula.UsuarioGUID` direto (matricula já só tem GUID, não precisou nem resolver — só trocar o nome do campo lido)
- [ ] `backend/services/tarefaacademica.service.ts` — **AINDA PENDENTE** (3 ocorrências de `matricula.UsuarioCPF`, pelo menos uma alimenta `destinatarios` de notificação — CRÍTICO, fan-out quebrado ali). Arquivo grande (11 erros no service + 27 no controller) — é o maior bloco de trabalho restante do achado crítico #1/#2. Aplicar o mesmo padrão dos arquivos já corrigidos: ator vira `usuarioGUID` renomeado, resolver CPF só onde uma tabela ainda-não-migrada (`tarefaacademica_matricula`, `tarefaacademica_resposta`, `grupotarefa`) realmente precisar.

**NÃO pegos pelo `tsc`** (fazem `SELECT UsuarioCPF FROM matricula WHERE ...` como SQL cru — string, o compilador não vê nada de errado, mas a coluna real vai virar `UsuarioGUID`; hoje ainda funciona pq o schema do banco não mudou, mas o array resultante já devia se chamar/tratar como GUID pra bater com `notificacao.disparar()`):
- `backend/services/conteudo.service.ts` (linha ~275, monta `destinatarios` pro fan-out de notificação)
- `backend/services/provaagendada.service.ts` (linha ~366, idem)

## ⚠️ Achado crítico #1: checagem de permissão é transversal, não por tabela

Os métodos de `EscolaxUsuarioxFuncaoDAO` (`findByTripla`, `isCoordOuDirecaoEmEscola`, `isProfessorOuDirecaoEmEscola`, `isCoordSecretariaOuDirecaoEmEscola`, `usuarioExists`, `findRepresentanteLegal`, `findUsuariosAtivosByEscolaEFuncoes`) já exigem `UsuarioGUID` desde que `escolaxusuarioxfuncao` foi migrada. Eles são chamados por services de QUALQUER tabela como checagem de "esse ator é Coordenação/Direção nesta escola" — é ortogonal à tabela que cada service gerencia. **TypeScript não pega esse erro** (os dois lados de uma comparação são `string`).

**Padrão de correção**, já aplicado várias vezes (`matricula.service.ts`, `curso.service.ts`, `escola.service.ts`, `aviso.service.ts`, `pendencia.service.ts`, `anotacao.service.ts`, `evento.service.ts`, `calendario.service.ts`): se o service SÓ usa a variável pra permissão+auditoria, é renomeação pura e segura (`usuarioCPF` → `usuarioGUID`, valor vem de `req.user.UsuarioGUID` no controller). Se o MESMO valor também é usado pra gravar/comparar em coluna CPF de tabela ainda não migrada, precisa resolver CPF↔GUID via `usuarioDAO` (ver `matricula.service.ts` com `conversa_grupo_membro`, `aviso.service.ts` com `anexo`, `calendario.service.ts` com `materiaxprofessorxturma`) — NUNCA assumir que é renomeação pura sem ler o arquivo inteiro primeiro.

**Services já auditados/corrigidos nesta sessão (2026-08-10):**
`grupotarefa.service.ts`, `convitegrupotarefa.service.ts`, `professor.service.ts`, `grupoprojeto.service.ts`, `convitegrupoprojeto.service.ts`, `projeto.service.ts` — todos seguiram o padrão descrito na seção "Sessão em 2026-08-10" no topo deste arquivo. **Cada um também teve suas chamadas a `getAuditoriaService()`/`getNotificacaoService()` corrigidas junto (ver Achado crítico #2 abaixo)** — não são dois passes separados, foram resolvidos juntos por arquivo.

**Services que ainda usam os métodos de `EscolaxUsuarioxFuncaoDAO` e NÃO foram auditados/corrigidos:**
`anexo.service.ts`, `conversa-permissao.service.ts`, `escolaconfiguracao.service.ts`, `horarioturma.service.ts`, `materia.service.ts`, `materialdidatico.service.ts`, `turma.service.ts` — e provavelmente outros dentro das tabelas ainda não tocadas (`tarefaacademica`, `categoriaconteudo`, `conversa`, etc.) — qualquer service com um método tipo `validarPermissaoEscrita`/`validarAcesso` é suspeito até ser lido. **Nenhum desses tem erro de `tsc` hoje** (é só bug silencioso, como descrito acima) — só serão pegos por leitura manual ou pelos controllers deles quebrando quando `req.user.UsuarioCPF` for removido/renomeado nesses controllers específicos (ver lista de controllers ainda com `req.user?.UsuarioCPF` na seção de controllers abaixo — muitos desses 7 services têm controller correspondente na lista).

## ⚠️ Achado crítico #2: fan-out de notificação

`notificacao` + `usuarionotificacaopreferencia` foram migradas, então `getNotificacaoService().disparar()` exige `destinatarios: UsuarioGUID[]`. Isso é definitivo, não vai mudar — mas todo service que monta esse array precisa ser conferido individualmente:
- ✅ Corretos: `matricula.service.ts`, `aviso.service.ts`, `notificacao.scheduler.ts`, `evento.service.ts`, `pendencia.service.ts`, `grupotarefa.service.ts`, `convitegrupotarefa.service.ts`, `grupoprojeto.service.ts`, `convitegrupoprojeto.service.ts`, `projeto.service.ts` (todos corrigidos nesta sessão).
- ❌ Ainda quebrados: `tarefaacademica.service.ts` (via entity — aparece no tsc como erro de propriedade); `conteudo.service.ts` e `provaagendada.service.ts` (via SQL cru — **não aparecem no tsc**, ver seção "Quebras já existentes AGORA" acima pro detalhe). Nos três, depois de corrigir, confirme que o array final passado a `disparar()` é de GUIDs, não CPFs.

## ⚠️ Controllers ainda com `req.user?.UsuarioCPF` (não existe mais — vira erro de tsc)

Levantamento em 2026-08-10 (`grep -rln "req.user?\?\.UsuarioCPF" backend/controllers/ backend/middlewares/`). Já corrigidos nesta sessão: `grupotarefa.controller.ts`, `convitegrupotarefa.controller.ts`, `professor.controller.ts`, `grupoprojeto.controller.ts`, `convitegrupoprojeto.controller.ts`, `projeto.controller.ts`. **Ainda pendentes:**
`assunto.controller.ts`, `categoriaconteudo.controller.ts`, `conteudo.controller.ts`, `conteudoprogresso.controller.ts`, `escolaconfiguracao.controller.ts`, `horarioturma.controller.ts`, `materia.controller.ts`, `materiacustomizacao.controller.ts`, `materialdidatico.controller.ts`, `questaobanco.controller.ts`, `sugestao.controller.ts`, `turma.controller.ts` + `backend/middlewares/conversa.middleware.ts`. (`tarefaacademica.controller.ts` e `conversa.controller.ts` também têm erros de `UsuarioCPF`, conferir se é este mesmo padrão ou outra coisa — são os dois maiores blocos de erro do `tsc` agora, 27 e 14 respectivamente.)

Para cada um: o valor de `req.user.UsuarioGUID` é sempre o ATOR — renomear a variável local pra `usuarioGUID` e ajustar as chamadas ao service correspondente para receber GUID (aplicando o mesmo padrão de resolver-CPF-só-onde-a-tabela-ainda-exige, já usado nos 6 domínios corrigidos). **Não assumir que é troca 1:1** sem olhar o que o service faz com o valor — pode ser subject em vez de ator em algum desses.

## Alertas menores
- `historicogrupoprojeto.UsuarioCPFAlvo` e (provavelmente) toda `historicogrupotarefa` não têm FK enforced pra `usuario` em produção — gap de integridade pré-existente, não introduzido por esta migração. Decidir na hora de migrar: manter a FK ausente ou aproveitar pra criá-la.
- Um agente (nesta sessão) rodou uma auditoria read-only no banco de produção e **expôs a senha root do MySQL em texto plano no transcript** (via `railway variables --kv`). Considerar rotacionar a credencial no Railway — ainda não feito.
- Nomes de tabela reais em produção usam underscore em alguns casos (`conversa_individual`, `mensagem_leitura`, `redefinicao_senha`, `verificacao_email`) diferente do que `backend/database/sql.txt` sugere — sem impacto no código (introspecção via `information_schema`), só cuidado ao ler o schema legado.

## Depois que TODAS as tabelas acima estiverem `[x]`
1. `npx tsc --noEmit -p .` até 0 erros.
2. Reler os dois "Achados críticos" acima e confirmar que cada service listado foi de fato corrigido (não só compilando — TypeScript não pega esses bugs).
3. **Frontend** — nada foi tocado ainda: `frontend/lib/api/*.ts`, páginas que leem/comparam CPF do usuário logado, páginas que montam URL com CPF (ver lista original em `docs/PLANO_MIGRACAO_USUARIO_PK_GUID.md`, seção de inventário). Prestar atenção especial em `EscolaService.transferirDirecao` (contrato mudou pra `NovoDirecaoGUID`).
4. Rodar a migração de schema: primeiro `npx tsx backend/database/migrations/2026-08-10-usuario-guid-pk.ts --check` e revisar o output com calma, depois `--apply --confirm-production`. **Fazer backup do banco antes** (não há banco de dev pra testar antes).
5. Atualizar `docs/routes/*.md`.
6. Testar login + fluxos principais manualmente contra o banco já migrado.
7. Considerar remover a dependência `uuid` do `package.json` (não é mais usada em lugar nenhum — trocada por `gerarGUID()`).
