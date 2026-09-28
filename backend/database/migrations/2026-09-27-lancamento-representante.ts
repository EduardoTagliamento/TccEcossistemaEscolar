/**
 * Migration: Lançamento de Prova/Tarefa/Conteúdo por Representante (temporário)
 * Data: 27/09/2026
 * Descrição: ver docs/PLANO_IMPLEMENTACAO_LANCAMENTO_POR_REPRESENTANTE.md.
 *
 * - Flag por escola (`escolaconfiguracao.PermiteLancamentoPorRepresentante`).
 * - Autoria real do representante em `provaagendada`/`tarefaacademica`/`conteudo`
 *   (`CriadoPorRepresentanteUsuarioGUID`) — nunca substitui o `UsuarioGUID`
 *   do professor, só registra à parte quem de fato criou.
 * - Modo de agendamento (`*ModoAutomatico`/`*SemanaBase`/`*DiaSemana`) em
 *   `provaagendada` e `tarefaacademica` apenas — Conteúdo não tem prazo,
 *   publica direto na confirmação (não recebe esses três campos).
 * - Tabela nova `representantelancamentopropagacao` — estado do fan-out de
 *   confirmação via WhatsApp por turma irmã.
 *
 * Idempotente — mesmo padrão de 2026-08-18-grupo-eletivo.ts.
 */

import MysqlDatabase from "../MysqlDatabase";

async function colunaExiste(pool: any, tabela: string, coluna: string): Promise<boolean> {
  const [rows] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME || "railway", tabela, coluna]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function tabelaExiste(pool: any, tabela: string): Promise<boolean> {
  const [rows] = await pool.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [process.env.DB_NAME || "railway", tabela]
  );
  return Array.isArray(rows) && rows.length > 0;
}

const DIA_SEMANA_ENUM = "ENUM('Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo')";

