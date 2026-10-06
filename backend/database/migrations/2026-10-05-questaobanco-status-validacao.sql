-- =====================================================
-- MIGRATION: Status de validação em QuestaoBanco (Pendente/Validado)
-- Data: 2026-10-05
-- Descrição: questões extraídas automaticamente de livros (Peça 3, pipeline em
--            F:\Area de Trabalho\ivros) nunca foram revisadas por um humano —
--            precisam de uma fila de validação antes de aparecer pro aluno no
--            banco de questões. Pedido do Eduardo, 2026-10-05.
--
--            `ADD COLUMN ... DEFAULT 'Pendente'` preenche as linhas JÁ
--            EXISTENTES com 'Pendente' também (não só as futuras) — decisão
--            deliberada: as questões já importadas nunca passaram por revisão
--            humana, então também precisam entrar na fila.
--
-- Código de aplicação que consome esta coluna:
--   - backend/entities/questaobanco.model.ts: getter/setter Status.
--   - backend/repositories/questaobanco.repository.ts: filtro Status em
--     findAll/QuestaoBancoFiltros, update() genérico.
--   - backend/services/questaobanco.service.ts: atualizarQuestao/validarQuestao.
--   - backend/controllers/questaobanco.controller.ts + routes/questaobanco.routes.ts:
--     GET /api/questaobanco força Status=Validado (público/aluno); GET
--     /api/questaobanco/pendentes, PATCH /api/questaobanco/:guid e PATCH
--     /api/questaobanco/:guid/validar atrás de plataformaAdminGuard.
-- =====================================================

ALTER TABLE `questaobanco`
  ADD COLUMN `Status` ENUM('Pendente', 'Validado') NOT NULL DEFAULT 'Pendente' AFTER `Dificuldade`;

-- =====================================================
-- Como verificar se já foi executada:
-- SHOW COLUMNS FROM questaobanco LIKE 'Status';
-- (se devolver 1 linha, já foi executada)
--
-- ROLLBACK:
-- ALTER TABLE `questaobanco` DROP COLUMN `Status`;
-- =====================================================
