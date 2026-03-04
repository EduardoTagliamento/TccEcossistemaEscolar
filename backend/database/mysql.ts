import mysql from "mysql2/promise";

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;

export const pool = mysql.createPool({
  host: DB_HOST || "mysql.railway.internal",
  user: DB_USER || "root",
  password: DB_PASSWORD || "BhjySRtceFwNyRoUknNLJnNUjvntiztf",
  database: DB_NAME || "railway",
  port: DB_PORT ? Number(DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
