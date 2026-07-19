/**
 * Migration: Sistema de Notificações
 * Data: 17/07/2026
 * Descrição: Catálogo de tipos de notificação, feed in-app, log de envio
 *            por canal (email/whatsapp) e preferências por usuário.
 *            Ver docs/PLANO_IMPLEMENTACAO_NOTIFICACOES.md
 */

import MysqlDatabase from "../MysqlDatabase";

const FUNCAO_TODOS = "SELECT 1 AS FuncaoId UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 5 UNION ALL SELECT 6";

async function seedNotificacaoTipoFuncao(pool: any, slug: string, funcaoSubquery: string) {
  await pool.execute(`
    INSERT INTO notificacaotipofuncao (NotificacaoTipoId, FuncaoId)
    SELECT t.NotificacaoTipoId, f.FuncaoId
    FROM notificacaotipo t
    CROSS JOIN (${funcaoSubquery}) f
    WHERE t.NotificacaoTipoSlug = ?
    ON DUPLICATE KEY UPDATE notificacaotipofuncao.NotificacaoTipoId = notificacaotipofuncao.NotificacaoTipoId;
  `, [slug]);
}

async function runMigration() {
  console.log("🔧 Iniciando migration: notificacoes");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    console.log("📝 Criando tabela notificacaotipo (se não existir)...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notificacaotipo (
        NotificacaoTipoId INT NOT NULL AUTO_INCREMENT,
        NotificacaoTipoSlug VARCHAR(50) NOT NULL,
        NotificacaoTipoDescricao VARCHAR(150) NOT NULL,
        NotificacaoTipoCategoria ENUM('Aviso','Lembrete') NOT NULL,
        NotificacaoTipoEmailPadrao TINYINT(1) NOT NULL DEFAULT 0,
        NotificacaoTipoWhatsappPadrao TINYINT(1) NOT NULL DEFAULT 0,
        NotificacaoTipoAtivo TINYINT(1) NOT NULL DEFAULT 1,
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (NotificacaoTipoId),
        UNIQUE KEY uq_notificacaotipo_slug (NotificacaoTipoSlug)
      );
    `);
    console.log("✅ Tabela notificacaotipo pronta");

    console.log("📝 Criando tabela notificacaotipofuncao (se não existir)...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notificacaotipofuncao (
        NotificacaoTipoId INT NOT NULL,
        FuncaoId INT NOT NULL,
        PRIMARY KEY (NotificacaoTipoId, FuncaoId),
        CONSTRAINT FK_NTF_Tipo FOREIGN KEY (NotificacaoTipoId)
          REFERENCES notificacaotipo (NotificacaoTipoId)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT FK_NTF_Funcao FOREIGN KEY (FuncaoId)
          REFERENCES funcao (FuncaoId)
          ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    console.log("✅ Tabela notificacaotipofuncao pronta");

    console.log("📝 Criando tabela notificacao (se não existir)...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notificacao (
        NotificacaoGUID CHAR(36) NOT NULL,
        NotificacaoTipoId INT NOT NULL,
        UsuarioCPF VARCHAR(14) NOT NULL,
        EscolaGUID CHAR(36) NOT NULL,
        NotificacaoTitulo VARCHAR(150) NOT NULL,
        NotificacaoConteudo VARCHAR(500) NULL,
        NotificacaoEntidadeTipo VARCHAR(40) NULL,
        NotificacaoEntidadeGUID VARCHAR(36) NULL,
        NotificacaoLink VARCHAR(255) NULL,
        NotificacaoLida TINYINT(1) NOT NULL DEFAULT 0,
        NotificacaoLidaData TIMESTAMP NULL,
        NotificacaoCreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (NotificacaoGUID),
        INDEX idx_notificacao_usuario_lida (UsuarioCPF, NotificacaoLida),
        INDEX idx_notificacao_escola (EscolaGUID),
        INDEX idx_notificacao_created (NotificacaoCreatedAt),
        CONSTRAINT FK_Notificacao_Tipo FOREIGN KEY (NotificacaoTipoId)
          REFERENCES notificacaotipo (NotificacaoTipoId)
          ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT FK_Notificacao_Usuario FOREIGN KEY (UsuarioCPF)
          REFERENCES usuario (UsuarioCPF)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT FK_Notificacao_Escola FOREIGN KEY (EscolaGUID)
          REFERENCES escola (EscolaGUID)
          ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    console.log("✅ Tabela notificacao pronta");

    console.log("📝 Criando tabela notificacaoenvio (se não existir)...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notificacaoenvio (
        NotificacaoEnvioId INT NOT NULL AUTO_INCREMENT,
        NotificacaoGUID CHAR(36) NOT NULL,
        NotificacaoEnvioCanal ENUM('Email','Whatsapp') NOT NULL,
        NotificacaoEnvioStatus ENUM('Pendente','Enviado','Falhou') NOT NULL DEFAULT 'Pendente',
        NotificacaoEnvioProviderId VARCHAR(100) NULL,
        NotificacaoEnvioErro VARCHAR(255) NULL,
        NotificacaoEnvioTentativas TINYINT NOT NULL DEFAULT 0,
        NotificacaoEnvioEnviadoData TIMESTAMP NULL,
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (NotificacaoEnvioId),
        UNIQUE KEY UQ_Notificacao_Canal (NotificacaoGUID, NotificacaoEnvioCanal),
        CONSTRAINT FK_Envio_Notificacao FOREIGN KEY (NotificacaoGUID)
          REFERENCES notificacao (NotificacaoGUID)
          ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    console.log("✅ Tabela notificacaoenvio pronta");

    console.log("📝 Criando tabela usuarionotificacaopreferencia (se não existir)...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS usuarionotificacaopreferencia (
        UsuarioCPF VARCHAR(14) NOT NULL,
        NotificacaoTipoId INT NOT NULL,
        PreferenciaEmailAtivo TINYINT(1) NOT NULL,
        PreferenciaWhatsappAtivo TINYINT(1) NOT NULL,
        UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (UsuarioCPF, NotificacaoTipoId),
        CONSTRAINT FK_Preferencia_Usuario FOREIGN KEY (UsuarioCPF)
          REFERENCES usuario (UsuarioCPF)
          ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT FK_Preferencia_Tipo FOREIGN KEY (NotificacaoTipoId)
          REFERENCES notificacaotipo (NotificacaoTipoId)
          ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    console.log("✅ Tabela usuarionotificacaopreferencia pronta");

    console.log("📝 Semeando catálogo notificacaotipo...");
    await pool.execute(`
      INSERT INTO notificacaotipo
        (NotificacaoTipoSlug, NotificacaoTipoDescricao, NotificacaoTipoCategoria, NotificacaoTipoEmailPadrao, NotificacaoTipoWhatsappPadrao)
      VALUES
        ('materia_postada',            'Professor postou uma matéria',            'Aviso',    1, 1),
        ('prova_postada',               'Professor postou uma prova',              'Aviso',    1, 1),
        ('tarefa_postada',              'Professor postou uma tarefa',             'Aviso',    1, 1),
        ('pendencia_criada',            'Nova pendência',                          'Aviso',    1, 1),
        ('evento_criado',               'Novo evento na escola',                   'Aviso',    1, 1),
        ('convite_grupo',               'Convite para grupo de tarefa',            'Aviso',    1, 1),
        ('tarefa_avaliada',             'Professor avaliou sua tarefa',            'Aviso',    1, 1),
        ('tarefa_resposta_recebida',    'Aluno enviou resposta da tarefa',         'Aviso',    0, 0),
        ('mensagem_grupo',              'Nova mensagem no grupo',                  'Aviso',    0, 0),
        ('mensagem_individual',         'Nova mensagem direta',                    'Aviso',    0, 0),
        ('promovido_representante',     'Promovido a representante',               'Aviso',    1, 1),
        ('promovido_vice_representante','Promovido a vice-representante',          'Aviso',    1, 1),
        ('removido_vice_representante', 'Removido do cargo de vice-representante', 'Aviso',    0, 0),
        ('removido_grupo',              'Removido de um grupo',                    'Aviso',    0, 0),
        ('tarefa_prazo_amanha',         'Lembrete: tarefa vence amanhã',           'Lembrete', 1, 1),
        ('anotacao_prazo_amanha',       'Lembrete: anotação vence amanhã',         'Lembrete', 1, 1),
        ('prova_prazo_amanha',          'Lembrete: prova amanhã',                  'Lembrete', 1, 1),
        ('tarefa_prazo_alterado',       'Prazo da tarefa foi alterado',            'Aviso',    1, 1),
        ('matricula_nova_turma',        'Matriculado em nova turma',               'Aviso',    1, 1),
        ('evento_prazo_amanha',         'Lembrete: evento amanhã',                 'Lembrete', 0, 0)
      ON DUPLICATE KEY UPDATE
        NotificacaoTipoDescricao = VALUES(NotificacaoTipoDescricao),
        NotificacaoTipoCategoria = VALUES(NotificacaoTipoCategoria),
        NotificacaoTipoEmailPadrao = VALUES(NotificacaoTipoEmailPadrao),
        NotificacaoTipoWhatsappPadrao = VALUES(NotificacaoTipoWhatsappPadrao);
    `);
    console.log("✅ Catálogo notificacaotipo semeado (20 tipos)");

    console.log("📝 Semeando notificacaotipofuncao...");
    await seedNotificacaoTipoFuncao(pool, "materia_postada", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "prova_postada", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "tarefa_postada", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "pendencia_criada", FUNCAO_TODOS);
    await seedNotificacaoTipoFuncao(pool, "evento_criado", FUNCAO_TODOS);
    await seedNotificacaoTipoFuncao(pool, "convite_grupo", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "tarefa_avaliada", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "tarefa_resposta_recebida", "SELECT 3 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "mensagem_grupo", FUNCAO_TODOS);
    await seedNotificacaoTipoFuncao(pool, "mensagem_individual", FUNCAO_TODOS);
    await seedNotificacaoTipoFuncao(pool, "promovido_representante", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "promovido_vice_representante", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "removido_vice_representante", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "removido_grupo", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "tarefa_prazo_amanha", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "anotacao_prazo_amanha", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "prova_prazo_amanha", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "tarefa_prazo_alterado", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "matricula_nova_turma", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "evento_prazo_amanha", FUNCAO_TODOS);
    console.log("✅ notificacaotipofuncao semeada");

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
