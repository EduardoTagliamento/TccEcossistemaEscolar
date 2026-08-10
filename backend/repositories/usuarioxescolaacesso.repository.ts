/**
 * 🟢 Repository (DAO) - UsuarioxEscolaAcesso
 *
 * "Último acesso do usuário na escola" — NÃO é registro de auditoria (não
 * é imutável): um único timestamp por usuário+escola, sobrescrito a cada
 * acesso, com throttle de 1 hora pra evitar UPDATE a cada refresh de
 * página (ver docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md, Seção 3.4).
 */

import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export class UsuarioxEscolaAcessoDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log("🟢 UsuarioxEscolaAcessoDAO.constructor()");
    this.#database = database;
  }

  /**
   * Upsert com throttle: só atualiza UltimoAcessoEm se já passou mais de
   * 1 hora desde o último registro, evitando UPDATE a cada refresh.
   */
  async upsert(usuarioGUID: string, escolaGUID: string): Promise<void> {
    console.log("🟢 UsuarioxEscolaAcessoDAO.upsert()");

    const query = `
      INSERT INTO usuarioxescolaacesso (UsuarioGUID, EscolaGUID, UltimoAcessoEm)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        UltimoAcessoEm = IF(UltimoAcessoEm < NOW() - INTERVAL 1 HOUR, VALUES(UltimoAcessoEm), UltimoAcessoEm)
    `;

    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, [usuarioGUID, escolaGUID]);
  }

  /** EscolaGUID → UltimoAcessoEm, pra uso em GET /api/usuario/:cpf/escolas */
  async findByUsuario(usuarioGUID: string): Promise<Map<string, Date>> {
    console.log("🟢 UsuarioxEscolaAcessoDAO.findByUsuario()");

    const query = `SELECT EscolaGUID, UltimoAcessoEm FROM usuarioxescolaacesso WHERE UsuarioGUID = ?`;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [usuarioGUID]);

    return new Map(rows.map((row) => [row.EscolaGUID as string, new Date(row.UltimoAcessoEm)]));
  }

  /** UsuarioGUID → UltimoAcessoEm, pra uso em GET /api/escolaxusuarioxfuncao?EscolaGUID= */
  async findByEscola(escolaGUID: string): Promise<Map<string, Date>> {
    console.log("🟢 UsuarioxEscolaAcessoDAO.findByEscola()");

    const query = `SELECT UsuarioGUID, UltimoAcessoEm FROM usuarioxescolaacesso WHERE EscolaGUID = ?`;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [escolaGUID]);

    return new Map(rows.map((row) => [row.UsuarioGUID as string, new Date(row.UltimoAcessoEm)]));
  }
}
