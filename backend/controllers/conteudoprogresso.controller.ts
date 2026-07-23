import { Request, Response } from "express";
import ConteudoProgressoService from "../services/conteudoprogresso.service";
import ErrorResponse from "../utils/ErrorResponse";

export class ConteudoProgressoController {
  #service: ConteudoProgressoService;

  constructor(service: ConteudoProgressoService) {
    this.#service = service;
  }

  /** POST /api/conteudo/:guid/progresso/video — body: { SegundosAssistidos, DuracaoTotalSegundos } */
  registrarVideo = async (req: Request, res: Response): Promise<void> => {
    try {
      const usuarioCPF = req.user?.UsuarioCPF || "";
      const { SegundosAssistidos, DuracaoTotalSegundos } = req.body;

      const progresso = await this.#service.registrarProgressoVideo(
        req.params.guid,
        usuarioCPF,
        Number(SegundosAssistidos),
        Number(DuracaoTotalSegundos)
      );

      res.status(200).json({ success: true, message: "Progresso registrado com sucesso", data: progresso });
    } catch (error) {
      this.tratarErro(error, res);
    }
  };

  /** POST /api/conteudo/pagina/:paginaGuid/progresso */
  registrarPagina = async (req: Request, res: Response): Promise<void> => {
    try {
      const usuarioCPF = req.user?.UsuarioCPF || "";
      const progresso = await this.#service.registrarVisualizacaoPagina(req.params.paginaGuid, usuarioCPF);
      res.status(200).json({ success: true, message: "Página registrada com sucesso", data: progresso });
    } catch (error) {
      this.tratarErro(error, res);
    }
  };

  /** POST /api/conteudo/:guid/progresso/texto */
  registrarTexto = async (req: Request, res: Response): Promise<void> => {
    try {
      const usuarioCPF = req.user?.UsuarioCPF || "";
      const progresso = await this.#service.registrarLeituraTexto(req.params.guid, usuarioCPF);
      res.status(200).json({ success: true, message: "Leitura registrada com sucesso", data: progresso });
    } catch (error) {
      this.tratarErro(error, res);
    }
  };

  /** GET /api/conteudo/:guid/progresso */
  buscar = async (req: Request, res: Response): Promise<void> => {
    try {
      const usuarioCPF = req.user?.UsuarioCPF || "";
      const progresso = await this.#service.buscarProgresso(req.params.guid, usuarioCPF);
      res.status(200).json({ success: true, message: "Progresso obtido com sucesso", data: progresso });
    } catch (error) {
      this.tratarErro(error, res);
    }
  };

  private tratarErro(error: unknown, res: Response): void {
    if (error instanceof ErrorResponse) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error("Erro interno em ConteudoProgressoController:", error);
      res.status(500).json({ success: false, message: "Erro interno" });
    }
  }
}
