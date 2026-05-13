import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";

/**
 * Middleware de validação para rotas de Professor e Alocações
 * 
 * Valida:
 * - Formato de campos (tipos, tamanhos, padrões)
 * - CPF e UUIDs válidos
 * - Campos obrigatórios vs opcionais
 * - Enum values (status)
 */
export class ProfessorMiddleware {
  /**
   * Valida query params para listagem de professores
   */
  static validarListagemProfessores = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const { EscolaGUID } = req.query;

      if (!EscolaGUID || typeof EscolaGUID !== "string") {
        throw new ErrorResponse(400, "EscolaGUID é obrigatório na query string");
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(EscolaGUID)) {
        throw new ErrorResponse(400, "EscolaGUID deve ser um UUID válido");
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
          message: "Erro ao validar parâmetros de listagem",
        });
      }
    }
  };

  /**
   * Valida params da rota de alocações do professor
   * GET /api/professor/:cpf/escolas/:escolaGUID/alocacoes
   */
  static validarBuscarAlocacoesProfessor = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const { cpf, escolaGUID } = req.params;

      // Validar CPF
      if (!cpf || typeof cpf !== "string") {
        throw new ErrorResponse(400, "CPF do professor é obrigatório");
      }

      const cpfLimpo = cpf.replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        throw new ErrorResponse(400, "CPF deve ter 11 dígitos");
      }

      // Validar EscolaGUID
      if (!escolaGUID || typeof escolaGUID !== "string") {
        throw new ErrorResponse(400, "EscolaGUID é obrigatório");
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(escolaGUID)) {
        throw new ErrorResponse(400, "EscolaGUID deve ser um UUID válido");
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
          message: "Erro ao validar parâmetros da busca",
        });
      }
    }
  };

  /**
   * Valida body para criação de alocação (POST)
   */
  static validarCriacaoAlocacao = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const { alocacao } = req.body;

      if (!alocacao || typeof alocacao !== "object") {
        throw new ErrorResponse(
          400,
          'Campo "alocacao" é obrigatório e deve ser um objeto'
        );
      }

      // MateriaGUID: obrigatório, UUID
      if (!alocacao.MateriaGUID || typeof alocacao.MateriaGUID !== "string") {
        throw new ErrorResponse(400, "MateriaGUID é obrigatório");
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(alocacao.MateriaGUID)) {
        throw new ErrorResponse(400, "MateriaGUID deve ser um UUID válido");
      }

      // TurmaGUID: obrigatório, UUID
      if (!alocacao.TurmaGUID || typeof alocacao.TurmaGUID !== "string") {
        throw new ErrorResponse(400, "TurmaGUID é obrigatório");
      }

      if (!uuidRegex.test(alocacao.TurmaGUID)) {
        throw new ErrorResponse(400, "TurmaGUID deve ser um UUID válido");
      }

      // UsuarioCPF: obrigatório, formato CPF
      if (!alocacao.UsuarioCPF || typeof alocacao.UsuarioCPF !== "string") {
        throw new ErrorResponse(400, "UsuarioCPF é obrigatório");
      }

      const cpfLimpo = alocacao.UsuarioCPF.replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        throw new ErrorResponse(400, "UsuarioCPF deve ter 11 dígitos");
      }

      // AlocacaoStatus: opcional, enum
      if (
        alocacao.AlocacaoStatus !== undefined &&
        alocacao.AlocacaoStatus !== "Ativa" &&
        alocacao.AlocacaoStatus !== "Inativa"
      ) {
        throw new ErrorResponse(400, 'AlocacaoStatus deve ser "Ativa" ou "Inativa"');
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
          message: "Erro ao validar dados da alocação",
        });
      }
    }
  };

  /**
   * Valida body para atualização de alocação (PUT)
   */
  static validarAtualizacaoAlocacao = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const { alocacao } = req.body;

      if (!alocacao || typeof alocacao !== "object") {
        throw new ErrorResponse(
          400,
          'Campo "alocacao" é obrigatório e deve ser um objeto'
        );
      }

      // Pelo menos um campo deve ser fornecido
      if (!alocacao.AlocacaoStatus) {
        throw new ErrorResponse(
          400,
          "É necessário fornecer ao menos um campo para atualização"
        );
      }

      // AlocacaoStatus: enum
      if (
        alocacao.AlocacaoStatus !== "Ativa" &&
        alocacao.AlocacaoStatus !== "Inativa"
      ) {
        throw new ErrorResponse(400, 'AlocacaoStatus deve ser "Ativa" ou "Inativa"');
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
          message: "Erro ao validar dados da alocação",
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
        throw new ErrorResponse(400, "GUID da alocação é obrigatório");
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(guid)) {
        throw new ErrorResponse(400, "GUID da alocação deve ser um UUID válido");
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
          message: "Erro ao validar GUID da alocação",
        });
      }
    }
  };
}
