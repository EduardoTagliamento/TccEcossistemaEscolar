/**
 * Migração: troca a PK de `usuario` de UsuarioCPF para UsuarioGUID.
 *
 * Contexto completo em docs/PLANO_MIGRACAO_USUARIO_PK_GUID.md. Resumo:
 * CPF não pode continuar sendo PK porque (1) usuários do piloto podem não
 * ter CPF real cadastrado e PK não aceita NULL/duplicata, e (2) CPF sendo PK
 * significa que ele vira FK em ~25 tabelas e aparece na URL de várias rotas
 * da API — exposição de dado sensível (LGPD) que não deveria depender de PK.
 *
 * Depois desta migração: `usuario.UsuarioGUID` é a PK (12 caracteres,
 * gerado por gerarGUID() — ver backend/utils/helpers/guid.helper.ts).
 * `usuario.UsuarioCPF` vira coluna comum, NULL permitido, com UNIQUE INDEX
 * (MySQL aceita múltiplos NULL num índice único).
 *
 * ⚠️ ESTE PROJETO NÃO TEM BANCO DE DEV/STAGING — o `.env` aponta direto pro
 * Railway de PRODUÇÃO (mysql.railway.internal / db `railway`). Antes de
 * rodar com --apply:
 *   1. Confirme visualmente no output de `--check` que o banco é o esperado.
 *   2. Tire um snapshot/backup do banco (Railway tem backup automático, mas
 *      considere um mysqldump manual antes de qualquer ALTER estrutural
 *      grande como este).
 *   3. Rode fora do horário de uso, se houver usuários ativos.
 *
 * Design: o script DESCOBRE via information_schema todas as FK que hoje
 * referenciam usuario(UsuarioCPF), em vez de usar uma lista fixa de tabelas
 * — uma auditoria manual do código NÃO encontrou a tabela `grupotarefa` em
 * nenhum arquivo de migration versionado (foi criada direto em produção,
 * fora de controle de versão), então uma lista hardcoded teria pulado essa
 * tabela silenciosamente. Introspecção evita esse tipo de erro.
 *
 * Para cada tabela dependente descoberta, o script:
 *   1. Adiciona a coluna nova (mesmo nome, trocando "CPF" por "GUID" —
 *      ex.: UsuarioCPFLider -> UsuarioGUIDLider), ainda NULL.
 *   2. Faz backfill via JOIN com usuario.
 *   3. Verifica que não sobrou nenhuma linha órfã (CPF que não bate com
 *      nenhum usuário) — aborta com erro claro se encontrar, não tenta
 *      "resolver sozinho".
 *   4. Num único ALTER TABLE atômico: dropa a(s) FK antiga(s), reconstrói
 *      qualquer PRIMARY KEY / UNIQUE KEY / índice composto que incluía a
 *      coluna antiga (substituindo pela nova, mesma ordem/nome), e marca a
 *      coluna nova NOT NULL se a antiga era NOT NULL.
 *   5. Recria a FK apontando pra usuario(UsuarioGUID), preservando
 *      ON UPDATE/ON DELETE da FK original.
 *   6. Dropa a coluna antiga.
 *
 * Idempotente: pode ser reexecutado com --check ou --apply a qualquer
 * momento — cada etapa verifica o estado atual antes de agir.
 *
 * Uso (a partir da raiz do repo):
 *   npx tsx backend/database/migrations/2026-08-10-usuario-guid-pk.ts --check
 *      → só lê e relata o plano completo (todas as tabelas/colunas
 *        descobertas, o que seria feito em cada uma), NÃO grava nada.
 *   npx tsx backend/database/migrations/2026-08-10-usuario-guid-pk.ts --apply --confirm-production
 *      → executa de verdade. Os dois flags são obrigatórios juntos, de
 *        propósito — não dá pra rodar --apply "sem querer".
 */

import { gerarGUID } from "../../utils/helpers/guid.helper";
import MysqlDatabase from "../MysqlDatabase";

