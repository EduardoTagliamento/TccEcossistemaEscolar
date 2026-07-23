# 📋 PLANO DE IMPLEMENTAÇÃO — Módulo Matérias (Sala de Aula)

**Data:** 2026-07-23
**Status:** Spec-first — aguardando revisão do usuário antes de iniciar o código
**Referências visuais:** `frontend/refs/Tela_materias_ref.png` (grid de matérias/cadernos), `frontend/refs/Tela_categoria_ref.png` (categorias + progresso)

---

## 0. O que já existe (não duplicar)

Levantamento feito diretamente no código antes de desenhar este spec:

| Peça | Já existe? | Onde |
|---|---|---|
| `Materia`, `Turma`, `Curso`, `Matricula` (CRUD completo) | ✅ | `backend/{entities,repositories,services,controllers}/*`, `routes/*.routes.ts` |
| `MateriaxProfessorxTurma` (professor leciona matéria X na turma Y) | ✅ | `backend/entities/materiaxprofessorxturma.model.ts` — só `AlocacaoStatus` (Ativa/Inativa), sem datas |
| `TarefaAcademica` + `TarefaAcademicaMatricula` (tarefa digital/física, por turma) | ✅ | já dispara `tarefa_postada`; "entrega" hoje = booleano `TarefaFeito` + endpoint de anexo já existente (`POST /:TarefaGUID/anexo-entrega`) |
| `Conteudo` + `ConteudoTurma` + 3 tabelas de payload (`ConteudoCronometrado`=vídeo, `ConteudoTexto`, `ConteudoPaginadoArquivo`=galeria) | ✅ | os 3 tipos já batem 1:1 com "conteúdo: vídeo/texto/imagem" pedidos aqui |
| `ProvaAgendada` + `ProvaAgendadaTurma` | ✅ | sem campo de nota |
| `CategoriaConteudo` (categoria por professor+matéria) | ✅ parcial | **sem campo `Ordem`** (hoje ordena por nome, alfabético), **sem vínculo com Tarefa/Prova** (só `Conteudo.CategoriaGUID` existe) |
| Upload de vídeo/imagem/documento pro conteúdo (R2 + multer, até 150MB) | ✅ | `backend/middlewares/conteudo-upload.middleware.ts` — reaproveitar como está |
| Progresso do aluno (vídeo assistido, páginas vistas, texto lido) | ❌ | comentários no próprio código já avisam "fora de escopo deste módulo" — **é 100% novo** |
| Nota de tarefa (`TarefaNota`) | ❌ | novo |
| Nota de prova (`prova_nota`) | ❌ | **fora de escopo desta fase** (usuário pediu só data+conteúdo pra prova agora, IA fica em stand-by) |
| Tela de consumo de conteúdo pelo aluno (player, leitor, galeria) | ❌ | não existe nenhuma rota/tela hoje — só a tela de autoria do professor (`cadastro/ConteudoForm.tsx`) |
| Capa/cor customizável de Matéria ou Turma | ❌ | novo |
| Ícone "Matérias" na navbar | ❌ | novo — navbar já tem o padrão de gating por `funcoesEscola` pra copiar |
| Drag-and-drop no frontend | ✅ (nativo, sem lib) | `gestao-dados/turmas/[turmaGUID]/cronograma/page.tsx` já implementa arrastar-e-soltar com a API nativa do HTML5 (`draggable`/`onDragStart`/`onDragOver`/`onDrop`) — sem `dnd-kit`/`react-beautiful-dnd` nem nada instalado. Reaproveitar o mesmo padrão pra reordenar categoria, **sem** adicionar dependência nova. |
| Extração de cor dominante de imagem | ❌ | não existe nenhuma lib (nem client nem server) — precisa adicionar dependência |
| Scheduler/cron (`node-cron`) | ✅ | já usado em `backend/services/{auditoria,notificacao,cleanup}.scheduler.ts` — copiar o padrão pro job de nota automática |

---

## 1. Visão geral

Novo módulo "Matérias" — a sala de aula de verdade. Ícone novo na navbar, visível para **Professor** e **Aluno** (não Secretaria/Coordenação/Direção/Responsável), com fluxos de navegação diferentes:

- **Aluno:** ícone → grade de cards de matérias (uma por matéria que ele cursa) → clica → tela de categorias daquela matéria (já sabe a turma dele, não precisa escolher).
- **Professor:** ícone → se leciona só 1 matéria, pula direto pra seleção de turma; se leciona mais de uma, mostra grade de cards de matéria → escolhe → grade de cards de turma → escolhe → tela de categorias daquela turma.

Dentro da tela de categorias: categorias na ordem configurada pelo professor, cada uma com os itens (tarefa/prova/conteúdo) que foram organizados nela, cada item com uma barrinha de progresso.

## 2. Escopo desta fase vs. adiado

