-- Migration: Lançamento de Prova/Tarefa/Conteúdo por Representante (temporário)
-- Data: 27/09/2026
-- Ver docs/PLANO_IMPLEMENTACAO_LANCAMENTO_POR_REPRESENTANTE.md

-- 1) Flag por escola
ALTER TABLE escolaconfiguracao
  ADD COLUMN PermiteLancamentoPorRepresentante BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) provaagendada — autoria real + modo de agendamento
ALTER TABLE provaagendada
  ADD COLUMN CriadoPorRepresentanteUsuarioGUID CHAR(12) NULL,
  ADD COLUMN ProvaModoAutomatico BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN ProvaSemanaBase DATE NULL,
  ADD COLUMN ProvaDiaSemana ENUM('Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo') NULL,
  ADD CONSTRAINT FK_ProvaAgendada_Representante FOREIGN KEY (CriadoPorRepresentanteUsuarioGUID)
    REFERENCES usuario(UsuarioGUID) ON UPDATE CASCADE ON DELETE RESTRICT;

-- 3) tarefaacademica — autoria real + modo de agendamento
-- ATENÇÃO: tarefaacademica é a única das tabelas tocadas por esta migration
-- cujo collation PADRÃO é utf8mb4_unicode_ci (as demais usam
-- utf8mb4_0900_ai_ci, igual usuario.UsuarioGUID) — sem o CHARACTER
-- SET/COLLATE explícito abaixo, a FK falha com Error 3780 (confirmado ao
-- rodar esta migration em produção em 28/09/2026). As colunas GUID que já
-- existem nesta tabela (TarefaGUID, matXprofXturxescGUID, CategoriaGUID) já
-- tinham esse mesmo override, por este mesmo motivo.
ALTER TABLE tarefaacademica
  ADD COLUMN CriadoPorRepresentanteUsuarioGUID CHAR(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  ADD COLUMN TarefaPrazoModoAutomatico BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN TarefaPrazoSemanaBase DATE NULL,
  ADD COLUMN TarefaPrazoDiaSemana ENUM('Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo') NULL,
  ADD CONSTRAINT FK_TarefaAcademica_Representante FOREIGN KEY (CriadoPorRepresentanteUsuarioGUID)
    REFERENCES usuario(UsuarioGUID) ON UPDATE CASCADE ON DELETE RESTRICT;

-- 4) conteudo — só autoria real (sem prazo, ver §2.3 da spec)
ALTER TABLE conteudo
  ADD COLUMN CriadoPorRepresentanteUsuarioGUID CHAR(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  ADD CONSTRAINT FK_Conteudo_Representante FOREIGN KEY (CriadoPorRepresentanteUsuarioGUID)
    REFERENCES usuario(UsuarioGUID) ON UPDATE CASCADE ON DELETE RESTRICT;

-- 5) Tabela de propagação (fan-out de confirmação via WhatsApp)
-- Colunas GUID com CHARACTER SET/COLLATE explícitos por segurança (ver nota
-- do item 3 acima) — garante que batem com usuario/turma independente do
-- collation padrão que esta tabela nova viesse a herdar.
CREATE TABLE representantelancamentopropagacao (
  PropagacaoGUID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL PRIMARY KEY,
  TipoOrigem ENUM('Prova','Tarefa','Conteudo') NOT NULL,
  OrigemGUID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  TurmaOrigemGUID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  TurmaDestinoGUID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  RepresentanteDestinoUsuarioGUID CHAR(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  Status ENUM('Pendente','Confirmado','RecusadoComEdicao') NOT NULL DEFAULT 'Pendente',
  ConteudoEditado TEXT NULL,
  EntidadeResultanteGUID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  RespondidoEm TIMESTAMP NULL,
  UNIQUE KEY UQ_Propagacao_Origem_Turma (OrigemGUID, TurmaDestinoGUID),
  INDEX idx_propagacao_turma_destino (TurmaDestinoGUID),
  INDEX idx_propagacao_status (Status),
  CONSTRAINT FK_Propagacao_TurmaOrigem FOREIGN KEY (TurmaOrigemGUID)
    REFERENCES turma(TurmaGUID) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT FK_Propagacao_TurmaDestino FOREIGN KEY (TurmaDestinoGUID)
    REFERENCES turma(TurmaGUID) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT FK_Propagacao_Representante FOREIGN KEY (RepresentanteDestinoUsuarioGUID)
    REFERENCES usuario(UsuarioGUID) ON UPDATE CASCADE ON DELETE RESTRICT
);
