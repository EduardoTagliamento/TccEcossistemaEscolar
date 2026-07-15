-- =====================================================
-- MIGRATION: Adicionar ProvaDataTurma em provaagendada_turma
-- Data: 2026-07-14
-- Descrição: Permite que cada turma atribuída a uma prova tenha uma
--            data/hora própria (usada pelo agendamento automático baseado
--            no cronograma). Quando NULL, usa a data compartilhada em
--            provaagendada.ProvaData (comportamento manual, inalterado).
-- =====================================================

ALTER TABLE `provaagendada_turma`
ADD COLUMN `ProvaDataTurma` DATETIME NULL AFTER `TurmaGUID`;

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- ALTER TABLE `provaagendada_turma` DROP COLUMN `ProvaDataTurma`;