**Dentro do escopo:**
- Ícone de navbar + as 3 telas de navegação (matérias/turmas/categorias) pros dois papéis
- Capa + cor customizável de Matéria (por professor) e de Turma (pelo representante)
- Sistema de categorias com ordem manual (drag-and-drop), compartilhado por tarefa/prova/conteúdo
- Modal "+" (criar conteúdo/tarefa/prova já com matéria/turma/categoria pré-selecionados)
- Progresso por aluno: vídeo (tempo assistido), imagem (páginas vistas), texto (instantâneo)
- Tarefa digital e presencial: submissão, nota manual do professor, nota automática 0 quando vence o prazo sem entrega
- Seção nova no dashboard: "tarefas pendentes" (aluno) e "avaliações pendentes" (professor)
- Indicador vermelho de pendência em matéria/turma (aluno: tem tarefa a fazer; professor: tem algo pra corrigir)

**Fora de escopo / adiado (conforme o próprio usuário sinalizou):**
- Lançamento de nota de prova (`prova_nota`) — prova nesta fase é só leitura (data + conteúdo)
- Recomendação de estudo por IA — "fica em stand-by"
- `tarefa: lista` (7º tipo) — mencionado como "futuramente", não entra agora
- Qualquer geração automática de miniatura/thumbnail de vídeo

## 3. Decisões assumidas (⚠️ revisar antes de codar)

Coisas que o pedido original não deixa 100% explícito — assumi a leitura mais consistente com o que já existe no código, mas são pontos de retorno rápido se eu tiver entendido errado:

1. **Capa/cor/mensagem de boas-vindas da matéria é por (Matéria, Professor)**, não por matéria isolada nem por alocação turma-a-turma — porque o mesmo professor pode lecionar a mesma matéria em turmas diferentes e quer uma identidade visual consistente entre elas (o "lápis" de editar aparece na tela de seleção de turma, que já é escopada por matéria+professor). Nova tabela: `MateriaCustomizacao` (chave única `MateriaGUID + UsuarioCPF`).
2. **Capa/cor da turma é um campo direto na tabela `turma`** (não por matéria) — é "a foto da turma", compartilhada entre todas as matérias, do jeito que o representante já é um conceito por turma (mesmo papel que já gerencia grupo/vice-representante no chat).
3. **Categoria é por (Professor, Matéria, Turma)** — ⚠️ **revisado após feedback do usuário**: inicialmente pensei em compartilhar a categoria entre todas as turmas do professor pra uma matéria (é como `CategoriaConteudo` funciona hoje, só por professor+matéria). Mudei pra incluir `TurmaGUID` no escopo porque uma função futura vai deixar o **representante da turma** também criar categoria própria — se fosse compartilhado entre turmas, uma categoria criada pelo representante da Turma A vazaria pra Turma B do mesmo professor/matéria, o que não faz sentido.
   **Consequência arquitetural:** `Conteudo` e `ProvaAgendada` são criados uma vez e distribuídos pra N turmas via `ConteudoTurma`/`ProvaAgendadaTurma` (fan-out). Com categoria por turma, ela não pode mais morar no `Conteudo`/`ProvaAgendada` em si (um mesmo conteúdo pode estar em categorias diferentes em turmas diferentes) — o campo `CategoriaGUID` precisa ir pras tabelas de distribuição (`ConteudoTurma.CategoriaGUID`, `ProvaAgendadaTurma.CategoriaGUID`), não pro item em si. `TarefaAcademica` não muda — já é de turma única, mantém `CategoriaGUID` direto nela.
   **Migração de dados existentes:** como `CategoriaConteudo` já é usado em produção (professor+matéria, sem turma), a migration precisa, pra cada categoria existente, duplicá-la por turma — uma linha nova por cada turma ativa onde aquele professor leciona aquela matéria (via `MateriaxProfessorxTurma`), preservando o nome. Os `ConteudoTurma` existentes apontam pra `Conteudo.CategoriaGUID` antigo; o script de migração precisa reatribuir cada linha de `ConteudoTurma` pra copia da categoria que corresponde à turma daquela linha. **Isso é uma migração de dados, não só de schema — peço confirmação de que faz sentido antes de rodar em produção, já que mexe em dado real (ver seção 10).**
4. **Tarefa continua de turma única na criação a partir do "+"** (replica o comportamento que já existe hoje — `TarefaAcademica` já é 1 turma por linha) — o aviso mencionado pelo usuário ("só será implementado pra essa turma") cobre exatamente esse caso pra Conteúdo/Prova, que hoje suportam multi-turma no formulário genérico mas ficam restritos a 1 turma quando abertos a partir do "+" de dentro de uma turma específica.
5. **Nota da tarefa presencial e digital: um único campo `TarefaNota` (0.00–10.00, nullable)** em `TarefaAcademicaMatricula`. Auto-zero via job a cada 5 minutos, alinhado ao relógio (`*/5 * * * *` — roda em :00, :05, :10... nunca em horário quebrado), que zera quem passou do prazo sem entregar/marcar. Decisão revisada: descartei tanto "1x por dia" (atraso de até 24h é ruim pro aluno/professor ver o resultado) quanto "agendamento exato por tarefa" (via `setTimeout` teria estouro de delay acima de ~24,8 dias e perderia os agendamentos a cada redeploy da Railway) — o polling a cada 5 min some com os dois problemas e ainda fica dentro da granularidade que o usuário já usa pra marcar prazo (horários redondos).
6. **Limiar de "vídeo concluído"**: assisti ≥95% conta como 100% (evita depender de bater exatamente no frame final, incluindo eventuais créditos finais). Ajustável depois.
7. **Consumo de conteúdo/tarefa/prova abre em modal**, não em rota própria — mantém o aluno/professor no contexto da tela de categorias (é a leitura mais direta de "ao clicar, abrirá...").
8. **Quem pode trocar a foto da turma**: representante ou vice-representante daquela turma (papel já existe em `ConversaGrupoMembro.cargo`, gerenciado hoje pelo `GerenciarGrupoModal` do chat) + Coordenação/Direção como fallback administrativo.
9. Extração de "cor predominante" da imagem: feita **no backend**, no momento do upload (mais simples que replicar em cada cliente, evita mismatch entre navegadores). Precisa de uma lib de processamento de imagem (`sharp`, ou similar) — dependência nova no backend.

