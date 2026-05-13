import Turma from "../entities/turma.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

/**
 * Filtros para consulta de turmas
 */
export interface TurmaFilters {
  EscolaGUID?: string;
  CursoGUID?: string;
  TurmaIsTecnico?: boolean;
  TurmaStatus?: 'Ativa' | 'Inativa' | 'Encerrada';
}

/**
 * Interface de mapeamento para rows do MySQL
 */
interface TurmaRow extends RowDataPacket {
  TurmaGUID: string;
  EscolaGUID: string;
  TurmaSerie: string;
  TurmaNome: string;
  TurmaIsTecnico: boolean;
  CursoGUID: string | null;
  TurmaStatus: 'Ativa' | 'Inativa' | 'Encerrada';
  TurmaCreatedAt: Date;
  TurmaUpdatedAt: Date;
}

/**
 * Repository (DAO) para a entidade Turma
 * 
 * Responsabilidades:
 * - CRUD completo na tabela `turma`
 * - Conversão entre rows do MySQL e objetos Turma
 * - Consultas especializadas (findByEscolaSerieNome, findByEscolaAndCurso, etc.)
 */
export class TurmaDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    this.#database = database;
  }

  /**
   * Cria uma nova turma no banco
   */
  async create(turma: Turma): Promise<Turma> {
    const query = `
      INSERT INTO turma (
        TurmaGUID,
        EscolaGUID,
        TurmaSerie,
        TurmaNome,
        TurmaIsTecnico,
        CursoGUID,
        TurmaStatus,
        TurmaCreatedAt,
        TurmaUpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      turma.TurmaGUID,
      turma.EscolaGUID,
      turma.TurmaSerie,
      turma.TurmaNome,
      turma.TurmaIsTecnico,
      turma.CursoGUID,
      turma.TurmaStatus,
      turma.TurmaCreatedAt,
      turma.TurmaUpdatedAt,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(query, params);
    return turma;
  }

  /**
   * Lista turmas com filtros opcionais
   */
  async findAll(filters?: TurmaFilters): Promise<Turma[]> {
    let query = `SELECT * FROM turma WHERE 1=1`;
    const params: any[] = [];

    if (filters?.EscolaGUID) {
      query += ` AND EscolaGUID = ?`;
      params.push(filters.EscolaGUID);
    }

    if (filters?.CursoGUID) {
      query += ` AND CursoGUID = ?`;
      params.push(filters.CursoGUID);
    }

    if (filters?.TurmaIsTecnico !== undefined) {
      query += ` AND TurmaIsTecnico = ?`;
      params.push(filters.TurmaIsTecnico);
    }

    if (filters?.TurmaStatus) {
      query += ` AND TurmaStatus = ?`;
      params.push(filters.TurmaStatus);
    }

    query += ` ORDER BY TurmaSerie ASC, TurmaNome ASC`;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, params);
    return this.mapRows(rows as TurmaRow[]);
  }

  /**
   * Busca turma por GUID
   */
  async findById(turmaGUID: string): Promise<Turma | null> {
    const query = `SELECT * FROM turma WHERE TurmaGUID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [turmaGUID]);

    if (!rows || (rows as TurmaRow[]).length === 0) {
      return null;
    }

    return this.mapRows(rows as TurmaRow[])[0];
  }

  /**
   * Busca turma por escola, série e nome (validação de duplicidade)
   * UNIQUE KEY composto: (EscolaGUID, TurmaSerie, TurmaNome)
   */
  async findByEscolaSerieNome(
    escolaGUID: string,
    serie: string,
    nome: string
  ): Promise<Turma | null> {
    const query = `
      SELECT * FROM turma 
      WHERE EscolaGUID = ? 
        AND TurmaSerie = ? 
        AND TurmaNome = ? 
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [escolaGUID, serie, nome]);

    if (!rows || (rows as TurmaRow[]).length === 0) {
      return null;
    }

    return this.mapRows(rows as TurmaRow[])[0];
  }

  /**
   * Busca turmas por escola e curso
   */
  async findByEscolaAndCurso(
    escolaGUID: string,
    cursoGUID: string
  ): Promise<Turma[]> {
    const query = `
      SELECT * FROM turma 
      WHERE EscolaGUID = ? 
        AND CursoGUID = ? 
      ORDER BY TurmaSerie ASC, TurmaNome ASC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [escolaGUID, cursoGUID]);

    return this.mapRows(rows as TurmaRow[]);
  }

  /**
   * Atualiza turma (parcial)
   */
  async update(
    turmaGUID: string,
    updates: Partial<Omit<Turma, 'TurmaGUID' | 'EscolaGUID' | 'TurmaCreatedAt'>>
  ): Promise<Turma | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.TurmaSerie !== undefined) {
      fields.push('TurmaSerie = ?');
      params.push(updates.TurmaSerie);
    }

    if (updates.TurmaNome !== undefined) {
      fields.push('TurmaNome = ?');
      params.push(updates.TurmaNome);
    }

    if (updates.TurmaIsTecnico !== undefined) {
      fields.push('TurmaIsTecnico = ?');
      params.push(updates.TurmaIsTecnico);
    }

    if (updates.CursoGUID !== undefined) {
      fields.push('CursoGUID = ?');
      params.push(updates.CursoGUID);
    }

    if (updates.TurmaStatus !== undefined) {
      fields.push('TurmaStatus = ?');
      params.push(updates.TurmaStatus);
    }

    // Sempre atualiza UpdatedAt
    fields.push('TurmaUpdatedAt = ?');
    params.push(new Date());

    if (fields.length === 1) {
      // Nenhum campo além de UpdatedAt
      return this.findById(turmaGUID);
    }

    params.push(turmaGUID);

    const query = `
      UPDATE turma 
      SET ${fields.join(', ')} 
      WHERE TurmaGUID = ?
    `;

    const pool = await this.#database.getPool();
    await pool.execute(query, params);
    return this.findById(turmaGUID);
  }

  /**
   * Soft delete: muda status para Inativa
   */
  async delete(turmaGUID: string): Promise<boolean> {
    const query = `
      UPDATE turma 
      SET TurmaStatus = 'Inativa', 
          TurmaUpdatedAt = ? 
      WHERE TurmaGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(query, [new Date(), turmaGUID]);

    return (result as ResultSetHeader).affectedRows > 0;
  }

  /**
   * Conta turmas de uma escola
   */
  async countByEscola(escolaGUID: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as total 
      FROM turma 
      WHERE EscolaGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [escolaGUID]);

    return (rows as RowDataPacket[])[0]?.total || 0;
  }

  /**
   * Converte rows do MySQL em entidades Turma
   */
  private mapRows(rows: TurmaRow[]): Turma[] {
    return rows.map((row) => {
      const turma = new Turma();
      turma.TurmaGUID = row.TurmaGUID;
      turma.EscolaGUID = row.EscolaGUID;
      turma.TurmaSerie = row.TurmaSerie;
      turma.TurmaNome = row.TurmaNome;
      turma.TurmaIsTecnico = Boolean(row.TurmaIsTecnico);
      turma.CursoGUID = row.CursoGUID;
      turma.TurmaStatus = row.TurmaStatus;
      turma.TurmaCreatedAt = row.TurmaCreatedAt;
      turma.TurmaUpdatedAt = row.TurmaUpdatedAt;
      return turma;
    });
  }
}
