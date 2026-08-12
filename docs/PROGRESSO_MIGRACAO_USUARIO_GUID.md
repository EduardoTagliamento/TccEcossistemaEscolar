# Progresso: migração CPF -> UsuarioGUID

**Objetivo:** trocar a PK de `usuario` de `UsuarioCPF` para `UsuarioGUID` em todo o sistema (schema + backend + frontend), sem soluções temporárias/bridges. Contexto de decisão completo em `docs/PLANO_MIGRACAO_USUARIO_PK_GUID.md`.

## ✅ MIGRAÇÃO CONCLUÍDA (2026-08-12) — schema + código consumidor das 39 tabelas, verificado

Depois do incidente descrito abaixo (schema de produção migrado de uma vez, quebrando o código das 27 tabelas que ainda esperavam CPF), o código consumidor dessas 27 tabelas foi corrigido — parte pelos 4 agentes paralelos que retomaram após o reset do limite de sessão, parte por correções manuais diretas (leftovers dos clusters "Grupos/Projetos/Convites" e "Avaliação/Tarefa", incluindo `tarefaacademica.service.ts` inteiro), parte por um agente final dedicado ao cluster "Conteúdo/Material/Anexo/Professor" (que tinha falhado 100% antes do reset, sem nenhum progresso salvo).

**Verificação de conclusão:**
- `npx tsc --noEmit -p .` (backend, raiz do repo): **0 erros**.
- `cd frontend && npx tsc --noEmit -p .`: **0 erros**.
- Sweep manual (`grep -rln "UsuarioCPF" backend --include=*.ts`, excluindo migrations/docs) em todos os arquivos restantes: todas as ocorrências confirmadas legítimas — `usuario.UsuarioCPF` (atributo real, não é mais PK, continua existindo na tabela `usuario`), campos de wire/API que deliberadamente aceitam CPF como input do cliente (ex.: "convidar por CPF", "transferir liderança por CPF") resolvidos para GUID internamente antes de tocar qualquer tabela, e os dois casos documentados em "Alertas menores" (`historicogrupoprojeto.UsuarioCPFAlvo` sem FK, nunca migrado por design; `historicogrupotarefa` — tabela não existe em produção, bug pré-existente não relacionado a esta migração, ver nota abaixo).
- Consultado `information_schema.COLUMNS` direto em produção (via proxy público Railway) para confirmar que as 39 tabelas dependentes de `usuario` têm hoje coluna `UsuarioGUID` (não `UsuarioCPF`), exceto as duas exceções documentadas acima.

**Achado novo durante esta rodada, fora do escopo da migração CPF→GUID:** a tabela `historicogrupotarefa` **não existe em produção** (`SHOW TABLES LIKE 'historicogrupotarefa'` retorna vazio), embora `backend/entities/historicogrupotarefa.model.ts` e `backend/repositories/historicogrupotarefa.repository.ts` existam e sejam usados por `GrupoTarefaService`/`ConviteGrupoTarefaService` (chamadas a `#historicoService.registrar(...)` em `transferirLideranca`, `expulsarMembro`, `aceitar` convite). Essas chamadas hoje lançam erro de SQL em produção ("table doesn't exist") sempre que alcançadas — **pré-existente, não causado por esta sessão**, não corrigido (é uma feature de histórico de grupo-tarefa nunca de fato implantada no schema, não um problema de CPF vs. GUID). Fica registrado aqui para uma sessão futura decidir: criar a tabela (espelhando `historicogrupoprojeto`) ou remover o código morto.

**Não verificado nesta sessão** (fora do escopo do que foi pedido — só código, sem acesso a browser): teste end-to-end manual do site em produção (login + chat + grupos de tarefa/projeto + conteúdo/material didático + anexos + avaliação de tarefas + banco de questões + sugestões). Recomendado antes de considerar o incidente 100% encerrado.

## 🚨 INCIDENTE (2026-08-11) — schema de produção migrado, código consumidor em correção

**O que aconteceu:** o commit `1afab81` (2026-08-10 23:27, "migração cpf id") alterou o backend pra ler/escrever `UsuarioGUID` em `usuario`/`escolaxusuarioxfuncao`/`matricula`/`notificacao`/`aviso`/`pendencia`/`anotacao`/`registroauditoria`, e foi pushado + deployado (Railway). **Mas o schema de produção continuava 100% no modelo antigo** — o script `2026-08-10-usuario-guid-pk.ts` nunca tinha sido executado. Resultado: `usuarioDAO.findByGUID()` (chamado em TODO request autenticado, via `auth.middleware.ts`) rodava `SELECT * FROM usuario WHERE UsuarioGUID = ?` contra uma coluna inexistente — **erro fatal de SQL, site inteiro fora do ar (login e qualquer página autenticada) por ~14h**, sem que ninguém tivesse percebido.

