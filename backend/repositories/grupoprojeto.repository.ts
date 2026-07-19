import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Pool, PoolConnection } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import {
  GrupoProjeto,
  GrupoProjetoCreateDTO,
  GrupoProjetoUpdateDTO,
  GrupoProjetoComMembrosDTO,
  MembroGrupoProjetoDTO
} from '../entities/grupoprojeto.model';

/** Pool ou conexão já aberta (para uso dentro de transações do caller) */
export type Executor = Pool | PoolConnection;

interface GrupoProjetoRow extends RowDataPacket {
  GrupoProjetoGUID: string;
  ProjetoGUID: string;
  UsuarioCPFLider: string;
  GrupoProjetoNome: string | null;
  GrupoProjetoProposta: string;
  GrupoProjetoVisibilidade: 'Aberto' | 'Fechado';
  GrupoProjetoPontuacao: number | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface GrupoProjetoFilters {
  ProjetoGUID?: string;
  UsuarioCPFLider?: string;
}

export class GrupoProjetoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log('⬆️  GrupoProjetoDAO.constructor()');
    this.#database = databaseInstance;
  }

  // CREATE
  async create(data: GrupoProjetoCreateDTO): Promise<GrupoProjeto> {
    console.log('🟢 GrupoProjetoDAO.create()');

    const grupoGUID = uuidv4();

    const query = `
      INSERT INTO grupoprojeto (
        GrupoProjetoGUID,
        ProjetoGUID,
        UsuarioCPFLider,
        GrupoProjetoNome,
        GrupoProjetoProposta,
        GrupoProjetoVisibilidade
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const pool = await this.#database.getPool();
    await pool.execute(query, [
      grupoGUID,
      data.ProjetoGUID,
      data.UsuarioCPFLider,
      data.GrupoProjetoNome || null,
      data.GrupoProjetoProposta.trim(),
      data.GrupoProjetoVisibilidade
    ]);

    const grupoCriado = await this.findById(grupoGUID);
    if (!grupoCriado) {
      throw new Error('Erro ao buscar grupo recém-criado');
    }

    return grupoCriado;
  }

  // READ - FIND BY ID
  async findById(guid: string): Promise<GrupoProjeto | null> {
    console.log('🟢 GrupoProjetoDAO.findById()');

    const query = `SELECT * FROM grupoprojeto WHERE GrupoProjetoGUID = ?`;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<GrupoProjetoRow[]>(query, [guid]);

    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  // READ - FIND ALL (com filtros)
  async findAll(filters: GrupoProjetoFilters = {}): Promise<GrupoProjeto[]> {
    console.log('🟢 GrupoProjetoDAO.findAll()');

    let query = `SELECT * FROM grupoprojeto WHERE 1=1`;
    const params: any[] = [];

    if (filters.ProjetoGUID) {
      query += ` AND ProjetoGUID = ?`;
      params.push(filters.ProjetoGUID);
    }

    if (filters.UsuarioCPFLider) {
      query += ` AND UsuarioCPFLider = ?`;
      params.push(filters.UsuarioCPFLider);
    }

    query += ` ORDER BY CreatedAt ASC`;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<GrupoProjetoRow[]>(query, params);

    return rows.map((row) => this.mapRow(row));
  }

  // READ - FIND COM MEMBROS (JOIN com usuarioxgrupoprojeto + usuario + projeto)
  async findByIdComMembros(grupoGUID: string): Promise<GrupoProjetoComMembrosDTO | null> {
    console.log('🟢 GrupoProjetoDAO.findByIdComMembros()');

    const query = `
      SELECT
        gp.GrupoProjetoGUID,
        gp.ProjetoGUID,
        gp.UsuarioCPFLider,
        gp.GrupoProjetoNome,
        gp.GrupoProjetoProposta,
        gp.GrupoProjetoVisibilidade,
        gp.GrupoProjetoPontuacao,
        gp.CreatedAt,
        u_lider.UsuarioNome AS NomeLider,
        p.ProjetoGrupoMaxPessoas AS LimiteMaximo,
        uxgp.UsuarioCPF AS MembroCPF,
        u_membro.UsuarioNome AS MembroNome,
        uxgp.DataEntrada AS MembroDataEntrada
      FROM grupoprojeto gp
      INNER JOIN usuario u_lider ON u_lider.UsuarioCPF = gp.UsuarioCPFLider
      INNER JOIN projeto p ON p.ProjetoGUID = gp.ProjetoGUID
      LEFT JOIN usuarioxgrupoprojeto uxgp ON uxgp.GrupoProjetoGUID = gp.GrupoProjetoGUID
      LEFT JOIN usuario u_membro ON u_membro.UsuarioCPF = uxgp.UsuarioCPF
      WHERE gp.GrupoProjetoGUID = ?
      ORDER BY uxgp.DataEntrada ASC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID]);

    if (rows.length === 0) return null;

    const primeiraLinha = rows[0];
    const membros: MembroGrupoProjetoDTO[] = [];

    membros.push({
      UsuarioCPF: primeiraLinha.UsuarioCPFLider,
      UsuarioNome: primeiraLinha.NomeLider,
      DataEntrada: primeiraLinha.CreatedAt,
      IsLider: true
    });

    rows.forEach((row) => {
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
      GrupoProjetoGUID: primeiraLinha.GrupoProjetoGUID,
      ProjetoGUID: primeiraLinha.ProjetoGUID,
      UsuarioCPFLider: primeiraLinha.UsuarioCPFLider,
      NomeLider: primeiraLinha.NomeLider,
      GrupoProjetoNome: primeiraLinha.GrupoProjetoNome,
      GrupoProjetoProposta: primeiraLinha.GrupoProjetoProposta,
      GrupoProjetoVisibilidade: primeiraLinha.GrupoProjetoVisibilidade,
      GrupoProjetoPontuacao: primeiraLinha.GrupoProjetoPontuacao,
      Membros: membros,
      TotalMembros: totalMembros,
      LimiteMaximo: limiteMaximo,
      PodeEntrar: totalMembros < limiteMaximo,
      CreatedAt: primeiraLinha.CreatedAt
    };
  }

  // UPDATE
  async update(guid: string, data: GrupoProjetoUpdateDTO): Promise<GrupoProjeto | null> {
    console.log('🟢 GrupoProjetoDAO.update()');

    const updates: string[] = [];
    const params: any[] = [];

    if (data.GrupoProjetoNome !== undefined) {
      updates.push('GrupoProjetoNome = ?');
      params.push(data.GrupoProjetoNome);
    }

    if (data.GrupoProjetoProposta !== undefined) {
      updates.push('GrupoProjetoProposta = ?');
      params.push(data.GrupoProjetoProposta.trim());
    }

    if (data.GrupoProjetoVisibilidade !== undefined) {
      updates.push('GrupoProjetoVisibilidade = ?');
      params.push(data.GrupoProjetoVisibilidade);
    }

    if (data.UsuarioCPFLider !== undefined) {
      updates.push('UsuarioCPFLider = ?');
      params.push(data.UsuarioCPFLider);
    }

    if (updates.length === 0) {
      return await this.findById(guid);
    }

    params.push(guid);

    const query = `UPDATE grupoprojeto SET ${updates.join(', ')} WHERE GrupoProjetoGUID = ?`;

    const pool = await this.#database.getPool();
    await pool.execute(query, params);

    return await this.findById(guid);
  }

  async atualizarPontuacao(guid: string, pontuacao: number): Promise<GrupoProjeto | null> {
    console.log('🟢 GrupoProjetoDAO.atualizarPontuacao()');
    const pool = await this.#database.getPool();
    await pool.execute(`UPDATE grupoprojeto SET GrupoProjetoPontuacao = ? WHERE GrupoProjetoGUID = ?`, [pontuacao, guid]);
    return await this.findById(guid);
  }

  // DELETE (dissolução do grupo — CASCADE em usuarioxgrupoprojeto/convitegrupoprojeto/historicogrupoprojeto)
  async delete(guid: string): Promise<boolean> {
    console.log('🟢 GrupoProjetoDAO.delete()');

    const query = `DELETE FROM grupoprojeto WHERE GrupoProjetoGUID = ?`;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [guid]);

    return result.affectedRows > 0;
  }

  // AUXILIAR - Contar membros do grupo (líder + membros)
  async contarMembros(grupoGUID: string, executor?: Executor): Promise<number> {
    console.log('🟢 GrupoProjetoDAO.contarMembros()');

    const query = `
      SELECT (1 + COUNT(uxgp.UsuarioCPF)) AS TotalMembros
      FROM grupoprojeto gp
      LEFT JOIN usuarioxgrupoprojeto uxgp ON uxgp.GrupoProjetoGUID = gp.GrupoProjetoGUID
      WHERE gp.GrupoProjetoGUID = ?
      GROUP BY gp.GrupoProjetoGUID
    `;

    const pool = executor ?? await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID]);

    return rows.length > 0 ? rows[0].TotalMembros : 0;
  }

  // AUXILIAR - Verificar se usuário pertence ao grupo (líder ou membro)
  async usuarioPertenceAoGrupo(usuarioCPF: string, grupoGUID: string): Promise<boolean> {
    console.log('🟢 GrupoProjetoDAO.usuarioPertenceAoGrupo()');

    const query = `
      SELECT 1 FROM grupoprojeto WHERE GrupoProjetoGUID = ? AND UsuarioCPFLider = ?
      UNION
      SELECT 1 FROM usuarioxgrupoprojeto WHERE GrupoProjetoGUID = ? AND UsuarioCPF = ?
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID, usuarioCPF, grupoGUID, usuarioCPF]);

    return rows.length > 0;
  }

  private mapRow(row: GrupoProjetoRow): GrupoProjeto {
    return {
      GrupoProjetoGUID: row.GrupoProjetoGUID,
      ProjetoGUID: row.ProjetoGUID,
      UsuarioCPFLider: row.UsuarioCPFLider,
      GrupoProjetoNome: row.GrupoProjetoNome,
      GrupoProjetoProposta: row.GrupoProjetoProposta,
      GrupoProjetoVisibilidade: row.GrupoProjetoVisibilidade,
      GrupoProjetoPontuacao: row.GrupoProjetoPontuacao,
      CreatedAt: row.CreatedAt,
      UpdatedAt: row.UpdatedAt
    };
  }
}
