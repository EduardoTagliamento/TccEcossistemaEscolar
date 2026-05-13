import { Pool } from "mysql2/promise";
import { pool } from "./mysql";

export default class MysqlDatabase {
  private static instance: MysqlDatabase | null = null;

  static getInstance(): MysqlDatabase {
    if (!MysqlDatabase.instance) {
      MysqlDatabase.instance = new MysqlDatabase();
    }

    return MysqlDatabase.instance;
  }

  async getPool(): Promise<Pool> {
    return pool;
  }
}
