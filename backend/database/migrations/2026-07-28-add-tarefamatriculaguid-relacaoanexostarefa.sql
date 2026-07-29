-- =====================================================
-- MIGRATION: TarefaMatriculaGUID em relacaoanexostarefa
-- Data: 2026-07-28
-- Descrição: relacaoanexostarefa hoje só é escopada por TarefaGUID, mas uma
--            TarefaAcademica é compartilhada por N alunos (via
--            tarefaacademica_matricula). Isso fazia o anexo de ENTREGA
--            (AnexoTipo='entrega', enviado pelo aluno) ficar tecnicamente
--            visível/misturado entre todos os alunos atribuídos à mesma
--            tarefa — não havia como saber de quem era cada entrega.
--
--            Material de apoio do professor (AnexoTipo='descricao', endpoint
--            POST /api/tarefa/:guid/anexos) continua intencionalmente
--            compartilhado — não leva TarefaMatriculaGUID.
--
--            Mesmo padrão já usado em tarefaacademica_matricula (a entidade
--            "por aluno" de uma TarefaAcademica compartilhada) e em
--            relacaoanexospendencia (que já resolve isso via Pendencia.UsuarioCPF).
--
--            COLLATE explícito: `relacaoanexostarefa` foi criada com a
--            collation padrão da tabela (utf8mb4_0900_ai_ci), enquanto
--            `tarefaacademica_matricula.TarefaMatriculaGUID` (PK referenciada)
--            é utf8mb4_unicode_ci — schema drift pré-existente entre as duas
--            tabelas. MySQL exige collation idêntica entre colunas CHAR
--            ligadas por FK, então a nova coluna precisa casar explicitamente
--            com a collation da PK referenciada, não herdar o padrão da tabela.
-- =====================================================

ALTER TABLE `relacaoanexostarefa`
  ADD COLUMN `TarefaMatriculaGUID` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `TarefaGUID`,
  ADD INDEX `idx_relacao_matricula` (`TarefaMatriculaGUID`),
  ADD CONSTRAINT `FK_RelacaoAnexoTarefa_Matricula` FOREIGN KEY (`TarefaMatriculaGUID`)
    REFERENCES `tarefaacademica_matricula`(`TarefaMatriculaGUID`) ON UPDATE CASCADE ON DELETE CASCADE;

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- ALTER TABLE `relacaoanexostarefa` DROP FOREIGN KEY `FK_RelacaoAnexoTarefa_Matricula`;
-- ALTER TABLE `relacaoanexostarefa` DROP INDEX `idx_relacao_matricula`;
-- ALTER TABLE `relacaoanexostarefa` DROP COLUMN `TarefaMatriculaGUID`;
