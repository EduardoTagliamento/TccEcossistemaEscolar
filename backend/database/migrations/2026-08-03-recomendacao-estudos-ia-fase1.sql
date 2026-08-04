-- ============================================================
-- Recomendação de Estudos por IA — Fase 1 (resumo + vídeo)
-- Ver docs/PLANO_IMPLEMENTACAO_RECOMENDACAO_ESTUDOS_IA.md (§2.1)
-- e docs/SPEC_RECOMENDACAO_ESTUDOS_IA.md (§3)
-- Tudo aditivo (tabela nova) — retrocompatível.
-- ============================================================

-- Cache da recomendação gerada por IA, uma linha por ProvaAgendada
-- (compartilhada por todas as turmas daquela prova — nunca por turma).
-- StatusGeracao/ErroGeracao não estão no schema original do spec: adição
-- pontual pra suportar o guardrail "falha de API não bloqueia a prova"
-- (item 22 do spec, §7) — o job assíncrono grava 'Falhou' em vez de deixar
-- a prova sem nenhuma linha de recomendação.
CREATE TABLE provaagendadarecomendacao (
  ProvaAgendadaRecomendacaoGUID CHAR(36) PRIMARY KEY,
  ProvaAgendadaGUID CHAR(36) NOT NULL,
  VideosJson JSON NULL,
  ResumoTexto LONGTEXT NULL,
  FontesUsadas JSON NULL,
  ModeloUsado VARCHAR(100) NULL,
  StatusGeracao ENUM('Pendente','Concluida','Falhou') NOT NULL DEFAULT 'Pendente',
  ErroGeracao VARCHAR(500) NULL,
  GeradoEm DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recomendacao_prova (ProvaAgendadaGUID),
  CONSTRAINT FK_ProvaAgendadaRecomendacao_Prova FOREIGN KEY (ProvaAgendadaGUID) REFERENCES provaagendada(ProvaAgendadaGUID) ON DELETE CASCADE
);
