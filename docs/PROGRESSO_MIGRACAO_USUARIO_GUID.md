# Progresso: migração CPF -> UsuarioGUID

**Objetivo:** trocar a PK de `usuario` de `UsuarioCPF` para `UsuarioGUID` em todo o sistema (schema + backend + frontend), sem soluções temporárias/bridges. Contexto de decisão completo em `docs/PLANO_MIGRACAO_USUARIO_PK_GUID.md`.

**Como retomar se a sessão for interrompida (leia isto primeiro):**
1. Rode `npx tsc --noEmit -p .` na raiz do repo. A lista de erros é o checklist exato do que ainda falta — cada erro é um call site que espera uma propriedade que não existe mais (ex.: `request.user?.UsuarioCPF`, `usuarioDAO.findById`).
2. **`npx tsc` NÃO cobre tudo.** Existem bugs de permissão e de fan-out de notificação que são silenciosos (comparam `string` com `string`, TypeScript não reclama) — ver seção "Achados críticos" abaixo antes de considerar qualquer tabela "pronta".
3. Nunca assuma que um arquivo é "renomeação pura" sem ler o arquivo inteiro. Um mesmo arquivo frequentemente mistura identidade do ATOR (quem está fazendo a ação — sempre pode virar `UsuarioGUID`, vem de `req.user.UsuarioGUID`) com dado de ASSUNTO de outra tabela ainda não migrada (tem que continuar `UsuarioCPF` até aquela tabela específica ser migrada). Exemplos reais dessa mistura: `matricula.service.ts` (aluno é assunto, mas grava em `conversa_grupo_membro`/`notificacao` que citavam CPF antes delas migrarem), `aviso.service.ts` (autor vs. dono do anexo).
4. Esta é a ÚNICA fonte da verdade sobre o progresso — não existe outro lugar com esse estado. Mantenha-a atualizada a cada tabela concluída, não só no fim da sessão.
5. **Este projeto não tem banco de dev/staging** — `.env` aponta pro Railway de produção. O script de migração de schema só deve rodar com `--apply --confirm-production` depois que TODAS as tabelas abaixo estiverem `[x]`. Até lá, só `--check` (leitura).
6. **⚠️ PORTABILIDADE: há ~103 arquivos com mudanças NÃO commitadas** (checar `git status --short` pra número atual). Este markdown descreve código que existe SÓ no disco local até alguém commitar. Se for continuar em outra máquina, PRIMEIRO `git add` + `git commit` (e `git push`) tudo, ou copiar a working tree inteira — senão a sessão nova vai ler este arquivo descrevendo um trabalho que não existe onde ela está rodando.

## Status atual
Último `npx tsc --noEmit -p .`: **199 erros** (era 0 antes desta migração começar — o número vai subir e descer conforme tabelas são migradas, isso é esperado). Script de migração de schema: `backend/database/migrations/2026-08-10-usuario-guid-pk.ts`, escrito e validado por auditoria read-only contra o schema real de produção (39 FKs em 38 tabelas), **ainda não executado**.

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

## ⬜ Tabelas ainda não migradas (27 restantes)

Convenção de nome de coluna nova: trecho "CPF" vira "GUID" (ex.: `UsuarioCPFLider` → `UsuarioGUIDLider`).

- [ ] `anexo` — UsuarioCPF (é bridge usado por `aviso.service.ts`, `matricula.service.ts`, `relacaoanexos.service.ts` — migrar isso provavelmente simplifica os três)
- [ ] `categoriaconteudo` — UsuarioCPF (UNIQUE composta)
- [ ] `conteudo` — UsuarioCPF
- [ ] `conversa_grupo_membro` — MembroUsuarioCPF (PK composta) — é bridge usado por `matricula.service.ts`
- [ ] `conversa_individual` — ConversaIndUsr1CPF + ConversaIndUsr2CPF (UNIQUE composta, 2 FKs na mesma tabela)
- [ ] `convitegrupoprojeto` — UsuarioCPFConvidado
- [ ] `convitegrupotarefa` — UsuarioCPFConvidado
- [ ] `grupoprojeto` — UsuarioCPFLider
- [ ] `grupotarefa` — UsuarioCPFLider (UNIQUE composta) — **já tem quebra conhecida, ver abaixo**
- [ ] `historicogrupoprojeto` — UsuarioCPFAtor (nota: `UsuarioCPFAlvo` existe mas NÃO tem FK — ver alerta)
- [ ] `historicogrupotarefa` — não apareceu na auditoria de FK real (provavelmente sem FK enforced em produção) — checar schema real antes de migrar
- [ ] `materiacustomizacao` — UsuarioCPF (UNIQUE composta)
- [ ] `materialdidatico` — CriadoPorCPF
- [ ] `materialdidaticopagina` — RevisadoPorCPF (nullable)
- [ ] `materiaxprofessorxturma` — UsuarioCPF (UNIQUE composta) — usada em `calendario.repository.ts` como bridge CPF (lado professor)
- [ ] `mensagem` — MensagemRemetenteCPF
- [ ] `mensagem_fixada` — FixadaPorCPF
- [ ] `mensagem_leitura` — UsuarioCPF (PK composta)
- [ ] `mensagem_reacao` — UsuarioCPF (PK composta)
- [ ] `projeto` — UsuarioCPFCriador — **já tem quebra conhecida, ver abaixo**
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
- `backend/services/grupotarefa.service.ts` (3 ocorrências de `matricula.UsuarioCPF`)
- `backend/services/professor.service.ts` (1 ocorrência: `findByCPF(matricula.UsuarioCPF)` → devia ser `findByGUID(matricula.UsuarioGUID)`)
- `backend/services/projeto.service.ts` (1 ocorrência, monta `cpfsUnicos` a partir de matrículas — considerar trocar pra usar `findUsuariosAtivosByEscolaEFuncoes`, que já retorna GUID, em vez de montar a lista manualmente)
- `backend/services/tarefaacademica.service.ts` (3 ocorrências, pelo menos uma alimenta `destinatarios` de notificação — CRÍTICO, fan-out quebrado ali)

