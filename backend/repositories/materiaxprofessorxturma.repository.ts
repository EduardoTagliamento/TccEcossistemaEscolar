import MaterialProfessorTurma from "../entities/materiaxprofessorxturma.model";
import Usuario from "../entities/usuario.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

/**
 * Filtros para consulta de alocações
 */
export interface AlocacaoComNomesDTO {
  MatProfTurGUID: string;
  MateriaGUID: string;
  MateriaNome: string;
  TurmaGUID: string | null;
  TurmaNome: string | null;
  TurmaSerie: string | null;
  GrupoEletivoGUID: string | null;
  GrupoEletivoNome: string | null;
  UsuarioGUID: string;
  UsuarioNome: string;
}

export interface AlocacaoFilters {
  MateriaGUID?: string;
  TurmaGUID?: string;
  GrupoEletivoGUID?: string;
  UsuarioGUID?: string;
  AlocacaoStatus?: 'Ativa' | 'Inativa';
}

/**
 * Interface de mapeamento para rows do MySQL (alocação)
 */
interface AlocacaoRow extends RowDataPacket {
  MatProfTurGUID: string;
  MateriaGUID: string;
  TurmaGUID: string | null;
  GrupoEletivoGUID: string | null;
  UsuarioGUID: string;
  AlocacaoStatus: 'Ativa' | 'Inativa';
  AulasPorSemana: number | null;
  MatProfTurCreatedAt: Date;
  MatProfTurUpdatedAt: Date;
}

/**
 * Interface de mapeamento para rows do MySQL (usuário)
 */
interface UsuarioRow extends RowDataPacket {
  UsuarioGUID: string;
  UsuarioCPF: string | null;
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
        GrupoEletivoGUID,
        UsuarioGUID,
        AlocacaoStatus,
        AulasPorSemana,
        MatProfTurCreatedAt,
        MatProfTurUpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      alocacao.MatProfTurGUID,
      alocacao.MateriaGUID,
      alocacao.TurmaGUID,
      alocacao.GrupoEletivoGUID,
      alocacao.UsuarioGUID,
      alocacao.AlocacaoStatus,
      alocacao.AulasPorSemana,
      alocacao.MatProfTurCreatedAt,
      alocacao.MatProfTurUpdatedAt,
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

    if (filters?.GrupoEletivoGUID) {
      query += ` AND GrupoEletivoGUID = ?`;
      params.push(filters.GrupoEletivoGUID);
    }

    if (filters?.UsuarioGUID) {
      query += ` AND UsuarioGUID = ?`;
      params.push(filters.UsuarioGUID);
    }

    if (filters?.AlocacaoStatus) {
      query += ` AND AlocacaoStatus = ?`;
      params.push(filters.AlocacaoStatus);
    }

    query += ` ORDER BY MatProfTurCreatedAt DESC`;

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
   * Buscar alocação por GUID já com o nome da matéria, turma e professor
   * resolvidos via JOIN — usado por telas que mostram "quem postou" (ex.:
   * lista de tarefas do aluno), pra não expor só o GUID cru da alocação.
   */
  async findByIdComNomes(guid: string): Promise<AlocacaoComNomesDTO | null> {
    const query = `
      SELECT
        mpt.MatProfTurGUID, mpt.MateriaGUID, mat.MateriaNome,
        mpt.TurmaGUID, tu.TurmaNome, tu.TurmaSerie,
        mpt.GrupoEletivoGUID, ge.GrupoEletivoNome,
        mpt.UsuarioGUID, u.UsuarioNome
      FROM materiaxprofessorxturma mpt
      INNER JOIN materia mat ON mat.MateriaGUID = mpt.MateriaGUID
      LEFT JOIN turma tu ON tu.TurmaGUID = mpt.TurmaGUID
      LEFT JOIN grupoeletivo ge ON ge.GrupoEletivoGUID = mpt.GrupoEletivoGUID
      INNER JOIN usuario u ON u.UsuarioGUID = mpt.UsuarioGUID
      WHERE mpt.MatProfTurGUID = ?
      LIMIT 1
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [guid]);

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      MatProfTurGUID: row.MatProfTurGUID,
      MateriaGUID: row.MateriaGUID,
      MateriaNome: row.MateriaNome,
      TurmaGUID: row.TurmaGUID,
      TurmaNome: row.TurmaNome,
      TurmaSerie: row.TurmaSerie,
      GrupoEletivoGUID: row.GrupoEletivoGUID,
      GrupoEletivoNome: row.GrupoEletivoNome,
      UsuarioGUID: row.UsuarioGUID,
      UsuarioNome: row.UsuarioNome,
    };
  }

  /**
   * Buscar alocações de um professor (por GUID)
   */
  async findByProfessor(usuarioGUID: string): Promise<MaterialProfessorTurma[]> {
    const query = `
      SELECT * FROM materiaxprofessorxturma
      WHERE UsuarioGUID = ?
      ORDER BY MatProfTurCreatedAt DESC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [usuarioGUID]);

