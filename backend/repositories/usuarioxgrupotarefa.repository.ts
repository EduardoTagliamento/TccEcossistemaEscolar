import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { gerarGUID } from "../utils/helpers/guid.helper";
import {
  UsuarioXGrupoTarefa,
  UsuarioXGrupoTarefaCreateDTO
} from '../entities/usuarioxgrupotarefa.model';

interface UsuarioXGrupoTarefaRow extends RowDataPacket {
  UsuarioXGrupoTarefaGUID: string;
  GrupoTarefaGUID: string;
  UsuarioGUID: string;
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
    
    const vinculoGUID = gerarGUID();
    
    const query = `
      INSERT INTO usuarioxgrupotarefa (
        UsuarioXGrupoTarefaGUID,
        GrupoTarefaGUID,
        UsuarioGUID
      ) VALUES (?, ?, ?)
    `;
    
    const pool = await this.#database.getPool();
    await pool.execute(query, [
      vinculoGUID,
      data.GrupoTarefaGUID,
      data.UsuarioGUID
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
  async findByUsuario(usuarioGUID: string): Promise<UsuarioXGrupoTarefa[]> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.findByUsuario()');
    
    const query = `
      SELECT * FROM usuarioxgrupotarefa
      WHERE UsuarioGUID = ?
      ORDER BY CreatedAt DESC
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<UsuarioXGrupoTarefaRow[]>(query, [usuarioGUID]);
    
    return rows.map(row => this.mapRow(row));
  }

  // DELETE - Remover membro do grupo
  async deleteByGrupoAndUsuario(grupoGUID: string, usuarioGUID: string): Promise<boolean> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.deleteByGrupoAndUsuario()');
    
    const query = `
      DELETE FROM usuarioxgrupotarefa 
      WHERE GrupoTarefaGUID = ? AND UsuarioGUID = ?
    `;
    
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [grupoGUID, usuarioGUID]);
    
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
  async isMembroNaoLider(usuarioGUID: string, grupoGUID: string): Promise<boolean> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.isMembroNaoLider()');
    
    const query = `
      SELECT 1 FROM usuarioxgrupotarefa
      WHERE GrupoTarefaGUID = ? AND UsuarioGUID = ?
      LIMIT 1
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID, usuarioGUID]);
    
    return rows.length > 0;
  }

  private mapRow(row: UsuarioXGrupoTarefaRow): UsuarioXGrupoTarefa {
    return {
      UsuarioXGrupoTarefaGUID: row.UsuarioXGrupoTarefaGUID,
      GrupoTarefaGUID: row.GrupoTarefaGUID,
      UsuarioGUID: row.UsuarioGUID,
      DataEntrada: row.DataEntrada,
      CreatedAt: row.CreatedAt
    };
  }
}
