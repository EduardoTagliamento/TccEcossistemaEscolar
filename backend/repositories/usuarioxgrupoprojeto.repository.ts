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
  UsuarioGUID: string;
  DataEntrada: Date;
  MembroPermissoes: Record<string, boolean> | string | null;
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
      INSERT INTO usuarioxgrupoprojeto (GrupoProjetoGUID, UsuarioGUID)
      VALUES (?, ?)
    `;

    const pool = executor ?? await this.#database.getPool();
    await pool.execute(query, [data.GrupoProjetoGUID, data.UsuarioGUID]);

    const vinculoCriado = await this.findByGrupoAndUsuario(data.GrupoProjetoGUID, data.UsuarioGUID, executor);
    if (!vinculoCriado) {
      throw new Error('Erro ao buscar vínculo recém-criado');
    }

    return vinculoCriado;
  }

  async findByGrupoAndUsuario(grupoGUID: string, usuarioGUID: string, executor?: Executor): Promise<UsuarioXGrupoProjeto | null> {
    console.log('🟢 UsuarioXGrupoProjetoDAO.findByGrupoAndUsuario()');

    const query = `
      SELECT * FROM usuarioxgrupoprojeto
      WHERE GrupoProjetoGUID = ? AND UsuarioGUID = ?
    `;

    const pool = executor ?? await this.#database.getPool();
    const [rows] = await pool.execute<UsuarioXGrupoProjetoRow[]>(query, [grupoGUID, usuarioGUID]);

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
  async findByUsuario(usuarioGUID: string): Promise<UsuarioXGrupoProjeto[]> {
    console.log('🟢 UsuarioXGrupoProjetoDAO.findByUsuario()');

    const query = `
      SELECT * FROM usuarioxgrupoprojeto
      WHERE UsuarioGUID = ?
      ORDER BY DataEntrada DESC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<UsuarioXGrupoProjetoRow[]>(query, [usuarioGUID]);

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
  async deleteByGrupoAndUsuario(grupoGUID: string, usuarioGUID: string): Promise<boolean> {
    console.log('🟢 UsuarioXGrupoProjetoDAO.deleteByGrupoAndUsuario()');

    const query = `
      DELETE FROM usuarioxgrupoprojeto
      WHERE GrupoProjetoGUID = ? AND UsuarioGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [grupoGUID, usuarioGUID]);

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
  async isMembroNaoLider(usuarioGUID: string, grupoGUID: string): Promise<boolean> {
    console.log('🟢 UsuarioXGrupoProjetoDAO.isMembroNaoLider()');

    const query = `
      SELECT 1 FROM usuarioxgrupoprojeto
      WHERE GrupoProjetoGUID = ? AND UsuarioGUID = ?
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID, usuarioGUID]);

    return rows.length > 0;
  }

  // AUXILIAR - Contar quantos grupos ativos do projeto o usuário já integra (líder ou membro)
  async contarParticipacoesNoProjeto(usuarioGUID: string, projetoGUID: string): Promise<number> {
    console.log('🟢 UsuarioXGrupoProjetoDAO.contarParticipacoesNoProjeto()');

    const query = `
      SELECT COUNT(*) AS total FROM (
        SELECT GrupoProjetoGUID FROM grupoprojeto
        WHERE ProjetoGUID = ? AND UsuarioGUIDLider = ?
        UNION ALL
        SELECT uxgp.GrupoProjetoGUID FROM usuarioxgrupoprojeto uxgp
        INNER JOIN grupoprojeto gp ON gp.GrupoProjetoGUID = uxgp.GrupoProjetoGUID
        WHERE gp.ProjetoGUID = ? AND uxgp.UsuarioGUID = ?
      ) participacoes
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [projetoGUID, usuarioGUID, projetoGUID, usuarioGUID]);

    return (rows[0] as any).total;
  }

  // Concede/revoga capacidades específicas ao membro (merge com o que já existe).
  async atualizarPermissoes(grupoGUID: string, usuarioGUID: string, patch: Record<string, boolean>): Promise<void> {
    console.log('🟢 UsuarioXGrupoProjetoDAO.atualizarPermissoes()');

    const atual = await this.findByGrupoAndUsuario(grupoGUID, usuarioGUID);
    const mesclado = { ...(atual?.MembroPermissoes ?? {}), ...patch };

    const pool = await this.#database.getPool();
    await pool.execute(
      `UPDATE usuarioxgrupoprojeto SET MembroPermissoes = ? WHERE GrupoProjetoGUID = ? AND UsuarioGUID = ?`,
      [JSON.stringify(mesclado), grupoGUID, usuarioGUID]
    );
  }

  private mapRow(row: UsuarioXGrupoProjetoRow): UsuarioXGrupoProjeto {
    return {
      GrupoProjetoGUID: row.GrupoProjetoGUID,
      UsuarioGUID: row.UsuarioGUID,
      DataEntrada: row.DataEntrada,
      MembroPermissoes: typeof row.MembroPermissoes === 'string'
        ? JSON.parse(row.MembroPermissoes)
        : (row.MembroPermissoes ?? null)
    };
  }
}
