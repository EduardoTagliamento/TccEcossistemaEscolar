import mysql from "mysql2/promise";

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;

export const pool = mysql.createPool({
  host: DB_HOST || "localhost",
  user: DB_USER || "root",
  password: DB_PASSWORD || "",
  database: DB_NAME || "tccecossistemaescolar",
  port: DB_PORT ? Number(DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
