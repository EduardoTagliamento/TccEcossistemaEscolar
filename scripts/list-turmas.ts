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

  const [rows]: any = await conn.query(
    `SELECT TurmaGUID, TurmaSerie, TurmaNome FROM turma WHERE EscolaGUID = 'b67a6634-9afd-4fb3-8227-d2569a3db98c' ORDER BY TurmaSerie, TurmaNome`
  );
  console.table(rows);

  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