## 4. Modelo de dados

Uma migration nova (`backend/database/migrations/2026-07-24-materias-modulo.sql`) cobrindo tudo abaixo.

### 4.1 Novas tabelas

```sql
-- Identidade visual da matéria, por professor
CREATE TABLE materiacustomizacao (
  MateriaCustomizacaoGUID CHAR(36) PRIMARY KEY,
  MateriaGUID CHAR(36) NOT NULL,
  UsuarioCPF VARCHAR(14) NOT NULL,
  ImagemUrl VARCHAR(500) NULL,
  CorFundo VARCHAR(7) NULL,          -- hex; NULL = usa a cor da escola como padrão
  MensagemBoasVindas VARCHAR(500) NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_materiacustomizacao (MateriaGUID, UsuarioCPF),
  FOREIGN KEY (MateriaGUID) REFERENCES materia(MateriaGUID),
  FOREIGN KEY (UsuarioCPF) REFERENCES usuario(UsuarioCPF)
);

-- Progresso de consumo de Conteudo por matrícula (resumo, cobre os 3 tipos)
CREATE TABLE conteudoprogresso (
  ConteudoProgressoGUID CHAR(36) PRIMARY KEY,
  ConteudoGUID CHAR(36) NOT NULL,
  MatriculaGUID VARCHAR(36) NOT NULL,
  PercentualConcluido TINYINT UNSIGNED NOT NULL DEFAULT 0,
  UltimaPosicaoSegundos INT NULL,     -- só vídeo, ponto de retomada
  ConcluidoEm DATETIME NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_conteudoprogresso (ConteudoGUID, MatriculaGUID),
  FOREIGN KEY (ConteudoGUID) REFERENCES conteudo(ConteudoGUID),
  FOREIGN KEY (MatriculaGUID) REFERENCES matricula(MatriculaGUID)
);

-- Granularidade de página vista (galeria de imagens/paginado) — alimenta o % acima
CREATE TABLE conteudopaginadovisualizacao (
  ConteudoPaginadoVisualizacaoGUID CHAR(36) PRIMARY KEY,
  ConteudoPaginadoArquivoGUID CHAR(36) NOT NULL,
  MatriculaGUID VARCHAR(36) NOT NULL,
  VisualizadoEm DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_paginavisualizacao (ConteudoPaginadoArquivoGUID, MatriculaGUID),
  FOREIGN KEY (ConteudoPaginadoArquivoGUID) REFERENCES conteudopaginadoarquivo(ConteudoPaginadoArquivoGUID),
  FOREIGN KEY (MatriculaGUID) REFERENCES matricula(MatriculaGUID)
);

-- Visualização de prova por aluno — igual texto, só marca "já vi" (sem relação com nota)
CREATE TABLE provaagendadavisualizacao (
  ProvaAgendadaVisualizacaoGUID CHAR(36) PRIMARY KEY,
  ProvaAgendadaTurmaGUID CHAR(36) NOT NULL,
  MatriculaGUID VARCHAR(36) NOT NULL,
  VisualizadoEm DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_provavisualizacao (ProvaAgendadaTurmaGUID, MatriculaGUID),
  FOREIGN KEY (ProvaAgendadaTurmaGUID) REFERENCES provaagendadaturma(ProvaAgendadaTurmaGUID),
  FOREIGN KEY (MatriculaGUID) REFERENCES matricula(MatriculaGUID)
);
```

### 4.2 Alterações em tabelas existentes

