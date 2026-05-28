import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import {
  GrupoTarefa,
  GrupoTarefaCreateDTO,
  GrupoTarefaUpdateDTO,
  GrupoTarefaComMembrosDTO,
  MembroGrupoDTO
} from '../entities/grupotarefa.model';

interface GrupoTarefaRow extends RowDataPacket {
  GrupoTarefaGUID: string;
  TarefaGUID: string;
  TurmaGUID: string;
  UsuarioCPFLider: string;
  GrupoNome: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface GrupoTarefaFilters {
  TarefaGUID?: string;
  TurmaGUID?: string;
  UsuarioCPFLider?: string;
}

export class GrupoTarefaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log('⬆️  GrupoTarefaDAO.constructor()');
    this.#database = databaseInstance;
  }

  // CREATE
  async create(data: GrupoTarefaCreateDTO): Promise<GrupoTarefa> {
    console.log('🟢 GrupoTarefaDAO.create()');
    
    const grupoGUID = uuidv4();
    const nomeDefault = data.GrupoNome || null;
    
    const query = `
      INSERT INTO grupotarefa (
        GrupoTarefaGUID,
        TarefaGUID,
        TurmaGUID,
        UsuarioCPFLider,
        GrupoNome
      ) VALUES (?, ?, ?, ?, ?)
    `;
    
    const pool = await this.#database.getPool();
    await pool.execute(query, [
      grupoGUID,
      data.TarefaGUID,
      data.TurmaGUID,
      data.UsuarioCPFLider,
      nomeDefault
    ]);
    
    const grupoCriado = await this.findById(grupoGUID);
    if (!grupoCriado) {
      throw new Error('Erro ao buscar grupo recém-criado');
    }
    
    return grupoCriado;
  }

  // READ - FIND BY ID
  async findById(guid: string): Promise<GrupoTarefa | null> {
    console.log('🟢 GrupoTarefaDAO.findById()');
    
    const query = `
      SELECT * FROM grupotarefa
      WHERE GrupoTarefaGUID = ?
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<GrupoTarefaRow[]>(query, [guid]);
    
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  // READ - FIND ALL (com filtros)
  async findAll(filters: GrupoTarefaFilters = {}): Promise<GrupoTarefa[]> {
    console.log('🟢 GrupoTarefaDAO.findAll()');
    
    let query = `SELECT * FROM grupotarefa WHERE 1=1`;
    const params: any[] = [];
    
    if (filters.TarefaGUID) {
      query += ` AND TarefaGUID = ?`;
      params.push(filters.TarefaGUID);
    }
    
    if (filters.TurmaGUID) {
      query += ` AND TurmaGUID = ?`;
      params.push(filters.TurmaGUID);
    }
    
    if (filters.UsuarioCPFLider) {
      query += ` AND UsuarioCPFLider = ?`;
      params.push(filters.UsuarioCPFLider);
    }
    
    query += ` ORDER BY CreatedAt ASC`;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<GrupoTarefaRow[]>(query, params);
    
    return rows.map(row => this.mapRow(row));
  }

  // READ - FIND COM MEMBROS (JOIN com usuarioxgrupotarefa + usuario)
  async findByIdComMembros(grupoGUID: string): Promise<GrupoTarefaComMembrosDTO | null> {
    console.log('🟢 GrupoTarefaDAO.findByIdComMembros()');
    
    const query = `
      SELECT 
        gt.GrupoTarefaGUID,
        gt.TarefaGUID,
        gt.TurmaGUID,
        gt.UsuarioCPFLider,
        gt.GrupoNome,
        gt.CreatedAt,
        u_lider.UsuarioNome AS NomeLider,
        t.TarefaMaxPessoas AS LimiteMaximo,
        -- Membros não-líderes
        uxgt.UsuarioCPF AS MembroCPF,
        u_membro.UsuarioNome AS MembroNome,
        uxgt.DataEntrada AS MembroDataEntrada
      FROM grupotarefa gt
      INNER JOIN usuario u_lider ON u_lider.UsuarioCPF = gt.UsuarioCPFLider
      INNER JOIN tarefaacademica t ON t.TarefaGUID = gt.TarefaGUID
      LEFT JOIN usuarioxgrupotarefa uxgt ON uxgt.GrupoTarefaGUID = gt.GrupoTarefaGUID
      LEFT JOIN usuario u_membro ON u_membro.UsuarioCPF = uxgt.UsuarioCPF
      WHERE gt.GrupoTarefaGUID = ?
      ORDER BY uxgt.DataEntrada ASC
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID]);
    
    if (rows.length === 0) return null;
    
    const primeiraLinha = rows[0];
    const membros: MembroGrupoDTO[] = [];
    
    // Adicionar líder
    membros.push({
      UsuarioCPF: primeiraLinha.UsuarioCPFLider,
      UsuarioNome: primeiraLinha.NomeLider,
      DataEntrada: primeiraLinha.CreatedAt,
      IsLider: true
    });
    
    // Adicionar membros não-líderes
    rows.forEach(row => {
      if (row.MembroCPF) {
        membros.push({
          UsuarioCPF: row.MembroCPF,
          UsuarioNome: row.MembroNome,
          DataEntrada: row.MembroDataEntrada,
          IsLider: false
        });
      }
    });
    
    const totalMembros = membros.length;
    const limiteMaximo = primeiraLinha.LimiteMaximo;
    
    return {
      GrupoTarefaGUID: primeiraLinha.GrupoTarefaGUID,
      TarefaGUID: primeiraLinha.TarefaGUID,
      TurmaGUID: primeiraLinha.TurmaGUID,
      UsuarioCPFLider: primeiraLinha.UsuarioCPFLider,
      NomeLider: primeiraLinha.NomeLider,
      GrupoNome: primeiraLinha.GrupoNome,
      Membros: membros,
      TotalMembros: totalMembros,
      LimiteMaximo: limiteMaximo,
      PodeConvidar: totalMembros < limiteMaximo,
      CreatedAt: primeiraLinha.CreatedAt
    };
  }

  // UPDATE
  async update(guid: string, data: GrupoTarefaUpdateDTO): Promise<GrupoTarefa | null> {
    console.log('🟢 GrupoTarefaDAO.update()');
    
    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.GrupoNome !== undefined) {
      updates.push('GrupoNome = ?');
      params.push(data.GrupoNome);
    }
    
    if (data.UsuarioCPFLider !== undefined) {
      updates.push('UsuarioCPFLider = ?');
      params.push(data.UsuarioCPFLider);
    }
    
    if (updates.length === 0) {
      return await this.findById(guid);
    }
    
    params.push(guid);
    
    const query = `
      UPDATE grupotarefa 
      SET ${updates.join(', ')}
      WHERE GrupoTarefaGUID = ?
    `;
    
    const pool = await this.#database.getPool();
    await pool.execute(query, params);
    
    return await this.findById(guid);
  }

  // DELETE
  async delete(guid: string): Promise<boolean> {
    console.log('🟢 GrupoTarefaDAO.delete()');
    
    const query = `DELETE FROM grupotarefa WHERE GrupoTarefaGUID = ?`;
    
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [guid]);
    
    return result.affectedRows > 0;
  }

  // AUXILIAR - Contar membros do grupo (líder + membros)
  async contarMembros(grupoGUID: string): Promise<number> {
    console.log('🟢 GrupoTarefaDAO.contarMembros()');
    
    const query = `
      SELECT 
        (1 + COUNT(uxgt.UsuarioCPF)) AS TotalMembros
      FROM grupotarefa gt
      LEFT JOIN usuarioxgrupotarefa uxgt ON uxgt.GrupoTarefaGUID = gt.GrupoTarefaGUID
      WHERE gt.GrupoTarefaGUID = ?
      GROUP BY gt.GrupoTarefaGUID
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID]);
    
    return rows.length > 0 ? rows[0].TotalMembros : 0;
  }

  // AUXILIAR - Buscar grupo onde usuário é líder (por tarefa)
  async findGrupoOndeEhLider(usuarioCPF: string, tarefaGUID: string): Promise<GrupoTarefa | null> {
    console.log('🟢 GrupoTarefaDAO.findGrupoOndeEhLider()');
    
    const query = `
      SELECT * FROM grupotarefa
      WHERE UsuarioCPFLider = ? AND TarefaGUID = ?
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<GrupoTarefaRow[]>(query, [usuarioCPF, tarefaGUID]);
    
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  // AUXILIAR - Verificar se usuário pertence ao grupo (líder ou membro)
  async usuarioPertenceAoGrupo(usuarioCPF: string, grupoGUID: string): Promise<boolean> {
    console.log('🟢 GrupoTarefaDAO.usuarioPertenceAoGrupo()');
    
    const query = `
      SELECT 1 FROM grupotarefa WHERE GrupoTarefaGUID = ? AND UsuarioCPFLider = ?
      UNION
      SELECT 1 FROM usuarioxgrupotarefa WHERE GrupoTarefaGUID = ? AND UsuarioCPF = ?
      LIMIT 1
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID, usuarioCPF, grupoGUID, usuarioCPF]);
    
    return rows.length > 0;
  }

  private mapRow(row: GrupoTarefaRow): GrupoTarefa {
    return {
      GrupoTarefaGUID: row.GrupoTarefaGUID,
      TarefaGUID: row.TarefaGUID,
      TurmaGUID: row.TurmaGUID,
      UsuarioCPFLider: row.UsuarioCPFLider,
      GrupoNome: row.GrupoNome,
      CreatedAt: row.CreatedAt,
      UpdatedAt: row.UpdatedAt
    };
  }
}
