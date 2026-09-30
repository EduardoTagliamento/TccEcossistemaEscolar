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

  const [rows]: any = await conn.query(`
    SELECT
      md.MaterialDidaticoGUID,
      md.Titulo,
      COUNT(*) AS TotalPaginas,
      SUM(CASE WHEN mp.RevisadoPorGUID IS NULL THEN 1 ELSE 0 END) AS PaginasNaoRevisadas,
      SUM(CASE WHEN mp.TextoExtraido IS NULL OR mp.TextoExtraido = '' THEN 1 ELSE 0 END) AS PaginasSemTexto,
      SUM(CASE WHEN mp.StatusExtracao != 'Concluida' THEN 1 ELSE 0 END) AS PaginasStatusNaoConcluido
    FROM materialdidatico md
    JOIN materialdidaticopagina mp ON mp.MaterialDidaticoGUID = md.MaterialDidaticoGUID
    GROUP BY md.MaterialDidaticoGUID, md.Titulo
    ORDER BY PaginasNaoRevisadas DESC, md.Titulo
  `);
  console.table(rows);

  const totalNaoRevisadas = rows.reduce((acc: number, r: any) => acc + Number(r.PaginasNaoRevisadas), 0);
  console.log("\nTotal de páginas não revisadas em toda a base:", totalNaoRevisadas);
  console.log("Livros com pelo menos 1 página não revisada:", rows.filter((r: any) => Number(r.PaginasNaoRevisadas) > 0).length, "de", rows.length);

  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
