/**
 * 🟢 Repository (DAO) - RegistroAuditoria
 *
 * Tabela de fatos do Registro de Auditoria (ver
 * docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md, Seção 3.2/4/5).
 */

import MysqlDatabase from "../database/MysqlDatabase";
import RegistroAuditoria, { AcaoAuditoriaTipo } from "../entities/registroauditoria.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

const LIMIT_PADRAO = 50;
const LIMIT_MAXIMO = 100;

export interface RegistroAuditoriaFilters {
  EscolaGUID: string;
  UsuarioCPFAtor?: string;
  AcaoTipo?: AcaoAuditoriaTipo;
  EntidadeTipo?: string;
  CategoriaAuditoriaId?: number;
  dataInicio?: string; // ISO date/datetime, inclusive
  dataFim?: string; // ISO date/datetime, inclusive
  limit?: number;
  offset?: number;
}

export class RegistroAuditoriaDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log("🟢 RegistroAuditoriaDAO.constructor()");
    this.#database = database;
  }

  async create(registro: RegistroAuditoria): Promise<RegistroAuditoria> {
    console.log("🟢 RegistroAuditoriaDAO.create()");

    const query = `
      INSERT INTO registroauditoria (
        RegistroAuditoriaGUID, EscolaGUID, UsuarioCPFAtor, AcaoTipo,
        EntidadeTipo, EntidadeGUID, EntidadeDescricao, CategoriaAuditoriaId, CreatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      registro.RegistroAuditoriaGUID,
      registro.EscolaGUID,
      registro.UsuarioCPFAtor,
      registro.AcaoTipo,
      registro.EntidadeTipo,
      registro.EntidadeGUID,
      registro.EntidadeDescricao,
      registro.CategoriaAuditoriaId,
      registro.CreatedAt,
    ];

    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, params);

    const created = await this.findById(registro.RegistroAuditoriaGUID);
    if (!created) {
      throw new Error("Falha ao criar registro de auditoria");
    }
    return created;
  }

  async findById(guid: string): Promise<RegistroAuditoria | null> {
    console.log("🟢 RegistroAuditoriaDAO.findById()");

    const query = `
      SELECT RegistroAuditoriaGUID, EscolaGUID, UsuarioCPFAtor, AcaoTipo,
        EntidadeTipo, EntidadeGUID, EntidadeDescricao, CategoriaAuditoriaId, CreatedAt
      FROM registroauditoria
      WHERE RegistroAuditoriaGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [guid]);

    if (rows.length === 0) {
      return null;
    }
    return this.#mapRowToRegistro(rows[0]);
  }

  async findAll(filters: RegistroAuditoriaFilters): Promise<RegistroAuditoria[]> {
    console.log("🟢 RegistroAuditoriaDAO.findAll()");

    let query = `
      SELECT RegistroAuditoriaGUID, EscolaGUID, UsuarioCPFAtor, AcaoTipo,
        EntidadeTipo, EntidadeGUID, EntidadeDescricao, CategoriaAuditoriaId, CreatedAt
      FROM registroauditoria
      WHERE EscolaGUID = ?
    `;
    const params: any[] = [filters.EscolaGUID];

    if (filters.UsuarioCPFAtor) {
      query += ` AND UsuarioCPFAtor = ?`;
      params.push(filters.UsuarioCPFAtor);
    }
    if (filters.AcaoTipo) {
      query += ` AND AcaoTipo = ?`;
      params.push(filters.AcaoTipo);
    }
    if (filters.EntidadeTipo) {
      query += ` AND EntidadeTipo = ?`;
      params.push(filters.EntidadeTipo);
    }
    if (filters.CategoriaAuditoriaId !== undefined) {
      query += ` AND CategoriaAuditoriaId = ?`;
      params.push(filters.CategoriaAuditoriaId);
    }
    if (filters.dataInicio) {
      query += ` AND CreatedAt >= ?`;
      params.push(filters.dataInicio);
    }
    if (filters.dataFim) {
      query += ` AND CreatedAt <= ?`;
      params.push(filters.dataFim);
    }

    query += ` ORDER BY CreatedAt DESC`;

    const limit = Math.min(filters.limit && filters.limit > 0 ? filters.limit : LIMIT_PADRAO, LIMIT_MAXIMO);
    query += ` LIMIT ?`;
    params.push(limit);

    if (filters.offset) {
      query += ` OFFSET ?`;
      params.push(filters.offset);
    }

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    return rows.map((row) => this.#mapRowToRegistro(row));
  }

  /**
   * Expurgo por retenção (Seção 4, regra 9) — exclusão física (sem soft
   * delete) dos registros de uma categoria mais antigos que sua própria
   * retenção. Usado pelo AuditoriaScheduler.
   */
  async deleteExpiradosPorCategoria(categoriaAuditoriaId: number, retencaoDias: number): Promise<number> {
    console.log("🟢 RegistroAuditoriaDAO.deleteExpiradosPorCategoria()");

    const query = `
      DELETE FROM registroauditoria
      WHERE CategoriaAuditoriaId = ?
        AND CreatedAt < NOW() - INTERVAL ? DAY
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [categoriaAuditoriaId, retencaoDias]);

    return result.affectedRows;
  }

  #mapRowToRegistro(row: RowDataPacket): RegistroAuditoria {
    return RegistroAuditoria.fromPlainObject({
      RegistroAuditoriaGUID: row.RegistroAuditoriaGUID,
      EscolaGUID: row.EscolaGUID,
      UsuarioCPFAtor: row.UsuarioCPFAtor,
      AcaoTipo: row.AcaoTipo,
      EntidadeTipo: row.EntidadeTipo,
      EntidadeGUID: row.EntidadeGUID,
      EntidadeDescricao: row.EntidadeDescricao,
      CategoriaAuditoriaId: row.CategoriaAuditoriaId,
      CreatedAt: row.CreatedAt,
    });
  }
}
