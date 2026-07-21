-- =====================================================
-- MIGRATION: Registro de Auditoria + Último acesso do usuário na escola
-- Data: 2026-07-21
-- Descrição: Cria o módulo transversal de auditoria (quem fez o quê,
--            quando, em qual entidade, por escola), com catálogo de
--            categorias de sensibilidade/retenção diferenciada, e uma
--            sub-feature estruturalmente separada (não é log imutável):
--            o "último acesso do usuário na escola", um único timestamp
--            por usuário+escola, sobrescrito a cada acesso.
--            Ver docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md, Seções
--            3, 3.1, 3.2 e 3.4 (DDL copiado de lá, já desenhado em cima
--            do schema real do projeto).
-- =====================================================

-- ---------------------------------------------------
-- 1. categoriaauditoria — catálogo estático de categorias de sensibilidade
-- ---------------------------------------------------
CREATE TABLE `categoriaauditoria` (
  `CategoriaAuditoriaId` TINYINT UNSIGNED NOT NULL,
  `CategoriaAuditoriaNome` VARCHAR(40) NOT NULL COMMENT 'Ex.: Trivial, Operacional, DadosPessoais, Financeiro, SegurancaConta',
  `CategoriaAuditoriaRetencaoDias` INT NOT NULL COMMENT 'Prazo de retenção em dias antes do expurgo pelo job de limpeza',
  `CategoriaAuditoriaDescricao` VARCHAR(255) NULL,
  PRIMARY KEY (`CategoriaAuditoriaId`)
);

INSERT INTO `categoriaauditoria`
  (`CategoriaAuditoriaId`, `CategoriaAuditoriaNome`, `CategoriaAuditoriaRetencaoDias`, `CategoriaAuditoriaDescricao`)
VALUES
  (1, 'Trivial', 90, 'Ações de baixo impacto: preferências, marcar pendência como feita, editar nome de grupo/turma'),
  (2, 'Operacional', 365, 'Rotina acadêmica: eventos, conteúdo, tarefas, provas, matérias, cursos, horários'),
  (3, 'DadosPessoais', 730, 'Criação/edição/exclusão de usuário, matrícula, vínculo escola-usuário-função, dados de responsável/aluno'),
  (4, 'Financeiro', 730, 'Reservado para módulo financeiro (não implementado hoje)'),
  (5, 'SegurancaConta', 365, 'Troca de senha, verificação de e-mail, mudança de função/permissão de um usuário na escola')
ON DUPLICATE KEY UPDATE
  `CategoriaAuditoriaNome` = VALUES(`CategoriaAuditoriaNome`),
  `CategoriaAuditoriaRetencaoDias` = VALUES(`CategoriaAuditoriaRetencaoDias`),
  `CategoriaAuditoriaDescricao` = VALUES(`CategoriaAuditoriaDescricao`);

-- ---------------------------------------------------
-- 2. registroauditoria — a tabela de fatos (sem diff antes/depois)
-- ---------------------------------------------------
CREATE TABLE `registroauditoria` (
  `RegistroAuditoriaGUID` CHAR(36) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `UsuarioCPFAtor` VARCHAR(14) NOT NULL COMMENT 'Quem executou a ação (req.user.UsuarioCPF no momento da chamada)',
  `AcaoTipo` ENUM('Create','Update','Delete') NOT NULL,
  `EntidadeTipo` VARCHAR(60) NOT NULL COMMENT 'Nome lógico do recurso afetado, ex.: matricula, pendencia, evento, turma',
  `EntidadeGUID` VARCHAR(36) NOT NULL COMMENT 'PK do registro afetado (GUID na maioria das entidades do projeto)',
  `EntidadeDescricao` VARCHAR(255) NULL COMMENT 'Rótulo legível opcional para exibição na tela (ex. título/nome do registro afetado no momento da ação)',
  `CategoriaAuditoriaId` TINYINT UNSIGNED NOT NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Momento em que a ação ocorreu',
  PRIMARY KEY (`RegistroAuditoriaGUID`),
  INDEX `idx_registroauditoria_escola` (`EscolaGUID`),
  INDEX `idx_registroauditoria_ator` (`UsuarioCPFAtor`),
  INDEX `idx_registroauditoria_entidade` (`EntidadeTipo`, `EntidadeGUID`),
  INDEX `idx_registroauditoria_data` (`CreatedAt`),
  INDEX `idx_registroauditoria_categoria` (`CategoriaAuditoriaId`),
  CONSTRAINT `FK_RegistroAuditoria_Escola` FOREIGN KEY (`EscolaGUID`) REFERENCES `escola` (`EscolaGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_RegistroAuditoria_Ator` FOREIGN KEY (`UsuarioCPFAtor`) REFERENCES `usuario` (`UsuarioCPF`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `FK_RegistroAuditoria_Categoria` FOREIGN KEY (`CategoriaAuditoriaId`) REFERENCES `categoriaauditoria` (`CategoriaAuditoriaId`) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Sem FK física em EntidadeGUID (propositalmente — referencia dezenas de
-- tabelas diferentes, sem FK polimórfica no MySQL, mesmo padrão de
-- NotificacaoEntidadeTipo/GUID). ON DELETE RESTRICT em UsuarioCPFAtor
-- impede excluir fisicamente um usuário com histórico de auditoria.

-- ---------------------------------------------------
-- 3. usuarioxescolaacesso — último acesso do usuário na escola (NÃO é
--    registro de auditoria: valor mutável, sobrescrito a cada acesso)
-- ---------------------------------------------------
CREATE TABLE `usuarioxescolaacesso` (
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `UltimoAcessoEm` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`UsuarioCPF`, `EscolaGUID`),
  CONSTRAINT `FK_UsuarioEscolaAcesso_Usuario` FOREIGN KEY (`UsuarioCPF`)
    REFERENCES `usuario` (`UsuarioCPF`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `FK_UsuarioEscolaAcesso_Escola` FOREIGN KEY (`EscolaGUID`)
    REFERENCES `escola` (`EscolaGUID`) ON UPDATE CASCADE ON DELETE RESTRICT
);
