# Planejamento: Turmas Mistas / Eletivas (Grupo Eletivo)

**Data:** 18 de Agosto de 2026
**Status:** Implementado (backend + Gestão de Dados) e migration aplicada em produção em 18/08/2026 — ver nota sobre `CHECK` constraints no fim da §4.
**Escopo:** Suportar matérias eletivas cursadas por alunos de turmas diferentes ao mesmo tempo (ex.: Logística e Soft Skills, compartilhadas entre 3ºH e 3ºF), sem quebrar a regra de "1 matrícula ativa por aluno por escola".

---

## 0. Resumo executivo

Hoje `MateriaxProfessorxTurma` (a alocação professor+matéria+turma) exige uma `TurmaGUID`, e cada aluno só pode ter **uma matrícula ativa por escola** (`matricula.service.ts`, `criarMatricula()`). Isso não representa o caso real de uma eletiva como Logística, que mistura metade do 3ºH com metade do 3ºF numa turma só, sem que ninguém saia da sua turma principal.

Este documento especifica um novo conceito, **Grupo Eletivo**: um agrupamento de alunos independente de `Turma`, usado como alvo alternativo de alocação de matéria+professor. A alocação (`MateriaxProfessorxTurma`) passa a apontar para uma `Turma` **ou** um `GrupoEletivo` (nunca os dois), e os pontos do sistema que hoje resolvem "quem são os alunos dessa alocação" via `TurmaGUID` (Tarefa, Prova, Conteúdo, Categoria de Conteúdo, notificações) passam a resolver por qualquer um dos dois.

