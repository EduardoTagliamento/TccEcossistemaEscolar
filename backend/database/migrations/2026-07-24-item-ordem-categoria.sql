-- ============================================================
-- Ordem de item dentro da categoria (drag-and-drop de item entre
-- categorias / dentro da mesma categoria) — módulo Matérias.
-- Tudo aditivo (colunas nullable com default) — retrocompatível.
-- ============================================================

ALTER TABLE tarefaacademica
  ADD COLUMN ItemOrdem INT NOT NULL DEFAULT 0 AFTER CategoriaGUID;

ALTER TABLE conteudoturma
  ADD COLUMN ItemOrdem INT NOT NULL DEFAULT 0 AFTER CategoriaGUID;

ALTER TABLE provaagendada_turma
  ADD COLUMN ItemOrdem INT NOT NULL DEFAULT 0 AFTER CategoriaGUID;
