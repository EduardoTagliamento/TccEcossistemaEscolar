# Planejamento: Lançamento de Prova/Tarefa/Conteúdo por Representante (temporário)

**Data:** 27 de Setembro de 2026
**Status:** Planejado (spec) — não implementado
**Escopo:** Permitir que o Representante/Vice-Representante de uma turma crie Prova, Tarefa e Conteúdo "em nome" do professor responsável, propagando via IA do WhatsApp aos representantes de turmas irmãs (mesmo professor + mesma matéria + mesma série/ano) para confirmação individual — capacidade **temporária**, atrás de 1 flag por escola, enquanto o sistema não está sendo populado pelos próprios professores.

---

## 0. Resumo executivo

Hoje só o professor (dono da `Categoria de Conteúdo` e da alocação `MateriaxProfessorxTurma`) cria Prova, Tarefa e Conteúdo. Como a adoção inicial está sendo feita por representantes de turma (o usuário será representante do 3H), este documento especifica uma permissão temporária: o Representante/Vice-Representante de uma turma pode criar esses três tipos de lançamento **em nome do professor** responsável por aquela matéria. Ao criar, o sistema identifica automaticamente as outras turmas que têm o **mesmo professor + mesma matéria + mesma série/ano** e usa a IA do WhatsApp para perguntar ao(s) representante(s) de cada uma delas se querem o mesmo lançamento — com confirmação individual por turma, sem prazo de expiração.

A entidade criada **nunca muda de autor**: o `UsuarioGUID` gravado continua sendo o do professor (preserva toda a lógica de permissão/autoria já existente). A autoria real fica registrada à parte, num campo novo (`CriadoPorRepresentanteUsuarioGUID`), e é sempre exibida na interface — nunca escondida.

---

## 1. Decisões de negócio já validadas

| # | Pergunta | Decisão |
|---|----------|---------|
| 1 | Timeout de confirmação no WhatsApp? | **Não existe.** Se o representante da turma irmã nunca responder, a propagação fica `Pendente` indefinidamente e nada é criado para aquela turma. |
| 2 | Data/horário são clonados junto com o conteúdo ao confirmar "sim"? | **Nenhum dos três precisa perguntar data no WhatsApp, mas por motivos diferentes.** **Prova e Tarefa** têm prazo de verdade e já decidem, na criação, entre **específico** (data fixa, digitada) ou **automático pelo cronograma** ("variável" — reaproveita `HorarioTurmaService.calcularDatas`, já usada hoje em `ProvaAgendadaForm.tsx`/`TarefaForm.tsx`). Específico → propagação clona a data literal, sem calcular nada. Automático → propagação chama `calcularDatas` de novo, trocando só o `TurmaGUID` pela turma destino, mesma `SemanaBase`/`DiaSemana` da origem. **Conteúdo é diferente: não tem prazo, é publicado de imediato** — ao confirmar, simplesmente lança pra aquela turma na hora da confirmação, sem cálculo de cronograma nenhum (ver §2.2). |
| 3 | Vice-Representante tem o mesmo poder que o Representante titular? | **Sim**, mesmo poder — reaproveita o helper que já existe hoje (`resolverPermissaoChat`, `permissao-granular.helper.ts:40-49`), que já trata os dois como equivalentes para permissões de turma. |
| 4 | Flag por escola inteira ou por turma? | **Por escola inteira.** Um toggle só, mais simples de ligar e principalmente de desligar de vez quando os professores assumirem. |
| 5 | Escopo desta spec: só Prova, ou Prova+Tarefa+Conteúdo? | **Os três juntos.** Achado técnico relevante (ver §2): Prova e Conteúdo já suportam múltiplas turmas numa mesma entidade nativamente; Tarefa é 1 registro por turma e precisa de um caminho de propagação diferente (cria entidade nova por turma, não "anexa"). |

---

## 2. Achados técnicos

### 2.1 Prova e Conteúdo já são multi-turma; Tarefa não

Muda o desenho de "propagação" caso a caso:

- **`ProvaAgendada`** (`backend/services/provaagendada.service.ts`): `ProvaAgendadaCreateDTO.TurmasGUID: string[]` — uma única prova já pode ser atribuída a várias turmas de uma vez, com `DatasPorTurma?: Record<string, Date>` para agendamento automático por turma (linha 71-72). **Confirmar "sim" numa propagação = adicionar a `TurmaDestinoGUID` no `TurmasGUID` da MESMA `ProvaAgendada` de origem**, não criar uma prova nova.
- **`Conteudo`** (`backend/services/conteudo.service.ts`): mesmo padrão — `ConteudoCreateDTO.DatasPorTurma?: Record<string, Date>` (linha 77), multi-turma nativo. Mesma lógica de "anexar turma à entidade existente" se aplica.
- **`TarefaAcademica`** (`backend/services/tarefaacademica.service.ts`): `TarefaAcademicaCreateDTO.matXprofXturxescGUID` — **um registro por turma** (a alocação já amarra a uma única turma), sem suporte nativo a múltiplas turmas na mesma entidade (existe `TarefaAcademicaBatchCreateDTO`, mas é criação em lote de registros separados, não uma entidade compartilhada). **Confirmar "sim" numa propagação de Tarefa = criar uma NOVA `TarefaAcademica`** para aquela turma, com o mesmo conteúdo/prazo (calculado, ver §2.2).

### 2.2 A função de cálculo automático de data já existe e já é genérica — só falta persistir o "modo" usado (vale só para Prova e Tarefa)

`HorarioTurmaService.calcularDatas(materiaGUID, escolhas)` (`backend/services/horarioturma.service.ts:169`) **já existe hoje** e seu próprio comentário no código diz: *"Usado pelo 'definir automaticamente' de Prova/Tarefa"*. Confirmado em uso real no frontend: `ProvaAgendadaForm.tsx` e `TarefaForm.tsx` já têm a seção "Definir prazo/data automaticamente pelo cronograma das turmas", que chama `GradeHorariaAPI.calcularDatas({ MateriaGUID, Escolhas: [{ TurmaGUID, SemanaBase, DiaSemana? }] })` e usa o `DataCalculada` retornado.

Ou seja: **não é preciso criar uma função nova de cálculo** — é a mesma `calcularDatas`, já reaproveitável tal como está, só para **Prova e Tarefa** (Conteúdo não entra aqui — ver §2.3).

**O que falta de verdade:** nenhuma das duas entidades (`ProvaAgendada`, `TarefaAcademica`) **persiste** que aquele registro foi criado em modo automático, nem a `SemanaBase`/`DiaSemana` usados — confirmado lendo os entity models, nenhum tem esses campos. Hoje isso não é um problema porque o cálculo acontece uma vez, no momento da criação, para as turmas já escolhidas ali. Mas a propagação acontece **depois**, para uma turma que não estava na lista original — pra replicar "a mesma semana que o representante que criou setou" é preciso guardar `SemanaBase`/`DiaSemana` na criação, pra poder chamar `calcularDatas` de novo depois, trocando só o `TurmaGUID`. Ver campos novos em §5.3.

- Se a origem foi criada em **modo específico** (data digitada manualmente, sem passar pela calculadora): propagação não calcula nada — clona a data literal pra toda turma que confirmar. Nenhum campo de semana/dia é gravado nesse caso.
- Se a origem foi criada em **modo automático**: propagação chama `calcularDatas(MateriaGUID, [{ TurmaGUID: destino, SemanaBase: <a mesma gravada na origem>, DiaSemana: <o mesmo gravado, se houve> }])`. Três desfechos possíveis (o próprio `calcularDatas` já retorna isso): `"ok"` (data resolvida, segue o fluxo normal), `"semCronograma"` (a turma destino não tem essa matéria no cronograma — não dá pra calcular; cai pra pedir a data ao representante que confirmou, como fallback) e `"escolherDia"` (a turma destino tem essa matéria mais de uma vez por semana e o `DiaSemana` da origem não bate com nenhuma ocorrência dela — mesmo fallback: pergunta ao representante).

### 2.3 Conteúdo não tem prazo — publica direto na confirmação, sem cronograma

Confirmado com o usuário: Conteúdo não tem "prazo" no mesmo sentido de Prova/Tarefa — é material publicado pra turma ver, não uma entrega com data-limite. Por isso a propagação de Conteúdo **não usa `calcularDatas` nem os campos de modo automático em nenhuma hipótese**: ao confirmar "sim", o sistema publica pra aquela turma imediatamente (usa o momento da confirmação como `ConteudoDataPublicacaoTurma`, ou simplesmente adiciona a turma ao `Conteudo` de origem sem override de data — a definir na implementação qual dos dois é mais consistente com o comportamento atual de `ConteudoDataPublicacao`). Isso também explica por que só `ProvaAgendadaForm.tsx`/`TarefaForm.tsx` têm a seção "definir automaticamente" e `ConteudoForm` não tem — não é uma lacuna a preencher, é esperado.

---

## 3. Conceitos reaproveitados (sem mudança)