Esta foi a decisão validada com o responsável do produto (ver §1, decisão #1) em vez da alternativa de permitir múltiplas matrículas ativas por aluno — que mexeria na regra central de identidade acadêmica do aluno. A investigação do código existente (§2) achou uma consequência técnica dessa escolha que precisa ser validada antes de codar: **duas tabelas de progresso por aluno (`tarefaacademica_matricula`, `conteudoprogresso`) são inteiramente ancoradas em `MatriculaGUID`, não em `UsuarioGUID`.** A saída recomendada (§2) resolve isso sem recriar essas tabelas do zero e sem reabrir a decisão de "matrícula única" para a matrícula principal do aluno.

---

## 1. Decisões de negócio já validadas

| # | Pergunta | Decisão |
|---|----------|---------|
| 1 | Grupo eletivo como matrícula múltipla vs. entidade independente? | **Entidade independente** (`GrupoEletivo`), para não mexer na regra "1 matrícula ativa por aluno por escola". `MateriaxProfessorxTurma` passa a aceitar `TurmaGUID` OU `GrupoEletivoGUID` (mutuamente exclusivos). |
| 2 | Como os alunos entram no grupo eletivo? | **Secretaria/Coordenação atribui manualmente**, numa tela nova, mesmo padrão de permissão já usado em Gestão de Dados (`isCoordSecretariaOuDirecaoEmEscola`). Sem auto-inscrição do aluno nesta primeira versão. |

---

## 2. Achado técnico: por que "independente de matrícula" precisa de um ajuste

Levantado durante esta spec, não estava nas opções apresentadas antes da decisão #1 acima — por isso está isolado nesta seção, para validação explícita.

**O problema:** duas tabelas que guardam estado *por aluno* usam `MatriculaGUID` como chave, não `UsuarioGUID`:

- `tarefaacademica_matricula` (`backend/entities/tarefaacademica-matricula.model.ts:24`) — guarda `TarefaFeito`, `TarefaNota`, `TarefaRealizacaoData`, anexos de entrega, prazo individual. Toda a tela de correção do professor (`VisualizadorItemModal.tsx`) e o cálculo de pendências/atrasados dependem dessa tabela.
- `conteudoprogresso` (`backend/entities/conteudoprogresso.model.ts:13`) — mesmo padrão, para progresso de material didático.

Se `GrupoEletivo` for **totalmente** independente de `matricula` (um `GrupoEletivoAluno` novo, chaveado só por `UsuarioGUID`, como a opção originalmente descrita), essas duas tabelas — e qualquer feature futura que precise de estado por aluno — precisariam de um segundo caminho de código inteiro (schema espelhado + queries espelhadas) só para alunos de grupo eletivo. Isso é uma duplicação estrutural relevante, não um detalhe.

`ProvaAgendada` e `Conteudo` (`materia_postada`), por outro lado, **não** têm esse problema — são N:N direto com `Turma` (`ProvaAgendadaTurma`) e resolvem destinatário via `matricula WHERE TurmaGUID = ?` só para notificação, sem tabela de progresso por aluno atrelada a `MatriculaGUID` (o progresso de conteúdo é a exceção, coberta acima).

**Recomendação — "matrícula-sombra" (mantém a decisão #1, resolve o atrito):**

Em vez de criar `GrupoEletivoAluno` como uma tabela nova e paralela, reaproveitar a própria tabela `matricula`:

```sql
ALTER TABLE matricula
  MODIFY TurmaGUID CHAR(36) NULL,          -- deixa de ser obrigatório
  ADD COLUMN GrupoEletivoGUID CHAR(36) NULL,
  ADD CONSTRAINT FK_Matricula_GrupoEletivo FOREIGN KEY (GrupoEletivoGUID)
    REFERENCES grupoeletivo(GrupoEletivoGUID) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT CHK_Matricula_Alvo CHECK (
    (TurmaGUID IS NOT NULL AND GrupoEletivoGUID IS NULL) OR
    (TurmaGUID IS NULL AND GrupoEletivoGUID IS NOT NULL)
  );
```

Quando a secretaria adiciona um aluno a um grupo eletivo, o sistema cria uma linha de `matricula` com `TurmaGUID = NULL` e `GrupoEletivoGUID` preenchido — **não exposta como "matrícula" na UI**, é um detalhe interno que existe só pra `tarefaacademica_matricula`/`conteudoprogresso` continuarem funcionando sem nenhuma mudança de schema ou query nelas.

**Por que isso não reabre a regra de matrícula única:** toda a lógica que hoje impõe "1 matrícula ativa" filtra por `TurmaGUID`, direta ou indiretamente:
- `MatriculaDAO.findMatriculaAtivaByUsuarioEEscola` (`matricula.repository.ts:133`) faz `INNER JOIN turma t ON t.TurmaGUID = m.TurmaGUID` — uma linha com `TurmaGUID = NULL` nunca entra nesse JOIN, então nunca é contada.
- `criarMatriculasEmMassa` (`matricula.service.ts:718`) filtra `findAll({ EscolaGUID })`, que internamente faz `TurmaGUID IN (SELECT TurmaGUID FROM turma WHERE EscolaGUID = ?)` (`matricula.repository.ts:100`) — `IN` nunca casa com `NULL`.

Ou seja: **nenhuma mudança é necessária nesses dois pontos** — eles já ignoram matrículas de grupo eletivo por construção, sem precisar de um `AND TurmaGUID IS NOT NULL` explícito (mas vale adicioná-lo mesmo assim, só por clareza de leitura — ver §4.1). A criação da matrícula-sombra usa um método novo e separado (`MatriculaService.criarMatriculaEletiva`), que nunca passa pela validação de "matrícula ativa única" porque essa validação é específica de `criarMatricula` (turma).

Esta seção precisa de um "ok" explícito antes de prosseguir — o resto do documento já assume essa recomendação.

---

## 3. Estado atual do código (relevante)

- **`MateriaxProfessorxTurma`** (`backend/entities/materiaxprofessorxturma.model.ts`): `TurmaGUID` obrigatório, `UNIQUE (MateriaGUID, TurmaGUID, UsuarioGUID)`. Ponto de ancoragem de tudo — cronograma (`horarioturma`), tarefas, provas, conteúdo.
- **`Matricula`** (`backend/entities/matricula.model.ts`, `backend/repositories/matricula.repository.ts`): `TurmaGUID` obrigatório hoje. Regra de negócio "1 ativa por escola" vive inteiramente em `matricula.service.ts` (sem constraint de banco) — mesmo estilo de validação em código já usado no resto do projeto (ex.: `TarefaAcademica.validarCompartilhada()`).
- **`CategoriaConteudo`** (`backend/entities/categoriaconteudo.model.ts`): `MateriaGUID` + `TurmaGUID` obrigatórios, organiza tarefas/materiais em pastas por matéria+turma. Usado por `CategoriaConteudoAPI.listarCategorias({ MateriaGUID, TurmaGUID })` no formulário de criação de tarefa.
- **Resolução de destinatários por `TurmaGUID` (`matricula WHERE TurmaGUID = ?/IN (...)`)** aparece em pelo menos três lugares que precisam do mesmo tratamento dual:
  - `provaagendada.service.ts` `#notificarProvaPostada` (~L378-397)
  - `conteudo.service.ts` `#notificarMateriaPostada` (~L284-302)
  - `frontend/app/dashboard/[escolaGUID]/cadastro/TarefaForm.tsx` (`obterGruposPorTurma`, ~L803) — busca o roster de alunos por turma para o professor escolher quem recebe a tarefa.
- **Cronograma/agendamento automático** (`horarioturma`, ver `docs/PLANO_IMPLEMENTACAO_GRADE_HORARIA.md`): calculado a partir de `MatProfTurGUID → TurmaGUID`. Já existe fallback pra data manual quando a turma não tem cronograma configurado — reaproveitado por Grupo Eletivo (ver §7).
- **Padrão de referência para "grupo com membros avulsos"**: `GrupoProjeto`/membro (`backend/entities/grupoprojeto.model.ts`) já modela associação aluno↔grupo por `UsuarioGUID` direto, sem depender de `Matricula` — mas ali o grupo é do aluno (auto-organizado dentro de um Projeto já visível pra turma dele), não uma segunda fonte de "quem está matriculado em quê", que é o problema específico do §2.
- **Permissão de gestão** (Secretaria/Coordenação/Direção): `EscolaxUsuarioxFuncaoDAO.isCoordSecretariaOuDirecaoEmEscola`, já usado em `matricula.service.ts` e nas 4 telas de Gestão de Dados — reaproveitar sem mudança.

---

## 4. Modelo de dados novo/alterado

### 4.1 `GrupoEletivo` (nova tabela)

```sql
CREATE TABLE grupoeletivo (
  GrupoEletivoGUID CHAR(36) NOT NULL PRIMARY KEY,
  EscolaGUID CHAR(36) NOT NULL,
  GrupoEletivoNome VARCHAR(80) NOT NULL,        -- ex: "Eletivas 3H/3F"
  GrupoEletivoStatus ENUM('Ativo','Inativo') NOT NULL DEFAULT 'Ativo',
  CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY UQ_Escola_Nome (EscolaGUID, GrupoEletivoNome),
  CONSTRAINT FK_GrupoEletivo_Escola FOREIGN KEY (EscolaGUID)
    REFERENCES escola(EscolaGUID) ON UPDATE CASCADE ON DELETE RESTRICT
);
```

Não guarda `TurmaGUID` nenhuma — de propósito. Um grupo eletivo pode, no futuro, misturar quantas turmas quiser (não só pares); a origem dos membros não é modelada aqui, só quem está dentro hoje.

### 4.2 `matricula` — colunas alteradas (ver §2)

```sql
ALTER TABLE matricula
  MODIFY TurmaGUID CHAR(36) NULL,
  ADD COLUMN GrupoEletivoGUID CHAR(36) NULL,
  ADD CONSTRAINT FK_Matricula_GrupoEletivo FOREIGN KEY (GrupoEletivoGUID)
    REFERENCES grupoeletivo(GrupoEletivoGUID) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT CHK_Matricula_Alvo CHECK (
    (TurmaGUID IS NOT NULL AND GrupoEletivoGUID IS NULL) OR
    (TurmaGUID IS NULL AND GrupoEletivoGUID IS NOT NULL)
  ),
  ADD INDEX idx_matricula_grupoeletivo (GrupoEletivoGUID);
```

`MatriculaDAO`/`MatriculaService` ganham `criarMatriculaEletiva(usuarioGUID, grupoEletivoGUID)` e `removerMatriculaEletiva(usuarioGUID, grupoEletivoGUID)` — não passam por `criarMatricula`/validação de matrícula única (que continua exigindo `TurmaGUID`, agora explícito via `if (!data.TurmaGUID)` já existente em `criarMatricula` ~L157). Ao contrário da matrícula principal, um aluno pode ter **N matrículas-sombra ativas** (uma por grupo eletivo do qual participa) — não há regra de "1 por vez" aqui.

### 4.3 `materiaxprofessorxturma` — colunas alteradas

```sql
ALTER TABLE materiaxprofessorxturma
  MODIFY TurmaGUID CHAR(36) NULL,
  ADD COLUMN GrupoEletivoGUID CHAR(36) NULL,
  ADD CONSTRAINT FK_MPT_GrupoEletivo FOREIGN KEY (GrupoEletivoGUID)
    REFERENCES grupoeletivo(GrupoEletivoGUID) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT CHK_MPT_Alvo CHECK (
    (TurmaGUID IS NOT NULL AND GrupoEletivoGUID IS NULL) OR
    (TurmaGUID IS NULL AND GrupoEletivoGUID IS NOT NULL)
  ),
  DROP INDEX UQ_Materia_Turma_Professor,
  ADD UNIQUE KEY UQ_Materia_Turma_Professor (MateriaGUID, TurmaGUID, UsuarioGUID),
  ADD UNIQUE KEY UQ_Materia_Grupo_Professor (MateriaGUID, GrupoEletivoGUID, UsuarioGUID);
```

**Nota:** precisa das duas `UNIQUE KEY` separadas (não dá pra reaproveitar uma única chave composta com as duas colunas) porque o MySQL trata `NULL` como distinto de `NULL` em índice único — uma constraint só com `(MateriaGUID, TurmaGUID, GrupoEletivoGUID, UsuarioGUID)` não bloquearia duplicata de alocação em grupo eletivo (já que `TurmaGUID` seria sempre `NULL` nesse caso, e duas linhas com `TurmaGUID=NULL` não colidem).

### 4.4 `categoriaconteudo` — colunas alteradas

Mesmo padrão dual de §4.3 (`TurmaGUID` → nullable + `GrupoEletivoGUID` novo, XOR, dupla `UNIQUE KEY`) — repetido aqui só por completude do modelo, sem redigitar o SQL (idêntico em forma ao de §4.3, trocando a tabela).

### 4.5 Fora do modelo de dados: `horarioturma`

**Não alterado nesta fase.** Tarefa/Prova criadas para um grupo eletivo usam o mesmo fallback de data manual já existente quando a turma de destino não tem cronograma configurado (`docs/PLANO_IMPLEMENTACAO_GRADE_HORARIA.md`, decisão #4/item 4). Estender cronograma pra grupo eletivo é trabalho futuro — ver §7.

### 4.6 Nota de execução: `CHECK` constraints não aplicadas

As `CHECK CONSTRAINT` do XOR Turma/GrupoEletivo (§4.2-4.4) **não foram criadas em produção**. O MySQL proíbe uma coluna usada num `CHECK` de também participar de uma FK com ação `CASCADE`/`SET NULL`/`SET DEFAULT` (erro 3823) — e as FKs pré-existentes `FK_Matricula_Turma`/`FK_MPT_Turma`/`FK_CategoriaConteudo_Turma` já usam `ON UPDATE CASCADE`. Trocar a ação dessas FKs antigas (alheias a esta feature) ficou fora de escopo. A regra XOR continua garantida em código — `Matricula.validar()` e `MaterialProfessorTurma.validar()` lançam erro se `TurmaGUID`/`GrupoEletivoGUID` vierem os dois preenchidos ou os dois vazios — mesmo padrão de validação em código já usado no resto do projeto. As FKs novas (`FK_*_GrupoEletivo`) foram criadas com `ON UPDATE RESTRICT` desde o início, sem esse problema.

---

## 5. Fluxos de UI

### 5.1 Gestão de Dados → nova aba/tela "Grupos Eletivos"

Reaproveita o layout das 4 telas já existentes em `frontend/app/dashboard/[escolaGUID]/gestao-dados/` (padrão `BaseFormularioCadastro` + lista):

1. **Criar grupo eletivo**: nome + (opcional) turmas de origem só como filtro de busca de alunos elegíveis na tela seguinte (não persistido em `GrupoEletivo`, ver §4.1).
2. **Gerenciar membros**: busca aluno por nome (reaproveita `useBuscaUsuarioPorNome`/`ListaCandidatosUsuario`, já existentes — filtrando por alunos com matrícula ativa na escola), adiciona/remove. Cada adição chama `criarMatriculaEletiva`; cada remoção, `removerMatriculaEletiva`.
3. Lista de grupos eletivos existentes com contagem de membros, editar nome, inativar (`GrupoEletivoStatus='Inativo'` — soft delete, mesmo padrão do resto do projeto).

### 5.2 Gestão de Dados → Professores (`professores/page.tsx`)

O formulário de vincular professor a matéria+turma ganha um segundo modo: "Turma" ou "Grupo Eletivo" (radio/toggle), com o segundo dropdown trocando de opções (`Turma[]` vs `GrupoEletivo[]`) conforme a escolha. Cria a alocação com `TurmaGUID` ou `GrupoEletivoGUID` preenchido, nunca os dois (mesma UI de escolha exclusiva, backend valida com a mesma regra de §4.3).

### 5.3 Professor → criar Tarefa/Prova/Conteúdo (`TarefaForm.tsx` e equivalentes)

Hoje o professor escolhe entre suas alocações (`findByProfessor`), que hoje só resolvem nome de turma. Passam a listar também os grupos eletivos do professor, com um rótulo visual diferenciando ("🏫 3ºH" vs "🔀 Eletivas 3H/3F"). O resto do fluxo (buscar roster, calcular datas, criar) usa a mesma função, só trocando `TurmaGUID` por `GrupoEletivoGUID` como parâmetro de busca de roster (`AlunoAPI.listarAlunos({ GrupoEletivoGUID })`, novo, espelhando `{ TurmaGUID }`).

### 5.4 Professor/Aluno → visualização

Nenhuma mudança visível pro aluno: uma tarefa de grupo eletivo aparece em "Minhas Tarefas" exatamente como qualquer outra (a resolução já passa a MatriculaGUID da matrícula-sombra, que o resto do sistema já sabe tratar). O professor, ao abrir a tarefa, vê "Eletivas 3H/3F" no lugar de "3ºH" como identificação da turma/grupo (mesmo campo `TurmaNome`/rótulo, resolvendo pro nome do grupo quando aplicável).

---

## 6. API — endpoints novos (esboço)

```
POST   /api/grupoeletivo                       Criar grupo eletivo (Secretaria/Coordenação/Direção)
GET    /api/grupoeletivo?EscolaGUID=            Listar grupos eletivos da escola
PATCH  /api/grupoeletivo/:GrupoEletivoGUID      Editar nome / inativar
POST   /api/grupoeletivo/:GrupoEletivoGUID/membros     Body: { UsuarioGUID }  → cria matrícula-sombra
DELETE /api/grupoeletivo/:GrupoEletivoGUID/membros/:UsuarioGUID   → remove matrícula-sombra
GET    /api/grupoeletivo/:GrupoEletivoGUID/membros     Listar alunos do grupo

# Alterados (aceitam GrupoEletivoGUID como alternativa a TurmaGUID)
POST   /api/materiaxprofessorxturma             Body: { MateriaGUID, UsuarioGUID, TurmaGUID? , GrupoEletivoGUID? }
GET    /api/aluno?GrupoEletivoGUID=             Roster do grupo (espelha ?TurmaGUID=)
GET    /api/categoriaconteudo?MateriaGUID=&GrupoEletivoGUID=
```

---

## 7. Fases de implementação sugeridas

1. **Migração de schema** (§4.1-4.4) + `GrupoEletivoDAO`/`GrupoEletivoService` básicos (CRUD do grupo + membros/matrícula-sombra). Sem nenhuma tela ainda — validável por request manual/Postman.
2. **Gestão de Dados**: tela de Grupos Eletivos (§5.1) + extensão da tela de Professores (§5.2).
3. **Resolução dual nos consumidores**: `materiaxprofessorxturma` já permite os dois alvos desde a fase 1; agora `TarefaForm.tsx`, `provaagendada.service.ts`, `conteudo.service.ts`, `categoriaconteudo` passam a aceitar/resolver `GrupoEletivoGUID` em paralelo a `TurmaGUID`.
4. **Notificações**: `notificacao.service.ts` e os `#notificar*` de cada service (`tarefa_postada`, `prova_postada`, `materia_postada`) já mandam para `UsuarioGUID` resolvido via matrícula (sombra ou real) — nenhuma mudança adicional esperada aqui além da fase 3 (a resolução de destinatário já é o ponto de entrada).
5. **Migração dos dados reais de 3ºH/3ºF**: criar o grupo eletivo real, mover a alocação de Logística/Soft Skills de volta pro 3ºH pra apontar pro novo grupo, adicionar os alunos do 3ºF como membros.

---

## 8. Fora de escopo / pontos em aberto

- **Cronograma/agendamento automático para grupo eletivo** (§4.5): fica de fora nesta fase; tarefas/provas de eletiva sempre pedem data manual. Se isso incomodar no uso real, entra como extensão pontual de `horarioturma` depois.
- **Auto-inscrição do aluno**: decisão #2 fixou atribuição manual por secretaria/coordenação. Um fluxo de auto-inscrição (como já existe em `GrupoProjeto`) fica pra uma v2, se necessário.
- **Limite de vagas por grupo eletivo**: não coberto — pode ser um campo simples (`GrupoEletivoLimiteMaximo`) adicionado depois sem quebrar nada do modelo acima.
- **Relatórios/notas agregadas por grupo eletivo** (ex.: boletim): não investigado nesta spec — hoje nota/frequência agregada provavelmente já assume `Turma` em algum lugar do módulo de boletim; precisa de levantamento próprio se/quando o produto pedir isso pra eletivas.