interface FkInfo {
  tableName: string;
  columnName: string;
  constraintName: string;
  updateRule: string;
  deleteRule: string;
}

interface IndexInfo {
  indexName: string;
  isPrimary: boolean;
  nonUnique: boolean;
  columns: string[]; // na ordem correta (SEQ_IN_INDEX)
}

interface ColumnInfo {
  isNullable: boolean;
  columnType: string;
}

async function run() {
  const modoAplicar = process.argv.includes("--apply");
  const modoCheck = process.argv.includes("--check");
  const confirmouProducao = process.argv.includes("--confirm-production");

  if (!modoAplicar && !modoCheck) {
    console.error(
      "Uso: npx tsx 2026-08-10-usuario-guid-pk.ts --check | (--apply --confirm-production)"
    );
    process.exit(1);
  }

  if (modoAplicar && !confirmouProducao) {
    console.error(
      "❌ --apply exige também --confirm-production (proteção contra execução acidental — este projeto não tem banco de dev, --apply grava direto em produção)."
    );
    process.exit(1);
  }

  const db = MysqlDatabase.getInstance();
  const pool = await db.getPool();

  const [[dbInfo]] = (await pool.query(
    "SELECT DATABASE() AS db, @@hostname AS host"
  )) as any;
  console.log("=".repeat(70));
  console.log(`🔧 Migração usuario.UsuarioCPF (PK) -> usuario.UsuarioGUID (PK)`);
  console.log(`   Modo: ${modoAplicar ? "APPLY (grava no banco)" : "CHECK (só leitura)"}`);
  console.log(`   Banco: ${dbInfo.db}  |  Host MySQL: ${dbInfo.host}`);
  console.log(`   DB_HOST do .env: ${process.env.DB_HOST}`);
  console.log("=".repeat(70));

  // ---------------------------------------------------------------------
  // ETAPA 1 — usuario.UsuarioGUID
  // ---------------------------------------------------------------------
  await migrarColunaUsuarioGUID(pool, modoAplicar);

  // ---------------------------------------------------------------------
  // ETAPA 2 — descobrir e migrar toda tabela dependente (FK -> usuario.UsuarioCPF)
  // ---------------------------------------------------------------------
  const fks = await descobrirFksParaUsuarioCPF(pool);

  if (fks.length === 0) {
    console.log("ℹ️  Nenhuma FK apontando pra usuario(UsuarioCPF) encontrada (já migradas ou banco vazio).");
  } else {
    console.log(`\n📋 ${fks.length} FK(s) encontradas apontando pra usuario(UsuarioCPF):`);
    for (const fk of fks) {
      console.log(`   - ${fk.tableName}.${fk.columnName}  (constraint ${fk.constraintName}, ON UPDATE ${fk.updateRule} ON DELETE ${fk.deleteRule})`);
    }
  }

  for (const fk of fks) {
    await migrarTabelaDependente(pool, fk, modoAplicar);
  }

  // ---------------------------------------------------------------------
  // ETAPA 3 — trocar a PK de usuario (só depois que NADA mais referencia UsuarioCPF)
  // ---------------------------------------------------------------------
  await trocarPkUsuario(pool, modoAplicar);

  console.log("\n✅ " + (modoAplicar ? "Migração aplicada." : "Check concluído — nenhuma escrita foi feita. Revise o plano acima e rode com --apply --confirm-production quando estiver pronto."));
  process.exit(0);
}

// ===========================================================================
// ETAPA 1
// ===========================================================================

