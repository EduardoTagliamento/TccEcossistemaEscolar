import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Pool, PoolConnection } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import {
  HistoricoGrupoProjeto,
  HistoricoGrupoProjetoCreateDTO,
  HistoricoTipo
} from '../entities/historicogrupoprojeto.model';

/** Pool ou conexão já aberta (para uso dentro de transações do caller) */
export type Executor = Pool | PoolConnection;

interface HistoricoGrupoProjetoRow extends RowDataPacket {
  HistoricoGUID: string;
  GrupoProjetoGUID: string;
  HistoricoTipo: HistoricoTipo;
  UsuarioCPFAtor: string;
  UsuarioCPFAlvo: string | null;
  HistoricoDetalhes: string | null;
  CreatedAt: Date;
}

export interface HistoricoFilters {
  GrupoProjetoGUID?: string;
  HistoricoTipo?: HistoricoTipo;
  UsuarioCPFAtor?: string;
}

export class HistoricoGrupoProjetoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log('⬆️  HistoricoGrupoProjetoDAO.constructor()');
    this.#database = databaseInstance;
  }

  // CREATE
  async create(data: HistoricoGrupoProjetoCreateDTO, executor?: Executor): Promise<HistoricoGrupoProjeto> {
    console.log('🟢 HistoricoGrupoProjetoDAO.create()');

    const historicoGUID = uuidv4();
    const detalhesJSON = data.HistoricoDetalhes ? JSON.stringify(data.HistoricoDetalhes) : null;

    const query = `
      INSERT INTO historicogrupoprojeto (
        HistoricoGUID,
        GrupoProjetoGUID,
        HistoricoTipo,
        UsuarioCPFAtor,
        UsuarioCPFAlvo,
        HistoricoDetalhes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const pool = executor ?? await this.#database.getPool();
    await pool.execute(query, [
      historicoGUID,
      data.GrupoProjetoGUID,
      data.HistoricoTipo,
      data.UsuarioCPFAtor,
      data.UsuarioCPFAlvo || null,
      detalhesJSON
    ]);

    const historicoCriado = await this.findById(historicoGUID, executor);
    if (!historicoCriado) {
      throw new Error('Erro ao buscar histórico recém-criado');
    }

    return historicoCriado;
  }

  // READ - FIND BY ID
  async findById(guid: string, executor?: Executor): Promise<HistoricoGrupoProjeto | null> {
    console.log('🟢 HistoricoGrupoProjetoDAO.findById()');

    const query = `SELECT * FROM historicogrupoprojeto WHERE HistoricoGUID = ?`;

    const pool = executor ?? await this.#database.getPool();
    const [rows] = await pool.execute<HistoricoGrupoProjetoRow[]>(query, [guid]);

    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  // READ - FIND BY GRUPO
  async findByGrupo(grupoGUID: string): Promise<HistoricoGrupoProjeto[]> {
    console.log('🟢 HistoricoGrupoProjetoDAO.findByGrupo()');

    const query = `
      SELECT * FROM historicogrupoprojeto
      WHERE GrupoProjetoGUID = ?
      ORDER BY CreatedAt DESC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<HistoricoGrupoProjetoRow[]>(query, [grupoGUID]);

    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: HistoricoGrupoProjetoRow): HistoricoGrupoProjeto {
    return {
      HistoricoGUID: row.HistoricoGUID,
      GrupoProjetoGUID: row.GrupoProjetoGUID,
      HistoricoTipo: row.HistoricoTipo,
      UsuarioCPFAtor: row.UsuarioCPFAtor,
      UsuarioCPFAlvo: row.UsuarioCPFAlvo,
      HistoricoDetalhes: row.HistoricoDetalhes,
      CreatedAt: row.CreatedAt
    };
  }
}
