import MysqlDatabase from "../database/MysqlDatabase";
import MateriaGlobal, { MateriaGlobalStatus } from "../entities/materiaglobal.model";

interface MateriaGlobalRow {
  MateriaGlobalGUID: string;
  Nome: string;
  Status: MateriaGlobalStatus;
  CreatedAt: Date;
}

export class MateriaGlobalDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  MateriaGlobalDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (materiaGlobal: MateriaGlobal): Promise<void> => {
    console.log("🟢 MateriaGlobalDAO.create()");

    const SQL = `INSERT INTO materiaglobal (MateriaGlobalGUID, Nome, Status) VALUES (?, ?, ?)`;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [materiaGlobal.MateriaGlobalGUID, materiaGlobal.Nome, materiaGlobal.Status]);
  };

  findById = async (guid: string): Promise<MateriaGlobal | null> => {
    console.log("🟢 MateriaGlobalDAO.findById()");

    const SQL = `SELECT * FROM materiaglobal WHERE MateriaGlobalGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [guid]);

    const lista = this.mapRows(rows as MateriaGlobalRow[]);
    return lista[0] || null;
  };

  findByNomeExato = async (nome: string): Promise<MateriaGlobal | null> => {
    console.log("🟢 MateriaGlobalDAO.findByNomeExato()");

    const SQL = `SELECT * FROM materiaglobal WHERE Nome = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [nome]);

    const lista = this.mapRows(rows as MateriaGlobalRow[]);
    return lista[0] || null;
  };

  /** Lista todos — usado como universo de candidatos pra similaridade de string (poucas dezenas de linhas, sem paginação necessária). */
  findAll = async (filters: { Status?: MateriaGlobalStatus } = {}): Promise<MateriaGlobal[]> => {
    console.log("🟢 MateriaGlobalDAO.findAll()");

    const pool = await this.#database.getPool();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.Status) {
      conditions.push("Status = ?");
      params.push(filters.Status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await pool.execute(`SELECT * FROM materiaglobal ${whereClause} ORDER BY Nome ASC`, params);
    return this.mapRows(rows as MateriaGlobalRow[]);
  };

  atualizarStatus = async (guid: string, status: MateriaGlobalStatus): Promise<void> => {
    console.log("🟢 MateriaGlobalDAO.atualizarStatus()");

    const SQL = `UPDATE materiaglobal SET Status = ? WHERE MateriaGlobalGUID = ?`;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [status, guid]);
  };

  private mapRows(rows: MateriaGlobalRow[]): MateriaGlobal[] {
    return rows.map((row) => {
      const materiaGlobal = new MateriaGlobal();
      materiaGlobal.MateriaGlobalGUID = row.MateriaGlobalGUID;
      materiaGlobal.Nome = row.Nome;
      materiaGlobal.Status = row.Status;
      materiaGlobal.CreatedAt = row.CreatedAt ? new Date(row.CreatedAt) : null;
      return materiaGlobal;
    });
  }
}
