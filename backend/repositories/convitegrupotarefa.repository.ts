import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import {
  ConviteGrupoTarefa,
  ConviteGrupoTarefaCreateDTO,
  ConviteGrupoTarefaDTO,
  ConviteTipo,
  ConviteStatus
} from '../entities/convitegrupotarefa.model';

interface ConviteGrupoTarefaRow extends RowDataPacket {
  ConviteGUID: string;
  GrupoTarefaGUID: string;
  UsuarioCPFConvidado: string;
  ConviteTipo: ConviteTipo;
  ConviteStatus: ConviteStatus;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ConviteFilters {
  GrupoTarefaGUID?: string;
  UsuarioCPFConvidado?: string;
  ConviteTipo?: ConviteTipo;
  ConviteStatus?: ConviteStatus;
}

export class ConviteGrupoTarefaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log('⬆️  ConviteGrupoTarefaDAO.constructor()');
    this.#database = databaseInstance;
  }

  // CREATE
  async create(data: ConviteGrupoTarefaCreateDTO): Promise<ConviteGrupoTarefa> {
    console.log('🟢 ConviteGrupoTarefaDAO.create()');
    
    const conviteGUID = uuidv4();
    
    const query = `
      INSERT INTO convitegrupotarefa (
        ConviteGUID,
        GrupoTarefaGUID,
        UsuarioCPFConvidado,
        ConviteTipo
      ) VALUES (?, ?, ?, ?)
    `;
    
    const pool = await this.#database.getPool();
    await pool.execute(query, [
      conviteGUID,
      data.GrupoTarefaGUID,
      data.UsuarioCPFConvidado,
      data.ConviteTipo
    ]);
    
    const conviteCriado = await this.findById(conviteGUID);
    if (!conviteCriado) {
      throw new Error('Erro ao buscar convite recém-criado');
    }
    
    return conviteCriado;
  }

  // READ - FIND BY ID
  async findById(guid: string): Promise<ConviteGrupoTarefa | null> {
    console.log('🟢 ConviteGrupoTarefaDAO.findById()');
    
    const query = `
      SELECT * FROM convitegrupotarefa
      WHERE ConviteGUID = ?
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<ConviteGrupoTarefaRow[]>(query, [guid]);
    
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  // READ - FIND ALL (com filtros)
  async findAll(filters: ConviteFilters = {}): Promise<ConviteGrupoTarefa[]> {
    console.log('🟢 ConviteGrupoTarefaDAO.findAll()');
    
    let query = `SELECT * FROM convitegrupotarefa WHERE 1=1`;
    const params: any[] = [];
    
    if (filters.GrupoTarefaGUID) {
      query += ` AND GrupoTarefaGUID = ?`;
      params.push(filters.GrupoTarefaGUID);
    }
    
    if (filters.UsuarioCPFConvidado) {
      query += ` AND UsuarioCPFConvidado = ?`;
      params.push(filters.UsuarioCPFConvidado);
    }
    
    if (filters.ConviteTipo) {
      query += ` AND ConviteTipo = ?`;
      params.push(filters.ConviteTipo);
    }
    
    if (filters.ConviteStatus) {
      query += ` AND ConviteStatus = ?`;
      params.push(filters.ConviteStatus);
    }
    
    query += ` ORDER BY CreatedAt DESC`;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<ConviteGrupoTarefaRow[]>(query, params);
    
    return rows.map(row => this.mapRow(row));
  }

  // READ - FIND COM DETALHES (JOIN com grupo, tarefa, usuários)
  async findByIdComDetalhes(conviteGUID: string): Promise<ConviteGrupoTarefaDTO | null> {
    console.log('🟢 ConviteGrupoTarefaDAO.findByIdComDetalhes()');
    
    const query = `
      SELECT 
        c.ConviteGUID,
        c.GrupoTarefaGUID,
        c.UsuarioCPFConvidado,
        c.ConviteTipo,
        c.ConviteStatus,
        c.CreatedAt,
        gt.GrupoNome,
        gt.UsuarioCPFLider AS LiderCPF,
        u_lider.UsuarioNome AS LiderNome,
        u_convidado.UsuarioNome AS NomeConvidado,
        t.TarefaTitulo,
        t.TarefaPrazoData,
        t.TarefaMaxPessoas AS MaxPessoas,
        (1 + COUNT(uxgt.UsuarioCPF)) AS TotalMembros
      FROM convitegrupotarefa c
      INNER JOIN grupotarefa gt ON gt.GrupoTarefaGUID = c.GrupoTarefaGUID
      INNER JOIN tarefaacademica t ON t.TarefaGUID = gt.TarefaGUID
      INNER JOIN usuario u_lider ON u_lider.UsuarioCPF = gt.UsuarioCPFLider
      INNER JOIN usuario u_convidado ON u_convidado.UsuarioCPF = c.UsuarioCPFConvidado
      LEFT JOIN usuarioxgrupotarefa uxgt ON uxgt.GrupoTarefaGUID = gt.GrupoTarefaGUID
      WHERE c.ConviteGUID = ?
      GROUP BY c.ConviteGUID
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [conviteGUID]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    
    return {
      ConviteGUID: row.ConviteGUID,
      GrupoTarefaGUID: row.GrupoTarefaGUID,
      GrupoNome: row.GrupoNome,
      LiderCPF: row.LiderCPF,
      LiderNome: row.LiderNome,
      UsuarioCPFConvidado: row.UsuarioCPFConvidado,
      NomeConvidado: row.NomeConvidado,
      ConviteTipo: row.ConviteTipo,
      ConviteStatus: row.ConviteStatus,
      TarefaTitulo: row.TarefaTitulo,
      TarefaPrazoData: row.TarefaPrazoData,
      TotalMembros: row.TotalMembros,
      MaxPessoas: row.MaxPessoas,
      CreatedAt: row.CreatedAt
    };
  }

  // READ - FIND ALL COM DETALHES (JOIN com grupo, tarefa, usuários)
  async findAllComDetalhes(usuarioCPF: string): Promise<ConviteGrupoTarefaDTO[]> {
    console.log('🟢 ConviteGrupoTarefaDAO.findAllComDetalhes()');
    
    const query = `
      SELECT 
        c.ConviteGUID,
        c.GrupoTarefaGUID,
        c.UsuarioCPFConvidado,
        c.ConviteTipo,
        c.ConviteStatus,
        c.CreatedAt,
        gt.GrupoNome,
        gt.UsuarioCPFLider AS LiderCPF,
        u_lider.UsuarioNome AS LiderNome,
        u_convidado.UsuarioNome AS NomeConvidado,
        t.TarefaTitulo,
        t.TarefaPrazoData,
        t.TarefaMaxPessoas AS MaxPessoas,
        (1 + COUNT(uxgt.UsuarioCPF)) AS TotalMembros
      FROM convitegrupotarefa c
      INNER JOIN grupotarefa gt ON gt.GrupoTarefaGUID = c.GrupoTarefaGUID
      INNER JOIN tarefaacademica t ON t.TarefaGUID = gt.TarefaGUID
      INNER JOIN usuario u_lider ON u_lider.UsuarioCPF = gt.UsuarioCPFLider
      INNER JOIN usuario u_convidado ON u_convidado.UsuarioCPF = c.UsuarioCPFConvidado
      LEFT JOIN usuarioxgrupotarefa uxgt ON uxgt.GrupoTarefaGUID = gt.GrupoTarefaGUID
      WHERE c.UsuarioCPFConvidado = ? AND c.ConviteStatus = 'Pendente'
      GROUP BY c.ConviteGUID
      ORDER BY c.CreatedAt DESC
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [usuarioCPF]);
    
    return rows.map((row: any) => ({
      ConviteGUID: row.ConviteGUID,
      GrupoTarefaGUID: row.GrupoTarefaGUID,
      GrupoNome: row.GrupoNome,
      LiderCPF: row.LiderCPF,
      LiderNome: row.LiderNome,
      UsuarioCPFConvidado: row.UsuarioCPFConvidado,
      NomeConvidado: row.NomeConvidado,
      ConviteTipo: row.ConviteTipo,
      ConviteStatus: row.ConviteStatus,
      TarefaTitulo: row.TarefaTitulo,
      TarefaPrazoData: row.TarefaPrazoData,
      TotalMembros: row.TotalMembros,
      MaxPessoas: row.MaxPessoas,
      CreatedAt: row.CreatedAt
    }));
  }

  // UPDATE STATUS
  async updateStatus(guid: string, status: ConviteStatus): Promise<ConviteGrupoTarefa | null> {
    console.log('🟢 ConviteGrupoTarefaDAO.updateStatus()');
    
    const query = `
      UPDATE convitegrupotarefa 
      SET ConviteStatus = ?
      WHERE ConviteGUID = ?
    `;
    
    const pool = await this.#database.getPool();
    await pool.execute(query, [status, guid]);
    
    return await this.findById(guid);
  }

  // DELETE
  async delete(guid: string): Promise<boolean> {
    console.log('🟢 ConviteGrupoTarefaDAO.delete()');
    
    const query = `DELETE FROM convitegrupotarefa WHERE ConviteGUID = ?`;
    
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [guid]);
    
    return result.affectedRows > 0;
  }

  // AUXILIAR - Verificar se convite/solicitação já existe (pendente)
  async existeConvitePendente(grupoGUID: string, usuarioCPF: string): Promise<boolean> {
    console.log('🟢 ConviteGrupoTarefaDAO.existeConvitePendente()');
    
    const query = `
      SELECT 1 FROM convitegrupotarefa
      WHERE GrupoTarefaGUID = ? 
        AND UsuarioCPFConvidado = ?
        AND ConviteStatus = 'Pendente'
      LIMIT 1
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID, usuarioCPF]);
    
    return rows.length > 0;
  }

  // AUXILIAR - Excluir convites pendentes do grupo (quando grupo enche)
  async deletePendentesByGrupo(grupoGUID: string): Promise<number> {
    console.log('🟢 ConviteGrupoTarefaDAO.deletePendentesByGrupo()');
    
    const query = `
      DELETE FROM convitegrupotarefa 
      WHERE GrupoTarefaGUID = ? AND ConviteStatus = 'Pendente'
    `;
    
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [grupoGUID]);
    
    return result.affectedRows;
  }

  private mapRow(row: ConviteGrupoTarefaRow): ConviteGrupoTarefa {
    return {
      ConviteGUID: row.ConviteGUID,
      GrupoTarefaGUID: row.GrupoTarefaGUID,
      UsuarioCPFConvidado: row.UsuarioCPFConvidado,
      ConviteTipo: row.ConviteTipo,
      ConviteStatus: row.ConviteStatus,
      CreatedAt: row.CreatedAt,
      UpdatedAt: row.UpdatedAt
    };
  }
}
