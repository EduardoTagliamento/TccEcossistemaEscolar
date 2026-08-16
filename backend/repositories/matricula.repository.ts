import Matricula from "../entities/matricula.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

/**
 * Filtros para consulta de matrículas
 */
export interface MatriculaFilters {
  UsuarioGUID?: string;
  TurmaGUID?: string;
  MatriculaStatus?: 'Ativa' | 'Transferida' | 'Concluida' | 'Cancelada';
  EscolaGUID?: string;
}

/**
 * Interface de mapeamento para rows do MySQL
 */
interface MatriculaRow extends RowDataPacket {
  MatriculaGUID: string;
  UsuarioGUID: string;
  TurmaGUID: string;
  MatriculaDataEntrada: Date;
  MatriculaDataSaida: Date | null;
  MatriculaStatus: 'Ativa' | 'Transferida' | 'Concluida' | 'Cancelada';
  MatriculaCreatedAt: Date;
  MatriculaUpdatedAt: Date;
}

/**
 * Repository (DAO) para a entidade Matrícula
 * 
 * Responsabilidades:
 * - CRUD completo na tabela `matricula`
 * - Conversão entre rows do MySQL e objetos Matricula
 * - Consultas especializadas (matrícula ativa, histórico, etc.)
 */
export class MatriculaDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    this.#database = database;
  }

  /**
   * Cria uma nova matrícula no banco
   */
  async create(matricula: Matricula): Promise<Matricula> {
    const query = `
      INSERT INTO matricula (
        MatriculaGUID,
        UsuarioGUID,
        TurmaGUID,
        MatriculaDataEntrada,
        MatriculaDataSaida,
        MatriculaStatus,
        MatriculaCreatedAt,
        MatriculaUpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      matricula.MatriculaGUID,
      matricula.UsuarioGUID,
      matricula.TurmaGUID,
      matricula.MatriculaDataEntrada,
      matricula.MatriculaDataSaida,
      matricula.MatriculaStatus,
      matricula.MatriculaCreatedAt,
      matricula.MatriculaUpdatedAt,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(query, params);
    return matricula;
  }

  /**
   * Lista matrículas com filtros opcionais
   */
  async findAll(filters?: MatriculaFilters): Promise<Matricula[]> {
    let query = `SELECT * FROM matricula WHERE 1=1`;
    const params: any[] = [];

    if (filters?.UsuarioGUID) {
      query += ` AND UsuarioGUID = ?`;
      params.push(filters.UsuarioGUID);
    }

    if (filters?.TurmaGUID) {
      query += ` AND TurmaGUID = ?`;
      params.push(filters.TurmaGUID);
    }

    if (filters?.MatriculaStatus) {
      query += ` AND MatriculaStatus = ?`;
      params.push(filters.MatriculaStatus);
    }

    if (filters?.EscolaGUID) {
      query += ` AND TurmaGUID IN (SELECT TurmaGUID FROM turma WHERE EscolaGUID = ?)`;
      params.push(filters.EscolaGUID);
    }

    query += ` ORDER BY MatriculaDataEntrada DESC`;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, params);
    return this.mapRows(rows as MatriculaRow[]);
  }

  /**
   * Busca matrícula por GUID (pode ser RA customizado ou UUID)
   */
  async findById(matriculaGUID: string): Promise<Matricula | null> {
    const query = `SELECT * FROM matricula WHERE MatriculaGUID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [matriculaGUID]);

    if (!rows || (rows as MatriculaRow[]).length === 0) {
      return null;
    }

    return this.mapRows(rows as MatriculaRow[])[0];
  }

  /**
   * Busca matrícula ATIVA do aluno DENTRO DE UMA ESCOLA específica.
   * A plataforma é multi-tenant — cada escola é independente, e um aluno
   * pode ter uma matrícula ativa por escola (ex.: ensino médio regular numa
   * escola + curso técnico noutra, simultaneamente). `matricula` não tem
   * `EscolaGUID` própria, só via `TurmaGUID -> turma.EscolaGUID`.
   */
  async findMatriculaAtivaByUsuarioEEscola(usuarioGUID: string, escolaGUID: string): Promise<Matricula | null> {
    const query = `
      SELECT m.* FROM matricula m
      INNER JOIN turma t ON t.TurmaGUID = m.TurmaGUID
      WHERE m.UsuarioGUID = ?
        AND t.EscolaGUID = ?
        AND m.MatriculaStatus = 'Ativa'
      ORDER BY m.MatriculaDataEntrada DESC
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [usuarioGUID, escolaGUID]);

    if (!rows || (rows as MatriculaRow[]).length === 0) {
      return null;
    }

    return this.mapRows(rows as MatriculaRow[])[0];
  }

  /**
   * Busca TODAS as matrículas ativas do aluno, uma por escola no máximo
   * (ver findMatriculaAtivaByUsuarioEEscola). Usado por indicadores
   * agregados (ex. badge de pendências) que precisam iterar todas as
   * escolas do aluno, não só a mais recente.
   */
  async findAllMatriculasAtivasByUsuario(usuarioGUID: string): Promise<Matricula[]> {
    const query = `
      SELECT * FROM matricula
      WHERE UsuarioGUID = ?
        AND MatriculaStatus = 'Ativa'
      ORDER BY MatriculaDataEntrada DESC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [usuarioGUID]);

    return this.mapRows(rows as MatriculaRow[]);
  }

  /**
   * Busca histórico completo de matrículas do aluno
   */
  async findHistoricoByUsuario(usuarioGUID: string): Promise<Matricula[]> {
    const query = `
      SELECT * FROM matricula
      WHERE UsuarioGUID = ?
      ORDER BY MatriculaDataEntrada DESC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [usuarioGUID]);

    return this.mapRows(rows as MatriculaRow[]);
  }

  /**
   * Busca matrículas de uma turma (listar alunos)
   */
  async findByTurma(turmaGUID: string): Promise<Matricula[]> {
    console.log(`🟢 MatriculaDAO.findByTurma() - TurmaGUID: ${turmaGUID}`);
    
    const query = `
      SELECT * FROM matricula 
      WHERE TurmaGUID = ?
      ORDER BY MatriculaDataEntrada DESC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [turmaGUID]);

    return this.mapRows(rows as MatriculaRow[]);
  }

  /**
   * Busca matrícula ativa do aluno em uma turma específica
   * Usado na validação de transferência
   */
  async findMatriculaAtivaByUsuarioETurma(
    usuarioGUID: string,
    turmaGUID: string
  ): Promise<Matricula | null> {
    const query = `
      SELECT * FROM matricula
      WHERE UsuarioGUID = ?
        AND TurmaGUID = ?
        AND MatriculaStatus = 'Ativa'
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [usuarioGUID, turmaGUID]);

    if (!rows || (rows as MatriculaRow[]).length === 0) {
      return null;
    }

    return this.mapRows(rows as MatriculaRow[])[0];
  }

  /**
   * Atualiza matrícula (parcial)
   */
  async update(
    matriculaGUID: string,
    updates: Partial<Omit<Matricula, 'MatriculaGUID' | 'UsuarioGUID' | 'TurmaGUID' | 'MatriculaCreatedAt'>>
  ): Promise<Matricula | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.MatriculaDataEntrada !== undefined) {
      fields.push('MatriculaDataEntrada = ?');
      params.push(updates.MatriculaDataEntrada);
    }

    if (updates.MatriculaDataSaida !== undefined) {
      fields.push('MatriculaDataSaida = ?');
      params.push(updates.MatriculaDataSaida);
    }

    if (updates.MatriculaStatus !== undefined) {
      fields.push('MatriculaStatus = ?');
      params.push(updates.MatriculaStatus);
    }

    // Sempre atualiza UpdatedAt
    fields.push('MatriculaUpdatedAt = ?');
    params.push(new Date());

    if (fields.length === 1) {
      // Nenhum campo além de UpdatedAt
      return this.findById(matriculaGUID);
    }

    params.push(matriculaGUID);

    const query = `
      UPDATE matricula 
      SET ${fields.join(', ')} 
      WHERE MatriculaGUID = ?
    `;

    const pool = await this.#database.getPool();
    await pool.execute(query, params);
    return this.findById(matriculaGUID);
  }

  /**
   * Cancela matrícula (soft delete)
   */
  async delete(matriculaGUID: string): Promise<boolean> {
    const query = `
      UPDATE matricula 
      SET MatriculaStatus = 'Cancelada', 
          MatriculaDataSaida = ?,
          MatriculaUpdatedAt = ? 
      WHERE MatriculaGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(query, [new Date(), new Date(), matriculaGUID]);

    return (result as ResultSetHeader).affectedRows > 0;
  }

  /**
   * Conta matrículas de uma turma
   */
  async countByTurma(turmaGUID: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as total 
      FROM matricula 
      WHERE TurmaGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [turmaGUID]);

    return (rows as RowDataPacket[])[0]?.total || 0;
  }

  /**
   * Converte rows do MySQL em entidades Matricula
   */
  private mapRows(rows: MatriculaRow[]): Matricula[] {
    return rows.map((row) => {
      const matricula = new Matricula();
      matricula.MatriculaGUID = row.MatriculaGUID;
      matricula.UsuarioGUID = row.UsuarioGUID;
      matricula.TurmaGUID = row.TurmaGUID;
      matricula.MatriculaDataEntrada = row.MatriculaDataEntrada;
      matricula.MatriculaDataSaida = row.MatriculaDataSaida;
      matricula.MatriculaStatus = row.MatriculaStatus;
      matricula.MatriculaCreatedAt = row.MatriculaCreatedAt;
      matricula.MatriculaUpdatedAt = row.MatriculaUpdatedAt;
      return matricula;
    });
  }
}