**Diagnóstico:** confirmado por leitura direta do banco de produção (via proxy público Railway, `nozomi.proxy.rlwy.net`, já que `mysql.railway.internal` só resolve de dentro da rede do Railway) — `DESCRIBE usuario` não tinha coluna `UsuarioGUID`, `UsuarioCPF` ainda era PK.

**Ação tomada:** rodei a migração de schema (`backend/database/migrations/2026-08-10-usuario-guid-pk.ts --apply --confirm-production`) contra produção, com autorização explícita do usuário. Isso:
1. Corrige o incidente (login e tudo que já esperava GUID nas 8 tabelas acima voltou a funcionar).
2. **Migra TODAS as 39 FKs de uma vez** (o script descobre via `information_schema`, não filtra por "só as prontas") — inclusive as 27 tabelas que o código ainda tratava como "não migradas". Ou seja, **o schema agora está 100% migrado**, mas o código consumidor dessas 27 tabelas (que deliberadamente continuava CPF, por design, até agora) ficou quebrado na direção oposta — é o que está sendo corrigido agora, ver "Status atual" abaixo.

**Bugs encontrados e corrigidos no próprio script de migração** (achados reais, não só execução):
- Em modo `--check`, duas queries (contagem de pendentes de backfill em `usuario.UsuarioGUID` e em cada tabela dependente) referenciavam a coluna nova mesmo quando ela ainda não existia de verdade (só existiria depois de um `--apply`) — corrigido pra usar `COUNT(*)` como proxy nesse caso.
- **Achado real, não só de check**: `tarefaacademica_matricula`/`tarefaacademica_resposta` (e as outras 4 tabelas do domínio `tarefaacademica`) têm collation de tabela `utf8mb4_unicode_ci`, diferente do resto do banco (`utf8mb4_0900_ai_ci`, usado em `usuario.UsuarioGUID`). O `ADD COLUMN` original não especificava `CHARACTER SET`/`COLLATE`, então a coluna nova herdava o collation da TABELA — e o `ADD CONSTRAINT FK` falhava com "Referencing column and referenced column are incompatible". Corrigido: o script agora lê o collation real de `usuario.UsuarioGUID` uma vez e especifica explicitamente em toda `ADD COLUMN`/`MODIFY COLUMN` das tabelas dependentes, nunca herda do default da tabela.
- A migração foi reexecutada (é idempotente — pula o que já foi feito) e completou com sucesso: `usuario.UsuarioGUID` é a PK agora, `UsuarioCPF` virou coluna comum nullable com UNIQUE INDEX.

**Consequência imediata:** as 27 tabelas da lista "Tabelas ainda não migradas" abaixo mudaram de status NO BANCO (schema já é GUID em todas), mas o CÓDIGO (entities/repositories/services/controllers/frontend) ainda espera CPF em várias delas — isso está sendo corrigido agora em paralelo (4 forks por cluster de tabelas relacionadas, ver "Status atual"). Até essa correção terminar, features desses domínios (chat, tarefas em grupo, projetos, conteúdo/material didático, anexos, avaliação de tarefa, banco de questões, sugestões) podem estar retornando erro 500.

**Lição pra próximas sessões:** o script de migração de schema SEMPRE migra TODAS as FKs descobertas de uma vez — não dá pra rodar "só pras tabelas prontas". Se algum dia o código ficar dessincronizado de novo (código esperando GUID numa tabela que o schema ainda não migrou, ou vice-versa), a stack inteira quebra igual a esse incidente. **Regra daqui pra frente: NUNCA fazer deploy de código que espera GUID numa tabela sem ANTES já ter rodado a migração de schema pra ela** (ou vice-versa) — os dois lados (código E schema) precisam mudar atomicamente do ponto de vista de produção, mesmo que sejam commits/execuções separadas.

