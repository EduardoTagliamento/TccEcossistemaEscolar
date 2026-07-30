import TarefaAcademicaQuestao from "../entities/tarefaacademica-questao.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface TarefaAcademicaQuestaoRow extends RowDataPacket {
  QuestaoGUID: string;
  TarefaGUID: string;
  QuestaoEnunciado: string;
  QuestaoTipo: "objetiva" | "discursiva";
  QuestaoPontosMaximos: number;
  QuestaoExplicacao: string | null;
  QuestaoOrdem: number;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface AnexoQuestaoResumo {
  AnexoGUID: string;
  AnexoNomeOriginal: string | null;
  AnexoTamanho: number | null;
  /** URL pública (R2) — permite montar preview de imagem direto no frontend, sem passar pelo download autenticado. */
  AnexoCaminho: string;
  CreatedAt: Date | null;
}

/**
 * Repository (DAO) para a entidade TarefaAcademicaQuestao — questões de uma
 * tarefa do tipo "lista" — e para o pivot tarefaacademica_questao_anexo
 * (sem entidade própria, tratado direto em SQL, mesmo padrão de
 * relacaoanexostarefa em TarefaAcademicaDAO).
 */
export class TarefaAcademicaQuestaoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  TarefaAcademicaQuestaoDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (questao: TarefaAcademicaQuestao): Promise<TarefaAcademicaQuestao> => {
    console.log("🟢 TarefaAcademicaQuestaoDAO.create()");

