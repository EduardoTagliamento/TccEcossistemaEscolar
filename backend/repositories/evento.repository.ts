/**
 * 🟢 Repository - Evento
 * 
 * Camada de acesso a dados para eventos escolares.
 * 
 * Métodos:
 * - create: Inserir novo evento
 * - findAll: Listar eventos com filtros
 * - findById: Buscar evento por GUID
 * - update: Atualizar evento
 * - delete: Excluir evento (soft delete - marca como Cancelado)
 */

import MysqlDatabase from "../database/MysqlDatabase";
import Evento from "../entities/evento.model";
import { ResultSetHeader, RowDataPacket } from "mysql2";

/**
 * Interface de filtros para listagem
 */
export interface EventoFilters {
  EscolaGUID?: string;
  EventoStatus?: "Agendado" | "Realizado" | "Cancelado";
  dataInicio?: Date;
  dataFim?: Date;
  limit?: number;
  offset?: number;
}

/**
 * DAO de Evento
 */
export class EventoDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log("🟢 EventoDAO.constructor()");
    this.#database = database;
  }

  /**
   * CREATE - Inserir novo evento
   */
  async create(evento: Evento): Promise<Evento> {
    console.log("🟢 EventoDAO.create()");

    const query = `
      INSERT INTO evento (
        EventoGUID,
        EscolaGUID,
        EventoTitulo,
        EventoDescricao,
        EventoData,
        EventoStatus
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      evento.EventoGUID,
      evento.EscolaGUID,
      evento.EventoTitulo,
      evento.EventoDescricao,
      evento.EventoData,
      evento.EventoStatus
    ];

    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, params);

    // Buscar e retornar o evento criado
    const created = await this.findById(evento.EventoGUID);
    if (!created) {
      throw new Error("Falha ao criar evento");
    }

    return created;
  }

  /**
   * FIND BY ID - Buscar evento por GUID
   */
  async findById(guid: string): Promise<Evento | null> {
    console.log("🟢 EventoDAO.findById()");

    const query = `
      SELECT
        EventoGUID,
        EscolaGUID,
        EventoTitulo,
        EventoDescricao,
        EventoData,
        EventoStatus,
        EventoCreatedAt,
        EventoUpdatedAt
      FROM evento
      WHERE EventoGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [guid]);

    if (rows.length === 0) {
      return null;
    }

    return this.#mapRowToEvento(rows[0]);
  }

  /**
   * FIND ALL - Listar eventos com filtros opcionais
   */
  async findAll(filters: EventoFilters = {}): Promise<Evento[]> {
    console.log("🟢 EventoDAO.findAll()");

    let query = `
      SELECT
        EventoGUID,
        EscolaGUID,
        EventoTitulo,
        EventoDescricao,
        EventoData,
        EventoStatus,
        EventoCreatedAt,
        EventoUpdatedAt
      FROM evento
      WHERE 1=1
    `;

    const params: any[] = [];

    // Filtro por escola
    if (filters.EscolaGUID) {
      query += ` AND EscolaGUID = ?`;
      params.push(filters.EscolaGUID);
    }

    // Filtro por status
    if (filters.EventoStatus) {
      query += ` AND EventoStatus = ?`;
      params.push(filters.EventoStatus);
    }

    // Filtro por data de início
    if (filters.dataInicio) {
      query += ` AND EventoData >= ?`;
      params.push(filters.dataInicio);
    }

    // Filtro por data de fim
    if (filters.dataFim) {
      query += ` AND EventoData <= ?`;
      params.push(filters.dataFim);
    }

    // Ordenação
    query += ` ORDER BY EventoData ASC`;

    // Paginação
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

    return (rows as any[]).map((row: any) => this.#mapRowToEvento(row));
  }

  /**
   * UPDATE - Atualizar evento
   */
  async update(guid: string, data: Partial<Evento>): Promise<Evento> {
    console.log("🟢 EventoDAO.update()");

    const allowedFields = [
      "EventoTitulo",
      "EventoDescricao",
      "EventoData",
      "EventoStatus"
    ];

    const updates: string[] = [];
    const params: any[] = [];

    // Adicionar campos permitidos para atualização
    for (const field of allowedFields) {
      if ((data as any)[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push((data as any)[field]);
      }
    }

    if (updates.length === 0) {
      throw new Error("Nenhum campo válido para atualizar");
    }

    // Adicionar UpdatedAt automático
    updates.push("EventoUpdatedAt = NOW()");

    const query = `
      UPDATE evento
      SET ${updates.join(", ")}
      WHERE EventoGUID = ?
    `;

    params.push(guid);

    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, params);

    if (result.affectedRows === 0) {
      throw new Error("Evento não encontrado");
    }

    // Buscar e retornar o evento atualizado
    const updated = await this.findById(guid);
    if (!updated) {
      throw new Error("Falha ao buscar evento atualizado");
    }

    return updated;
  }

  /**
   * DELETE - Excluir evento (soft delete - marca como Cancelado)
   */
  async delete(guid: string): Promise<boolean> {
    console.log("🟢 EventoDAO.delete()");

    const query = `
      UPDATE evento
      SET EventoStatus = 'Cancelado', EventoUpdatedAt = NOW()
      WHERE EventoGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [guid]);

    return result.affectedRows > 0;
  }

  /**
   * Mapper: Row SQL → Entidade Evento
   */
  #mapRowToEvento(row: any): Evento {
    return Evento.fromPlainObject({
      EventoGUID: row.EventoGUID,
      EscolaGUID: row.EscolaGUID,
      EventoTitulo: row.EventoTitulo,
      EventoDescricao: row.EventoDescricao,
      EventoData: row.EventoData,
      EventoStatus: row.EventoStatus,
      EventoCreatedAt: row.EventoCreatedAt,
      EventoUpdatedAt: row.EventoUpdatedAt
    });
  }
}
