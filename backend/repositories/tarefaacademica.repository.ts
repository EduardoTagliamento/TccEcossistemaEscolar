import TarefaAcademica from "../entities/tarefaacademica.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface TarefaAcademicaRow extends RowDataPacket {
  TarefaGUID: string;
  MatriculaGUID: string;
  matXprofXturxescGUID: string;
  TarefaTitulo: string;
  TarefaConteudo: string | null;
  TarefaPostagemData: Date;
  TarefaPrazoData: Date;
  TarefaTipoEntrega: "digital" | "fisica";
  TarefaFeito: boolean | number;
  TarefaRealizacaoData: Date | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface TarefaAcademicaFilters {
  MatriculaGUID?: string;
  matXprofXturxescGUID?: string;
  TarefaFeito?: boolean;
  DataInicio?: Date;
  DataFim?: Date;
}

/**
 * Repository (DAO) para a entidade TarefaAcademica
 *
 * Responsabilidades:
 * - CRUD completo na tabela `tarefaacademica`
 * - Operações na tabela pivô `relacaoanexostarefa`
 * - Conversão entre rows do MySQL e objetos TarefaAcademica
 */
export class TarefaAcademicaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  TarefaAcademicaDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (tarefa: TarefaAcademica): Promise<TarefaAcademica> => {
    console.log("🟢 TarefaAcademicaDAO.create()");