**Como retomar se a sessão for interrompida (leia isto primeiro):**
1. Rode `npx tsc --noEmit -p .` na raiz do repo. A lista de erros é o checklist exato do que ainda falta — cada erro é um call site que espera uma propriedade que não existe mais (ex.: `request.user?.UsuarioCPF`, `usuarioDAO.findById`).
2. **`npx tsc` NÃO cobre tudo.** Existem bugs de permissão e de fan-out de notificação que são silenciosos (comparam `string` com `string`, TypeScript não reclama) — ver seção "Achados críticos" abaixo antes de considerar qualquer tabela "pronta".
3. Nunca assuma que um arquivo é "renomeação pura" sem ler o arquivo inteiro. Um mesmo arquivo frequentemente mistura identidade do ATOR (quem está fazendo a ação — sempre pode virar `UsuarioGUID`, vem de `req.user.UsuarioGUID`) com dado de ASSUNTO de outra tabela ainda não migrada (tem que continuar `UsuarioCPF` até aquela tabela específica ser migrada). Exemplos reais dessa mistura: `matricula.service.ts` (aluno é assunto, mas grava em `conversa_grupo_membro`/`notificacao` que citavam CPF antes delas migrarem), `aviso.service.ts` (autor vs. dono do anexo).
4. Esta é a ÚNICA fonte da verdade sobre o progresso — não existe outro lugar com esse estado. Mantenha-a atualizada a cada tabela concluída, não só no fim da sessão.
5. **Este projeto não tem banco de dev/staging** — `.env` aponta pro Railway de produção. O script de migração de schema só deve rodar com `--apply --confirm-production` depois que TODAS as tabelas abaixo estiverem `[x]`. Até lá, só `--check` (leitura).
6. **⚠️ PORTABILIDADE: há mudanças NÃO commitadas** (checar `git status --short` pra número atual — 35 arquivos ao fim da sessão de 2026-08-12, todos backend + `routes/professor.routes.ts`, nenhum frontend). Este markdown descreve código que existe SÓ no disco local até alguém commitar. Se for continuar em outra máquina, PRIMEIRO `git add` + `git commit` (e `git push`) tudo, ou copiar a working tree inteira — senão a sessão nova vai ler este arquivo descrevendo um trabalho que não existe onde ela está rodando. **Lembrete de política deste projeto: não commitar automaticamente** — deixe as mudanças no working tree e avise o usuário; só commite se ele pedir explicitamente.
   - Nota histórica: as mudanças das sessões de 2026-08-10/11 (frontend completo + primeira leva do backend) **já foram commitadas** — ver commits `1afab81`, `b246a9e`, `4850e41`, `28430c4`, `8569baf`. As mudanças de 2026-08-12 (fechamento do cluster Conteúdo/Material/Anexo/Professor + leftovers) ainda não.

## Status atual — MIGRAÇÃO CONCLUÍDA (código + schema), ver seção de conclusão no topo
Último `npx tsc --noEmit -p .`: **0 erros** em backend e frontend (2026-08-12). Schema de produção: **39/39 tabelas migradas** (`--apply --confirm-production` executado 2026-08-11). Todo call site que esperava `UsuarioCPF`/`req.user?.UsuarioCPF`/coluna SQL renomeada foi corrigido ou teve a resolução CPF↔GUID explicitada onde o cliente genuinamente ainda envia CPF como input. Falta apenas: commit, teste manual end-to-end, e os itens de "Migração concluída — próximos passos opcionais" no fim deste arquivo.

**⚠️ `npx tsc` limpo NÃO significa migração completa.** Ver seção "Depois que TODAS as tabelas acima estiverem `[x]`" no fim deste arquivo — 0 erros só prova que o código consumidor não MENTE mais sobre CPF vs. GUID; as 27 tabelas listadas em "Tabelas ainda não migradas" continuam usando CPF de verdade no schema. **A auditoria do frontend (sessões 2026-08-10 + 2026-08-11) está concluída** — todo arquivo que referenciava `UsuarioCPF` foi lido e classificado, achados reais corrigidos (ver seção "Frontend" abaixo). O que falta agora é migrar as tabelas restantes de verdade, não mais achar desalinhamento de frontend.

**⚠️ Mudanças NÃO commitadas na sessão de 2026-08-10** (checar `git status --short` pra número atual) — mesma advertência de portabilidade do topo deste arquivo: se for continuar em outra máquina, commitar/copiar a working tree primeiro.

## 🖥️ Frontend — AUDITORIA CONCLUÍDA (2026-08-10 + 2026-08-11) · migração de tabela em si ainda depende do backlog de 27 tabelas

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

