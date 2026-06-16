import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";

export class MateriaMiddleware {
  // Validar body do POST (criar matéria)
  static validarCriacao = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 MateriaMiddleware.validarCriacao()");

    const { materia } = req.body;

    if (!materia) {
      return next(
        new ErrorResponse(400, "Dados inválidos", {
          message: "O campo 'materia' é obrigatório",
        })
      );
    }

    const { EscolaGUID, MateriaNome, MateriaIsTecnica } = materia;

    // Validar EscolaGUID
    if (!EscolaGUID || typeof EscolaGUID !== "string") {
      return next(
        new ErrorResponse(400, "EscolaGUID inválido", {
          message: "EscolaGUID é obrigatório e deve ser uma string",
        })
      );
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(EscolaGUID)) {
      return next(
        new ErrorResponse(400, "EscolaGUID inválido", {
          message: "EscolaGUID deve ser um UUID válido",
        })
      );
    }

    // Validar MateriaNome
    if (!MateriaNome || typeof MateriaNome !== "string") {
      return next(
        new ErrorResponse(400, "MateriaNome inválido", {
          message: "MateriaNome é obrigatório e deve ser uma string",
        })
      );
    }

    const nomeTrimmed = MateriaNome.trim();
    if (nomeTrimmed.length < 3 || nomeTrimmed.length > 100) {
      return next(
        new ErrorResponse(400, "MateriaNome inválido", {
          message: "MateriaNome deve ter entre 3 e 100 caracteres",
        })
      );
    }

    // Validar MateriaIsTecnica
    if (typeof MateriaIsTecnica !== "boolean") {
      return next(
        new ErrorResponse(400, "MateriaIsTecnica inválido", {
          message: "MateriaIsTecnica é obrigatório e deve ser um booleano",
        })
      );
    }

    // Validar MateriaStatus (opcional)
    if (materia.MateriaStatus !== undefined) {
      const statusValidos = ["Ativa", "Inativa"];
      if (!statusValidos.includes(materia.MateriaStatus)) {
        return next(
          new ErrorResponse(400, "MateriaStatus inválido", {
            message: "MateriaStatus deve ser 'Ativa' ou 'Inativa'",
          })
        );
      }
    }

    next();
  };

  // Validar body do PUT (atualizar matéria)
  static validarAtualizacao = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 MateriaMiddleware.validarAtualizacao()");

    const { materia } = req.body;

    if (!materia) {
      return next(
        new ErrorResponse(400, "Dados inválidos", {
          message: "O campo 'materia' é obrigatório",
        })
      );
    }

    // MateriaNome (opcional, mas se fornecido deve ser válido)
    if (materia.MateriaNome !== undefined) {
      if (typeof materia.MateriaNome !== "string") {
        return next(
          new ErrorResponse(400, "MateriaNome inválido", {
            message: "MateriaNome deve ser uma string",
          })
        );
      }

      const nomeTrimmed = materia.MateriaNome.trim();
      if (nomeTrimmed.length < 3 || nomeTrimmed.length > 100) {
        return next(
          new ErrorResponse(400, "MateriaNome inválido", {
            message: "MateriaNome deve ter entre 3 e 100 caracteres",
          })
        );
      }
    }

    // MateriaIsTecnico (opcional, mas se fornecido deve ser booleano)
    if (materia.MateriaIsTecnico !== undefined) {
      if (typeof materia.MateriaIsTecnico !== "boolean") {
        return next(
          new ErrorResponse(400, "MateriaIsTecnico inválido", {
            message: "MateriaIsTecnico deve ser um booleano",
          })
        );
      }
    }

    // MateriaStatus (opcional, mas se fornecido deve ser válido)
    if (materia.MateriaStatus !== undefined) {
      const statusValidos = ["Ativa", "Inativa"];
      if (!statusValidos.includes(materia.MateriaStatus)) {
        return next(
          new ErrorResponse(400, "MateriaStatus inválido", {
            message: "MateriaStatus deve ser 'Ativa' ou 'Inativa'",
          })
        );
      }
    }

    next();
  };

  // Validar GUID no param
  static validarGUID = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 MateriaMiddleware.validarGUID()");

    const { guid } = req.params;

    if (!guid) {
      return next(
        new ErrorResponse(400, "GUID não fornecido", {
          message: "O parâmetro GUID é obrigatório",
        })
      );
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(guid)) {
      return next(
        new ErrorResponse(400, "GUID inválido", {
          message: "O GUID fornecido não é um UUID válido",
        })
      );
    }

    next();
  };
}
