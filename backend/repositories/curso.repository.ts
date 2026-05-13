import Curso from "../entities/curso.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

/**
 * Filtros para consulta de cursos
 */
export interface CursoFilters {
  EscolaGUID?: string;
  CursoStatus?: 'Ativo' | 'Inativo';
}

/**
 * Interface de mapeamento para rows do MySQL
 */
interface CursoRow extends RowDataPacket {
  CursoGUID: string;
  EscolaGUID: string;
  CursoNome: string;
  CursoStatus: 'Ativo' | 'Inativo';
  CursoCreatedAt: Date;
  CursoUpdatedAt: Date;
}

/**
 * Repository (DAO) para a entidade Curso
 * 
 * Responsabilidades:
 * - CRUD completo na tabela `curso`
 * - Conversão entre rows do MySQL e objetos Curso
 * - Consultas especializadas (findByEscolaAndNome, etc.)
 */
export class CursoDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    this.#database = database;
  }

  /**
   * Cria um novo curso no banco
   */
  async create(curso: Curso): Promise<Curso> {
    const query = `
      INSERT INTO curso (
        CursoGUID,
        EscolaGUID,
        CursoNome,
        CursoStatus,
        CursoCreatedAt,
        CursoUpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      curso.CursoGUID,
      curso.EscolaGUID,
      curso.CursoNome,
      curso.CursoStatus,
      curso.CursoCreatedAt,
      curso.CursoUpdatedAt,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(query, params);
    return curso;
  }

  /**
   * Lista cursos com filtros opcionais
   */
  async findAll(filters?: CursoFilters): Promise<Curso[]> {
    let query = `SELECT * FROM curso WHERE 1=1`;
    const params: any[] = [];

    if (filters?.EscolaGUID) {
      query += ` AND EscolaGUID = ?`;
      params.push(filters.EscolaGUID);
    }

    if (filters?.CursoStatus) {
      query += ` AND CursoStatus = ?`;
      params.push(filters.CursoStatus);
    }

    query += ` ORDER BY CursoNome ASC`;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, params);
    return this.mapRows(rows as CursoRow[]);
  }

  /**
   * Busca curso por GUID
   */
  async findById(cursoGUID: string): Promise<Curso | null> {
    const query = `SELECT * FROM curso WHERE CursoGUID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [cursoGUID]);

    if (!rows || (rows as CursoRow[]).length === 0) {
      return null;
    }

    return this.mapRows(rows as CursoRow[])[0];
  }

  /**
   * Busca curso por escola e nome (validação de duplicidade)
   */
  async findByEscolaAndNome(
    escolaGUID: string,
    cursoNome: string
  ): Promise<Curso | null> {
    const query = `
      SELECT * FROM curso 
      WHERE EscolaGUID = ? 
        AND CursoNome = ? 
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [
      escolaGUID,
      cursoNome,
    ]);

    if (!rows || (rows as CursoRow[]).length === 0) {
      return null;
    }

    return this.mapRows(rows as CursoRow[])[0];
  }

  /**
   * Atualiza curso (parcial)
   */
  async update(
    cursoGUID: string,
    updates: Partial<Omit<Curso, 'CursoGUID' | 'EscolaGUID' | 'CursoCreatedAt'>>
  ): Promise<Curso | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.CursoNome !== undefined) {
      fields.push('CursoNome = ?');
      params.push(updates.CursoNome);
    }

    if (updates.CursoStatus !== undefined) {
      fields.push('CursoStatus = ?');
      params.push(updates.CursoStatus);
    }

    // Sempre atualiza UpdatedAt
    fields.push('CursoUpdatedAt = ?');
    params.push(new Date());

    if (fields.length === 1) {
      // Nenhum campo além de UpdatedAt
      return this.findById(cursoGUID);
    }

    params.push(cursoGUID);

    const query = `
      UPDATE curso 
      SET ${fields.join(', ')} 
      WHERE CursoGUID = ?
    `;

    const pool = await this.#database.getPool();
    await pool.execute(query, params);
    return this.findById(cursoGUID);
  }

  /**
   * Soft delete: muda status para Inativo
   */
  async delete(cursoGUID: string): Promise<boolean> {
    const query = `
      UPDATE curso 
      SET CursoStatus = 'Inativo', 
          CursoUpdatedAt = ? 
      WHERE CursoGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(query, [
      new Date(),
      cursoGUID,
    ]);

    return (result as ResultSetHeader).affectedRows > 0;
  }

  /**
   * Conta cursos de uma escola
   */
  async countByEscola(escolaGUID: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as total 
      FROM curso 
      WHERE EscolaGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [
      escolaGUID,
    ]);

    return (rows as RowDataPacket[])[0]?.total || 0;
  }

  /**
   * Converte rows do MySQL em entidades Curso
   */
  private mapRows(rows: CursoRow[]): Curso[] {
    return rows.map((row) => {
      const curso = new Curso();
      curso.CursoGUID = row.CursoGUID;
      curso.EscolaGUID = row.EscolaGUID;
      curso.CursoNome = row.CursoNome;
      curso.CursoStatus = row.CursoStatus;
      curso.CursoCreatedAt = row.CursoCreatedAt;
      curso.CursoUpdatedAt = row.CursoUpdatedAt;
      return curso;
    });
  }
}
