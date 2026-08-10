# Plano: trocar a PK de `usuario` de CPF para UsuarioGUID

**Status:** decisão registrada, migração ainda não iniciada.
**Motivação imediata:** abertura do piloto essa semana com uma pequena parcela de usuários dos quais não teremos CPF de todos. Como `UsuarioCPF` é hoje a PK da tabela `usuario`, não é possível cadastrar um usuário sem CPF (não dá para "deixar em branco" uma chave primária, e não dá para inventar um CPF só de mentirinha sem sujar um dado que em outros lugares do sistema é tratado como CPF real).

## 1. Problema, em duas partes

1. **Operacional (piloto desta semana):** PK não pode ser nula nem repetida. Sem CPF real, não há como cadastrar o usuário do jeito que o schema está hoje.
2. **LGPD (achado ao investigar o problema 1):** como CPF é a PK, ele vira FK em toda tabela relacionada e aparece literalmente na URL de várias rotas da API (`/api/usuario/:UsuarioCPF`, `/api/upload/foto-usuario/:UsuarioCPF`, `/api/materia/aluno/:usuarioCPF`, `/api/professor/:cpf/...`, `/api/verificacao-email/solicitar/:UsuarioCPF`, entre outras). Isso significa CPF em texto plano em logs de servidor, devtools do navegador, histórico de proxy/CDN — exposição de dado sensível que não deveria depender de "não printar em log", e sim de nunca precisar transitar pela URL.

As duas causas são a mesma: **CPF fazendo o papel de identificador técnico**, que é papel de uma chave surrogate, não de um dado de identificação civil.

## 2. Decisão proposta

- Nova PK: `UsuarioGUID` (segue o padrão já usado no resto do schema — `EscolaGUID`, `MateriaGUID`, `TurmaGUID` etc.).
- `UsuarioCPF` deixa de ser PK/FK. Vira coluna comum: `NULL` permitido, com `UNIQUE INDEX`. MySQL permite múltiplos `NULL` num índice único, então usuários de piloto sem CPF real ficam com o campo vazio sem violar unicidade.
- Todas as ~25 tabelas com FK para `usuario.UsuarioCPF` passam a referenciar `usuario.UsuarioGUID`.
- Toda rota que hoje usa `:UsuarioCPF`/`:cpf` na URL passa a usar `:UsuarioGUID`.
- JWT: o claim de identidade (`UsuarioCPF` no payload, ver `backend/utils/JwtService.ts` e `backend/services/auth.service.ts`) passa a ser `UsuarioGUID`.

### Formato do GUID

Já resolvido nesta sessão, independente da migração: a geração de UUID (`uuidv4()`, 36 caracteres com hífens) foi trocada por `gerarGUID()` (`backend/utils/helpers/guid.helper.ts`), que gera 12 caracteres em base64url a partir de bytes aleatórios criptográficos (72 bits de entropia — mais que suficiente para a escala do sistema). Cabe sem alteração nas colunas `CHAR(36)`/`VARCHAR(36)` já existentes, então **nenhuma migração de schema foi necessária pra isso**. Todos os ~70 pontos de geração de GUID no backend (services, repositories, 1 migration) foram atualizados para usar o novo helper. Quando `UsuarioGUID` for criado, deve usar o mesmo `gerarGUID()`.

## 3. Impacto no banco de dados

Tabelas com FK para `usuario.UsuarioCPF` (via `backend/database/sql.txt` + migrations em `backend/database/migrations/`):

