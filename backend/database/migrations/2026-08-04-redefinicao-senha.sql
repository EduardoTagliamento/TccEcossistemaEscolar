-- =====================================================
-- TABELA: redefinicao_senha
-- Descrição: Tokens de "esqueci minha senha" — mesmo padrão de
-- expiração/uso único de `verificacao_email`, mas com token longo
-- aleatório (64 hex chars) em vez de código de 6 dígitos: aqui o fluxo é
-- público e não-autenticado (qualquer um pode chamar "esqueci a senha"),
-- então o token precisa ser inviável de adivinhar por força bruta —
-- 1 milhão de combinações de um código de 6 dígitos não seria suficiente
-- de proteção sem o portador já estar autenticado.
-- =====================================================
CREATE TABLE `railway`.`redefinicao_senha` (
  `RedefinicaoId` INT NOT NULL AUTO_INCREMENT,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `RedefinicaoToken` VARCHAR(64) NOT NULL,
  `RedefinicaoExpiresAt` TIMESTAMP NOT NULL,
  `RedefinicaoUsado` BOOLEAN NOT NULL DEFAULT FALSE,
  `RedefinicaoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`RedefinicaoId`),
  UNIQUE INDEX `idx_redefinicao_token` (`RedefinicaoToken`),
  INDEX `idx_redefinicao_cpf` (`UsuarioCPF`),
  INDEX `idx_redefinicao_expira` (`RedefinicaoExpiresAt`),
  CONSTRAINT `FK_Redefinicao_Usuario` FOREIGN KEY (`UsuarioCPF`)
    REFERENCES `railway`.`usuario` (`UsuarioCPF`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);
