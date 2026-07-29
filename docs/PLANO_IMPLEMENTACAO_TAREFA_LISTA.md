# Planejamento: Tarefa tipo "Lista" (quiz estilo Forms)

**Data:** 2026-07-29
**Status:** Implementado (Fases 1-6 completas — backend, frontend e importação por planilha). **Pendente:** rodar a migration `backend/database/migrations/2026-07-29-add-tarefa-lista.ts` contra o banco (não executada automaticamente, precisa de confirmação explícita do usuário — ver Seção 8).
**Escopo:** 3º tipo de `TarefaAcademica` (hoje só `digital`/`fisica`), um quiz estilo Google Forms: professor monta questões objetivas (com alternativas, uma marcada como correta, pontos customizáveis por alternativa) e/ou discursivas (correção manual por questão); aluno responde com correção automática instantânea nas objetivas, alimentando a barra de progresso em tempo real; professor corrige as discursivas individualmente, questão por questão, no mesmo estado laranja de "pendente" que a tarefa digital já usa hoje; ao final, planilha de desempenho quebrada por questão (não só o agregado que já existe). Inclui também importação de questões em massa via planilha Excel.

---

## 0. Resumo executivo

**O que existe hoje:** `TarefaAcademica` (`backend/entities/tarefaacademica.model.ts`) só suporta `TarefaTipoEntrega: "digital" | "fisica"` — entrega de arquivo ou "marcar como feito". Não há conceito de questão, alternativa ou resposta estruturada em lugar nenhum do schema. `TarefaTipoEntrega` é armazenado como `VARCHAR(50)` (não é ENUM no banco — confirmado em `refactor-tarefa-normalized.sql:28`), então adicionar o valor `"lista"` não exige alteração de coluna, só validação na camada de aplicação.

**O que existe e será reaproveitado como base:** a normalização já feita pra `tarefaacademica`/`tarefaacademica_matricula` (1 tarefa compartilhada, N linhas de atribuição por aluno — `TarefaFeito`, `TarefaNota` 0-10, `TarefaAvaliadoPorCPF` como sinal de "correção humana vs. automática"), o scheduler de zeragem automática por prazo vencido (`tarefaacademicanota.scheduler.ts`), a máquina de estado `Estado`/`Percentual` do board de categorias (`categoriaconteudo.service.ts`), o fluxo de anexo genérico (`POST /api/anexo` + link por GUID), e o padrão de importação de planilha já usado em Gestão de Dados (`BaseUploadPlanilha.tsx`).

**Diferença estrutural chave:** todo o sistema de tarefa hoje assume **1 valor de progresso por (tarefa, aluno)** — um `TarefaFeito` booleano e um `TarefaNota` opcional. A lista quebra essa premissa: o progresso é **por questão**, indo de "nada respondido" até "tudo resolvido" em incrementos, com uma parte (objetivas) resolvendo-se sozinha e outra (discursivas) dependendo de correção manual questão a questão. Isso significa: 4 tabelas novas, uma extensão pontual e cuidadosa da máquina de estado do board (4 pontos de código), e uma extensão pontual do scheduler pra decisão de prazo vencido (ver Seção 1).

**Blocos de trabalho (ordem de dependência — ver Seção 5 para detalhe):**
1. Schema + CRUD de questão no backend (migration, entidades, DAOs, service, rotas)
2. Construtor manual de questões no `TarefaForm.tsx` — primeiro ponto testável ponta a ponta pelo professor
3. Fluxo de resposta do aluno + Estado/Percentual ao vivo no board
4. Fluxo de correção do professor (discursivas) + extensão do scheduler pro caso de prazo vencido
5. Estatística e exportação Excel quebrada por questão
6. Importação de questões via planilha

---

## 1. Decisões confirmadas com o usuário

| # | Pergunta | Decisão |
|---|---|---|
| 1 | O que acontece com a nota quando o prazo vence e a lista está incompleta? | **Aproveita o que foi respondido** — soma os pontos das questões já respondidas até o prazo e zera só as que ficaram em branco (não zera tudo de uma vez, diferente do comportamento hoje usado por digital/presencial). Exige uma extensão pontual do scheduler, detalhada na Seção 4. |
| 2 | Cada questão pode ter mais de um anexo, ou só um? | **Vários anexos por questão.** O schema já suporta desde já (barato agora, caro de adicionar depois), mesmo que a UI inicial comece simples. |