```sql
-- Capa/cor da turma (compartilhada entre matérias)
ALTER TABLE turma
  ADD COLUMN TurmaImagemUrl VARCHAR(500) NULL AFTER TurmaStatus,
  ADD COLUMN TurmaCorFundo VARCHAR(7) NULL AFTER TurmaImagemUrl;

-- Categoria: ganha Ordem (drag-and-drop) e TurmaGUID (escopo revisado — ver decisão #3)
ALTER TABLE categoriaconteudo
  ADD COLUMN Ordem INT NOT NULL DEFAULT 0 AFTER CategoriaNome,
  ADD COLUMN TurmaGUID CHAR(36) NULL AFTER MateriaGUID, -- populado no backfill abaixo, depois vira NOT NULL
  ADD FOREIGN KEY (TurmaGUID) REFERENCES turma(TurmaGUID);

-- Tarefa é de turma única — CategoriaGUID direto nela, sem mudança de escopo
ALTER TABLE tarefaacademica
  ADD COLUMN CategoriaGUID CHAR(36) NULL AFTER matXprofXturxescGUID,
  ADD FOREIGN KEY (CategoriaGUID) REFERENCES categoriaconteudo(CategoriaGUID);

-- Conteudo e Prova são fan-out (1 item → N turmas) — categoria vai na tabela de distribuição,
-- não no item em si, já que a mesma categoria agora é por turma
ALTER TABLE conteudoturma
  ADD COLUMN CategoriaGUID CHAR(36) NULL AFTER TurmaGUID,
  ADD FOREIGN KEY (CategoriaGUID) REFERENCES categoriaconteudo(CategoriaGUID);

ALTER TABLE provaagendadaturma
  ADD COLUMN CategoriaGUID CHAR(36) NULL AFTER TurmaGUID,
  ADD FOREIGN KEY (CategoriaGUID) REFERENCES categoriaconteudo(CategoriaGUID);

-- Nota de tarefa (digital e presencial)
ALTER TABLE tarefaacademicamatricula
  ADD COLUMN TarefaNota DECIMAL(4,2) NULL AFTER TarefaFeito,
  ADD COLUMN TarefaAvaliadoEm DATETIME NULL AFTER TarefaNota,
  ADD COLUMN TarefaAvaliadoPorCPF VARCHAR(14) NULL AFTER TarefaAvaliadoEm,
  ADD FOREIGN KEY (TarefaAvaliadoPorCPF) REFERENCES usuario(UsuarioCPF);
```

`Conteudo.CategoriaGUID` e `ProvaAgendada` seguem sem esse campo (nunca tiveram, no caso de Prova) — `Conteudo.CategoriaGUID` existente **fica intocado como está** (não removo coluna em uso), só passa a ser ignorado pelo código novo em favor de `ConteudoTurma.CategoriaGUID`. Isso evita um `DROP COLUMN` arriscado; pode ser limpo numa migração futura depois que a troca for validada em produção.

### 4.3 Backfill de dados (categoria: professor+matéria → professor+matéria+turma)

Script de migração (não é só DDL) a rodar logo após o `ALTER TABLE` acima, antes de tornar `categoriaconteudo.TurmaGUID` obrigatório:

1. Para cada `CategoriaConteudo` existente (hoje só tem `UsuarioCPF + MateriaGUID + CategoriaNome`), buscar todas as turmas onde esse professor está **ativamente alocado** naquela matéria (`MateriaxProfessorxTurma` com `AlocacaoStatus='Ativa'`).
2. Criar uma cópia da categoria por turma encontrada (mesmo nome, mesma posição relativa vira a `Ordem` inicial), e atualizar a linha original para apontar pra primeira turma (evita duplicar a mesma linha sem necessidade) ou substituí-la inteiramente por N linhas novas + apagar a antiga — a decidir no momento da migration, dependendo de quantos dados reais já existem em produção (**checar via agente `mysql` antes de rodar**, igual foi feito nas migrations anteriores desta sessão).
3. Para cada `ConteudoTurma` que apontava (indiretamente, via `Conteudo.CategoriaGUID`) pra uma categoria antiga, gravar em `ConteudoTurma.CategoriaGUID` a cópia correspondente à turma daquela linha.
4. Idem para `ProvaAgendadaTurma`, caso exista uso de categoria em prova (hoje não existe, então esse passo provavelmente é no-op).

Nenhuma tabela existente perde dado — tudo aditivo (colunas nullable, cópias em vez de deleção). Migração é retrocompatível, mas **o passo 1-2 mexe em dado real de produção e deve ser confirmado antes de rodar** (ver seção 10).

## 5. Backend — mudanças por camada

Seguindo sempre `Middleware → Controller → Service → DAO → Database`, DTOs obrigatórios, `#campo` privado, log por emoji, `ErrorResponse` + `next(error)`.

### 5.1 Módulo novo: `MateriaCustomizacao`
- `backend/entities/materiacustomizacao.model.ts` — entidade padrão (getters/setters validando URL/hex/tamanho de mensagem).
- `backend/repositories/materiacustomizacao.repository.ts` — `create`, `findByMateriaEProfessor`, `update`, `findAll` (filtro `MateriaGUID`, pra montar o grid do aluno com N professores).
- `backend/services/materiacustomizacao.service.ts` — `salvarCustomizacao(MateriaGUID, UsuarioCPF, {imagem?, cor?, mensagem?})` (upsert), incluindo:
  - upload da imagem via `R2StorageService` (chave `materias/{MateriaGUID}/{UsuarioCPF}/capa-{timestamp}{ext}`)
  - se imagem enviada e sem cor explícita: extrai cor dominante (nova dependência de processamento de imagem) e salva em `CorFundo`
  - se não há customização ainda: fallback é `EscolaCorPriEs` (cor primária da escola já existente em `escola`)
- `backend/middlewares/materia-upload.middleware.ts` — multer novo, reaproveitando os mesmos `ALLOWED_MIME_TYPES` de imagem do `upload.middleware.ts`, mas com limite maior (ex.: 5MB — card de capa é mais exigente que avatar de perfil).
- `backend/controllers/materiacustomizacao.controller.ts` + `routes/materiacustomizacao.routes.ts`: `PUT /api/materia/:MateriaGUID/customizacao` (professor autenticado, valida que é ele mesmo alocado naquela matéria), `GET /api/materia/:MateriaGUID/customizacao?UsuarioCPF=` (opcional, resolve pro professor específico), `GET /api/materia/:MateriaGUID/customizacoes` (todas — usado pelo grid do aluno).