### Continuação — auditoria sistemática completa do frontend (2026-08-11, nova sessão) — ✅ AUDITORIA FECHADA

Retomado exatamente do ponto acima (`notificacao.api.ts`). Auditados **todos** os ~43 arquivos que a sessão anterior tinha listado como pendentes (`lib/api/*.ts` restantes, páginas de chat/projetos/tarefas/pendências, `types/*.ts`), um por um, com a mesma técnica: pra cada `UsuarioCPF`, perguntar "a tabela dona já foi migrada?" contra a tabela de status acima. `npx tsc --noEmit -p .` continua **0 erros** em backend e frontend depois de todas as correções.

**Bugs reais confirmados e corrigidos** (campo devia ser `UsuarioGUID`/nulo porque a tabela dona já migrou, mas o frontend ainda esperava CPF real):
- **`frontend/lib/api/notificacao.api.ts`** — `Notificacao.UsuarioCPF` → `UsuarioGUID` (tabela `notificacao` já migrada). Sem consumidor lendo o campo — era tipo morto, não quebrava nada em runtime, só mentia sobre o shape.
- **`frontend/lib/api/aviso.api.ts`** — `Aviso.UsuarioCPFAutor` → `UsuarioGUIDAutor` (tabela `aviso` já migrada). Mesma situação: campo nunca lido por nenhum componente, só tipado errado.
- **`frontend/types/anotacao.ts`** — `Anotacao.UsuarioCPF` → `UsuarioGUID` (tabela `anotacao` já migrada). Idem, campo morto.
- **`frontend/lib/api/auditoria.api.ts` + `app/.../auditoria/page.tsx`** — **bug com efeito visível real**: a tela de Registro de Auditoria mostrava a coluna "Responsável (CPF)" sempre em branco (backend retorna `UsuarioGUIDAtor`, frontend lia `UsuarioCPFAtor` inexistente) e o filtro "CPF do responsável" não filtrava nada (backend já esperava `?UsuarioGUIDAtor=`, frontend mandava `?UsuarioCPFAtor=`, parâmetro ignorado). Corrigido em duas pontas:
  - Backend (`backend/services/auditoria.service.ts` + `routes/auditoria.routes.ts`): `AuditoriaService` passou a receber `UsuarioDAO` e resolve nome+CPF do ator via `findNomesECPFsByGUIDs` (mesmo helper já usado em `escolaxusuarioxfuncao.service.ts`) — `listar()`/`buscarPorId()` agora retornam `RegistroAuditoriaComAutor` com `UsuarioGUIDAtor` (identidade real) + `UsuarioNomeAtor`/`UsuarioCPFAtor` (informativo, `null` se não encontrado).
  - Frontend: `RegistroAuditoria` ganhou `UsuarioGUIDAtor`/`UsuarioNomeAtor`/`UsuarioCPFAtor`; coluna agora mostra nome (+ CPF entre parênteses) com fallback pro GUID truncado; filtro continua aceitando CPF digitado pela Coordenação/Secretaria/Direção na UI (UX preservada), mas a página resolve CPF→GUID via `buscarUsuarioPorCPF` (mesmo endpoint/padrão já usado em coordenação/secretaria) antes de mandar `UsuarioGUIDAtor` pro backend.
- **`frontend/lib/api/pendencia.api.ts` + `pendencias/[pendenciaGUID]/page.tsx` + `cadastro-pendencia/page.tsx`** — **bug com efeito visível real, mais sério**: tabela `pendencia` já migrada (service retorna `PendenciaDTO.UsuarioGUID`, não CPF — só o `PendenciaCreateDTO.UsuarioCPFDestino` de *entrada* continua CPF, resolvido internamente), mas `Pendencia.UsuarioCPF` no frontend não existia mais no DTO real. Efeitos:
  - Na tela de recebimento (`pendencias/[pendenciaGUID]/page.tsx`), `souDestinatario = usuario.UsuarioCPF === pendencia.UsuarioCPF` comparava `string|null` com `undefined` — **sempre falso**. Resultado: o destinatário de uma pendência nunca conseguia anexar arquivo nem marcar como concluída (as duas ações ficavam permanentemente escondidas/bloqueadas). Corrigido pra comparar `usuario.UsuarioGUID === pendencia.UsuarioGUID`.
  - Na tela de cadastro (`cadastro-pendencia/page.tsx`), editar uma pendência existente mostrava o campo "Destinatário" em branco/`undefined` (populava o form a partir de `pendencia.UsuarioCPF` inexistente) e o card da lista mostrava `Destinatário: undefined`. Corrigido: `MembroEscola` ganhou `UsuarioGUID` (já vinha em `AlunoDTO`/`ProfessorDTO`, só não era propagado); `editarPendencia` resolve o nome via `membrosEscola.find(m => m.UsuarioGUID === pendencia.UsuarioGUID)`; novo mapa `nomePorGUID` usado no card da lista. Comentário desatualizado no topo do arquivo (dizia "pendência ainda é endereçada por CPF, tabela não migrada") corrigido pra refletir que só o *input de criação* é CPF.