**Decisão de engenharia (não perguntada ao usuário, considerada de baixo risco):** `TarefaCompartilhada` (tarefa em grupo) é hoje um mecanismo órfão/nunca ligado no código (`GrupoTarefaService.criarGruposAutomaticos()` nunca é chamado por `criarTarefa()`) — a lista herda esse campo por estar na mesma tabela `tarefaacademica`, mas nenhum tratamento especial de grupo será construído para ela agora.

---

## 2. Fatos verificados no código (base para as decisões de schema)

- `TarefaTipoEntrega` no banco é `VARCHAR(50) NOT NULL DEFAULT 'Arquivo'` (`backend/database/migrations/refactor-tarefa-normalized.sql:28`) — **não é ENUM**, então adicionar `'lista'` não exige `ALTER TABLE MODIFY COLUMN`, só validação em aplicação (entity setter, middleware, tipos TS).
- `tarefaacademica` e `tarefaacademica_matricula` são `utf8mb4_unicode_ci` (mesmo arquivo, linhas 34/53) — toda coluna FK nova precisa casar essa collation explicitamente (não herdar o padrão da tabela), pelo motivo já documentado em `2026-07-28-add-tarefamatriculaguid-relacaoanexostarefa.ts` (erro `ER_FK_INCOMPATIBLE_COLUMNS` já ocorreu por isso, contra produção). A collation de `anexo.AnexoGUID` não está nos arquivos de migration versionados — **confirmar contra o banco real antes de escrever a migration da tabela de anexo de questão**.
- Máquina de estado atual (`backend/services/categoriaconteudo.service.ts:163-174`, dentro de `buscarCategoriasCompletas`) — só existe 1 linha por (tarefa, aluno) hoje:
  ```ts
  if (avaliadoManualmente) { estado = "avaliado"; percentual = round(nota/10*100); }
  else if (feito) { estado = "aguardando_avaliacao"; percentual = 100; }
  else if (prazoPassou || nota !== null) { estado = "atrasado"; percentual = 100; }
  else { estado = "sem_progresso"; percentual = null; }
  ```
  Repetida (com pequenas variações) em 4 lugares: `buscarCategoriasCompletas` (~linha 289), `reordenarItens` (~901), `buscarBoardGeral` (~1064), `buscarEstatisticasItem` (~1103). **Todos os 4 precisam de um branch novo pra `tarefa_lista`**, porque a lista não tem "1 valor só" — o progresso é por questão.
- `TarefaAcademicaService.avaliarTarefa()` (`backend/services/tarefaacademica.service.ts:701-804`) exige `TarefaFeito=true` antes de aceitar nota, e é escopado à tarefa inteira (1 nota). A avaliação por questão da lista **não reaproveita esse método** — é um fluxo novo, por questão, sem esse gate de `TarefaFeito` da tarefa inteira (só exige que aquela questão específica tenha sido respondida).
- `TarefaAvaliadoPorCPF IS NULL` é o sinal canônico de "correção automática/sistema" vs. correção humana, usado tanto no scheduler quanto na UI — a lista mantém essa mesma convenção na nova tabela de respostas.

---

## 3. Banco de dados

Uma migration nova: `backend/database/migrations/2026-07-29-add-tarefa-lista.sql` + `.ts`, seguindo exatamente o padrão de `2026-07-28-add-tarefamatriculaguid-relacaoanexostarefa.{sql,ts}` (idempotente via `INFORMATION_SCHEMA.COLUMNS`/`TABLES`, rodada manualmente via `npx tsx`, sem alterar `tarefaacademica` nem `tarefaacademica_matricula`).

**4 tabelas novas:**