### 5.2 `Turma` — capa/cor
- Estende `turma.service.ts` com `atualizarCapa(TurmaGUID, usuarioCPF, {imagem?, cor?})`:
  - valida que `usuarioCPF` é Representante/Vice-Representante da turma (checar `ConversaGrupoMembroDAO`) OU Coordenação/Direção ativa na escola
  - mesmo fluxo de upload+extração de cor do item anterior, mas grava direto em `turma.TurmaImagemUrl`/`TurmaCorFundo`
- Novo endpoint: `PUT /api/turma/:TurmaGUID/capa` (rota nova em `routes/turma.routes.ts`, reaproveitando `TurmaController`).

### 5.3 `CategoriaConteudo` — ordem + escopo por turma
- `categoriaconteudo.repository.ts`: `findAll` passa a filtrar também por `TurmaGUID` (além de `UsuarioCPF`/`MateriaGUID`) e ordenar `ORDER BY Ordem ASC` (em vez de alfabético); novo método `updateOrdem(lista: {CategoriaGUID, Ordem}[])` (transação, batch update, escopado a uma turma).
- `categoriaconteudo.service.ts`: `criarCategoria` passa a exigir também `TurmaGUID` e calcular `Ordem = max(Ordem existente NAQUELA turma) + 1`; novo método `reordenarCategorias(usuarioCPF, MateriaGUID, TurmaGUID, ordemGUIDs: string[])` — valida que todos os GUIDs pertencem àquele professor+matéria+turma antes de aplicar. Permissão de criar/reordenar: professor alocado ali **ou** representante/vice-representante daquela turma (a função mencionada pelo usuário como "a ser debatida depois" — deixo o hook de permissão pronto, mas o botão de criar categoria pelo representante só entra em fase futura).
- Novo endpoint: `PATCH /api/categoriaconteudo/reordenar` (body: `{MateriaGUID, TurmaGUID, ordem: string[]}`).

### 5.4 `TarefaAcademica`, `ConteudoTurma` e `ProvaAgendadaTurma` — categoria
- `TarefaAcademica`: middleware/service passam a aceitar `CategoriaGUID` opcional no create/update, validando que a categoria pertence ao professor autor + matéria + **a mesma turma** da tarefa (já é 1 turma só, então a checagem é direta).
- `ConteudoTurma`/`ProvaAgendadaTurma`: a atribuição de categoria deixa de acontecer no create do `Conteudo`/`ProvaAgendada` em si e passa a ser por linha de distribuição — `conteudo.service.ts`/`provaagendada.service.ts` passam a aceitar um `CategoriaGUID` por turma selecionada (ex.: `TurmasGUID: [{TurmaGUID, CategoriaGUID?}]` em vez de só `string[]`), cada um validado contra a categoria daquela turma específica.

### 5.5 Nota de tarefa
- `tarefaacademica.service.ts`: novo método `avaliarTarefa(TarefaMatriculaGUID, nota: number, professorCPF)` — valida professor é o autor da tarefa (via `matXprofXturxescGUID`), valida `0 <= nota <= 10`, grava `TarefaNota`/`TarefaAvaliadoEm`/`TarefaAvaliadoPorCPF`, dispara notificação `tarefa_avaliada` (já existe no catálogo) pro aluno.
- Novo endpoint: `PATCH /api/tarefaacademica/matricula/:TarefaMatriculaGUID/avaliar`.
- **Novo scheduler** `backend/services/tarefaacademicanota.scheduler.ts` (mesmo padrão de `cleanup.scheduler.ts`): roda a cada 5 minutos, alinhado ao relógio (`*/5 * * * *` — sempre em :00/:05/:10.../:55, nunca em horário quebrado), busca `TarefaAcademicaMatricula` com prazo vencido (considerando `TarefaPrazoDataMatricula` quando houver override por aluno), `TarefaFeito=false`, `TarefaNota IS NULL`, seta `TarefaNota=0`, `TarefaAvaliadoEm=now`, `TarefaAvaliadoPorCPF=null` (indica automático), dispara `tarefa_avaliada` em lote.
- Registrar o novo scheduler em `Server.ts`, junto dos outros 3 já existentes.

### 5.6 Progresso de conteúdo (e de prova)
- Novo módulo `conteudoprogresso` (entity/repository/service/controller/routes):
  - `registrarProgressoVideo(ConteudoGUID, MatriculaGUID, segundosAssistidos, duracaoTotal)` — upsert, calcula percentual, aplica limiar de 95% → 100.
  - `registrarVisualizacaoPagina(ConteudoPaginadoArquivoGUID, MatriculaGUID)` — insert idempotente na tabela granular + recalcula `conteudoprogresso.PercentualConcluido` = distintas páginas vistas / total de páginas daquele conteúdo.
  - `registrarLeituraTexto(ConteudoGUID, MatriculaGUID)` — upsert direto pra 100%, `ConcluidoEm=now`.
  - `buscarProgresso(ConteudoGUID, MatriculaGUID)` — pro frontend saber onde retomar o vídeo / o que já foi visto.