- **Representante / Vice-Representante**: já existe como `membroFuncao` de `ConversaGrupo` do tipo `'Turma'` (`backend/entities/conversa-grupo-membro.model.ts`, `permissao-granular.helper.ts:41`). Não é preciso criar papel novo — só uma nova checagem de permissão que lê o mesmo dado.
- **`ProfessorMateria`** (feature implementada nesta mesma sessão, `backend/services/professor.service.ts` — `listarMateriasQualificadas`) e **`MateriaxProfessorxTurma`**: usados para resolver "quem é o professor responsável por essa matéria nessa turma" e para achar as turmas irmãs (mesmo `UsuarioGUID` do professor + mesma `MateriaGUID`).
- **`calcularDataAulaNaSemana`** (`backend/utils/gradeHoraria.util.ts:86`): já usada pelo agendamento automático de Prova/Conteúdo — reaproveitada tal qual para as turmas que confirmarem "sim" na propagação.
- **Chatbot do WhatsApp** (`backend/services/chatbot.service.ts`, `backend/ai/agents/*`): canal de mensagens de confirmação e de pergunta de conteúdo/prazo alternativo. Identidade dos representantes já é 100% resolvida por canal (não precisa de "identifique-se").

---

## 4. Fluxo passo a passo

### 4.1 Origem — representante cria para a própria turma

1. Representante/Vice-Representante abre o modal de Prova/Tarefa/Conteúdo para a própria turma (frontend passa a permitir isso condicionalmente — ver §6).
2. Backend valida, num helper novo `podeLancarEmNomeDoProfessor(usuarioGUID, turmaGUID)`:
   - a flag da escola (`escolaconfiguracao.PermiteLancamentoPorRepresentante`) está ligada;
   - `usuarioGUID` é Representante ou Vice-Representante **ativo** do grupo `'Turma'` daquela turma.
3. A entidade (Prova/Tarefa/Conteúdo) é criada com o `UsuarioGUID` do **professor** (resolvido via `MateriaxProfessorxTurma`/`ProfessorMateria` daquela turma+matéria) — preserva toda validação de autoria/categoria já existente — mas grava também `CriadoPorRepresentanteUsuarioGUID` = o representante real que chamou a API.
4. Dispara a propagação (§4.2) de forma assíncrona (não bloqueia a resposta ao representante de origem).

### 4.2 Propagação (fan-out)

1. Serviço busca turmas "irmãs": mesmo `UsuarioGUID` (professor) + mesma `MateriaGUID` via `MateriaxProfessorxTurma`, **excluindo** a turma de origem, filtradas por mesma `TurmaSerie` (ano) da turma de origem.
2. Para cada turma irmã, resolve o(s) Representante(s)/Vice-Representante(s) ativos do grupo `'Turma'` dela.
   - Se a turma não tiver nenhum representante ativo: pula (loga para visibilidade), ninguém é notificado e nada é criado para ela.
