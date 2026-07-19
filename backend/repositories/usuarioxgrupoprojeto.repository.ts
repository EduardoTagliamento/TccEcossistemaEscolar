import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Pool, PoolConnection } from 'mysql2/promise';
import {
  UsuarioXGrupoProjeto,
  UsuarioXGrupoProjetoCreateDTO
} from '../entities/usuarioxgrupoprojeto.model';

/** Pool ou conexão já aberta (para uso dentro de transações do caller) */
export type Executor = Pool | PoolConnection;

interface UsuarioXGrupoProjetoRow extends RowDataPacket {
  GrupoProjetoGUID: string;
  UsuarioCPF: string;
  DataEntrada: Date;
}

export class UsuarioXGrupoProjetoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log('⬆️  UsuarioXGrupoProjetoDAO.constructor()');
    this.#database = databaseInstance;
  }

  // CREATE
  async create(data: UsuarioXGrupoProjetoCreateDTO, executor?: Executor): Promise<UsuarioXGrupoProjeto> {
    console.log('🟢 UsuarioXGrupoProjetoDAO.create()');

    const query = `
      INSERT INTO usuarioxgrupoprojeto (GrupoProjetoGUID, UsuarioCPF)
      VALUES (?, ?)
    `;

    const pool = executor ?? await this.#database.getPool();
    await pool.execute(query, [data.GrupoProjetoGUID, data.UsuarioCPF]);

    const vinculoCriado = await this.findByGrupoAndUsuario(data.GrupoProjetoGUID, data.UsuarioCPF, executor);
    if (!vinculoCriado) {
      throw new Error('Erro ao buscar vínculo recém-criado');
    }

    return vinculoCriado;
  }

  async findByGrupoAndUsuario(grupoGUID: string, usuarioCPF: string, executor?: Executor): Promise<UsuarioXGrupoProjeto | null> {
    console.log('🟢 UsuarioXGrupoProjetoDAO.findByGrupoAndUsuario()');

    const query = `
      SELECT * FROM usuarioxgrupoprojeto
      WHERE GrupoProjetoGUID = ? AND UsuarioCPF = ?
    `;

    const pool = executor ?? await this.#database.getPool();
    const [rows] = await pool.execute<UsuarioXGrupoProjetoRow[]>(query, [grupoGUID, usuarioCPF]);

    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  // READ - FIND BY GRUPO
  async findByGrupo(grupoGUID: string): Promise<UsuarioXGrupoProjeto[]> {
    console.log('🟢 UsuarioXGrupoProjetoDAO.findByGrupo()');

    const query = `
      SELECT * FROM usuarioxgrupoprojeto
      WHERE GrupoProjetoGUID = ?
      ORDER BY DataEntrada ASC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<UsuarioXGrupoProjetoRow[]>(query, [grupoGUID]);

    return rows.map((row) => this.mapRow(row));
  }

  // READ - FIND BY USUARIO (todos os grupos de projeto que o usuário integra)
  async findByUsuario(usuarioCPF: string): Promise<UsuarioXGrupoProjeto[]> {
    console.log('🟢 UsuarioXGrupoProjetoDAO.findByUsuario()');

    const query = `
      SELECT * FROM usuarioxgrupoprojeto
      WHERE UsuarioCPF = ?
      ORDER BY DataEntrada DESC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<UsuarioXGrupoProjetoRow[]>(query, [usuarioCPF]);

    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Busca o membro mais antigo (menor DataEntrada) do grupo — usado para
   * promover novo líder quando o criador do projeto expulsa o líder atual
   * (ver docs/PLANO_IMPLEMENTACAO_PROJETOS.md, Seção 4 regra 7a).
   */
  async findMembroMaisAntigo(grupoGUID: string): Promise<UsuarioXGrupoProjeto | null> {
    console.log('🟢 UsuarioXGrupoProjetoDAO.findMembroMaisAntigo()');

    const query = `
      SELECT * FROM usuarioxgrupoprojeto
      WHERE GrupoProjetoGUID = ?
      ORDER BY DataEntrada ASC
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<UsuarioXGrupoProjetoRow[]>(query, [grupoGUID]);

    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  // DELETE - Remover membro do grupo
  async deleteByGrupoAndUsuario(grupoGUID: string, usuarioCPF: string): Promise<boolean> {
    console.log('🟢 UsuarioXGrupoProjetoDAO.deleteByGrupoAndUsuario()');

    const query = `
      DELETE FROM usuarioxgrupoprojeto
      WHERE GrupoProjetoGUID = ? AND UsuarioCPF = ?
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [grupoGUID, usuarioCPF]);

    return result.affectedRows > 0;
  }

  // DELETE - Remover todos os membros do grupo (dissolução)
  async deleteByGrupo(grupoGUID: string): Promise<number> {
    console.log('🟢 UsuarioXGrupoProjetoDAO.deleteByGrupo()');

    const query = `DELETE FROM usuarioxgrupoprojeto WHERE GrupoProjetoGUID = ?`;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [grupoGUID]);

    return result.affectedRows;
  }

  // AUXILIAR - Verificar se usuário é membro (não-líder) do grupo
  async isMembroNaoLider(usuarioCPF: string, grupoGUID: string): Promise<boolean> {
    console.log('🟢 UsuarioXGrupoProjetoDAO.isMembroNaoLider()');

    const query = `
      SELECT 1 FROM usuarioxgrupoprojeto
      WHERE GrupoProjetoGUID = ? AND UsuarioCPF = ?
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID, usuarioCPF]);

    return rows.length > 0;
  }

  // AUXILIAR - Contar quantos grupos ativos do projeto o usuário já integra (líder ou membro)
  async contarParticipacoesNoProjeto(usuarioCPF: string, projetoGUID: string): Promise<number> {
    console.log('🟢 UsuarioXGrupoProjetoDAO.contarParticipacoesNoProjeto()');

    const query = `
      SELECT COUNT(*) AS total FROM (
        SELECT GrupoProjetoGUID FROM grupoprojeto
        WHERE ProjetoGUID = ? AND UsuarioCPFLider = ?
        UNION ALL
        SELECT uxgp.GrupoProjetoGUID FROM usuarioxgrupoprojeto uxgp
        INNER JOIN grupoprojeto gp ON gp.GrupoProjetoGUID = uxgp.GrupoProjetoGUID
        WHERE gp.ProjetoGUID = ? AND uxgp.UsuarioCPF = ?
      ) participacoes
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [projetoGUID, usuarioCPF, projetoGUID, usuarioCPF]);

    return (rows[0] as any).total;
  }

  private mapRow(row: UsuarioXGrupoProjetoRow): UsuarioXGrupoProjeto {
    return {
      GrupoProjetoGUID: row.GrupoProjetoGUID,
      UsuarioCPF: row.UsuarioCPF,
      DataEntrada: row.DataEntrada
    };
  }
}
