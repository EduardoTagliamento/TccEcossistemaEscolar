/**
 * Controller: Figurinhas
 * Gerencia requisições HTTP relacionadas a figurinhas
 */

import { Request, Response, NextFunction } from "express";
import { FigurinhaService } from "../../services/copa/figurinha.service";
import ErrorResponse from "../../utils/ErrorResponse";

export class FigurinhaController {
  private service: FigurinhaService;

  constructor() {
    this.service = new FigurinhaService();
  }

  /**
   * GET /album/figurinhas
   * Listar todas as figurinhas (com filtros opcionais)
   */
  listarTodas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tipo, prefixo, codigo, numero, grupo } = req.query;

      const figurinhas = await this.service.buscar({
        tipo: tipo as string,
        prefixo: prefixo as string,
        codigo: codigo as string,
        numero: numero as string,
        grupo: grupo as string,
      });

      res.json({
        sucesso: true,
        total: figurinhas.length,
        data: figurinhas,
      });
    } catch (error: any) {
      next(new ErrorResponse(500, error.message || "Erro ao buscar figurinhas"));
    }
  };

  /**
   * GET /album/figurinhas/:id
   * Buscar figurinha por ID
   */
  buscarPorId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return next(new ErrorResponse(400, "ID inválido"));
      }

      const figurinha = await this.service.buscarPorCodigo(id.toString());
      if (!figurinha) {
        return next(new ErrorResponse(404, "Figurinha não encontrada"));
      }

      res.json({
        sucesso: true,
        data: figurinha,
      });
    } catch (error: any) {
      next(new ErrorResponse(500, error.message || "Erro ao buscar figurinha"));
    }
  };

  /**
   * GET /album/figurinhas/codigo/:codigo
   * Buscar figurinha por código
   */
  buscarPorCodigo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { codigo } = req.params;
      const figurinha = await this.service.buscarPorCodigo(codigo);

      if (!figurinha) {
        return next(new ErrorResponse(404, "Figurinha não encontrada"));
      }

      res.json({
        sucesso: true,
        data: figurinha,
      });
    } catch (error: any) {
      next(new ErrorResponse(500, error.message || "Erro ao buscar figurinha"));
    }
  };

  /**
   * GET /album/figurinhas/prefixo/:prefixo
   * Buscar figurinhas por prefixo
   */
  buscarPorPrefixo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prefixo } = req.params;
      const figurinhas = await this.service.buscarPorPrefixo(prefixo);

      res.json({
        sucesso: true,
        total: figurinhas.length,
        data: figurinhas,
      });
    } catch (error: any) {
      next(new ErrorResponse(500, error.message || "Erro ao buscar figurinhas"));
    }
  };

  /**
   * GET /album/figurinhas/prefixos
   * Obter lista de prefixos únicos
   */
  listarPrefixos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prefixos = await this.service.obterPrefixosUnicos();

      res.json({
        sucesso: true,
        total: prefixos.length,
        data: prefixos,
      });
    } catch (error: any) {
      next(new ErrorResponse(500, error.message || "Erro ao buscar prefixos"));
    }
  };

  /**
   * GET /album/figurinhas/grupos
   * Obter lista de grupos únicos
   */
  listarGrupos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const grupos = await this.service.obterGruposUnicos();

      res.json({
        sucesso: true,
        total: grupos.length,
        data: grupos,
      });
    } catch (error: any) {
      next(new ErrorResponse(500, error.message || "Erro ao buscar grupos"));
    }
  };
}
