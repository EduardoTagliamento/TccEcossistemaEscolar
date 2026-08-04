-- ============================================================
-- Recomendação de Estudos por IA — Fase 3 (MaterialDidatico + QuestaoBanco)
-- Ver docs/PLANO_IMPLEMENTACAO_RECOMENDACAO_ESTUDOS_IA.md (§4)
-- e docs/SPEC_RECOMENDACAO_ESTUDOS_IA.md (§3, itens 7-13)
-- Tudo aditivo (tabelas novas + colunas nullable) — retrocompatível.
-- ============================================================

-- ---------- Trilha A: Material didático (livro, nível de Escola) ----------

CREATE TABLE materialdidatico (
  MaterialDidaticoGUID CHAR(36) PRIMARY KEY,
  EscolaGUID CHAR(36) NOT NULL,
  Titulo VARCHAR(255) NOT NULL,
  CriadoPorCPF VARCHAR(14) NOT NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT FK_MaterialDidatico_Escola FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID),
  CONSTRAINT FK_MaterialDidatico_Usuario FOREIGN KEY (CriadoPorCPF) REFERENCES usuario(UsuarioCPF)
);

-- StatusExtracao não está no schema original do spec — adição pontual, mesmo
-- guardrail já usado em provaagendadarecomendacao (§7): job assíncrono de
-- extração pode falhar (Gemini fora do ar, imagem ilegível) sem travar o
-- cadastro do livro.
CREATE TABLE materialdidaticopagina (
  MaterialDidaticoPaginaGUID CHAR(36) PRIMARY KEY,
  MaterialDidaticoGUID CHAR(36) NOT NULL,
  NumeroPagina INT UNSIGNED NOT NULL,
  ArquivoUrl VARCHAR(500) NOT NULL,
  TextoExtraido LONGTEXT NULL,
  StatusExtracao ENUM('Pendente','Concluida','Falhou') NOT NULL DEFAULT 'Pendente',
  RevisadoPorCPF VARCHAR(14) NULL,
  RevisadoEm DATETIME NULL,
  ExtraidoEm DATETIME NULL,
  UNIQUE KEY uq_materialpagina (MaterialDidaticoGUID, NumeroPagina),
  CONSTRAINT FK_MaterialDidaticoPagina_Material FOREIGN KEY (MaterialDidaticoGUID) REFERENCES materialdidatico(MaterialDidaticoGUID),
  CONSTRAINT FK_MaterialDidaticoPagina_Revisor FOREIGN KEY (RevisadoPorCPF) REFERENCES usuario(UsuarioCPF)
);

CREATE TABLE materialdidaticocapitulo (
  MaterialDidaticoCapituloGUID CHAR(36) PRIMARY KEY,
  MaterialDidaticoGUID CHAR(36) NOT NULL,
  MateriaGUID CHAR(36) NOT NULL,
  Titulo VARCHAR(255) NOT NULL,
  PaginaInicio INT UNSIGNED NOT NULL,
  PaginaFim INT UNSIGNED NOT NULL,
  AssuntoGUID CHAR(36) NULL,
  CONSTRAINT FK_MaterialDidaticoCapitulo_Material FOREIGN KEY (MaterialDidaticoGUID) REFERENCES materialdidatico(MaterialDidaticoGUID),
  CONSTRAINT FK_MaterialDidaticoCapitulo_Materia FOREIGN KEY (MateriaGUID) REFERENCES materia(MateriaGUID),
  CONSTRAINT FK_MaterialDidaticoCapitulo_Assunto FOREIGN KEY (AssuntoGUID) REFERENCES assunto(AssuntoGUID)
);

-- Extensão pragmática (não travada no spec original, mas necessária pra
-- "professor referencia capítulo/página" funcionar de ponta a ponta):
-- referência opcional de UM capítulo por prova — compartilhada entre
-- turmas, mesmo GUID do resto da feature (spec item 20).
ALTER TABLE provaagendada
  ADD COLUMN MaterialDidaticoCapituloGUID CHAR(36) NULL,
  ADD CONSTRAINT FK_ProvaAgendada_MaterialDidaticoCapitulo FOREIGN KEY (MaterialDidaticoCapituloGUID) REFERENCES materialdidaticocapitulo(MaterialDidaticoCapituloGUID);

-- ---------- Trilha B: Banco de questões universal ----------

CREATE TABLE vestibular (
  VestibularGUID CHAR(36) PRIMARY KEY,
  Nome VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE questaobanco (
  QuestaoBancoGUID CHAR(36) PRIMARY KEY,
  MateriaGlobalGUID CHAR(36) NOT NULL,
  SubMateriaGlobalGUID CHAR(36) NOT NULL,
  VestibularGUID CHAR(36) NOT NULL,
  Dificuldade ENUM('Facil','Media','Dificil') NOT NULL,
  Enunciado TEXT NOT NULL,
  VideoResolucaoUrl VARCHAR(500) NULL,
  CriadoPorCPF VARCHAR(14) NOT NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT FK_QuestaoBanco_MateriaGlobal FOREIGN KEY (MateriaGlobalGUID) REFERENCES materiaglobal(MateriaGlobalGUID),
  CONSTRAINT FK_QuestaoBanco_SubMateriaGlobal FOREIGN KEY (SubMateriaGlobalGUID) REFERENCES submateriaglobal(SubMateriaGlobalGUID),
  CONSTRAINT FK_QuestaoBanco_Vestibular FOREIGN KEY (VestibularGUID) REFERENCES vestibular(VestibularGUID),
  CONSTRAINT FK_QuestaoBanco_Usuario FOREIGN KEY (CriadoPorCPF) REFERENCES usuario(UsuarioCPF)
);

CREATE TABLE questaobancoalternativa (
  AlternativaGUID CHAR(36) PRIMARY KEY,
  QuestaoBancoGUID CHAR(36) NOT NULL,
  AlternativaTexto VARCHAR(1000) NOT NULL,
  AlternativaCorreta BOOLEAN NOT NULL DEFAULT FALSE,
  AlternativaOrdem TINYINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT FK_QuestaoBancoAlternativa_Questao FOREIGN KEY (QuestaoBancoGUID) REFERENCES questaobanco(QuestaoBancoGUID)
);

-- Flag de admin de plataforma (spec item 13) — fora do EscolaXUsuarioXFuncao,
-- é nível de plataforma, não de escola.
ALTER TABLE usuario
  ADD COLUMN UsuarioIsPlataformaAdmin BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------- Cache da recomendação ganha as 2 peças novas desta fase ----------

ALTER TABLE provaagendadarecomendacao
  ADD COLUMN PaginaLivroJson JSON NULL,
  ADD COLUMN SubMateriaGlobalGUID CHAR(36) NULL,
  ADD CONSTRAINT FK_ProvaAgendadaRecomendacao_SubMateriaGlobal FOREIGN KEY (SubMateriaGlobalGUID) REFERENCES submateriaglobal(SubMateriaGlobalGUID);
