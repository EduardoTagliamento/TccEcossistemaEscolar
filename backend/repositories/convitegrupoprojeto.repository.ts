import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Pool, PoolConnection } from 'mysql2/promise';
import { gerarGUID } from "../utils/helpers/guid.helper";
import {
  ConviteGrupoProjeto,
  ConviteGrupoProjetoCreateDTO,
  ConviteGrupoProjetoDTO,
  ConviteTipo,
  ConviteStatus
} from '../entities/convitegrupoprojeto.model';

/** Pool ou conexão já aberta (para uso dentro de transações do caller) */
export type Executor = Pool | PoolConnection;

interface ConviteGrupoProjetoRow extends RowDataPacket {
  ConviteGUID: string;
  GrupoProjetoGUID: string;
  UsuarioGUIDConvidado: string;
  ConviteTipo: ConviteTipo;
  ConviteStatus: ConviteStatus;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ConviteFilters {
  GrupoProjetoGUID?: string;
  UsuarioGUIDConvidado?: string;
  ConviteTipo?: ConviteTipo;
  ConviteStatus?: ConviteStatus;
}

export class ConviteGrupoProjetoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log('⬆️  ConviteGrupoProjetoDAO.constructor()');
    this.#database = databaseInstance;
  }

  // CREATE
  async create(data: ConviteGrupoProjetoCreateDTO): Promise<ConviteGrupoProjeto> {
    console.log('🟢 ConviteGrupoProjetoDAO.create()');

    const conviteGUID = gerarGUID();

    const query = `
      INSERT INTO convitegrupoprojeto (
        ConviteGUID,
        GrupoProjetoGUID,
        UsuarioGUIDConvidado,
        ConviteTipo
      ) VALUES (?, ?, ?, ?)
    `;

    const pool = await this.#database.getPool();
    await pool.execute(query, [conviteGUID, data.GrupoProjetoGUID, data.UsuarioGUIDConvidado, data.ConviteTipo]);

    const conviteCriado = await this.findById(conviteGUID);
    if (!conviteCriado) {
      throw new Error('Erro ao buscar convite recém-criado');
    }

    return conviteCriado;
  }

  // READ - FIND BY ID
  async findById(guid: string, executor?: Executor): Promise<ConviteGrupoProjeto | null> {
    console.log('🟢 ConviteGrupoProjetoDAO.findById()');

    const query = `SELECT * FROM convitegrupoprojeto WHERE ConviteGUID = ?`;

    const pool = executor ?? await this.#database.getPool();
    const [rows] = await pool.execute<ConviteGrupoProjetoRow[]>(query, [guid]);

    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  // READ - FIND COM DETALHES (JOIN com grupo, projeto, usuários)
  async findByIdComDetalhes(conviteGUID: string): Promise<ConviteGrupoProjetoDTO | null> {
    console.log('🟢 ConviteGrupoProjetoDAO.findByIdComDetalhes()');

    const query = `
      SELECT
        c.ConviteGUID,
        c.GrupoProjetoGUID,
        c.UsuarioGUIDConvidado,
        c.ConviteTipo,
        c.ConviteStatus,
        c.CreatedAt,
        gp.GrupoProjetoNome,
        gp.UsuarioGUIDLider AS LiderGUID,
        u_lider.UsuarioNome AS LiderNome,
        u_convidado.UsuarioNome AS NomeConvidado,
        p.ProjetoTitulo,
        p.ProjetoInscricaoPrazoData,
        p.ProjetoGrupoMaxPessoas AS MaxPessoas,
        (1 + COUNT(uxgp.UsuarioGUID)) AS TotalMembros
      FROM convitegrupoprojeto c
      INNER JOIN grupoprojeto gp ON gp.GrupoProjetoGUID = c.GrupoProjetoGUID
      INNER JOIN projeto p ON p.ProjetoGUID = gp.ProjetoGUID
      INNER JOIN usuario u_lider ON u_lider.UsuarioGUID = gp.UsuarioGUIDLider
      INNER JOIN usuario u_convidado ON u_convidado.UsuarioGUID = c.UsuarioGUIDConvidado
      LEFT JOIN usuarioxgrupoprojeto uxgp ON uxgp.GrupoProjetoGUID = gp.GrupoProjetoGUID
      WHERE c.ConviteGUID = ?
      GROUP BY c.ConviteGUID
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [conviteGUID]);

    if (rows.length === 0) return null;

    return this.mapDetalhes(rows[0]);
  }

  // READ - FIND ALL COM DETALHES (pendentes relevantes ao usuário)
  async findAllComDetalhes(usuarioGUID: string): Promise<ConviteGrupoProjetoDTO[]> {
    console.log('🟢 ConviteGrupoProjetoDAO.findAllComDetalhes()');

    const query = `
      SELECT
        c.ConviteGUID,
        c.GrupoProjetoGUID,
        c.UsuarioGUIDConvidado,
        c.ConviteTipo,
        c.ConviteStatus,
        c.CreatedAt,
        gp.GrupoProjetoNome,
        gp.UsuarioGUIDLider AS LiderGUID,
        u_lider.UsuarioNome AS LiderNome,
        u_convidado.UsuarioNome AS NomeConvidado,
        p.ProjetoTitulo,
        p.ProjetoInscricaoPrazoData,
        p.ProjetoGrupoMaxPessoas AS MaxPessoas,
        (1 + COUNT(uxgp.UsuarioGUID)) AS TotalMembros
      FROM convitegrupoprojeto c
      INNER JOIN grupoprojeto gp ON gp.GrupoProjetoGUID = c.GrupoProjetoGUID
      INNER JOIN projeto p ON p.ProjetoGUID = gp.ProjetoGUID
      INNER JOIN usuario u_lider ON u_lider.UsuarioGUID = gp.UsuarioGUIDLider
      INNER JOIN usuario u_convidado ON u_convidado.UsuarioGUID = c.UsuarioGUIDConvidado
      LEFT JOIN usuarioxgrupoprojeto uxgp ON uxgp.GrupoProjetoGUID = gp.GrupoProjetoGUID
      WHERE c.ConviteStatus = 'Pendente'
        AND (
          (c.ConviteTipo = 'Convite' AND c.UsuarioGUIDConvidado = ?)
          OR (c.ConviteTipo = 'Solicitacao' AND gp.UsuarioGUIDLider = ?)
        )
      GROUP BY c.ConviteGUID
      ORDER BY c.CreatedAt DESC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [usuarioGUID, usuarioGUID]);

    return rows.map((row) => this.mapDetalhes(row));
  }

  // UPDATE STATUS
  async updateStatus(guid: string, status: ConviteStatus, executor?: Executor): Promise<ConviteGrupoProjeto | null> {
    console.log('🟢 ConviteGrupoProjetoDAO.updateStatus()');

    const query = `UPDATE convitegrupoprojeto SET ConviteStatus = ? WHERE ConviteGUID = ?`;

    const pool = executor ?? await this.#database.getPool();
    await pool.execute(query, [status, guid]);

    return await this.findById(guid, executor);
  }

  // AUXILIAR - Verificar se convite/solicitação já existe (pendente)
  async existeConvitePendente(grupoGUID: string, usuarioGUID: string): Promise<boolean> {
    console.log('🟢 ConviteGrupoProjetoDAO.existeConvitePendente()');

    const query = `
      SELECT 1 FROM convitegrupoprojeto
      WHERE GrupoProjetoGUID = ? AND UsuarioGUIDConvidado = ? AND ConviteStatus = 'Pendente'
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID, usuarioGUID]);

    return rows.length > 0;
  }

  private mapDetalhes(row: any): ConviteGrupoProjetoDTO {
    return {
      ConviteGUID: row.ConviteGUID,
      GrupoProjetoGUID: row.GrupoProjetoGUID,
      GrupoProjetoNome: row.GrupoProjetoNome,
      LiderGUID: row.LiderGUID,
      LiderNome: row.LiderNome,
      UsuarioGUIDConvidado: row.UsuarioGUIDConvidado,
      NomeConvidado: row.NomeConvidado,
      ConviteTipo: row.ConviteTipo,
      ConviteStatus: row.ConviteStatus,
      ProjetoTitulo: row.ProjetoTitulo,
      ProjetoInscricaoPrazoData: row.ProjetoInscricaoPrazoData,
      TotalMembros: row.TotalMembros,
      MaxPessoas: row.MaxPessoas,
      CreatedAt: row.CreatedAt
    };
  }

  private mapRow(row: ConviteGrupoProjetoRow): ConviteGrupoProjeto {
    return {
      ConviteGUID: row.ConviteGUID,
      GrupoProjetoGUID: row.GrupoProjetoGUID,
      UsuarioGUIDConvidado: row.UsuarioGUIDConvidado,
      ConviteTipo: row.ConviteTipo,
      ConviteStatus: row.ConviteStatus,
      CreatedAt: row.CreatedAt,
      UpdatedAt: row.UpdatedAt
    };
  }
}
