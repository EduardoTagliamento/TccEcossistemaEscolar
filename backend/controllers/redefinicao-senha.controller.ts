import { NextFunction, Request, Response } from "express";
import RedefinicaoSenhaService from "../services/redefinicao-senha.service";

export default class RedefinicaoSenhaController {
  #service: RedefinicaoSenhaService;

  constructor(serviceDependency: RedefinicaoSenhaService) {
    console.log("⬆️  RedefinicaoSenhaController.constructor()");
    this.#service = serviceDependency;
  }

  /**
   * POST /api/redefinicao-senha/solicitar
   * Solicita link de redefinição de senha por email
   */
  solicitar = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 RedefinicaoSenhaController.solicitar()");

    try {
      const { email } = request.body;
      const result = await this.#service.solicitarRedefinicao(email);

      response.status(200).json({
        success: true,
        message: result.message,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/redefinicao-senha/redefinir
   * Redefine a senha a partir de um token válido
   */
  redefinir = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 RedefinicaoSenhaController.redefinir()");

    try {
      const { token, novaSenha } = request.body;
      const result = await this.#service.redefinirSenha(token, novaSenha);

      response.status(200).json({
        success: true,
        message: result.message,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };
}