**NÃO pegos pelo `tsc`** (fazem `SELECT UsuarioCPF FROM matricula WHERE ...` como SQL cru — string, o compilador não vê nada de errado, mas a coluna real vai virar `UsuarioGUID`; hoje ainda funciona pq o schema do banco não mudou, mas o array resultante já devia se chamar/tratar como GUID pra bater com `notificacao.disparar()`):
- `backend/services/conteudo.service.ts` (linha ~275, monta `destinatarios` pro fan-out de notificação)
- `backend/services/provaagendada.service.ts` (linha ~366, idem)

## ⚠️ Achado crítico #1: checagem de permissão é transversal, não por tabela

Os métodos de `EscolaxUsuarioxFuncaoDAO` (`findByTripla`, `isCoordOuDirecaoEmEscola`, `isProfessorOuDirecaoEmEscola`, `isCoordSecretariaOuDirecaoEmEscola`, `usuarioExists`, `findRepresentanteLegal`, `findUsuariosAtivosByEscolaEFuncoes`) já exigem `UsuarioGUID` desde que `escolaxusuarioxfuncao` foi migrada. Eles são chamados por services de QUALQUER tabela como checagem de "esse ator é Coordenação/Direção nesta escola" — é ortogonal à tabela que cada service gerencia. **TypeScript não pega esse erro** (os dois lados de uma comparação são `string`).

**Padrão de correção**, já aplicado várias vezes (`matricula.service.ts`, `curso.service.ts`, `escola.service.ts`, `aviso.service.ts`, `pendencia.service.ts`, `anotacao.service.ts`, `evento.service.ts`, `calendario.service.ts`): se o service SÓ usa a variável pra permissão+auditoria, é renomeação pura e segura (`usuarioCPF` → `usuarioGUID`, valor vem de `req.user.UsuarioGUID` no controller). Se o MESMO valor também é usado pra gravar/comparar em coluna CPF de tabela ainda não migrada, precisa resolver CPF↔GUID via `usuarioDAO` (ver `matricula.service.ts` com `conversa_grupo_membro`, `aviso.service.ts` com `anexo`, `calendario.service.ts` com `materiaxprofessorxturma`) — NUNCA assumir que é renomeação pura sem ler o arquivo inteiro primeiro.

**Services que ainda usam esses métodos e NÃO foram auditados/corrigidos:**
`anexo.service.ts`, `conversa-permissao.service.ts`, `escolaconfiguracao.service.ts`, `horarioturma.service.ts`, `materia.service.ts`, `materialdidatico.service.ts`, `professor.service.ts`, `projeto.service.ts`, `turma.service.ts` — e provavelmente outros dentro das tabelas ainda não tocadas (`tarefaacademica`, `categoriaconteudo`, `conversa`, `grupoprojeto`, `grupotarefa`, `convite*`, etc.) — qualquer service com um método tipo `validarPermissaoEscrita`/`validarAcesso` é suspeito até ser lido.

## ⚠️ Achado crítico #2: fan-out de notificação

`notificacao` + `usuarionotificacaopreferencia` foram migradas, então `getNotificacaoService().disparar()` exige `destinatarios: UsuarioGUID[]`. Isso é definitivo, não vai mudar — mas todo service que monta esse array precisa ser conferido individualmente:
- ✅ Corretos: `matricula.service.ts`, `aviso.service.ts`, `notificacao.scheduler.ts`, `evento.service.ts`, `pendencia.service.ts`.
- ❌ Ainda quebrados (montam `destinatarios` a partir de CPF de `matricula`, que já é GUID): `projeto.service.ts` e `tarefaacademica.service.ts` (via entity — aparecem no tsc como erro de propriedade); `conteudo.service.ts` e `provaagendada.service.ts` (via SQL cru — **não aparecem no tsc**, ver seção "Quebras já existentes AGORA" acima pro detalhe). Em todos os quatro, depois de corrigir, confirme que o array final passado a `disparar()` é de GUIDs, não CPFs.

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
