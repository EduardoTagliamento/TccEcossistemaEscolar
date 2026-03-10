import MysqlDatabase from "../database/MysqlDatabase";
import EscolaxUsuarioxFuncao from "../entities/escolaxusuarioxfuncao.model";

interface EscolaxUsuarioxFuncaoRow {
  EscolaxUsuarioxFuncaoId: number;
  UsuarioCPF: string;
  EscolaGUID: string;
  FuncaoId: number;
  FuncaoNome: string | null;
  DataInicio: Date | null;
  DataFim: Date | null;
  Status: "Ativo" | "Inativo" | "Finalizado";
  CreatedAt: Date;
  UpdatedAt: Date;
}

interface FindAllFilters {
  UsuarioCPF?: string;
  EscolaGUID?: string;
  FuncaoId?: number;
}

export class EscolaxUsuarioxFuncaoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("Server: EscolaxUsuarioxFuncaoDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (relacao: EscolaxUsuarioxFuncao): Promise<number> => {
    console.log("Repository: EscolaxUsuarioxFuncaoDAO.create()");

    const SQL = `
      INSERT INTO escolaxusuarioxfuncao
      (UsuarioCPF, EscolaGUID, FuncaoId, DataInicio, DataFim, Status)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const params = [
      relacao.UsuarioCPF,
      relacao.EscolaGUID,
      relacao.FuncaoId,
      relacao.DataInicio,
      relacao.DataFim,
      relacao.Status,
    ];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as { insertId: number }).insertId;
  };

  update = async (relacao: EscolaxUsuarioxFuncao): Promise<boolean> => {
    console.log("Repository: EscolaxUsuarioxFuncaoDAO.update()");

    const SQL = `
      UPDATE escolaxusuarioxfuncao
      SET UsuarioCPF = ?, EscolaGUID = ?, FuncaoId = ?, DataInicio = ?, DataFim = ?, Status = ?
      WHERE EscolaxUsuarioxFuncaoId = ?;
    `;
    const params = [
      relacao.UsuarioCPF,
      relacao.EscolaGUID,
      relacao.FuncaoId,
      relacao.DataInicio,
      relacao.DataFim,
      relacao.Status,
      relacao.EscolaxUsuarioxFuncaoId,
    ];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  delete = async (EscolaxUsuarioxFuncaoId: number): Promise<boolean> => {
    console.log("Repository: EscolaxUsuarioxFuncaoDAO.delete()");

    const SQL = "DELETE FROM escolaxusuarioxfuncao WHERE EscolaxUsuarioxFuncaoId = ?;";
    const params = [EscolaxUsuarioxFuncaoId];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  findById = async (
    EscolaxUsuarioxFuncaoId: number
  ): Promise<EscolaxUsuarioxFuncao | null> => {
    console.log("Repository: EscolaxUsuarioxFuncaoDAO.findById()");

    const SQL = `
      SELECT euf.*, f.FuncaoNome
      FROM escolaxusuarioxfuncao euf
      INNER JOIN funcao f ON f.FuncaoId = euf.FuncaoId
      WHERE euf.EscolaxUsuarioxFuncaoId = ?;
    `;

    const pool = await this.#database.getPool();
    const [linhas] = await pool.execute(SQL, [EscolaxUsuarioxFuncaoId]);

    const rows = linhas as EscolaxUsuarioxFuncaoRow[];
    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(rows[0]);
  };

  findAll = async (filters?: FindAllFilters): Promise<EscolaxUsuarioxFuncao[]> => {
    console.log("Repository: EscolaxUsuarioxFuncaoDAO.findAll()");

    let SQL = `
      SELECT euf.*, f.FuncaoNome
      FROM escolaxusuarioxfuncao euf
      INNER JOIN funcao f ON f.FuncaoId = euf.FuncaoId
    `;

    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (filters?.UsuarioCPF) {
      conditions.push("euf.UsuarioCPF = ?");
      params.push(filters.UsuarioCPF);
    }

    if (filters?.EscolaGUID) {
      conditions.push("euf.EscolaGUID = ?");
      params.push(filters.EscolaGUID);
    }

    if (filters?.FuncaoId !== undefined) {
      conditions.push("euf.FuncaoId = ?");
      params.push(filters.FuncaoId);
    }

    if (conditions.length > 0) {
      SQL += ` WHERE ${conditions.join(" AND ")}`;
    }

    SQL += " ORDER BY euf.EscolaxUsuarioxFuncaoId DESC;";

    const pool = await this.#database.getPool();
    const [linhas] = await pool.execute(SQL, params);

    return (linhas as EscolaxUsuarioxFuncaoRow[]).map((row) => this.mapRowToEntity(row));
  };

  findByTripla = async (
    UsuarioCPF: string,
    EscolaGUID: string,
    FuncaoId: number
  ): Promise<EscolaxUsuarioxFuncao | null> => {
    console.log("Repository: EscolaxUsuarioxFuncaoDAO.findByTripla()");

    const SQL = `
      SELECT euf.*, f.FuncaoNome
      FROM escolaxusuarioxfuncao euf
      INNER JOIN funcao f ON f.FuncaoId = euf.FuncaoId
      WHERE euf.UsuarioCPF = ?
        AND euf.EscolaGUID = ?
        AND euf.FuncaoId = ?;
    `;

    const pool = await this.#database.getPool();
    const [linhas] = await pool.execute(SQL, [UsuarioCPF, EscolaGUID, FuncaoId]);

    const rows = linhas as EscolaxUsuarioxFuncaoRow[];
    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(rows[0]);
  };

  usuarioExists = async (UsuarioCPF: string): Promise<boolean> => {
    const SQL = "SELECT 1 FROM usuario WHERE UsuarioCPF = ? LIMIT 1;";
    const pool = await this.#database.getPool();
    const [linhas] = await pool.execute(SQL, [UsuarioCPF]);
    return (linhas as Array<Record<string, unknown>>).length > 0;
  };

  escolaExists = async (EscolaGUID: string): Promise<boolean> => {
    const SQL = "SELECT 1 FROM escola WHERE EscolaGUID = ? LIMIT 1;";
    const pool = await this.#database.getPool();
    const [linhas] = await pool.execute(SQL, [EscolaGUID]);
    return (linhas as Array<Record<string, unknown>>).length > 0;
  };

  funcaoExists = async (FuncaoId: number): Promise<boolean> => {
    const SQL = "SELECT 1 FROM funcao WHERE FuncaoId = ? LIMIT 1;";
    const pool = await this.#database.getPool();
    const [linhas] = await pool.execute(SQL, [FuncaoId]);
    return (linhas as Array<Record<string, unknown>>).length > 0;
  };

  private mapRowToEntity = (row: EscolaxUsuarioxFuncaoRow): EscolaxUsuarioxFuncao => {
    const relacao = new EscolaxUsuarioxFuncao();
    relacao.EscolaxUsuarioxFuncaoId = row.EscolaxUsuarioxFuncaoId;
    relacao.UsuarioCPF = row.UsuarioCPF;
    relacao.EscolaGUID = row.EscolaGUID;
    relacao.FuncaoId = row.FuncaoId;
    relacao.FuncaoNome = row.FuncaoNome;
    relacao.DataInicio = row.DataInicio ? new Date(row.DataInicio) : null;
    relacao.DataFim = row.DataFim ? new Date(row.DataFim) : null;
    relacao.Status = row.Status;
    relacao.CreatedAt = new Date(row.CreatedAt);
    relacao.UpdatedAt = new Date(row.UpdatedAt);
    return relacao;
  };
}