```sql
CREATE TABLE tarefaacademica_questao (
  QuestaoGUID           CHAR(36) PRIMARY KEY,
  TarefaGUID             CHAR(36) NOT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  QuestaoEnunciado       TEXT NOT NULL,
  QuestaoTipo            ENUM('objetiva','discursiva') NOT NULL,
  QuestaoPontosMaximos   DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  QuestaoExplicacao      TEXT NULL,
  QuestaoOrdem           INT NOT NULL DEFAULT 0,
  CreatedAt              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT FK_Questao_Tarefa FOREIGN KEY (TarefaGUID) REFERENCES tarefaacademica(TarefaGUID) ON DELETE CASCADE,
  INDEX idx_questao_tarefa (TarefaGUID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tarefaacademica_alternativa (
  AlternativaGUID    CHAR(36) PRIMARY KEY,
  QuestaoGUID         CHAR(36) NOT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  AlternativaTexto    VARCHAR(512) NOT NULL,
  AlternativaCorreta  BOOLEAN NOT NULL DEFAULT FALSE,
  AlternativaPontos   DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  AlternativaOrdem    INT NOT NULL DEFAULT 0,
  CreatedAt           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT FK_Alternativa_Questao FOREIGN KEY (QuestaoGUID) REFERENCES tarefaacademica_questao(QuestaoGUID) ON DELETE CASCADE,
  INDEX idx_alternativa_questao (QuestaoGUID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tarefaacademica_questao_anexo (
  QuestaoAnexoGUID  CHAR(36) PRIMARY KEY,
  QuestaoGUID        CHAR(36) NOT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  AnexoGUID          CHAR(36) NOT NULL CHARACTER SET utf8mb4 COLLATE <confirmar contra o banco>,
  CreatedAt          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT FK_QuestaoAnexo_Questao FOREIGN KEY (QuestaoGUID) REFERENCES tarefaacademica_questao(QuestaoGUID) ON DELETE CASCADE,
  CONSTRAINT FK_QuestaoAnexo_Anexo FOREIGN KEY (AnexoGUID) REFERENCES anexo(AnexoGUID) ON DELETE CASCADE,
  INDEX idx_questaoanexo_questao (QuestaoGUID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tarefaacademica_resposta (
  RespostaGUID              CHAR(36) PRIMARY KEY,
  TarefaMatriculaGUID        CHAR(36) NOT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  QuestaoGUID                 CHAR(36) NOT NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  AlternativaGUID               CHAR(36) NULL CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  RespostaTextoDiscursiva       TEXT NULL,
  RespostaPontosObtidos         DECIMAL(4,2) NULL,
  RespostaAvaliadoEm            TIMESTAMP NULL,
  RespostaAvaliadoPorCPF        VARCHAR(14) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  RespondidoEm                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CreatedAt                     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt                     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_resposta (TarefaMatriculaGUID, QuestaoGUID),
  CONSTRAINT FK_Resposta_Matricula FOREIGN KEY (TarefaMatriculaGUID) REFERENCES tarefaacademica_matricula(TarefaMatriculaGUID) ON DELETE CASCADE,
  CONSTRAINT FK_Resposta_Questao FOREIGN KEY (QuestaoGUID) REFERENCES tarefaacademica_questao(QuestaoGUID) ON DELETE CASCADE,
  CONSTRAINT FK_Resposta_Alternativa FOREIGN KEY (AlternativaGUID) REFERENCES tarefaacademica_alternativa(AlternativaGUID) ON DELETE SET NULL,
  CONSTRAINT FK_Resposta_Avaliador FOREIGN KEY (RespostaAvaliadoPorCPF) REFERENCES usuario(UsuarioCPF),
  INDEX idx_resposta_matricula (TarefaMatriculaGUID),
  INDEX idx_resposta_questao (QuestaoGUID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

`RespostaAvaliadoPorCPF` usa `utf8mb4_0900_ai_ci` pra casar com `usuario.UsuarioCPF` — mesmo padrão já usado em `tarefaacademica_matricula.TarefaAvaliadoPorCPF` (`2026-07-24-materias-modulo.sql`).

---

## 4. Backend

### 4.1 Entidades novas (`backend/entities/`)
- `tarefaacademica-questao.model.ts` — `#QuestaoGUID, #TarefaGUID, #QuestaoEnunciado, #QuestaoTipo, #QuestaoPontosMaximos, #QuestaoExplicacao, #QuestaoOrdem`, setters validadores no mesmo estilo de `tarefaacademica.model.ts`.
- `tarefaacademica-alternativa.model.ts` — `#AlternativaGUID, #QuestaoGUID, #AlternativaTexto, #AlternativaCorreta, #AlternativaPontos, #AlternativaOrdem`.
- `tarefaacademica-resposta.model.ts` — `#RespostaGUID, #TarefaMatriculaGUID, #QuestaoGUID, #AlternativaGUID, #RespostaTextoDiscursiva, #RespostaPontosObtidos, #RespostaAvaliadoEm, #RespostaAvaliadoPorCPF`.
- `tarefaacademica_questao_anexo` não tem entidade própria — pivot tratado direto no DAO por SQL cru, mesmo padrão de `relacaoanexostarefa`.

