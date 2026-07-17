# Planejamento: Grade Horária (Configurações da Escola, Cronograma de Turma e Agendamento Automático)

**Data:** 14 de Julho de 2026
**Status:** Spec em revisão — aguardando validação final antes de iniciar implementação
**Escopo:** Configurações de horário da escola, aulas/semana por matéria, cronograma (grade horária) por turma com montagem visual "quebra-cabeça" e importação de planilha, e preenchimento automático de data/hora em Prova Agendada e Tarefa Acadêmica a partir do cronograma da turma.

---

## 0. Resumo executivo

Hoje o sistema não tem nenhuma noção de tempo/horário de aula: `Materia`, `Turma` e a alocação `MateriaxProfessorxTurma` não guardam duração de aula, dias da semana, turno ou horário. `ProvaAgendada` e `TarefaAcademica` aceitam qualquer data/hora manual, validando apenas que não está no passado. Este documento especifica quatro blocos de trabalho que dependem uns dos outros, nesta ordem:

1. **Configurações da escola** (novo): parâmetros globais de horário (minutos/aula, dias letivos, período da manhã, período da tarde opcional, intervalos).
2. **Aulas por semana** em `Materia` (padrão) e em `MateriaxProfessorxTurma` (override por turma).
3. **Cronograma da turma** (novo): grade horária semanal por turma, montada por drag-and-drop ("quebra-cabeça") ou importada via planilha, com checagem de conflito de professor.
4. **Agendamento automático** em `ProvaAgendada`/`TarefaAcademica`: data/hora calculada a partir do cronograma da turma + deslocamento opcional, com fallback manual quando a turma não tem cronograma.

O bloco 4 exige uma mudança estrutural em `TarefaAcademica` (hoje presa a uma única alocação turma+professor) para suportar múltiplas turmas por tarefa, no mesmo padrão N:N que `ProvaAgendada` já usa. Essa mudança foi confirmada com o responsável do produto (ver §1) e deve ser tratada como sua própria migração, isolada das demais.

---

## 1. Decisões de negócio já validadas

| # | Pergunta | Decisão |
|---|----------|---------|
| 1 | Conflito de professor detectado ao importar planilha de cronograma | Importa tudo o que **não** conflita; horários conflitantes voltam vazios ("banco" de matérias) e o sistema mostra um relatório de avisos ao final. |
| 2 | "Aulas por semana" é global (por matéria) ou por turma? | **Híbrido**: `Materia` guarda um valor padrão; a alocação `MateriaxProfessorxTurma` pode sobrescrever esse valor especificamente para aquela turma. |
| 3 | Vínculo professor↔matéria é fixo ou por turma? | Já é por turma hoje (`MateriaxProfessorxTurma` existente) — nenhuma mudança necessária aqui, só reaproveitar. |
| 4 | Deslocamento (+/-) leva o horário calculado para fora do expediente da turma | **Permitido.** Não bloqueia; aceita o horário calculado mesmo fora do período configurado. |
| 5 | Mesma matéria pode ter mais de 1 aula no mesmo dia (aulas seguidas/geminadas) | **Permitido**, sem bloqueio/aviso. |
| 6 | O que significa "cronograma não pode ser deletado" | Apenas a existência da grade em si (o "container") é permanente uma vez criada; **cada matéria alocada em um horário pode ser livremente removida e devolvida ao banco a qualquer momento.** Não há histórico versionado — fora de escopo. |
| 7 | Criação de Tarefa/Prova para múltiplas turmas de uma vez com datas diferentes | **Sim.** Uma única tarefa/prova pode ser atribuída a várias turmas, cada uma recebendo sua própria data calculada. |
| 8 | Quando a matéria tem mais de uma ocorrência semanal na turma, qual usar como base do cálculo automático? | **O professor escolhe** o dia/horário base, dentre as ocorrências daquela matéria naquela turma naquela semana. |
| 9 | Configuração de intervalo quando "não variado" | **Misto**: horário fixo e definido manualmente (não é só "a cada N aulas"), mas o sistema **recomenda/avisa** (não bloqueia) se um intervalo cortar uma aula de forma incomum (ex.: "sobram 2,5 aulas antes deste intervalo"). |
| 10 | Turma pode ter aulas em mais de um turno (manhã e tarde)? | **Sim**, o cronograma de uma turma pode misturar horários da manhã e da tarde livremente. |
| 11 | Onde fica o campo "aulas por semana"? | Confirma decisão #2: padrão em `Materia`, override em `MateriaxProfessorxTurma`. |
| 12 | Tarefa presa a 1 turma vs. N:N como Prova | **Confirmado**: refatorar `TarefaAcademica` para o mesmo padrão N:N de `ProvaAgendada` (tarefa + tabela de junção tarefa×turma/alocação). |

