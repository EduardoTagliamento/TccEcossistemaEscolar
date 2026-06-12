/**
 * Repository: Figurinhas
 * Camada de acesso a dados para figurinhas
 */

import { pool } from "../../database/mysql";
import { CopaFigurinha, TipoFigurinha } from "../../entities/copa/CopaFigurinha";
import { RowDataPacket } from "mysql2";

export class FigurinhaRepository {
  /**
   * Buscar todas as figurinhas
   */
  async buscarTodas(): Promise<CopaFigurinha[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM copa_figurinhas ORDER BY ordem_exibicao"
    );
    return this.mapRows(rows);
  }

  /**
   * Buscar figurinha por código
   */
  async buscarPorCodigo(codigo: string): Promise<CopaFigurinha | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM copa_figurinhas WHERE codigo = ?",
      [codigo.toUpperCase()]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  /**
   * Buscar figurinhas por prefixo
   */
  async buscarPorPrefixo(prefixo: string): Promise<CopaFigurinha[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM copa_figurinhas WHERE prefixo = ? ORDER BY numero",
      [prefixo.toUpperCase()]
    );
    return this.mapRows(rows);
  }

  /**
   * Buscar figurinhas por tipo
   */
  async buscarPorTipo(tipo: TipoFigurinha): Promise<CopaFigurinha[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM copa_figurinhas WHERE tipo = ? ORDER BY ordem_exibicao",
      [tipo]
    );
    return this.mapRows(rows);
  }

  /**
   * Buscar figurinhas por grupo
   */
  async buscarPorGrupo(grupo: string): Promise<CopaFigurinha[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM copa_figurinhas WHERE grupo = ? ORDER BY ordem_exibicao",
      [grupo]
    );
    return this.mapRows(rows);
  }

  /**
   * Buscar figurinha por ID
   */
  async buscarPorId(id: number): Promise<CopaFigurinha | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM copa_figurinhas WHERE id = ?",
      [id]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  /**
   * Buscar com filtros múltiplos
   */
  async buscarComFiltros(filtros: {
    tipo?: TipoFigurinha;
    prefixo?: string;
    codigo?: string;
    numero?: string;
    grupo?: string;
  }): Promise<CopaFigurinha[]> {
    let query = "SELECT * FROM copa_figurinhas WHERE 1=1";
    const params: any[] = [];

    if (filtros.tipo) {
      query += " AND tipo = ?";
      params.push(filtros.tipo);
    }

    if (filtros.prefixo) {
      query += " AND prefixo = ?";
      params.push(filtros.prefixo.toUpperCase());
    }

    if (filtros.codigo) {
      query += " AND codigo LIKE ?";
      params.push(`%${filtros.codigo.toUpperCase()}%`);
    }

    if (filtros.numero) {
      query += " AND CAST(numero AS CHAR) LIKE ?";
      params.push(`%${filtros.numero}%`);
    }

    if (filtros.grupo) {
      query += " AND grupo = ?";
      params.push(filtros.grupo);
    }

    query += " ORDER BY ordem_exibicao";

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return this.mapRows(rows);
  }

  /**
   * Mapear row do banco para entity
   */
  private mapRow(row: RowDataPacket): CopaFigurinha {
    return {
      id: row.id,
      codigo: row.codigo,
      prefixo: row.prefixo,
      numero: row.numero,
      tipo: row.tipo,
      grupo: row.grupo,
      selecao: row.selecao,
      ordemExibicao: row.ordem_exibicao,
      criadoEm: row.criado_em,
    };
  }

  /**
   * Mapear múltiplas rows
   */
  private mapRows(rows: RowDataPacket[]): CopaFigurinha[] {
    return rows.map((row) => this.mapRow(row));
  }
}