| Tabela | Coluna FK | Origem |
|---|---|---|
| `verificacaoemail` | `UsuarioCPF` | sql.txt |
| `escolaxusuarioxfuncao` | `UsuarioCPF` | sql.txt |
| `matricula` | `UsuarioCPF` | sql.txt |
| `materiaxprofessorxturma` | `UsuarioCPF` | sql.txt |
| `conversaindividual` | `ConversaIndUsr1CPF`, `ConversaIndUsr2CPF` | sql.txt |
| `conversagrupomembro` | `MembroUsuarioCPF` | sql.txt / 2026-07-23-chat-melhorias.sql |
| `mensagem` | `MensagemRemetenteCPF` | sql.txt |
| `mensagemleitura` | `UsuarioCPF` | sql.txt |
| `mensagemfixada` | `FixadaPorCPF` | sql.txt |
| `mensagemreacao` | `UsuarioCPF` | sql.txt |
| `categoriaconteudo` | `UsuarioCPF` | 2026-07-15-add-conteudo.sql |
| `conteudo` | `UsuarioCPF` | 2026-07-15-add-conteudo.sql |
| `notificacao` | `UsuarioCPF` | 2026-07-17-notificacoes.sql |
| `usuarionotificacaopreferencia` | `UsuarioCPF` | 2026-07-17-notificacoes.sql |
| `projeto` / `grupoprojeto` / `usuarioxgrupoprojeto` / `historicogrupoprojeto` | `UsuarioCPF` | 2026-07-19-add-projetos.sql |
| `registroauditoria` | `UsuarioCPFAtor` | 2026-07-21-add-registro-auditoria.sql |
| `usuarioxescolaacesso` | `UsuarioCPF` | 2026-07-21-add-registro-auditoria.sql |
| `materiacustomizacao` | `UsuarioCPF` | 2026-07-24-materias-modulo.sql |
| `tarefaacademicamatricula` | `TarefaAvaliadoPorCPF` | 2026-07-24-materias-modulo.sql |
| `tarefaacademicaresposta` | `RespostaAvaliadoPorCPF` | 2026-07-29-add-tarefa-lista.sql |
| `materialdidatico` | `CriadoPorCPF` | 2026-08-03-recomendacao-estudos-ia-fase3.sql |
| `materialdidaticopagina` | `RevisadoPorCPF` | 2026-08-03-recomendacao-estudos-ia-fase3.sql |
| `questaobanco` | `CriadoPorCPF` | 2026-08-03-recomendacao-estudos-ia-fase3.sql |
| `redefinicaosenha` | `UsuarioCPF` | 2026-08-04-redefinicao-senha.sql |
| `avisoxusuario` / `aviso` | `UsuarioCPF` | 2026-08-09-aviso.sql |
| `sugestao` | `UsuarioCPF` | 2026-08-09-sugestao.sql |
| `anotacao` | `UsuarioCPF` | create-anotacao-*.sql |

## 4. Superfície de URL hoje exposta com CPF (o achado de LGPD)

Rotas que recebem CPF como parâmetro de caminho (`routes/*.ts`):

- `PUT/DELETE /api/usuario/:UsuarioCPF`
- `PATCH /api/usuario/:UsuarioCPF/senha`
- `GET /api/usuario/:UsuarioCPF/escolas`
- `POST /api/usuario/:UsuarioCPF/escolas/:EscolaGUID/acesso`
- `GET /api/usuario/:UsuarioCPF`
- `POST/DELETE /api/upload/foto-usuario/:UsuarioCPF`
- `POST /api/verificacao-email/solicitar/:UsuarioCPF`
- `POST /api/verificacao-email/reenviar/:UsuarioCPF`
- `GET /api/materia/aluno/:usuarioCPF`
- `GET /api/professor/:cpf/escolas/:escolaGUID/alocacoes`
- `DELETE /api/grupoprojeto/:grupoGUID/membros/:cpf`
- `DELETE /api/grupotarefa/:grupoGUID/membros/:cpf`
- `DELETE /api/conversa/:guid/permissao/vice-representante/:cpf`

Trocar a PK resolve isso de graça: essas rotas passam a usar `:UsuarioGUID`, que não é dado pessoal sensível.

## 5. Inventário completo de arquivos afetados

Levantado via busca por `UsuarioCPF` em todo o repositório (fora `node_modules`/`.next`). **247 arquivos de código** tocam o identificador hoje — o que por si só indica que essa não é uma troca pontual.

### Backend — entities (28)
`anexo.model.ts`, `anotacao.model.ts`, `aviso.model.ts`, `categoriaconteudo.model.ts`, `conteudo.model.ts`, `conversa-grupo-membro.model.ts`, `convitegrupoprojeto.model.ts`, `convitegrupotarefa.model.ts`, `escolaxusuarioxfuncao.model.ts`, `evento.model.ts`, `grupoprojeto.model.ts`, `grupotarefa.model.ts`, `historicogrupoprojeto.model.ts`, `historicogrupotarefa.model.ts`, `materiacustomizacao.model.ts`, `materiaxprofessorxturma.model.ts`, `matricula.model.ts`, `notificacao.model.ts`, `pendencia.model.ts`, `projeto.model.ts`, `redefinicao-senha.model.ts`, `registroauditoria.model.ts`, `sugestao.model.ts`, `usuario.model.ts`, `usuarionotificacaopreferencia.model.ts`, `usuarioxgrupoprojeto.model.ts`, `usuarioxgrupotarefa.model.ts`, `verificacao-email.model.ts`

### Backend — repositories (37)
`anexo`, `anotacao`, `aviso`, `calendario`, `categoriaconteudo`, `conteudo`, `conversa-grupo`, `conversa-individual`, `conversa`, `convitegrupoprojeto`, `convitegrupotarefa`, `escolaxusuarioxfuncao`, `evento`, `grupoprojeto`, `grupotarefa`, `historicogrupoprojeto`, `historicogrupotarefa`, `horarioturma`, `materiacustomizacao`, `materiaxprofessorxturma`, `matricula`, `mensagem`, `notificacao`, `pendencia`, `projeto`, `redefinicao-senha`, `registroauditoria`, `relacaoanexos`, `sugestao`, `tarefaacademica-matricula`, `tarefaacademica-resposta`, `usuario`, `usuarionotificacaopreferencia`, `usuarioxescolaacesso`, `usuarioxgrupoprojeto`, `usuarioxgrupotarefa`, `verificacao-email` (todos `*.repository.ts`)