async function migrarColunaUsuarioGUID(pool: any, aplicar: boolean) {
  console.log("\n--- usuario.UsuarioGUID ---");

  const colunaExiste = await colunaExisteEm(pool, "usuario", "UsuarioGUID");

  if (!colunaExiste) {
    console.log("  [1/3] usuario.UsuarioGUID não existe.");
    if (aplicar) {
      await pool.query("ALTER TABLE `usuario` ADD COLUMN `UsuarioGUID` CHAR(12) NULL AFTER `UsuarioCPF`");
      console.log("        ✅ coluna criada (NULL por enquanto).");
    } else {
      console.log("        [check] criaria: ALTER TABLE usuario ADD COLUMN UsuarioGUID CHAR(12) NULL");
    }
  } else {
    console.log("  [1/3] usuario.UsuarioGUID já existe — pulando criação.");
  }

  // Backfill
  const [pendentes] = (await pool.query(
    "SELECT UsuarioCPF FROM usuario WHERE UsuarioGUID IS NULL"
  )) as any;
  const linhasPendentes = pendentes as Array<{ UsuarioCPF: string }>;

  console.log(`  [2/3] ${linhasPendentes.length} usuário(s) sem UsuarioGUID.`);
  if (linhasPendentes.length > 0) {
    if (aplicar) {
      const jaGerados = new Set<string>();
      // Carrega GUIDs já usados (de uma execução parcial anterior) pra nunca colidir.
      const [existentes] = (await pool.query(
        "SELECT UsuarioGUID FROM usuario WHERE UsuarioGUID IS NOT NULL"
      )) as any;
      for (const row of existentes as Array<{ UsuarioGUID: string }>) {
        jaGerados.add(row.UsuarioGUID);
      }

      for (const row of linhasPendentes) {
        let novoGuid = gerarGUID();
        while (jaGerados.has(novoGuid)) {
          novoGuid = gerarGUID();
        }
        jaGerados.add(novoGuid);

        await pool.execute("UPDATE `usuario` SET `UsuarioGUID` = ? WHERE `UsuarioCPF` = ?", [
          novoGuid,
          row.UsuarioCPF,
        ]);
      }
      console.log(`        ✅ ${linhasPendentes.length} linha(s) backfilladas.`);
    } else {
      console.log(`        [check] geraria UsuarioGUID pra ${linhasPendentes.length} linha(s).`);
    }
  } else {
    console.log("        nada a backfillar.");
  }

  // NOT NULL + UNIQUE
  const jaNotNull = await colunaEhNotNull(pool, "usuario", "UsuarioGUID");
  const indiceUniqueExiste = await indiceExisteEm(pool, "usuario", "UQ_Usuario_GUID");

  console.log(`  [3/3] NOT NULL + UNIQUE INDEX em usuario.UsuarioGUID:`);
  if (aplicar) {
    if (!jaNotNull) {
      await pool.query("ALTER TABLE `usuario` MODIFY COLUMN `UsuarioGUID` CHAR(12) NOT NULL");
      console.log("        ✅ NOT NULL aplicado.");
    } else {
      console.log("        NOT NULL já estava aplicado.");
    }
    if (!indiceUniqueExiste) {
      await pool.query("ALTER TABLE `usuario` ADD UNIQUE INDEX `UQ_Usuario_GUID` (`UsuarioGUID`)");
      console.log("        ✅ UNIQUE INDEX criado (falha aqui = colisão de GUID, investigar manualmente).");
    } else {
      console.log("        UNIQUE INDEX já existia.");
    }
  } else {
    console.log(`        [check] jaNotNull=${jaNotNull}, indiceUniqueExiste=${indiceUniqueExiste}`);
  }
}

// ===========================================================================
// ETAPA 2 — descoberta + migração de cada tabela dependente
// ===========================================================================

async function descobrirFksParaUsuarioCPF(pool: any): Promise<FkInfo[]> {
  const [rows] = (await pool.query(
    `
    SELECT
      kcu.TABLE_NAME       AS tableName,
      kcu.COLUMN_NAME      AS columnName,
      kcu.CONSTRAINT_NAME  AS constraintName,
      rc.UPDATE_RULE        AS updateRule,
      rc.DELETE_RULE        AS deleteRule
    FROM information_schema.KEY_COLUMN_USAGE kcu
    JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
      ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
     AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    WHERE kcu.CONSTRAINT_SCHEMA = DATABASE()
      AND kcu.REFERENCED_TABLE_NAME = 'usuario'
      AND kcu.REFERENCED_COLUMN_NAME = 'UsuarioCPF'
    ORDER BY kcu.TABLE_NAME, kcu.COLUMN_NAME
    `
  )) as any;

  return rows as FkInfo[];
}

