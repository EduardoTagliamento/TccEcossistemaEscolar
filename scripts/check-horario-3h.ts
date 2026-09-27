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

  console.log("=== Grade horária completa da turma 3H ===");
  const [rows]: any = await conn.query(
    `SELECT ht.DiaSemana, ht.HoraInicio, ht.HoraFim, m.MateriaNome
     FROM horarioturma ht
     JOIN materiaxprofessorxturma mpt ON mpt.MatProfTurGUID = ht.MatProfTurGUID
     JOIN materia m ON m.MateriaGUID = mpt.MateriaGUID
     WHERE ht.TurmaGUID = '1470ad85-03b5-4b09-af7b-5f2ade0757d1'
     ORDER BY FIELD(ht.DiaSemana,'Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'), ht.HoraInicio`
  );
  console.table(rows);

  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
