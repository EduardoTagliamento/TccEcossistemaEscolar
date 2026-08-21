/**
 * Migration: Permissões granulares por membro + personalização de grupo de
 * chat + submissão de projeto
 * Data: 21/08/2026
 * Descrição: ver plano da sessão (permissões delegáveis pelo Representante/
 * Líder a membros específicos do grupo, em vez de um binário "tem o papel ou
 * não tem"). Só adiciona colunas nullable/tabela nova — não altera nem
 * remove nada existente (exceto o ENUM de historicogrupoprojeto, que ganha
 * um valor novo mantendo todos os existentes).
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

async function enumTemValor(pool: any, tabela: string, coluna: string, valor: string): Promise<boolean> {
  const [rows]: any = await pool.execute(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME || "railway", tabela, coluna]
  );
  const columnType: string = rows[0]?.COLUMN_TYPE || "";
  return columnType.includes(`'${valor}'`);
}

async function tabelaExiste(pool: any, tabela: string): Promise<boolean> {
  const [rows] = await pool.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [process.env.DB_NAME || "railway", tabela]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function runMigration() {
  console.log("🔧 Iniciando migration: permissoes-granulares-grupos");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    // ========== 1. conversa_grupo: personalização (cor + imagem) ==========
    if (await colunaExiste(pool, "conversa_grupo", "ConversaGrupoCorFundo")) {
      console.log("✅ Coluna conversa_grupo.ConversaGrupoCorFundo já existe. Pulando.");
    } else {
      console.log("📝 Adicionando conversa_grupo.ConversaGrupoCorFundo/ConversaGrupoImagemUrl...");
      await pool.execute(`
        ALTER TABLE conversa_grupo
        ADD COLUMN ConversaGrupoCorFundo VARCHAR(7) NULL AFTER ConversaGrupoRefGUID,
        ADD COLUMN ConversaGrupoImagemUrl VARCHAR(500) NULL AFTER ConversaGrupoCorFundo
      `);
      console.log("✅ Colunas adicionadas");
    }

    // ========== 2. conversa_grupo_membro: permissões granulares ==========
    if (await colunaExiste(pool, "conversa_grupo_membro", "MembroPermissoes")) {
      console.log("✅ Coluna conversa_grupo_membro.MembroPermissoes já existe. Pulando.");
    } else {
      console.log("📝 Adicionando conversa_grupo_membro.MembroPermissoes...");
      await pool.execute(`
        ALTER TABLE conversa_grupo_membro
        ADD COLUMN MembroPermissoes JSON NULL AFTER MembroStatus
      `);
      console.log("✅ Coluna adicionada");
    }

    // ========== 3. usuarioxgrupoprojeto: permissões granulares ==========
    if (await colunaExiste(pool, "usuarioxgrupoprojeto", "MembroPermissoes")) {
      console.log("✅ Coluna usuarioxgrupoprojeto.MembroPermissoes já existe. Pulando.");
    } else {
      console.log("📝 Adicionando usuarioxgrupoprojeto.MembroPermissoes...");
      await pool.execute(`
        ALTER TABLE usuarioxgrupoprojeto
        ADD COLUMN MembroPermissoes JSON NULL AFTER UsuarioGUID
      `);
      console.log("✅ Coluna adicionada");
    }

    // ========== 4. usuarioxgrupotarefa: permissões granulares ==========
    if (await colunaExiste(pool, "usuarioxgrupotarefa", "MembroPermissoes")) {
      console.log("✅ Coluna usuarioxgrupotarefa.MembroPermissoes já existe. Pulando.");
    } else {
      console.log("📝 Adicionando usuarioxgrupotarefa.MembroPermissoes...");
      await pool.execute(`
        ALTER TABLE usuarioxgrupotarefa
        ADD COLUMN MembroPermissoes JSON NULL AFTER UsuarioGUID
      `);
      console.log("✅ Coluna adicionada");
    }

    // ========== 5. grupoprojeto: rastreio de submissão ==========
    if (await colunaExiste(pool, "grupoprojeto", "GrupoProjetoSubmetidoEm")) {
      console.log("✅ Coluna grupoprojeto.GrupoProjetoSubmetidoEm já existe. Pulando.");
    } else {
      console.log("📝 Adicionando grupoprojeto.GrupoProjetoSubmetidoEm/GrupoProjetoSubmetidoPorGUID...");
      await pool.execute(`
        ALTER TABLE grupoprojeto
        ADD COLUMN GrupoProjetoSubmetidoEm DATETIME NULL AFTER GrupoProjetoPontuacao,
        ADD COLUMN GrupoProjetoSubmetidoPorGUID CHAR(36) NULL AFTER GrupoProjetoSubmetidoEm
      `);
      console.log("✅ Colunas adicionadas");
    }

    // ========== 6. historicogrupoprojeto: ENUM ganha 'Submissao' ==========
    if (await enumTemValor(pool, "historicogrupoprojeto", "HistoricoTipo", "Submissao")) {
      console.log("✅ ENUM historicogrupoprojeto.HistoricoTipo já tem 'Submissao'. Pulando.");
    } else {
      console.log("📝 Ampliando ENUM historicogrupoprojeto.HistoricoTipo...");
      await pool.execute(`
        ALTER TABLE historicogrupoprojeto
        MODIFY HistoricoTipo ENUM('Entrada','Saida','Expulsao','TransferenciaLider','MudancaVisibilidade','PontuacaoAtribuida','Submissao') NOT NULL
      `);
      console.log("✅ ENUM ampliado");
    }

    // ========== 7. relacaoanexosgrupoprojeto (nova tabela pivot) ==========
    if (await tabelaExiste(pool, "relacaoanexosgrupoprojeto")) {
      console.log("✅ Tabela relacaoanexosgrupoprojeto já existe. Pulando.");
    } else {
      console.log("📝 Criando tabela relacaoanexosgrupoprojeto...");
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS relacaoanexosgrupoprojeto (
          RelacaoAnexoGrupoProjetoGUID CHAR(36) NOT NULL,
          AnexoGUID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
          GrupoProjetoGUID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
          CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (RelacaoAnexoGrupoProjetoGUID),
          INDEX idx_relacao_grupoprojeto (GrupoProjetoGUID),
          INDEX idx_relacao_anexo_gp (AnexoGUID),
          CONSTRAINT FK_RelacaoAnexoGrupoProjeto_Anexo FOREIGN KEY (AnexoGUID)
            REFERENCES anexo(AnexoGUID) ON UPDATE CASCADE ON DELETE CASCADE,
          CONSTRAINT FK_RelacaoAnexoGrupoProjeto_Grupo FOREIGN KEY (GrupoProjetoGUID)
            REFERENCES grupoprojeto(GrupoProjetoGUID) ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `);
      console.log("✅ Tabela criada");
    }

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
