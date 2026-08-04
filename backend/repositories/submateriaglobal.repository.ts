import MysqlDatabase from "../database/MysqlDatabase";
import SubMateriaGlobal from "../entities/submateriaglobal.model";

interface SubMateriaGlobalRow {
  SubMateriaGlobalGUID: string;
  MateriaGlobalGUID: string;
  Nome: string;
}

export class SubMateriaGlobalDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  SubMateriaGlobalDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (submateria: SubMateriaGlobal): Promise<void> => {
    console.log("🟢 SubMateriaGlobalDAO.create()");

    const SQL = `INSERT INTO submateriaglobal (SubMateriaGlobalGUID, MateriaGlobalGUID, Nome) VALUES (?, ?, ?)`;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [submateria.SubMateriaGlobalGUID, submateria.MateriaGlobalGUID, submateria.Nome]);
  };

  findById = async (guid: string): Promise<SubMateriaGlobal | null> => {
    console.log("🟢 SubMateriaGlobalDAO.findById()");

    const SQL = `SELECT * FROM submateriaglobal WHERE SubMateriaGlobalGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [guid]);

    const lista = this.mapRows(rows as SubMateriaGlobalRow[]);
    return lista[0] || null;
  };

  findByMateriaGlobal = async (materiaGlobalGUID: string): Promise<SubMateriaGlobal[]> => {
    console.log("🟢 SubMateriaGlobalDAO.findByMateriaGlobal()");

    const SQL = `SELECT * FROM submateriaglobal WHERE MateriaGlobalGUID = ? ORDER BY Nome ASC`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [materiaGlobalGUID]);
    return this.mapRows(rows as SubMateriaGlobalRow[]);
  };

  private mapRows(rows: SubMateriaGlobalRow[]): SubMateriaGlobal[] {
    return rows.map((row) => {
      const submateria = new SubMateriaGlobal();
      submateria.SubMateriaGlobalGUID = row.SubMateriaGlobalGUID;
      submateria.MateriaGlobalGUID = row.MateriaGlobalGUID;
      submateria.Nome = row.Nome;
      return submateria;
    });
  }
}
