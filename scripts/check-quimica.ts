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

  console.log("=== Materias com 'Quimica' no nome ===");
  const [materias]: any = await conn.query(`SELECT MateriaGUID, MateriaNome FROM materia WHERE MateriaNome LIKE '%uímic%' OR MateriaNome LIKE '%uimic%'`);
  console.table(materias);

  console.log("\n=== Capitulos vinculados a essas materias ===");
  for (const m of materias) {
    const [caps]: any = await conn.query(
      `SELECT c.MaterialDidaticoCapituloGUID, c.Titulo, md.Titulo AS Livro
       FROM materialdidaticocapitulo c
       JOIN materialdidatico md ON md.MaterialDidaticoGUID = c.MaterialDidaticoGUID
       WHERE c.MateriaGUID = ?`,
      [m.MateriaGUID]
    );
    console.log(`--- ${m.MateriaNome} (${caps.length} capitulos) ---`);
    console.table(caps);
  }

  console.log("\n=== Livros (materialdidatico) com 'Quimic' no titulo ===");
  const [livros]: any = await conn.query(`SELECT MaterialDidaticoGUID, Titulo FROM materialdidatico WHERE Titulo LIKE '%uímic%' OR Titulo LIKE '%uimic%'`);
  console.table(livros);

  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
