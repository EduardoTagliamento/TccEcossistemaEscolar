import MysqlDatabase from '../database/MysqlDatabase';
import { Aviso } from '../entities/aviso.model';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface AvisoFilters {
  EscolaGUID?: string;
}

export class AvisoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log('🟢 AvisoDAO.constructor()');
    this.#database = databaseInstance;
  }

  // CREATE
  async create(aviso: Aviso): Promise<Aviso> {
    console.log('🟢 AvisoDAO.create()');
    const pool = await this.#database.getPool();
    const query = `
      INSERT INTO aviso (
        AvisoGUID, EscolaGUID, UsuarioCPFAutor, AvisoTitulo, AvisoConteudo, AvisoAbrangencia
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    await pool.execute<ResultSetHeader>(query, [
      aviso.AvisoGUID,
      aviso.EscolaGUID,
      aviso.UsuarioCPFAutor,
      aviso.AvisoTitulo,
      aviso.AvisoConteudo,
      aviso.AvisoAbrangencia,
    ]);

    return aviso;
  }

  // READ BY ID
  async findById(guid: string): Promise<Aviso | null> {
    console.log('🟢 AvisoDAO.findById()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM aviso WHERE AvisoGUID = ?', [guid]);

    if (rows.length === 0) return null;
    return rows[0] as Aviso;
  }

  // READ ALL (com filtros)
  async findAll(filters: AvisoFilters): Promise<Aviso[]> {
    console.log('🟢 AvisoDAO.findAll()');
    const pool = await this.#database.getPool();
    let query = 'SELECT * FROM aviso WHERE 1=1';
    const params: any[] = [];

    if (filters.EscolaGUID) {
      query += ' AND EscolaGUID = ?';
      params.push(filters.EscolaGUID);
    }

    query += ' ORDER BY AvisoCreatedAt DESC';

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows as Aviso[];
  }

  // DELETE
  async delete(guid: string): Promise<boolean> {
    console.log('🟢 AvisoDAO.delete()');
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM aviso WHERE AvisoGUID = ?', [guid]);
    return result.affectedRows > 0;
  }

  // ---- Turmas-alvo (só quando AvisoAbrangencia = 'Turmas') ----

  async vincularTurmas(avisoGUID: string, turmaGUIDs: string[]): Promise<void> {
    console.log('🟢 AvisoDAO.vincularTurmas()');
    if (turmaGUIDs.length === 0) return;

    const { v4: uuidv4 } = await import('uuid');
    const pool = await this.#database.getPool();
    const valores = turmaGUIDs.map((turmaGUID) => [uuidv4(), avisoGUID, turmaGUID]);
    const placeholders = valores.map(() => '(?, ?, ?)').join(', ');

    await pool.execute<ResultSetHeader>(
      `INSERT INTO avisoxturma (AvisoXTurmaGUID, AvisoGUID, TurmaGUID) VALUES ${placeholders}`,
      valores.flat()
    );
  }

  async findTurmaGUIDsByAviso(avisoGUID: string): Promise<string[]> {
    console.log('🟢 AvisoDAO.findTurmaGUIDsByAviso()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT TurmaGUID FROM avisoxturma WHERE AvisoGUID = ?', [
      avisoGUID,
    ]);
    return (rows as Array<{ TurmaGUID: string }>).map((row) => row.TurmaGUID);
  }

  // ---- Visualização ("visto" — 1ª vez que o destinatário abre o aviso) ----

  async registrarVisualizacao(avisoGUID: string, usuarioCPF: string): Promise<void> {
    console.log('🟢 AvisoDAO.registrarVisualizacao()');
    const { v4: uuidv4 } = await import('uuid');
    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(
      `INSERT IGNORE INTO avisoxusuario (AvisoXUsuarioGUID, AvisoGUID, UsuarioCPF) VALUES (?, ?, ?)`,
      [uuidv4(), avisoGUID, usuarioCPF]
    );
  }

  async foiVisualizado(avisoGUID: string, usuarioCPF: string): Promise<boolean> {
    console.log('🟢 AvisoDAO.foiVisualizado()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM avisoxusuario WHERE AvisoGUID = ? AND UsuarioCPF = ? LIMIT 1',
      [avisoGUID, usuarioCPF]
    );
    return rows.length > 0;
  }

  /**
   * Aviso mais recente ainda não visto pelo usuário, alcançável por ele —
   * escola inteira, ou turma específica dentre `turmaGUIDs` (matrícula ativa
   * do usuário). Usado pelo banner de destaque na home.
   */
  async findNaoVisualizadoMaisRecente(
    escolaGUID: string,
    usuarioCPF: string,
    turmaGUIDs: string[]
  ): Promise<Aviso | null> {
    console.log('🟢 AvisoDAO.findNaoVisualizadoMaisRecente()');
    const pool = await this.#database.getPool();

    const condicoesAbrangencia = ["(a.AvisoAbrangencia = 'Escola' AND a.EscolaGUID = ?)"];
    const params: any[] = [escolaGUID];

    if (turmaGUIDs.length > 0) {
      const placeholders = turmaGUIDs.map(() => '?').join(', ');
      condicoesAbrangencia.push(
        `(a.AvisoAbrangencia = 'Turmas' AND EXISTS (
          SELECT 1 FROM avisoxturma at WHERE at.AvisoGUID = a.AvisoGUID AND at.TurmaGUID IN (${placeholders})
        ))`
      );
      params.push(...turmaGUIDs);
    }

    const query = `
      SELECT a.* FROM aviso a
      WHERE (${condicoesAbrangencia.join(' OR ')})
        AND NOT EXISTS (
          SELECT 1 FROM avisoxusuario au WHERE au.AvisoGUID = a.AvisoGUID AND au.UsuarioCPF = ?
        )
      ORDER BY a.AvisoCreatedAt DESC
      LIMIT 1
    `;
    params.push(usuarioCPF);

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    if (rows.length === 0) return null;
    return rows[0] as Aviso;
  }
}
