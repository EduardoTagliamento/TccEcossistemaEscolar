# Planejamento: Login Individual por Escola

**Data:** 14 de Setembro de 2026
**Status:** Planejado — decisões de negócio da §1 validadas em 14/09/2026, pronto para detalhamento técnico/implementação
**Escopo:** Dar a cada escola um link de login próprio (`/login/[slug]`), com a marca visual da escola (cores + ícone) em vez da marca genérica "Bauá", permitindo login por CPF, e-mail, telefone **ou** um identificador de matrícula editável pela escola — sem substituir o login geral multi-escola que já existe hoje.

---

## 0. Resumo executivo

Hoje existe **um único fluxo de login** (`/login`), com a marca "Bauá" (`AuthBrandShell` + `BauaLogo`), aceitando CPF/e-mail/telefone. Depois de autenticado, o usuário sempre cai em `/selecionar-escola`, mesmo que só tenha acesso a uma escola. Não há nenhum conceito de "link da escola", nem endpoint público que exponha branding de escola sem autenticação.

O pedido é aditivo: criar uma segunda porta de entrada, `/login/[slug-da-escola]`, com a cor/ícone daquela escola aplicados na tela, e um campo extra de identificador ("Matrícula, CPF, e-mail ou telefone") — pensado principalmente para o caso do aluno/responsável, que muitas vezes não decora CPF mas sabe o número de matrícula que a secretaria imprimiu no crachá/boletim.

Isso implica três blocos de trabalho, em ordem de dependência:

1. **Escola ganha um slug** (identificador de URL, editável) + um endpoint público que resolve `slug → branding` (só cor/ícone/nome, nada sensível).
2. **Matrícula ganha um identificador editável, separado da chave (`MatriculaGUID`)** — por padrão uma cópia do GUID no momento da criação, mas que a secretaria pode trocar depois sem tocar na FK usada em todo o sistema acadêmico.
3. **Novo fluxo de login por escola** no frontend (`/login/[slug]`) + extensão de `AuthService.login`/`resolverUsuarioPorIdentificador` para também tentar resolver por identificador de matrícula, escopado à escola da URL.

As decisões de negócio que afetam o desenho do banco (unicidade do identificador de matrícula) e o fluxo pós-login (pular ou não `/selecionar-escola`) estão listadas na §1 e foram **validadas em 14/09/2026** — todas seguindo a recomendação original desta spec.

---

## 1. Decisões de negócio — validadas em 14/09/2026

| # | Pergunta | Decisão |
|---|----------|---------|
| 1 | O identificador de matrícula (`MatriculaIdentificador`, nome provisório) é único **globalmente** ou **por escola**? | **Por escola** (`UNIQUE (EscolaGUID, MatriculaIdentificador)`). Cada escola numera do seu jeito; exigir unicidade global impediria duas escolas de usarem "1", "2", "3"... — padrão comum de RA. Ver §3.2 para a dificuldade de derivar `EscolaGUID` a partir de `Matricula` (hoje ela só tem `TurmaGUID`/`GrupoEletivoGUID`, não `EscolaGUID` direto). |
| 2 | Login por matrícula, depois de autenticado, pula `/selecionar-escola` sempre ou só quando o usuário tem acesso a exatamente uma escola? | **Vai direto para `/dashboard/[escolaGUID]` da escola do link, sempre** — é o comportamento que faz sentido para o caso de uso ("aluno entrou pelo link da escola dele"), mesmo que o mesmo `Usuario` tenha acesso a outra escola também (ex.: irmão em outra unidade, ou professor em duas escolas). |
| 3 | Quem pode editar o identificador de matrícula? | **Secretaria, Coordenação ou Direção** — mesmo padrão de `EscolaxUsuarioxFuncaoDAO.isCoordSecretariaOuDirecaoEmEscola` já usado em `matricula.service.ts` para outras operações de matrícula (transferência, cancelamento). Diferente das operações "sensíveis de Escola" (`transferir-direcao`, `solicitar-exclusao`), que são restritas só à Direção — editar o identificador de acesso de um aluno é operação de secretaria do dia a dia, não uma decisão institucional. |
| 4 | Quem pode editar o slug da escola (`EscolaSlug`, nome provisório)? | **Só Direção** — mesmo grupo que hoje edita a "Identidade da Escola" (cores/ícone) em `frontend/app/dashboard/[escolaGUID]/configuracoes/page.tsx` (`isDirecao`, checado via `FuncaoId` 6). O slug é branding público-facing, mesma categoria de decisão que cor/logo. |
| 5 | Nome definitivo dos campos novos | **`EscolaSlug` (Escola) e `MatriculaIdentificador` (Matricula)** — confirmados como nomes definitivos. |
| 6 | Formato aceito do slug | **`^[a-z0-9]+(-[a-z0-9]+)*$`, 3-60 caracteres**, gerado por slugify de `EscolaNome` na criação (ex.: "Colégio São José" → `colegio-sao-jose`), editável depois. Em conflito, sufixo numérico incremental (`colegio-sao-jose-2`) — sem biblioteca nova. |
| 7 | Formato aceito do identificador de matrícula | **Sem regex fixa** (a escola pode usar RA numérico, alfanumérico, etc.) — só limite de tamanho (mesmo teto do `MatriculaGUID`, 1-36 caracteres) e a unicidade da decisão #1. Diferente do slug, não precisa ser URL-safe (não vai para a URL). |

