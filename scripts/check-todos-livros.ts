import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 8000,
  });

  console.log("=== TODOS os livros (materialdidatico), com contagem de paginas via LEFT JOIN ===");
  const [rows]: any = await conn.query(`
    SELECT
      md.MaterialDidaticoGUID,
      md.Titulo,
      md.CreatedAt,
      COUNT(mp.MaterialDidaticoPaginaGUID) AS TotalPaginas,
      SUM(CASE WHEN mp.RevisadoPorGUID IS NULL THEN 1 ELSE 0 END) AS PaginasNaoRevisadas,
      (SELECT COUNT(*) FROM materialdidaticocapitulo c WHERE c.MaterialDidaticoGUID = md.MaterialDidaticoGUID) AS TotalCapitulos
    FROM materialdidatico md
    LEFT JOIN materialdidaticopagina mp ON mp.MaterialDidaticoGUID = md.MaterialDidaticoGUID
    GROUP BY md.MaterialDidaticoGUID, md.Titulo, md.CreatedAt
    ORDER BY md.CreatedAt
  `);
  console.table(rows);

  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
