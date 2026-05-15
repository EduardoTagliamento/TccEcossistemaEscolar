import ProvaAgendada from "../entities/provaagendada.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface ProvaAgendadaRow extends RowDataPacket {
  ProvaAgendadaGUID: string;
  TurmaGUID: string;
  MateriaGUID: string;
  ProvaData: Date;
  ProvaDescricao: string | null;
  ProvaStatus: "Agendada" | "Realizada" | "Cancelada";
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ProvaAgendadaFilters {
  TurmaGUID?: string;
  MateriaGUID?: string;
  ProvaStatus?: "Agendada" | "Realizada" | "Cancelada";
  DataInicio?: Date;
  DataFim?: Date;
}

/**
 * Repository (DAO) para a entidade ProvaAgendada
 *
 * Responsabilidades:
 * - CRUD completo na tabela `provaagendada`
 * - Operações na tabela pivô `relacaoanexosprova`
 * - Conversão entre rows do MySQL e objetos ProvaAgendada
 */
export class ProvaAgendadaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  ProvaAgendadaDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (prova: ProvaAgendada): Promise<ProvaAgendada> => {
    console.log("🟢 ProvaAgendadaDAO.create()");

    const SQL = `
      INSERT INTO provaagendada
      (ProvaAgendadaGUID, TurmaGUID, MateriaGUID, ProvaData, ProvaDescricao, ProvaStatus)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const params = [
      prova.ProvaAgendadaGUID,
      prova.TurmaGUID,
      prova.MateriaGUID,
      prova.ProvaData,
      prova.ProvaDescricao,
      prova.ProvaStatus,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return prova;
  };

  findAll = async (filters?: ProvaAgendadaFilters): Promise<ProvaAgendada[]> => {
    console.log("🟢 ProvaAgendadaDAO.findAll()");

    let SQL = "SELECT * FROM provaagendada WHERE 1=1";
    const params: any[] = [];

    if (filters?.TurmaGUID) {
      SQL += " AND TurmaGUID = ?";
      params.push(filters.TurmaGUID);
    }

    if (filters?.MateriaGUID) {
      SQL += " AND MateriaGUID = ?";
      params.push(filters.MateriaGUID);
    }

    if (filters?.ProvaStatus) {
      SQL += " AND ProvaStatus = ?";
      params.push(filters.ProvaStatus);
    }

    if (filters?.DataInicio) {
      SQL += " AND ProvaData >= ?";
      params.push(filters.DataInicio);
    }

    if (filters?.DataFim) {
      SQL += " AND ProvaData <= ?";
      params.push(filters.DataFim);
    }

    SQL += " ORDER BY ProvaData ASC;";

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<ProvaAgendadaRow[]>(SQL, params);

    return rows.map((row) => this.mapRowToProva(row));
  };

  findById = async (ProvaAgendadaGUID: string): Promise<ProvaAgendada | null> => {
    console.log("🟢 ProvaAgendadaDAO.findById()");

    const SQL = "SELECT * FROM provaagendada WHERE ProvaAgendadaGUID = ?;";
    const params = [ProvaAgendadaGUID];

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<ProvaAgendadaRow[]>(SQL, params);

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToProva(rows[0]);
  };

  update = async (
    ProvaAgendadaGUID: string,
    updates: Partial<Pick<ProvaAgendada, "ProvaData" | "ProvaDescricao" | "ProvaStatus">>
  ): Promise<ProvaAgendada | null> => {
    console.log("🟢 ProvaAgendadaDAO.update()");

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.ProvaData !== undefined) {
      fields.push("ProvaData = ?");
      values.push(updates.ProvaData);
    }

    if (updates.ProvaDescricao !== undefined) {
      fields.push("ProvaDescricao = ?");
      values.push(updates.ProvaDescricao);
    }

    if (updates.ProvaStatus !== undefined) {
      fields.push("ProvaStatus = ?");
      values.push(updates.ProvaStatus);
    }

    if (fields.length === 0) {
      return this.findById(ProvaAgendadaGUID);
    }

    values.push(ProvaAgendadaGUID);

    const SQL = `
      UPDATE provaagendada
      SET ${fields.join(", ")}, UpdatedAt = CURRENT_TIMESTAMP
      WHERE ProvaAgendadaGUID = ?;
    `;

    const pool = await this.#database.getPool();
    await pool.execute(SQL, values);

    return this.findById(ProvaAgendadaGUID);
  };

  delete = async (ProvaAgendadaGUID: string): Promise<boolean> => {
    console.log("🟢 ProvaAgendadaDAO.delete()");

    const SQL = "DELETE FROM provaagendada WHERE ProvaAgendadaGUID = ?;";
    const params = [ProvaAgendadaGUID];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as ResultSetHeader).affectedRows > 0;
  };

  vincularAnexo = async (ProvaAgendadaGUID: string, AnexoGUID: string): Promise<void> => {
    console.log("🟢 ProvaAgendadaDAO.vincularAnexo()");

    const SQL = `
      INSERT INTO relacaoanexosprova (RelacaoAnexoProvaGUID, AnexoGUID, ProvaAgendadaGUID)
      VALUES (UUID(), ?, ?);
    `;

    const pool = await this.#database.getPool();
    await pool.execute(SQL, [AnexoGUID, ProvaAgendadaGUID]);
  };

  desvincularAnexo = async (ProvaAgendadaGUID: string, AnexoGUID: string): Promise<void> => {
    console.log("🟢 ProvaAgendadaDAO.desvincularAnexo()");

    const SQL = "DELETE FROM relacaoanexosprova WHERE ProvaAgendadaGUID = ? AND AnexoGUID = ?;";

    const pool = await this.#database.getPool();
    await pool.execute(SQL, [ProvaAgendadaGUID, AnexoGUID]);
  };

  /**
   * Mapeia uma linha do banco para uma instância de ProvaAgendada
   */
  private mapRowToProva(row: ProvaAgendadaRow): ProvaAgendada {
    const prova = new ProvaAgendada();
    prova.ProvaAgendadaGUID = row.ProvaAgendadaGUID;
    prova.TurmaGUID = row.TurmaGUID;
    prova.MateriaGUID = row.MateriaGUID;
    prova.ProvaData = row.ProvaData;
    prova.ProvaDescricao = row.ProvaDescricao;
    prova.ProvaStatus = row.ProvaStatus;
    prova.CreatedAt = row.CreatedAt;
    prova.UpdatedAt = row.UpdatedAt;
    return prova;
  }
}