3. Cria uma linha `Pendente` numa tabela nova de propagação (§5.2), uma por (turma destino × entidade de origem).
4. Envia mensagem via chatbot para o(s) representante(s) da turma destino, por exemplo: *"[Professor] cadastrou uma [Prova/Tarefa/Conteúdo] de [Matéria] com o conteúdo: '[resumo]'. Confirma a criação para a sua turma [Nome Turma]? Responda SIM para criar igual, ou me diga o conteúdo diferente que você quer usar."*
5. Sem timeout (decisão #1): a linha fica `Pendente` até alguém responder, ou para sempre.

### 4.3 Resposta do representante da turma destino

- **SIM:**
  - **Prova:** resolve a data conforme o modo gravado na origem (§2.2): **específico** → clona a data literal, sem cálculo; **automático** → chama `calcularDatas(MateriaGUID, [{TurmaGUID: destino, SemanaBase, DiaSemana}])`. Se vier `"semCronograma"` ou `"escolherDia"`, cai no fallback: a IA pergunta a data diretamente ao representante. Com a data resolvida, adiciona a `TurmaDestinoGUID` na MESMA `ProvaAgendada` de origem (`TurmasGUID`) — não cria registro novo.
  - **Tarefa:** mesma resolução de prazo do parágrafo acima (específico/automático/fallback), mas como Tarefa é 1-registro-por-turma, cria uma NOVA `TarefaAcademica` para essa turma com o prazo resolvido e o mesmo `TarefaTitulo`/`TarefaConteudo` do original.
  - **Conteúdo:** sem cálculo de data nenhum (§2.3) — publica pra essa turma imediatamente, no momento da confirmação. Adiciona a `TurmaDestinoGUID` no `Conteudo` de origem, igual Prova.
  - Marca a linha de propagação como `Confirmado`, grava `EntidadeResultanteGUID` (a mesma da origem, no caso de Prova/Conteúdo; a nova, no caso de Tarefa).
- **NÃO / conteúdo diferente:**
  - A IA pergunta o conteúdo que o representante quer usar em vez do original (a data/prazo segue a mesma resolução automática/específica de quando confirma "sim" — só o conteúdo pedagógico muda).
  - Cria uma prova/tarefa/conteúdo **separada** (nunca entra na entidade de origem), escopada só à turma dele, com o conteúdo informado.
  - Marca a linha como `RecusadoComEdicao`, grava `ConteudoEditado` e `EntidadeResultanteGUID` (a nova entidade).

---

## 5. Modelo de dados novo

### 5.1 Flag por escola

Confirmar durante a implementação o nome real da tabela/entidade de configuração de escola (referida em sessões anteriores como `EscolaConfiguracao`, usada hoje para tema/cores) e adicionar:

```sql
ALTER TABLE escolaconfiguracao
  ADD COLUMN PermiteLancamentoPorRepresentante BOOLEAN NOT NULL DEFAULT FALSE;
```

Exposta no bootstrap do dashboard (mesmo payload que já entrega tema/cores da escola) e com toggle on/off no painel de Coordenação/Direção.

### 5.2 Tabela de propagação (fan-out)

```sql
CREATE TABLE representantelancamentopropagacao (
  PropagacaoGUID CHAR(36) NOT NULL PRIMARY KEY,
  TipoOrigem ENUM('Prova','Tarefa','Conteudo') NOT NULL,
  OrigemGUID CHAR(36) NOT NULL,          -- ProvaAgendadaGUID / TarefaAcademicaGUID / ConteudoGUID que disparou a propagação
  TurmaOrigemGUID CHAR(36) NOT NULL,
  TurmaDestinoGUID CHAR(36) NOT NULL,
  RepresentanteDestinoUsuarioGUID CHAR(12) NULL,   -- quem respondeu, se respondeu
  Status ENUM('Pendente','Confirmado','RecusadoComEdicao') NOT NULL DEFAULT 'Pendente',
  ConteudoEditado TEXT NULL,                        -- conteúdo alternativo informado, se recusou
  EntidadeResultanteGUID CHAR(36) NULL,              -- prova/tarefa/conteúdo efetivamente criado como resultado
  CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  RespondidoEm TIMESTAMP NULL,
  UNIQUE KEY UQ_Propagacao_Origem_Turma (OrigemGUID, TurmaDestinoGUID),
  CONSTRAINT FK_Propagacao_TurmaOrigem FOREIGN KEY (TurmaOrigemGUID) REFERENCES turma(TurmaGUID) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT FK_Propagacao_TurmaDestino FOREIGN KEY (TurmaDestinoGUID) REFERENCES turma(TurmaGUID) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT FK_Propagacao_Representante FOREIGN KEY (RepresentanteDestinoUsuarioGUID) REFERENCES usuario(UsuarioGUID) ON UPDATE CASCADE ON DELETE RESTRICT
);
```

### 5.3 Modo de agendamento (para replay do cálculo automático na propagação) — só Prova e Tarefa

Campo novo em `ProvaAgendada` e `TarefaAcademica` **apenas** (ver §2.2/§2.3 — Conteúdo fica de fora, não tem prazo) — só populado quando a origem foi criada via "definir automaticamente pelo cronograma":

```sql
ALTER TABLE tarefaacademica
  ADD COLUMN TarefaPrazoModoAutomatico BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN TarefaPrazoSemanaBase DATE NULL,
  ADD COLUMN TarefaPrazoDiaSemana ENUM('Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo') NULL;
-- mesmos três campos (prefixo equivalente) em provaagendada; Conteudo NÃO recebe esses campos
```

Se `*ModoAutomatico = FALSE` (modo específico): a propagação não calcula nada, clona a data literal já gravada. Se `TRUE`: a propagação chama `HorarioTurmaService.calcularDatas` de novo por turma destino, usando `*SemanaBase`/`*DiaSemana` gravados aqui.

### 5.4 Marcação de autoria real (auditoria/confiança)

Campo novo em `ProvaAgendada`, `TarefaAcademica` e `Conteudo`:

```sql
ALTER TABLE provaagendada ADD COLUMN CriadoPorRepresentanteUsuarioGUID CHAR(12) NULL,
  ADD CONSTRAINT FK_ProvaAgendada_Representante FOREIGN KEY (CriadoPorRepresentanteUsuarioGUID) REFERENCES usuario(UsuarioGUID) ON UPDATE CASCADE ON DELETE RESTRICT;
-- mesma coluna + FK em tarefaacademica e na tabela de Conteudo (materia_postada — confirmar nome exato)
```

Quando não-nulo, indica que foi um representante quem de fato criou o registro (em nome do professor já gravado em `UsuarioGUID`). A UI **sempre** mostra essa origem (ver §6) — nunca esconde.

---

## 6. Permissões / autorização

- Novo helper `podeLancarEmNomeDoProfessor(usuarioGUID, turmaGUID)`: `true` se (a) flag da escola ligada E (b) `usuarioGUID` é Representante ou Vice-Representante ativo do grupo `'Turma'` daquela turma — reaproveita a mesma leitura de `membroFuncao` já usada em `resolverPermissaoChat`.
- `criarProva` / `criarTarefa` / `criarConteudo` (services) ganham esse novo caminho de autorização como **alternativa** ao caminho atual (professor autenticado), sem alterar a validação existente para quando quem chama já é o próprio professor.
- **Atenção a um ponto real encontrado na pesquisa:** `provaagendada.service.ts#criarProva` valida hoje `categoria.UsuarioGUID !== usuarioGUID` (a Categoria de Conteúdo pertence ao professor). Quando quem chama é o representante, essa comparação **precisa usar o `UsuarioGUID` do professor** (resolvido via `MateriaxProfessorxTurma` da turma), não o do representante — senão a criação sempre falha com "Categoria inválida". O mesmo cuidado vale para as validações equivalentes em `tarefaacademica.service.ts` e `conteudo.service.ts`.
- O `UsuarioGUID` da entidade criada **nunca** é o do representante — é sempre o do professor. A distinção de quem de fato agiu vive só em `CriadoPorRepresentanteUsuarioGUID`.

---

## 7. Interface

- Frontend: exibir os botões "Nova Prova/Tarefa/Conteúdo" para o Representante/Vice-Representante quando a flag da escola estiver ligada (expor o valor da flag no payload de bootstrap do dashboard).
- No modal de criação/edição de Prova/Tarefa/Conteúdo: quando `CriadoPorRepresentanteUsuarioGUID` não for nulo, mostrar um aviso visível (ex.: badge "Criado por representante em nome do professor [Nome]") — nunca ocultar essa origem, inclusive para o próprio professor quando ele acessar depois.
- Painel de Coordenação/Direção: toggle on/off da flag `PermiteLancamentoPorRepresentante`, mesmo padrão das outras telas de configuração de escola já existentes.

---

## 8. Fora de escopo desta primeira versão

- Timeout/expiração automática de propagação pendente (decisão #1, §1 — descartado explicitamente).
- Configuração por turma individual (decisão #4, §1 — ficou por escola inteira).
- Reversão retroativa do que já foi criado quando a flag é desligada — registros já criados continuam existindo normalmente; desligar a flag só impede novas criações/propagações.
- `criarAlocacoesEmMassa` (importação via planilha) não ganha esse caminho de autorização — mesma decisão de escopo já tomada para a feature de `ProfessorMateria`.

---

## 9. Pontos em aberto para validar durante a implementação

- Nome real da tabela de Conteúdo (confirmar em `conteudo.service.ts`/`conteudo.model.ts`) — só pra grafar a migration certa; a ausência da seção "definir automaticamente" na UI de Conteúdo **não é uma lacuna** (confirmado com o usuário, §2.3: Conteúdo não tem prazo, publica direto na confirmação).
- Definir, na implementação, se "publicar direto na confirmação" (Conteúdo) grava o momento exato da confirmação como `ConteudoDataPublicacaoTurma`, ou se simplesmente não grava override nenhum e a turma passa a enxergar o `Conteudo` de origem a partir do instante em que é adicionada ao `TurmasGUID` (mais simples, evita mais um campo) — decisão de implementação, não muda a arquitetura.
- ~~Nome real da tabela/entidade de configuração de escola~~ — **confirmado**: `escolaconfiguracao` / `EscolaConfiguracaoDAO` (`backend/repositories/escolaconfiguracao.repository.ts`, já usado por `horarioturma.service.ts`). A suposição em §5.1 está correta.
- Fallback de `"semCronograma"`/`"escolherDia"` (§2.2, §4.3): confirmar com o usuário se "pergunta a data ao representante" é aceitável mesmo, ou se nesses casos a propagação deveria simplesmente pular a turma (não notificar) por falta de cronograma configurado.
- Texto exato das mensagens do chatbot (confirmação, pergunta de conteúdo alternativo, pergunta de data/prazo no fallback) — desenhar junto com o padrão de tom já usado pelos outros agentes em `backend/ai/agents/`.
