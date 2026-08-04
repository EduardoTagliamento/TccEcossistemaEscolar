-- ============================================================
-- Recomendação de Estudos por IA — Fase 2 (Assunto + taxonomia global)
-- Ver docs/PLANO_IMPLEMENTACAO_RECOMENDACAO_ESTUDOS_IA.md (§3)
-- e docs/SPEC_RECOMENDACAO_ESTUDOS_IA.md (§3, itens 15-17)
-- Tudo aditivo (tabelas novas + 1 coluna nullable) — retrocompatível.
-- ============================================================

-- ---------- Taxonomia local (por escola) ----------

-- Vocabulário controlado de assunto por Matéria (spec item 3). Referenciável
-- por FK (AssuntoGUID) em vez de texto livre, pra alimentar tanto a listbox
-- de travamento manual na prova quanto o banco de questões (Fase 3).
CREATE TABLE assunto (
  AssuntoGUID CHAR(36) PRIMARY KEY,
  MateriaGUID CHAR(36) NOT NULL,
  AssuntoPaiGUID CHAR(36) NULL,
  Nome VARCHAR(150) NOT NULL,
  SubMateriaGlobalGUID CHAR(36) NULL,
  Origem ENUM('Manual','SumarioLivro','SugeridoIA') NOT NULL DEFAULT 'Manual',
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assunto_materia_nome (MateriaGUID, Nome),
  CONSTRAINT FK_Assunto_Materia FOREIGN KEY (MateriaGUID) REFERENCES materia(MateriaGUID),
  CONSTRAINT FK_Assunto_AssuntoPai FOREIGN KEY (AssuntoPaiGUID) REFERENCES assunto(AssuntoGUID)
);

-- N:N — uma prova pode cobrir mais de um assunto (travamento manual do professor)
CREATE TABLE provaagendadaassunto (
  ProvaAgendadaGUID CHAR(36) NOT NULL,
  AssuntoGUID CHAR(36) NOT NULL,
  PRIMARY KEY (ProvaAgendadaGUID, AssuntoGUID),
  CONSTRAINT FK_ProvaAgendadaAssunto_Prova FOREIGN KEY (ProvaAgendadaGUID) REFERENCES provaagendada(ProvaAgendadaGUID) ON DELETE CASCADE,
  CONSTRAINT FK_ProvaAgendadaAssunto_Assunto FOREIGN KEY (AssuntoGUID) REFERENCES assunto(AssuntoGUID)
);

-- ---------- Taxonomia global (cross-escola) ----------

CREATE TABLE materiaglobal (
  MateriaGlobalGUID CHAR(36) PRIMARY KEY,
  Nome VARCHAR(150) NOT NULL UNIQUE,
  Status ENUM('Pendente','Confirmado') NOT NULL DEFAULT 'Confirmado',
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE submateriaglobal (
  SubMateriaGlobalGUID CHAR(36) PRIMARY KEY,
  MateriaGlobalGUID CHAR(36) NOT NULL,
  Nome VARCHAR(150) NOT NULL,
  UNIQUE KEY uq_submateriaglobal (MateriaGlobalGUID, Nome),
  CONSTRAINT FK_SubMateriaGlobal_MateriaGlobal FOREIGN KEY (MateriaGlobalGUID) REFERENCES materiaglobal(MateriaGlobalGUID)
);

-- Aprende a cada resolução manual da fila 'Pendente' — reduz ambiguidade
-- futura sem exigir auto-merge automático sem supervisão (spec item 17).
CREATE TABLE materiaglobalalias (
  MateriaGlobalAliasGUID CHAR(36) PRIMARY KEY,
  MateriaGlobalGUID CHAR(36) NOT NULL,
  NomeAlias VARCHAR(150) NOT NULL,
  UNIQUE KEY uq_alias (NomeAlias),
  CONSTRAINT FK_MateriaGlobalAlias_MateriaGlobal FOREIGN KEY (MateriaGlobalGUID) REFERENCES materiaglobal(MateriaGlobalGUID)
);

-- Ponte opcional entre a Materia de uma escola e a taxonomia global —
-- resolvida automaticamente por similaridade de string (+ desempate por IA
-- quando ambíguo), nunca bloqueia o cadastro da escola (spec item 15/16).
ALTER TABLE materia
  ADD COLUMN MateriaGlobalGUID CHAR(36) NULL AFTER CursoGUID,
  ADD CONSTRAINT FK_Materia_MateriaGlobal FOREIGN KEY (MateriaGlobalGUID) REFERENCES materiaglobal(MateriaGlobalGUID);
