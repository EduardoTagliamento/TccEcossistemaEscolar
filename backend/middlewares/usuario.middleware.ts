import { NextFunction, Request, Response } from "express";
import ErrorResponse from "../utils/ErrorResponse.js";

export default class UsuarioMiddleware {
  validateCreateBody = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 UsuarioMiddleware.validateCreateBody()");
    const body = request.body;

    if (!body.usuario) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'usuario' é obrigatório!",
      });
    }

    this.validateCampos(body.usuario);
    next();
  };

  validateUpdateBody = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 UsuarioMiddleware.validateUpdateBody()");
    const body = request.body;

    if (!body.usuario) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O campo 'usuario' é obrigatório!",
      });
    }

    this.validateCampos(body.usuario, true);
    next();
  };

  validateCpfParam = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 UsuarioMiddleware.validateCpfParam()");
    const { UsuarioCPF } = request.params;

    if (!UsuarioCPF) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'UsuarioCPF' é obrigatório!",
      });
    }

    // Validar formato básico do CPF
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(UsuarioCPF)) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O CPF deve estar no formato XXX.XXX.XXX-XX",
      });
    }

    next();
  };

  private validateCampos(usuario: Record<string, unknown>, allowOptional = false): void {
    const camposPossiveis = [
      "UsuarioCPF",
      "UsuarioNome",
      "UsuarioEmail",
      "UsuarioSenha",
      "UsuarioId",
      "UsuarioTelefone",
    ];

    const camposObrigatorios = allowOptional ? [] : ["UsuarioCPF", "UsuarioNome", "UsuarioSenha"];

    // Validar campos obrigatórios
    for (const campo of camposObrigatorios) {
      const valor = usuario[campo];
      if (valor === undefined || valor === null || valor === "") {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: `O campo '${campo}' é obrigatório!`,
        });
      }
    }

    // Validar tipos dos campos presentes
    for (const campo of camposPossiveis) {
      if (usuario[campo] !== undefined && usuario[campo] !== null) {
        if (typeof usuario[campo] !== "string") {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: `O campo '${campo}' deve ser string.`,
          });
        }

        // Validações específicas
        const valor = usuario[campo] as string;

        if (campo === "UsuarioCPF" && valor.length !== 14) {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: "O campo 'UsuarioCPF' deve ter 14 caracteres (XXX.XXX.XXX-XX).",
          });
        }

        if (campo === "UsuarioNome" && (valor.length < 3 || valor.length > 100)) {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: "O campo 'UsuarioNome' deve ter entre 3 e 100 caracteres.",
          });
        }

        if (campo === "UsuarioEmail" && valor.length > 60) {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: "O campo 'UsuarioEmail' deve ter no máximo 60 caracteres.",
          });
        }

        if (campo === "UsuarioTelefone" && valor.length > 15) {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: "O campo 'UsuarioTelefone' deve ter no máximo 15 caracteres (formato: (XX) XXXXX-XXXX).",
          });
        }

        if (campo === "UsuarioSenha" && valor.length < 6) {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: "O campo 'UsuarioSenha' deve ter pelo menos 6 caracteres.",
          });
        }

        if (campo === "UsuarioId" && valor.length > 45) {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: "O campo 'UsuarioId' deve ter no máximo 45 caracteres.",
          });
        }
      }
    }
  }
}
