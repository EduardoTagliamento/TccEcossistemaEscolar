-- =====================================================
-- MIGRATION: Corrige nomenclatura das colunas de `evento`
-- Data: 2026-07-22
-- Descrição: Mesma situação de 2026-07-22-fix-pendencia-timestamps.sql — a
--            tabela `evento` foi criada manualmente em produção, fora do
--            fluxo normal de migration deste projeto (nenhum CREATE TABLE
--            rastreado em backend/database/migrations/ nem em sql.txt — ver
--            docs/routes/evento-api.md, que já sinalizava isso como schema
--            "inferido, a confirmar"). O schema real diverge do que TODO o
--            código já esperava (entity, service, DTOs, frontend
--            evento.api.ts) em 3 colunas:
--              - `EventoConteudo`  → `EventoDescricao`
--              - `EventoDataHora`  → `EventoData`
--              - `CreatedAt`       → `EventoCreatedAt`
--              - `UpdatedAt`       → `EventoUpdatedAt`
--            Causava: "Unknown column 'EventoDescricao' in 'field list'" ao
--            listar eventos (EventoDAO.findAll).
--            RENAME preserva os dados existentes — não é uma recriação.
--
--            A tabela real também tem uma coluna `UsuarioCPF` (NOT NULL, FK
--            pra `usuario`, sem default) que a entidade/serviço nunca
--            populavam — corrigido no código nesta mesma sessão (Evento
--            passou a receber/persistir o CPF de quem criou o evento);
--            não precisa de alteração de schema pra isso, só o rename acima.
-- =====================================================

ALTER TABLE `evento`
  CHANGE COLUMN `EventoConteudo` `EventoDescricao` VARCHAR(1024) NULL,
  CHANGE COLUMN `EventoDataHora` `EventoData` DATETIME NOT NULL,
  CHANGE COLUMN `CreatedAt` `EventoCreatedAt` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  CHANGE COLUMN `UpdatedAt` `EventoUpdatedAt` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
