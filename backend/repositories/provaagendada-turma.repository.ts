/**
 * Repository para ProvaAgendadaTurma (Tabela Intermediária N:N)
 * 
 * Responsabilidades:
 * - Gerenciar atribuições de provas a turmas
 * - Criar, consultar e deletar relacionamentos N:N
 * - Buscar turmas de uma prova e provas de uma turma
 */

import { RowDataPacket, ResultSetHeader } from "mysql2";
import MysqlDatabase from "../database/MysqlDatabase";
import ProvaAgendadaTurma from "../entities/provaagendada-turma.model";
import ErrorResponse from "../utils/ErrorResponse";

export default class ProvaAgendadaTurmaDAO {
  private db: MysqlDatabase;

  constructor(db: MysqlDatabase) {
    this.db = db;
  }

  /**
   * Cria uma atribuição (prova → turma)
   */
  async create(atribuicao: ProvaAgendadaTurma): Promise<ProvaAgendadaTurma> {
    const sql = `
      INSERT INTO provaagendada_turma (
        ProvaAgendadaTurmaGUID,
        ProvaAgendadaGUID,
        TurmaGUID,
        ProvaDataTurma
      ) VALUES (?, ?, ?, ?)
    `;

    const params = [
      atribuicao.ProvaAgendadaTurmaGUID,
      atribuicao.ProvaAgendadaGUID,
      atribuicao.TurmaGUID,
      atribuicao.ProvaDataTurma
    ];

    const pool = await this.db.getPool();
    const [result] = await pool.execute<ResultSetHeader>(sql, params);

    if (result.affectedRows === 0) {
      throw new ErrorResponse(500, 'Erro ao criar atribuição de prova');
    }

    return atribuicao;
  }

  /**
   * Cria múltiplas atribuições em batch (otimizado)
   */
  async createBatch(atribuicoes: ProvaAgendadaTurma[]): Promise<number> {
    if (atribuicoes.length === 0) {
      return 0;
    }

    const sql = `
      INSERT INTO provaagendada_turma (
        ProvaAgendadaTurmaGUID,
        ProvaAgendadaGUID,
        TurmaGUID,
        ProvaDataTurma
      ) VALUES ?
    `;

    const values = atribuicoes.map(a => [
      a.ProvaAgendadaTurmaGUID,
      a.ProvaAgendadaGUID,
      a.TurmaGUID,
      a.ProvaDataTurma
    ]);

    const pool = await this.db.getPool();
    const [result] = await pool.query<ResultSetHeader>(sql, [values]);

    return result.affectedRows;
  }

  /**
   * Busca todas as atribuições de uma prova (quais turmas têm essa prova)
   */
  async findByProva(ProvaAgendadaGUID: string): Promise<ProvaAgendadaTurma[]> {
    const sql = `
      SELECT * FROM provaagendada_turma
      WHERE ProvaAgendadaGUID = ?
      ORDER BY CreatedAt ASC
    `;

    const pool = await this.db.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(sql, [ProvaAgendadaGUID]);

    return rows.map((row) => this.mapRowToEntity(row));
  }

  /**
   * Busca todas as provas de uma turma
   */
  async findByTurma(TurmaGUID: string): Promise<ProvaAgendadaTurma[]> {
    const sql = `
      SELECT * FROM provaagendada_turma
      WHERE TurmaGUID = ?
      ORDER BY CreatedAt ASC
    `;

    const pool = await this.db.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(sql, [TurmaGUID]);

    return rows.map((row) => this.mapRowToEntity(row));
  }

  /**
   * Busca uma atribuição específica (prova + turma)
   */
  async findByProvaAndTurma(ProvaAgendadaGUID: string, TurmaGUID: string): Promise<ProvaAgendadaTurma | null> {
    const sql = `
      SELECT * FROM provaagendada_turma
      WHERE ProvaAgendadaGUID = ? AND TurmaGUID = ?
      LIMIT 1
    `;

    const pool = await this.db.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      sql,
      [ProvaAgendadaGUID, TurmaGUID]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(rows[0]);
  }

  /**
   * Deleta uma atribuição específica
   */
  async delete(ProvaAgendadaTurmaGUID: string): Promise<boolean> {
    const sql = `DELETE FROM provaagendada_turma WHERE ProvaAgendadaTurmaGUID = ?`;

    const pool = await this.db.getPool();
    const [result] = await pool.execute<ResultSetHeader>(sql, [ProvaAgendadaTurmaGUID]);

    return result.affectedRows > 0;
  }

  /**
   * Deleta todas as atribuições de uma prova
   */
  async deleteByProva(ProvaAgendadaGUID: string): Promise<number> {
    const sql = `DELETE FROM provaagendada_turma WHERE ProvaAgendadaGUID = ?`;

    const pool = await this.db.getPool();
    const [result] = await pool.execute<ResultSetHeader>(sql, [ProvaAgendadaGUID]);

    return result.affectedRows;
  }

  /**
   * Mapeia linha do banco para entidade
   */
  private mapRowToEntity(row: RowDataPacket): ProvaAgendadaTurma {
    const atribuicao = new ProvaAgendadaTurma();
    atribuicao.ProvaAgendadaTurmaGUID = row.ProvaAgendadaTurmaGUID;
    atribuicao.ProvaAgendadaGUID = row.ProvaAgendadaGUID;
    atribuicao.TurmaGUID = row.TurmaGUID;
    atribuicao.ProvaDataTurma = row.ProvaDataTurma ? new Date(row.ProvaDataTurma) : null;
    atribuicao.CreatedAt = row.CreatedAt ? new Date(row.CreatedAt) : undefined;
    return atribuicao;
  }
}
