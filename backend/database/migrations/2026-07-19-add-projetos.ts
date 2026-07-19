/**
 * Migration: Módulo Projetos
 * Data: 19/07/2026
 * Descrição: Cria as tabelas do módulo "Projetos" (professor/direção cria
 *            um projeto direcionado a turmas específicas ou à escola
 *            inteira; alunos elegíveis criam grupos com proposta própria,
 *            grupo aberto ou fechado por convite).
 *            Ver docs/PLANO_IMPLEMENTACAO_PROJETOS.md
 */

import MysqlDatabase from "../MysqlDatabase";

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
  console.log("🔧 Iniciando migration: projetos");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    console.log("📝 Criando tabela projeto (se não existir)...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS projeto (
        ProjetoGUID CHAR(36) NOT NULL,
        EscolaGUID CHAR(36) NOT NULL,
        UsuarioCPFCriador VARCHAR(14) NOT NULL,
        ProjetoTitulo VARCHAR(128) NOT NULL,
        ProjetoDescricao VARCHAR(2048) NOT NULL,
        ProjetoMecanicaPontuacao VARCHAR(1024) NULL,
        ProjetoPublicoAlvo ENUM('Escola','Turmas') NOT NULL DEFAULT 'Turmas',
        ProjetoGrupoMinPessoas INT NOT NULL DEFAULT 1,
        ProjetoGrupoMaxPessoas INT NOT NULL,
        ProjetoInscricaoPrazoData DATETIME NOT NULL,
        ProjetoEntregaPrazoData DATETIME NULL,
        ProjetoStatus ENUM('Aberto','Encerrado') NOT NULL DEFAULT 'Aberto',
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (ProjetoGUID),
        INDEX idx_projeto_escola (EscolaGUID),
        INDEX idx_projeto_criador (UsuarioCPFCriador),
        CONSTRAINT CHK_ProjetoGrupoMinPessoas CHECK (ProjetoGrupoMinPessoas >= 1),
        CONSTRAINT CHK_ProjetoGrupoMaxPessoas CHECK (ProjetoGrupoMaxPessoas >= ProjetoGrupoMinPessoas),
        CONSTRAINT FK_Projeto_Escola FOREIGN KEY (EscolaGUID)
          REFERENCES escola (EscolaGUID) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT FK_Projeto_Criador FOREIGN KEY (UsuarioCPFCriador)
          REFERENCES usuario (UsuarioCPF) ON UPDATE CASCADE ON DELETE RESTRICT
      );
    `);
    console.log("✅ Tabela projeto pronta");

    console.log("📝 Criando tabela projetoturma (se não existir)...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS projetoturma (
        ProjetoGUID CHAR(36) NOT NULL,
        TurmaGUID CHAR(36) NOT NULL,
        PRIMARY KEY (ProjetoGUID, TurmaGUID),
        CONSTRAINT FK_ProjetoTurma_Projeto FOREIGN KEY (ProjetoGUID)
          REFERENCES projeto (ProjetoGUID) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT FK_ProjetoTurma_Turma FOREIGN KEY (TurmaGUID)
          REFERENCES turma (TurmaGUID) ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    console.log("✅ Tabela projetoturma pronta");

    console.log("📝 Criando tabela grupoprojeto (se não existir)...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS grupoprojeto (
        GrupoProjetoGUID CHAR(36) NOT NULL,
        ProjetoGUID CHAR(36) NOT NULL,
        UsuarioCPFLider VARCHAR(14) NOT NULL,
        GrupoProjetoNome VARCHAR(128) NULL,
        GrupoProjetoProposta VARCHAR(2048) NOT NULL,
        GrupoProjetoVisibilidade ENUM('Aberto','Fechado') NOT NULL DEFAULT 'Fechado',
        GrupoProjetoPontuacao DECIMAL(6,2) NULL,
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (GrupoProjetoGUID),
        INDEX idx_grupoprojeto_projeto (ProjetoGUID),
        INDEX idx_grupoprojeto_lider (UsuarioCPFLider),
        CONSTRAINT FK_GrupoProjeto_Projeto FOREIGN KEY (ProjetoGUID)
          REFERENCES projeto (ProjetoGUID) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT FK_GrupoProjeto_Lider FOREIGN KEY (UsuarioCPFLider)
          REFERENCES usuario (UsuarioCPF) ON UPDATE CASCADE ON DELETE RESTRICT
      );
    `);
    console.log("✅ Tabela grupoprojeto pronta");

    console.log("📝 Criando tabela usuarioxgrupoprojeto (se não existir)...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS usuarioxgrupoprojeto (
        GrupoProjetoGUID CHAR(36) NOT NULL,
        UsuarioCPF VARCHAR(14) NOT NULL,
        DataEntrada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (GrupoProjetoGUID, UsuarioCPF),
        CONSTRAINT FK_UXGP_Grupo FOREIGN KEY (GrupoProjetoGUID)
          REFERENCES grupoprojeto (GrupoProjetoGUID) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT FK_UXGP_Usuario FOREIGN KEY (UsuarioCPF)
          REFERENCES usuario (UsuarioCPF) ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    console.log("✅ Tabela usuarioxgrupoprojeto pronta");

    console.log("📝 Criando tabela convitegrupoprojeto (se não existir)...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS convitegrupoprojeto (
        ConviteGUID CHAR(36) NOT NULL,
        GrupoProjetoGUID CHAR(36) NOT NULL,
        UsuarioCPFConvidado VARCHAR(14) NOT NULL,
        ConviteTipo ENUM('Convite','Solicitacao') NOT NULL,
        ConviteStatus ENUM('Pendente','Aceito','Recusado') NOT NULL DEFAULT 'Pendente',
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (ConviteGUID),
        INDEX idx_convitegp_grupo (GrupoProjetoGUID),
        INDEX idx_convitegp_convidado (UsuarioCPFConvidado),
        CONSTRAINT FK_ConviteGP_Grupo FOREIGN KEY (GrupoProjetoGUID)
          REFERENCES grupoprojeto (GrupoProjetoGUID) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT FK_ConviteGP_Usuario FOREIGN KEY (UsuarioCPFConvidado)
          REFERENCES usuario (UsuarioCPF) ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
    console.log("✅ Tabela convitegrupoprojeto pronta");

    console.log("📝 Criando tabela historicogrupoprojeto (se não existir)...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS historicogrupoprojeto (
        HistoricoGUID CHAR(36) NOT NULL,
        GrupoProjetoGUID CHAR(36) NOT NULL,
        HistoricoTipo ENUM('Entrada','Saida','Expulsao','TransferenciaLider','MudancaVisibilidade','PontuacaoAtribuida') NOT NULL,
        UsuarioCPFAtor VARCHAR(14) NOT NULL,
        UsuarioCPFAlvo VARCHAR(14) NULL,
        HistoricoDetalhes JSON NULL,
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (HistoricoGUID),
        INDEX idx_historicogp_grupo (GrupoProjetoGUID),
        CONSTRAINT FK_HistoricoGP_Grupo FOREIGN KEY (GrupoProjetoGUID)
          REFERENCES grupoprojeto (GrupoProjetoGUID) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT FK_HistoricoGP_Ator FOREIGN KEY (UsuarioCPFAtor)
          REFERENCES usuario (UsuarioCPF) ON UPDATE CASCADE ON DELETE RESTRICT
      );
    `);
    console.log("✅ Tabela historicogrupoprojeto pronta");

    console.log("📝 Semeando catálogo notificacaotipo (módulo Projetos)...");
    await pool.execute(`
      INSERT INTO notificacaotipo
        (NotificacaoTipoSlug, NotificacaoTipoDescricao, NotificacaoTipoCategoria, NotificacaoTipoEmailPadrao, NotificacaoTipoWhatsappPadrao)
      VALUES
        ('projeto_criado',              'Novo projeto disponível para participar',    'Aviso', 1, 1),
        ('convite_grupo_projeto',       'Convite para grupo de projeto',              'Aviso', 1, 1),
        ('solicitacao_grupo_projeto',   'Solicitação de entrada em grupo de projeto', 'Aviso', 0, 0),
        ('removido_grupo_projeto',      'Removido de um grupo de projeto',            'Aviso', 0, 0),
        ('projeto_pontuacao_atribuida', 'Pontuação do grupo de projeto foi lançada',  'Aviso', 1, 1)
      ON DUPLICATE KEY UPDATE
        NotificacaoTipoDescricao = VALUES(NotificacaoTipoDescricao),
        NotificacaoTipoCategoria = VALUES(NotificacaoTipoCategoria),
        NotificacaoTipoEmailPadrao = VALUES(NotificacaoTipoEmailPadrao),
        NotificacaoTipoWhatsappPadrao = VALUES(NotificacaoTipoWhatsappPadrao);
    `);
    console.log("✅ Catálogo notificacaotipo semeado (5 tipos novos)");

    console.log("📝 Semeando notificacaotipofuncao (módulo Projetos)...");
    await seedNotificacaoTipoFuncao(pool, "projeto_criado", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "convite_grupo_projeto", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "solicitacao_grupo_projeto", "SELECT 3 AS FuncaoId UNION ALL SELECT 6");
    await seedNotificacaoTipoFuncao(pool, "removido_grupo_projeto", "SELECT 5 AS FuncaoId");
    await seedNotificacaoTipoFuncao(pool, "projeto_pontuacao_atribuida", "SELECT 5 AS FuncaoId");
    console.log("✅ notificacaotipofuncao semeada");

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