async function runMigration() {
  console.log("🔧 Iniciando migration: lancamento-representante");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    // 1) Flag por escola
    if (await colunaExiste(pool, "escolaconfiguracao", "PermiteLancamentoPorRepresentante")) {
      console.log("✅ escolaconfiguracao.PermiteLancamentoPorRepresentante já existe. Pulando.");
    } else {
      console.log("📝 Adicionando escolaconfiguracao.PermiteLancamentoPorRepresentante...");
      await pool.execute(`
        ALTER TABLE escolaconfiguracao
        ADD COLUMN PermiteLancamentoPorRepresentante BOOLEAN NOT NULL DEFAULT FALSE
      `);
      console.log("✅ Coluna adicionada");
    }

    // 2) provaagendada — autoria real + modo de agendamento
    if (await colunaExiste(pool, "provaagendada", "CriadoPorRepresentanteUsuarioGUID")) {
      console.log("✅ provaagendada já tem as colunas de representante. Pulando.");
    } else {
      console.log("📝 Adicionando colunas de representante em provaagendada...");
      await pool.execute(`
        ALTER TABLE provaagendada
        ADD COLUMN CriadoPorRepresentanteUsuarioGUID CHAR(12) NULL,
        ADD COLUMN ProvaModoAutomatico BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN ProvaSemanaBase DATE NULL,
        ADD COLUMN ProvaDiaSemana ${DIA_SEMANA_ENUM} NULL,
        ADD CONSTRAINT FK_ProvaAgendada_Representante FOREIGN KEY (CriadoPorRepresentanteUsuarioGUID)
          REFERENCES usuario(UsuarioGUID) ON UPDATE CASCADE ON DELETE RESTRICT
      `);
      console.log("✅ Colunas adicionadas em provaagendada");
    }

    // 3) tarefaacademica — autoria real + modo de agendamento
    // ATENÇÃO: tarefaacademica é a única tabela tocada por esta migration cujo
    // collation PADRÃO é utf8mb4_unicode_ci (as demais usam utf8mb4_0900_ai_ci,
    // igual usuario.UsuarioGUID) — sem CHARACTER SET/COLLATE explícito a FK
    // falha com Error 3780 (confirmado rodando esta migration em produção em
    // 28/09/2026). As colunas GUID que já existem nesta tabela (TarefaGUID,
    // matXprofXturxescGUID, CategoriaGUID) já tinham esse mesmo override.
    if (await colunaExiste(pool, "tarefaacademica", "CriadoPorRepresentanteUsuarioGUID")) {
      console.log("✅ tarefaacademica já tem as colunas de representante. Pulando.");
    } else {
      console.log("📝 Adicionando colunas de representante em tarefaacademica...");
      await pool.execute(`
        ALTER TABLE tarefaacademica
        ADD COLUMN CriadoPorRepresentanteUsuarioGUID CHAR(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
        ADD COLUMN TarefaPrazoModoAutomatico BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN TarefaPrazoSemanaBase DATE NULL,
        ADD COLUMN TarefaPrazoDiaSemana ${DIA_SEMANA_ENUM} NULL,
        ADD CONSTRAINT FK_TarefaAcademica_Representante FOREIGN KEY (CriadoPorRepresentanteUsuarioGUID)
          REFERENCES usuario(UsuarioGUID) ON UPDATE CASCADE ON DELETE RESTRICT
      `);
      console.log("✅ Colunas adicionadas em tarefaacademica");
    }

    // 4) conteudo — só autoria real (sem prazo, ver §2.3 da spec)
    if (await colunaExiste(pool, "conteudo", "CriadoPorRepresentanteUsuarioGUID")) {
      console.log("✅ conteudo já tem a coluna de representante. Pulando.");
    } else {
      console.log("📝 Adicionando coluna de representante em conteudo...");
      await pool.execute(`
        ALTER TABLE conteudo
        ADD COLUMN CriadoPorRepresentanteUsuarioGUID CHAR(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
        ADD CONSTRAINT FK_Conteudo_Representante FOREIGN KEY (CriadoPorRepresentanteUsuarioGUID)
          REFERENCES usuario(UsuarioGUID) ON UPDATE CASCADE ON DELETE RESTRICT
      `);
      console.log("✅ Coluna adicionada em conteudo");
    }

    // 5) Tabela de propagação (fan-out de confirmação)
    if (await tabelaExiste(pool, "representantelancamentopropagacao")) {
      console.log("✅ Tabela representantelancamentopropagacao já existe. Pulando.");
    } else {
      console.log("📝 Criando tabela representantelancamentopropagacao...");
      await pool.execute(`
        CREATE TABLE representantelancamentopropagacao (
          PropagacaoGUID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL PRIMARY KEY,
          TipoOrigem ENUM('Prova','Tarefa','Conteudo') NOT NULL,
          OrigemGUID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
          TurmaOrigemGUID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
          TurmaDestinoGUID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
          RepresentanteDestinoUsuarioGUID CHAR(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
          Status ENUM('Pendente','Confirmado','RecusadoComEdicao') NOT NULL DEFAULT 'Pendente',
          ConteudoEditado TEXT NULL,
          EntidadeResultanteGUID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
          CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          RespondidoEm TIMESTAMP NULL,
          UNIQUE KEY UQ_Propagacao_Origem_Turma (OrigemGUID, TurmaDestinoGUID),
          INDEX idx_propagacao_turma_destino (TurmaDestinoGUID),
          INDEX idx_propagacao_status (Status),
          CONSTRAINT FK_Propagacao_TurmaOrigem FOREIGN KEY (TurmaOrigemGUID)
            REFERENCES turma(TurmaGUID) ON UPDATE CASCADE ON DELETE RESTRICT,
          CONSTRAINT FK_Propagacao_TurmaDestino FOREIGN KEY (TurmaDestinoGUID)
            REFERENCES turma(TurmaGUID) ON UPDATE CASCADE ON DELETE RESTRICT,
          CONSTRAINT FK_Propagacao_Representante FOREIGN KEY (RepresentanteDestinoUsuarioGUID)
            REFERENCES usuario(UsuarioGUID) ON UPDATE CASCADE ON DELETE RESTRICT
        )
      `);
      console.log("✅ Tabela representantelancamentopropagacao criada");
    }

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
