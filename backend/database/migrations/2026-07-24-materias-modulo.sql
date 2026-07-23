-- ============================================================
-- Módulo Matérias (Sala de Aula) — schema
-- Ver docs/PLANO_IMPLEMENTACAO_MATERIAS.md (seções 4.1 a 4.3)
-- Tudo aditivo (colunas nullable/tabelas novas) — retrocompatível.
-- ============================================================

-- ---------- 4.2 Alterações em tabelas existentes ----------

-- Capa/cor da turma (compartilhada entre matérias, editável por
-- representante/vice-representante ou Coordenação/Direção)
ALTER TABLE turma
  ADD COLUMN TurmaImagemUrl VARCHAR(500) NULL AFTER TurmaStatus,
  ADD COLUMN TurmaCorFundo VARCHAR(7) NULL AFTER TurmaImagemUrl;

-- Categoria: ganha Ordem (drag-and-drop) e TurmaGUID (escopo revisado:
-- por Professor+Matéria+Turma, não só Professor+Matéria — ver decisão #3
-- do spec). TurmaGUID começa nullable pra permitir o backfill (4.3) antes
-- de virar NOT NULL.
ALTER TABLE categoriaconteudo
  ADD COLUMN Ordem INT NOT NULL DEFAULT 0 AFTER CategoriaNome,
  ADD COLUMN TurmaGUID CHAR(36) NULL AFTER MateriaGUID,
  ADD CONSTRAINT FK_CategoriaConteudo_Turma FOREIGN KEY (TurmaGUID) REFERENCES turma(TurmaGUID);

-- Tarefa é de turma única (matXprofXturxescGUID já fixa 1 turma) — categoria
-- direto nela, sem mudança de escopo.
ALTER TABLE tarefaacademica
  ADD COLUMN CategoriaGUID CHAR(36) NULL AFTER matXprofXturxescGUID,
  ADD CONSTRAINT FK_TarefaAcademica_Categoria FOREIGN KEY (CategoriaGUID) REFERENCES categoriaconteudo(CategoriaGUID);

-- Conteudo e Prova são fan-out (1 item → N turmas via *Turma) — categoria
-- vai na tabela de distribuição, não no item em si, já que agora ela é
-- por turma (o mesmo conteúdo pode estar em categorias diferentes em
-- turmas diferentes). `conteudo.CategoriaGUID` fica intocado (não é
-- dropado) — passa só a ser ignorado pelo código novo, ver seção 4.2.
ALTER TABLE conteudoturma
  ADD COLUMN CategoriaGUID CHAR(36) NULL AFTER TurmaGUID,
  ADD CONSTRAINT FK_ConteudoTurma_Categoria FOREIGN KEY (CategoriaGUID) REFERENCES categoriaconteudo(CategoriaGUID);

ALTER TABLE provaagendada_turma
  ADD COLUMN CategoriaGUID CHAR(36) NULL AFTER TurmaGUID,
  ADD CONSTRAINT FK_ProvaAgendadaTurma_Categoria FOREIGN KEY (CategoriaGUID) REFERENCES categoriaconteudo(CategoriaGUID);

-- Nota de tarefa (digital e presencial) — TarefaAvaliadoPorCPF NULL indica
-- avaliação automática (scheduler de prazo vencido), não manual.
ALTER TABLE tarefaacademica_matricula
  ADD COLUMN TarefaNota DECIMAL(4,2) NULL AFTER TarefaFeito,
  ADD COLUMN TarefaAvaliadoEm DATETIME NULL AFTER TarefaNota,
  ADD COLUMN TarefaAvaliadoPorCPF VARCHAR(14) NULL AFTER TarefaAvaliadoEm,
  ADD CONSTRAINT FK_TarefaAcademicaMatricula_Avaliador FOREIGN KEY (TarefaAvaliadoPorCPF) REFERENCES usuario(UsuarioCPF);

-- ---------- 4.1 Novas tabelas ----------

-- Identidade visual da matéria, por professor (mesma matéria pode ter
-- capa/cor/mensagem diferentes dependendo de quem leciona)
CREATE TABLE materiacustomizacao (
  MateriaCustomizacaoGUID CHAR(36) PRIMARY KEY,
  MateriaGUID CHAR(36) NOT NULL,
  UsuarioCPF VARCHAR(14) NOT NULL,
  ImagemUrl VARCHAR(500) NULL,
  CorFundo VARCHAR(7) NULL,
  MensagemBoasVindas VARCHAR(500) NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_materiacustomizacao (MateriaGUID, UsuarioCPF),
  CONSTRAINT FK_MateriaCustomizacao_Materia FOREIGN KEY (MateriaGUID) REFERENCES materia(MateriaGUID),
  CONSTRAINT FK_MateriaCustomizacao_Usuario FOREIGN KEY (UsuarioCPF) REFERENCES usuario(UsuarioCPF)
);

