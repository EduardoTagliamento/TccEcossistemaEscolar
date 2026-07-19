/**
 * 🔔 Repository (DAO) - UsuarioNotificacaoPreferencia
 *
 * Override esparso das preferências de canal por tipo de notificação.
 */

import MysqlDatabase from "../database/MysqlDatabase";
import UsuarioNotificacaoPreferencia from "../entities/usuarionotificacaopreferencia.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export class UsuarioNotificacaoPreferenciaDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log("🟢 UsuarioNotificacaoPreferenciaDAO.constructor()");
    this.#database = database;
  }

  async findByUsuario(usuarioCPF: string): Promise<UsuarioNotificacaoPreferencia[]> {
    console.log("🟢 UsuarioNotificacaoPreferenciaDAO.findByUsuario()");

    const query = `
      SELECT UsuarioCPF, NotificacaoTipoId, PreferenciaEmailAtivo, PreferenciaWhatsappAtivo, UpdatedAt
      FROM usuarionotificacaopreferencia
      WHERE UsuarioCPF = ?
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [usuarioCPF]);

    return rows.map((row) => this.#mapRowToPreferencia(row));
  }

  async findByUsuarioETipo(usuarioCPF: string, tipoId: number): Promise<UsuarioNotificacaoPreferencia | null> {
    console.log("🟢 UsuarioNotificacaoPreferenciaDAO.findByUsuarioETipo()");

    const query = `
      SELECT UsuarioCPF, NotificacaoTipoId, PreferenciaEmailAtivo, PreferenciaWhatsappAtivo, UpdatedAt
      FROM usuarionotificacaopreferencia
      WHERE UsuarioCPF = ? AND NotificacaoTipoId = ?
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [usuarioCPF, tipoId]);

    if (rows.length === 0) {
      return null;
    }
    return this.#mapRowToPreferencia(rows[0]);
  }

  async upsert(preferencia: UsuarioNotificacaoPreferencia): Promise<UsuarioNotificacaoPreferencia> {
    console.log("🟢 UsuarioNotificacaoPreferenciaDAO.upsert()");

    const query = `
      INSERT INTO usuarionotificacaopreferencia
        (UsuarioCPF, NotificacaoTipoId, PreferenciaEmailAtivo, PreferenciaWhatsappAtivo)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        PreferenciaEmailAtivo = VALUES(PreferenciaEmailAtivo),
        PreferenciaWhatsappAtivo = VALUES(PreferenciaWhatsappAtivo)
    `;

    const params = [
      preferencia.UsuarioCPF,
      preferencia.NotificacaoTipoId,
      preferencia.PreferenciaEmailAtivo ? 1 : 0,
      preferencia.PreferenciaWhatsappAtivo ? 1 : 0,
    ];

    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, params);

    const atualizado = await this.findByUsuarioETipo(preferencia.UsuarioCPF, preferencia.NotificacaoTipoId);
    if (!atualizado) {
      throw new Error("Falha ao salvar preferência de notificação");
    }
    return atualizado;
  }

  #mapRowToPreferencia(row: RowDataPacket): UsuarioNotificacaoPreferencia {
    return UsuarioNotificacaoPreferencia.fromPlainObject({
      UsuarioCPF: row.UsuarioCPF,
      NotificacaoTipoId: row.NotificacaoTipoId,
      PreferenciaEmailAtivo: Boolean(row.PreferenciaEmailAtivo),
      PreferenciaWhatsappAtivo: Boolean(row.PreferenciaWhatsappAtivo),
      UpdatedAt: row.UpdatedAt,
    });
  }
}
