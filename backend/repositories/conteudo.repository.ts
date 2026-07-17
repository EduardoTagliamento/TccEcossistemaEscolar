import MysqlDatabase from "../database/MysqlDatabase";
import Conteudo, { ConteudoTipo } from "../entities/conteudo.model";

interface ConteudoRow {
  ConteudoGUID: string;
  MateriaGUID: string;
  UsuarioCPF: string;
  CategoriaGUID: string | null;
  ConteudoTitulo: string;
  ConteudoTipo: ConteudoTipo;
  ConteudoDescricao: string | null;
  ConteudoDataPublicacao: Date;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ConteudoFilters {
  MateriaGUID?: string;
  UsuarioCPF?: string;
  CategoriaGUID?: string;
  ConteudoTipo?: ConteudoTipo;
}

export interface ConteudoUpdateFields {
  ConteudoTitulo?: string;
  ConteudoDescricao?: string | null;
  CategoriaGUID?: string | null;
  ConteudoDataPublicacao?: Date;
}

export class ConteudoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  ConteudoDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (conteudo: Conteudo): Promise<string> => {
    console.log("🟢 ConteudoDAO.create()");

    const SQL = `
      INSERT INTO conteudo
      (ConteudoGUID, MateriaGUID, UsuarioCPF, CategoriaGUID, ConteudoTitulo, ConteudoTipo, ConteudoDescricao, ConteudoDataPublicacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      conteudo.ConteudoGUID,
      conteudo.MateriaGUID,
      conteudo.UsuarioCPF,
      conteudo.CategoriaGUID,
      conteudo.ConteudoTitulo,
      conteudo.ConteudoTipo,
      conteudo.ConteudoDescricao,
      conteudo.ConteudoDataPublicacao,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return conteudo.ConteudoGUID;
  };

  findById = async (guid: string): Promise<Conteudo | null> => {
    console.log("🟢 ConteudoDAO.findById()");

    const SQL = `SELECT * FROM conteudo WHERE ConteudoGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [guid]);

    const conteudos = this.mapRows(rows as ConteudoRow[]);
    return conteudos[0] || null;
  };

  findAll = async (filters: ConteudoFilters = {}): Promise<Conteudo[]> => {
    console.log("🟢 ConteudoDAO.findAll()");

    const pool = await this.#database.getPool();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.MateriaGUID) {
      conditions.push("MateriaGUID = ?");
      params.push(filters.MateriaGUID);
    }
    if (filters.UsuarioCPF) {
      conditions.push("UsuarioCPF = ?");
      params.push(filters.UsuarioCPF);
    }
    if (filters.CategoriaGUID) {
      conditions.push("CategoriaGUID = ?");
      params.push(filters.CategoriaGUID);
    }
    if (filters.ConteudoTipo) {
      conditions.push("ConteudoTipo = ?");
      params.push(filters.ConteudoTipo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const SQL = `SELECT * FROM conteudo ${whereClause} ORDER BY ConteudoDataPublicacao DESC`;

    const [rows] = await pool.execute(SQL, params);
    return this.mapRows(rows as ConteudoRow[]);
  };

  update = async (guid: string, fields: ConteudoUpdateFields): Promise<Conteudo | null> => {
    console.log("🟢 ConteudoDAO.update()");

    const sets: string[] = [];
    const params: any[] = [];

    if (fields.ConteudoTitulo !== undefined) {
      sets.push("ConteudoTitulo = ?");
      params.push(fields.ConteudoTitulo);
    }
    if (fields.ConteudoDescricao !== undefined) {
      sets.push("ConteudoDescricao = ?");
      params.push(fields.ConteudoDescricao);
    }
    if (fields.CategoriaGUID !== undefined) {
      sets.push("CategoriaGUID = ?");
      params.push(fields.CategoriaGUID);
    }
    if (fields.ConteudoDataPublicacao !== undefined) {
      sets.push("ConteudoDataPublicacao = ?");
      params.push(fields.ConteudoDataPublicacao);
    }

    if (sets.length === 0) {
      return this.findById(guid);
    }

    sets.push("UpdatedAt = CURRENT_TIMESTAMP");
    params.push(guid);

    const SQL = `UPDATE conteudo SET ${sets.join(", ")} WHERE ConteudoGUID = ?`;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return this.findById(guid);
  };

  delete = async (guid: string): Promise<boolean> => {
    console.log("🟢 ConteudoDAO.delete() - remoção definitiva (cascade nas subtabelas)");

    const SQL = `DELETE FROM conteudo WHERE ConteudoGUID = ?`;
    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, [guid]);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  private mapRows(rows: ConteudoRow[]): Conteudo[] {
    return rows.map((row) => {
      const conteudo = new Conteudo();
      conteudo.ConteudoGUID = row.ConteudoGUID;
      conteudo.MateriaGUID = row.MateriaGUID;
      conteudo.UsuarioCPF = row.UsuarioCPF;
      conteudo.CategoriaGUID = row.CategoriaGUID;
      conteudo.ConteudoTitulo = row.ConteudoTitulo;
      conteudo.ConteudoTipo = row.ConteudoTipo;
      conteudo.ConteudoDescricao = row.ConteudoDescricao;
      conteudo.ConteudoDataPublicacao = new Date(row.ConteudoDataPublicacao);
      conteudo.CreatedAt = new Date(row.CreatedAt);
      conteudo.UpdatedAt = new Date(row.UpdatedAt);
      return conteudo;
    });
  }
}
