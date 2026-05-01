import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse.js";

export default class VerificacaoEmailMiddleware {
  constructor() {
    console.log("⬆️  VerificacaoEmailMiddleware.constructor()");
  }

  /**
   * Valida dados para validar código (POST /validar)
   */
  validateCodigoBody = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 VerificacaoEmailMiddleware.validateCodigoBody()");

    const body = this.extractBody(request.body, "verificacao");
    const cpfInput = (body.UsuarioCPF as string | undefined)?.trim();
    const emailInput = ((body.UsuarioEmail as string | undefined) || (body.email as string | undefined))?.trim();
    const codigoInput = ((body.VerificacaoCodigo as string | undefined) || (body.codigo as string | undefined))?.trim();

    if (!cpfInput && !emailInput) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "Informe 'UsuarioCPF' ou 'email' para validar o código.",
      });
    }

    let cpfNormalizado: string | undefined;
    if (cpfInput) {
      const digits = cpfInput.replace(/\D/g, "");
      if (digits.length !== 11) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O CPF deve ter 11 dígitos.",
        });
      }

      cpfNormalizado = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    }

    if (emailInput) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput)) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'email' deve ser um email válido.",
        });
      }
    }

    // Validar VerificacaoCodigo
    if (!codigoInput) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'VerificacaoCodigo' (ou 'codigo') é obrigatório.",
      });
    }

    if (codigoInput.length !== 6) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O código deve ter exatamente 6 dígitos.",
      });
    }

    const codigoRegex = /^\d{6}$/;
    if (!codigoRegex.test(codigoInput)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O código deve conter apenas dígitos numéricos (0-9).",
      });
    }

    request.body.verificacao = {
      UsuarioCPF: cpfNormalizado,
      UsuarioEmail: emailInput,
      VerificacaoCodigo: codigoInput,
    };

    next();
  };

  /**
   * Valida body para reenvio (POST /reenviar)
   */
  validateReenviarBody = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 VerificacaoEmailMiddleware.validateReenviarBody()");

    const body = this.extractBody(request.body);
    const cpfInput = (body.UsuarioCPF as string | undefined)?.trim();
    const emailInput = ((body.UsuarioEmail as string | undefined) || (body.email as string | undefined))?.trim();

    if (!cpfInput && !emailInput) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "Informe 'UsuarioCPF' ou 'email' para reenviar o código.",
      });
    }

    let cpfNormalizado: string | undefined;
    if (cpfInput) {
      const digits = cpfInput.replace(/\D/g, "");
      if (digits.length !== 11) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O CPF deve ter 11 dígitos.",
        });
      }

      cpfNormalizado = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    }

    if (emailInput) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput)) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "O campo 'email' deve ser um email válido.",
        });
      }
    }

    request.body.verificacao = {
      UsuarioCPF: cpfNormalizado,
      UsuarioEmail: emailInput,
    };

    next();
  };

  /**
   * Valida CPF no parâmetro da URL
   */
  validateCpfParam = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 VerificacaoEmailMiddleware.validateCpfParam()");
    const { UsuarioCPF } = request.params;

    if (!UsuarioCPF) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'UsuarioCPF' é obrigatório.",
      });
    }

    const digits = UsuarioCPF.replace(/\D/g, "");
    if (digits.length !== 11) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O CPF deve ter 11 dígitos.",
      });
    }

    request.params.UsuarioCPF = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;

    next();
  };

  private extractBody(body: unknown, nestedKey?: string): Record<string, unknown> {
    if (!body || typeof body !== "object") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "Corpo da requisição inválido.",
      });
    }

    const bodyObj = body as Record<string, unknown>;
    if (
      nestedKey &&
      bodyObj[nestedKey] &&
      typeof bodyObj[nestedKey] === "object" &&
      !Array.isArray(bodyObj[nestedKey])
    ) {
      return bodyObj[nestedKey] as Record<string, unknown>;
    }

    return bodyObj;
  }
}
