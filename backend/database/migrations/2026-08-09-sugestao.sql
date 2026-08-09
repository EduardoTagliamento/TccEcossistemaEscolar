-- =====================================================
-- MIGRATION: Módulo de Sugestão (temporário, beta com grupo pequeno)
-- Data: 2026-08-09
-- Descrição: Botão flutuante "?" em todo o dashboard, onde qualquer usuário
--            autenticado pode mandar uma sugestão/feedback de texto livre.
--            Admin de plataforma (UsuarioIsPlataformaAdmin) vê a lista em
--            /admin-plataforma. Sem FK pra escola (só contexto informativo,
--            sugestão pode não estar ligada a uma escola específica) — feito
--            pra ser fácil de remover quando o teste com o grupo terminar
--            (basta DROP TABLE, sem nada mais dependendo dela).
-- =====================================================

CREATE TABLE IF NOT EXISTS `sugestao` (
  `SugestaoGUID` CHAR(36) NOT NULL,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `EscolaGUID` CHAR(36) NULL,
  `SugestaoTexto` TEXT NOT NULL,
  `SugestaoPaginaUrl` VARCHAR(255) NULL,
  `SugestaoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`SugestaoGUID`),
  INDEX `idx_sugestao_created` (`SugestaoCreatedAt`)
) ENGINE=InnoDB;

ALTER TABLE `sugestao`
  ADD CONSTRAINT `FK_Sugestao_Usuario` FOREIGN KEY (`UsuarioCPF`)
    REFERENCES `usuario`(`UsuarioCPF`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

-- =====================================================
-- ROLLBACK (quando o teste com o grupo terminar):
-- =====================================================
-- DROP TABLE IF EXISTS `sugestao`;
