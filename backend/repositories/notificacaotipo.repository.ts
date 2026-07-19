/**
 * 🔔 Repository (DAO) - NotificacaoTipo
 *
 * Catálogo estático de tipos de notificação + mapeamento pra papéis (funcao).
 */

import MysqlDatabase from "../database/MysqlDatabase";
import NotificacaoTipo from "../entities/notificacaotipo.model";
import { RowDataPacket } from "mysql2";

export class NotificacaoTipoDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log("🟢 NotificacaoTipoDAO.constructor()");
    this.#database = database;
  }

  async findAll(): Promise<NotificacaoTipo[]> {
    console.log("🟢 NotificacaoTipoDAO.findAll()");

    const query = `
      SELECT
        NotificacaoTipoId, NotificacaoTipoSlug, NotificacaoTipoDescricao,
        NotificacaoTipoCategoria, NotificacaoTipoEmailPadrao, NotificacaoTipoWhatsappPadrao,
        NotificacaoTipoAtivo, CreatedAt, UpdatedAt
      FROM notificacaotipo
      WHERE NotificacaoTipoAtivo = 1
      ORDER BY NotificacaoTipoCategoria ASC, NotificacaoTipoId ASC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query);

    return rows.map((row) => this.#mapRowToTipo(row));
  }

  async findBySlug(slug: string): Promise<NotificacaoTipo | null> {
    console.log("🟢 NotificacaoTipoDAO.findBySlug()");

    const query = `
      SELECT
        NotificacaoTipoId, NotificacaoTipoSlug, NotificacaoTipoDescricao,
        NotificacaoTipoCategoria, NotificacaoTipoEmailPadrao, NotificacaoTipoWhatsappPadrao,
        NotificacaoTipoAtivo, CreatedAt, UpdatedAt
      FROM notificacaotipo
      WHERE NotificacaoTipoSlug = ?
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [slug]);

    if (rows.length === 0) {
      return null;
    }

    return this.#mapRowToTipo(rows[0]);
  }

  async findById(id: number): Promise<NotificacaoTipo | null> {
    console.log("🟢 NotificacaoTipoDAO.findById()");

    const query = `
      SELECT
        NotificacaoTipoId, NotificacaoTipoSlug, NotificacaoTipoDescricao,
        NotificacaoTipoCategoria, NotificacaoTipoEmailPadrao, NotificacaoTipoWhatsappPadrao,
        NotificacaoTipoAtivo, CreatedAt, UpdatedAt
      FROM notificacaotipo
      WHERE NotificacaoTipoId = ?
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [id]);

    if (rows.length === 0) {
      return null;
    }

    return this.#mapRowToTipo(rows[0]);
  }

  /**
   * Mapa NotificacaoTipoId -> FuncaoId[] pra todos os tipos de uma vez
   * (evita N+1 ao montar a resposta de GET /api/notificacao/tipos)
   */
  async findFuncaoIdsPorTipo(): Promise<Map<number, number[]>> {
    console.log("🟢 NotificacaoTipoDAO.findFuncaoIdsPorTipo()");

    const query = `SELECT NotificacaoTipoId, FuncaoId FROM notificacaotipofuncao ORDER BY NotificacaoTipoId ASC`;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query);

    const mapa = new Map<number, number[]>();
    for (const row of rows as any[]) {
      const lista = mapa.get(row.NotificacaoTipoId) ?? [];
      lista.push(row.FuncaoId);
      mapa.set(row.NotificacaoTipoId, lista);
    }
    return mapa;
  }

  #mapRowToTipo(row: RowDataPacket): NotificacaoTipo {
    return NotificacaoTipo.fromPlainObject({
      NotificacaoTipoId: row.NotificacaoTipoId,
      NotificacaoTipoSlug: row.NotificacaoTipoSlug,
      NotificacaoTipoDescricao: row.NotificacaoTipoDescricao,
      NotificacaoTipoCategoria: row.NotificacaoTipoCategoria,
      NotificacaoTipoEmailPadrao: Boolean(row.NotificacaoTipoEmailPadrao),
      NotificacaoTipoWhatsappPadrao: Boolean(row.NotificacaoTipoWhatsappPadrao),
      NotificacaoTipoAtivo: Boolean(row.NotificacaoTipoAtivo),
      CreatedAt: row.CreatedAt,
      UpdatedAt: row.UpdatedAt,
    });
  }
}
