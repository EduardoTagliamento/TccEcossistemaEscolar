import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import {
  HistoricoGrupoTarefa,
  HistoricoGrupoTarefaCreateDTO,
  HistoricoTipo
} from '../entities/historicogrupotarefa.model';

interface HistoricoGrupoTarefaRow extends RowDataPacket {
  HistoricoGUID: string;
  GrupoTarefaGUID: string;
  HistoricoTipo: HistoricoTipo;
  UsuarioCPFAtor: string;
  UsuarioCPFAlvo: string | null;
  HistoricoDetalhes: string | null;
  CreatedAt: Date;
}

export interface HistoricoFilters {
  GrupoTarefaGUID?: string;
  HistoricoTipo?: HistoricoTipo;
  UsuarioCPFAtor?: string;
}

export class HistoricoGrupoTarefaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log('⬆️  HistoricoGrupoTarefaDAO.constructor()');
    this.#database = databaseInstance;
  }

  // CREATE
  async create(data: HistoricoGrupoTarefaCreateDTO): Promise<HistoricoGrupoTarefa> {
    console.log('🟢 HistoricoGrupoTarefaDAO.create()');
    
    const historicoGUID = uuidv4();
    const detalhesJSON = data.HistoricoDetalhes ? JSON.stringify(data.HistoricoDetalhes) : null;
    
    const query = `
      INSERT INTO historicogrupotarefa (
        HistoricoGUID,
        GrupoTarefaGUID,
        HistoricoTipo,
        UsuarioCPFAtor,
        UsuarioCPFAlvo,
        HistoricoDetalhes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const pool = await this.#database.getPool();
    await pool.execute(query, [
      historicoGUID,
      data.GrupoTarefaGUID,
      data.HistoricoTipo,
      data.UsuarioCPFAtor,
      data.UsuarioCPFAlvo || null,
      detalhesJSON
    ]);
    
    const historicoCriado = await this.findById(historicoGUID);
    if (!historicoCriado) {
      throw new Error('Erro ao buscar histórico recém-criado');
    }
    
    return historicoCriado;
  }

  // READ - FIND BY ID
  async findById(guid: string): Promise<HistoricoGrupoTarefa | null> {
    console.log('🟢 HistoricoGrupoTarefaDAO.findById()');
    
    const query = `
      SELECT * FROM historicogrupotarefa
      WHERE HistoricoGUID = ?
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<HistoricoGrupoTarefaRow[]>(query, [guid]);
    
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  // READ - FIND ALL (com filtros)
  async findAll(filters: HistoricoFilters = {}): Promise<HistoricoGrupoTarefa[]> {
    console.log('🟢 HistoricoGrupoTarefaDAO.findAll()');
    
    let query = `SELECT * FROM historicogrupotarefa WHERE 1=1`;
    const params: any[] = [];
    
    if (filters.GrupoTarefaGUID) {
      query += ` AND GrupoTarefaGUID = ?`;
      params.push(filters.GrupoTarefaGUID);
    }
    
    if (filters.HistoricoTipo) {
      query += ` AND HistoricoTipo = ?`;
      params.push(filters.HistoricoTipo);
    }
    
    if (filters.UsuarioCPFAtor) {
      query += ` AND UsuarioCPFAtor = ?`;
      params.push(filters.UsuarioCPFAtor);
    }
    
    query += ` ORDER BY CreatedAt DESC`;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<HistoricoGrupoTarefaRow[]>(query, params);
    
    return rows.map(row => this.mapRow(row));
  }

  // READ - FIND BY GRUPO
  async findByGrupo(grupoGUID: string): Promise<HistoricoGrupoTarefa[]> {
    console.log('🟢 HistoricoGrupoTarefaDAO.findByGrupo()');
    
    const query = `
      SELECT * FROM historicogrupotarefa
      WHERE GrupoTarefaGUID = ?
      ORDER BY CreatedAt DESC
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<HistoricoGrupoTarefaRow[]>(query, [grupoGUID]);
    
    return rows.map(row => this.mapRow(row));
  }

  // DELETE - Remover histórico específico
  async delete(guid: string): Promise<boolean> {
    console.log('🟢 HistoricoGrupoTarefaDAO.delete()');
    
    const query = `DELETE FROM historicogrupotarefa WHERE HistoricoGUID = ?`;
    
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [guid]);
    
    return result.affectedRows > 0;
  }

  // DELETE - Remover todo histórico de um grupo
  async deleteByGrupo(grupoGUID: string): Promise<number> {
    console.log('🟢 HistoricoGrupoTarefaDAO.deleteByGrupo()');
    
    const query = `DELETE FROM historicogrupotarefa WHERE GrupoTarefaGUID = ?`;
    
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [grupoGUID]);
    
    return result.affectedRows;
  }

  private mapRow(row: HistoricoGrupoTarefaRow): HistoricoGrupoTarefa {
    return {
      HistoricoGUID: row.HistoricoGUID,
      GrupoTarefaGUID: row.GrupoTarefaGUID,
      HistoricoTipo: row.HistoricoTipo,
      UsuarioCPFAtor: row.UsuarioCPFAtor,
      UsuarioCPFAlvo: row.UsuarioCPFAlvo,
      HistoricoDetalhes: row.HistoricoDetalhes,
      CreatedAt: row.CreatedAt
    };
  }
}