Todas as 7 decisões seguiram a recomendação original desta spec, sem alteração. O restante do documento (§2 em diante) já assumia essas recomendações — nenhuma mudança de conteúdo é necessária além desta seção, só a confirmação formal.

---

## 2. Estado atual do código (relevante para esta feature)

### 2.1 Login hoje é único e global

- `backend/services/auth.service.ts` — `AuthService.login({identifier, senha, lembrar})` (linhas 102-186). `resolverUsuarioPorIdentificador()` (linhas 52-74) tenta e-mail (se contém `@`), senão CPF, com fallback para telefone (CPF e telefone têm ambos 11 dígitos limpos, daí a ambiguidade). Não há hoje nenhuma tentativa de resolver por matrícula.
- `backend/controllers/auth.controller.ts` — `login()` (linhas 29-65): valida `identifier`/`senha` obrigatórios e `senha.length >= 6` antes de chamar o service. Retorna `200` com `{success, message, data: {token, usuario}}`.
- `routes/auth.routes.ts` — `POST /api/auth/login` só com `authRateLimitMiddleware` (`backend/middlewares/rate-limit.middleware.ts:20-29`, 20 tentativas / 15 min) — sem `AuthMiddleware.authenticate`, é rota pública, como esperado.
- `frontend/app/login/page.tsx` — página única, campo "CPF, e-mail ou telefone" com `detectIdentifierType()` (linhas 83-103) fazendo detecção client-side (não decide o back, só ajusta placeholder/máscara). Usa `AuthBrandShell` (marca "Bauá") + `BauaLogo`. Após `login()`, sempre `router.push('/selecionar-escola')` (linha 168).
- `frontend/components/auth/AuthBrandShell.tsx` — shell "split" (painel de marca + formulário). **Hoje não aceita nenhuma prop de cor/ícone/nome customizados** — o painel de marca (`brandPanel`, `brandWordmark`, `brandBird`) é fixo via CSS/classes do módulo (`AuthBrandShell.module.css`), com o wordmark "bauá" hardcoded na linha 27. Props atuais: `children`, `formMaxWidth`, `className`, `invertido`. Vai precisar de props novas (cores, ícone, nome) para virar tema-por-escola — não é só passar dados, é extensão de componente.

### 2.2 Multi-escola já existe, mas via `/selecionar-escola`

- `frontend/app/selecionar-escola/page.tsx` — busca `GET /api/usuario/:UsuarioGUID/escolas` (rota em `routes/usuario.routes.ts:95-100`), lista as escolas com função ativa do usuário (`EscolaComFuncoes[]`), cada card já lê `EscolaCorPriEs/PriCl/SecEs/SecCl` e `EscolaIcone`/`EscolaLogo` (interface `Escola`, linhas 42-54) para customizar visual do card — ou seja, **o padrão de "pintar algo com a cor da escola" já existe no frontend**, só que depois do login, não antes.
- `backend/repositories/usuarioxescolaacesso.repository.ts` (linhas 29, 43, 55) — tabela `usuarioxescolaacesso` só registra `UltimoAcessoEm` por par usuário+escola; **não é o mecanismo de permissão**. Permissão de fato é `escolaxusuarioxfuncao` (`EscolaxUsuarioxFuncaoDAO`).
- `EscolaxUsuarioxFuncaoDAO.isCoordSecretariaOuDirecaoEmEscola` (`backend/repositories/escolaxusuarioxfuncao.repository.ts:397`) — já usado em `matricula.service.ts` para autorizar operações de secretaria sobre matrícula; é o método a reaproveitar para a decisão #3 da §1.

