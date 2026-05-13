import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";

/**
 * Middleware de validação para rotas de Curso
 * 
 * Valida:
 * - Formato de campos (tipos, tamanhos, padrões)
 * - UUIDs válidos
 * - Campos obrigatórios vs opcionais
 */
export class CursoMiddleware {
  /**
   * Valida body para criação de curso (POST)
   */
  static validarCriacao = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const { curso } = req.body;

      if (!curso || typeof curso !== "object") {
        throw new ErrorResponse(
          'Campo "curso" é obrigatório e deve ser um objeto',
          400
        );
      }

      // EscolaGUID: obrigatório, UUID
      if (!curso.EscolaGUID || typeof curso.EscolaGUID !== "string") {
        throw new ErrorResponse("EscolaGUID é obrigatório", 400);
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(curso.EscolaGUID)) {
        throw new ErrorResponse("EscolaGUID deve ser um UUID válido", 400);
      }

      // CursoNome: obrigatório, 3-100 caracteres
      if (!curso.CursoNome || typeof curso.CursoNome !== "string") {
        throw new ErrorResponse("CursoNome é obrigatório", 400);
      }

      const nomeTrimmed = curso.CursoNome.trim();
      if (nomeTrimmed.length < 3 || nomeTrimmed.length > 100) {
        throw new ErrorResponse(
          "CursoNome deve ter entre 3 e 100 caracteres",
          400
        );
      }

      // CursoStatus: opcional, enum
      if (
        curso.CursoStatus !== undefined &&
        curso.CursoStatus !== "Ativo" &&
        curso.CursoStatus !== "Inativo"
      ) {
        throw new ErrorResponse(
          'CursoStatus deve ser "Ativo" ou "Inativo"',
          400
        );
      }

      next();
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Erro ao validar dados do curso",
        });
      }
    }
  };

  /**
   * Valida body para atualização de curso (PUT)
   */
  static validarAtualizacao = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const { curso } = req.body;

      if (!curso || typeof curso !== "object") {
        throw new ErrorResponse(
          'Campo "curso" é obrigatório e deve ser um objeto',
          400
        );
      }

      // Pelo menos um campo deve ser fornecido
      if (!curso.CursoNome && !curso.CursoStatus) {
        throw new ErrorResponse(
          "É necessário fornecer ao menos um campo para atualização",
          400
        );
      }

      // CursoNome: opcional, 3-100 caracteres
      if (curso.CursoNome !== undefined) {
        if (typeof curso.CursoNome !== "string") {
          throw new ErrorResponse("CursoNome deve ser uma string", 400);
        }

        const nomeTrimmed = curso.CursoNome.trim();
        if (nomeTrimmed.length < 3 || nomeTrimmed.length > 100) {
          throw new ErrorResponse(
            "CursoNome deve ter entre 3 e 100 caracteres",
            400
          );
        }
      }

      // CursoStatus: opcional, enum
      if (
        curso.CursoStatus !== undefined &&
        curso.CursoStatus !== "Ativo" &&
        curso.CursoStatus !== "Inativo"
      ) {
        throw new ErrorResponse(
          'CursoStatus deve ser "Ativo" ou "Inativo"',
          400
        );
      }

      next();
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Erro ao validar dados do curso",
        });
      }
    }
  };

  /**
   * Valida GUID nos params da URL
   */
  static validarGUID = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const { guid } = req.params;

      if (!guid || typeof guid !== "string") {
        throw new ErrorResponse("GUID do curso é obrigatório", 400);
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(guid)) {
        throw new ErrorResponse("GUID do curso deve ser um UUID válido", 400);
      }

      next();
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Erro ao validar GUID do curso",
        });
      }
    }
  };
}
