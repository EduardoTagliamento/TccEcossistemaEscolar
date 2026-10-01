# Spec — Pré-cadastro para Feira Técnica (Colégio Univap)

## Contexto

O Bauá vai ser apresentado numa feira técnica do Colégio Univap. Objetivo: deixar o
terreno pronto pra qualquer aluno da escola conseguir ativar sua própria conta na hora,
na feira, sem precisar do fluxo de auto-cadastro genérico (`/cadastro`), que continua
existindo no código mas deixa de ser alcançável por qualquer botão da landing page.

## Dados reais confirmados (2026-10-01, consulta read-only)

- **EscolaGUID real/ativa:** `b67a6634-9afd-4fb3-8227-d2569a3db98c` ("Colégios UNIVAP -
  Centro", slug `colegios-univap`, `EscolaIsTecnica=1`). Existem 6 outras escolas com
  "Univap" no nome no banco — todas de teste/duplicadas, vazias ou quase vazias. **Nunca
  usar outro EscolaGUID além deste.**
- **Turmas já existentes:** 12 turmas, todas com `TurmaSerie="3"` e `TurmaNome` = letra
  única ("A".."L", sem prefixo de série no nome) — cobrem só o 3º ano. **1º e 2º ano
  ainda não têm nenhuma turma cadastrada** — precisam ser criadas a partir de
  `salas_reduzido.json` (campo `sala`, ex. "1A" → `TurmaSerie="1"`, `TurmaNome="A"`).
- **Cursos:** os 6 cursos do JSON (Eletrônica, Administração, Análises Clínicas,
  Publicidade, Química, Informática) já existem pra essa escola, com `CursoStatus='Ativo'`.
  No banco o nome vem em Title Case ("Eletrônica"), no JSON vem em CAIXA ALTA
  ("ELETRÔNICA") — toda comparação precisa ser case-insensitive.
- **Usuários que já existem:** Eduardo Tagliamento Barbosa, Henrique Cruz Dallatorre e
  Vithor Maximus Borges Queiroz já são contas reais e ativas (telefone e email
  preenchidos), já matriculados na turma 3H (Informática) — batendo exatamente com a
  entrada "3H" do JSON. **Essas contas nunca devem ser recriadas** — o pré-cadastro
  precisa resolver por nome exato e reusar o que já existe (mesmo padrão de
  `UsuarioService#resolverOuCriarUsuario`).
- **Tabela de associação Matéria↔Turma:** `materiaxprofessorxturma` (`TurmaGUID`
  nullable). "Turma sem matéria" = nenhuma linha ativa nessa tabela pra aquele
  `TurmaGUID`.
- **Restrição de schema:** `usuario.UsuarioSenha` é `NOT NULL` — todo pré-cadastro
  precisa de algum hash de senha desde já (descartável), mesmo sem telefone/email ainda.
  `UsuarioIsPlataformaAdmin` já existe (`tinyint`, default 0) — é o gate de
  `/admin-plataforma`.

## Decisões (confirmadas com o Eduardo)

1. **Landing page:** os dois botões que hoje apontam pra `/cadastro` ("Assinar" no menu
   e "Comece Gratuitamente" no CTA final) passam a apontar pra uma nova página
   intermediária (`/cadastro/escolha`, nome provisório) que diz: *"Pra cadastro de outras
   escolas, fale com a gente: 12 988493959"* + *"Já é aluno da Univap?"* → link pra tela
   nova de ativação. **Além disso**, um botão novo e direto **"Sou aluno da Univap"**
   entra na landing page apontando direto pra essa mesma tela de ativação (sem passar
   pela intermediária). `/cadastro` (o fluxo antigo) continua existindo no código, só
   não é mais alcançável por nenhum botão.
2. **Flag "turma sem matéria"** aparece pra **todo aluno da turma** (não só
   representante), avisando pra contatar o representante da turma.
3. **Seletor de Pessoa** (feira): quem já tem telefone/email preenchido aparece
   esmaecido **e bloqueado pra clique** (não dá pra reabrir/reativar pelo fluxo
   público).
4. **Tela exclusiva dos admins** = `/admin-plataforma` (gate `UsuarioIsPlataformaAdmin`,
   já existe com seções de Sugestões/Matérias Globais/Banco de Questões) — ganha uma
   seção nova "Registrar aluno — Colégio Univap", escopada só a essa escola.

## Plano técnico

### A. Migration de seed (`backend/database/migrations/2026-10-01-feira-tecnica-univap.ts`)
- Lê `F:\Area de Trabalho\feiratecnica\dados\salas_reduzido.json` (caminho fora do repo —
  o script embute os dados ou lê de um caminho relativo copiado pra dentro do projeto).
- Pra cada `sala` sem Turma correspondente (1º e 2º ano): cria `Turma` nova
  (`TurmaSerie`, `TurmaNome`=letra, `CursoGUID` resolvido por nome case-insensitive,
  `TurmaIsTecnico=true`, `TurmaStatus='Ativa'`).
- Pra cada aluno de cada sala: resolve por nome exato (case-insensitive, trim) contra
  `usuario` existente nessa escola; se achar, garante `Matricula` ativa pra turma certa
  (cria se não existir, sem duplicar); se não achar, cria `Usuario` "casca" (nome,
  GUID, senha hash descartável/aleatória, `UsuarioStatus='Ativo'`, telefone/email
  `NULL`) + `Matricula` ativa.
- Roda via `railway run` pelo próprio Eduardo (escrita em produção não passa por mim
  diretamente — ver [[mysql_agent_blocked_by_classifier]]).

### B. Backend — ativação pública
- `GET /api/feira-univap/turmas?ano=1|2|3` — lista turmas da escola fixa
  (`b67a6634-...`) por ano, com nome do curso.
- `GET /api/feira-univap/pessoas?turmaGUID=...` — lista alunos da turma via Matricula,
  cada um com `jaAtivada: boolean` (`UsuarioTelefone IS NOT NULL OR UsuarioEmail IS NOT NULL`).
- `POST /api/feira-univap/ativar` — recebe `UsuarioGUID` (tem que ser um dos
  pré-cadastrados, endpoint rejeita GUID não encontrado ou já ativado), `telefone`,
  `email` (opcional), `matricula` (vira `MatriculaIdentificador`). Preenche o usuário,
  **gera uma senha temporária nova agora** (não reusa a descartável do seed) e dispara
  por WhatsApp (`WhatsappCredenciaisService`, mesmo texto já usado) + email se informado
  (`EmailAlunoService`). Sem autenticação (rota pública), mas só aceita GUIDs que já
  existem e ainda não foram ativados — não cria conta nova por essa rota.

### C. Frontend — nova tela pública (`/cadastro/univap`, nome provisório)
Select Ano → Select Turma (mostra curso) → Select Pessoa (já ativada = esmaecida e
`disabled`) → campos Telefone/Email/Matrícula → botão "Cadastrar" → chama `ativar` →
tela de sucesso ("confira seu WhatsApp"). Aviso fixo no rodapé: *"Não achou seu nome?
Fale com a administração do Bauá: 12 988493959."*

### D. Landing page (`frontend/app/page.tsx`)
- Botão "Assinar" (nav) e "Comece Gratuitamente" (CTA) → `/cadastro/escolha`.
- Botão novo "Sou aluno da Univap" → `/cadastro/univap` direto.
- `/cadastro/escolha`: página simples com as duas mensagens (contato Bauá + link pra
  Univap).

### E. Admin (`frontend/app/admin-plataforma/page.tsx`)
Nova seção "Registrar aluno — Colégio Univap": dropdown de Turma (só
`b67a6634-...`, todas as séries) + formulário nome/email/telefone/matrícula,
reaproveitando `AlunoAPI.criarAluno` (mesmo endpoint que `gestao-dados/alunos` já usa).

### F. Flag "turma sem matéria" (`frontend/app/dashboard/[escolaGUID]/materias/page.tsx`)
Se a turma do aluno não tem nenhuma linha ativa em `materiaxprofessorxturma`, mostra
banner: *"Sua turma ainda não tem matérias cadastradas — peça pro representante da
turma avisar o Bauá: 12 988493959."*

## Riscos aceitos (não bloqueadores)
- Fluxo público não verifica que quem preenche o telefone é realmente aquela pessoa —
  mitigado só pelo contexto social da feira (alguém ao lado vendo). Sem verificação
  adicional por decisão implícita de escopo (feira, não produção aberta).
- Eduardo tem uma matrícula residual na escola de teste `92010765-...` — não mexer,
  fora de escopo.
