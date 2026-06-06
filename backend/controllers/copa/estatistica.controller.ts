/**
 * Controller: Estatísticas
 * Gerencia requisições HTTP relacionadas a estatísticas
 */

import { Request, Response, NextFunction } from "express";
import { EstatisticaService } from "../../services/copa/estatistica.service";
import ErrorResponse from "../../utils/ErrorResponse";

export class EstatisticaController {
  private service: EstatisticaService;

  constructor() {
    this.service = new EstatisticaService();
  }

  /**
   * GET /album/estatisticas/geral
   * Obter estatísticas gerais de todos os álbuns
   */
  obterGeral = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const estatisticas = await this.service.obterEstatisticasGerais();

      res.json({
        sucesso: true,
        data: estatisticas,
      });
    } catch (error: any) {
      next(new ErrorResponse(500, error.message || "Erro ao obter estatísticas"));
    }
  };

  /**
   * GET /album/estatisticas/faltantes/:albumNome
   * Obter figurinhas faltantes agrupadas de um álbum
   */
  obterFaltantes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { albumNome } = req.params;

      if (!["prata", "normal", "ouro"].includes(albumNome)) {
        return next(new ErrorResponse(400, "Nome de álbum inválido. Use: prata, normal ou ouro"));
      }

      const faltantes = await this.service.obterFaltantesAgrupadas(albumNome);

      res.json({
        sucesso: true,
        album: albumNome,
        total: faltantes.reduce((acc, grupo) => acc + grupo.faltantes.length, 0),
        data: faltantes,
      });
    } catch (error: any) {
      next(new ErrorResponse(500, error.message || "Erro ao obter faltantes"));
    }
  };

  /**
   * GET /album/estatisticas/resumo
   * Obter resumo rápido
   */
  obterResumo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resumo = await this.service.obterResumo();

      res.json({
        sucesso: true,
        data: resumo,
      });
    } catch (error: any) {
      next(new ErrorResponse(500, error.message || "Erro ao obter resumo"));
    }
  };
}
