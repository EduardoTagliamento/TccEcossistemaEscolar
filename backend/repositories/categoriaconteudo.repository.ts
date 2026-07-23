import MysqlDatabase from "../database/MysqlDatabase";
import CategoriaConteudo from "../entities/categoriaconteudo.model";

interface CategoriaConteudoRow {
  CategoriaGUID: string;
  UsuarioCPF: string;
  MateriaGUID: string;
  TurmaGUID: string;
  CategoriaNome: string;
  Ordem: number;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface CategoriaConteudoFilters {
  UsuarioCPF?: string;
  MateriaGUID?: string;
  TurmaGUID?: string;
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
      INSERT INTO categoriaconteudo (CategoriaGUID, UsuarioCPF, MateriaGUID, TurmaGUID, CategoriaNome, Ordem)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const params = [
      categoria.CategoriaGUID,
      categoria.UsuarioCPF,
      categoria.MateriaGUID,
      categoria.TurmaGUID,
      categoria.CategoriaNome,
      categoria.Ordem,
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
    if (filters.TurmaGUID) {
      conditions.push("TurmaGUID = ?");
      params.push(filters.TurmaGUID);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const SQL = `SELECT * FROM categoriaconteudo ${whereClause} ORDER BY Ordem ASC`;

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

  findByUsuarioMateriaTurmaNome = async (
    usuarioCPF: string,
    materiaGUID: string,
    turmaGUID: string,
    nome: string
  ): Promise<CategoriaConteudo | null> => {
    console.log("🟢 CategoriaConteudoDAO.findByUsuarioMateriaTurmaNome()");

    const SQL = `
      SELECT * FROM categoriaconteudo
      WHERE UsuarioCPF = ? AND MateriaGUID = ? AND TurmaGUID = ? AND CategoriaNome = ?
      LIMIT 1
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [usuarioCPF, materiaGUID, turmaGUID, nome]);

    const categorias = this.mapRows(rows as CategoriaConteudoRow[]);
    return categorias[0] || null;
  };

  findMaiorOrdem = async (usuarioCPF: string, materiaGUID: string, turmaGUID: string): Promise<number> => {
    console.log("🟢 CategoriaConteudoDAO.findMaiorOrdem()");

    const SQL = `
      SELECT MAX(Ordem) AS MaiorOrdem FROM categoriaconteudo
      WHERE UsuarioCPF = ? AND MateriaGUID = ? AND TurmaGUID = ?
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [usuarioCPF, materiaGUID, turmaGUID]);
    const resultado = (rows as Array<{ MaiorOrdem: number | null }>)[0];

    return resultado?.MaiorOrdem ?? -1;
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

  updateOrdemEmLote = async (ordem: Array<{ CategoriaGUID: string; Ordem: number }>): Promise<void> => {
    console.log("🟢 CategoriaConteudoDAO.updateOrdemEmLote()");

    const pool = await this.#database.getPool();
    const conexao = await pool.getConnection();
    try {
      await conexao.beginTransaction();
      for (const item of ordem) {
        await conexao.execute(
          `UPDATE categoriaconteudo SET Ordem = ?, UpdatedAt = CURRENT_TIMESTAMP WHERE CategoriaGUID = ?`,
          [item.Ordem, item.CategoriaGUID]
        );
      }
      await conexao.commit();
    } catch (error) {
      await conexao.rollback();
      throw error;
    } finally {
      conexao.release();
    }
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
      categoria.TurmaGUID = row.TurmaGUID;
      categoria.CategoriaNome = row.CategoriaNome;
      categoria.Ordem = row.Ordem;
      categoria.CreatedAt = new Date(row.CreatedAt);
      categoria.UpdatedAt = new Date(row.UpdatedAt);
      return categoria;
    });
  }
}