async function migrarTabelaDependente(pool: any, fk: FkInfo, aplicar: boolean) {
  const { tableName, columnName, constraintName, updateRule, deleteRule } = fk;
  const novaColuna = columnName.replace(/CPF/g, "GUID");

  console.log(`\n--- ${tableName}.${columnName} -> ${novaColuna} ---`);

  if (novaColuna === columnName) {
    console.log(`  ⚠️  Nome da coluna não contém "CPF" (${columnName}) — pulando, precisa de revisão manual.`);
    return;
  }

  const colInfo = await infoColuna(pool, tableName, columnName);
  const novaColunaExiste = await colunaExisteEm(pool, tableName, novaColuna);

  // 1) adicionar coluna nova
  if (!novaColunaExiste) {
    console.log(`  [1/6] adicionar ${novaColuna} (CHAR(12) NULL)`);
    if (aplicar) {
      await pool.query(
        `ALTER TABLE \`${tableName}\` ADD COLUMN \`${novaColuna}\` CHAR(12) NULL AFTER \`${columnName}\``
      );
    } else {
      console.log(`        [check] ALTER TABLE ${tableName} ADD COLUMN ${novaColuna} CHAR(12) NULL`);
    }
  } else {
    console.log(`  [1/6] ${novaColuna} já existe — pulando.`);
  }

  // 2) backfill
  const [pendentes] = (await pool.query(
    `SELECT COUNT(*) AS total FROM \`${tableName}\` WHERE \`${columnName}\` IS NOT NULL AND \`${novaColuna}\` IS NULL`
  )) as any;
  const totalPendente = (pendentes as any)[0]?.total ?? 0;

  console.log(`  [2/6] ${totalPendente} linha(s) pendente(s) de backfill.`);
  if (totalPendente > 0) {
    if (aplicar) {
      await pool.query(`
        UPDATE \`${tableName}\` t
        INNER JOIN \`usuario\` u ON t.\`${columnName}\` = u.\`UsuarioCPF\`
        SET t.\`${novaColuna}\` = u.\`UsuarioGUID\`
        WHERE t.\`${novaColuna}\` IS NULL AND t.\`${columnName}\` IS NOT NULL
      `);
      console.log("        ✅ backfill executado.");
    } else {
      console.log("        [check] faria UPDATE ... INNER JOIN usuario ... SET novaColuna = usuario.UsuarioGUID");
    }
  }

  // 3) verificar órfãos (CPF que não bate com nenhum usuario) — só faz sentido conferir de verdade após aplicar
  if (aplicar) {
    const [orfaos] = (await pool.query(
      `SELECT COUNT(*) AS total FROM \`${tableName}\` WHERE \`${columnName}\` IS NOT NULL AND \`${novaColuna}\` IS NULL`
    )) as any;
    const totalOrfaos = (orfaos as any)[0]?.total ?? 0;
    if (totalOrfaos > 0) {
      throw new Error(
        `${tableName}.${columnName}: ${totalOrfaos} linha(s) com valor que não bate com nenhum usuario.UsuarioCPF. ` +
          `Isso é inconsistência de dados pré-existente — resolva manualmente antes de continuar (não dá pra migrar às cegas).`
      );
    }
    console.log("  [3/6] sem órfãos — ok.");
  } else {
    console.log("  [3/6] [check] verificaria órfãos após o backfill.");
  }

  // 4) descobrir índices/PK que incluem a coluna antiga, pra reconstruir com a nova
  const indices = await indicesContendoColuna(pool, tableName, columnName);
  if (indices.length > 0) {
    console.log(`  [4/6] ${indices.length} índice(s) incluem ${columnName}, serão reconstruídos com ${novaColuna}:`);
    for (const idx of indices) {
      console.log(`        - ${idx.isPrimary ? "PRIMARY KEY" : idx.indexName} (${idx.columns.join(", ")})`);
    }
  } else {
    console.log(`  [4/6] nenhum índice extra sobre ${columnName} (além da FK).`);
  }

  // 5) ALTER TABLE atômico: dropar FK + reconstruir índices + NOT NULL
  const clausulas: string[] = [`DROP FOREIGN KEY \`${constraintName}\``];

  for (const idx of indices) {
    const novasColunas = idx.columns.map((c) => (c === columnName ? novaColuna : c));
    if (idx.isPrimary) {
      clausulas.push("DROP PRIMARY KEY");
      clausulas.push(`ADD PRIMARY KEY (${novasColunas.map((c) => `\`${c}\``).join(", ")})`);
    } else {
      clausulas.push(`DROP INDEX \`${idx.indexName}\``);
      const tipo = idx.nonUnique ? "INDEX" : "UNIQUE INDEX";
      clausulas.push(`ADD ${tipo} \`${idx.indexName}\` (${novasColunas.map((c) => `\`${c}\``).join(", ")})`);
    }
  }

  if (!colInfo.isNullable) {
    clausulas.push(`MODIFY COLUMN \`${novaColuna}\` CHAR(12) NOT NULL`);
  }

  console.log(`  [5/6] ALTER TABLE ${tableName} ${clausulas.join(", ")}`);
  if (aplicar) {
    await pool.query(`ALTER TABLE \`${tableName}\` ${clausulas.join(", ")}`);
    console.log("        ✅ aplicado.");
  } else {
    console.log("        [check] não aplicado.");
  }

  // 6) recriar FK na coluna nova + dropar coluna antiga
  console.log(`  [6/6] recriar FK (${constraintName}) em ${novaColuna} -> usuario(UsuarioGUID); dropar ${columnName}`);
  if (aplicar) {
    await pool.query(`
      ALTER TABLE \`${tableName}\`
        ADD CONSTRAINT \`${constraintName}\` FOREIGN KEY (\`${novaColuna}\`) REFERENCES \`usuario\` (\`UsuarioGUID\`)
        ON UPDATE ${updateRule} ON DELETE ${deleteRule}
    `);
    await pool.query(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``);
    console.log("        ✅ concluído.");
  } else {
    console.log("        [check] não aplicado.");
  }
}