### 4.2 Repositórios novos (`backend/repositories/`)
- `tarefaacademica-questao.repository.ts` — `create`, `createBatch` (usado tanto no builder manual quanto na importação por planilha), `findByTarefa` (ordenado por `QuestaoOrdem`), `findById`, `update`, `delete`, `reordenar`, `vincularAnexo`/`desvincularAnexo`/`buscarAnexosPorQuestoes` (batch, `Map<QuestaoGUID, AnexoResumo[]>`).
- `tarefaacademica-alternativa.repository.ts` — `createBatch`, `findByQuestao`, `findByQuestoes` (batch), `update`, `delete`, `deleteByQuestao`.
- `tarefaacademica-resposta.repository.ts` — `upsertObjetiva` / `upsertDiscursiva` (`INSERT ... ON DUPLICATE KEY UPDATE` na `uq_resposta`, permite o aluno trocar de resposta antes de fechar a lista), `gradeDiscursiva`, `findByMatricula`, `findByMatriculas` (batch), `contarRespondidas(TarefaGUID, TarefaMatriculaGUID)`, `buscarAgregadoPorAluno` (base pro Estado/Percentual e pra `buscarEstatisticasItem`), `buscarAgregadoPorQuestao` (base pra estatística nova por questão), `inserirRespostasEmBranco(TarefaGUID, TarefaMatriculaGUID)` (usado só pelo scheduler, ver 4.4).

### 4.3 `TarefaAcademicaService` — métodos novos

```ts
// CRUD de questão (professor)
criarQuestao(TarefaGUID, data: QuestaoCreateDTO, professorCPF): Promise<QuestaoDTO>
criarQuestoesBatch(TarefaGUID, questoes: QuestaoCreateDTO[], professorCPF): Promise<{criadas: QuestaoDTO[], count}>
atualizarQuestao(QuestaoGUID, data, professorCPF): Promise<QuestaoDTO>
  // bloqueia mudança estrutural (Tipo, add/remove alternativa) se já existir resposta pra essa questão
excluirQuestao(QuestaoGUID, professorCPF): Promise<void>
  // bloqueia se já existir resposta
reordenarQuestoes(TarefaGUID, ordens, professorCPF): Promise<void>

// Resposta do aluno
responderObjetiva(TarefaGUID, QuestaoGUID, AlternativaGUID, alunoCPF): Promise<RespostaDTO>
  // resolve a matrícula do aluno, busca AlternativaPontos, upsert com RespostaPontosObtidos já preenchido
  // se todas as questões da tarefa passam a ter resposta -> marca TarefaFeito=true na matrícula
responderDiscursiva(TarefaGUID, QuestaoGUID, texto, alunoCPF): Promise<RespostaDTO>
  // mesma coisa mas RespostaPontosObtidos fica null até correção

// Correção do professor (fluxo novo, não reusa avaliarTarefa)
avaliarQuestaoDiscursiva(RespostaGUID, pontos, professorCPF): Promise<RespostaDTO>
  // exige só que a questão tenha sido respondida (RespostaTextoDiscursiva != null), NÃO exige TarefaFeito=true da tarefa inteira

// Importação em massa (planilha)
importarQuestoesPlanilha(TarefaGUID, linhas: QuestaoImportRowDTO[], professorCPF): Promise<ImportacaoResultadoDTO>

// Leitura pro visualizador
buscarQuestoesComRespostas(TarefaGUID, usuarioCPF, ehProfessor): Promise<QuestaoComRespostaDTO[]>
buscarRespostasAluno(TarefaGUID, MatriculaGUID): Promise<QuestaoComRespostaDTO[]>  // painel de correção do professor

// Privado — roda depois de toda resposta/correção; só ESCREVE tarefaacademica_matricula.TarefaNota quando "fecha"
#tentarSettleTarefaLista(TarefaMatriculaGUID): Promise<void>
```

**Fórmula da nota final** (escrita em `tarefaacademica_matricula.TarefaNota`, reaproveitando a coluna que já existe — zero mudança de schema nela):

`Nota = round((Σ RespostaPontosObtidos / Σ QuestaoPontosMaximos) * 10, 2)`

`#tentarSettleTarefaLista` só escreve `TarefaNota` quando **todas** as questões da tarefa já têm `RespostaPontosObtidos` não-nulo (objetivas: automático assim que respondidas; discursivas: só depois que o professor corrige). Enquanto isso, `TarefaNota` fica `NULL` — quem mostra o progresso "ao vivo" pro aluno é o cálculo de `Percentual` feito na hora, direto da tabela de respostas (Seção 4.5), não a coluna `TarefaNota`. Isso evita qualquer mudança no scheduler pra tarefa em andamento (ele só olha `TarefaNota IS NULL`) — a única mudança real no scheduler é a extensão da Seção 4.4, pro caso do prazo vencer.

### 4.4 Prazo vencido com lista incompleta (decisão confirmada: aproveita o que foi respondido)

`backend/services/tarefaacademicanota.scheduler.ts` ganha um segundo passo, rodando junto do `zerarTarefasVencidas()` já existente:

1. A query hoje usada (`TarefaAcademicaMatriculaDAO.findVencidasSemAvaliacao`) passa a **excluir** tarefas `TarefaTipoEntrega='lista'` (`AND t.TarefaTipoEntrega != 'lista'`) — essas passam a ser tratadas só pelo passo novo, pra não zerar de forma flat por engano.
2. Novo método `#fecharListasVencidas()`: busca `tarefaacademica_matricula` com `TarefaFeito=FALSE` cujo `TarefaTipoEntrega='lista'` e prazo (com override por aluno) já passou. Para cada uma:
   - `tarefaacademica-resposta.repository.ts::inserirRespostasEmBranco(TarefaGUID, TarefaMatriculaGUID)` — insere uma linha de resposta com `RespostaPontosObtidos=0` (sem alternativa/texto) pra cada questão que **não** tem resposta ainda, marcando a lacuna como "em branco" de forma permanente.
   - `UPDATE tarefaacademica_matricula SET TarefaFeito=TRUE` (fecha a submissão — o aluno não pode mais responder depois disso).
   - Chama `#tentarSettleTarefaLista(TarefaMatriculaGUID)` — se não sobrou nenhuma discursiva sem corrigir, a nota fecha nesse exato momento (objetivas + zeros das em branco); se sobrou discursiva respondida mas não corrigida, a nota fica pendente até o professor corrigir (estado "aguardando_avaliação", só que agora sem bloquear mais respostas novas).

Isso mantém o `zerarTarefasVencidas()` original 100% intacto pra digital/presencial, só adiciona um caminho paralelo pra lista.

### 4.5 `CategoriaConteudoService` — Estado/Percentual/Estatística

- `ItemTipo` ganha `'tarefa_lista'`.
- Novo helper privado, chamado nos 4 pontos listados na Seção 2: `#resolverEstadoLista(TarefaGUID, TarefaMatriculaGUID, prazo, tarefaFeito, tarefaNota, avaliadoPorCPF)`, usando `buscarAgregadoPorAluno` (batch, 1 query por chamada de board, não por item) pra saber quantas questões existem, quantas já têm `RespostaPontosObtidos` e a soma parcial de pontos:
  - `TarefaNota` já setada → **avaliado**, `Percentual = round(nota/10*100)` (igual ao fluxo atual).
  - `TarefaFeito=true` e sobra alguma discursiva sem corrigir → **aguardando_avaliacao**, `Percentual` = parcial ao vivo (pontos já resolvidos / pontos possíveis) — diferente do 100% fixo que digital/presencial usam aqui, decisão deliberada pra refletir "quanto já foi resolvido de fato".
  - Ainda respondendo (`TarefaFeito=false`, mas já existe alguma resposta, prazo não vencido) → **parcial** (reaproveita um Estado que hoje só conteúdo usa), `Percentual` ao vivo.
  - Prazo vencido e ainda `TarefaFeito=false` no momento da consulta (janela entre o vencimento e a próxima rodada do scheduler, que roda a cada 5 min) → **atrasado**, `Percentual` ao vivo (não mais fixo em 100, já que agora pontos parciais contam).
  - Nada respondido ainda → **sem_progresso**.
- `verificarPendencia`/`verificarPendenciaAgregada` — **sem mudança**, já são agnósticas de tipo (só olham `TarefaFeito`/`TarefaNota IS NULL`, que a lista popula com a mesma semântica).
- `buscarEstatisticasItem()` — novo branch `tarefa_lista` reaproveitando o mesmo `EstatisticaAlunoDTO[]` (Percentual calculado do jeito acima), pra ranking/média da turma continuar funcionando sem mudar o formato que o frontend já consome.
- **Método novo** `buscarEstatisticasPorQuestao(usuarioCPF, TarefaGUID, turmaGUID): Promise<EstatisticasPorQuestaoDTO>`:
  ```ts
  interface EstatisticaQuestaoDTO {
    QuestaoGUID: string; QuestaoOrdem: number; QuestaoEnunciadoResumo: string; QuestaoTipo: "objetiva"|"discursiva";
    PercentualAcerto: number; // objetiva: % que acertou (pontos=max); discursiva: média pontos/max
    RespostasPorAluno: { MatriculaGUID, AlunoNome, PontosObtidos: number|null, PontosMaximos: number, RespostaResumo: string }[];
  }
  interface EstatisticasPorQuestaoDTO { Questoes: EstatisticaQuestaoDTO[]; }
  ```

### 4.6 Controllers e rotas

