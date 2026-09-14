/**
 * Migration: Adicionar EscolaSlug em escola
 * Data: 14/09/2026
 * Descrição: Identificador de URL único e editável por escola (link de
 *            login individual — ver docs/PLANO_IMPLEMENTACAO_LOGIN_POR_ESCOLA.md).
 *            Depois de adicionar a coluna, faz o backfill das escolas já
 *            cadastradas: slugify do EscolaNome, com sufixo numérico
 *            incremental em caso de conflito (mesmo formato usado por
 *            EscolaService.gerarSlugUnico ao criar escola nova).
 */

import MysqlDatabase from "../MysqlDatabase";

function slugify(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (marcas diacriticas combinantes)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base.slice(0, 60) || "escola";
}

async function runMigration() {
  console.log("🔧 Iniciando migration: add-escola-slug");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'escola' AND COLUMN_NAME = 'EscolaSlug'`,
      [process.env.DB_NAME || "railway"]
    );

    if (Array.isArray(columns) && columns.length === 0) {
      console.log("📝 Adicionando coluna EscolaSlug...");
      await pool.execute(`
        ALTER TABLE escola
        ADD COLUMN EscolaSlug VARCHAR(60) NULL AFTER EscolaNome,
        ADD UNIQUE INDEX idx_escola_slug (EscolaSlug)
      `);
      console.log("✅ Coluna EscolaSlug adicionada com sucesso");
    } else {
      console.log("✅ Coluna EscolaSlug já existe. Pulando ALTER TABLE.");
    }

    console.log("📝 Backfill de EscolaSlug para escolas existentes...");
    const [escolas] = await pool.execute(
      `SELECT EscolaGUID, EscolaNome FROM escola WHERE EscolaSlug IS NULL`
    );

    const slugsUsados = new Set<string>();
    const [existentes] = await pool.execute(`SELECT EscolaSlug FROM escola WHERE EscolaSlug IS NOT NULL`);
    for (const row of existentes as { EscolaSlug: string }[]) {
      slugsUsados.add(row.EscolaSlug);
    }

    for (const escola of escolas as { EscolaGUID: string; EscolaNome: string | null }[]) {
      const base = slugify(escola.EscolaNome || "escola");
      let slug = base;
      let sufixo = 2;
      while (slugsUsados.has(slug)) {
        slug = `${base}-${sufixo}`;
        sufixo++;
      }
      slugsUsados.add(slug);

      await pool.execute(`UPDATE escola SET EscolaSlug = ? WHERE EscolaGUID = ?`, [slug, escola.EscolaGUID]);
      console.log(`   -> ${escola.EscolaGUID}: ${slug}`);
    }

    console.log(`✅ Backfill concluído (${(escolas as unknown[]).length} escola(s) atualizadas)`);
    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