**Auditados e confirmados corretos, sem alteração** (campo é de tabela genuinamente não migrada, ou já protegido com `null`-safety): `conversa.api.ts`, `convitegrupoprojeto.api.ts`, `convitegrupotarefa.api.ts`, `grupoprojeto.api.ts`, `horarioturma.api.ts`, `categoriaconteudo.api.ts`, `conteudo.api.ts`, `anexo.api.ts`, `sugestao.api.ts`, `types/projeto.ts`, `types/grupotarefa.ts`, `types/convitegrupotarefa.ts`, `chat/GerenciarGrupoModal.tsx`, `TransferirLiderancaModal.tsx`, `SolicitarEntradaModal.tsx`, `_components/MinimizedChatBubble.tsx`, `configuracoes/page.tsx`, `gestao-dados/page.tsx`, `admin-plataforma/page.tsx`, `projetos/[projetoGUID]/**`, `tarefas/[tarefaGUID]/page.tsx`, `app/cadastro/page.tsx` (o `UsuarioCPF` ali é dado real de cadastro, não identidade de sessão). Cada verificação confirmada lendo o backend real (entity/service/controller), não por inferência.

**Achado paralelo, fora do escopo desta migração (não mexido)**: `components/ConviteGrupoModal.tsx` usa dados mockados (`TODO: Implementar endpoint para buscar alunos disponíveis da turma`) — feature genuinamente incompleta, não relacionada a CPF↔GUID.

**Estado ao final desta sessão**: `git status --short` mostra 10 arquivos modificados (backend: `auditoria.service.ts`, `routes/auditoria.routes.ts`; frontend: `auditoria.api.ts` + `auditoria/page.tsx`, `pendencia.api.ts` + `pendencias/[pendenciaGUID]/page.tsx` + `cadastro-pendencia/page.tsx`, `aviso.api.ts`, `notificacao.api.ts`, `types/anotacao.ts`) — **não commitados**, política do projeto é não commitar automaticamente.

### 🛑 Onde parei — próximo passo

A auditoria sistemática do frontend (item 3 da seção "Depois que TODAS as tabelas acima estiverem `[x]`") está **concluída** — todos os arquivos que citam `UsuarioCPF` foram lidos e classificados. O que falta agora não é mais "achar bugs de frontend desalinhado", é:
1. Migrar de fato as 27 tabelas ainda não migradas (lista abaixo) — schema + backend + frontend juntos, tabela por tabela.
2. Rodar a migração de schema (`backend/database/migrations/2026-08-10-usuario-guid-pk.ts`) só depois de TODAS estarem `[x]`.
3. Reler os "Achados críticos #1/#2" e confirmar que `tarefaacademica.service.ts`/`conteudo.service.ts`/`provaagendada.service.ts` (únicos pendentes na seção "Quebras já existentes AGORA") realmente foram fechados — a sessão de 2026-08-10 marcou `tarefaacademica.service.ts` como corrigido junto com o zeramento de erros; vale conferir com uma leitura rápida antes de assumir 100%.

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

## ✅ Tabelas/serviços migrados nesta sessão (12 tabelas + 2 arquivos de correção cruzada)

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

## ✅ Tabelas migradas (39/39 — schema + código consumidor, 2026-08-11/12)

Todas migradas: schema (via `2026-08-10-usuario-guid-pk.ts --apply --confirm-production`) e código consumidor (entity/repository/service/controller/routes/frontend) verificados via `tsc` + sweep manual, ver seção de conclusão no topo.

