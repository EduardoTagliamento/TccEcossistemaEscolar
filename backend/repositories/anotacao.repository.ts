import { getPool } from '../database/mysql';
import { Anotacao, AnotacaoEntity } from '../entities/anotacao.model';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface AnotacaoFilters {
  UsuarioCPF?: string;
  EscolaGUID?: string;
  AnotacaoIsFeito?: boolean;
  DataInicio?: Date;
  DataFim?: Date;
}

export class AnotacaoDAO {
  // CREATE
  async create(anotacao: Anotacao): Promise<Anotacao> {
    const pool = getPool();
    const query = `
      INSERT INTO anotacao (
        AnotacaoGUID, UsuarioCPF, EscolaGUID, AnotacaoData,
        AnotacaoTitulo, AnotacaoDescricao, AnotacaoIsFeito
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute<ResultSetHeader>(query, [
      anotacao.AnotacaoGUID,
      anotacao.UsuarioCPF,
      anotacao.EscolaGUID,
      anotacao.AnotacaoData,
      anotacao.AnotacaoTitulo,
      anotacao.AnotacaoDescricao,
      anotacao.AnotacaoIsFeito
    ]);

    return anotacao;
  }

  // READ BY ID
  async findById(guid: string): Promise<Anotacao | null> {
    const pool = getPool();
    const query = `
      SELECT * FROM anotacao
      WHERE AnotacaoGUID = ?
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [guid]);
    
    if (rows.length === 0) {
      return null;
    }

    return rows[0] as Anotacao;
  }

  // READ ALL (com filtros)
  async findAll(filters: AnotacaoFilters): Promise<Anotacao[]> {
    const pool = getPool();
    let query = 'SELECT * FROM anotacao WHERE 1=1';
    const params: any[] = [];

    if (filters.UsuarioCPF) {
      query += ' AND UsuarioCPF = ?';
      params.push(filters.UsuarioCPF);
    }

    if (filters.EscolaGUID) {
      query += ' AND EscolaGUID = ?';
      params.push(filters.EscolaGUID);
    }

    if (filters.AnotacaoIsFeito !== undefined) {
      query += ' AND AnotacaoIsFeito = ?';
      params.push(filters.AnotacaoIsFeito);
    }

    if (filters.DataInicio) {
      query += ' AND AnotacaoData >= ?';
      params.push(filters.DataInicio);
    }

    if (filters.DataFim) {
      query += ' AND AnotacaoData <= ?';
      params.push(filters.DataFim);
    }

    query += ' ORDER BY AnotacaoData ASC, AnotacaoCreatedAt DESC';

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows as Anotacao[];
  }

  // READ BY USER AND SCHOOL
  async findByUsuarioAndEscola(usuarioCPF: string, escolaGUID: string): Promise<Anotacao[]> {
    return this.findAll({ UsuarioCPF: usuarioCPF, EscolaGUID: escolaGUID });
  }

  // READ BY DATE RANGE (para calendário)
  async findByDateRange(
    usuarioCPF: string,
    escolaGUID: string,
    dataInicio: Date,
    dataFim: Date
  ): Promise<Anotacao[]> {
    return this.findAll({
      UsuarioCPF: usuarioCPF,
      EscolaGUID: escolaGUID,
      DataInicio: dataInicio,
      DataFim: dataFim
    });
  }

  // UPDATE
  async update(guid: string, updates: Partial<Anotacao>): Promise<Anotacao | null> {
    const pool = getPool();
    
    const allowedFields = [
      'AnotacaoData',
      'AnotacaoTitulo',
      'AnotacaoDescricao',
      'AnotacaoIsFeito'
    ];

    const setClauses: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) {
      return this.findById(guid);
    }

    const query = `
      UPDATE anotacao
      SET ${setClauses.join(', ')}
      WHERE AnotacaoGUID = ?
    `;

    params.push(guid);

    const [result] = await pool.execute<ResultSetHeader>(query, params);

    if (result.affectedRows === 0) {
      return null;
    }

    return this.findById(guid);
  }

  // DELETE
  async delete(guid: string): Promise<boolean> {
    const pool = getPool();
    const query = 'DELETE FROM anotacao WHERE AnotacaoGUID = ?';

    const [result] = await pool.execute<ResultSetHeader>(query, [guid]);
    return result.affectedRows > 0;
  }

  // COUNT
  async count(filters: AnotacaoFilters): Promise<number> {
    const pool = getPool();
    let query = 'SELECT COUNT(*) as total FROM anotacao WHERE 1=1';
    const params: any[] = [];

    if (filters.UsuarioCPF) {
      query += ' AND UsuarioCPF = ?';
      params.push(filters.UsuarioCPF);
    }

    if (filters.EscolaGUID) {
      query += ' AND EscolaGUID = ?';
      params.push(filters.EscolaGUID);
    }

    if (filters.AnotacaoIsFeito !== undefined) {
      query += ' AND AnotacaoIsFeito = ?';
      params.push(filters.AnotacaoIsFeito);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows[0].total;
  }
}
