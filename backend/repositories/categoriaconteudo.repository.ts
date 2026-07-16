import MysqlDatabase from "../database/MysqlDatabase";
import CategoriaConteudo from "../entities/categoriaconteudo.model";

interface CategoriaConteudoRow {
  CategoriaGUID: string;
  UsuarioCPF: string;
  MateriaGUID: string;
  CategoriaNome: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface CategoriaConteudoFilters {
  UsuarioCPF?: string;
  MateriaGUID?: string;
}

export class CategoriaConteudoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  CategoriaConteudoDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (categoria: CategoriaConteudo): Promise<string> => {
    console.log("🟢 CategoriaConteudoDAO.create()");

    const SQL = `
      INSERT INTO categoriaconteudo (CategoriaGUID, UsuarioCPF, MateriaGUID, CategoriaNome)
      VALUES (?, ?, ?, ?);
    `;
    const params = [
      categoria.CategoriaGUID,
      categoria.UsuarioCPF,
      categoria.MateriaGUID,
      categoria.CategoriaNome,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return categoria.CategoriaGUID;
  };

  findAll = async (filters: CategoriaConteudoFilters = {}): Promise<CategoriaConteudo[]> => {
    console.log("🟢 CategoriaConteudoDAO.findAll()");

    const pool = await this.#database.getPool();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.UsuarioCPF) {
      conditions.push("UsuarioCPF = ?");
      params.push(filters.UsuarioCPF);
    }
    if (filters.MateriaGUID) {
      conditions.push("MateriaGUID = ?");
      params.push(filters.MateriaGUID);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const SQL = `SELECT * FROM categoriaconteudo ${whereClause} ORDER BY CategoriaNome ASC`;

    const [rows] = await pool.execute(SQL, params);
    return this.mapRows(rows as CategoriaConteudoRow[]);
  };

  findById = async (guid: string): Promise<CategoriaConteudo | null> => {
    console.log("🟢 CategoriaConteudoDAO.findById()");

    const SQL = `SELECT * FROM categoriaconteudo WHERE CategoriaGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [guid]);

    const categorias = this.mapRows(rows as CategoriaConteudoRow[]);
    return categorias[0] || null;
  };

  findByUsuarioMateriaNome = async (
    usuarioCPF: string,
    materiaGUID: string,
    nome: string
  ): Promise<CategoriaConteudo | null> => {
    console.log("🟢 CategoriaConteudoDAO.findByUsuarioMateriaNome()");

    const SQL = `
      SELECT * FROM categoriaconteudo
      WHERE UsuarioCPF = ? AND MateriaGUID = ? AND CategoriaNome = ?
      LIMIT 1
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [usuarioCPF, materiaGUID, nome]);

    const categorias = this.mapRows(rows as CategoriaConteudoRow[]);
    return categorias[0] || null;
  };

  update = async (guid: string, categoriaNome: string): Promise<CategoriaConteudo | null> => {
    console.log("🟢 CategoriaConteudoDAO.update()");

    const SQL = `
      UPDATE categoriaconteudo
      SET CategoriaNome = ?, UpdatedAt = CURRENT_TIMESTAMP
      WHERE CategoriaGUID = ?
    `;
    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, [categoriaNome, guid]);

    if ((resultado as { affectedRows: number }).affectedRows > 0) {
      return await this.findById(guid);
    }
    return null;
  };

  delete = async (guid: string): Promise<boolean> => {
    console.log("🟢 CategoriaConteudoDAO.delete()");

    const SQL = `DELETE FROM categoriaconteudo WHERE CategoriaGUID = ?`;
    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, [guid]);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  private mapRows(rows: CategoriaConteudoRow[]): CategoriaConteudo[] {
    return rows.map((row) => {
      const categoria = new CategoriaConteudo();
      categoria.CategoriaGUID = row.CategoriaGUID;
      categoria.UsuarioCPF = row.UsuarioCPF;
      categoria.MateriaGUID = row.MateriaGUID;
      categoria.CategoriaNome = row.CategoriaNome;
      categoria.CreatedAt = new Date(row.CreatedAt);
      categoria.UpdatedAt = new Date(row.UpdatedAt);
      return categoria;
    });
  }
}
