import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";

/**
 * Middleware de validação para rotas de Turma
 * 
 * Valida:
 * - Formato de campos (tipos, tamanhos, padrões)
 * - UUIDs válidos
 * - Campos obrigatórios vs opcionais
 * - Enum values (status)
 */
export class TurmaMiddleware {
  /**
   * Valida body para criação de turma (POST)
   * Aceita tanto cadastro individual quanto em massa
   */
  static validarCriacao = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const { turma, turmas } = req.body;

      // Se for cadastro em massa, pular validação detalhada (controller valida)
      if (turmas && Array.isArray(turmas)) {
        if (turmas.length === 0) {
          throw new ErrorResponse(400, 'Array "turmas" não pode estar vazio');
        }
        next();
        return;
      }

      // Validação para cadastro individual
      if (!turma || typeof turma !== "object") {
        throw new ErrorResponse(
          400,
          'Campo "turma" é obrigatório e deve ser um objeto'
        );
      }

      // EscolaGUID: obrigatório, UUID
      if (!turma.EscolaGUID || typeof turma.EscolaGUID !== "string") {
        throw new ErrorResponse(400, "EscolaGUID é obrigatório");
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(turma.EscolaGUID)) {
        throw new ErrorResponse(400, "EscolaGUID deve ser um UUID válido");
      }

      // TurmaSerie: obrigatório, 1-20 caracteres
      if (!turma.TurmaSerie || typeof turma.TurmaSerie !== "string") {
        throw new ErrorResponse(400, "TurmaSerie é obrigatório");
      }

      const serieTrimmed = turma.TurmaSerie.trim();
      if (serieTrimmed.length < 1 || serieTrimmed.length > 20) {
        throw new ErrorResponse(
          400,
          "TurmaSerie deve ter entre 1 e 20 caracteres"
        );
      }

      // TurmaNome: obrigatório, 1-50 caracteres
      if (!turma.TurmaNome || typeof turma.TurmaNome !== "string") {
        throw new ErrorResponse(400, "TurmaNome é obrigatório");
      }

      const nomeTrimmed = turma.TurmaNome.trim();
      if (nomeTrimmed.length < 1 || nomeTrimmed.length > 50) {
        throw new ErrorResponse(
          400,
          "TurmaNome deve ter entre 1 e 50 caracteres"
        );
      }

      // TurmaIsTecnico: obrigatório, boolean
      if (typeof turma.TurmaIsTecnico !== "boolean") {
        throw new ErrorResponse(400, "TurmaIsTecnico é obrigatório e deve ser boolean");
      }

      // CursoGUID: opcional, UUID ou null
      if (turma.CursoGUID !== undefined && turma.CursoGUID !== null) {
        if (typeof turma.CursoGUID !== "string") {
          throw new ErrorResponse(400, "CursoGUID deve ser um UUID válido ou null");
        }
        if (!uuidRegex.test(turma.CursoGUID)) {
          throw new ErrorResponse(400, "CursoGUID deve ser um UUID válido");
        }
      }

      // TurmaStatus: opcional, enum
      if (
        turma.TurmaStatus !== undefined &&
        turma.TurmaStatus !== "Ativa" &&
        turma.TurmaStatus !== "Inativa" &&
        turma.TurmaStatus !== "Encerrada"
      ) {
        throw new ErrorResponse(
          400,
          'TurmaStatus deve ser "Ativa", "Inativa" ou "Encerrada"'
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
          message: "Erro ao validar dados da turma",
        });
      }
    }
  };

  /**
   * Valida body para atualização de turma (PUT)
   */
  static validarAtualizacao = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const { turma } = req.body;

      if (!turma || typeof turma !== "object") {
        throw new ErrorResponse(
          400,
          'Campo "turma" é obrigatório e deve ser um objeto'
        );
      }

      // Pelo menos um campo deve ser fornecido
      if (
        !turma.TurmaSerie &&
        !turma.TurmaNome &&
        turma.TurmaIsTecnico === undefined &&
        turma.CursoGUID === undefined &&
        !turma.TurmaStatus
      ) {
        throw new ErrorResponse(
          400,
          "É necessário fornecer ao menos um campo para atualização"
        );
      }

      // TurmaSerie: opcional, 1-20 caracteres
      if (turma.TurmaSerie !== undefined) {
        if (typeof turma.TurmaSerie !== "string") {
          throw new ErrorResponse(400, "TurmaSerie deve ser uma string");
        }

        const serieTrimmed = turma.TurmaSerie.trim();
        if (serieTrimmed.length < 1 || serieTrimmed.length > 20) {
          throw new ErrorResponse(
            400,
            "TurmaSerie deve ter entre 1 e 20 caracteres"
          );
        }
      }

      // TurmaNome: opcional, 1-50 caracteres
      if (turma.TurmaNome !== undefined) {
        if (typeof turma.TurmaNome !== "string") {
          throw new ErrorResponse(400, "TurmaNome deve ser uma string");
        }

        const nomeTrimmed = turma.TurmaNome.trim();
        if (nomeTrimmed.length < 1 || nomeTrimmed.length > 50) {
          throw new ErrorResponse(
            400,
            "TurmaNome deve ter entre 1 e 50 caracteres"
          );
        }
      }

      // TurmaIsTecnico: opcional, boolean
      if (turma.TurmaIsTecnico !== undefined && typeof turma.TurmaIsTecnico !== "boolean") {
        throw new ErrorResponse(400, "TurmaIsTecnico deve ser boolean");
      }

      // CursoGUID: opcional, UUID ou null
      if (turma.CursoGUID !== undefined && turma.CursoGUID !== null) {
        if (typeof turma.CursoGUID !== "string") {
          throw new ErrorResponse(400, "CursoGUID deve ser um UUID válido ou null");
        }
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(turma.CursoGUID)) {
          throw new ErrorResponse(400, "CursoGUID deve ser um UUID válido");
        }
      }

      // TurmaStatus: opcional, enum
      if (
        turma.TurmaStatus !== undefined &&
        turma.TurmaStatus !== "Ativa" &&
        turma.TurmaStatus !== "Inativa" &&
        turma.TurmaStatus !== "Encerrada"
      ) {
        throw new ErrorResponse(
          400,
          'TurmaStatus deve ser "Ativa", "Inativa" ou "Encerrada"'
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
          message: "Erro ao validar dados da turma",
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
        throw new ErrorResponse(400, "GUID da turma é obrigatório");
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(guid)) {
        throw new ErrorResponse(400, "GUID da turma deve ser um UUID válido");
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
          message: "Erro ao validar GUID da turma",
        });
      }
    }
  };
}
