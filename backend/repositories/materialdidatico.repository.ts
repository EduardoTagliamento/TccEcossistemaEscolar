import MysqlDatabase from "../database/MysqlDatabase";
import MaterialDidatico from "../entities/materialdidatico.model";

interface MaterialDidaticoRow {
  MaterialDidaticoGUID: string;
  EscolaGUID: string;
  Titulo: string;
  CriadoPorCPF: string;
  CreatedAt: Date;
}

export class MaterialDidaticoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  MaterialDidaticoDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (material: MaterialDidatico): Promise<void> => {
    console.log("🟢 MaterialDidaticoDAO.create()");

    const SQL = `INSERT INTO materialdidatico (MaterialDidaticoGUID, EscolaGUID, Titulo, CriadoPorCPF) VALUES (?, ?, ?, ?)`;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [material.MaterialDidaticoGUID, material.EscolaGUID, material.Titulo, material.CriadoPorCPF]);
  };

  findById = async (guid: string): Promise<MaterialDidatico | null> => {
    console.log("🟢 MaterialDidaticoDAO.findById()");

    const SQL = `SELECT * FROM materialdidatico WHERE MaterialDidaticoGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [guid]);

    const lista = this.mapRows(rows as MaterialDidaticoRow[]);
    return lista[0] || null;
  };

  findByEscola = async (escolaGUID: string): Promise<MaterialDidatico[]> => {
    console.log("🟢 MaterialDidaticoDAO.findByEscola()");

    const SQL = `SELECT * FROM materialdidatico WHERE EscolaGUID = ? ORDER BY Titulo ASC`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [escolaGUID]);
    return this.mapRows(rows as MaterialDidaticoRow[]);
  };

  delete = async (guid: string): Promise<boolean> => {
    console.log("🟢 MaterialDidaticoDAO.delete()");

    const SQL = `DELETE FROM materialdidatico WHERE MaterialDidaticoGUID = ?`;
    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, [guid]);
    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  private mapRows(rows: MaterialDidaticoRow[]): MaterialDidatico[] {
    return rows.map((row) => {
      const material = new MaterialDidatico();
      material.MaterialDidaticoGUID = row.MaterialDidaticoGUID;
      material.EscolaGUID = row.EscolaGUID;
      material.Titulo = row.Titulo;
      material.CriadoPorCPF = row.CriadoPorCPF;
      material.CreatedAt = row.CreatedAt ? new Date(row.CreatedAt) : null;
      return material;
    });
  }
}