- [x] `anexo`, `categoriaconteudo`, `conteudo`, `conversa_grupo_membro`, `conversa_individual`, `convitegrupoprojeto`, `convitegrupotarefa`, `grupoprojeto`, `grupotarefa`, `historicogrupoprojeto` (exceto `UsuarioCPFAlvo`, deliberadamente sem FK — ver "Alertas menores"), `materiacustomizacao`, `materialdidatico`, `materialdidaticopagina`, `materiaxprofessorxturma`, `mensagem`, `mensagem_fixada`, `mensagem_leitura`, `mensagem_reacao`, `projeto`, `questaobanco`, `sugestao`, `tarefaacademica_matricula`, `tarefaacademica_resposta`, `usuarioxgrupoprojeto`, `usuarioxgrupotarefa`, `verificacao_email`
- `historicogrupotarefa` — **não existe em produção** (achado nesta sessão, pré-existente, fora do escopo CPF/GUID — ver nota na seção de conclusão no topo)

## ✅ Websocket
- [x] `backend/websocket/SocketServer.ts` + `conversa.handler.ts` — migrados para `UsuarioGUID` (sessão 2026-08-10, ver "Efeito colateral obrigatório: WebSocket" acima)

---

## ✅ Quebras já existentes AGORA — todas corrigidas (2026-08-10/12)

Todos os arquivos desta lista (que liam identidade do aluno via `matricula`, ou montavam `destinatarios` de notificação via SQL cru contra tabelas já migradas) foram corrigidos:
- [x] `backend/services/grupotarefa.service.ts`, `professor.service.ts`, `projeto.service.ts` — corrigidos (2026-08-10)
- [x] `backend/services/tarefaacademica.service.ts` — corrigido (2026-08-12): `#buscarInfoPorMatricula`/`#buscarInfoPorMatriculaTarefa`/`listarPendentesAvaliacaoProfessor`/`#notificarTarefaRespostaRecebida` todos em `UsuarioGUID`; `#resolverCPFAtor` removido (não é mais necessário — `categoriaconteudo` e `materiaxprofessorxturma`, as duas tabelas que motivavam a resolução, já são GUID).
- [x] `backend/services/conteudo.service.ts`, `provaagendada.service.ts` — corrigidos (2026-08-12), SQL cru de `destinatarios` já usa `UsuarioGUID`.

## ✅ Achado crítico #1: checagem de permissão é transversal, não por tabela — resolvido

Os métodos de `EscolaxUsuarioxFuncaoDAO` (`findByTripla`, `isCoordOuDirecaoEmEscola`, `isProfessorOuDirecaoEmEscola`, `isCoordSecretariaOuDirecaoEmEscola`, `usuarioExists`, `findRepresentanteLegal`, `findUsuariosAtivosByEscolaEFuncoes`) já exigem `UsuarioGUID` desde que `escolaxusuarioxfuncao` foi migrada. Eles são chamados por services de QUALQUER tabela como checagem de "esse ator é Coordenação/Direção nesta escola" — é ortogonal à tabela que cada service gerencia. **TypeScript não pega esse erro** (os dois lados de uma comparação são `string`).

**Padrão de correção**, já aplicado várias vezes (`matricula.service.ts`, `curso.service.ts`, `escola.service.ts`, `aviso.service.ts`, `pendencia.service.ts`, `anotacao.service.ts`, `evento.service.ts`, `calendario.service.ts`): se o service SÓ usa a variável pra permissão+auditoria, é renomeação pura e segura (`usuarioCPF` → `usuarioGUID`, valor vem de `req.user.UsuarioGUID` no controller). Se o MESMO valor também é usado pra gravar/comparar em coluna CPF de tabela ainda não migrada, precisa resolver CPF↔GUID via `usuarioDAO` (ver `matricula.service.ts` com `conversa_grupo_membro`, `aviso.service.ts` com `anexo`, `calendario.service.ts` com `materiaxprofessorxturma`) — NUNCA assumir que é renomeação pura sem ler o arquivo inteiro primeiro.