    return this.mapRows(rows as AlocacaoRow[]);
  }

  /**
   * Buscar alocações de uma turma
   */
  async findByTurma(turmaGUID: string): Promise<MaterialProfessorTurma[]> {
    const query = `
      SELECT * FROM materiaxprofessorxturma 
      WHERE TurmaGUID = ?
      ORDER BY MatProfTurCreatedAt DESC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [turmaGUID]);

    return this.mapRows(rows as AlocacaoRow[]);
  }

  /**
   * Buscar alocações de um grupo eletivo
   */
  async findByGrupoEletivo(grupoEletivoGUID: string): Promise<MaterialProfessorTurma[]> {
    const query = `
      SELECT * FROM materiaxprofessorxturma
      WHERE GrupoEletivoGUID = ?
      ORDER BY MatProfTurCreatedAt DESC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [grupoEletivoGUID]);

    return this.mapRows(rows as AlocacaoRow[]);
  }

  /**
   * Validar duplicidade: professor já alocado na matéria+turma?
   */
  async findByMateriaTurmaProfessor(
    materiaGUID: string,
    turmaGUID: string,
    usuarioGUID: string
  ): Promise<MaterialProfessorTurma | null> {
    const query = `
      SELECT * FROM materiaxprofessorxturma
      WHERE MateriaGUID = ?
        AND TurmaGUID = ?
        AND UsuarioGUID = ?
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [materiaGUID, turmaGUID, usuarioGUID]);

    if (!rows || (rows as AlocacaoRow[]).length === 0) {
      return null;
    }

    return this.mapRows(rows as AlocacaoRow[])[0];
  }

  /**
   * Validar duplicidade: professor já alocado na matéria+grupo eletivo?
   */
  async findByMateriaGrupoProfessor(
    materiaGUID: string,
    grupoEletivoGUID: string,
    usuarioGUID: string
  ): Promise<MaterialProfessorTurma | null> {
    const query = `
      SELECT * FROM materiaxprofessorxturma
      WHERE MateriaGUID = ?
        AND GrupoEletivoGUID = ?
        AND UsuarioGUID = ?
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [materiaGUID, grupoEletivoGUID, usuarioGUID]);

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
        u.UsuarioGUID,
        u.UsuarioCPF,
        u.UsuarioNome,
        u.UsuarioEmail,
        u.UsuarioDataNascimento,
        u.UsuarioTelefone,
        u.UsuarioStatus,
        u.UsuarioCreatedAt,
        u.UsuarioUpdatedAt
      FROM usuario u
      JOIN escolaxusuarioxfuncao euf ON u.UsuarioGUID = euf.UsuarioGUID
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
    updates: Partial<Pick<MaterialProfessorTurma, 'AlocacaoStatus' | 'AulasPorSemana'>>
  ): Promise<MaterialProfessorTurma | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.AlocacaoStatus !== undefined) {
      fields.push('AlocacaoStatus = ?');
      params.push(updates.AlocacaoStatus);
    }

    if (updates.AulasPorSemana !== undefined) {
      fields.push('AulasPorSemana = ?');
      params.push(updates.AulasPorSemana);
    }

    // Sempre atualiza UpdatedAt
    fields.push('MatProfTurUpdatedAt = ?');
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
          MatProfTurUpdatedAt = ? 
      WHERE MatProfTurGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(query, [new Date(), guid]);

    return (result as ResultSetHeader).affectedRows > 0;
  }

  /**
   * Contar alocações de um professor
   */
  async countByProfessor(usuarioGUID: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as total
      FROM materiaxprofessorxturma
      WHERE UsuarioGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [usuarioGUID]);

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
      alocacao.GrupoEletivoGUID = row.GrupoEletivoGUID;
      alocacao.UsuarioGUID = row.UsuarioGUID;
      alocacao.AlocacaoStatus = row.AlocacaoStatus;
      alocacao.AulasPorSemana = row.AulasPorSemana;
      alocacao.MatProfTurCreatedAt = row.MatProfTurCreatedAt;
      alocacao.MatProfTurUpdatedAt = row.MatProfTurUpdatedAt;
      return alocacao;
    });
  }

  /**
   * Converte rows do MySQL em entidades Usuario
   */
  private mapUsuarioRows(rows: UsuarioRow[]): Usuario[] {
    return rows.map((row) => {
      const usuario = new Usuario();
      usuario.UsuarioGUID = row.UsuarioGUID;
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
