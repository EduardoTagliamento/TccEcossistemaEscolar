/**
 * 🔔 Repository (DAO) - NotificacaoEnvio
 *
 * Auditoria/idempotência de envio por canal (email/whatsapp). Tabela de
 * alto volume relativo — sem entidade validada, é só rastro operacional
 * (ver docs/PLANO_IMPLEMENTACAO_NOTIFICACOES.md, seção 2.4 e 7).
 */

import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export type NotificacaoEnvioCanal = "Email" | "Whatsapp";
export type NotificacaoEnvioStatus = "Pendente" | "Enviado" | "Falhou";

export interface NotificacaoEnvioRow {
  NotificacaoEnvioId: number;
  NotificacaoGUID: string;
  NotificacaoEnvioCanal: NotificacaoEnvioCanal;
  NotificacaoEnvioStatus: NotificacaoEnvioStatus;
  NotificacaoEnvioProviderId: string | null;
  NotificacaoEnvioErro: string | null;
  NotificacaoEnvioTentativas: number;
  NotificacaoEnvioEnviadoData: Date | null;
  CreatedAt: Date;
}

export class NotificacaoEnvioDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log("🟢 NotificacaoEnvioDAO.constructor()");
    this.#database = database;
  }

  /**
   * Cria a linha em estado Pendente. Se já existir um envio para esse
   * NotificacaoGUID+canal (UNIQUE KEY), retorna null em vez de lançar erro —
   * é assim que a idempotência anti-duplicidade é garantida.
   */
  async criarPendente(notificacaoGUID: string, canal: NotificacaoEnvioCanal): Promise<number | null> {
    console.log("🟢 NotificacaoEnvioDAO.criarPendente()");

    const query = `
      INSERT IGNORE INTO notificacaoenvio (NotificacaoGUID, NotificacaoEnvioCanal, NotificacaoEnvioStatus)
      VALUES (?, ?, 'Pendente')
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [notificacaoGUID, canal]);

    return result.affectedRows > 0 ? result.insertId : null;
  }

  async marcarEnviado(id: number, providerId: string | null): Promise<void> {
    console.log("🟢 NotificacaoEnvioDAO.marcarEnviado()");

    const query = `
      UPDATE notificacaoenvio
      SET NotificacaoEnvioStatus = 'Enviado',
          NotificacaoEnvioProviderId = ?,
          NotificacaoEnvioEnviadoData = NOW(),
          NotificacaoEnvioTentativas = NotificacaoEnvioTentativas + 1
      WHERE NotificacaoEnvioId = ?
    `;

    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, [providerId, id]);
  }

  async marcarFalhou(id: number, erro: string): Promise<void> {
    console.log("🟢 NotificacaoEnvioDAO.marcarFalhou()");

    const query = `
      UPDATE notificacaoenvio
      SET NotificacaoEnvioStatus = 'Falhou',
          NotificacaoEnvioErro = ?,
          NotificacaoEnvioTentativas = NotificacaoEnvioTentativas + 1
      WHERE NotificacaoEnvioId = ?
    `;

    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, [erro.substring(0, 255), id]);
  }

  async findByNotificacao(notificacaoGUID: string): Promise<NotificacaoEnvioRow[]> {
    console.log("🟢 NotificacaoEnvioDAO.findByNotificacao()");

    const query = `
      SELECT NotificacaoEnvioId, NotificacaoGUID, NotificacaoEnvioCanal, NotificacaoEnvioStatus,
        NotificacaoEnvioProviderId, NotificacaoEnvioErro, NotificacaoEnvioTentativas,
        NotificacaoEnvioEnviadoData, CreatedAt
      FROM notificacaoenvio
      WHERE NotificacaoGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [notificacaoGUID]);

    return rows as unknown as NotificacaoEnvioRow[];
  }
}
