/**
 * Service: Estatísticas
 * Lógica de negócio para estatísticas gerais do sistema
 */

import { pool } from "../../database/mysql";
import { AlbumRepository } from "../../repositories/copa/album.repository";
import { StatusRepository } from "../../repositories/copa/status.repository";
import { EstatisticasGerais, FigurinhasFaltantes } from "../../entities/copa";
import { RowDataPacket } from "mysql2";

export class EstatisticaService {
  private albumRepository: AlbumRepository;
  private statusRepository: StatusRepository;

  constructor() {
    this.albumRepository = new AlbumRepository();
    this.statusRepository = new StatusRepository();
  }

  /**
   * Obter estatísticas gerais de todos os álbuns
   */
  async obterEstatisticasGerais(): Promise<EstatisticasGerais> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM copa_estatisticas_geral ORDER BY album_nome"
    );

    const prata = rows.find((r) => r.album_nome === "prata");
    const normal = rows.find((r) => r.album_nome === "normal");
    const ouro = rows.find((r) => r.album_nome === "ouro");

    if (!prata || !normal || !ouro) {
      throw new Error("Erro ao carregar estatísticas dos álbuns");
    }

    // Contar figurinhas completas nos 3 álbuns
    const [completasRows] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(DISTINCT f.id) as total
      FROM copa_figurinhas f
      WHERE EXISTS (
        SELECT 1 FROM copa_status s1 
        WHERE s1.figurinha_id = f.id 
        AND s1.album_id = (SELECT id FROM copa_albuns WHERE nome = 'prata')
        AND s1.possui = TRUE
      )
      AND EXISTS (
        SELECT 1 FROM copa_status s2 
        WHERE s2.figurinha_id = f.id 
        AND s2.album_id = (SELECT id FROM copa_albuns WHERE nome = 'normal')
        AND s2.possui = TRUE
      )
      AND EXISTS (
        SELECT 1 FROM copa_status s3 
        WHERE s3.figurinha_id = f.id 
        AND s3.album_id = (SELECT id FROM copa_albuns WHERE nome = 'ouro')
        AND s3.possui = TRUE
      )
    `);

    return {
      prata: {
        albumNome: prata.album_nome,
        albumDisplay: prata.album_display,
        albumCor: prata.album_cor,
        albumIcone: prata.album_icone,
        totalFigurinhas: prata.total_figurinhas || 0,
        completas: prata.completas || 0,
        faltantes: prata.faltantes || 0,
        percentualCompleto: parseFloat(prata.percentual_completo || 0),
      },
      normal: {
        albumNome: normal.album_nome,
        albumDisplay: normal.album_display,
        albumCor: normal.album_cor,
        albumIcone: normal.album_icone,
        totalFigurinhas: normal.total_figurinhas || 0,
        completas: normal.completas || 0,
        faltantes: normal.faltantes || 0,
        percentualCompleto: parseFloat(normal.percentual_completo || 0),
      },
      ouro: {
        albumNome: ouro.album_nome,
        albumDisplay: ouro.album_display,
        albumCor: ouro.album_cor,
        albumIcone: ouro.album_icone,
        totalFigurinhas: ouro.total_figurinhas || 0,
        completas: ouro.completas || 0,
        faltantes: ouro.faltantes || 0,
        percentualCompleto: parseFloat(ouro.percentual_completo || 0),
      },
      completasNos3: completasRows[0].total || 0,
    };
  }

  /**
   * Obter figurinhas faltantes de um álbum agrupadas
   */
  async obterFaltantesAgrupadas(albumNome: string): Promise<FigurinhasFaltantes[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM copa_faltantes_por_grupo WHERE album_nome = ? ORDER BY ordem_exibicao`,
      [albumNome]
    );

    // Agrupar por agrupamento
    const grupos = new Map<string, FigurinhasFaltantes>();

    rows.forEach((row) => {
      const agrupamento = row.agrupamento;
      if (!grupos.has(agrupamento)) {
        grupos.set(agrupamento, {
          agrupamento,
          faltantes: [],
        });
      }

      grupos.get(agrupamento)!.faltantes.push({
        codigo: row.codigo,
        prefixo: row.prefixo,
        numero: row.numero,
        tipo: row.tipo,
        selecao: row.selecao,
      });
    });

    return Array.from(grupos.values());
  }

  /**
   * Obter resumo rápido
   */
  async obterResumo(): Promise<{
    totalFigurinhas: number;
    totalAlbuns: number;
    mediaConclusao: number;
  }> {
    const estatisticas = await this.obterEstatisticasGerais();

    const mediaConclusao =
      (estatisticas.prata.percentualCompleto +
        estatisticas.normal.percentualCompleto +
        estatisticas.ouro.percentualCompleto) /
      3;

    return {
      totalFigurinhas: estatisticas.prata.totalFigurinhas,
      totalAlbuns: 3,
      mediaConclusao: Math.round(mediaConclusao * 10) / 10,
    };
  }
}
