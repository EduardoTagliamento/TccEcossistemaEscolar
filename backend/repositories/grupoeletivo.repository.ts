import GrupoEletivo from "../entities/grupoeletivo.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

/**
 * Filtros para consulta de grupos eletivos
 */
export interface GrupoEletivoFilters {
  EscolaGUID?: string;
  GrupoEletivoStatus?: 'Ativo' | 'Inativo';
}

/**
 * Interface de mapeamento para rows do MySQL
 */
interface GrupoEletivoRow extends RowDataPacket {
  GrupoEletivoGUID: string;
  EscolaGUID: string;
  GrupoEletivoNome: string;
  GrupoEletivoStatus: 'Ativo' | 'Inativo';
  CreatedAt: Date;
  UpdatedAt: Date;
}

/**
 * Repository (DAO) para a entidade GrupoEletivo
 *
 * Responsabilidades:
 * - CRUD completo na tabela `grupoeletivo`
 * - Conversão entre rows do MySQL e objetos GrupoEletivo
 *
 * Ver docs/PLANO_IMPLEMENTACAO_GRUPO_ELETIVO.md — membros (matrículas-sombra)
 * são geridos por MatriculaDAO.criarMatriculaEletiva/removerMatriculaEletiva/
 * findMembrosByGrupoEletivo, não por este repository.
 */
export class GrupoEletivoDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    this.#database = database;
  }

  async create(grupo: GrupoEletivo): Promise<GrupoEletivo> {
    const query = `
      INSERT INTO grupoeletivo (
        GrupoEletivoGUID,
        EscolaGUID,
        GrupoEletivoNome,
        GrupoEletivoStatus,
        CreatedAt,
        UpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      grupo.GrupoEletivoGUID,
      grupo.EscolaGUID,
      grupo.GrupoEletivoNome,
      grupo.GrupoEletivoStatus,
      grupo.CreatedAt,
      grupo.UpdatedAt,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(query, params);
    return grupo;
  }

  async findAll(filters?: GrupoEletivoFilters): Promise<GrupoEletivo[]> {
    let query = `SELECT * FROM grupoeletivo WHERE 1=1`;
    const params: any[] = [];

    if (filters?.EscolaGUID) {
      query += ` AND EscolaGUID = ?`;
      params.push(filters.EscolaGUID);
    }

    if (filters?.GrupoEletivoStatus) {
      query += ` AND GrupoEletivoStatus = ?`;
      params.push(filters.GrupoEletivoStatus);
    }

    query += ` ORDER BY GrupoEletivoNome ASC`;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, params);
    return this.mapRows(rows as GrupoEletivoRow[]);
  }

  async findById(grupoEletivoGUID: string): Promise<GrupoEletivo | null> {
    const query = `SELECT * FROM grupoeletivo WHERE GrupoEletivoGUID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [grupoEletivoGUID]);

    if (!rows || (rows as GrupoEletivoRow[]).length === 0) {
      return null;
    }

    return this.mapRows(rows as GrupoEletivoRow[])[0];
  }

  async findByEscolaAndNome(escolaGUID: string, nome: string): Promise<GrupoEletivo | null> {
    const query = `
      SELECT * FROM grupoeletivo
      WHERE EscolaGUID = ?
        AND GrupoEletivoNome = ?
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(query, [escolaGUID, nome]);

    if (!rows || (rows as GrupoEletivoRow[]).length === 0) {
      return null;
    }

    return this.mapRows(rows as GrupoEletivoRow[])[0];
  }

  async update(
    grupoEletivoGUID: string,
    updates: Partial<Pick<GrupoEletivo, 'GrupoEletivoNome' | 'GrupoEletivoStatus'>>
  ): Promise<GrupoEletivo | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.GrupoEletivoNome !== undefined) {
      fields.push('GrupoEletivoNome = ?');
      params.push(updates.GrupoEletivoNome);
    }

    if (updates.GrupoEletivoStatus !== undefined) {
      fields.push('GrupoEletivoStatus = ?');
      params.push(updates.GrupoEletivoStatus);
    }

    fields.push('UpdatedAt = ?');
    params.push(new Date());

    if (fields.length === 1) {
      return this.findById(grupoEletivoGUID);
    }

    params.push(grupoEletivoGUID);

    const query = `
      UPDATE grupoeletivo
      SET ${fields.join(', ')}
      WHERE GrupoEletivoGUID = ?
    `;

    const pool = await this.#database.getPool();
    await pool.execute(query, params);
    return this.findById(grupoEletivoGUID);
  }

  /** Soft delete: muda status para Inativo */
  async delete(grupoEletivoGUID: string): Promise<boolean> {
    const query = `
      UPDATE grupoeletivo
      SET GrupoEletivoStatus = 'Inativo',
          UpdatedAt = ?
      WHERE GrupoEletivoGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(query, [new Date(), grupoEletivoGUID]);

    return (result as ResultSetHeader).affectedRows > 0;
  }

  private mapRows(rows: GrupoEletivoRow[]): GrupoEletivo[] {
    return rows.map((row) => {
      const grupo = new GrupoEletivo();
      grupo.GrupoEletivoGUID = row.GrupoEletivoGUID;
      grupo.EscolaGUID = row.EscolaGUID;
      grupo.GrupoEletivoNome = row.GrupoEletivoNome;
      grupo.GrupoEletivoStatus = row.GrupoEletivoStatus;
      grupo.CreatedAt = row.CreatedAt;
      grupo.UpdatedAt = row.UpdatedAt;
      return grupo;
    });
  }
}