- Endpoints: `POST /api/conteudo/:guid/progresso/video`, `POST /api/conteudo/:guid/progresso/pagina`, `POST /api/conteudo/:guid/progresso/texto`, `GET /api/conteudo/:guid/progresso`.
- **Prova** ganha o mesmo tratamento de "texto" (100% instantâneo ao abrir), só que numa tabela própria (`provaagendadavisualizacao`, seção 4.1) já que ela não é um `Conteudo`: novo método em `provaagendada.service.ts`, `registrarVisualizacao(ProvaAgendadaTurmaGUID, MatriculaGUID)` — upsert idempotente, sem relação nenhuma com nota (que segue fora de escopo). Endpoint: `POST /api/provaagendadaturma/:guid/visualizar`.

### 5.7 Agregações para as novas telas

| Endpoint novo | Uso |
|---|---|
| `GET /api/materia/aluno/:usuarioCPF?EscolaGUID=` | grid de matérias do aluno — junta `Matricula` ativa → `MateriaxProfessorxTurma` da turma dele → `Materia` + `MateriaCustomizacao` do professor responsável |
| `GET /api/professor/:cpf/materias-com-capa?EscolaGUID=` | grid de seleção de matéria do professor (reaproveita `GET /api/professor/materias` já existente + junta customização) |
| `GET /api/professor/:cpf/materia/:materiaGUID/turmas-com-capa` | grid de seleção de turma (reaproveita `MaterialProfessorTurmaDAO.findByProfessor` filtrado por matéria + junta capa da turma) |
| `GET /api/materia/:materiaGUID/turma/:turmaGUID/categorias-completas` | tela de categorias: categorias em ordem + itens (tarefa/prova/conteúdo) de cada uma, já com progresso/nota resolvidos pro usuário autenticado |
| `GET /api/tarefaacademica/pendentes-aluno?UsuarioCPF=` | dashboard aluno: tarefas com prazo no futuro e não feitas (explicitamente **não** inclui atrasadas nem já enviadas, conforme pedido) |
| `GET /api/tarefaacademica/pendentes-avaliacao-professor?UsuarioCPF=` | dashboard professor: tarefas enviadas/marcadas, `TarefaNota IS NULL` |
| `GET /api/materia/:materiaGUID/turma/:turmaGUID/tem-pendencia?UsuarioCPF=` | indicador vermelho — aluno: tem tarefa a fazer nessa matéria/turma; professor: tem algo pra corrigir |

Todos esses são **métodos de agregação em services já existentes** (`MateriaService`, `ProfessorService`, `TarefaAcademicaService`) — não precisam de tabela nova, só de queries a mais.

## 6. Frontend

### 6.1 Navbar
`DashboardNavbar.tsx` — novo item no array `modulosNav`, gated por `isProfessor || isAluno`, ícone de livro (`book-open`, já existe no set de ícones usado em `gestao-dados/materias`). Badge vermelho quando `tem-pendencia` for verdadeiro em qualquer matéria/turma do usuário (reaproveita o padrão que já existe pro contador de pendências).

### 6.2 Rotas novas (App Router)

```
/dashboard/[escolaGUID]/materias
  → Aluno: renderiza o grid de matérias (Tela_materias_ref.png) direto
  → Professor, 1 matéria só: redirect automático pra .../materias/[materiaGUID]/turmas
  → Professor, N matérias: renderiza grid de matérias (mesmo componente de card, dados diferentes)

/dashboard/[escolaGUID]/materias/[materiaGUID]/turmas
  → só professor. Grid de cards de turma + filtro + botão "+" (novo conteúdo/tarefa/prova,
    sem turma pré-fixada ainda) + lápis (editar capa/cor/mensagem da matéria)

/dashboard/[escolaGUID]/materias/[materiaGUID]/turmas/[turmaGUID]
  → tela de categorias (Tela_categoria_ref.png), compartilhada entre aluno e professor
  → Aluno chega aqui direto do card de matéria (turmaGUID resolvido no cliente, via a matrícula ativa dele — não escolhe)
  → fundo desfocado: imagem da MATÉRIA+PROFESSOR pro aluno, imagem da TURMA pro professor
  → "+" por categoria (só professor) abre o modal sem backdrop pra escolher prova/tarefa/conteúdo,
    com aviso "só será aplicado a esta turma"
```

### 6.3 Componentes novos