`backend/controllers/tarefaacademica.controller.ts` — métodos novos espelhando o service: `criarQuestao`, `criarQuestoesBatch`, `atualizarQuestao`, `excluirQuestao`, `reordenarQuestoes`, `listarQuestoes`, `vincularAnexoQuestao`, `desvincularAnexoQuestao`, `responderObjetiva`, `responderDiscursiva`, `avaliarQuestaoDiscursiva`, `importarQuestoesPlanilha`.

`routes/tarefaacademica.routes.ts` (rotas específicas antes de `/:TarefaGUID`, mesma disciplina já usada pra `/batch`/`/matricula/:...`):
```
POST   /api/tarefa/:TarefaGUID/questoes
POST   /api/tarefa/:TarefaGUID/questoes/batch
POST   /api/tarefa/:TarefaGUID/questoes/importar
GET    /api/tarefa/:TarefaGUID/questoes
PUT    /api/tarefa/questoes/:QuestaoGUID
DELETE /api/tarefa/questoes/:QuestaoGUID
PATCH  /api/tarefa/:TarefaGUID/questoes/reordenar
POST   /api/tarefa/questoes/:QuestaoGUID/anexos
DELETE /api/tarefa/questoes/:QuestaoGUID/anexos/:AnexoGUID
POST   /api/tarefa/:TarefaGUID/questoes/:QuestaoGUID/responder-objetiva     { AlternativaGUID }
POST   /api/tarefa/:TarefaGUID/questoes/:QuestaoGUID/responder-discursiva   { Texto }
PATCH  /api/tarefa/respostas/:RespostaGUID/avaliar                          { Pontos }
```
`routes/categoriaconteudo.routes.ts` ganha `GET /api/categoria-conteudo/estatisticas-por-questao/:TarefaGUID/:turmaGUID`.

Upload de anexo de questão reaproveita o fluxo genérico que a tarefa digital já usa: `POST /api/anexo` (retorna `AnexoGUID`) → depois linka via `POST /api/tarefa/questoes/:QuestaoGUID/anexos {AnexoGUID}`. Não precisa de multer novo.

### 4.7 Middleware

`backend/middlewares/tarefaacademica.middleware.ts`:
- `TIPO_ENTREGA_VALID` → `["digital", "fisica", "lista"]`.
- Novo: `validateQuestaoCreateBody`, `validateQuestaoUpdateBody`, `validateResponderObjetivaBody`, `validateResponderDiscursivaBody`, `validateAvaliarQuestaoBody`, `validateImportarQuestoesBody` — mesmo estilo dos validators existentes (checagem manual + `ErrorResponse(400, ...)`, `GUID_REGEX` reaproveitado).

---

## 5. Frontend

### 5.1 Tipos/API clients
- `frontend/lib/api/tarefaacademica.api.ts` — `TarefaTipoEntrega: 'digital' | 'fisica' | 'lista'`. Funções novas (mesmo estilo raw-fetch-pra-proxy-Next que este arquivo já usa): `criarQuestao`, `listarQuestoes`, `atualizarQuestao`, `excluirQuestao`, `reordenarQuestoes`, `vincularAnexoQuestao`, `importarQuestoesPlanilha`.
- `frontend/lib/api/materiasmodulo.api.ts` — `ItemTipo` ganha `'tarefa_lista'`. Funções novas (mesmo estilo fetch-direto-no-backend que este arquivo já usa): `responderObjetiva`, `responderDiscursiva`, `avaliarQuestaoDiscursiva`, `buscarEstatisticasPorQuestao`. Tipos novos: `EstatisticaQuestao`, `EstatisticasPorQuestao`.

### 5.2 `TarefaForm.tsx` — construtor de questões

Novo estado local:
```ts
type QuestaoRascunho = {
  clientId: string;
  Enunciado: string;
  Tipo: 'objetiva' | 'discursiva';
  PontosMaximos: number;
  Explicacao: string;
  AnexosGUID: string[];
  Alternativas: { clientId: string; Texto: string; Correta: boolean; Pontos: number }[];
};
const [questoes, setQuestoes] = useState<QuestaoRascunho[]>([]);
const [modoQuestoes, setModoQuestoes] = useState<'manual' | 'planilha'>('manual');
```
- `<select>` de `TarefaTipoEntrega` ganha `<option value="lista">Lista de questões</option>`.
- Quando `lista` selecionado: nova seção com toggle "Adicionar manualmente" / "Importar de planilha". Manual = lista de questões com add/remover/reordenar, cada uma com enunciado, tipo, upload de anexo(s) (reaproveita o fluxo de anexo já usado no form), e pra objetiva um CRUD de alternativas (texto + pontos + rádio "é a correta").
- No submit: depois que `criarTarefa`/`atualizarTarefa` retorna o `TarefaGUID`, chama `criarQuestoesBatch` uma vez só (não N chamadas).
- Modo edição: se a tarefa já tem alguma resposta registrada (novo campo `TemRespostas: boolean` exposto por `buscarTarefa`/`listarQuestoes`), trava adicionar/remover questão e mudar `Tipo`; texto/pontos/explicação continuam editáveis.

