import MysqlDatabase from "../database/MysqlDatabase";
import MateriaGlobalAlias from "../entities/materiaglobalalias.model";

interface MateriaGlobalAliasRow {
  MateriaGlobalAliasGUID: string;
  MateriaGlobalGUID: string;
  NomeAlias: string;
}

export class MateriaGlobalAliasDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  MateriaGlobalAliasDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (alias: MateriaGlobalAlias): Promise<void> => {
    console.log("🟢 MateriaGlobalAliasDAO.create()");

    const SQL = `INSERT IGNORE INTO materiaglobalalias (MateriaGlobalAliasGUID, MateriaGlobalGUID, NomeAlias) VALUES (?, ?, ?)`;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [alias.MateriaGlobalAliasGUID, alias.MateriaGlobalGUID, alias.NomeAlias]);
  };

  /** Universo de aliases pra somar aos candidatos da similaridade de string (poucas centenas de linhas, sem paginação necessária). */
  findAll = async (): Promise<MateriaGlobalAlias[]> => {
    console.log("🟢 MateriaGlobalAliasDAO.findAll()");

    const SQL = `SELECT * FROM materiaglobalalias`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL);
    return this.mapRows(rows as MateriaGlobalAliasRow[]);
  };

  private mapRows(rows: MateriaGlobalAliasRow[]): MateriaGlobalAlias[] {
    return rows.map((row) => {
      const alias = new MateriaGlobalAlias();
      alias.MateriaGlobalAliasGUID = row.MateriaGlobalAliasGUID;
      alias.MateriaGlobalGUID = row.MateriaGlobalGUID;
      alias.NomeAlias = row.NomeAlias;
      return alias;
    });
  }
}
