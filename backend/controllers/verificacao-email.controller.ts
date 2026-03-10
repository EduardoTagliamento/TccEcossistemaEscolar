import { NextFunction, Request, Response } from "express";
import VerificacaoEmailService from "../services/verificacao-email.service.js";

export default class VerificacaoEmailController {
  #service: VerificacaoEmailService;

  constructor(serviceDependency: VerificacaoEmailService) {
    console.log("⬆️  VerificacaoEmailController.constructor()");
    this.#service = serviceDependency;
  }

  /**
   * POST /api/verificacao-email/solicitar/:UsuarioCPF
   * Solicita código de verificação por email
   */
  solicitarCodigo = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 VerificacaoEmailController.solicitarCodigo()");
    
    try {
      const { UsuarioCPF } = request.params;
      const result = await this.#service.solicitarVerificacao(UsuarioCPF);

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
   * POST /api/verificacao-email/validar
   * Valida código de verificação
   */
  validarCodigo = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 VerificacaoEmailController.validarCodigo()");
    
    try {
      const { UsuarioCPF, VerificacaoCodigo } = request.body.verificacao;
      const result = await this.#service.validarCodigo(UsuarioCPF, VerificacaoCodigo);

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
   * POST /api/verificacao-email/reenviar/:UsuarioCPF
   * Reenvia código de verificação
   */
  reenviarCodigo = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 VerificacaoEmailController.reenviarCodigo()");
    
    try {
      const { UsuarioCPF } = request.params;
      const result = await this.#service.reenviarCodigo(UsuarioCPF);

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
