-- =====================================================
-- MIGRATION: Foto de perfil do usuário
-- Data: 2026-07-19
-- Descrição: Adiciona UsuarioFotoUrl (URL pública no Cloudflare R2) para
--            suportar o painel de "Configuração do usuário" no dropdown
--            do avatar (dashboard). Troca de senha não precisa de coluna
--            nova — reaproveita UsuarioSenha já existente.
--            Ver docs/RELATORIO_BAUA_CODIGO.md, seção 11.
-- =====================================================

ALTER TABLE `usuario`
  ADD COLUMN `UsuarioFotoUrl` VARCHAR(500) NULL AFTER `UsuarioEmail`;