// ===========================================================================
// ETAPA 3 — troca de PK em usuario
// ===========================================================================

async function trocarPkUsuario(pool: any, aplicar: boolean) {
  console.log("\n--- usuario: trocar PRIMARY KEY (UsuarioCPF -> UsuarioGUID) ---");

  const fksRestantes = await descobrirFksParaUsuarioCPF(pool);
  if (fksRestantes.length > 0) {
    console.log(
      `  ⚠️  Ainda há ${fksRestantes.length} FK(s) apontando pra usuario(UsuarioCPF) — não é seguro trocar a PK ainda. ` +
        `Rode o script de novo depois que a etapa 2 acima terminar (0 FKs restantes).`
    );
    return;
  }

  const pkAtual = await colunaEhPrimaryKey(pool, "usuario", "UsuarioCPF");
  if (!pkAtual) {
    console.log("  usuario.UsuarioCPF já não é mais PRIMARY KEY — nada a fazer aqui.");
  } else {
    console.log("  [1/3] DROP PRIMARY KEY (UsuarioCPF) + ADD PRIMARY KEY (UsuarioGUID)");
    if (aplicar) {
      await pool.query(
        "ALTER TABLE `usuario` DROP PRIMARY KEY, ADD PRIMARY KEY (`UsuarioGUID`)"
      );
      console.log("        ✅ aplicado.");
    } else {
      console.log("        [check] não aplicado.");
    }
  }

  const uniqueAuxiliarExiste = await indiceExisteEm(pool, "usuario", "UQ_Usuario_GUID");
  if (uniqueAuxiliarExiste) {
    console.log("  [2/3] dropar UQ_Usuario_GUID (redundante — PRIMARY KEY já garante unicidade)");
    if (aplicar) {
      await pool.query("ALTER TABLE `usuario` DROP INDEX `UQ_Usuario_GUID`");
      console.log("        ✅ aplicado.");
    } else {
      console.log("        [check] não aplicado.");
    }
  } else {
    console.log("  [2/3] UQ_Usuario_GUID já não existe — pulando.");
  }

  const cpfEhNotNull = await colunaEhNotNull(pool, "usuario", "UsuarioCPF");
  const cpfUniqueExiste = await indiceExisteEm(pool, "usuario", "UQ_Usuario_CPF");
  console.log("  [3/3] UsuarioCPF vira coluna comum: NULL permitido + UNIQUE INDEX (múltiplos NULL são ok em índice único no MySQL)");
  if (aplicar) {
    if (cpfEhNotNull) {
      await pool.query("ALTER TABLE `usuario` MODIFY COLUMN `UsuarioCPF` VARCHAR(14) NULL");
      console.log("        ✅ UsuarioCPF agora aceita NULL.");
    } else {
      console.log("        UsuarioCPF já aceitava NULL.");
    }
    if (!cpfUniqueExiste) {
      await pool.query("ALTER TABLE `usuario` ADD UNIQUE INDEX `UQ_Usuario_CPF` (`UsuarioCPF`)");
      console.log("        ✅ UNIQUE INDEX criado em UsuarioCPF.");
    } else {
      console.log("        UQ_Usuario_CPF já existia.");
    }
  } else {
    console.log(`        [check] cpfEhNotNull=${cpfEhNotNull}, cpfUniqueExiste=${cpfUniqueExiste}`);
  }
}

