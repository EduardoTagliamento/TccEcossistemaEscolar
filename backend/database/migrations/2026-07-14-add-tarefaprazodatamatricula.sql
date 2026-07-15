-- =====================================================
-- MIGRATION: Adicionar TarefaPrazoDataMatricula em tarefaacademica_matricula
-- Data: 2026-07-14
-- Descrição: Permite que cada aluno atribuído a uma tarefa tenha um prazo
--            próprio (usado pelo agendamento automático baseado no
--            cronograma — cada turma do aluno pode ter um prazo diferente).
--            Quando NULL, usa o prazo compartilhado em
--            tarefaacademica.TarefaPrazoData (comportamento manual,
--            inalterado).
-- =====================================================

ALTER TABLE `tarefaacademica_matricula`
ADD COLUMN `TarefaPrazoDataMatricula` DATETIME NULL AFTER `MatriculaGUID`;

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- ALTER TABLE `tarefaacademica_matricula` DROP COLUMN `TarefaPrazoDataMatricula`;
