/**
 * Repository: Status
 * Camada de acesso a dados para status das figurinhas nos álbuns
 */

import { pool } from "../../database/mysql";
import { CopaStatus, CopaStatusCompleto } from "../../entities/copa/CopaStatus";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export class StatusRepository {
  /**
   * Buscar status de uma figurinha em todos os álbuns
   */
  async buscarStatusFigurinha(figurinhaId: number): Promise<CopaStatus[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM copa_status WHERE figurinha_id = ? ORDER BY album_id`,
      [figurinhaId]
    );
    return this.mapRows(rows);
  }

  /**
   * Buscar status de um álbum específico
   */
  async buscarStatusAlbum(albumId: number): Promise<CopaStatusCompleto[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        s.*,
        f.codigo,
        f.prefixo,
        f.numero,
        f.tipo,
        f.grupo,
        f.selecao
      FROM copa_status s
      JOIN copa_figurinhas f ON s.figurinha_id = f.id
      WHERE s.album_id = ?
      ORDER BY f.ordem_exibicao`,
      [albumId]
    );
    return this.mapRowsCompleto(rows);
  }

  /**
   * Buscar status específico de uma figurinha em um álbum
   */
  async buscarStatus(albumId: number, figurinhaId: number): Promise<CopaStatus | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM copa_status WHERE album_id = ? AND figurinha_id = ?`,
      [albumId, figurinhaId]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  /**
   * Atualizar status de uma figurinha em um álbum
   */
  async atualizarStatus(
    albumId: number,
    figurinhaId: number,
    possui: boolean
  ): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE copa_status 
       SET possui = ?, atualizado_em = CURRENT_TIMESTAMP 
       WHERE album_id = ? AND figurinha_id = ?`,
      [possui, albumId, figurinhaId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Buscar figurinhas faltantes de um álbum
   */
  async buscarFaltantes(albumId: number): Promise<CopaStatusCompleto[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        s.*,
        f.codigo,
        f.prefixo,
        f.numero,
        f.tipo,
        f.grupo,
        f.selecao
      FROM copa_status s
      JOIN copa_figurinhas f ON s.figurinha_id = f.id
      WHERE s.album_id = ? AND s.possui = FALSE
      ORDER BY f.ordem_exibicao`,
      [albumId]
    );
    return this.mapRowsCompleto(rows);
  }

  /**
   * Buscar figurinhas completas de um álbum
   */
  async buscarCompletas(albumId: number): Promise<CopaStatusCompleto[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        s.*,
        f.codigo,
        f.prefixo,
        f.numero,
        f.tipo,
        f.grupo,
        f.selecao
      FROM copa_status s
      JOIN copa_figurinhas f ON s.figurinha_id = f.id
      WHERE s.album_id = ? AND s.possui = TRUE
      ORDER BY f.ordem_exibicao`,
      [albumId]
    );
    return this.mapRowsCompleto(rows);
  }

  /**
   * Contar figurinhas completas de um álbum
   */
  async contarCompletas(albumId: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM copa_status WHERE album_id = ? AND possui = TRUE`,
      [albumId]
    );
    return rows[0].total;
  }

  /**
   * Contar figurinhas faltantes de um álbum
   */
  async contarFaltantes(albumId: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM copa_status WHERE album_id = ? AND possui = FALSE`,
      [albumId]
    );
    return rows[0].total;
  }

  /**
   * Mapear row do banco para entity
   */
  private mapRow(row: RowDataPacket): CopaStatus {
    return {
      id: row.id,
      albumId: row.album_id,
      figurinhaId: row.figurinha_id,
      possui: row.possui,
      atualizadoEm: row.atualizado_em,
    };
  }

  /**
   * Mapear row completo (com dados da figurinha)
   */
  private mapRowCompleto(row: RowDataPacket): CopaStatusCompleto {
    return {
      id: row.id,
      albumId: row.album_id,
      figurinhaId: row.figurinha_id,
      possui: row.possui,
      atualizadoEm: row.atualizado_em,
      figurinha: {
        codigo: row.codigo,
        prefixo: row.prefixo,
        numero: row.numero,
        tipo: row.tipo,
        grupo: row.grupo,
        selecao: row.selecao,
      },
    };
  }

  /**
   * Mapear múltiplas rows
   */
  private mapRows(rows: RowDataPacket[]): CopaStatus[] {
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Mapear múltiplas rows completas
   */
  private mapRowsCompleto(rows: RowDataPacket[]): CopaStatusCompleto[] {
    return rows.map((row) => this.mapRowCompleto(row));
  }
}
