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
          400,
          'Campo "curso" é obrigatório e deve ser um objeto'
        );
      }

      // EscolaGUID: obrigatório, UUID
      if (!curso.EscolaGUID || typeof curso.EscolaGUID !== "string") {
        throw new ErrorResponse(400, "EscolaGUID é obrigatório");
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(curso.EscolaGUID)) {
        throw new ErrorResponse(400, "EscolaGUID deve ser um UUID válido");
      }

      // CursoNome: obrigatório, 3-100 caracteres
      if (!curso.CursoNome || typeof curso.CursoNome !== "string") {
        throw new ErrorResponse(400, "CursoNome é obrigatório");
      }

      const nomeTrimmed = curso.CursoNome.trim();
      if (nomeTrimmed.length < 3 || nomeTrimmed.length > 100) {
        throw new ErrorResponse(
          400,
          "CursoNome deve ter entre 3 e 100 caracteres"
        );
      }

      // CursoStatus: opcional, enum
      if (
        curso.CursoStatus !== undefined &&
        curso.CursoStatus !== "Ativo" &&
        curso.CursoStatus !== "Inativo"
      ) {
        throw new ErrorResponse(
          400,
          'CursoStatus deve ser "Ativo" ou "Inativo"'
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
          400,
          'Campo "curso" é obrigatório e deve ser um objeto'
        );
      }

      // Pelo menos um campo deve ser fornecido
      if (!curso.CursoNome && !curso.CursoStatus) {
        throw new ErrorResponse(
          400,
          "É necessário fornecer ao menos um campo para atualização"
        );
      }

      // CursoNome: opcional, 3-100 caracteres
      if (curso.CursoNome !== undefined) {
        if (typeof curso.CursoNome !== "string") {
          throw new ErrorResponse(400, "CursoNome deve ser uma string");
        }

        const nomeTrimmed = curso.CursoNome.trim();
        if (nomeTrimmed.length < 3 || nomeTrimmed.length > 100) {
          throw new ErrorResponse(
            400,
            "CursoNome deve ter entre 3 e 100 caracteres"
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
          400,
          'CursoStatus deve ser "Ativo" ou "Inativo"'
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
        throw new ErrorResponse(400, "GUID do curso é obrigatório");
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(guid)) {
        throw new ErrorResponse(400, "GUID do curso deve ser um UUID válido");
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