---

## 2. Estado atual do código (relevante para esta feature)

Levantado diretamente do repositório, sem duplicar nada existente:

- **Stack**: Express + TypeScript + MySQL cru (sem ORM), Next.js 14 App Router no frontend, Socket.io já configurado (`backend/websocket/SocketServer.ts`).
- **`Materia`** (`backend/entities/materia.model.ts`): não tem campo de aulas/semana — precisa ser adicionado.
- **`Turma`** (`backend/entities/turma.model.ts`): não tem nenhum campo de horário/turno.
- **`MateriaxProfessorxTurma`** (`backend/entities/materiaxprofessorxturma.model.ts`): **já existe** e já resolve "qual professor dá qual matéria em qual turma" — é o ponto de ancoragem natural para o cronograma e para o override de aulas/semana. Gerenciado hoje pela tela de professores (`frontend/app/dashboard/[escolaGUID]/gestao-dados/professores/page.tsx`).
- **`ProvaAgendada`**: já é N:N com turma via `ProvaAgendadaTurma` — modelo de referência a seguir.
- **`TarefaAcademica`**: presa a uma única `matXprofXturxescGUID` — precisa da refatoração N:N (decisão #12).
- **`Escola`**: só tem campos de identidade/branding, nenhuma configuração de horário.
- **Upload de planilha**: já existe um padrão maduro e reutilizável (`BaseUploadPlanilha.tsx` + `xlsx` + geração de modelos em `scripts/criar-modelos-excel.js`) — o cronograma deve seguir esse mesmo padrão, não reinventar.
- **Drag-and-drop**: **não existe** nenhuma lib de DnD de UI hoje (só `react-dropzone` para upload de arquivo). Será necessário adicionar uma (recomendado: `dnd-kit`, mantido ativamente e compatível com React 18).
- **Timezone**: já existe camada global de conversão (`frontend/lib/timezone-utils.ts`) usada em todo `datetime-local` — deve ser reaproveitada, não recriada.
- **Convenções**: entidades em Portuguese/PascalCase, camadas `entities → repositories → services → controllers → middlewares → routes`, GUID v4 como PK, enum `Status` em vez de hard delete.

---

## 3. Modelo de dados novo/alterado

### 3.1 `EscolaConfiguracao` (nova tabela, 1:1 com `Escola`)

```sql
CREATE TABLE escolaconfiguracao (
  EscolaConfiguracaoGUID UUID PRIMARY KEY,
  EscolaGUID UUID NOT NULL UNIQUE,
  MinutosPorAula INT NOT NULL,                       -- ex: 50
  DiasSemana SET('Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo')
             NOT NULL DEFAULT 'Segunda,Terca,Quarta,Quinta,Sexta',
  PeriodoManhaInicio TIME NOT NULL,                  -- ex: 07:00
  PeriodoManhaFim TIME NOT NULL,                     -- ex: 12:20
  TemAulaTarde BOOLEAN NOT NULL DEFAULT FALSE,
  PeriodoTardeInicio TIME NULL,                      -- obrigatório se TemAulaTarde=true
  PeriodoTardeFim TIME NULL,
  IntervaloVariado BOOLEAN NOT NULL DEFAULT FALSE,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID)
);

CREATE TABLE escolaconfiguracaointervalo (
  EscolaConfiguracaoIntervaloGUID UUID PRIMARY KEY,
  EscolaConfiguracaoGUID UUID NOT NULL,
  DiaSemana ENUM('Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo') NULL,
            -- NULL = aplica-se a todos os dias (caso IntervaloVariado=false)
            -- preenchido = específico daquele dia (caso IntervaloVariado=true)
  IntervaloInicio TIME NOT NULL,
  IntervaloFim TIME NOT NULL,
  FOREIGN KEY (EscolaConfiguracaoGUID) REFERENCES escolaconfiguracao(EscolaConfiguracaoGUID)
);
```

**Por que uma tabela separada para intervalos:** cobre tanto o caso "fixo" (`IntervaloVariado=false`, uma ou mais linhas com `DiaSemana=NULL`, repetidas todo dia) quanto o caso "variado por dia" (`IntervaloVariado=true`, linhas com `DiaSemana` específico) sem precisar de colunas condicionais.

**Grade de aulas derivada (não persistida):** a partir de `MinutosPorAula` + períodos + intervalos, o backend calcula em memória a lista de "slots" (aula 1, aula 2, ... com horário de início/fim) para cada turno/dia. Essa função (`calcularSlotsAula(config, diaSemana)`) é a base tanto do modelo de planilha gerada quanto da grade vazia mostrada no quebra-cabeça. Ao salvar a configuração, se um intervalo manual não cair exatamente na borda de uma aula (ex.: sobram 2,5 aulas antes dele), a API retorna um aviso não-bloqueante (`avisos: string[]`) para o frontend exibir — não impede o salvamento (decisão #9).

### 3.2 `Materia` — novo campo

```sql
ALTER TABLE materia ADD COLUMN MateriaAulasPorSemanaPadrao INT NULL;
```

Nullable: matérias existentes continuam válidas sem valor definido até serem editadas.

### 3.3 `MateriaxProfessorxTurma` — novo campo (override)

```sql
ALTER TABLE materiaxprofessorxturma ADD COLUMN AulasPorSemana INT NULL;
-- NULL = usa MateriaAulasPorSemanaPadrao da matéria
```

### 3.4 `HorarioTurma` (novo — os "slots preenchidos" do cronograma)

```sql
CREATE TABLE horarioturma (
  HorarioTurmaGUID UUID PRIMARY KEY,
  TurmaGUID UUID NOT NULL,
  MatProfTurGUID UUID NOT NULL,        -- qual matéria+professor ocupa este horário
  DiaSemana ENUM('Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo') NOT NULL,
  HoraInicio TIME NOT NULL,
  HoraFim TIME NOT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (TurmaGUID) REFERENCES turma(TurmaGUID),
  FOREIGN KEY (MatProfTurGUID) REFERENCES materiaxprofessorxturma(MatProfTurGUID),
  UNIQUE KEY uq_turma_dia_hora (TurmaGUID, DiaSemana, HoraInicio)
);
```

Notas de design:
- Guardamos `HoraInicio`/`HoraFim` explícitos (não apenas um índice de slot), para que o cronograma já montado continue válido mesmo que a configuração da escola mude depois — coerente com a regra "não pode ser deletado" (é uma grade estável, não recalculada a cada leitura).
- Não existe uma linha "vazia": um slot sem matéria simplesmente não tem registro em `HorarioTurma`. O "banco de matérias" da tela de montagem é calculado como `(AulasPorSemana de cada MatProfTur da turma) − (linhas já existentes em HorarioTurma para aquele MatProfTur)`.
- **Checagem de conflito de professor**: antes de inserir/mover uma linha, o serviço busca todas as `HorarioTurma` de **outras turmas** cujo `MatProfTurGUID.UsuarioCPF` seja o mesmo professor, no mesmo `DiaSemana` com sobreposição de horário. Se encontrar, rejeita com uma resposta de conflito (a matéria não é movida, volta/permanece no banco) — vale tanto para o drag-and-drop quanto para a importação de planilha (onde, por decisão #1, apenas essa célula específica fica de fora).

### 3.5 Refatoração de `TarefaAcademica` (decisão #12)

Seguir o mesmo padrão de `ProvaAgendada` / `ProvaAgendadaTurma`:

```sql
CREATE TABLE tarefaacademicaturma (
  TarefaAcademicaTurmaGUID UUID PRIMARY KEY,
  TarefaGUID UUID NOT NULL,
  MatProfTurGUID UUID NOT NULL,      -- resolve turma + professor + matéria daquela turma específica
  TarefaPrazoData DATETIME NOT NULL, -- prazo específico desta turma (movido de TarefaAcademica)
  FOREIGN KEY (TarefaGUID) REFERENCES tarefaacademica(TarefaGUID),
  FOREIGN KEY (MatProfTurGUID) REFERENCES materiaxprofessorxturma(MatProfTurGUID),
  UNIQUE KEY uq_tarefa_matproftur (TarefaGUID, MatProfTurGUID)
);

ALTER TABLE tarefaacademica DROP COLUMN matXprofXturxescGUID;
ALTER TABLE tarefaacademica DROP COLUMN TarefaPrazoData; -- passa a viver por turma em tarefaacademicaturma
```

**Migração de dados existentes:** script único que, para cada `TarefaAcademica` atual, cria uma linha em `TarefaAcademicaTurma` copiando o `matXprofXturxescGUID` e o `TarefaPrazoData` atuais, antes de remover as colunas antigas. `TarefaAcademicaMatricula` (rastreio por aluno) não muda de forma — continua por matrícula, agora relacionada indiretamente via `TarefaGUID`.

**Risco**: esta é a única mudança que toca em dado existente de forma destrutiva (remoção de colunas). Recomendo tratá-la como PR isolado, com backup/rollback testado antes de aplicar em produção, e migrar todos os usos de `matXprofXturxescGUID`/`TarefaPrazoData` em `backend/services/tarefaacademica.service.ts` e em `frontend/app/dashboard/[escolaGUID]/crud-tarefa/page.tsx`.

---

## 4. Fluxos de UI

### 4.1 Configurações da Escola (nova seção)

Nova rota, ex.: `frontend/app/dashboard/[escolaGUID]/configuracoes/page.tsx`, acessível a Coordenação/Direção. Formulário único (não é lista/tabela como as outras telas de `gestao-dados`):

- **Minutos por aula** (number input)
- **Dias da semana com aula** (checkboxes, pré-marcado Segunda–Sexta)
- **Período da manhã** (hora início / hora fim)
- **Tem aula à tarde?** (checkbox) → se marcado, mostra **Período da tarde** (hora início / hora fim)
- **Intervalo variado?** (checkbox)
  - Se **não**: lista de 1+ intervalos fixos (hora início/fim), aplicados a todos os dias letivos
  - Se **sim**: para cada dia da semana marcado, lista de 1+ intervalos daquele dia
- Preview somente-leitura da grade de aulas gerada (aula 1: 07:00–07:50, aula 2: ..., intervalo, ...), com avisos não-bloqueantes se algum intervalo cortar uma aula.

### 4.2 Cadastro de Matéria — novo campo

Adicionar campo **"Aulas por semana (padrão)"** (number, opcional) no formulário existente (`BaseFormularioCadastro` em `frontend/app/dashboard/[escolaGUID]/gestao-dados/materias/page.tsx`) e na importação em massa por planilha da matéria.

### 4.3 Tela de Alocação (professor × matéria × turma) — override

Na tela de professores, ao criar/editar uma alocação, adicionar campo opcional **"Aulas por semana nesta turma"** — se vazio, mostra o padrão da matéria como placeholder/dica.

### 4.4 Cronograma da Turma (novo)

No cadastro/edição de turma, nova aba/seção **"Cronograma"**:

1. **Upload de planilha**: modelo gerado dinamicamente a partir de `EscolaConfiguracao` (linhas = aulas com horário calculado, colunas = dias letivos configurados), reaproveitando `BaseUploadPlanilha`. Células preenchidas com o nome da matéria (e professor, se a turma tiver mais de uma alocação com o mesmo nome de matéria — usar formato "Matéria (Professor)" para desambiguar). Import aplica a regra da decisão #1 (só entra o que não conflita, relatório de avisos ao final).
2. **Montagem visual ("quebra-cabeça")**, como alternativa ou complemento ao upload:
   - Grade vazia da turma (dias × aulas, conforme configuração da escola, incluindo tarde se aplicável) desenhada com `dnd-kit`.
   - Abaixo, o **"banco de matérias"**: uma peça arrastável por aula ainda não alocada de cada `MateriaxProfessorxTurma` da turma (ex.: "Matemática — Prof. João" aparece 3x se `AulasPorSemana=3` e nenhuma ainda posicionada). Uma peça de matéria de 1 aula ocupa exatamente 1 slot da grade.
   - Ao soltar uma peça num slot: chamada à API cria/move a `HorarioTurma`; se houver conflito de professor com outra turma, a API rejeita, um aviso aparece e a peça retorna ao banco.
   - Remover uma peça já alocada (drag de volta ao banco, ou botão "remover") libera o slot e devolve a peça ao banco — a qualquer momento, sem restrição (a grade em si nunca é "deletada", só esvaziada/reorganizada).

### 4.5 Criação de Prova/Tarefa — agendamento automático

No formulário de `crud-provaagendada` e (após a refatoração N:N) `crud-tarefa`:

- Novo checkbox **"Definir automaticamente pelo cronograma da turma"**, visível após selecionar a(s) turma(s) e a matéria.
- Se marcado:
  - Seletor de **semana** (ex.: date picker restrito a qualquer dia — o sistema infere a semana Seg–Dom correspondente).
  - Campo opcional de **deslocamento** (+/- horas:minutos).
  - Para cada turma selecionada: se a matéria tiver mais de uma ocorrência semanal no cronograma daquela turma, mostrar as opções de dia/horário para o **professor escolher** qual usar como base (decisão #8).
  - Se a turma **não tiver cronograma configurado** (ou a matéria não estiver alocada em nenhum slot dela), abrir um **modal de definição manual** só para aquela turma, antes de permitir salvar.
  - Data final = data do dia escolhido na semana selecionada + horário do slot, ± deslocamento — sem bloqueio caso o resultado saia do expediente escolar (decisão #4).
- Continua existindo a opção de definir manualmente, sem o checkbox, como hoje.

---

## 5. API — novos endpoints (esboço)

| Método | Rota | Descrição |
|---|---|---|
| GET/PUT | `/api/escola-configuracao/:escolaGUID` | Ler/gravar configuração de horário da escola (singleton) |
| GET | `/api/escola-configuracao/:escolaGUID/slots?dia=` | Grade de aulas calculada (horários por dia) |
| PUT | `/api/materia/:materiaGUID` | (existente, estendido) agora aceita `MateriaAulasPorSemanaPadrao` |
| PUT | `/api/professor/alocacao/:matProfTurGUID` | (existente, estendido) agora aceita `AulasPorSemana` |
| GET | `/api/turma/:turmaGUID/cronograma` | Grade atual (slots preenchidos) + banco de matérias pendentes |
| POST | `/api/turma/:turmaGUID/cronograma/slot` | Aloca uma matéria em um slot (dia+hora); valida conflito de professor |
| DELETE | `/api/turma/:turmaGUID/cronograma/slot/:horarioTurmaGUID` | Remove alocação, devolve ao banco |
| POST | `/api/turma/:turmaGUID/cronograma/importar` | Importa planilha; retorna `{ importados, conflitos, avisos }` |
| GET | `/api/turma/:turmaGUID/cronograma/modelo` | Baixa modelo de planilha já preenchido com horários da config da escola |
| POST | `/api/grade-horaria/calcular-datas` | Dado `{ MateriaGUID, escolhas: [{ TurmaGUID, semanaBase, diaEscolhido?, deslocamentoMinutos? }] }`, retorna data/hora calculada por turma, ou flag `semCronograma: true` para as turmas sem grade configurada |

---

## 6. Fases de implementação sugeridas

1. **Configurações da Escola** — entidade + tela, é a fundação de tudo (grade derivada depende dela).
2. **Aulas por semana** — campo em `Materia` + override em `MateriaxProfessorxTurma`.
3. **Cronograma da turma** — modelo `HorarioTurma` + montagem visual (drag-and-drop) + checagem de conflito. Entregar sem importação de planilha ainda.
4. **Importação de planilha** de cronograma, reaproveitando `BaseUploadPlanilha`.
5. **Refatoração de `TarefaAcademica`** para N:N com turmas (migração isolada, própria PR, com script de migração de dados testado).
6. **Agendamento automático** em Prova e Tarefa, que depende das fases 3 e 5 estarem prontas.

Cada fase é entregável e testável isoladamente; a ordem evita trabalho retrabalhado (ex.: não faz sentido montar o cronograma antes de saber quantos minutos tem uma aula).

---

## 7. Pontos ainda em aberto (assunções que adotei — revisar antes de codar)

Estes não bloqueiam o início da Fase 1, mas valem uma checada rápida antes das fases correspondentes:

- **Nova dependência de frontend**: proposto `dnd-kit` para o quebra-cabeça (nenhuma lib de DnD de UI existe hoje no projeto). Se houver preferência por outra lib ou por uma implementação sem lib externa (grid com clique-para-selecionar em vez de arrastar), avisar antes da Fase 3.
- **Desambiguação de planilha** quando a mesma matéria tem duas alocações diferentes na turma (dois professores): assumi formato de célula `"Matéria (Professor)"`. Se preferir outro formato (ex.: coluna separada de professor), ajustar o gerador de modelo.
- **Seletor de "semana"** no agendamento automático: assumi um date-picker onde qualquer dia clicado resolve para a semana Seg–Dom correspondente. Se a intenção era um seletor de número de semana ISO ou algo diferente, ajustar a Fase 6.
- **Sábado/Domingo com aula**: o enum de dias já contempla, para escolas com aula aos sábados; não foi mencionado explicitamente mas o campo de configuração já suporta.
