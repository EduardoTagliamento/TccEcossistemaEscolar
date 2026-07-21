/**
 * 🟢 Repository (DAO) - CategoriaAuditoria
 *
 * Catálogo estático de categorias de sensibilidade/retenção do Registro de
 * Auditoria.
 */

import MysqlDatabase from "../database/MysqlDatabase";
import CategoriaAuditoria from "../entities/categoriaauditoria.model";
import { RowDataPacket } from "mysql2";

export class CategoriaAuditoriaDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log("🟢 CategoriaAuditoriaDAO.constructor()");
    this.#database = database;
  }

  async findAll(): Promise<CategoriaAuditoria[]> {
    console.log("🟢 CategoriaAuditoriaDAO.findAll()");

    const query = `
      SELECT CategoriaAuditoriaId, CategoriaAuditoriaNome, CategoriaAuditoriaRetencaoDias, CategoriaAuditoriaDescricao
      FROM categoriaauditoria
      ORDER BY CategoriaAuditoriaId ASC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query);

    return rows.map((row) => this.#mapRowToCategoria(row));
  }

  async findById(categoriaAuditoriaId: number): Promise<CategoriaAuditoria | null> {
    console.log("🟢 CategoriaAuditoriaDAO.findById()");

    const query = `
      SELECT CategoriaAuditoriaId, CategoriaAuditoriaNome, CategoriaAuditoriaRetencaoDias, CategoriaAuditoriaDescricao
      FROM categoriaauditoria
      WHERE CategoriaAuditoriaId = ?
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [categoriaAuditoriaId]);

    if (rows.length === 0) {
      return null;
    }
    return this.#mapRowToCategoria(rows[0]);
  }

  #mapRowToCategoria(row: RowDataPacket): CategoriaAuditoria {
    return CategoriaAuditoria.fromPlainObject({
      CategoriaAuditoriaId: row.CategoriaAuditoriaId,
      CategoriaAuditoriaNome: row.CategoriaAuditoriaNome,
      CategoriaAuditoriaRetencaoDias: row.CategoriaAuditoriaRetencaoDias,
      CategoriaAuditoriaDescricao: row.CategoriaAuditoriaDescricao,
    });
  }
}
