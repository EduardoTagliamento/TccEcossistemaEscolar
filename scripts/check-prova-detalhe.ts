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

  console.log("=== provaagendada bruto ===");
  const [[pa]]: any = await conn.query(
    `SELECT *, DAYNAME(ProvaData) AS DiaSemana FROM provaagendada WHERE ProvaAgendadaGUID = ?`,
    ["287a5911-ab72-410b-a3ed-29532a055d61"]
  );
  console.log(JSON.stringify(pa, null, 2));

  console.log("\n=== provaagendada_turma bruto ===");
  const [[pat]]: any = await conn.query(
    `SELECT * FROM provaagendada_turma WHERE ProvaAgendadaGUID = ?`,
    ["287a5911-ab72-410b-a3ed-29532a055d61"]
  );
  console.log(JSON.stringify(pat, null, 2));

  console.log("\n=== horarioturma da turma 3H (Português) — dias de aula cadastrados ===");
  const [horarios]: any = await conn.query(
    `SELECT ht.*, m.MateriaNome
     FROM horarioturma ht
     JOIN materia m ON m.MateriaGUID = ht.MateriaGUID
     WHERE ht.TurmaGUID = '1470ad85-03b5-4b09-af7b-5f2ade0757d1'
     ORDER BY ht.DiaSemana`
  );
  console.table(horarios);

  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
