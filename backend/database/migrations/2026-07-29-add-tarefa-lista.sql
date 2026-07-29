-- =====================================================
-- MIGRATION: Tarefa tipo "lista" (quiz estilo Forms)
-- Data: 2026-07-29
-- Descrição: 4 tabelas novas para suportar o 3º tipo de TarefaAcademica
--            (TarefaTipoEntrega='lista'), além de 'digital'/'fisica':
--            - tarefaacademica_questao: questões da lista (objetiva/discursiva)
--            - tarefaacademica_alternativa: alternativas de questão objetiva
--            - tarefaacademica_questao_anexo: pivot N:N questão<->anexo
--            - tarefaacademica_resposta: resposta de cada aluno por questão
--
--            Não altera `tarefaacademica` nem `tarefaacademica_matricula`
--            (TarefaTipoEntrega já é VARCHAR(50), não ENUM — 'lista' passa a
--            ser aceito só pela validação em aplicação).
--
--            COLLATE explícito: schema drift real confirmado contra produção
--            (INFORMATION_SCHEMA.COLUMNS, 2026-07-29) — NÃO é uniforme entre
--            as tabelas referenciadas:
--              - tarefaacademica.TarefaGUID           -> utf8mb4_0900_ai_ci
--              - tarefaacademica_matricula.TarefaMatriculaGUID -> utf8mb4_unicode_ci
--              - usuario.UsuarioCPF                   -> utf8mb4_0900_ai_ci
--              - anexo.AnexoGUID                      -> utf8mb4_0900_ai_ci
--            Cada FK abaixo casa a collation da coluna que ela referencia,
--            não um padrão fixo — mesmo motivo documentado em
--            2026-07-28-add-tarefamatriculaguid-relacaoanexostarefa.sql
--            (ER_FK_INCOMPATIBLE_COLUMNS/3780 já ocorreu por herdar o padrão
--            da tabela em vez de casar com a coluna referenciada). A collation
--            de `anexo.AnexoGUID` também é detectada em tempo de execução
--            pelo script .ts (ver esse arquivo), como camada extra de defesa
--            contra esse mesmo tipo de drift mudar no futuro.
-- =====================================================

CREATE TABLE tarefaacademica_questao (
  QuestaoGUID           CHAR(36) PRIMARY KEY,
  TarefaGUID             CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
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
  QuestaoGUID         CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  AlternativaTexto    VARCHAR(512) NOT NULL,
  AlternativaCorreta  BOOLEAN NOT NULL DEFAULT FALSE,
  AlternativaPontos   DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  AlternativaOrdem    INT NOT NULL DEFAULT 0,
  CreatedAt           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT FK_Alternativa_Questao FOREIGN KEY (QuestaoGUID) REFERENCES tarefaacademica_questao(QuestaoGUID) ON DELETE CASCADE,
  INDEX idx_alternativa_questao (QuestaoGUID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AnexoGUID: no script .ts a collation é detectada dinamicamente; aqui, valor
-- confirmado contra produção em 2026-07-29 (utf8mb4_0900_ai_ci).
CREATE TABLE tarefaacademica_questao_anexo (
  QuestaoAnexoGUID  CHAR(36) PRIMARY KEY,
  QuestaoGUID        CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  AnexoGUID          CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  CreatedAt          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT FK_QuestaoAnexo_Questao FOREIGN KEY (QuestaoGUID) REFERENCES tarefaacademica_questao(QuestaoGUID) ON DELETE CASCADE,
  CONSTRAINT FK_QuestaoAnexo_Anexo FOREIGN KEY (AnexoGUID) REFERENCES anexo(AnexoGUID) ON DELETE CASCADE,
  INDEX idx_questaoanexo_questao (QuestaoGUID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tarefaacademica_resposta (
  RespostaGUID              CHAR(36) PRIMARY KEY,
  TarefaMatriculaGUID        CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  QuestaoGUID                 CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  AlternativaGUID               CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
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

-- =====================================================
-- ROLLBACK (caso necessário, ordem inversa por causa das FKs):
-- =====================================================
-- DROP TABLE IF EXISTS tarefaacademica_resposta;
-- DROP TABLE IF EXISTS tarefaacademica_questao_anexo;
-- DROP TABLE IF EXISTS tarefaacademica_alternativa;
-- DROP TABLE IF EXISTS tarefaacademica_questao;
