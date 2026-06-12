/**
 * Controller: Álbuns
 * Gerencia requisições HTTP relacionadas a álbuns
 */

import { Request, Response, NextFunction } from "express";
import { AlbumService } from "../../services/copa/album.service";
import ErrorResponse from "../../utils/ErrorResponse";

export class AlbumController {
  private service: AlbumService;

  constructor() {
    this.service = new AlbumService();
  }

  /**
   * GET /album/albuns
   * Listar todos os álbuns
   */
  listarTodos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const albuns = await this.service.buscarTodos();

      res.json({
        sucesso: true,
        total: albuns.length,
        data: albuns,
      });
    } catch (error: any) {
      next(new ErrorResponse(500, error.message || "Erro ao buscar álbuns"));
    }
  };

  /**
   * GET /album/albuns/:id
   * Buscar álbum por ID
   */
  buscarPorId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return next(new ErrorResponse(400, "ID inválido"));
      }

      const album = await this.service.buscarPorId(id);
      if (!album) {
        return next(new ErrorResponse(404, "Álbum não encontrado"));
      }

      res.json({
        sucesso: true,
        data: album,
      });
    } catch (error: any) {
      next(new ErrorResponse(500, error.message || "Erro ao buscar álbum"));
    }
  };

  /**
   * GET /album/albuns/:id/figurinhas
   * Buscar todas as figurinhas de um álbum com status
   */
  buscarFigurinhas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return next(new ErrorResponse(400, "ID inválido"));
      }

      const figurinhas = await this.service.buscarFigurinhasAlbum(id);

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
   * GET /album/albuns/:id/faltantes
   * Buscar figurinhas faltantes de um álbum
   */
  buscarFaltantes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return next(new ErrorResponse(400, "ID inválido"));
      }

      const faltantes = await this.service.buscarFaltantes(id);

      res.json({
        sucesso: true,
        total: faltantes.length,
        data: faltantes,
      });
    } catch (error: any) {
      next(new ErrorResponse(500, error.message || "Erro ao buscar faltantes"));
    }
  };

  /**
   * GET /album/albuns/:id/completas
   * Buscar figurinhas completas de um álbum
   */
  buscarCompletas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return next(new ErrorResponse(400, "ID inválido"));
      }

      const completas = await this.service.buscarCompletas(id);

      res.json({
        sucesso: true,
        total: completas.length,
        data: completas,
      });
    } catch (error: any) {
      next(new ErrorResponse(500, error.message || "Erro ao buscar completas"));
    }
  };

  /**
   * GET /album/albuns/:id/estatisticas
   * Obter estatísticas de um álbum
   */
  obterEstatisticas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return next(new ErrorResponse(400, "ID inválido"));
      }

      const estatisticas = await this.service.obterEstatisticas(id);

      res.json({
        sucesso: true,
        data: estatisticas,
      });
    } catch (error: any) {
      next(new ErrorResponse(500, error.message || "Erro ao obter estatísticas"));
    }
  };

  /**
   * PUT /album/albuns/:id/figurinhas/:figurinhaId
   * Atualizar status de uma figurinha em um álbum
   * Body: { possui: boolean, senha: string }
   */
  atualizarStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const albumId = parseInt(req.params.id);
      const figurinhaId = parseInt(req.params.figurinhaId);

      if (isNaN(albumId) || isNaN(figurinhaId)) {
        return next(new ErrorResponse(400, "IDs inválidos"));
      }

      const { possui, senha } = req.body;

      if (typeof possui !== "boolean") {
        return next(new ErrorResponse(400, "Campo 'possui' é obrigatório e deve ser boolean"));
      }

      if (!senha || typeof senha !== "string") {
        return next(new ErrorResponse(400, "Senha é obrigatória"));
      }

      await this.service.atualizarStatus(albumId, figurinhaId, possui, senha);

      res.json({
        sucesso: true,
        mensagem: "Status atualizado com sucesso",
      });
    } catch (error: any) {
      if (error.message === "Senha incorreta") {
        return next(new ErrorResponse(401, "Senha incorreta"));
      }
      next(new ErrorResponse(500, error.message || "Erro ao atualizar status"));
    }
  };
}
