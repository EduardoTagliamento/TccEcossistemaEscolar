import TarefaAcademica from "../entities/tarefaacademica.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface TarefaAcademicaRow extends RowDataPacket {
  TarefaGUID: string;
  matXprofXturxescGUID: string;
  TarefaTitulo: string;
  TarefaConteudo: string | null;
  TarefaPostagemData: Date;
  TarefaPrazoData: Date;
  TarefaTipoEntrega: "digital" | "fisica";
  TarefaCompartilhada: boolean;
  TarefaMinPessoas: number | null;
  TarefaMaxPessoas: number | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface TarefaAcademicaFilters {
  matXprofXturxescGUID?: string;
  DataInicio?: Date;
  DataFim?: Date;
  TarefaCompartilhada?: boolean;
}

/**
 * Repository (DAO) para a entidade TarefaAcademica (MODELO NORMALIZADO)
 *
 * Responsabilidades:
 * - CRUD completo na tabela `tarefaacademica` (dados únicos da tarefa)
 * - Operações na tabela pivô `relacaoanexostarefa`
 * - Conversão entre rows do MySQL e objetos TarefaAcademica
 * 
 * IMPORTANTE:
 * - Não gerencia mais MatriculaGUID (ver TarefaAcademicaMatriculaDAO)
 * - Uma tarefa agora é única e compartilhada por N alunos
 * - Para atribuir tarefa a alunos, use TarefaAcademicaMatriculaDAO.createBatch()
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
      (TarefaGUID, matXprofXturxescGUID, TarefaTitulo, TarefaConteudo,
       TarefaPostagemData, TarefaPrazoData, TarefaTipoEntrega,
       TarefaCompartilhada, TarefaMinPessoas, TarefaMaxPessoas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      tarefa.TarefaGUID,
      tarefa.matXprofXturxescGUID,
      tarefa.TarefaTitulo,
      tarefa.TarefaConteudo,
      tarefa.TarefaPostagemData,
      tarefa.TarefaPrazoData,
      tarefa.TarefaTipoEntrega,
      tarefa.TarefaCompartilhada,
      tarefa.TarefaMinPessoas,
      tarefa.TarefaMaxPessoas,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return tarefa;
  };

  /**
   * MÉTODO OBSOLETO - use service layer com TarefaAcademicaMatriculaDAO
   * 
   * Criar múltiplas tarefas em batch não faz mais sentido no modelo normalizado.
   * O correto é:
   * 1. Criar UMA tarefa com TarefaAcademicaDAO.create()
   * 2. Atribuir para N alunos com TarefaAcademicaMatriculaDAO.createBatch()
   */
  createBatch = async (tarefas: TarefaAcademica[]): Promise<TarefaAcademica[]> => {
    throw new Error("createBatch() obsoleto. Use create() + TarefaAcademicaMatriculaDAO.createBatch()");
  };

  findAll = async (filters?: TarefaAcademicaFilters): Promise<TarefaAcademica[]> => {
    console.log("🟢 TarefaAcademicaDAO.findAll()");

    let SQL = "SELECT * FROM tarefaacademica WHERE 1=1";
    const params: any[] = [];

    if (filters?.matXprofXturxescGUID) {
      SQL += " AND matXprofXturxescGUID = ?";
      params.push(filters.matXprofXturxescGUID);
    }

    if (filters?.DataInicio) {
      SQL += " AND TarefaPrazoData >= ?";
      params.push(filters.DataInicio);
    }

    if (filters?.DataFim) {
      SQL += " AND TarefaPrazoData <= ?";
      params.push(filters.DataFim);
    }

    if (filters?.TarefaCompartilhada !== undefined) {
      SQL += " AND TarefaCompartilhada = ?";
      params.push(filters.TarefaCompartilhada);
    }

    SQL += " ORDER BY TarefaPrazoData ASC;";

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaRow[]>(SQL, params);

    return rows.map((row) => this.mapRowToTarefa(row));
  };

  findById = async (TarefaGUID: string): Promise<TarefaAcademica | null> => {
    console.log("🟢 TarefaAcademicaDAO.findById()");

    const SQL = "SELECT * FROM tarefaacademica WHERE TarefaGUID = ? LIMIT 1;";
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaRow[]>(SQL, [TarefaGUID]);

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToTarefa(rows[0]);
  };

  update = async (
    TarefaGUID: string,
    updates: Partial<Pick<
      TarefaAcademica,
      "TarefaTitulo" | "TarefaConteudo" | "TarefaPrazoData" | "TarefaTipoEntrega" |
      "TarefaCompartilhada" | "TarefaMinPessoas" | "TarefaMaxPessoas"
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
    if (updates.TarefaCompartilhada !== undefined) {
      fields.push("TarefaCompartilhada = ?");
      values.push(updates.TarefaCompartilhada);
    }
    if (updates.TarefaMinPessoas !== undefined) {
      fields.push("TarefaMinPessoas = ?");
      values.push(updates.TarefaMinPessoas);
    }
    if (updates.TarefaMaxPessoas !== undefined) {
      fields.push("TarefaMaxPessoas = ?");
      values.push(updates.TarefaMaxPessoas);
    }

    if (fields.length === 0) {
      return this.findById(TarefaGUID);
    }

    values.push(TarefaGUID);

    const SQL = `
      UPDATE tarefaacademica
      SET ${fields.join(", ")}
      WHERE TarefaGUID = ?;
    `;

    const pool = await this.#database.getPool();
    await pool.execute(SQL, values);

    return this.findById(TarefaGUID);
  };

  delete = async (TarefaGUID: string): Promise<boolean> => {
    console.log("🟢 TarefaAcademicaDAO.delete()");

    const SQL = "DELETE FROM tarefaacademica WHERE TarefaGUID = ?;";
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(SQL, [TarefaGUID]);

    return result.affectedRows > 0;
  };

  vincularAnexo = async (TarefaGUID: string, AnexoGUID: string, tipo: "tarefa" | "resposta"): Promise<void> => {
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
    tarefa.matXprofXturxescGUID = row.matXprofXturxescGUID;
    tarefa.TarefaTitulo = row.TarefaTitulo;
    tarefa.TarefaConteudo = row.TarefaConteudo;
    tarefa.TarefaPostagemData = row.TarefaPostagemData;
    tarefa.TarefaPrazoData = row.TarefaPrazoData;
    tarefa.TarefaTipoEntrega = row.TarefaTipoEntrega;
    tarefa.TarefaCompartilhada = Boolean(row.TarefaCompartilhada);
    tarefa.TarefaMinPessoas = row.TarefaMinPessoas;
    tarefa.TarefaMaxPessoas = row.TarefaMaxPessoas;
    tarefa.CreatedAt = row.CreatedAt;
    tarefa.UpdatedAt = row.UpdatedAt;
    return tarefa;
  }
}