-- Progresso de consumo de Conteudo por matrícula (resumo, cobre os 3 tipos:
-- vídeo/imagem calculam percentual real, texto vai direto pra 100)
CREATE TABLE conteudoprogresso (
  ConteudoProgressoGUID CHAR(36) PRIMARY KEY,
  ConteudoGUID CHAR(36) NOT NULL,
  MatriculaGUID VARCHAR(36) NOT NULL,
  PercentualConcluido TINYINT UNSIGNED NOT NULL DEFAULT 0,
  UltimaPosicaoSegundos INT NULL,
  ConcluidoEm DATETIME NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_conteudoprogresso (ConteudoGUID, MatriculaGUID),
  CONSTRAINT FK_ConteudoProgresso_Conteudo FOREIGN KEY (ConteudoGUID) REFERENCES conteudo(ConteudoGUID),
  CONSTRAINT FK_ConteudoProgresso_Matricula FOREIGN KEY (MatriculaGUID) REFERENCES matricula(MatriculaGUID)
);

-- Granularidade de página vista (galeria de imagens/paginado) — alimenta o
-- PercentualConcluido acima (distintas páginas vistas / total de páginas)
CREATE TABLE conteudopaginadovisualizacao (
  ConteudoPaginadoVisualizacaoGUID CHAR(36) PRIMARY KEY,
  ConteudoPaginadoArquivoGUID CHAR(36) NOT NULL,
  MatriculaGUID VARCHAR(36) NOT NULL,
  VisualizadoEm DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_paginavisualizacao (ConteudoPaginadoArquivoGUID, MatriculaGUID),
  CONSTRAINT FK_ConteudoPaginadoVisualizacao_Pagina FOREIGN KEY (ConteudoPaginadoArquivoGUID) REFERENCES conteudopaginadoarquivo(ConteudoPaginadoArquivoGUID),
  CONSTRAINT FK_ConteudoPaginadoVisualizacao_Matricula FOREIGN KEY (MatriculaGUID) REFERENCES matricula(MatriculaGUID)
);

-- Visualização de prova por aluno — igual texto, só marca "já vi" (sem
-- relação com nota, que segue fora de escopo desta fase)
CREATE TABLE provaagendadavisualizacao (
  ProvaAgendadaVisualizacaoGUID CHAR(36) PRIMARY KEY,
  ProvaAgendadaTurmaGUID CHAR(36) NOT NULL,
  MatriculaGUID VARCHAR(36) NOT NULL,
  VisualizadoEm DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_provavisualizacao (ProvaAgendadaTurmaGUID, MatriculaGUID),
  CONSTRAINT FK_ProvaAgendadaVisualizacao_Turma FOREIGN KEY (ProvaAgendadaTurmaGUID) REFERENCES provaagendada_turma(ProvaAgendadaTurmaGUID),
  CONSTRAINT FK_ProvaAgendadaVisualizacao_Matricula FOREIGN KEY (MatriculaGUID) REFERENCES matricula(MatriculaGUID)
);

-- ---------- 4.3 Backfill: categorias existentes ganham TurmaGUID ----------
-- IMPORTANTE: rodar isto só depois de confirmar o volume real de dados
-- (checar `SELECT COUNT(*) FROM categoriaconteudo` e `SELECT COUNT(*) FROM
-- conteudoturma WHERE CategoriaGUID IS NOT NULL` — aqui via agente mysql
-- antes de executar em produção, mesmo padrão das migrations anteriores
-- desta sessão) — ver seção 4.3 do spec para a estratégia completa.
--
-- Passo 1: para cada categoria existente, duplicar por turma ativa do
-- professor naquela matéria.
-- (executar via script Node, não SQL puro — precisa ler MateriaxProfessorxTurma
-- e gerar 1 UUID novo por combinação categoria×turma antes de inserir)
--
-- Passo 2: reatribuir ConteudoTurma.CategoriaGUID pra apontar pra cópia
-- correspondente à turma daquela linha.
--
-- Só depois dos passos 1-2 confirmados:
-- ALTER TABLE categoriaconteudo MODIFY COLUMN TurmaGUID CHAR(36) NOT NULL;