### Backend — services (39)
`anexo`, `anotacao`, `auditoria`, `auth`, `aviso`, `calendario`, `categoriaconteudo`, `conteudo`, `conversa-grupo`, `conversa-permissao`, `conversa`, `convitegrupoprojeto`, `convitegrupotarefa`, `curso`, `escola`, `escolaconfiguracao`, `escolaxusuarioxfuncao`, `evento`, `grupoprojeto`, `grupotarefa`, `horarioturma`, `materia`, `materiacustomizacao`, `matricula`, `mensagem`, `notificacao.scheduler`, `notificacao`, `pendencia`, `professor`, `projeto`, `provaagendada`, `redefinicao-senha`, `relacaoanexos`, `sugestao`, `tarefaacademica`, `tarefaacademicanota.scheduler`, `turma`, `upload`, `usuario`, `verificacao-email` (todos `*.service.ts`)

**Destaque crítico:** `auth.service.ts` e `backend/utils/JwtService.ts` — o CPF é hoje o claim de identidade dentro do JWT. Trocar isso afeta toda sessão ativa (tokens antigos com `UsuarioCPF` deixam de bater com o formato novo — precisa de estratégia de expiração/relogin, ver seção 7).

### Backend — controllers (35)
`anexo`, `anotacao`, `assunto`, `auditoria`, `aviso`, `calendario`, `categoriaconteudo`, `conteudo`, `conteudoprogresso`, `conversa`, `convitegrupoprojeto`, `convitegrupotarefa`, `curso`, `escola`, `escolaconfiguracao`, `escolaxusuarioxfuncao`, `evento`, `grupoprojeto`, `grupotarefa`, `horarioturma`, `materia`, `materiacustomizacao`, `materialdidatico`, `matricula`, `notificacao`, `pendencia`, `professor`, `projeto`, `provaagendada`, `questaobanco`, `sugestao`, `tarefaacademica`, `turma`, `upload`, `usuario`, `verificacao-email` (todos `*.controller.ts`)

### Backend — schemas Zod (11)
`anexo`, `conversa`, `convitegrupoprojeto`, `convitegrupotarefa`, `escolaxusuarioxfuncao`, `grupoprojeto`, `matricula`, `pendencia`, `professor`, `usuario`, `verificacaoEmail` (todos `*.schema.ts`)

### Backend — middlewares / guards (7)
`auth.middleware.ts`, `conversa.middleware.ts`, `convitegrupotarefa.middleware.ts`, `request-logger.middleware.ts`, `usuario.middleware.ts`, `verificacao-email.middleware.ts`, `guards/plataformaAdmin.guard.ts`

### Backend — websocket (2)
`websocket/SocketServer.ts`, `websocket/conversa.handler.ts` — identificação de usuário conectado por CPF (salas/rooms do socket.io).

### Backend — rotas (7, ver lista detalhada na seção 4)
`routes/materia.routes.ts`, `routes/matricula.routes.ts`, `routes/professor.routes.ts`, `routes/tarefaacademica.routes.ts`, `routes/upload.routes.ts`, `routes/usuario.routes.ts`, `routes/verificacao-email.routes.ts` — mais `routes/conversa.routes.ts`, `routes/grupoprojeto.routes.ts`, `routes/grupotarefa.routes.ts` (usam `:cpf` no path).

### Backend — outros
`backend/Server.ts`, `backend/utils/JwtService.ts`

### Backend — migrations (23 arquivos)
Todo o histórico de `backend/database/migrations/*.sql` e `*.ts` que criou FK para `usuario` (listados na tabela da seção 3). Não precisam ser editados — ficam como registro histórico —, mas a migração nova precisa ser escrita em cima desse estado final.

### Frontend — API clients (19)
`frontend/lib/api/`: `aluno`, `anexo`, `auditoria`, `aviso`, `categoriaconteudo`, `conteudo`, `conversa`, `convitegrupoprojeto`, `convitegrupotarefa`, `escolaxusuarioxfuncao`, `grupoprojeto`, `horarioturma`, `materiasmodulo`, `notificacao`, `pendencia`, `professor`, `sugestao`, `upload`, `usuario` (todos `*.api.ts`) + `frontend/lib/auth/AuthContext.tsx` (sessão guarda CPF do usuário logado).

