import { Request, Response, NextFunction } from "express";
import EscolaConfiguracaoService from "../services/escolaconfiguracao.service";

export class EscolaConfiguracaoController {
  #escolaConfiguracaoService: EscolaConfiguracaoService;

  constructor(escolaConfiguracaoService: EscolaConfiguracaoService) {
    console.log("⬆️  EscolaConfiguracaoController.constructor()");
    this.#escolaConfiguracaoService = escolaConfiguracaoService;
  }

  // GET /api/escola-configuracao/:escolaGUID
  show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 EscolaConfiguracaoController.show()");

    try {
      const configuracao = await this.#escolaConfiguracaoService.obterConfiguracao(
        req.params.escolaGUID
      );

      res.json({
        success: true,
        message: "Configuração da escola obtida com sucesso",
        data: { configuracao },
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/escola-configuracao/:escolaGUID/slots
  slots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 EscolaConfiguracaoController.slots()");

    try {
      const slots = await this.#escolaConfiguracaoService.obterSlots(req.params.escolaGUID);

      res.json({
        success: true,
        message: "Slots de aula calculados com sucesso",
        data: { slots },
      });
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/escola-configuracao/:escolaGUID
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 EscolaConfiguracaoController.update()");

    try {
      const usuarioCPF = req.user?.UsuarioCPF;

      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Usuário não autenticado",
          data: null,
        });
        return;
      }

      const { configuracao, avisos } = await this.#escolaConfiguracaoService.salvarConfiguracao(
        req.params.escolaGUID,
        req.body.configuracao,
        usuarioCPF
      );

      res.json({
        success: true,
        message: "Configuração da escola salva com sucesso",
        data: { configuracao, avisos },
      });
    } catch (error) {
      next(error);
    }
  };
}
