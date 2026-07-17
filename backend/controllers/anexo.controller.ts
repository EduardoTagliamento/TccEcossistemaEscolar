import { NextFunction, Request, Response } from "express";
import AnexoService from "../services/anexo.service";
import { AnexoFilters } from "../repositories/anexo.repository";

export default class AnexoControl {
  #anexoService: AnexoService;

  constructor(anexoServiceDependency: AnexoService) {
    console.log("⬆️  AnexoControl.constructor()");
    this.#anexoService = anexoServiceDependency;
  }

  /**
   * POST /api/anexo
   * Upload de anexo (multipart/form-data)
   */
  store = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 AnexoControl.store()");
    try {
      const file = request.file;
      const { EscolaGUID } = request.body;
      const usuarioCPF = request.user?.UsuarioCPF;

      if (!file) {
        response.status(400).json({
          success: false,
          message: "Nenhum arquivo foi enviado",
          error: { message: "O campo 'file' é obrigatório" },
        });
        return;
      }

      const anexoCriado = await this.#anexoService.uploadAnexo(file, EscolaGUID, usuarioCPF);

      response.status(201).json({
        success: true,
        message: "Anexo enviado com sucesso",
        data: { anexo: anexoCriado },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/anexo
   * Listar anexos com filtros opcionais
   */
  index = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 AnexoControl.index()");
    try {
      const filters: AnexoFilters = {
        UsuarioCPF: request.query.UsuarioCPF as string | undefined,
        EscolaGUID: request.query.EscolaGUID as string | undefined,
        DataInicio: request.query.DataInicio
          ? new Date(request.query.DataInicio as string)
          : undefined,
        DataFim: request.query.DataFim ? new Date(request.query.DataFim as string) : undefined,
      };

      const anexos = await this.#anexoService.listarAnexos(filters);

      response.status(200).json({
        success: true,
        message: "Executado com sucesso",
        data: { anexos },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/anexo/:AnexoGUID
   * Buscar metadados de um anexo
   */
  show = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 AnexoControl.show()");
    try {
      const { AnexoGUID } = request.params;
      const anexo = await this.#anexoService.buscarAnexo(AnexoGUID);

      response.status(200).json({
        success: true,
        message: "Anexo encontrado",
        data: { anexo },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/anexo/:AnexoGUID/download
   * Download do arquivo (redireciona para a URL pública no R2 — o objeto já
   * foi enviado com ContentDisposition "attachment", então o navegador
   * baixa com o nome original em vez de abrir inline)
   */
  download = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 AnexoControl.download()");
    try {
      const { AnexoGUID } = request.params;
      const { caminho } = await this.#anexoService.downloadAnexo(AnexoGUID);

      response.redirect(caminho);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/anexo/:AnexoGUID
   * Excluir anexo (banco + arquivo físico)
   */
  destroy = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 AnexoControl.destroy()");
    try {
      const { AnexoGUID } = request.params;
      const usuarioCPF = request.user?.UsuarioCPF;

      const excluido = await this.#anexoService.excluirAnexo(AnexoGUID, usuarioCPF);

      if (!excluido) {
        return response.status(404).json({
          success: false,
          message: "Anexo não encontrado",
          error: { message: `Não existe anexo com id ${AnexoGUID}` },
        });
      }

      return response.status(200).json({
        success: true,
        message: "Anexo excluído com sucesso",
        data: null,
      });
    } catch (error) {
      return next(error);
    }
  };
}
