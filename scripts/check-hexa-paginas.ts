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

  const HEXA_GUID = "e0b7e03a-29ac-4b79-b8f9-bbccae357ebd";

  const [[contagem]]: any = await conn.query(
    `SELECT COUNT(*) AS Total, MIN(NumeroPagina) AS MinPagina, MAX(NumeroPagina) AS MaxPagina
     FROM materialdidaticopagina WHERE MaterialDidaticoGUID = ?`,
    [HEXA_GUID]
  );
  console.log("Hexa – Caderno de sala 1:", JSON.stringify(contagem));

  // confere se tem numero de pagina duplicado (sinal de reenvio ja ocorrido)
  const [duplicados]: any = await conn.query(
    `SELECT NumeroPagina, COUNT(*) AS Qtd FROM materialdidaticopagina
     WHERE MaterialDidaticoGUID = ? GROUP BY NumeroPagina HAVING COUNT(*) > 1`,
    [HEXA_GUID]
  );
  console.log("Paginas com NumeroPagina duplicado:", duplicados.length);
  if (duplicados.length > 0) console.table(duplicados);

  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
