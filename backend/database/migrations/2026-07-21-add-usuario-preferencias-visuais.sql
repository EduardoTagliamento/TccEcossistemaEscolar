-- =====================================================
-- MIGRATION: Preferências visuais e de acessibilidade do usuário
-- Data: 2026-07-21
-- Descrição: Adiciona as colunas usadas pela seção "Preferências de
--            acessibilidade" da tela "Meu Perfil"
--            (`/dashboard/[escolaGUID]/perfil`), persistidas por conta
--            (sincronizado entre dispositivos, sem localStorage):
--              - UsuarioTema: claro / escuro / sistema
--              - UsuarioModoDaltonico: paleta segura pra daltonismo
--                (troca verde/vermelho semântico por azul/laranja)
--              - UsuarioEscalaFonte: tamanho de texto (pequeno/médio/grande)
--              - UsuarioReduzirMovimento: força redução de animações
--                independente da preferência do SO
--              - UsuarioAltoContraste: reforça contraste texto/borda/foco
--            Mesmo padrão de 2026-07-19-add-usuario-foto-e-senha.sql
--            (colunas simples em `usuario`, sem tabela nova).
-- =====================================================

ALTER TABLE `usuario`
  ADD COLUMN `UsuarioTema` VARCHAR(10) NOT NULL DEFAULT 'system' AFTER `UsuarioFotoUrl`,
  ADD COLUMN `UsuarioModoDaltonico` TINYINT(1) NOT NULL DEFAULT 0 AFTER `UsuarioTema`,
  ADD COLUMN `UsuarioEscalaFonte` VARCHAR(10) NOT NULL DEFAULT 'medium' AFTER `UsuarioModoDaltonico`,
  ADD COLUMN `UsuarioReduzirMovimento` TINYINT(1) NOT NULL DEFAULT 0 AFTER `UsuarioEscalaFonte`,
  ADD COLUMN `UsuarioAltoContraste` TINYINT(1) NOT NULL DEFAULT 0 AFTER `UsuarioReduzirMovimento`;