    const SQL = `
      INSERT INTO tarefaacademica
      (TarefaGUID, MatriculaGUID, matXprofXturxescGUID, TarefaTitulo, TarefaConteudo,
       TarefaPostagemData, TarefaPrazoData, TarefaTipoEntrega, TarefaFeito)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      tarefa.TarefaGUID,
      tarefa.MatriculaGUID,
      tarefa.matXprofXturxescGUID,
      tarefa.TarefaTitulo,
      tarefa.TarefaConteudo,
      tarefa.TarefaPostagemData,
      tarefa.TarefaPrazoData,
      tarefa.TarefaTipoEntrega,
      tarefa.TarefaFeito,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return tarefa;
  };

  /**
   * Criar múltiplas tarefas em uma única query (batch insert)
   * Melhora significativamente a performance ao criar tarefas para múltiplos alunos
   */
  createBatch = async (tarefas: TarefaAcademica[]): Promise<TarefaAcademica[]> => {
    console.log(`🟢 TarefaAcademicaDAO.createBatch() - ${tarefas.length} tarefas`);

    if (tarefas.length === 0) {
      return [];
    }

    // Construir VALUES com placeholders para cada tarefa
    const valuesPlaceholder = tarefas.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
    
    const SQL = `
      INSERT INTO tarefaacademica
      (TarefaGUID, MatriculaGUID, matXprofXturxescGUID, TarefaTitulo, TarefaConteudo,
       TarefaPostagemData, TarefaPrazoData, TarefaTipoEntrega, TarefaFeito)
      VALUES ${valuesPlaceholder};
    `;

    // Flatten todos os parâmetros em um único array
    const params: any[] = [];
    tarefas.forEach((tarefa) => {
      params.push(
        tarefa.TarefaGUID,
        tarefa.MatriculaGUID,
        tarefa.matXprofXturxescGUID,
        tarefa.TarefaTitulo,
        tarefa.TarefaConteudo,
        tarefa.TarefaPostagemData,
        tarefa.TarefaPrazoData,
        tarefa.TarefaTipoEntrega,
        tarefa.TarefaFeito
      );
    });

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return tarefas;
  };

  findAll = async (filters?: TarefaAcademicaFilters): Promise<TarefaAcademica[]> => {
    console.log("🟢 TarefaAcademicaDAO.findAll()");

    let SQL = "SELECT * FROM tarefaacademica WHERE 1=1";
    const params: any[] = [];

    if (filters?.MatriculaGUID) {
      SQL += " AND MatriculaGUID = ?";
      params.push(filters.MatriculaGUID);
    }

    if (filters?.matXprofXturxescGUID) {
      SQL += " AND matXprofXturxescGUID = ?";
      params.push(filters.matXprofXturxescGUID);
    }

    if (filters?.TarefaFeito !== undefined) {
      SQL += " AND TarefaFeito = ?";
      params.push(filters.TarefaFeito);
    }

    if (filters?.DataInicio) {
      SQL += " AND TarefaPrazoData >= ?";
      params.push(filters.DataInicio);
    }

    if (filters?.DataFim) {
      SQL += " AND TarefaPrazoData <= ?";
      params.push(filters.DataFim);
    }

    SQL += " ORDER BY TarefaPrazoData ASC;";

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaRow[]>(SQL, params);

    return rows.map((row) => this.mapRowToTarefa(row));
  };

  findById = async (TarefaGUID: string): Promise<TarefaAcademica | null> => {
    console.log("🟢 TarefaAcademicaDAO.findById()");

    const SQL = "SELECT * FROM tarefaacademica WHERE TarefaGUID = ?;";
    const params = [TarefaGUID];

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaRow[]>(SQL, params);

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToTarefa(rows[0]);
  };

  update = async (
    TarefaGUID: string,
    updates: Partial<Pick<
      TarefaAcademica,
      "TarefaTitulo" | "TarefaConteudo" | "TarefaPrazoData" | "TarefaTipoEntrega" | "TarefaFeito"
    >>
  ): Promise<TarefaAcademica | null> => {
    console.log("🟢 TarefaAcademicaDAO.update()");

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.TarefaTitulo !== undefined) {
      fields.push("TarefaTitulo = ?");
      values.push(updates.TarefaTitulo);
    }
    if (updates.TarefaConteudo !== undefined) {
      fields.push("TarefaConteudo = ?");
      values.push(updates.TarefaConteudo);
    }
    if (updates.TarefaPrazoData !== undefined) {
      fields.push("TarefaPrazoData = ?");
      values.push(updates.TarefaPrazoData);
    }
    if (updates.TarefaTipoEntrega !== undefined) {
      fields.push("TarefaTipoEntrega = ?");
      values.push(updates.TarefaTipoEntrega);
    }
    if (updates.TarefaFeito !== undefined) {
      fields.push("TarefaFeito = ?");
      values.push(updates.TarefaFeito);
      if (updates.TarefaFeito) {
        fields.push("TarefaRealizacaoData = CURRENT_TIMESTAMP");
      } else {
        fields.push("TarefaRealizacaoData = NULL");
      }
    }

    if (fields.length === 0) {
      return this.findById(TarefaGUID);
    }

    values.push(TarefaGUID);

    const SQL = `
      UPDATE tarefaacademica
      SET ${fields.join(", ")}, UpdatedAt = CURRENT_TIMESTAMP
      WHERE TarefaGUID = ?;
    `;

    const pool = await this.#database.getPool();
    await pool.execute(SQL, values);

    return this.findById(TarefaGUID);
  };

  delete = async (TarefaGUID: string): Promise<boolean> => {
    console.log("🟢 TarefaAcademicaDAO.delete()");

    const SQL = "DELETE FROM tarefaacademica WHERE TarefaGUID = ?;";
    const params = [TarefaGUID];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as ResultSetHeader).affectedRows > 0;
  };

  vincularAnexo = async (
    TarefaGUID: string,
    AnexoGUID: string,
    tipo: "descricao" | "entrega"
  ): Promise<void> => {
    console.log("🟢 TarefaAcademicaDAO.vincularAnexo()");

    const SQL = `
      INSERT INTO relacaoanexostarefa (RelacaoAnexoTarefaGUID, AnexoGUID, TarefaGUID, AnexoTipo)
      VALUES (UUID(), ?, ?, ?);
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [AnexoGUID, TarefaGUID, tipo]);
  };

  desvincularAnexo = async (TarefaGUID: string, AnexoGUID: string): Promise<void> => {
    console.log("🟢 TarefaAcademicaDAO.desvincularAnexo()");

    const SQL = "DELETE FROM relacaoanexostarefa WHERE TarefaGUID = ? AND AnexoGUID = ?;";
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [TarefaGUID, AnexoGUID]);
  };

  /**
   * Mapeia uma linha do banco para uma instância de TarefaAcademica
   */
  private mapRowToTarefa(row: TarefaAcademicaRow): TarefaAcademica {
    const tarefa = new TarefaAcademica();
    tarefa.TarefaGUID = row.TarefaGUID;
    tarefa.MatriculaGUID = row.MatriculaGUID;
    tarefa.matXprofXturxescGUID = row.matXprofXturxescGUID;
    tarefa.TarefaTitulo = row.TarefaTitulo;
    tarefa.TarefaConteudo = row.TarefaConteudo;
    tarefa.TarefaPostagemData = row.TarefaPostagemData;
    tarefa.TarefaPrazoData = row.TarefaPrazoData;
    tarefa.TarefaTipoEntrega = row.TarefaTipoEntrega;
    tarefa.TarefaFeito = Boolean(row.TarefaFeito);
    tarefa.TarefaRealizacaoData = row.TarefaRealizacaoData;
    tarefa.CreatedAt = row.CreatedAt;
    tarefa.UpdatedAt = row.UpdatedAt;
    return tarefa;
  }
}