### 5.3 `VisualizadorItemModal.tsx` — aluno + professor

- `carregarDetalhe()`: novo branch `item.Tipo === 'tarefa_lista'` — professor busca `listarQuestoes` (sem respostas embutidas); aluno busca `buscarQuestoesComRespostas` (questões + respostas próprias, pra retomar de onde parou).
- Visão do aluno (substitui o branch de checkbox/upload usado por presencial/digital): lista de cards por questão — objetiva com rádio (desabilitado e destacado certo/errado assim que responde, mostrando pontos na hora), discursiva com textarea + botão "Enviar resposta" (`responderDiscursiva`). Explicação da questão aparece assim que ela é resolvida (objetiva: na hora; discursiva: só depois que o professor corrige). Indicador "7 de 10 questões respondidas" reaproveitando o mesmo cálculo ao vivo do board.
- Aba de avaliação do professor: reaproveita o scaffolding de abas já existente (`Pendentes/Avaliados/Atrasados/Sem postagem`, `categorizarAluno()` sem mudança, já que `TarefaFeito`/`TarefaNota`/`TarefaAvaliadoPorCPF` continuam com o mesmo sentido). O painel de detalhe do aluno ganha a visão por questão: objetivas mostradas read-only com a nota automática já calculada; discursivas com a resposta do aluno + campo de pontos (limitado a `QuestaoPontosMaximos`), chamando `avaliarQuestaoDiscursiva` por questão — sem exigir que a tarefa inteira esteja "feita" primeiro.
- Painel de estatísticas: quando `tarefa_lista`, busca também `buscarEstatisticasPorQuestao` e mostra uma tabela extra (questão → % de acerto/média).
- `exportarEstatisticasExcel()`: pra lista, gera uma planilha achatada 1 linha por (aluno × questão) — colunas `Aluno, Questão nº, Enunciado (resumo), Tipo, Resposta, Pontos Obtidos, Pontos Máximos, % da Questão` — reaproveitando o mesmo `exportarParaExcel()` genérico (`frontend/lib/exportarExcel.ts`), só com um mapeamento novo antes de chamá-lo. A exportação atual (1 linha por aluno, agregado) continua igual pros outros tipos.

### 5.4 Importação por planilha

- Novo arquivo `frontend/components/materias/ImportarQuestoesPlanilha.tsx`, envolvendo `<BaseUploadPlanilha<QuestaoPlanilhaRow>>` (`frontend/components/gestao-dados/BaseUploadPlanilha.tsx`, já genérico, zero mudança nele) com `colunasEsperadas={['Enunciado','Tipo']}`.
- Formato da planilha (1 linha por questão, já que `BaseUploadPlanilha` só lê a primeira aba): `Enunciado, Tipo (Objetiva/Discursiva), Alternativa A..E, Pontos A..E (opcional), Correta (qual letra), Pontos Máximos (discursiva), Explicação (opcional)`.
- Fluxo igual ao já usado em Gestão de Dados (`gestao-dados/alunos/page.tsx`): preview das 5 primeiras linhas → botão "Importar todas" → mapeia pra `QuestaoImportRowDTO[]` → `importarQuestoesPlanilha` → mostra contagem + lista de erros por linha (mesmo formato de `BatchCreateResponse` que os outros imports já usam).
- Modelo pra download: gerado na hora via `exportarParaExcel` (reaproveitando o mesmo helper, só com uma linha de exemplo), em vez de um `.xlsx` estático versionado — mais simples de manter sincronizado se as colunas mudarem.
- `ModalResolverErros.tsx` (hoje não usado em lugar nenhum) fica de fora do escopo inicial — o padrão "alerta + lista de erros" já é o que todo import do sistema usa hoje.

### 5.5 Ícone

`frontend/components/Icon.tsx` — adicionar um glifo novo (`list` ou `clipboard`, estilo Feather) pro tipo lista — hoje não existe nenhum ícone que sirva bem (mais próximos: `layers`, `grid`, `check-circle`).

---

