import { RowDataPacket, ResultSetHeader } from "mysql2";
import MysqlDatabase from "../database/MysqlDatabase";
import ConteudoTurma from "../entities/conteudoturma.model";

export default class ConteudoTurmaDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    this.#database = database;
  }

  async createBatch(atribuicoes: ConteudoTurma[]): Promise<number> {
    if (atribuicoes.length === 0) {
      return 0;
    }

    const sql = `
      INSERT INTO conteudoturma (ConteudoTurmaGUID, ConteudoGUID, TurmaGUID, ConteudoDataPublicacaoTurma)
      VALUES ?
    `;
    const values = atribuicoes.map((a) => [
      a.ConteudoTurmaGUID,
      a.ConteudoGUID,
      a.TurmaGUID,
      a.ConteudoDataPublicacaoTurma,
    ]);

    const pool = await this.#database.getPool();
    const [result] = await pool.query<ResultSetHeader>(sql, [values]);

    return result.affectedRows;
  }

  async findByConteudo(conteudoGUID: string): Promise<ConteudoTurma[]> {
    const sql = `SELECT * FROM conteudoturma WHERE ConteudoGUID = ? ORDER BY CreatedAt ASC`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(sql, [conteudoGUID]);

    return rows.map((row) => this.mapRowToEntity(row));
  }

  async findByTurma(turmaGUID: string): Promise<ConteudoTurma[]> {
    const sql = `SELECT * FROM conteudoturma WHERE TurmaGUID = ? ORDER BY CreatedAt ASC`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(sql, [turmaGUID]);

    return rows.map((row) => this.mapRowToEntity(row));
  }

  async deleteByConteudo(conteudoGUID: string): Promise<number> {
    const sql = `DELETE FROM conteudoturma WHERE ConteudoGUID = ?`;
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(sql, [conteudoGUID]);

    return result.affectedRows;
  }

  private mapRowToEntity(row: RowDataPacket): ConteudoTurma {
    const atribuicao = new ConteudoTurma();
    atribuicao.ConteudoTurmaGUID = row.ConteudoTurmaGUID;
    atribuicao.ConteudoGUID = row.ConteudoGUID;
    atribuicao.TurmaGUID = row.TurmaGUID;
    atribuicao.ConteudoDataPublicacaoTurma = row.ConteudoDataPublicacaoTurma
      ? new Date(row.ConteudoDataPublicacaoTurma)
      : null;
    atribuicao.CreatedAt = row.CreatedAt ? new Date(row.CreatedAt) : undefined;
    return atribuicao;
  }
}