- `MateriaTurmaCard` — card compartilhado (capa em cima, faixa de cor embaixo com nome + avatar circular do professor à direita); usado tanto pra matéria quanto pra turma, só troca os dados.
- `FiltroMateriaTurma` — busca por nome/professor (grid de matérias e de turmas).
- `CategoriaSecao` — bloco empilhado (não é Kanban — é lista vertical, conforme a referência), com handle de arrastar (drag reordena `Ordem` via `PATCH /reordenar`) e "+" no canto do professor.
- `ItemProgressoBar` — barra reutilizável, recebe `{percentual, cor}` ou um `estado` enum (`pendente | concluido | atrasado | aguardandoAvaliacao | avaliado(nota)`) que resolve a cor internamente (ver seção 7).
- `NovoItemModal` (o "+") — sem backdrop, replica os 3 formulários já existentes (`ConteudoForm`, mais os equivalentes de tarefa/prova que hoje vivem em `/cadastro`), pré-preenchendo `MateriaGUID`/`CategoriaGUID`/`TurmaGUID`.
- `EditarMateriaModal` (o lápis) — upload de capa, color picker (com opção "usar cor da escola"), textarea de mensagem de boas-vindas.
- Visualizadores (abrem como modal ao clicar no item): `VisualizadorVideo` (player HTML5 nativo ou iframe do YouTube conforme `OrigemTipo`, reporta progresso periodicamente), `VisualizadorImagens` (galeria com paginação, registra página vista a cada troca), `VisualizadorTexto` (renderiza o HTML sanitizado, marca 100% no `onMount`), `VisualizadorTarefa` (nome/descrição/prazo, checkbox pra presencial, upload de anexo pra digital, lista de alunos + campo de nota pro professor), `VisualizadorProva` (somente leitura: data + descrição; marca "já vi" — 100% — no `onMount`, igual ao texto).

### 6.4 Dependências novas do frontend
- **Nenhuma.** Drag-and-drop reaproveita a implementação nativa (HTML5 Drag and Drop API) já usada em `cronograma/page.tsx` — mesmos handlers (`draggable`, `onDragStart`, `onDragOver`, `onDrop`), sem instalar `dnd-kit` nem qualquer lib de terceiro.
- Player de vídeo também sem lib nova — `<video>` nativo cobre upload próprio; YouTube via `<iframe>` simples com a API de embed padrão (sem SDK extra).

### 6.5 Dependência nova do backend
- Extração de cor dominante: **`sharp`** (já é praticamente padrão de mercado pra manipulação de imagem em Node, também serviria de base se um dia quisermos gerar thumbnails).

## 7. Máquina de estado da barra de progresso

| Situação | Cor/estado da barra |
|---|---|
| Conteúdo texto — sempre que aberto | 100% verde (instantâneo) |
| Conteúdo vídeo/imagem — parcialmente consumido | verde proporcional ao % assistido/visto + cinza no resto |
| Conteúdo vídeo/imagem — ≥95% (vídeo) ou 100% das páginas (imagem) | 100% verde |
| Tarefa — antes do prazo, sem entrega/checkbox ainda | sem progresso (barra vazia/cinza) |
| Tarefa — entregue (digital) ou marcada (presencial), aguardando correção | 100% amarelo (trocado de laranja — amarelo é mais convencional pra "pendente/aguardando") |
| Tarefa — prazo vencido, sem entrega/checkbox | 100% vermelho + ícone de cadeado; `TarefaNota` vira 0 automaticamente |
| Tarefa — corrigida (qualquer nota) | verde proporcional à nota (nota/10 × 100%) + vermelho no resto |
| Prova — antes de abrir | sem progresso (barra vazia/cinza) |
| Prova — depois de abrir/clicar (qualquer aluno) | 100% verde, instantâneo — igual texto, só marca "já vi", sem relação com nota (fora de escopo) |

## 8. Notificações e auditoria

### 8.1 Notificações
Nada novo no **catálogo** — `materia_postada`/`prova_postada`/`tarefa_postada` (conteúdo novo) já existem e já são emitidas. **Correção após checagem:** `tarefa_avaliada` (título já seedado: "Professor avaliou sua tarefa", role Aluno) **existe no catálogo mas não é disparada em lugar nenhum hoje** — não tem grading feature ainda, então nunca foi usada. Este módulo é quem efetivamente vai **disparar** essa notificação pela primeira vez, nos dois casos:
- Professor avalia manualmente (`avaliarTarefa`) → dispara pro aluno.
- Scheduler zera automaticamente por prazo vencido (seção 5.5) → dispara em lote pro aluno também, com mensagem indicando que foi automático (evita confundir com uma correção manual).

### 8.2 Auditoria — pontos estratégicos
Segue o padrão já usado em `conteudo.service.ts` (`getAuditoriaService().registrar(...)`, nunca lança erro, `UsuarioCPFAtor` opcional pra ações automáticas de sistema). Todos os pontos abaixo usam `CategoriaAuditoriaId=2` ("Operacional" — já é a categoria usada pra conteúdo/tarefa/prova/matérias/turmas hoje):

| Ação | Quando registrar | `UsuarioCPFAtor` |
|---|---|---|
| Nota de tarefa atribuída manualmente | `avaliarTarefa` bem-sucedido | professor que avaliou |
| Nota de tarefa zerada automaticamente | **não gera registro em `registroauditoria`** — descoberto durante a implementação que `UsuarioCPFAtor` não é opcional nesse schema (exige ator humano). O rastro fica no próprio dado: `TarefaAvaliadoPorCPF IS NULL` + `TarefaAvaliadoEm` já distingue automático de manual. | — |
| Customização de matéria alterada (capa/cor/mensagem) | `salvarCustomizacao` bem-sucedido | professor que editou |
| Capa/cor da turma alterada | `atualizarCapa` bem-sucedido | quem editou (representante/vice ou Coordenação/Direção) — **vale destacar no registro se foi o representante**, já que é um papel de aluno mexendo numa identidade compartilhada da turma |