### 2.3 Escola já tem branding, mas nenhum campo de slug/link público

- `backend/entities/escola.model.ts` — `EscolaCorPriEs/PriCl/SecEs/SecCl` (HEX 6 chars sem `#`, `validateHex()` linhas 313-332), `EscolaIcone` (`Buffer`), `EscolaLogo` (string, path — comentário em `frontend/app/selecionar-escola/page.tsx:50` diz que hoje é campo legado "nunca populado em nenhum fluxo real"). **Não existe `EscolaSlug` nem equivalente** — confirmado por grep em `backend/` inteiro.
- `backend/schemas/escola.schema.ts` — `EscolaCreateBodySchema`/`EscolaUpdateBodySchema` (Zod, `.passthrough()`), com `prepararEscola()` fazendo normalização de payload (mapeia aliases legados `EscolaCor1..4`, formata CNPJ/telefone, tira `#` de cor) **antes** da validação de campo — mesmo padrão a seguir para normalizar o slug (lowercase, trim, etc.) antes de validar.
- `routes/escola.routes.ts` — **toda** rota de escola (`GET /`, `GET /:EscolaGUID`, `POST /`, `PUT /:EscolaGUID`, `/transferir-direcao`, `/solicitar-exclusao`, `/confirmar-exclusao`) passa por `AuthMiddleware.authenticate` (linhas 27-85). **Não há hoje nenhum endpoint público de Escola** — confirma o gap: a tela `/login/[slug]` precisa de dados de branding *antes* do usuário ter um token.
- Tela onde a Direção edita cor/ícone hoje: `frontend/app/dashboard/[escolaGUID]/configuracoes/page.tsx`, seção "Identidade da Escola" (linhas 47-60), com `isDirecao` calculado por `FuncaoId 6` via `GET /api/usuario/:UsuarioGUID/escolas` (linhas 107-121) — é aqui que o campo de slug (+ botão "copiar link") deveria entrar, na mesma seção, mesmo padrão de permissão.
- Tela de criação de escola: `frontend/app/criar-escola/page.tsx` — já captura nome, e-mail, 4 cores, logo. Precisaria gerar o slug automaticamente aqui (decisão #6 da §1), sem exigir que quem cria a escola pense em URL nesse momento.

### 2.4 Matrícula já tem um padrão parecido no GUID, mas o pedido é um campo novo

- `backend/entities/matricula.model.ts` — `MatriculaGUID` (linhas 69-78) já aceita "1 a 36 caracteres", ou seja, a escola já pode ter atribuído um RA customizado direto na PK. O pedido do usuário é deliberadamente diferente: um campo **não-chave**, com valor padrão = cópia do `MatriculaGUID` na criação, mas editável depois **sem** afetar o GUID usado em FKs (`tarefaacademica_matricula`, `conteudoprogresso`, `materiaxprofessorxturma` etc. — ver `docs/PLANO_IMPLEMENTACAO_GRUPO_ELETIVO.md` §2 para o contexto de por que essas tabelas são sensíveis a mudança de `MatriculaGUID`).
- **Nota sobre schema desatualizado:** `backend/database/sql.txt` (linhas 243-262) ainda mostra `matricula.UsuarioCPF` e `TurmaGUID NOT NULL`, sem `GrupoEletivoGUID` — isso está **defasado**. O estado real (confirmado em `backend/entities/matricula.model.ts` linhas 17-27 e `backend/repositories/matricula.repository.ts` linhas 8-29, 49-60) já usa `UsuarioGUID`, `TurmaGUID` nullable e `GrupoEletivoGUID` (via migration `2026-08-18-grupo-eletivo.ts`, não refletida em `sql.txt`). **Esta spec usa o model/repository como fonte de verdade, não `sql.txt`** — mas vale registrar que `sql.txt` precisa de uma atualização geral (fora do escopo desta feature).
- `Matricula` **não tem `EscolaGUID` direto** — só chega à escola via `TurmaGUID → turma.EscolaGUID` (matrícula normal) ou via `GrupoEletivoGUID → grupoeletivo.EscolaGUID` (matrícula-sombra). Isso afeta a decisão #1 da §1: um índice único `(EscolaGUID, MatriculaIdentificador)` não pode ser uma constraint simples de coluna-a-coluna porque `EscolaGUID` não existe na tabela — teria que ser resolvido em código (verificação antes do `INSERT`/`UPDATE`, mesmo padrão de "sem constraint de banco" já usado para a regra "1 matrícula ativa por escola" em `matricula.service.ts`, citada em `docs/PLANO_IMPLEMENTACAO_GRUPO_ELETIVO.md` §3), **ou** a migration precisaria adicionar uma coluna `EscolaGUID` desnormalizada só para viabilizar o índice — ver proposta em §3.2.
- Migrations seguem dois padrões coexistentes: par `.sql` (documentação/rollback manual) + `.ts` (script idempotente que checa `INFORMATION_SCHEMA.COLUMNS` antes de alterar, ex. `backend/database/migrations/2026-07-14-add-tarefaprazodatamatricula.sql` + `.ts`). A migration desta feature deve seguir o mesmo par.

---

## 3. Modelo de dados novo/alterado

### 3.1 `escola` — coluna nova (`EscolaSlug`)

```sql
ALTER TABLE escola
  ADD COLUMN EscolaSlug VARCHAR(60) NULL AFTER EscolaNome,
  ADD UNIQUE INDEX idx_escola_slug (EscolaSlug);
```

- `NULL` permitido para não quebrar escolas já cadastradas antes da migration (precisam de um backfill — gerar slug a partir de `EscolaNome` para as existentes, ver §6 fase 1).
- Formato/geração: ver §1 decisão #6 (pendente de validação).
- Interface TypeScript (`backend/entities/escola.model.ts`): novo par getter/setter `EscolaSlug`, seguindo o padrão de `validateHex()`/`EscolaNome` — trim, regex, min/max, lançar `Error` descritivo se inválido.

### 3.2 `matricula` — coluna nova (`MatriculaIdentificador`)

```sql
ALTER TABLE matricula
  ADD COLUMN MatriculaIdentificador VARCHAR(36) NULL AFTER MatriculaGUID,
  ADD INDEX idx_matricula_identificador (MatriculaIdentificador);
```

- **Sem `UNIQUE` direto na coluna** — pela razão levantada em §2.4 (a tabela não tem `EscolaGUID`, então a unicidade por escola da decisão #1 não é uma constraint simples). Duas alternativas, ambas para validar com quem for implementar:
  - **(a) Verificação em código** (recomendado, consistente com o padrão já usado para "matrícula ativa única" em `matricula.service.ts`): antes de criar/editar, resolver a `EscolaGUID` da matrícula (via `TurmaGUID`/`GrupoEletivoGUID`) e fazer um `SELECT` que faz `JOIN turma`/`JOIN grupoeletivo` filtrando por essa escola + `MatriculaIdentificador`, rejeitando duplicata em código antes do `INSERT`/`UPDATE`.
  - **(b) Desnormalizar `EscolaGUID` na própria tabela `matricula`** (coluna nova, preenchida a partir de `turma.EscolaGUID`/`grupoeletivo.EscolaGUID` na criação) para poder usar `UNIQUE KEY (EscolaGUID, MatriculaIdentificador)` de verdade — mais robusto contra concorrência, mas é uma mudança de schema maior que esta feature não pediu; fica registrado aqui como opção, mas a recomendação inicial é (a), sem premiar arquitetura nova sem necessidade comprovada.
- Preenchimento automático: em `MatriculaService.criarMatricula()` (e no fluxo de matrícula em massa, se aplicável), se `MatriculaIdentificador` não vier no payload, copiar de `MatriculaGUID` recém-gerado.
- Interface TypeScript (`backend/entities/matricula.model.ts`): getter/setter novo, mesmo padrão de tamanho do `MatriculaGUID` (1-36 chars, `trim()`), **sem** a regra de UUID de 36 chars fixos que outros GUIDs do sistema exigem — decisão #7 da §1 recomenda sem regex fixa aqui.
- `backend/schemas/matricula.schema.ts` e `backend/repositories/matricula.repository.ts` precisam do campo novo em `create`/`update`/`fromDatabase`/`toJSON`, espelhando exatamente o que foi feito para `GrupoEletivoGUID` (mesmos arquivos, ver `matricula.repository.ts` linhas 8-29, 49-60).

---

## 4. Regras de negócio / fluxo

### 4.1 Endpoint público de branding por slug

Novo endpoint, **sem** `AuthMiddleware.authenticate` (única rota pública de Escola até hoje):

```
GET /api/escola/publico/slug/:EscolaSlug
```

- Monta uma rota separada das existentes em `routes/escola.routes.ts` (ou um router novo `escola-publico.routes.ts`, para deixar visualmente claro no código que essa rota não passa por auth — evita que alguém adicione `AuthMiddleware.authenticate` nela por hábito ao editar o arquivo depois).
- Resposta contém **só**: `EscolaGUID`, `EscolaSlug`, `EscolaNome`, `EscolaCorPriEs`, `EscolaCorPriCl`, `EscolaCorSecEs`, `EscolaCorSecCl`, `EscolaIcone` (base64, mesmo formato já serializado hoje em `/api/usuario/:UsuarioGUID/escolas`). **Nunca** `EscolaCNPJ`, `EscolaTelefone`, `EscolaEmail`, `EscolaEndereco`, `EscolaStatus` ou qualquer outro campo — são dados internos, sem motivo de estar numa rota sem autenticação.
- `404` com mensagem genérica se o slug não existir ou a escola estiver `EscolaStatus = 'Inativa'` (mesmo tratamento — não dar dica se o motivo foi "não existe" vs "está inativa", para não vazar informação a quem está testando slugs por força bruta).
- Sem rate limit específico nesta spec — recomendo reaproveitar `authRateLimitMiddleware` (`backend/middlewares/rate-limit.middleware.ts:20-29`) por estar na mesma superfície (rota pública de autenticação), mas isso é detalhe de implementação, não decisão de negócio.

### 4.2 Resolução de login por matrícula

`AuthService.resolverUsuarioPorIdentificador()` hoje resolve por `Usuario` (CPF/e-mail/telefone). Matrícula pertence a `Aluno` numa escola específica — login por matrícula só faz sentido sabendo a escola de antemão (a do slug da URL). Proposta:

1. `AuthController.login()` passa a aceitar um `EscolaGUID` opcional no corpo (resolvido no frontend a partir do slug antes de chamar `/api/auth/login` — ver §4.1). Quando ausente, comportamento **idêntico ao de hoje** (login geral, sem tentar matrícula).
2. Em `AuthService.login()`, se `EscolaGUID` for informado e o identificador não for reconhecido como e-mail (contém `@`) nem resolvido como CPF/telefone, tentar resolver como `MatriculaIdentificador` **escopado a essa `EscolaGUID`** (`MatriculaDAO` ganha um método novo, ex. `findUsuarioByIdentificadorEEscola(identificador, escolaGUID)`, fazendo o `JOIN` com `turma`/`grupoeletivo` descrito em §3.2).
3. Se achar a matrícula, resolve o `UsuarioGUID` dela e segue o fluxo normal — senha continua sendo a senha do `Usuario` (bcrypt em `usuario.UsuarioSenha`), **não existe senha por matrícula**.
4. Se **não** achar por nenhum dos quatro caminhos (e-mail, CPF, telefone, matrícula-na-escola), erro `401` igual ao de hoje (`"CPF, email, telefone ou senha incorretos"`) — mensagem deveria ganhar "matrícula" na lista, mas sem revelar qual dos quatro falhou (mesma politica de não vazar qual parte da credencial estava errada).

### 4.3 Pós-login vindo de `/login/[slug]`

Ver decisão #2 da §1 (recomendação: sempre pular `/selecionar-escola` e ir direto para `/dashboard/[escolaGUID]` da escola do link). Ponto de atenção que **é regra de negócio, não só UX**: antes de redirecionar, o frontend precisa confirmar que o `Usuario` autenticado de fato tem uma função ativa **nessa** `EscolaGUID` (`escolaxusuarioxfuncao` — mesma fonte que já alimenta `/selecionar-escola` via `GET /api/usuario/:UsuarioGUID/escolas`). Se não tiver, mostrar um erro específico (algo como "Sua conta não tem acesso a esta escola") — **não** um erro genérico de "matrícula/CPF incorreto", que confundiria o suporte (login funcionou, o problema é de permissão, não de credencial).

### 4.4 Login geral continua existindo

`/login` (sem slug) não muda em nada — continua aceitando CPF/e-mail/telefone, sem campo de matrícula (matrícula sem escola conhecida seria ambígua entre escolas, por causa da decisão #1), e continuando a cair em `/selecionar-escola`. A feature é aditiva.

---

## 5. API — novos endpoints (esboço)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/escola/publico/slug/:EscolaSlug` | Branding público da escola (sem auth) — nome, cores, ícone. Ver §4.1. |
| PUT | `/api/escola/:EscolaGUID` | *(já existe)* — passa a aceitar `EscolaSlug` no body, validado por `EscolaUpdateBodySchema`. Restrito a Direção no frontend (decisão #4). |
| PATCH | `/api/matricula/:MatriculaGUID/identificador` | Editar `MatriculaIdentificador` isoladamente (Secretaria/Coordenação/Direção — decisão #3). Endpoint dedicado em vez de reaproveitar um update genérico de matrícula, para deixar explícita a permissão diferenciada (matrícula em si tem outras regras de transição de status que não deveriam se misturar aqui). |
| POST | `/api/auth/login` | *(já existe)* — passa a aceitar `EscolaGUID` opcional no body. Ver §4.2. |

---

## 6. Fases de implementação sugeridas

1. **Schema + backend básico, sem UI:** migration de `EscolaSlug` (com backfill das escolas existentes) e `MatriculaIdentificador` (com backfill = cópia de `MatriculaGUID`); getters/setters nas entidades; `EscolaDAO.findBySlug`/`MatriculaDAO.findUsuarioByIdentificadorEEscola`; endpoint público `GET /api/escola/publico/slug/:EscolaSlug`. Validável por request manual/Postman, sem nenhuma tela nova ainda.
2. **Extensão do login:** `AuthService.login`/`resolverUsuarioPorIdentificador` aceitando `EscolaGUID` opcional + tentativa de matrícula (§4.2); `AuthController`/`routes/auth.routes.ts` repassando o campo novo. Endpoint `PATCH /api/matricula/:MatriculaGUID/identificador` com checagem de permissão (decisão #3).
3. **Configuração do slug pela escola:** campo `EscolaSlug` + botão "copiar link" na seção "Identidade da Escola" de `frontend/app/dashboard/[escolaGUID]/configuracoes/page.tsx`; geração automática de slug no fluxo de `frontend/app/criar-escola/page.tsx`.
4. **Extensão de `AuthBrandShell`:** props novas para cor primária/secundária/ícone/nome customizados, com fallback para a marca "Bauá" quando ausentes (usado por `/login` geral, que não muda).
5. **Nova rota `/login/[escolaSlug]`:** busca branding via endpoint público, aplica tema no `AuthBrandShell`, formulário com campo extra "Matrícula, CPF, e-mail ou telefone", lógica de pós-login descrita em §4.3 (redirecionamento direto + tratamento de erro de acesso).
6. **Tela de edição de `MatriculaIdentificador` para Secretaria/Coordenação:** provavelmente na tela onde a matrícula já é gerenciada hoje (Gestão de Dados → Matrículas/Alunos — a localizar no frontend na hora da implementação, fora do que foi investigado nesta spec).

---

## 7. Pontos ainda em aberto (assunções que adotei — revisar antes de codar)

- **Unicidade do `MatriculaIdentificador` por escola sem coluna `EscolaGUID` na tabela (§3.2):** assumi verificação em código (opção "a") em vez de desnormalizar `EscolaGUID` na tabela `matricula` (opção "b"). Isso é uma assunção técnica que precisa de "ok" — a opção (a) tem uma janela de corrida teórica (dois `INSERT`/`UPDATE` concorrentes com o mesmo identificador na mesma escola) que uma `UNIQUE KEY` de banco eliminaria de vez.
- **Formato do slug e do identificador de matrícula (§1, decisões #6 e #7):** assumi valores razoáveis (slug tipo `kebab-case`, identificador livre até 36 chars) só para poder desenhar a coluna/regex — nenhum dos dois foi validado com o responsável do produto.
- **Onde exatamente entra a edição de `MatriculaIdentificador` no frontend (fase 6, §6):** não localizei neste levantamento a tela atual de gestão de matrículas/alunos (só confirmei o backend em `matricula.repository.ts`/`matricula.service.ts`) — a localização exata da tela fica para investigação no início da implementação dessa fase.
- **Rate limit do endpoint público de branding (§4.1):** assumi reaproveitar `authRateLimitMiddleware` sem que isso tenha sido pedido — é uma extrapolação de segurança, não um requisito do usuário; pode ser revisado (ou nem ser necessário, se o endpoint só expuser dados não sensíveis mesmo sob enumeração de slugs).
- **Campo `EscolaGUID` no corpo de `POST /api/auth/login` (§4.2 item 1):** assumi que o frontend vai resolver o slug para `EscolaGUID` (via §4.1) e mandar esse `EscolaGUID` já resolvido no login, em vez de mandar o slug direto e o backend resolver de novo — evita um round-trip extra, mas nunca foi confirmado como preferência de design de API.
