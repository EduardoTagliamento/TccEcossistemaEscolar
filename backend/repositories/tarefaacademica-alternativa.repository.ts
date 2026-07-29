import TarefaAcademicaAlternativa from "../entities/tarefaacademica-alternativa.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface TarefaAcademicaAlternativaRow extends RowDataPacket {
  AlternativaGUID: string;
  QuestaoGUID: string;
  AlternativaTexto: string;
  AlternativaCorreta: number | boolean;
  AlternativaPontos: number;
  AlternativaOrdem: number;
  CreatedAt: Date;
}

/**
 * Repository (DAO) para a entidade TarefaAcademicaAlternativa — alternativas
 * de uma questão objetiva de tarefa "lista".
 */
export class TarefaAcademicaAlternativaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  TarefaAcademicaAlternativaDAO.constructor()");
    this.#database = databaseInstance;
  }

  createBatch = async (alternativas: TarefaAcademicaAlternativa[]): Promise<TarefaAcademicaAlternativa[]> => {
    console.log(`🟢 TarefaAcademicaAlternativaDAO.createBatch() - ${alternativas.length} alternativas`);

    if (alternativas.length === 0) return [];

    const SQL = `
      INSERT INTO tarefaacademica_alternativa
      (AlternativaGUID, QuestaoGUID, AlternativaTexto, AlternativaCorreta, AlternativaPontos, AlternativaOrdem)
      VALUES ?;
    `;
    const values = alternativas.map((a) => [
      a.AlternativaGUID,
      a.QuestaoGUID,
      a.AlternativaTexto,
      a.AlternativaCorreta,
      a.AlternativaPontos,
      a.AlternativaOrdem,
    ]);

    const pool = await this.#database.getPool();
    await pool.query(SQL, [values]);

    return alternativas;
  };

  findByQuestao = async (QuestaoGUID: string): Promise<TarefaAcademicaAlternativa[]> => {
    console.log("🟢 TarefaAcademicaAlternativaDAO.findByQuestao()");

    const SQL = "SELECT * FROM tarefaacademica_alternativa WHERE QuestaoGUID = ? ORDER BY AlternativaOrdem ASC;";
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaAlternativaRow[]>(SQL, [QuestaoGUID]);

    return rows.map((row) => this.mapRowToAlternativa(row));
  };

  /**
   * Alternativas por questão, em lote — evita N+1 ao montar a lista de
   * questões de uma tarefa lista inteira.
   */
  findByQuestoes = async (questaoGUIDs: string[]): Promise<Map<string, TarefaAcademicaAlternativa[]>> => {
    console.log("🟢 TarefaAcademicaAlternativaDAO.findByQuestoes()");

    const unicos = Array.from(new Set(questaoGUIDs));
    const mapa = new Map<string, TarefaAcademicaAlternativa[]>();
    if (unicos.length === 0) return mapa;

    const placeholders = unicos.map(() => "?").join(", ");
    const SQL = `
      SELECT * FROM tarefaacademica_alternativa
      WHERE QuestaoGUID IN (${placeholders})
      ORDER BY AlternativaOrdem ASC;
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaAlternativaRow[]>(SQL, unicos);

    for (const row of rows) {
      const alternativa = this.mapRowToAlternativa(row);
      const lista = mapa.get(alternativa.QuestaoGUID) ?? [];
      lista.push(alternativa);
      mapa.set(alternativa.QuestaoGUID, lista);
    }
    return mapa;
  };

  findById = async (AlternativaGUID: string): Promise<TarefaAcademicaAlternativa | null> => {
    console.log("🟢 TarefaAcademicaAlternativaDAO.findById()");

    const SQL = "SELECT * FROM tarefaacademica_alternativa WHERE AlternativaGUID = ? LIMIT 1;";
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaAlternativaRow[]>(SQL, [AlternativaGUID]);

    if (rows.length === 0) return null;
    return this.mapRowToAlternativa(rows[0]);
  };

  deleteByQuestao = async (QuestaoGUID: string): Promise<void> => {
    console.log("🟢 TarefaAcademicaAlternativaDAO.deleteByQuestao()");

    const SQL = "DELETE FROM tarefaacademica_alternativa WHERE QuestaoGUID = ?;";
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [QuestaoGUID]);
  };

  update = async (
    AlternativaGUID: string,
    updates: Partial<Pick<TarefaAcademicaAlternativa, "AlternativaTexto" | "AlternativaCorreta" | "AlternativaPontos" | "AlternativaOrdem">>
  ): Promise<TarefaAcademicaAlternativa | null> => {
    console.log("🟢 TarefaAcademicaAlternativaDAO.update()");

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.AlternativaTexto !== undefined) {
      fields.push("AlternativaTexto = ?");
      values.push(updates.AlternativaTexto);
    }
    if (updates.AlternativaCorreta !== undefined) {
      fields.push("AlternativaCorreta = ?");
      values.push(updates.AlternativaCorreta);
    }
    if (updates.AlternativaPontos !== undefined) {
      fields.push("AlternativaPontos = ?");
      values.push(updates.AlternativaPontos);
    }
    if (updates.AlternativaOrdem !== undefined) {
      fields.push("AlternativaOrdem = ?");
      values.push(updates.AlternativaOrdem);
    }

    if (fields.length === 0) {
      return this.findById(AlternativaGUID);
    }

    values.push(AlternativaGUID);

    const SQL = `UPDATE tarefaacademica_alternativa SET ${fields.join(", ")} WHERE AlternativaGUID = ?;`;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, values);

    return this.findById(AlternativaGUID);
  };

  delete = async (AlternativaGUID: string): Promise<boolean> => {
    console.log("🟢 TarefaAcademicaAlternativaDAO.delete()");

    const SQL = "DELETE FROM tarefaacademica_alternativa WHERE AlternativaGUID = ?;";
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(SQL, [AlternativaGUID]);

    return result.affectedRows > 0;
  };

  private mapRowToAlternativa(row: TarefaAcademicaAlternativaRow): TarefaAcademicaAlternativa {
    const alternativa = new TarefaAcademicaAlternativa();
    alternativa.AlternativaGUID = row.AlternativaGUID;
    alternativa.QuestaoGUID = row.QuestaoGUID;
    alternativa.AlternativaTexto = row.AlternativaTexto;
    alternativa.AlternativaCorreta = Boolean(row.AlternativaCorreta);
    alternativa.AlternativaPontos = row.AlternativaPontos;
    alternativa.AlternativaOrdem = row.AlternativaOrdem;
    alternativa.CreatedAt = row.CreatedAt;
    return alternativa;
  }
}
