import MysqlDatabase from "../database/MysqlDatabase";
import Assunto, { AssuntoOrigem } from "../entities/assunto.model";

interface AssuntoRow {
  AssuntoGUID: string;
  MateriaGUID: string;
  AssuntoPaiGUID: string | null;
  Nome: string;
  SubMateriaGlobalGUID: string | null;
  Origem: AssuntoOrigem;
  CreatedAt: Date;
}

export class AssuntoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  AssuntoDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (assunto: Assunto): Promise<void> => {
    console.log("🟢 AssuntoDAO.create()");

    const SQL = `
      INSERT INTO assunto (AssuntoGUID, MateriaGUID, AssuntoPaiGUID, Nome, SubMateriaGlobalGUID, Origem)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [
      assunto.AssuntoGUID,
      assunto.MateriaGUID,
      assunto.AssuntoPaiGUID,
      assunto.Nome,
      assunto.SubMateriaGlobalGUID,
      assunto.Origem,
    ]);
  };

  findById = async (guid: string): Promise<Assunto | null> => {
    console.log("🟢 AssuntoDAO.findById()");

    const SQL = `SELECT * FROM assunto WHERE AssuntoGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [guid]);

    const lista = this.mapRows(rows as AssuntoRow[]);
    return lista[0] || null;
  };

  findByMateria = async (materiaGUID: string): Promise<Assunto[]> => {
    console.log("🟢 AssuntoDAO.findByMateria()");

    const SQL = `SELECT * FROM assunto WHERE MateriaGUID = ? ORDER BY Nome ASC`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [materiaGUID]);
    return this.mapRows(rows as AssuntoRow[]);
  };

  findByNomeExato = async (materiaGUID: string, nome: string): Promise<Assunto | null> => {
    console.log("🟢 AssuntoDAO.findByNomeExato()");

    const SQL = `SELECT * FROM assunto WHERE MateriaGUID = ? AND Nome = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [materiaGUID, nome]);

    const lista = this.mapRows(rows as AssuntoRow[]);
    return lista[0] || null;
  };

  delete = async (guid: string): Promise<boolean> => {
    console.log("🟢 AssuntoDAO.delete()");

    const SQL = `DELETE FROM assunto WHERE AssuntoGUID = ?`;
    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, [guid]);
    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  private mapRows(rows: AssuntoRow[]): Assunto[] {
    return rows.map((row) => {
      const assunto = new Assunto();
      assunto.AssuntoGUID = row.AssuntoGUID;
      assunto.MateriaGUID = row.MateriaGUID;
      assunto.AssuntoPaiGUID = row.AssuntoPaiGUID;
      assunto.Nome = row.Nome;
      assunto.SubMateriaGlobalGUID = row.SubMateriaGlobalGUID;
      assunto.Origem = row.Origem;
      assunto.CreatedAt = row.CreatedAt ? new Date(row.CreatedAt) : null;
      return assunto;
    });
  }
}
