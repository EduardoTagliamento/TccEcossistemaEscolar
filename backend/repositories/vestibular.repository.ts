import MysqlDatabase from "../database/MysqlDatabase";
import Vestibular from "../entities/vestibular.model";

interface VestibularRow {
  VestibularGUID: string;
  Nome: string;
}

export class VestibularDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  VestibularDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (vestibular: Vestibular): Promise<void> => {
    console.log("🟢 VestibularDAO.create()");

    const SQL = `INSERT INTO vestibular (VestibularGUID, Nome) VALUES (?, ?)`;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [vestibular.VestibularGUID, vestibular.Nome]);
  };

  findById = async (guid: string): Promise<Vestibular | null> => {
    console.log("🟢 VestibularDAO.findById()");

    const SQL = `SELECT * FROM vestibular WHERE VestibularGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [guid]);

    const lista = this.mapRows(rows as VestibularRow[]);
    return lista[0] || null;
  };

  findByNomeExato = async (nome: string): Promise<Vestibular | null> => {
    console.log("🟢 VestibularDAO.findByNomeExato()");

    const SQL = `SELECT * FROM vestibular WHERE Nome = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [nome]);

    const lista = this.mapRows(rows as VestibularRow[]);
    return lista[0] || null;
  };

  findAll = async (): Promise<Vestibular[]> => {
    console.log("🟢 VestibularDAO.findAll()");

    const SQL = `SELECT * FROM vestibular ORDER BY Nome ASC`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL);
    return this.mapRows(rows as VestibularRow[]);
  };

  private mapRows(rows: VestibularRow[]): Vestibular[] {
    return rows.map((row) => {
      const vestibular = new Vestibular();
      vestibular.VestibularGUID = row.VestibularGUID;
      vestibular.Nome = row.Nome;
      return vestibular;
    });
  }
}