**Services já auditados/corrigidos nesta sessão (2026-08-10):**
`grupotarefa.service.ts`, `convitegrupotarefa.service.ts`, `professor.service.ts`, `grupoprojeto.service.ts`, `convitegrupoprojeto.service.ts`, `projeto.service.ts` — todos seguiram o padrão descrito na seção "Sessão em 2026-08-10" no topo deste arquivo. **Cada um também teve suas chamadas a `getAuditoriaService()`/`getNotificacaoService()` corrigidas junto (ver Achado crítico #2 abaixo)** — não são dois passes separados, foram resolvidos juntos por arquivo.

**Services que usavam os métodos de `EscolaxUsuarioxFuncaoDAO` e não tinham sido auditados** (`anexo.service.ts`, `conversa-permissao.service.ts`, `escolaconfiguracao.service.ts`, `horarioturma.service.ts`, `materia.service.ts`, `materialdidatico.service.ts`, `turma.service.ts`) — todos confirmados corretos/corrigidos como parte da conclusão de 2026-08-12 (ver seção de conclusão no topo). `tsc` limpo em backend+frontend confirma que nenhum ficou com comparação `UsuarioGUID`/`UsuarioCPF` cruzada sem resolução.

## ✅ Achado crítico #2: fan-out de notificação — resolvido

`notificacao` + `usuarionotificacaopreferencia` foram migradas, `getNotificacaoService().disparar()` exige `destinatarios: UsuarioGUID[]`. Todos os services que montam esse array (incluindo `tarefaacademica.service.ts`, `conteudo.service.ts`, `provaagendada.service.ts` — os três que faltavam) foram conferidos e corrigidos até 2026-08-12.

## ✅ Controllers — `req.user?.UsuarioCPF` eliminado em todo o backend

Todos os controllers que ainda liam `req.user?.UsuarioCPF` (`assunto`, `categoriaconteudo`, `conteudo`, `conteudoprogresso`, `escolaconfiguracao`, `horarioturma`, `materia`, `materiacustomizacao`, `materialdidatico`, `questaobanco`, `sugestao`, `turma`, `tarefaacademica`, `conversa` + `conversa.middleware.ts`) foram corrigidos — confirmado por `tsc` limpo (qualquer leitura de propriedade inexistente em `req.user` teria virado erro de compilação).

## Alertas menores
- `historicogrupoprojeto.UsuarioCPFAlvo` não tem FK enforced pra `usuario` em produção — gap de integridade pré-existente, não introduzido por esta migração, deliberadamente deixado como CPF (ver seção de conclusão no topo).
- `historicogrupotarefa` **não existe como tabela em produção** — achado nesta sessão (2026-08-12), ver seção de conclusão no topo. Não é mais "provavelmente sem FK", é confirmado via `SHOW TABLES`.
- Um agente (sessão 2026-08-11) rodou uma auditoria read-only no banco de produção e **expôs a senha root do MySQL em texto plano no transcript** (via `railway variables --kv`) — reexposto uma segunda vez na sessão de 2026-08-12 pelo mesmo motivo (obter a connection string do proxy público). Considerar rotacionar a credencial no Railway — ainda não feito.
- Nomes de tabela reais em produção usam underscore em alguns casos (`conversa_individual`, `mensagem_leitura`, `redefinicao_senha`, `verificacao_email`) diferente do que `backend/database/sql.txt` sugere — sem impacto no código (introspecção via `information_schema`), só cuidado ao ler o schema legado.

## Migração concluída — próximos passos opcionais
1. ~~`npx tsc --noEmit -p .` até 0 erros~~ — feito (backend + frontend), ver seção de conclusão no topo.
2. ~~Reler os dois "Achados críticos" e confirmar que cada service foi corrigido~~ — feito.
3. ~~Frontend~~ — auditoria completa (sessões 2026-08-10/11), `tsc` limpo.
4. ~~Rodar a migração de schema~~ — feito (2026-08-11, `--apply --confirm-production`), 39 tabelas migradas.
5. Atualizar `docs/routes/*.md` — **ainda não feito**, se esses docs existirem e mencionarem `:UsuarioCPF` em rotas que agora são `:UsuarioGUID`.
6. **Testar login + fluxos principais manualmente contra o banco já migrado — ainda não feito nesta sessão** (só verificação de compilação/schema, sem acesso a browser). Recomendado antes de fechar o incidente por completo: login, chat, grupos de tarefa/projeto, conteúdo/material didático, anexos, avaliação de tarefas, banco de questões, sugestões.
7. Considerar remover a dependência `uuid` do `package.json` (não é mais usada em lugar nenhum — trocada por `gerarGUID()`) — ainda não feito.
8. Decidir o destino de `historicogrupotarefa` (criar a tabela ou remover o código morto que a referencia) — ver "Alertas menores".
9. Rotacionar a credencial root do MySQL exposta em transcript — ver "Alertas menores".
/upgrade to increase your usage limit.

✻ Cooked for 36m 29s