// ===========================================================================
// Helpers de introspecção (information_schema)
// ===========================================================================

async function colunaExisteEm(pool: any, table: string, column: string): Promise<boolean> {
  const [rows] = (await pool.query(
    `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )) as any;
  return (rows as any[]).length > 0;
}

async function infoColuna(pool: any, table: string, column: string): Promise<ColumnInfo> {
  const [rows] = (await pool.query(
    `SELECT IS_NULLABLE, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )) as any;
  const row = (rows as any[])[0];
  return { isNullable: row?.IS_NULLABLE === "YES", columnType: row?.COLUMN_TYPE ?? "" };
}

async function colunaEhNotNull(pool: any, table: string, column: string): Promise<boolean> {
  const info = await infoColuna(pool, table, column);
  return !info.isNullable;
}

async function colunaEhPrimaryKey(pool: any, table: string, column: string): Promise<boolean> {
  const [rows] = (await pool.query(
    `
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND INDEX_NAME = 'PRIMARY'
    `,
    [table, column]
  )) as any;
  return (rows as any[]).length > 0;
}

async function indiceExisteEm(pool: any, table: string, indexName: string): Promise<boolean> {
  const [rows] = (await pool.query(
    `SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [table, indexName]
  )) as any;
  return (rows as any[]).length > 0;
}

/** Todos os índices (PK inclusa) que contêm a coluna dada, com a lista completa de colunas na ordem certa. */
async function indicesContendoColuna(pool: any, table: string, column: string): Promise<IndexInfo[]> {
  const [nomesRows] = (await pool.query(
    `SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )) as any;

  const resultado: IndexInfo[] = [];
  for (const { INDEX_NAME } of nomesRows as Array<{ INDEX_NAME: string }>) {
    const [colRows] = (await pool.query(
      `
      SELECT COLUMN_NAME, NON_UNIQUE
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
      ORDER BY SEQ_IN_INDEX
      `,
      [table, INDEX_NAME]
    )) as any;

    const cols = colRows as Array<{ COLUMN_NAME: string; NON_UNIQUE: number }>;
    resultado.push({
      indexName: INDEX_NAME,
      isPrimary: INDEX_NAME === "PRIMARY",
      nonUnique: cols[0]?.NON_UNIQUE === 1,
      columns: cols.map((c) => c.COLUMN_NAME),
    });
  }
  return resultado;
}

run().catch((error) => {
  console.error("\n❌ Migração abortada com erro:");
  console.error(error);
  process.exit(1);
});
