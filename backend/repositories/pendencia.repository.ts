/**
 * 📦 Repository (DAO) - Pendência
 * 
 * Responsável por todas as operações de banco de dados da tabela `pendencia`.
 * 
 * Métodos:
 * - create: INSERT
 * - findById: SELECT por GUID
 * - findAll: SELECT com filtros opcionais
 * - update: UPDATE
 * - delete: DELETE (lógico ou físico)
 * - marcarComoFeito: UPDATE PendenciaFeito e PendenciaRealizacaoData
 * - contarPendentes: COUNT pendências não concluídas
 */

import MysqlDatabase from "../database/MysqlDatabase";
import Pendencia from "../entities/pendencia.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

/**
 * Filtros para busca de pendências
 */
export interface PendenciaFilters {
  UsuarioCPF?: string;
  EscolaGUID?: string;
  PendenciaFeito?: boolean;
  atrasadas?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * DAO de Pendência
 */
export class PendenciaDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log("🟢 PendenciaDAO.constructor()");
    this.#database = database;
  }

  /**
   * CREATE - Inserir nova pendência
   */
  async create(pendencia: Pendencia): Promise<Pendencia> {
    console.log("🟢 PendenciaDAO.create()");

    const query = `
      INSERT INTO pendencia (
        PendenciaGUID,
        UsuarioCPF,
        EscolaGUID,
        PendenciaTitulo,
        PendenciaConteudo,
        PendenciaPostagemData,
        PendenciaPrazoData,
        PendenciaFeito,
        PendenciaRealizacaoData
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      pendencia.PendenciaGUID,
      pendencia.UsuarioCPF,
      pendencia.EscolaGUID,
      pendencia.PendenciaTitulo,
      pendencia.PendenciaConteudo,
      pendencia.PendenciaPostagemData,
      pendencia.PendenciaPrazoData,
      pendencia.PendenciaFeito ? 1 : 0,
      pendencia.PendenciaRealizacaoData
    ];

    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, params);

    // Buscar e retornar a pendência criada
    const created = await this.findById(pendencia.PendenciaGUID);
    if (!created) {
      throw new Error("Falha ao criar pendência");
    }

    return created;
  }

  /**
   * FIND BY ID - Buscar pendência por GUID
   */
  async findById(guid: string): Promise<Pendencia | null> {
    console.log("🟢 PendenciaDAO.findById()");

    const query = `
      SELECT 
        PendenciaGUID,
        UsuarioCPF,
        EscolaGUID,
        PendenciaTitulo,
        PendenciaConteudo,
        PendenciaPostagemData,
        PendenciaPrazoData,
        PendenciaFeito,
        PendenciaRealizacaoData,
        PendenciaCreatedAt,
        PendenciaUpdatedAt
      FROM pendencia
      WHERE PendenciaGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [guid]);

    if (rows.length === 0) {
      return null;
    }

    return this.#mapRowToPendencia(rows[0]);
  }

  /**
   * FIND ALL - Buscar pendências com filtros opcionais
   */
  async findAll(filters: PendenciaFilters = {}): Promise<Pendencia[]> {
    console.log("🟢 PendenciaDAO.findAll()");

    let query = `
      SELECT 
        PendenciaGUID,
        UsuarioCPF,
        EscolaGUID,
        PendenciaTitulo,
        PendenciaConteudo,
        PendenciaPostagemData,
        PendenciaPrazoData,
        PendenciaFeito,
        PendenciaRealizacaoData,
        PendenciaCreatedAt,
        PendenciaUpdatedAt
      FROM pendencia
      WHERE 1=1
    `;

    const params: any[] = [];

    // Filtro por usuário
    if (filters.UsuarioCPF) {
      query += ` AND UsuarioCPF = ?`;
      params.push(filters.UsuarioCPF);
    }

    // Filtro por escola
    if (filters.EscolaGUID) {
      query += ` AND EscolaGUID = ?`;
      params.push(filters.EscolaGUID);
    }

    // Filtro por status (feito/não feito)
    if (filters.PendenciaFeito !== undefined) {
      query += ` AND PendenciaFeito = ?`;
      params.push(filters.PendenciaFeito ? 1 : 0);
    }

    // Filtro por pendências atrasadas
    if (filters.atrasadas === true) {
      query += ` AND PendenciaFeito = 0 AND PendenciaPrazoData < NOW()`;
    }

    // Ordenar por prazo (mais urgente primeiro)
    query += ` ORDER BY PendenciaPrazoData ASC, PendenciaPostagemData DESC`;

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

    return (rows as any[]).map((row: any) => this.#mapRowToPendencia(row));
  }

  /**
   * UPDATE - Atualizar pendência
   */
  async update(guid: string, data: Partial<Pendencia>): Promise<Pendencia> {
    console.log("🟢 PendenciaDAO.update()");

    const allowedFields = [
      'PendenciaTitulo',
      'PendenciaConteudo',
      'PendenciaPrazoData',
      'PendenciaFeito',
      'PendenciaRealizacaoData'
    ];

    const updates: string[] = [];
    const params: any[] = [];

    // Construir SET dinamicamente
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        
        // Converter booleanos para 0/1
        if (key === 'PendenciaFeito') {
          params.push(value ? 1 : 0);
        } else {
          params.push(value);
        }
      }
    }

    if (updates.length === 0) {
      throw new Error("Nenhum campo válido para atualizar");
    }

    // Adicionar UpdatedAt automático
    updates.push('PendenciaUpdatedAt = NOW()');

    const query = `
      UPDATE pendencia
      SET ${updates.join(', ')}
      WHERE PendenciaGUID = ?
    `;

    params.push(guid);

    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, params);

    if (result.affectedRows === 0) {
      throw new Error("Pendência não encontrada");
    }

    // Buscar e retornar a pendência atualizada
    const updated = await this.findById(guid);
    if (!updated) {
      throw new Error("Falha ao buscar pendência atualizada");
    }

    return updated;
  }

  /**
   * DELETE - Excluir pendência
   */
  async delete(guid: string): Promise<boolean> {
    console.log("🟢 PendenciaDAO.delete()");

    const query = `
      DELETE FROM pendencia
      WHERE PendenciaGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [guid]);

    return result.affectedRows > 0;
  }

  /**
   * MARCAR COMO FEITO - Atualizar status e data de realização
   */
  async marcarComoFeito(guid: string): Promise<Pendencia> {
    console.log("🟢 PendenciaDAO.marcarComoFeito()");

    const query = `
      UPDATE pendencia
      SET 
        PendenciaFeito = 1,
        PendenciaRealizacaoData = NOW(),
        PendenciaUpdatedAt = NOW()
      WHERE PendenciaGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [guid]);

    if (result.affectedRows === 0) {
      throw new Error("Pendência não encontrada");
    }

    // Buscar e retornar a pendência atualizada
    const updated = await this.findById(guid);
    if (!updated) {
      throw new Error("Falha ao buscar pendência atualizada");
    }

    return updated;
  }

  /**
   * CONTAR PENDENTES - Contar pendências não concluídas por usuário
   */
  async contarPendentes(usuarioCPF: string, escolaGUID?: string): Promise<number> {
    console.log("🟢 PendenciaDAO.contarPendentes()");

    let query = `
      SELECT COUNT(*) as total
      FROM pendencia
      WHERE UsuarioCPF = ? AND PendenciaFeito = 0
    `;

    const params: any[] = [usuarioCPF];

    if (escolaGUID) {
      query += ` AND EscolaGUID = ?`;
      params.push(escolaGUID);
    }

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    return (rows as any)[0]?.total || 0;
  }

  /**
   * CONTAR ATRASADAS - Contar pendências atrasadas por usuário
   */
  async contarAtrasadas(usuarioCPF: string, escolaGUID?: string): Promise<number> {
    console.log("🟢 PendenciaDAO.contarAtrasadas()");

    let query = `
      SELECT COUNT(*) as total
      FROM pendencia
      WHERE UsuarioCPF = ? 
        AND PendenciaFeito = 0
        AND PendenciaPrazoData < NOW()
    `;

    const params: any[] = [usuarioCPF];

    if (escolaGUID) {
      query += ` AND EscolaGUID = ?`;
      params.push(escolaGUID);
    }

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    return (rows as any)[0]?.total || 0;
  }

  /**
   * Mapper: Row SQL → Entidade Pendencia
   */
  #mapRowToPendencia(row: RowDataPacket): Pendencia {
    return Pendencia.fromPlainObject({
      PendenciaGUID: row.PendenciaGUID,
      UsuarioCPF: row.UsuarioCPF,
      EscolaGUID: row.EscolaGUID,
      PendenciaTitulo: row.PendenciaTitulo,
      PendenciaConteudo: row.PendenciaConteudo,
      PendenciaPostagemData: row.PendenciaPostagemData,
      PendenciaPrazoData: row.PendenciaPrazoData,
      PendenciaFeito: Boolean(row.PendenciaFeito),
      PendenciaRealizacaoData: row.PendenciaRealizacaoData,
      PendenciaCreatedAt: row.PendenciaCreatedAt,
      PendenciaUpdatedAt: row.PendenciaUpdatedAt
    });
  }
}
