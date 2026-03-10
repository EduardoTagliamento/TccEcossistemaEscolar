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

    const body = request.body.verificacao;

    if (!body || typeof body !== "object") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'verificacao' é obrigatório no body.",
      });
    }

    // Validar UsuarioCPF
    if (!body.UsuarioCPF || typeof body.UsuarioCPF !== "string") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'UsuarioCPF' é obrigatório e deve ser string.",
      });
    }

    const cpf = body.UsuarioCPF.trim();
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    
    if (!cpfRegex.test(cpf)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O CPF deve estar no formato XXX.XXX.XXX-XX.",
      });
    }

    // Validar VerificacaoCodigo
    if (!body.VerificacaoCodigo || typeof body.VerificacaoCodigo !== "string") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'VerificacaoCodigo' é obrigatório e deve ser string.",
      });
    }

    const codigo = body.VerificacaoCodigo.trim();
    
    // Validar formato: exatamente 6 dígitos numéricos
    if (codigo.length !== 6) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O código deve ter exatamente 6 dígitos.",
      });
    }

    const codigoRegex = /^\d{6}$/;
    if (!codigoRegex.test(codigo)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O código deve conter apenas dígitos numéricos (0-9).",
      });
    }

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

    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(UsuarioCPF)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O CPF deve estar no formato XXX.XXX.XXX-XX.",
      });
    }

    next();
  };
}
