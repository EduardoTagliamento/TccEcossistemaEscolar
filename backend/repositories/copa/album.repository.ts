/**
 * Repository: Álbuns
 * Camada de acesso a dados para álbuns
 */

import { pool } from "../../database/mysql";
import { CopaAlbum, NomeAlbum } from "../../entities/copa/CopaAlbum";
import { RowDataPacket } from "mysql2";

export class AlbumRepository {
  /**
   * Buscar todos os álbuns
   */
  async buscarTodos(): Promise<CopaAlbum[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM copa_albuns ORDER BY id"
    );
    return this.mapRows(rows);
  }

  /**
   * Buscar álbum por nome
   */
  async buscarPorNome(nome: NomeAlbum): Promise<CopaAlbum | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM copa_albuns WHERE nome = ?",
      [nome]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  /**
   * Buscar álbum por ID
   */
  async buscarPorId(id: number): Promise<CopaAlbum | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM copa_albuns WHERE id = ?",
      [id]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  /**
   * Mapear row do banco para entity
   */
  private mapRow(row: RowDataPacket): CopaAlbum {
    return {
      id: row.id,
      nome: row.nome,
      nomeDisplay: row.nome_display,
      cor: row.cor,
      icone: row.icone,
      criadoEm: row.criado_em,
    };
  }

  /**
   * Mapear múltiplas rows
   */
  private mapRows(rows: RowDataPacket[]): CopaAlbum[] {
    return rows.map((row) => this.mapRow(row));
  }
}
