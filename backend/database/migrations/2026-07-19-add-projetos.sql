-- =====================================================
-- MIGRATION: Módulo Projetos
-- Data: 2026-07-19
-- Descrição: Cria as tabelas do módulo "Projetos" (professor/direção cria
--            um projeto direcionado a turmas específicas ou à escola
--            inteira; alunos elegíveis criam grupos com proposta própria,
--            grupo aberto ou fechado por convite). Ver
--            docs/PLANO_IMPLEMENTACAO_PROJETOS.md
-- =====================================================

-- =====================================================
-- TABELA: projeto
-- Atividade-mãe criada por Professor (FuncaoId=3) ou Direção (FuncaoId=6).
-- =====================================================
CREATE TABLE IF NOT EXISTS `projeto` (
  `ProjetoGUID` CHAR(36) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `UsuarioCPFCriador` VARCHAR(14) NOT NULL,
  `ProjetoTitulo` VARCHAR(128) NOT NULL,
  `ProjetoDescricao` VARCHAR(2048) NOT NULL COMMENT 'A ideia do projeto, definida pelo criador',
  `ProjetoMecanicaPontuacao` VARCHAR(1024) NULL COMMENT 'Texto livre descrevendo como o projeto será pontuado/avaliado',
  `ProjetoPublicoAlvo` ENUM('Escola','Turmas') NOT NULL DEFAULT 'Turmas',
  `ProjetoGrupoMinPessoas` INT NOT NULL DEFAULT 1,
  `ProjetoGrupoMaxPessoas` INT NOT NULL,
  `ProjetoInscricaoPrazoData` DATETIME NOT NULL COMMENT 'Prazo para criar/entrar em grupos',
  `ProjetoEntregaPrazoData` DATETIME NULL COMMENT 'Prazo final do projeto em si (pode ser posterior ao prazo de inscrição)',
  `ProjetoStatus` ENUM('Aberto','Encerrado') NOT NULL DEFAULT 'Aberto',
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ProjetoGUID`),
  INDEX `idx_projeto_escola` (`EscolaGUID`),
  INDEX `idx_projeto_criador` (`UsuarioCPFCriador`),
  CONSTRAINT `CHK_ProjetoGrupoMinPessoas` CHECK (`ProjetoGrupoMinPessoas` >= 1),
  CONSTRAINT `CHK_ProjetoGrupoMaxPessoas` CHECK (`ProjetoGrupoMaxPessoas` >= `ProjetoGrupoMinPessoas`),
  CONSTRAINT `FK_Projeto_Escola` FOREIGN KEY (`EscolaGUID`)
    REFERENCES `escola` (`EscolaGUID`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_Projeto_Criador` FOREIGN KEY (`UsuarioCPFCriador`)
    REFERENCES `usuario` (`UsuarioCPF`)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

-- =====================================================
-- TABELA: projetoturma
-- Turmas elegíveis (só populada quando ProjetoPublicoAlvo='Turmas').
-- =====================================================
CREATE TABLE IF NOT EXISTS `projetoturma` (
  `ProjetoGUID` CHAR(36) NOT NULL,
  `TurmaGUID` CHAR(36) NOT NULL,
  PRIMARY KEY (`ProjetoGUID`, `TurmaGUID`),
  CONSTRAINT `FK_ProjetoTurma_Projeto` FOREIGN KEY (`ProjetoGUID`)
    REFERENCES `projeto` (`ProjetoGUID`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_ProjetoTurma_Turma` FOREIGN KEY (`TurmaGUID`)
    REFERENCES `turma` (`TurmaGUID`)
    ON UPDATE CASCADE ON DELETE CASCADE
);

-- =====================================================
-- TABELA: grupoprojeto
-- Grupo criado manualmente por um aluno (líder), pode reunir alunos de
-- turmas diferentes — por isso NÃO tem TurmaGUID (diferente de grupotarefa).
-- =====================================================
CREATE TABLE IF NOT EXISTS `grupoprojeto` (
  `GrupoProjetoGUID` CHAR(36) NOT NULL,
  `ProjetoGUID` CHAR(36) NOT NULL,
  `UsuarioCPFLider` VARCHAR(14) NOT NULL,
  `GrupoProjetoNome` VARCHAR(128) NULL,
  `GrupoProjetoProposta` VARCHAR(2048) NOT NULL COMMENT 'Proposta do grupo para o projeto, escrita pelo líder na criação',
  `GrupoProjetoVisibilidade` ENUM('Aberto','Fechado') NOT NULL DEFAULT 'Fechado',
  `GrupoProjetoPontuacao` DECIMAL(6,2) NULL COMMENT 'Preenchido pelo criador do projeto ao avaliar',
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`GrupoProjetoGUID`),
  INDEX `idx_grupoprojeto_projeto` (`ProjetoGUID`),
  INDEX `idx_grupoprojeto_lider` (`UsuarioCPFLider`),
  CONSTRAINT `FK_GrupoProjeto_Projeto` FOREIGN KEY (`ProjetoGUID`)
    REFERENCES `projeto` (`ProjetoGUID`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_GrupoProjeto_Lider` FOREIGN KEY (`UsuarioCPFLider`)
    REFERENCES `usuario` (`UsuarioCPF`)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

-- =====================================================
-- TABELA: usuarioxgrupoprojeto
-- Membros não-líderes do grupo.
-- =====================================================
CREATE TABLE IF NOT EXISTS `usuarioxgrupoprojeto` (
  `GrupoProjetoGUID` CHAR(36) NOT NULL,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `DataEntrada` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`GrupoProjetoGUID`, `UsuarioCPF`),
  CONSTRAINT `FK_UXGP_Grupo` FOREIGN KEY (`GrupoProjetoGUID`)
    REFERENCES `grupoprojeto` (`GrupoProjetoGUID`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_UXGP_Usuario` FOREIGN KEY (`UsuarioCPF`)
    REFERENCES `usuario` (`UsuarioCPF`)
    ON UPDATE CASCADE ON DELETE CASCADE
);

-- =====================================================
-- TABELA: convitegrupoprojeto
-- Convite (líder→aluno) e Solicitação (aluno→grupo), espelha
-- convitegrupotarefa. Só relevante para grupos GrupoProjetoVisibilidade='Fechado'.
-- =====================================================
CREATE TABLE IF NOT EXISTS `convitegrupoprojeto` (
  `ConviteGUID` CHAR(36) NOT NULL,
  `GrupoProjetoGUID` CHAR(36) NOT NULL,
  `UsuarioCPFConvidado` VARCHAR(14) NOT NULL,
  `ConviteTipo` ENUM('Convite','Solicitacao') NOT NULL,
  `ConviteStatus` ENUM('Pendente','Aceito','Recusado') NOT NULL DEFAULT 'Pendente',
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ConviteGUID`),
  INDEX `idx_convitegp_grupo` (`GrupoProjetoGUID`),
  INDEX `idx_convitegp_convidado` (`UsuarioCPFConvidado`),
  CONSTRAINT `FK_ConviteGP_Grupo` FOREIGN KEY (`GrupoProjetoGUID`)
    REFERENCES `grupoprojeto` (`GrupoProjetoGUID`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_ConviteGP_Usuario` FOREIGN KEY (`UsuarioCPFConvidado`)
    REFERENCES `usuario` (`UsuarioCPF`)
    ON UPDATE CASCADE ON DELETE CASCADE
);

-- =====================================================
-- TABELA: historicogrupoprojeto
-- Auditoria de ações do grupo, espelha historicogrupotarefa.
-- =====================================================
CREATE TABLE IF NOT EXISTS `historicogrupoprojeto` (
  `HistoricoGUID` CHAR(36) NOT NULL,
  `GrupoProjetoGUID` CHAR(36) NOT NULL,
  `HistoricoTipo` ENUM('Entrada','Saida','Expulsao','TransferenciaLider','MudancaVisibilidade','PontuacaoAtribuida') NOT NULL,
  `UsuarioCPFAtor` VARCHAR(14) NOT NULL,
  `UsuarioCPFAlvo` VARCHAR(14) NULL,
  `HistoricoDetalhes` JSON NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`HistoricoGUID`),
  INDEX `idx_historicogp_grupo` (`GrupoProjetoGUID`),
  CONSTRAINT `FK_HistoricoGP_Grupo` FOREIGN KEY (`GrupoProjetoGUID`)
    REFERENCES `grupoprojeto` (`GrupoProjetoGUID`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_HistoricoGP_Ator` FOREIGN KEY (`UsuarioCPFAtor`)
    REFERENCES `usuario` (`UsuarioCPF`)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

-- =====================================================
-- SEED: notificacaotipo (novos slugs do módulo Projetos)
-- FuncaoId: 1=Coordenacao 2=Secretaria 3=Professor 4=Responsavel 5=Aluno 6=Direcao
-- =====================================================
INSERT INTO `notificacaotipo`
  (`NotificacaoTipoSlug`, `NotificacaoTipoDescricao`, `NotificacaoTipoCategoria`, `NotificacaoTipoEmailPadrao`, `NotificacaoTipoWhatsappPadrao`)
VALUES
  ('projeto_criado',              'Novo projeto disponível para participar',   'Aviso', 1, 1),
  ('convite_grupo_projeto',       'Convite para grupo de projeto',             'Aviso', 1, 1),
  ('solicitacao_grupo_projeto',   'Solicitação de entrada em grupo de projeto','Aviso', 0, 0),
  ('removido_grupo_projeto',      'Removido de um grupo de projeto',           'Aviso', 0, 0),
  ('projeto_pontuacao_atribuida', 'Pontuação do grupo de projeto foi lançada', 'Aviso', 1, 1)
ON DUPLICATE KEY UPDATE
  `NotificacaoTipoDescricao` = VALUES(`NotificacaoTipoDescricao`),
  `NotificacaoTipoCategoria` = VALUES(`NotificacaoTipoCategoria`),
  `NotificacaoTipoEmailPadrao` = VALUES(`NotificacaoTipoEmailPadrao`),
  `NotificacaoTipoWhatsappPadrao` = VALUES(`NotificacaoTipoWhatsappPadrao`);

-- =====================================================
-- SEED: notificacaotipofuncao (resolvido por slug, seguro para reexecutar)
-- =====================================================
INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'projeto_criado'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'convite_grupo_projeto'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 3 AS FuncaoId UNION ALL SELECT 6) f
WHERE t.`NotificacaoTipoSlug` = 'solicitacao_grupo_projeto'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'removido_grupo_projeto'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

INSERT INTO `notificacaotipofuncao` (`NotificacaoTipoId`, `FuncaoId`)
SELECT t.`NotificacaoTipoId`, f.`FuncaoId`
FROM `notificacaotipo` t
CROSS JOIN (SELECT 5 AS FuncaoId) f
WHERE t.`NotificacaoTipoSlug` = 'projeto_pontuacao_atribuida'
ON DUPLICATE KEY UPDATE `notificacaotipofuncao`.`NotificacaoTipoId` = `notificacaotipofuncao`.`NotificacaoTipoId`;

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
-- DROP TABLE IF EXISTS `historicogrupoprojeto`;
-- DROP TABLE IF EXISTS `convitegrupoprojeto`;
-- DROP TABLE IF EXISTS `usuarioxgrupoprojeto`;
-- DROP TABLE IF EXISTS `grupoprojeto`;
-- DROP TABLE IF EXISTS `projetoturma`;
-- DROP TABLE IF EXISTS `projeto`;
-- DELETE FROM `notificacaotipo` WHERE `NotificacaoTipoSlug` IN ('projeto_criado','convite_grupo_projeto','solicitacao_grupo_projeto','removido_grupo_projeto','projeto_pontuacao_atribuida');
