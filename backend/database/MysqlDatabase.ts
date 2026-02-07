import { Pool } from "mysql2/promise";
import { pool } from "./mysql";

export default class MysqlDatabase {
  async getPool(): Promise<Pool> {
    return pool;
  }
}