### Frontend — páginas e componentes (30)
`frontend/app/admin-plataforma/page.tsx`, `frontend/app/cadastro/page.tsx`, `frontend/app/selecionar-escola/page.tsx`, `frontend/app/dashboard/[escolaGUID]/page.tsx`, `.../_components/DashboardNavbar.tsx`, `.../_components/MinimizedChatBubble.tsx`, `.../auditoria/page.tsx`, `.../cadastro-pendencia/page.tsx`, `.../cadastro/ConteudoForm.tsx`, `.../chat/GerenciarGrupoModal.tsx`, `.../chat/NovaConversaModal.tsx`, `.../chat/page.tsx`, `.../configuracoes/page.tsx`, `.../gestao-dados/alunos/page.tsx`, `.../gestao-dados/avisos/page.tsx`, `.../gestao-dados/coordenacao/page.tsx`, `.../gestao-dados/page.tsx`, `.../gestao-dados/professores/page.tsx`, `.../gestao-dados/secretaria/page.tsx`, `.../materias/[materiaGUID]/turmas/[turmaGUID]/page.tsx`, `.../materias/page.tsx`, `.../pendencias/[pendenciaGUID]/page.tsx`, `.../perfil/page.tsx`, `.../projetos/[projetoGUID]/grupos/[grupoGUID]/page.tsx`, `.../projetos/[projetoGUID]/page.tsx`, `.../projetos/page.tsx`, `.../tarefas/[tarefaGUID]/page.tsx` + `frontend/components/ConviteGrupoModal.tsx`, `SolicitarEntradaModal.tsx`, `TransferirLiderancaModal.tsx`

### Frontend — types (4)
`frontend/types/anotacao.ts`, `convitegrupotarefa.ts`, `grupotarefa.ts`, `projeto.ts`

### Docs (referência, não código)
Praticamente todo `docs/routes/*.md` (documentação Swagger-like das rotas que hoje usam CPF) e boa parte dos `docs/PLANO_*` / `docs/SPEC_*` — precisam de atualização depois da migração, não antes. Não listados individualmente aqui por não afetarem comportamento.

## 6. O que NÃO está no escopo desta troca

- Não muda a validação/formato de CPF (`backend/utils/helpers/cpf.helper.ts`) — continua igual, só passa a ser opcional.
- Não exige alterar tamanho de colunas GUID (`CHAR(36)`/`VARCHAR(36)`) — o novo `gerarGUID()` de 12 caracteres cabe sem mudança de schema.
- Não afeta a tabela `escola` nem outras entidades que já usam GUID como PK — o padrão delas está correto e é o que estamos replicando pra `usuario`.

## 7. Riscos principais

1. **Sessões ativas / JWT:** trocar o claim de `UsuarioCPF` para `UsuarioGUID` invalida tokens emitidos antes da migração. Precisa de deploy coordenado com "todo mundo desloga" ou um período de transição aceitando os dois formatos de claim.
2. **~25 FKs em cascata:** a ordem de migração do schema importa (criar `UsuarioGUID`, backfillar, criar novas FKs, só depois dropar as antigas). Rollback fica caro depois que as FKs antigas são removidas.
3. **247 arquivos de aplicação:** risco de esquecer um ponto de leitura/escrita por CPF durante a transição (ex.: uma query que ainda filtra por `UsuarioCPF` num repository não migrado). Sugestão: migrar por camada (schema → entities/schemas → repositories → services → controllers/middlewares/websocket → routes → frontend), com o app quebrando em build/typecheck a cada camada não migrada — isso ajuda a não esquecer nada, já que TypeScript vai reclamar de `UsuarioCPF` inexistente onde o tipo mudar primeiro.
4. **WebSocket (`conversa.handler.ts`, `SocketServer.ts`):** salas do socket.io hoje são nomeadas/identificadas por CPF — precisa mapear para GUID sem quebrar conexões em produção durante o deploy.

## 8. Recomendação de sequenciamento

Dado o tamanho do escopo (247 arquivos, ~25 FKs, claim de JWT), **não é uma migração para fazer sob pressão antes do piloto desta semana**. Duas frentes independentes:

- **Curto prazo (piloto desta semana):** se for inevitável cadastrar usuários de piloto sem CPF real antes da migração completa, a opção menos arriscada é um paliativo explícito e temporário — não recomendado como solução definitiva, só para não bloquear o piloto — e não deve ser feito sem alinhar com você antes, dado que mexe em dado de produção.
- **Médio prazo (pós-piloto):** executar este plano por camadas, na ordem da seção 7, com o typecheck do TypeScript como rede de segurança a cada camada.

Este documento cobre o inventário e a decisão de design; a execução da migração (schema + código) ainda não foi iniciada e deve ser tratada como projeto à parte.
