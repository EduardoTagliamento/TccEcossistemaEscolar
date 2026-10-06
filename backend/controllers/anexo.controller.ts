import { NextFunction, Request, Response } from "express";
import AnexoService, { AnexoListarFiltrosDTO } from "../services/anexo.service";

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
      const usuarioGUID = request.user?.UsuarioGUID;

      if (!file) {
        response.status(400).json({
          success: false,
          message: "Nenhum arquivo foi enviado",
          error: { message: "O campo 'file' é obrigatório" },
        });
        return;
      }

      const anexoCriado = await this.#anexoService.uploadAnexo(file, EscolaGUID, usuarioGUID);

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
      const filters: AnexoListarFiltrosDTO = {
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
   * GET /api/anexo/por-caminho?caminho=<url>
   * Resolve o AnexoGUID a partir da URL pública conhecida (ex. imagem inline embutida num
   * Enunciado via markdown, que só guarda a URL no texto). Vem ANTES de "/:AnexoGUID" nas rotas
   * — senão "por-caminho" seria interpretado como valor de :AnexoGUID.
   */
  showPorCaminho = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 AnexoControl.showPorCaminho()");
    try {
      const caminho = request.query.caminho as string | undefined;
      if (!caminho) {
        response.status(400).json({
          success: false,
          message: "Parâmetro 'caminho' é obrigatório",
          error: { message: "Informe ?caminho=<url> na query string" },
        });
        return;
      }
      const usuarioGUID = request.user?.UsuarioGUID;
      const anexo = await this.#anexoService.buscarAnexoPorCaminho(caminho, usuarioGUID);

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
   * GET /api/anexo/:AnexoGUID
   * Buscar metadados de um anexo
   */
  show = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 AnexoControl.show()");
    try {
      const { AnexoGUID } = request.params;
      const usuarioGUID = request.user?.UsuarioGUID;
      const anexo = await this.#anexoService.buscarAnexo(AnexoGUID, usuarioGUID);

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
      const usuarioGUID = request.user?.UsuarioGUID;
      const { caminho } = await this.#anexoService.downloadAnexo(AnexoGUID, usuarioGUID);

      response.redirect(caminho);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/anexo/:AnexoGUID/recortar
   * Recorta um anexo de imagem existente — cria um anexo NOVO com o resultado (não altera o
   * original). Recorte roda no servidor (sharp), não no navegador — ver `AnexoService.recortarAnexo`.
   */
  recortar = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 AnexoControl.recortar()");
    try {
      const { AnexoGUID } = request.params;
      const usuarioGUID = request.user?.UsuarioGUID;
      const { left, top, width, height } = request.body;

      const anexoRecortado = await this.#anexoService.recortarAnexo(
        AnexoGUID,
        { left: Number(left), top: Number(top), width: Number(width), height: Number(height) },
        usuarioGUID
      );

      response.status(201).json({
        success: true,
        message: "Imagem recortada com sucesso",
        data: { anexo: anexoRecortado },
      });
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
      const usuarioGUID = request.user?.UsuarioGUID;

      const excluido = await this.#anexoService.excluirAnexo(AnexoGUID, usuarioGUID);

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
