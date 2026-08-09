-- =====================================================
-- MIGRATION: Anexo em Sugestão (módulo temporário, beta com grupo pequeno)
-- Data: 2026-08-10
-- Descrição: Vínculo de anexo (mesmo padrão de relacaoanexosaviso — sem
--            AnexoTipo, sem tabela pivot unificada) pro módulo de Sugestão
--            (ver 2026-08-09-sugestao.sql). Um anexo por sugestão na UI,
--            mas o schema já suporta N por simetria com o resto do projeto.
-- =====================================================

CREATE TABLE IF NOT EXISTS `relacaoanexossugestao` (
  `RelacaoAnexoSugestaoGUID` CHAR(36) NOT NULL,
  `AnexoGUID` CHAR(36) NOT NULL,
  `SugestaoGUID` CHAR(36) NOT NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`RelacaoAnexoSugestaoGUID`),
  INDEX `idx_relacaoanexossugestao_sugestao` (`SugestaoGUID`)
) ENGINE=InnoDB;

ALTER TABLE `relacaoanexossugestao`
  ADD CONSTRAINT `FK_RelacaoAnexoSugestao_Anexo` FOREIGN KEY (`AnexoGUID`)
    REFERENCES `anexo`(`AnexoGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE `relacaoanexossugestao`
  ADD CONSTRAINT `FK_RelacaoAnexoSugestao_Sugestao` FOREIGN KEY (`SugestaoGUID`)
    REFERENCES `sugestao`(`SugestaoGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

-- =====================================================
-- ROLLBACK (junto com o resto do módulo, quando o teste com o grupo terminar):
-- =====================================================
-- DROP TABLE IF EXISTS `relacaoanexossugestao`;
