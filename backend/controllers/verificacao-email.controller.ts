import { NextFunction, Request, Response } from "express";
import VerificacaoEmailService from "../services/verificacao-email.service";

export default class VerificacaoEmailController {
  #service: VerificacaoEmailService;

  constructor(serviceDependency: VerificacaoEmailService) {
    console.log("⬆️  VerificacaoEmailController.constructor()");
    this.#service = serviceDependency;
  }

  /**
   * POST /api/verificacao-email/solicitar/:UsuarioGUID
   * Solicita código de verificação por email
   */
  solicitarCodigo = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 VerificacaoEmailController.solicitarCodigo()");

    try {
      const { UsuarioGUID } = request.params;
      const result = await this.#service.solicitarVerificacao(UsuarioGUID);

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
      const { UsuarioGUID, UsuarioEmail, VerificacaoCodigo } = request.body.verificacao;
      const result = UsuarioGUID
        ? await this.#service.validarCodigo(UsuarioGUID, VerificacaoCodigo)
        : await this.#service.validarCodigoPorEmail(UsuarioEmail, VerificacaoCodigo);

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
   * POST /api/verificacao-email/reenviar/:UsuarioGUID
   * Reenvia código de verificação
   */
  reenviarCodigo = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 VerificacaoEmailController.reenviarCodigo()");

    try {
      const { UsuarioGUID } = request.params;
      const result = await this.#service.reenviarCodigo(UsuarioGUID);

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
   * POST /api/verificacao-email/reenviar
   * Reenvia código de verificação via body (UsuarioGUID ou email)
   */
  reenviarCodigoBody = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 VerificacaoEmailController.reenviarCodigoBody()");

    try {
      const { UsuarioGUID, UsuarioEmail } = request.body.verificacao;
      const result = UsuarioGUID
        ? await this.#service.reenviarCodigo(UsuarioGUID)
        : await this.#service.reenviarCodigoPorEmail(UsuarioEmail);

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
