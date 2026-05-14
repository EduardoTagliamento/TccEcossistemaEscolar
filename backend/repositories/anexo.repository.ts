import MysqlDatabase from "../database/MysqlDatabase";
import Anexo from "../entities/anexo.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface AnexoRow extends RowDataPacket {
  AnexoGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string;
  AnexoCaminho: string;
  AnexoNomeOriginal: string | null;
  AnexoTamanho: number | null;
  CreatedAt: Date;
}

export interface AnexoFilters {
  UsuarioCPF?: string;
  EscolaGUID?: string;
  DataInicio?: Date;
  DataFim?: Date;
}

export class AnexoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  AnexoDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (anexo: Anexo): Promise<string> => {
    console.log("🟢 AnexoDAO.create()");

    const SQL = `
      INSERT INTO anexo
      (AnexoGUID, UsuarioCPF, EscolaGUID, AnexoCaminho, AnexoNomeOriginal, AnexoTamanho)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const params = [
      anexo.AnexoGUID,
      anexo.UsuarioCPF,
      anexo.EscolaGUID,
      anexo.AnexoCaminho,
      anexo.AnexoNomeOriginal,
      anexo.AnexoTamanho,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return anexo.AnexoGUID;
  };

  delete = async (AnexoGUID: string): Promise<boolean> => {
    console.log("🟢 AnexoDAO.delete()");

    const SQL = "DELETE FROM anexo WHERE AnexoGUID = ?;";
    const params = [AnexoGUID];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as ResultSetHeader).affectedRows > 0;
  };

  findById = async (AnexoGUID: string): Promise<Anexo | null> => {
    console.log("🟢 AnexoDAO.findById()");

    const SQL = "SELECT * FROM anexo WHERE AnexoGUID = ?;";
    const params = [AnexoGUID];

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<AnexoRow[]>(SQL, params);

    if (rows.length === 0) {
      return null;
    }

    const anexo = this.mapRowToAnexo(rows[0]);
    return anexo;
  };

  findAll = async (filters?: AnexoFilters): Promise<Anexo[]> => {
    console.log("🟢 AnexoDAO.findAll()");

    let SQL = "SELECT * FROM anexo WHERE 1=1";
    const params: any[] = [];

    if (filters?.UsuarioCPF) {
      SQL += " AND UsuarioCPF = ?";
      params.push(filters.UsuarioCPF);
    }

    if (filters?.EscolaGUID) {
      SQL += " AND EscolaGUID = ?";
      params.push(filters.EscolaGUID);
    }

    if (filters?.DataInicio) {
      SQL += " AND CreatedAt >= ?";
      params.push(filters.DataInicio);
    }

    if (filters?.DataFim) {
      SQL += " AND CreatedAt <= ?";
      params.push(filters.DataFim);
    }

    SQL += " ORDER BY CreatedAt DESC;";

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<AnexoRow[]>(SQL, params);

    return rows.map((row) => this.mapRowToAnexo(row));
  };

  findByTarefa = async (tarefaGUID: string, tipo?: "descricao" | "entrega"): Promise<Anexo[]> => {
    console.log("🟢 AnexoDAO.findByTarefa()");

    let SQL = `
      SELECT a.*
      FROM anexo a
      JOIN relacaoanexostarefa rat ON a.AnexoGUID = rat.AnexoGUID
      WHERE rat.TarefaGUID = ?
    `;
    const params: any[] = [tarefaGUID];

    if (tipo) {
      SQL += " AND rat.AnexoTipo = ?";
      params.push(tipo);
    }

    SQL += " ORDER BY a.CreatedAt DESC;";

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<AnexoRow[]>(SQL, params);

    return rows.map((row) => this.mapRowToAnexo(row));
  };

  findByPendencia = async (
    pendenciaGUID: string,
    tipo?: "descricao" | "entrega"
  ): Promise<Anexo[]> => {
    console.log("🟢 AnexoDAO.findByPendencia()");

    let SQL = `
      SELECT a.*
      FROM anexo a
      JOIN relacaoanexospendencia rap ON a.AnexoGUID = rap.AnexoGUID
      WHERE rap.PendenciaGUID = ?
    `;
    const params: any[] = [pendenciaGUID];

    if (tipo) {
      SQL += " AND rap.AnexoTipo = ?";
      params.push(tipo);
    }

    SQL += " ORDER BY a.CreatedAt DESC;";

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<AnexoRow[]>(SQL, params);

    return rows.map((row) => this.mapRowToAnexo(row));
  };

  findByEvento = async (eventoGUID: string): Promise<Anexo[]> => {
    console.log("🟢 AnexoDAO.findByEvento()");

    const SQL = `
      SELECT a.*
      FROM anexo a
      JOIN relacaoanexosevento rae ON a.AnexoGUID = rae.AnexoGUID
      WHERE rae.EventoGUID = ?
      ORDER BY a.CreatedAt DESC;
    `;
    const params = [eventoGUID];

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<AnexoRow[]>(SQL, params);

    return rows.map((row) => this.mapRowToAnexo(row));
  };

  findByProva = async (provaGUID: string): Promise<Anexo[]> => {
    console.log("🟢 AnexoDAO.findByProva()");

    const SQL = `
      SELECT a.*
      FROM anexo a
      JOIN relacaoanexosprova rap ON a.AnexoGUID = rap.AnexoGUID
      WHERE rap.ProvaAgendadaGUID = ?
      ORDER BY a.CreatedAt DESC;
    `;
    const params = [provaGUID];

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<AnexoRow[]>(SQL, params);

    return rows.map((row) => this.mapRowToAnexo(row));
  };

  /**
   * Mapeia uma linha do banco para uma instância da classe Anexo
   */
  private mapRowToAnexo(row: AnexoRow): Anexo {
    const anexo = new Anexo();
    anexo.AnexoGUID = row.AnexoGUID;
    anexo.UsuarioCPF = row.UsuarioCPF;
    anexo.EscolaGUID = row.EscolaGUID;
    anexo.AnexoCaminho = row.AnexoCaminho;
    anexo.AnexoNomeOriginal = row.AnexoNomeOriginal;
    anexo.AnexoTamanho = row.AnexoTamanho;
    anexo.CreatedAt = row.CreatedAt;
    return anexo;
  }
}
