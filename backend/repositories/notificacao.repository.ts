/**
 * 🔔 Repository (DAO) - Notificacao
 *
 * Feed in-app de notificações.
 */

import MysqlDatabase from "../database/MysqlDatabase";
import Notificacao from "../entities/notificacao.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface NotificacaoFilters {
  lida?: boolean;
  limit?: number;
  offset?: number;
}

export class NotificacaoDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log("🟢 NotificacaoDAO.constructor()");
    this.#database = database;
  }

  async create(notificacao: Notificacao): Promise<Notificacao> {
    console.log("🟢 NotificacaoDAO.create()");

    const query = `
      INSERT INTO notificacao (
        NotificacaoGUID, NotificacaoTipoId, UsuarioCPF, EscolaGUID,
        NotificacaoTitulo, NotificacaoConteudo, NotificacaoEntidadeTipo,
        NotificacaoEntidadeGUID, NotificacaoLink, NotificacaoLida, NotificacaoLidaData
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      notificacao.NotificacaoGUID,
      notificacao.NotificacaoTipoId,
      notificacao.UsuarioCPF,
      notificacao.EscolaGUID,
      notificacao.NotificacaoTitulo,
      notificacao.NotificacaoConteudo,
      notificacao.NotificacaoEntidadeTipo,
      notificacao.NotificacaoEntidadeGUID,
      notificacao.NotificacaoLink,
      notificacao.NotificacaoLida ? 1 : 0,
      notificacao.NotificacaoLidaData,
    ];

    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, params);

    const created = await this.findById(notificacao.NotificacaoGUID);
    if (!created) {
      throw new Error("Falha ao criar notificação");
    }
    return created;
  }

  async findById(guid: string): Promise<Notificacao | null> {
    console.log("🟢 NotificacaoDAO.findById()");

    const query = `
      SELECT NotificacaoGUID, NotificacaoTipoId, UsuarioCPF, EscolaGUID,
        NotificacaoTitulo, NotificacaoConteudo, NotificacaoEntidadeTipo,
        NotificacaoEntidadeGUID, NotificacaoLink, NotificacaoLida, NotificacaoLidaData,
        NotificacaoCreatedAt
      FROM notificacao
      WHERE NotificacaoGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [guid]);

    if (rows.length === 0) {
      return null;
    }
    return this.#mapRowToNotificacao(rows[0]);
  }

  async findAllByUsuario(usuarioCPF: string, filters: NotificacaoFilters = {}): Promise<Notificacao[]> {
    console.log("🟢 NotificacaoDAO.findAllByUsuario()");

    let query = `
      SELECT NotificacaoGUID, NotificacaoTipoId, UsuarioCPF, EscolaGUID,
        NotificacaoTitulo, NotificacaoConteudo, NotificacaoEntidadeTipo,
        NotificacaoEntidadeGUID, NotificacaoLink, NotificacaoLida, NotificacaoLidaData,
        NotificacaoCreatedAt
      FROM notificacao
      WHERE UsuarioCPF = ?
    `;
    const params: any[] = [usuarioCPF];

    if (filters.lida !== undefined) {
      query += ` AND NotificacaoLida = ?`;
      params.push(filters.lida ? 1 : 0);
    }

    query += ` ORDER BY NotificacaoCreatedAt DESC`;

    if (filters.limit) {
      query += ` LIMIT ?`;
      params.push(filters.limit);
    }
    if (filters.offset) {
      query += ` OFFSET ?`;
      params.push(filters.offset);
    }

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    return rows.map((row) => this.#mapRowToNotificacao(row));
  }

  async contarNaoLidas(usuarioCPF: string): Promise<number> {
    console.log("🟢 NotificacaoDAO.contarNaoLidas()");

    const query = `SELECT COUNT(*) as total FROM notificacao WHERE UsuarioCPF = ? AND NotificacaoLida = 0`;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [usuarioCPF]);

    return (rows as any)[0]?.total || 0;
  }

  async marcarComoLida(guid: string, usuarioCPF: string): Promise<Notificacao> {
    console.log("🟢 NotificacaoDAO.marcarComoLida()");

    const query = `
      UPDATE notificacao
      SET NotificacaoLida = 1, NotificacaoLidaData = NOW()
      WHERE NotificacaoGUID = ? AND UsuarioCPF = ?
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [guid, usuarioCPF]);

    if (result.affectedRows === 0) {
      throw new Error("Notificação não encontrada");
    }

    const updated = await this.findById(guid);
    if (!updated) {
      throw new Error("Falha ao buscar notificação atualizada");
    }
    return updated;
  }

  /**
   * Usuários que já receberam uma notificação de um dado tipo+entidade hoje.
   * Usado pelos jobs de lembrete (cron) pra evitar reenvio duplicado se o
   * job rodar mais de uma vez no mesmo dia.
   */
  async findUsuariosNotificadosHoje(notificacaoTipoId: number, entidadeGUID: string): Promise<string[]> {
    console.log("🟢 NotificacaoDAO.findUsuariosNotificadosHoje()");

    const query = `
      SELECT UsuarioCPF FROM notificacao
      WHERE NotificacaoTipoId = ?
        AND NotificacaoEntidadeGUID = ?
        AND DATE(NotificacaoCreatedAt) = CURDATE()
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [notificacaoTipoId, entidadeGUID]);

    return (rows as any[]).map((row) => row.UsuarioCPF);
  }

  async marcarTodasComoLidas(usuarioCPF: string): Promise<number> {
    console.log("🟢 NotificacaoDAO.marcarTodasComoLidas()");

    const query = `
      UPDATE notificacao
      SET NotificacaoLida = 1, NotificacaoLidaData = NOW()
      WHERE UsuarioCPF = ? AND NotificacaoLida = 0
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [usuarioCPF]);

    return result.affectedRows;
  }

  #mapRowToNotificacao(row: RowDataPacket): Notificacao {
    return Notificacao.fromPlainObject({
      NotificacaoGUID: row.NotificacaoGUID,
      NotificacaoTipoId: row.NotificacaoTipoId,
      UsuarioCPF: row.UsuarioCPF,
      EscolaGUID: row.EscolaGUID,
      NotificacaoTitulo: row.NotificacaoTitulo,
      NotificacaoConteudo: row.NotificacaoConteudo,
      NotificacaoEntidadeTipo: row.NotificacaoEntidadeTipo,
      NotificacaoEntidadeGUID: row.NotificacaoEntidadeGUID,
      NotificacaoLink: row.NotificacaoLink,
      NotificacaoLida: Boolean(row.NotificacaoLida),
      NotificacaoLidaData: row.NotificacaoLidaData,
      NotificacaoCreatedAt: row.NotificacaoCreatedAt,
    });
  }
}
