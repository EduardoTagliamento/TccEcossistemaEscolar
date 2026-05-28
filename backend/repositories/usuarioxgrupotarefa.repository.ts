import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import {
  UsuarioXGrupoTarefa,
  UsuarioXGrupoTarefaCreateDTO
} from '../entities/usuarioxgrupotarefa.model';

interface UsuarioXGrupoTarefaRow extends RowDataPacket {
  UsuarioXGrupoTarefaGUID: string;
  GrupoTarefaGUID: string;
  UsuarioCPF: string;
  DataEntrada: Date;
  CreatedAt: Date;
}

export class UsuarioXGrupoTarefaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log('⬆️  UsuarioXGrupoTarefaDAO.constructor()');
    this.#database = databaseInstance;
  }

  // CREATE
  async create(data: UsuarioXGrupoTarefaCreateDTO): Promise<UsuarioXGrupoTarefa> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.create()');
    
    const vinculoGUID = uuidv4();
    
    const query = `
      INSERT INTO usuarioxgrupotarefa (
        UsuarioXGrupoTarefaGUID,
        GrupoTarefaGUID,
        UsuarioCPF
      ) VALUES (?, ?, ?)
    `;
    
    const pool = await this.#database.getPool();
    await pool.execute(query, [
      vinculoGUID,
      data.GrupoTarefaGUID,
      data.UsuarioCPF
    ]);
    
    const vinculoCriado = await this.findById(vinculoGUID);
    if (!vinculoCriado) {
      throw new Error('Erro ao buscar vínculo recém-criado');
    }
    
    return vinculoCriado;
  }

  // READ - FIND BY ID
  async findById(guid: string): Promise<UsuarioXGrupoTarefa | null> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.findById()');
    
    const query = `
      SELECT * FROM usuarioxgrupotarefa
      WHERE UsuarioXGrupoTarefaGUID = ?
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<UsuarioXGrupoTarefaRow[]>(query, [guid]);
    
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  // READ - FIND BY GRUPO
  async findByGrupo(grupoGUID: string): Promise<UsuarioXGrupoTarefa[]> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.findByGrupo()');
    
    const query = `
      SELECT * FROM usuarioxgrupotarefa
      WHERE GrupoTarefaGUID = ?
      ORDER BY DataEntrada ASC
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<UsuarioXGrupoTarefaRow[]>(query, [grupoGUID]);
    
    return rows.map(row => this.mapRow(row));
  }

  // READ - FIND BY USUARIO
  async findByUsuario(usuarioCPF: string): Promise<UsuarioXGrupoTarefa[]> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.findByUsuario()');
    
    const query = `
      SELECT * FROM usuarioxgrupotarefa
      WHERE UsuarioCPF = ?
      ORDER BY CreatedAt DESC
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<UsuarioXGrupoTarefaRow[]>(query, [usuarioCPF]);
    
    return rows.map(row => this.mapRow(row));
  }

  // DELETE - Remover membro do grupo
  async deleteByGrupoAndUsuario(grupoGUID: string, usuarioCPF: string): Promise<boolean> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.deleteByGrupoAndUsuario()');
    
    const query = `
      DELETE FROM usuarioxgrupotarefa 
      WHERE GrupoTarefaGUID = ? AND UsuarioCPF = ?
    `;
    
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [grupoGUID, usuarioCPF]);
    
    return result.affectedRows > 0;
  }

  // DELETE - Remover todos membros do grupo
  async deleteByGrupo(grupoGUID: string): Promise<number> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.deleteByGrupo()');
    
    const query = `DELETE FROM usuarioxgrupotarefa WHERE GrupoTarefaGUID = ?`;
    
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [grupoGUID]);
    
    return result.affectedRows;
  }

  // AUXILIAR - Verificar se usuário é membro (não-líder) do grupo
  async isMembroNaoLider(usuarioCPF: string, grupoGUID: string): Promise<boolean> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.isMembroNaoLider()');
    
    const query = `
      SELECT 1 FROM usuarioxgrupotarefa
      WHERE GrupoTarefaGUID = ? AND UsuarioCPF = ?
      LIMIT 1
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID, usuarioCPF]);
    
    return rows.length > 0;
  }

  private mapRow(row: UsuarioXGrupoTarefaRow): UsuarioXGrupoTarefa {
    return {
      UsuarioXGrupoTarefaGUID: row.UsuarioXGrupoTarefaGUID,
      GrupoTarefaGUID: row.GrupoTarefaGUID,
      UsuarioCPF: row.UsuarioCPF,
      DataEntrada: row.DataEntrada,
      CreatedAt: row.CreatedAt
    };
  }
}
