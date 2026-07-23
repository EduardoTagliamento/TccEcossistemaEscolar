import { Request, Response } from "express";
import MateriaCustomizacaoService from "../services/materiacustomizacao.service";
import ErrorResponse from "../utils/ErrorResponse";

export class MateriaCustomizacaoController {
  #service: MateriaCustomizacaoService;

  constructor(service: MateriaCustomizacaoService) {
    this.#service = service;
  }

  /**
   * PUT /api/materia/:guid/customizacao
   * multipart/form-data: campo "imagem" (opcional), "cor" (opcional), "mensagem" (opcional)
   */
  salvar = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const usuarioCPF = req.user?.UsuarioCPF || "";
      const arquivo = (req as any).file as Express.Multer.File | undefined;

      const customizacao = await this.#service.salvarCustomizacao(guid, usuarioCPF, {
        imagem: arquivo ? { buffer: arquivo.buffer, mimetype: arquivo.mimetype } : undefined,
        cor: req.body.cor,
        mensagem: req.body.mensagem,
      });

      res.status(200).json({
        success: true,
        message: "Customização salva com sucesso",
        data: customizacao,
      });
    } catch (error) {
      this.tratarErro(error, res, "Erro interno ao salvar customização");
    }
  };

  /**
   * GET /api/materia/:guid/customizacao?UsuarioCPF=
   */
  buscar = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const usuarioCPF = (req.query.UsuarioCPF as string) || req.user?.UsuarioCPF || "";

      const customizacao = await this.#service.buscarCustomizacao(guid, usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Customização obtida com sucesso",
        data: customizacao,
      });
    } catch (error) {
      this.tratarErro(error, res, "Erro interno ao buscar customização");
    }
  };

  /**
   * GET /api/materia/:guid/customizacoes
   */
  listar = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const customizacoes = await this.#service.listarCustomizacoes(guid);

      res.status(200).json({
        success: true,
        message: "Customizações listadas com sucesso",
        data: customizacoes,
      });
    } catch (error) {
      this.tratarErro(error, res, "Erro interno ao listar customizações");
    }
  };

  private tratarErro(error: unknown, res: Response, mensagemPadrao: string): void {
    if (error instanceof ErrorResponse) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error(mensagemPadrao, error);
      res.status(500).json({ success: false, message: mensagemPadrao });
    }
  }
}