Criação/exclusão/reordenação de categoria **fica de fora** da auditoria por decisão de escopo — é uma ferramenta organizacional pessoal do professor, sem o mesmo peso de accountability que nota ou identidade visual compartilhada; dá pra reconsiderar depois se fizer falta.

## 9. Plano de implementação faseado

1. ✅ **Migration + entidades/DAOs novos** (seção 4) — feito. **O backfill de categoria (4.3) foi escrito como plano/SQL comentado, mas NÃO executado contra produção** — precisa rodar isolado e validado via agente `mysql` antes de ir pro ar (ver seção 10).
2. ✅ **Backend: customização de Matéria/Turma** (upload de capa via R2, extração de cor via `sharp`, endpoints).
3. ✅ **Backend: categoria com ordem + extensão pra Tarefa/Conteúdo/Prova** (via `ConteudoTurma`/`ProvaAgendadaTurma.CategoriaGUID`).
4. ✅ **Backend: progresso de conteúdo + nota de tarefa + scheduler de nota automática** (`*/5 * * * *`, registrado em `Server.ts`).
5. ✅ **Backend: endpoints de agregação** (seção 5.7) — todos implementados.
6. ✅ **Frontend: navbar + grid de matérias (aluno) + grid de matérias/turmas (professor).**
7. ✅ **Frontend: tela de categorias + barra de progresso** — reorder por drag nativo (professor).
8. ✅ **Frontend: visualizador unificado dos 6 tipos** (vídeo/texto/imagem/tarefa digital/presencial/prova) — ver simplificações abaixo.
9. ✅ **Frontend: seções novas no dashboard** (tarefas pendentes / avaliações pendentes).
10. ✅ **Validação end-to-end:** `tsc --noEmit` (backend e frontend) + `next build`, todos limpos. **Teste manual nos dois papéis ainda não foi feito** — só validação de compilação/build.

Cada fase é commitável isoladamente — dá pra parar entre uma e outra sem deixar o sistema quebrado (tudo aditivo, nada remove/renomeia campo existente).

### 9.1 Simplificações assumidas na implementação (honestas, não escondidas)

- **Modal "+" sem backdrop pré-preenchido:** virou um popover simples com 3 botões que navegam pra `/cadastro?MateriaGUID=&TurmaGUID=&CategoriaGUID=` — os formulários existentes (`ConteudoForm`/`TarefaForm`/`ProvaAgendadaForm`) **ainda não leem esses query params pra se auto-preencher**. Funcional (o professor consegue criar o item), mas não é literalmente "modal sem backdrop já com a matéria selecionada" como descrito — fica como próximo passo.
- **Progresso de vídeo via YouTube (link):** só é rastreado com precisão pra vídeo **upload direto** (`<video>` nativo, evento `timeupdate`). Pra link do YouTube, o player é um `<iframe>` simples sem a API do YouTube integrada — não há como capturar tempo assistido sem essa integração extra, então o progresso desse caso específico fica em "sem_progresso" até abrir.
- **Badge de pendência na navbar:** documentado no spec original mas não implementado — o ícone "Matérias" na navbar não mostra indicador vermelho agregado hoje; o indicador vermelho por matéria/turma (endpoint `tem-pendencia`) existe no backend mas ainda não foi ligado a nenhum componente do frontend.
- **Card individual de matéria/turma sem indicador de pendência:** o componente `MateriaTurmaCard` já aceita a prop `temPendencia`, mas as telas (`/materias`, `/turmas`) ainda não chamam o endpoint `tem-pendencia` pra popular essa prop — fica pronto pra ligar, só falta o fetch.
- **Formulário de tarefa/prova dentro do visualizador é básico:** o visualizador cobre os campos essenciais (título, descrição, prazo, checkbox/nota), mas não replica 100% da tela completa de `/tarefas/[tarefaGUID]` (ex.: anexo de entrega do aluno na tarefa digital só tem um aviso apontando pra tela cheia, não o upload embutido).

## 10. Perguntas em aberto pro usuário

Já resolvidos nesta rodada de revisão:
- **#8** (foto/cor de turma) — confirmado: Representante/Vice-representante + Coordenação/Direção como fallback.
- **#3** (escopo de categoria) — revisado pra por Professor+Matéria+Turma (não só Professor+Matéria), prevendo a função futura do representante criar categoria própria. Ver decisão #3 revisada e seção 4.3 (backfill).
- **#5** (nota automática) — job a cada 5 minutos, alinhado ao relógio (`*/5 * * * *`), não em tempo real nem 1x/dia.

Ainda em aberto antes de começar a Fase 1:
- **Backfill de categoria (seção 4.3):** confirmar a estratégia exata (duplicar categoria existente por turma ativa do professor) antes de rodar contra produção — inclui checar via agente `mysql` quantas linhas de `CategoriaConteudo`/`ConteudoTurma` existem hoje de verdade, pra saber o tamanho real do impacto.
- **#6** (limiar de "vídeo concluído" em 95%) e **#9** (extração de cor no backend via `sharp`) — decisões técnicas menores, seguem como estão a menos que haja objeção.
- Qualquer outro ponto da seção 3, se a leitura estiver errada.