    const SQL = `
      INSERT INTO tarefaacademica_questao
      (QuestaoGUID, TarefaGUID, QuestaoEnunciado, QuestaoTipo, QuestaoPontosMaximos, QuestaoExplicacao, QuestaoOrdem)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      questao.QuestaoGUID,
      questao.TarefaGUID,
      questao.QuestaoEnunciado,
      questao.QuestaoTipo,
      questao.QuestaoPontosMaximos,
      questao.QuestaoExplicacao,
      questao.QuestaoOrdem,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return questao;
  };

  createBatch = async (questoes: TarefaAcademicaQuestao[]): Promise<TarefaAcademicaQuestao[]> => {
    console.log(`🟢 TarefaAcademicaQuestaoDAO.createBatch() - ${questoes.length} questões`);

    if (questoes.length === 0) return [];

    const SQL = `
      INSERT INTO tarefaacademica_questao
      (QuestaoGUID, TarefaGUID, QuestaoEnunciado, QuestaoTipo, QuestaoPontosMaximos, QuestaoExplicacao, QuestaoOrdem)
      VALUES ?;
    `;
    const values = questoes.map((q) => [
      q.QuestaoGUID,
      q.TarefaGUID,
      q.QuestaoEnunciado,
      q.QuestaoTipo,
      q.QuestaoPontosMaximos,
      q.QuestaoExplicacao,
      q.QuestaoOrdem,
    ]);

    const pool = await this.#database.getPool();
    await pool.query(SQL, [values]);

    return questoes;
  };

  findByTarefa = async (TarefaGUID: string): Promise<TarefaAcademicaQuestao[]> => {
    console.log("🟢 TarefaAcademicaQuestaoDAO.findByTarefa()");

    const SQL = "SELECT * FROM tarefaacademica_questao WHERE TarefaGUID = ? ORDER BY QuestaoOrdem ASC;";
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaQuestaoRow[]>(SQL, [TarefaGUID]);

    return rows.map((row) => this.mapRowToQuestao(row));
  };

  findById = async (QuestaoGUID: string): Promise<TarefaAcademicaQuestao | null> => {
    console.log("🟢 TarefaAcademicaQuestaoDAO.findById()");

    const SQL = "SELECT * FROM tarefaacademica_questao WHERE QuestaoGUID = ? LIMIT 1;";
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaQuestaoRow[]>(SQL, [QuestaoGUID]);

    if (rows.length === 0) return null;
    return this.mapRowToQuestao(rows[0]);
  };

  update = async (
    QuestaoGUID: string,
    updates: Partial<Pick<
      TarefaAcademicaQuestao,
      "QuestaoEnunciado" | "QuestaoTipo" | "QuestaoPontosMaximos" | "QuestaoExplicacao" | "QuestaoOrdem"
    >>
  ): Promise<TarefaAcademicaQuestao | null> => {
    console.log("🟢 TarefaAcademicaQuestaoDAO.update()");

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.QuestaoEnunciado !== undefined) {
      fields.push("QuestaoEnunciado = ?");
      values.push(updates.QuestaoEnunciado);
    }
    if (updates.QuestaoTipo !== undefined) {
      fields.push("QuestaoTipo = ?");
      values.push(updates.QuestaoTipo);
    }
    if (updates.QuestaoPontosMaximos !== undefined) {
      fields.push("QuestaoPontosMaximos = ?");
      values.push(updates.QuestaoPontosMaximos);
    }
    if (updates.QuestaoExplicacao !== undefined) {
      fields.push("QuestaoExplicacao = ?");
      values.push(updates.QuestaoExplicacao);
    }
    if (updates.QuestaoOrdem !== undefined) {
      fields.push("QuestaoOrdem = ?");
      values.push(updates.QuestaoOrdem);
    }

    if (fields.length === 0) {
      return this.findById(QuestaoGUID);
    }

    values.push(QuestaoGUID);

    const SQL = `UPDATE tarefaacademica_questao SET ${fields.join(", ")} WHERE QuestaoGUID = ?;`;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, values);

    return this.findById(QuestaoGUID);
  };

  delete = async (QuestaoGUID: string): Promise<boolean> => {
    console.log("🟢 TarefaAcademicaQuestaoDAO.delete()");

    const SQL = "DELETE FROM tarefaacademica_questao WHERE QuestaoGUID = ?;";
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(SQL, [QuestaoGUID]);

    return result.affectedRows > 0;
  };

  reordenar = async (ordens: Array<{ QuestaoGUID: string; QuestaoOrdem: number }>): Promise<void> => {
    console.log("🟢 TarefaAcademicaQuestaoDAO.reordenar()");

    const pool = await this.#database.getPool();
    await Promise.all(
      ordens.map(({ QuestaoGUID, QuestaoOrdem }) =>
        pool.execute("UPDATE tarefaacademica_questao SET QuestaoOrdem = ? WHERE QuestaoGUID = ?;", [
          QuestaoOrdem,
          QuestaoGUID,
        ])
      )
    );
  };

  vincularAnexo = async (QuestaoGUID: string, AnexoGUID: string): Promise<void> => {
    console.log("🟢 TarefaAcademicaQuestaoDAO.vincularAnexo()");

    const SQL = `
      INSERT INTO tarefaacademica_questao_anexo (QuestaoAnexoGUID, QuestaoGUID, AnexoGUID)
      VALUES (UUID(), ?, ?);
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [QuestaoGUID, AnexoGUID]);
  };

  desvincularAnexo = async (QuestaoGUID: string, AnexoGUID: string): Promise<void> => {
    console.log("🟢 TarefaAcademicaQuestaoDAO.desvincularAnexo()");

    const SQL = "DELETE FROM tarefaacademica_questao_anexo WHERE QuestaoGUID = ? AND AnexoGUID = ?;";
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [QuestaoGUID, AnexoGUID]);
  };

  /**
   * Anexos por questão, em lote (evita N+1 ao montar a lista de questões de
   * uma tarefa lista inteira).
   */
  buscarAnexosPorQuestoes = async (
    questaoGUIDs: string[]
  ): Promise<Map<string, AnexoQuestaoResumo[]>> => {
    console.log("🟢 TarefaAcademicaQuestaoDAO.buscarAnexosPorQuestoes()");

    const unicos = Array.from(new Set(questaoGUIDs));
    const mapa = new Map<string, AnexoQuestaoResumo[]>();
    if (unicos.length === 0) return mapa;

    const placeholders = unicos.map(() => "?").join(", ");
    const SQL = `
      SELECT qa.QuestaoGUID, a.AnexoGUID, a.AnexoNomeOriginal, a.AnexoTamanho, a.AnexoCaminho, a.CreatedAt
      FROM tarefaacademica_questao_anexo qa
      INNER JOIN anexo a ON a.AnexoGUID = qa.AnexoGUID
      WHERE qa.QuestaoGUID IN (${placeholders})
      ORDER BY a.CreatedAt ASC;
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(SQL, unicos);
    for (const row of rows as any[]) {
      const lista = mapa.get(row.QuestaoGUID) ?? [];
      lista.push({
        AnexoGUID: row.AnexoGUID,
        AnexoNomeOriginal: row.AnexoNomeOriginal,
        AnexoTamanho: row.AnexoTamanho,
        AnexoCaminho: row.AnexoCaminho,
        CreatedAt: row.CreatedAt ?? null,
      });
      mapa.set(row.QuestaoGUID, lista);
    }
    return mapa;
  };

  private mapRowToQuestao(row: TarefaAcademicaQuestaoRow): TarefaAcademicaQuestao {
    const questao = new TarefaAcademicaQuestao();
    questao.QuestaoGUID = row.QuestaoGUID;
    questao.TarefaGUID = row.TarefaGUID;
    questao.QuestaoEnunciado = row.QuestaoEnunciado;
    questao.QuestaoTipo = row.QuestaoTipo;
    questao.QuestaoPontosMaximos = row.QuestaoPontosMaximos;
    questao.QuestaoExplicacao = row.QuestaoExplicacao;
    questao.QuestaoOrdem = row.QuestaoOrdem;
    questao.CreatedAt = row.CreatedAt;
    questao.UpdatedAt = row.UpdatedAt;
    return questao;
  }
}
