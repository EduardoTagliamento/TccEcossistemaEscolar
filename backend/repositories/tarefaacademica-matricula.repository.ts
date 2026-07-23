import TarefaAcademicaMatricula from "../entities/tarefaacademica-matricula.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface TarefaAcademicaMatriculaRow extends RowDataPacket {
  TarefaMatriculaGUID: string;
  TarefaGUID: string;
  MatriculaGUID: string;
  TarefaPrazoDataMatricula: Date | null;
  TarefaFeito: boolean | number;
  TarefaRealizacaoData: Date | null;
  TarefaNota: number | null;
  TarefaAvaliadoEm: Date | null;
  TarefaAvaliadoPorCPF: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface TarefaVencidaSemAvaliacao {
  TarefaMatriculaGUID: string;
  TarefaGUID: string;
  MatriculaGUID: string;
  UsuarioCPF: string;
}

/**
 * Repository (DAO) para a tabela intermediária tarefaacademica_matricula
 *
 * Responsabilidades:
 * - CRUD na tabela `tarefaacademica_matricula` (relacionamento N:N)
 * - Gerenciar atribuição de tarefas para alunos
 * - Marcar tarefas como feitas individualmente por aluno
 * - Consultar quais alunos receberam determinada tarefa
 */
export class TarefaAcademicaMatriculaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  TarefaAcademicaMatriculaDAO.constructor()");
    this.#database = databaseInstance;
  }

  /**
   * Criar atribuição de tarefa para um aluno
   */
  create = async (atribuicao: TarefaAcademicaMatricula): Promise<TarefaAcademicaMatricula> => {
    console.log("🟢 TarefaAcademicaMatriculaDAO.create()");

    const SQL = `
      INSERT INTO tarefaacademica_matricula
      (TarefaMatriculaGUID, TarefaGUID, MatriculaGUID, TarefaPrazoDataMatricula, TarefaFeito, TarefaRealizacaoData)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const params = [
      atribuicao.TarefaMatriculaGUID,
      atribuicao.TarefaGUID,
      atribuicao.MatriculaGUID,
      atribuicao.TarefaPrazoDataMatricula,
      atribuicao.TarefaFeito,
      atribuicao.TarefaRealizacaoData,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return atribuicao;
  };

  /**
   * Criar múltiplas atribuições em uma única query (batch insert)
   */
  createBatch = async (atribuicoes: TarefaAcademicaMatricula[]): Promise<TarefaAcademicaMatricula[]> => {
    console.log(`🟢 TarefaAcademicaMatriculaDAO.createBatch() - ${atribuicoes.length} atribuições`);

    if (atribuicoes.length === 0) {
      return [];
    }

    const valuesPlaceholder = atribuicoes.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");

    const SQL = `
      INSERT INTO tarefaacademica_matricula
      (TarefaMatriculaGUID, TarefaGUID, MatriculaGUID, TarefaPrazoDataMatricula, TarefaFeito, TarefaRealizacaoData)
      VALUES ${valuesPlaceholder};
    `;

    const params: any[] = [];
    atribuicoes.forEach((atrib) => {
      params.push(
        atrib.TarefaMatriculaGUID,
        atrib.TarefaGUID,
        atrib.MatriculaGUID,
        atrib.TarefaPrazoDataMatricula,
        atrib.TarefaFeito,
        atrib.TarefaRealizacaoData
      );
    });

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return atribuicoes;
  };

  /**
   * Buscar todas as atribuições de uma tarefa
   */
  findByTarefa = async (TarefaGUID: string): Promise<TarefaAcademicaMatricula[]> => {
    console.log("🟢 TarefaAcademicaMatriculaDAO.findByTarefa()");

    const SQL = "SELECT * FROM tarefaacademica_matricula WHERE TarefaGUID = ?;";
    const params = [TarefaGUID];

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaMatriculaRow[]>(SQL, params);

    return rows.map((row) => this.mapRowToEntity(row));
  };

  /**
   * Buscar todas as tarefas de um aluno (matrícula)
   */
  findByMatricula = async (MatriculaGUID: string): Promise<TarefaAcademicaMatricula[]> => {
    console.log("🟢 TarefaAcademicaMatriculaDAO.findByMatricula()");

    const SQL = "SELECT * FROM tarefaacademica_matricula WHERE MatriculaGUID = ?;";
    const params = [MatriculaGUID];

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaMatriculaRow[]>(SQL, params);

    return rows.map((row) => this.mapRowToEntity(row));
  };

  /**
   * Buscar atribuição específica (tarefa + aluno)
   */
  findByTarefaAndMatricula = async (
    TarefaGUID: string,
    MatriculaGUID: string
  ): Promise<TarefaAcademicaMatricula | null> => {
    console.log("🟢 TarefaAcademicaMatriculaDAO.findByTarefaAndMatricula()");

    const SQL = `
      SELECT * FROM tarefaacademica_matricula 
      WHERE TarefaGUID = ? AND MatriculaGUID = ?
      LIMIT 1;
    `;
    const params = [TarefaGUID, MatriculaGUID];

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaMatriculaRow[]>(SQL, params);

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(rows[0]);
  };

  /**
   * Atualizar status de conclusão da tarefa pelo aluno
   */
  update = async (
    TarefaMatriculaGUID: string,
    updates: Partial<Pick<
      TarefaAcademicaMatricula,
      "TarefaFeito" | "TarefaRealizacaoData" | "TarefaNota" | "TarefaAvaliadoEm" | "TarefaAvaliadoPorCPF"
    >>
  ): Promise<TarefaAcademicaMatricula | null> => {
    console.log("🟢 TarefaAcademicaMatriculaDAO.update()");

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.TarefaFeito !== undefined) {
      fields.push("TarefaFeito = ?");
      values.push(updates.TarefaFeito);

      // Auto-preencher TarefaRealizacaoData quando marcar como feito
      if (updates.TarefaFeito) {
        fields.push("TarefaRealizacaoData = CURRENT_TIMESTAMP");
      }
    }

    if (updates.TarefaNota !== undefined) {
      fields.push("TarefaNota = ?");
      values.push(updates.TarefaNota);
    }

    if (updates.TarefaAvaliadoEm !== undefined) {
      fields.push("TarefaAvaliadoEm = ?");
      values.push(updates.TarefaAvaliadoEm);
    }

    if (updates.TarefaAvaliadoPorCPF !== undefined) {
      fields.push("TarefaAvaliadoPorCPF = ?");
      values.push(updates.TarefaAvaliadoPorCPF);
    }

    if (fields.length === 0) {
      throw new Error("Nenhum campo para atualizar");
    }

    values.push(TarefaMatriculaGUID);

    const SQL = `
      UPDATE tarefaacademica_matricula 
      SET ${fields.join(", ")}, UpdatedAt = CURRENT_TIMESTAMP
      WHERE TarefaMatriculaGUID = ?;
    `;

    const pool = await this.#database.getPool();
    await pool.execute(SQL, values);

    // Retornar entidade atualizada
    const selectSQL = "SELECT * FROM tarefaacademica_matricula WHERE TarefaMatriculaGUID = ?;";
    const [rows] = await pool.execute<TarefaAcademicaMatriculaRow[]>(selectSQL, [TarefaMatriculaGUID]);

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(rows[0]);
  };

  /**
   * Busca atribuições com prazo vencido, sem entrega/checkbox e sem nota
   * ainda — usado pelo scheduler de nota automática (0) e pelo widget de
   * "avaliações pendentes" do professor. Considera o prazo por matrícula
   * (TarefaPrazoDataMatricula) quando existir, senão o prazo geral da tarefa.
   */
  findVencidasSemAvaliacao = async (agora: Date): Promise<TarefaVencidaSemAvaliacao[]> => {
    console.log("🟢 TarefaAcademicaMatriculaDAO.findVencidasSemAvaliacao()");

    const SQL = `
      SELECT tm.TarefaMatriculaGUID, tm.TarefaGUID, tm.MatriculaGUID, mat.UsuarioCPF
      FROM tarefaacademica_matricula tm
      INNER JOIN tarefaacademica t ON t.TarefaGUID = tm.TarefaGUID
      INNER JOIN matricula mat ON mat.MatriculaGUID = tm.MatriculaGUID
      WHERE tm.TarefaFeito = FALSE
        AND tm.TarefaNota IS NULL
        AND COALESCE(tm.TarefaPrazoDataMatricula, t.TarefaPrazoData) <= ?;
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [agora]);

    return rows as TarefaVencidaSemAvaliacao[];
  };

  /**
   * Excluir atribuição (remover tarefa de um aluno específico)
   */
  delete = async (TarefaMatriculaGUID: string): Promise<boolean> => {
    console.log("🟢 TarefaAcademicaMatriculaDAO.delete()");

    const SQL = "DELETE FROM tarefaacademica_matricula WHERE TarefaMatriculaGUID = ?;";
    const params = [TarefaMatriculaGUID];

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(SQL, params);

    return (result as any).affectedRows > 0;
  };

  /**
   * Excluir todas as atribuições de uma tarefa (remove tarefa de todos os alunos)
   */
  deleteByTarefa = async (TarefaGUID: string): Promise<number> => {
    console.log("🟢 TarefaAcademicaMatriculaDAO.deleteByTarefa()");

    const SQL = "DELETE FROM tarefaacademica_matricula WHERE TarefaGUID = ?;";
    const params = [TarefaGUID];

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(SQL, params);

    return (result as any).affectedRows;
  };

  /**
   * Converte row do MySQL para entidade
   */
  private mapRowToEntity(row: TarefaAcademicaMatriculaRow): TarefaAcademicaMatricula {
    const atribuicao = new TarefaAcademicaMatricula();
    atribuicao.TarefaMatriculaGUID = row.TarefaMatriculaGUID;
    atribuicao.TarefaGUID = row.TarefaGUID;
    atribuicao.MatriculaGUID = row.MatriculaGUID;
    atribuicao.TarefaPrazoDataMatricula = row.TarefaPrazoDataMatricula;
    atribuicao.TarefaFeito = Boolean(row.TarefaFeito);
    atribuicao.TarefaRealizacaoData = row.TarefaRealizacaoData;
    atribuicao.TarefaNota = row.TarefaNota;
    atribuicao.TarefaAvaliadoEm = row.TarefaAvaliadoEm;
    atribuicao.TarefaAvaliadoPorCPF = row.TarefaAvaliadoPorCPF;
    atribuicao.CreatedAt = row.CreatedAt;
    atribuicao.UpdatedAt = row.UpdatedAt;
    return atribuicao;
  }
}
