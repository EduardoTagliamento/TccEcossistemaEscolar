import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { gerarGUID } from "../utils/helpers/guid.helper";
import { parseDataBrasil } from "../utils/timezone.util";
import {
  Projeto,
  ProjetoCreateDTO,
  ProjetoUpdateDTO,
  ProjetoDTO,
  ProjetoStatus
} from '../entities/projeto.model';

interface ProjetoRow extends RowDataPacket {
  ProjetoGUID: string;
  EscolaGUID: string;
  UsuarioGUIDCriador: string;
  ProjetoTitulo: string;
  ProjetoDescricao: string;
  ProjetoMecanicaPontuacao: string | null;
  ProjetoPublicoAlvo: 'Escola' | 'Turmas';
  ProjetoGrupoMinPessoas: number;
  ProjetoGrupoMaxPessoas: number;
  ProjetoInscricaoPrazoData: Date;
  ProjetoEntregaPrazoData: Date | null;
  ProjetoStatus: ProjetoStatus;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ProjetoFilters {
  EscolaGUID?: string;
  UsuarioGUIDCriador?: string;
  ProjetoStatus?: ProjetoStatus;
}

export class ProjetoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log('⬆️  ProjetoDAO.constructor()');
    this.#database = databaseInstance;
  }

  // CREATE
  async create(data: ProjetoCreateDTO, usuarioGUIDCriador: string): Promise<Projeto> {
    console.log('🟢 ProjetoDAO.create()');

    const projetoGUID = gerarGUID();

    const query = `
      INSERT INTO projeto (
        ProjetoGUID,
        EscolaGUID,
        UsuarioGUIDCriador,
        ProjetoTitulo,
        ProjetoDescricao,
        ProjetoMecanicaPontuacao,
        ProjetoPublicoAlvo,
        ProjetoGrupoMinPessoas,
        ProjetoGrupoMaxPessoas,
        ProjetoInscricaoPrazoData,
        ProjetoEntregaPrazoData
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const pool = await this.#database.getPool();
    await pool.execute(query, [
      projetoGUID,
      data.EscolaGUID,
      usuarioGUIDCriador,
      data.ProjetoTitulo.trim(),
      data.ProjetoDescricao.trim(),
      data.ProjetoMecanicaPontuacao?.trim() || null,
      data.ProjetoPublicoAlvo,
      data.ProjetoGrupoMinPessoas,
      data.ProjetoGrupoMaxPessoas,
      parseDataBrasil(data.ProjetoInscricaoPrazoData),
      data.ProjetoEntregaPrazoData ? parseDataBrasil(data.ProjetoEntregaPrazoData) : null
    ]);

    const projetoCriado = await this.findById(projetoGUID);
    if (!projetoCriado) {
      throw new Error('Erro ao buscar projeto recém-criado');
    }

    return projetoCriado;
  }

  // AUXILIAR - Vincular turmas elegíveis (ProjetoPublicoAlvo='Turmas')
  async addTurmas(projetoGUID: string, turmasGUID: string[]): Promise<void> {
    console.log('🟢 ProjetoDAO.addTurmas()');
    if (turmasGUID.length === 0) return;

    const pool = await this.#database.getPool();
    const values = turmasGUID.map(() => '(?, ?)').join(', ');
    const params = turmasGUID.flatMap((turmaGUID) => [projetoGUID, turmaGUID]);

    await pool.execute(
      `INSERT INTO projetoturma (ProjetoGUID, TurmaGUID) VALUES ${values}`,
      params
    );
  }

  async findTurmasGUID(projetoGUID: string): Promise<string[]> {
    console.log('🟢 ProjetoDAO.findTurmasGUID()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT TurmaGUID FROM projetoturma WHERE ProjetoGUID = ?`,
      [projetoGUID]
    );
    return rows.map((row) => row.TurmaGUID as string);
  }

  // READ - FIND BY ID
  async findById(guid: string): Promise<Projeto | null> {
    console.log('🟢 ProjetoDAO.findById()');

    const query = `SELECT * FROM projeto WHERE ProjetoGUID = ?`;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<ProjetoRow[]>(query, [guid]);

    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  // READ - FIND BY ID COM DETALHES (nome do criador, turmas, total de grupos)
  async findByIdComDetalhes(guid: string): Promise<ProjetoDTO | null> {
    console.log('🟢 ProjetoDAO.findByIdComDetalhes()');

    const query = `
      SELECT
        p.*,
        u.UsuarioNome AS NomeCriador,
        (SELECT COUNT(*) FROM grupoprojeto gp WHERE gp.ProjetoGUID = p.ProjetoGUID) AS TotalGrupos
      FROM projeto p
      INNER JOIN usuario u ON u.UsuarioGUID = p.UsuarioGUIDCriador
      WHERE p.ProjetoGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [guid]);

    if (rows.length === 0) return null;

    const row = rows[0];
    const turmasGUID = await this.findTurmasGUID(guid);

    return {
      ...this.mapRow(row as ProjetoRow),
      NomeCriador: row.NomeCriador,
      TurmasGUID: turmasGUID,
      TotalGrupos: row.TotalGrupos
    };
  }

  // READ - FIND ALL (com filtros)
  async findAll(filters: ProjetoFilters = {}): Promise<Projeto[]> {
    console.log('🟢 ProjetoDAO.findAll()');

    let query = `SELECT * FROM projeto WHERE 1=1`;
    const params: any[] = [];

    if (filters.EscolaGUID) {
      query += ` AND EscolaGUID = ?`;
      params.push(filters.EscolaGUID);
    }

    if (filters.UsuarioGUIDCriador) {
      query += ` AND UsuarioGUIDCriador = ?`;
      params.push(filters.UsuarioGUIDCriador);
    }

    if (filters.ProjetoStatus) {
      query += ` AND ProjetoStatus = ?`;
      params.push(filters.ProjetoStatus);
    }

    query += ` ORDER BY CreatedAt DESC`;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<ProjetoRow[]>(query, params);

    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Lista projetos elegíveis a um aluno em uma escola: público-alvo 'Escola',
   * ou público-alvo 'Turmas' onde o aluno tem matrícula ativa em alguma das
   * turmas vinculadas (ver docs/PLANO_IMPLEMENTACAO_PROJETOS.md, Seção 4 regra 3).
   */
  async findElegiveisParaAluno(escolaGUID: string, usuarioGUID: string): Promise<Projeto[]> {
    console.log('🟢 ProjetoDAO.findElegiveisParaAluno()');

    const query = `
      SELECT DISTINCT p.*
      FROM projeto p
      LEFT JOIN projetoturma pt ON pt.ProjetoGUID = p.ProjetoGUID
      LEFT JOIN matricula m ON m.TurmaGUID = pt.TurmaGUID
        AND m.UsuarioGUID = ? AND m.MatriculaStatus = 'Ativa'
      WHERE p.EscolaGUID = ?
        AND (
          p.ProjetoPublicoAlvo = 'Escola'
          OR (p.ProjetoPublicoAlvo = 'Turmas' AND m.MatriculaGUID IS NOT NULL)
        )
      ORDER BY p.CreatedAt DESC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<ProjetoRow[]>(query, [usuarioGUID, escolaGUID]);

    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Verifica se um usuário (aluno) é elegível a participar do projeto:
   * matrícula ativa em turma elegível (ou qualquer turma da escola, se
   * ProjetoPublicoAlvo='Escola').
   */
  async usuarioElegivel(projetoGUID: string, usuarioGUID: string): Promise<boolean> {
    console.log('🟢 ProjetoDAO.usuarioElegivel()');

    const query = `
      SELECT 1
      FROM projeto p
      INNER JOIN matricula m ON m.UsuarioGUID = ? AND m.MatriculaStatus = 'Ativa'
      INNER JOIN turma t ON t.TurmaGUID = m.TurmaGUID AND t.EscolaGUID = p.EscolaGUID
      LEFT JOIN projetoturma pt ON pt.ProjetoGUID = p.ProjetoGUID AND pt.TurmaGUID = m.TurmaGUID
      WHERE p.ProjetoGUID = ?
        AND (p.ProjetoPublicoAlvo = 'Escola' OR pt.TurmaGUID IS NOT NULL)
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [usuarioGUID, projetoGUID]);

    return rows.length > 0;
  }

  // UPDATE
  async update(guid: string, data: ProjetoUpdateDTO): Promise<Projeto | null> {
    console.log('🟢 ProjetoDAO.update()');

    const updates: string[] = [];
    const params: any[] = [];

    if (data.ProjetoTitulo !== undefined) {
      updates.push('ProjetoTitulo = ?');
      params.push(data.ProjetoTitulo.trim());
    }
    if (data.ProjetoDescricao !== undefined) {
      updates.push('ProjetoDescricao = ?');
      params.push(data.ProjetoDescricao.trim());
    }
    if (data.ProjetoMecanicaPontuacao !== undefined) {
      updates.push('ProjetoMecanicaPontuacao = ?');
      params.push(data.ProjetoMecanicaPontuacao);
    }
    if (data.ProjetoGrupoMinPessoas !== undefined) {
      updates.push('ProjetoGrupoMinPessoas = ?');
      params.push(data.ProjetoGrupoMinPessoas);
    }
    if (data.ProjetoGrupoMaxPessoas !== undefined) {
      updates.push('ProjetoGrupoMaxPessoas = ?');
      params.push(data.ProjetoGrupoMaxPessoas);
    }
    if (data.ProjetoInscricaoPrazoData !== undefined) {
      updates.push('ProjetoInscricaoPrazoData = ?');
      params.push(parseDataBrasil(data.ProjetoInscricaoPrazoData));
    }
    if (data.ProjetoEntregaPrazoData !== undefined) {
      updates.push('ProjetoEntregaPrazoData = ?');
      params.push(data.ProjetoEntregaPrazoData ? parseDataBrasil(data.ProjetoEntregaPrazoData) : null);
    }

    if (updates.length === 0) {
      return await this.findById(guid);
    }

    params.push(guid);

    const query = `UPDATE projeto SET ${updates.join(', ')} WHERE ProjetoGUID = ?`;

    const pool = await this.#database.getPool();
    await pool.execute(query, params);

    return await this.findById(guid);
  }

  async atualizarStatus(guid: string, status: ProjetoStatus): Promise<Projeto | null> {
    console.log('🟢 ProjetoDAO.atualizarStatus()');
    const pool = await this.#database.getPool();
    await pool.execute(`UPDATE projeto SET ProjetoStatus = ? WHERE ProjetoGUID = ?`, [status, guid]);
    return await this.findById(guid);
  }

  async contarGrupos(projetoGUID: string): Promise<number> {
    console.log('🟢 ProjetoDAO.contarGrupos()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM grupoprojeto WHERE ProjetoGUID = ?`,
      [projetoGUID]
    );
    return (rows[0] as any).total;
  }

  private mapRow(row: ProjetoRow): Projeto {
    return {
      ProjetoGUID: row.ProjetoGUID,
      EscolaGUID: row.EscolaGUID,
      UsuarioGUIDCriador: row.UsuarioGUIDCriador,
      ProjetoTitulo: row.ProjetoTitulo,
      ProjetoDescricao: row.ProjetoDescricao,
      ProjetoMecanicaPontuacao: row.ProjetoMecanicaPontuacao,
      ProjetoPublicoAlvo: row.ProjetoPublicoAlvo,
      ProjetoGrupoMinPessoas: row.ProjetoGrupoMinPessoas,
      ProjetoGrupoMaxPessoas: row.ProjetoGrupoMaxPessoas,
      ProjetoInscricaoPrazoData: row.ProjetoInscricaoPrazoData,
      ProjetoEntregaPrazoData: row.ProjetoEntregaPrazoData,
      ProjetoStatus: row.ProjetoStatus,
      CreatedAt: row.CreatedAt,
      UpdatedAt: row.UpdatedAt
    };
  }
}
