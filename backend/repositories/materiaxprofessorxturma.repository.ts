import MaterialProfessorTurma from "../entities/materiaxprofessorxturma.model";
import Usuario from "../entities/usuario.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

/**
 * Filtros para consulta de alocações
 */
export interface AlocacaoFilters {
  MateriaGUID?: string;
  TurmaGUID?: string;
  UsuarioCPF?: string;
  AlocacaoStatus?: 'Ativa' | 'Inativa';
}

/**
 * Interface de mapeamento para rows do MySQL (alocação)
 */
interface AlocacaoRow extends RowDataPacket {
  MatProfTurGUID: string;
  MateriaGUID: string;
  TurmaGUID: string;
  UsuarioCPF: string;
  AlocacaoStatus: 'Ativa' | 'Inativa';
  AlocacaoCreatedAt: Date;
  AlocacaoUpdatedAt: Date;
}

/**
 * Interface de mapeamento para rows do MySQL (usuário)
 */
interface UsuarioRow extends RowDataPacket {
  UsuarioCPF: string;
  UsuarioNome: string;
  UsuarioEmail: string;
  UsuarioDataNascimento: Date;
  UsuarioTelefone: string;
  UsuarioStatus: 'Ativo' | 'Inativo';
  UsuarioCreatedAt: Date;
  UsuarioUpdatedAt: Date;
}

/**
 * Repository (DAO) para alocações de professores
 * 
 * Responsabilidades:
 * - CRUD completo na tabela `materiaxprofessorxturma`
 * - Consultas especializadas (professores por escola, alocações por turma, etc.)
 * - JOINs com usuario, materia, turma para buscar dados completos
 */
export class MaterialProfessorTurmaDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    this.#database = database;
  }

  /**
   * Criar nova alocação
   */
  async create(alocacao: MaterialProfessorTurma): Promise<MaterialProfessorTurma> {
    const query = `
      INSERT INTO materiaxprofessorxturma (
        MatProfTurGUID,
        MateriaGUID,
        TurmaGUID,
        UsuarioCPF,
        AlocacaoStatus,
        AlocacaoCreatedAt,
        AlocacaoUpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      alocacao.MatProfTurGUID,
      alocacao.MateriaGUID,
      alocacao.TurmaGUID,
      alocacao.UsuarioCPF,
      alocacao.AlocacaoStatus,
      alocacao.AlocacaoCreatedAt,
      alocacao.AlocacaoUpdatedAt,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(query, params);
    return alocacao;
  }

  /**
   * Listar alocações com filtros opcionais
   */
  async findAll(filters?: AlocacaoFilters): Promise<MaterialProfessorTurma[]> {
    let query = `SELECT * FROM materiaxprofessorxturma WHERE 1=1`;
    const params: any[] = [];

    if (filters?.MateriaGUID) {
      query += ` AND MateriaGUID = ?`;
      params.push(filters.MateriaGUID);
    }

    if (filters?.TurmaGUID) {
      query += ` AND TurmaGUID = ?`;
      params.push(filters.TurmaGUID);
    }

    if (filters?.UsuarioCPF) {
      query += ` AND UsuarioCPF = ?`;
      params.push(filters.UsuarioCPF);
    }

    if (filters?.AlocacaoStatus) {
      query += ` AND AlocacaoStatus = ?`;
      params.push(filters.AlocacaoStatus);
    }

    query += ` ORDER BY AlocacaoCreatedAt DESC`;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, params);
    return this.mapRows(rows as AlocacaoRow[]);
  }

  /**
   * Buscar alocação por GUID
   */
  async findById(guid: string): Promise<MaterialProfessorTurma | null> {
    const query = `SELECT * FROM materiaxprofessorxturma WHERE MatProfTurGUID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [guid]);

    if (!rows || (rows as AlocacaoRow[]).length === 0) {
      return null;
    }

    return this.mapRows(rows as AlocacaoRow[])[0];
  }

  /**
   * Buscar alocações de um professor (por CPF)
   */
  async findByProfessor(cpf: string): Promise<MaterialProfessorTurma[]> {
    const query = `
      SELECT * FROM materiaxprofessorxturma 
      WHERE UsuarioCPF = ?
      ORDER BY AlocacaoCreatedAt DESC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [cpf]);

    return this.mapRows(rows as AlocacaoRow[]);
  }

  /**
   * Buscar alocações de uma turma
   */
  async findByTurma(turmaGUID: string): Promise<MaterialProfessorTurma[]> {
    const query = `
      SELECT * FROM materiaxprofessorxturma 
      WHERE TurmaGUID = ?
      ORDER BY AlocacaoCreatedAt DESC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [turmaGUID]);

    return this.mapRows(rows as AlocacaoRow[]);
  }

  /**
   * Validar duplicidade: professor já alocado na matéria+turma?
   */
  async findByMateriaTurmaProfessor(
    materiaGUID: string,
    turmaGUID: string,
    cpf: string
  ): Promise<MaterialProfessorTurma | null> {
    const query = `
      SELECT * FROM materiaxprofessorxturma 
      WHERE MateriaGUID = ? 
        AND TurmaGUID = ? 
        AND UsuarioCPF = ?
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [materiaGUID, turmaGUID, cpf]);

    if (!rows || (rows as AlocacaoRow[]).length === 0) {
      return null;
    }

    return this.mapRows(rows as AlocacaoRow[])[0];
  }

  /**
   * CONSULTA ESPECIAL: Listar professores de uma escola
   * JOIN com usuario + escolaxusuarioxfuncao
   * FuncaoId = 3 (Professor) e Status = 'Ativo'
   */
  async findProfessoresByEscola(escolaGUID: string): Promise<Usuario[]> {
    const query = `
      SELECT DISTINCT 
        u.UsuarioCPF,
        u.UsuarioNome,
        u.UsuarioEmail,
        u.UsuarioDataNascimento,
        u.UsuarioTelefone,
        u.UsuarioStatus,
        u.UsuarioCreatedAt,
        u.UsuarioUpdatedAt
      FROM usuario u
      JOIN escolaxusuarioxfuncao euf ON u.UsuarioCPF = euf.UsuarioCPF
      WHERE euf.EscolaGUID = ? 
        AND euf.FuncaoId = 3
        AND euf.Status = 'Ativo'
        AND u.UsuarioStatus = 'Ativo'
      ORDER BY u.UsuarioNome ASC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [escolaGUID]);

    return this.mapUsuarioRows(rows as UsuarioRow[]);
  }

  /**
   * Atualizar alocação (apenas status)
   */
  async update(
    guid: string,
    updates: Partial<Pick<MaterialProfessorTurma, 'AlocacaoStatus'>>
  ): Promise<MaterialProfessorTurma | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.AlocacaoStatus !== undefined) {
      fields.push('AlocacaoStatus = ?');
      params.push(updates.AlocacaoStatus);
    }

    // Sempre atualiza UpdatedAt
    fields.push('AlocacaoUpdatedAt = ?');
    params.push(new Date());

    if (fields.length === 1) {
      // Nenhum campo além de UpdatedAt
      return this.findById(guid);
    }

    params.push(guid);

    const query = `
      UPDATE materiaxprofessorxturma 
      SET ${fields.join(', ')} 
      WHERE MatProfTurGUID = ?
    `;

    const pool = await this.#database.getPool();
    await pool.execute(query, params);
    return this.findById(guid);
  }

  /**
   * Excluir alocação (soft delete -> AlocacaoStatus = 'Inativa')
   */
  async delete(guid: string): Promise<boolean> {
    const query = `
      UPDATE materiaxprofessorxturma 
      SET AlocacaoStatus = 'Inativa', 
          AlocacaoUpdatedAt = ? 
      WHERE MatProfTurGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(query, [new Date(), guid]);

    return (result as ResultSetHeader).affectedRows > 0;
  }

  /**
   * Contar alocações de um professor
   */
  async countByProfessor(cpf: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as total 
      FROM materiaxprofessorxturma 
      WHERE UsuarioCPF = ?
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [cpf]);

    return (rows as RowDataPacket[])[0]?.total || 0;
  }

  /**
   * Contar alocações de uma turma
   */
  async countByTurma(turmaGUID: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as total 
      FROM materiaxprofessorxturma 
      WHERE TurmaGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [turmaGUID]);

    return (rows as RowDataPacket[])[0]?.total || 0;
  }

  /**
   * Converte rows do MySQL em entidades MaterialProfessorTurma
   */
  private mapRows(rows: AlocacaoRow[]): MaterialProfessorTurma[] {
    return rows.map((row) => {
      const alocacao = new MaterialProfessorTurma();
      alocacao.MatProfTurGUID = row.MatProfTurGUID;
      alocacao.MateriaGUID = row.MateriaGUID;
      alocacao.TurmaGUID = row.TurmaGUID;
      alocacao.UsuarioCPF = row.UsuarioCPF;
      alocacao.AlocacaoStatus = row.AlocacaoStatus;
      alocacao.AlocacaoCreatedAt = row.AlocacaoCreatedAt;
      alocacao.AlocacaoUpdatedAt = row.AlocacaoUpdatedAt;
      return alocacao;
    });
  }

  /**
   * Converte rows do MySQL em entidades Usuario
   */
  private mapUsuarioRows(rows: UsuarioRow[]): Usuario[] {
    return rows.map((row) => {
      const usuario = new Usuario();
      usuario.UsuarioCPF = row.UsuarioCPF;
      usuario.UsuarioNome = row.UsuarioNome;
      usuario.UsuarioEmail = row.UsuarioEmail;
      usuario.UsuarioDataNascimento = row.UsuarioDataNascimento;
      usuario.UsuarioTelefone = row.UsuarioTelefone;
      usuario.UsuarioStatus = row.UsuarioStatus;
      usuario.UsuarioCreatedAt = row.UsuarioCreatedAt;
      usuario.UsuarioUpdatedAt = row.UsuarioUpdatedAt;
      return usuario;
    });
  }
}
