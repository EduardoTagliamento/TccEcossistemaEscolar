-- ============================================================
-- Resumo de IA no grupo da turma (WhatsApp), 1 dia antes de cada prova
-- Ver docs/spec-resumo-ia-prova-grupo-whatsapp.md (repo interceptacaoAVA)
-- Tudo aditivo (tabelas novas) — retrocompatível.
-- ============================================================

-- Vínculo 1:1 entre Turma e o grupo de WhatsApp dela (criado pelo BAUÁ ou
-- linkado manualmente a um grupo já existente). UNIQUE nos dois lados:
-- nunca duas turmas no mesmo grupo, nunca uma turma com dois grupos.
CREATE TABLE turma_grupo_whatsapp (
  TurmaGrupoWhatsappGUID CHAR(36) PRIMARY KEY,
  TurmaGUID CHAR(36) NOT NULL,
  GrupoWhatsappJID VARCHAR(50) NOT NULL,
  CriadoPorBaua TINYINT(1) NOT NULL DEFAULT 0,
  CriadoPorUsuarioGUID CHAR(36) NOT NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_turmagrupowhatsapp_turma (TurmaGUID),
  UNIQUE KEY uq_turmagrupowhatsapp_jid (GrupoWhatsappJID),
  CONSTRAINT FK_TurmaGrupoWhatsapp_Turma FOREIGN KEY (TurmaGUID) REFERENCES turma(TurmaGUID) ON DELETE CASCADE,
  CONSTRAINT FK_TurmaGrupoWhatsapp_Usuario FOREIGN KEY (CriadoPorUsuarioGUID) REFERENCES usuario(UsuarioGUID)
);

-- Dedup do envio do resumo de IA por (prova, turma) — a recomendação em si
-- é por prova (ver provaagendadarecomendacao), mas o envio é por turma
-- (grupo real ou telefone de teste, ver Destino).
CREATE TABLE provaagendada_turma_resumo_envio (
  ProvaAgendadaTurmaResumoEnvioGUID CHAR(36) PRIMARY KEY,
  ProvaAgendadaGUID CHAR(36) NOT NULL,
  TurmaGUID CHAR(36) NOT NULL,
  Destino ENUM('GrupoReal','TelefoneTeste') NOT NULL,
  EnviadoEm DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_provaagendadaturmaresumoenvio (ProvaAgendadaGUID, TurmaGUID),
  CONSTRAINT FK_ProvaAgendadaTurmaResumoEnvio_Prova FOREIGN KEY (ProvaAgendadaGUID) REFERENCES provaagendada(ProvaAgendadaGUID) ON DELETE CASCADE,
  CONSTRAINT FK_ProvaAgendadaTurmaResumoEnvio_Turma FOREIGN KEY (TurmaGUID) REFERENCES turma(TurmaGUID) ON DELETE CASCADE
);
