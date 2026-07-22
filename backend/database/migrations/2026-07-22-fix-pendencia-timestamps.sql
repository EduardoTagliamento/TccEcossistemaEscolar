-- =====================================================
-- MIGRATION: Corrige nomenclatura das colunas de timestamp de `pendencia`
-- Data: 2026-07-22
-- Descrição: A tabela `pendencia` foi criada manualmente em produção, fora
--            do fluxo normal de migration deste projeto (nenhum CREATE TABLE
--            rastreado em backend/database/migrations/ nem em sql.txt — ver
--            docs/routes/pendencia-api.md, que já sinalizava isso como
--            schema "inferido, a confirmar"). Ela usa `CreatedAt`/`UpdatedAt`
--            (sem prefixo), enquanto TODO o resto do projeto — e todo o
--            código que já existia para pendência (backend/repositories/
--            pendencia.repository.ts, backend/entities/pendencia.model.ts)
--            — usa o padrão prefixado (`PendenciaCreatedAt`/
--            `PendenciaUpdatedAt`), igual toda outra tabela (Notificacao,
--            Evento, Usuario, Matricula, etc.). Isso causava:
--            "Unknown column 'PendenciaCreatedAt' in 'field list'" ao criar
--            uma pendência (PendenciaDAO.create → findById).
--            RENAME preserva os dados existentes — não é uma recriação.
-- =====================================================

ALTER TABLE `pendencia`
  CHANGE COLUMN `CreatedAt` `PendenciaCreatedAt` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  CHANGE COLUMN `UpdatedAt` `PendenciaUpdatedAt` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
