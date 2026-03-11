import { NextFunction, Request, Response } from "express";
import ErrorResponse from "../utils/ErrorResponse.js";

export default class UsuarioMiddleware {
  validateCreateBody = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 UsuarioMiddleware.validateCreateBody()");
    const usuario = this.extractUsuarioPayload(request.body);
    this.normalizeUsuarioCampos(usuario);
    this.validateCampos(usuario);

    // Mantem compatibilidade com controller/service atuais.
    request.body.usuario = usuario;
    next();
  };

  validateUpdateBody = (request: Request, _response: Response, next: NextFunction) => {
    console.log("🔷 UsuarioMiddleware.validateUpdateBody()");
    const usuario = this.extractUsuarioPayload(request.body);
    this.normalizeUsuarioCampos(usuario);
    this.validateCampos(usuario, true);

    // Mantem compatibilidade com controller/service atuais.
    request.body.usuario = usuario;
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
      "UsuarioEmailVerificado",
      "UsuarioDataNascimento",
      "UsuarioStatus",
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
        // Campos string
        if (["UsuarioCPF", "UsuarioNome", "UsuarioEmail", "UsuarioSenha", "UsuarioId", "UsuarioTelefone", "UsuarioDataNascimento", "UsuarioStatus"].includes(campo)) {
          if (typeof usuario[campo] !== "string") {
            throw new ErrorResponse(400, "Erro na validação de dados", {
              message: `O campo '${campo}' deve ser string.`,
            });
          }

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

          if (campo === "UsuarioTelefone" && valor.length !== 15) {
            throw new ErrorResponse(400, "Erro na validação de dados", {
              message: "O campo 'UsuarioTelefone' deve ter 15 caracteres (formato: (XX) XXXXX-XXXX).",
            });
          }

          if (campo === "UsuarioTelefone") {
            const telefoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
            if (!telefoneRegex.test(valor)) {
              throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'UsuarioTelefone' deve estar no formato (XX) XXXXX-XXXX.",
              });
            }
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

          if (campo === "UsuarioDataNascimento") {
            // Validar formato YYYY-MM-DD
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(valor)) {
              throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'UsuarioDataNascimento' deve estar no formato YYYY-MM-DD.",
              });
            }
          }

          if (campo === "UsuarioStatus") {
            const statusValidos = ["Ativo", "Inativo", "Bloqueado"];
            if (!statusValidos.includes(valor)) {
              throw new ErrorResponse(400, "Erro na validação de dados", {
                message: "O campo 'UsuarioStatus' deve ser 'Ativo', 'Inativo' ou 'Bloqueado'.",
              });
            }
          }
        }

        // Campo boolean
        if (campo === "UsuarioEmailVerificado" && typeof usuario[campo] !== "boolean") {
          throw new ErrorResponse(400, "Erro na validação de dados", {
            message: "O campo 'UsuarioEmailVerificado' deve ser boolean.",
          });
        }
      }
    }
  }

  private extractUsuarioPayload(body: unknown): Record<string, unknown> {
    if (!body || typeof body !== "object") {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "Corpo da requisição inválido.",
      });
    }

    const bodyObj = body as Record<string, unknown>;

    if (bodyObj.usuario && typeof bodyObj.usuario === "object" && !Array.isArray(bodyObj.usuario)) {
      return bodyObj.usuario as Record<string, unknown>;
    }

    return bodyObj;
  }

  private normalizeUsuarioCampos(usuario: Record<string, unknown>): void {
    if (typeof usuario.UsuarioCPF === "string") {
      const digits = usuario.UsuarioCPF.replace(/\D/g, "");
      if (digits.length === 11) {
        usuario.UsuarioCPF = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
      }
    }

    if (typeof usuario.UsuarioTelefone === "string") {
      const digits = usuario.UsuarioTelefone.replace(/\D/g, "");
      if (digits.length === 11) {
        usuario.UsuarioTelefone = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
      }
    }
  }
}
