-- =====================================================
-- MIGRATION: suporte a imagem em QuestaoBanco (Peça 3 da extração de livros P4ED)
-- Data: 2026-09-20
-- Descrição: questões extraídas de vestibulares frequentemente têm imagem no
--            enunciado (gráfico, mapa, tirinha, fórmula) e/ou em alternativas
--            (ex. "qual das imagens abaixo..."). Hoje `questaobanco`/
--            `questaobancoalternativa` só têm campos de texto puro (Enunciado,
--            AlternativaTexto) — confirmado por leitura direta dos models, não
--            existe nenhum campo de imagem em lugar nenhum desse schema.
--
--            Padrão seguido: EXATAMENTE o mesmo de `relacaoanexosaviso`/
--            `relacaoanexossugestao` (ver 2026-08-09-aviso.sql e
--            2026-08-10-sugestao-anexo.sql) — uma tabela pivot dedicada por
--            tipo de recurso, reusando a tabela `anexo` já existente (upload/R2
--            já resolvidos ali), sem tabela polimórfica única (este projeto não
--            usa esse padrão em lugar nenhum).
--
--            Precisa de DUAS tabelas, não uma: QuestaoBanco e
--            QuestaoBancoAlternativa são GUIDs de recursos diferentes (uma
--            questão pode ter imagem no enunciado E cada alternativa seu
--            próprio GUID).
--
-- Código de aplicação (repository/service/routes) que consome estas tabelas já
-- foi implementado e está com `tsc --noEmit` limpo — fica dormente até esta
-- migration rodar (as tabelas simplesmente não existem ainda, então nenhuma
-- query nova é executada em produção antes disso):
--   - backend/repositories/relacaoanexos.repository.ts: vincularAnexoQuestaoBanco/
--     findAnexosByQuestaoBanco + par equivalente pra Alternativa.
--   - backend/services/questaobanco.service.ts: QuestaoBancoCreateDTO aceita
--     `AnexoGUIDs?` na questão (enunciado) e por alternativa; criarQuestao vincula
--     com a mesma checagem de posse de SugestaoService.criarSugestao; listarQuestoes
--     devolve `Anexos` em cada questão/alternativa.
--   - routes/questaobanco.routes.ts: injeta RelacaoAnexosDAO + AnexoDAO no service.
-- =====================================================

CREATE TABLE IF NOT EXISTS `relacaoanexosquestaobanco` (
  `RelacaoAnexoQuestaoBancoGUID` CHAR(36) NOT NULL,
  `AnexoGUID` CHAR(36) NOT NULL,
  `QuestaoBancoGUID` CHAR(36) NOT NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`RelacaoAnexoQuestaoBancoGUID`),
  INDEX `idx_relacaoanexosquestaobanco_questao` (`QuestaoBancoGUID`)
) ENGINE=InnoDB;

ALTER TABLE `relacaoanexosquestaobanco`
  ADD CONSTRAINT `FK_RelacaoAnexoQuestaoBanco_Anexo` FOREIGN KEY (`AnexoGUID`)
    REFERENCES `anexo`(`AnexoGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE `relacaoanexosquestaobanco`
  ADD CONSTRAINT `FK_RelacaoAnexoQuestaoBanco_Questao` FOREIGN KEY (`QuestaoBancoGUID`)
    REFERENCES `questaobanco`(`QuestaoBancoGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS `relacaoanexosquestaobancoalternativa` (
  `RelacaoAnexoQuestaoBancoAlternativaGUID` CHAR(36) NOT NULL,
  `AnexoGUID` CHAR(36) NOT NULL,
  `AlternativaGUID` CHAR(36) NOT NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`RelacaoAnexoQuestaoBancoAlternativaGUID`),
  INDEX `idx_relacaoanexosqba_alternativa` (`AlternativaGUID`)
) ENGINE=InnoDB;

ALTER TABLE `relacaoanexosquestaobancoalternativa`
  ADD CONSTRAINT `FK_RelacaoAnexoQBA_Anexo` FOREIGN KEY (`AnexoGUID`)
    REFERENCES `anexo`(`AnexoGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE `relacaoanexosquestaobancoalternativa`
  ADD CONSTRAINT `FK_RelacaoAnexoQBA_Alternativa` FOREIGN KEY (`AlternativaGUID`)
    REFERENCES `questaobancoalternativa`(`AlternativaGUID`)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

-- =====================================================
-- Como verificar se já foi executada:
-- SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
-- WHERE TABLE_NAME IN ('relacaoanexosquestaobanco', 'relacaoanexosquestaobancoalternativa');
-- (se devolver as duas linhas, já foi executada)
--
-- ROLLBACK:
-- DROP TABLE IF EXISTS `relacaoanexosquestaobancoalternativa`;
-- DROP TABLE IF EXISTS `relacaoanexosquestaobanco`;
-- =====================================================