## 6. Pontos do código existente que precisam de um caso novo pra "lista"

1. `backend/services/categoriaconteudo.service.ts` — union `ItemTipo` + os 4 pontos com `Tipo === "tarefa_digital" || Tipo === "tarefa_presencial"`.
2. `frontend/lib/api/materiasmodulo.api.ts` — union `ItemTipo`.
3. `frontend/components/materias/EditarItemModal.tsx` — `TITULOS` (record exaustivo, o TS vai forçar a adicionar `tarefa_lista: 'Editar lista'`).
4. `TarefaTipoEntrega` (união `"digital"|"fisica"` → `+"lista"`) em 4 lugares: `backend/entities/tarefaacademica.model.ts` (setter), `backend/services/tarefaacademica.service.ts` (DTOs), `backend/middlewares/tarefaacademica.middleware.ts` (`TIPO_ENTREGA_VALID`), `frontend/lib/api/tarefaacademica.api.ts` (tipos).
5. `frontend/components/materias/VisualizadorItemModal.tsx` — dispatch de `item.Tipo` em `carregarDetalhe()` e nos blocos de render (aluno, avaliação, estatística, exportação).
6. `frontend/app/dashboard/[escolaGUID]/cadastro/TarefaForm.tsx` — `<select>` de tipo + seção nova do construtor de questões.

**Não precisa mudar**: `tarefaacademicanota.scheduler.ts` mantém `zerarTarefasVencidas()` intacto (só ganha um filtro `AND TarefaTipoEntrega != 'lista'` e um método novo do lado, ver Seção 4.4) — não é um rewrite.

---

## 7. Ordem de implementação (fases)

1. **Schema + CRUD de questão no backend** — migration, entidades, repositórios, `criarQuestao`/`listarQuestoes`/`atualizarQuestao`/`excluirQuestao`/`reordenarQuestoes` + anexo de questão + middleware. Testável via curl/Postman antes de existir qualquer UI.
2. **Construtor manual de questões no `TarefaForm.tsx`** — primeiro ponto em que um professor consegue criar uma lista de verdade ponta a ponta.
3. **Fluxo de resposta do aluno** — `responderObjetiva`/`responderDiscursiva` + branch do aluno em `VisualizadorItemModal.tsx` + Estado/Percentual ao vivo em `categoriaconteudo.service.ts`. Primeiro ponto em que a barra de progresso é testável de ponta a ponta.
4. **Fluxo de correção do professor** — `avaliarQuestaoDiscursiva` + `#tentarSettleTarefaLista` + extensão do scheduler (Seção 4.4) + painel de correção por questão em `VisualizadorItemModal.tsx`. Validar especificamente o caso "prazo vence com lista pela metade".
5. **Estatística + exportação Excel por questão** — `buscarEstatisticasPorQuestao` + painel de stats + mapeador de exportação novo.
6. **Importação por planilha** — `importarQuestoesPlanilha` + `ImportarQuestoesPlanilha.tsx` + modelo de download. Fica por último porque é aditivo em cima do `criarQuestoesBatch` já validado nas fases 1-2.

---

## 8. Verificação

- Depois de cada fase: `tsc --noEmit` no backend (raiz) e no frontend, e `next build` antes de fechar a fase (padrão já seguido nesta sessão).
- Fase 1: criar uma tarefa lista via curl com 2 questões objetivas + 1 discursiva, confirmar leitura via `GET /api/tarefa/:GUID/questoes`.
- Fase 3: como aluno, responder as objetivas e conferir que `Percentual` no board sobe imediatamente (sem esperar nada do professor); responder a discursiva e conferir que o estado vira "aguardando_avaliacao" só nessa questão.
- Fase 4: caso crítico — criar uma lista com prazo bem próximo, responder só parte das questões, esperar o scheduler rodar (ou disparar manualmente), e confirmar que os pontos das respondidas foram mantidos e só as em branco viraram 0 (a decisão confirmada com o usuário, Seção 1). Confirmar também que `zerarTarefasVencidas()` original não tocou nenhuma linha de lista (só o método novo tocou).
- Fase 5: exportar a planilha por questão e conferir manualmente as colunas/pontuação de 1 aluno.
- Fase 6: importar uma planilha de teste com uma linha inválida (ex: nenhuma alternativa marcada como correta) e confirmar que o erro aparece por linha sem derrubar a importação das linhas válidas.
- Migration: como sempre nesta sessão, rodar primeiro contra o banco de produção só com confirmação explícita do usuário para aquela operação específica, depois de checar a collation real de `anexo.AnexoGUID`.
