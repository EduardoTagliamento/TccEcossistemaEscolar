import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";

/**
 * Middleware de validação para rotas de Matrícula
 * 
 * Valida:
 * - Formato de campos (tipos, tamanhos, padrões)
 * - CPF e UUIDs válidos
 * - Campos obrigatórios vs opcionais
 * - Enum values (status)
 * - Datas válidas
 */
export class MatriculaMiddleware {
  /**
   * Valida body para criação de matrícula (POST)
   * Aceita tanto cadastro individual quanto em massa
   */
  static validarCriacao = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const { matricula, matriculas } = req.body;

      // Se for cadastro em massa, pular validação detalhada (controller valida)
      if (matriculas && Array.isArray(matriculas)) {
        if (matriculas.length === 0) {
          throw new ErrorResponse(400, 'Array "matriculas" não pode estar vazio');
        }
        next();
        return;
      }

      // Validação para cadastro individual
      if (!matricula || typeof matricula !== "object") {
        throw new ErrorResponse(
          400,
          'Campo "matricula" é obrigatório e deve ser um objeto'
        );
      }

      // MatriculaGUID: opcional, se fornecido: 1-36 chars alfanumérico
      if (matricula.MatriculaGUID !== undefined && matricula.MatriculaGUID !== null) {
        if (typeof matricula.MatriculaGUID !== "string") {
          throw new ErrorResponse(400, "MatriculaGUID deve ser uma string");
        }
        const guidTrimmed = matricula.MatriculaGUID.trim();
        if (guidTrimmed.length < 1 || guidTrimmed.length > 36) {
          throw new ErrorResponse(
            400,
            "MatriculaGUID deve ter entre 1 e 36 caracteres"
          );
        }
      }

      // UsuarioCPF: obrigatório, formato CPF
      if (!matricula.UsuarioCPF || typeof matricula.UsuarioCPF !== "string") {
        throw new ErrorResponse(400, "UsuarioCPF é obrigatório");
      }

      const cpfLimpo = matricula.UsuarioCPF.replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        throw new ErrorResponse(400, "UsuarioCPF deve ter 11 dígitos");
      }

      // TurmaGUID: obrigatório, UUID
      if (!matricula.TurmaGUID || typeof matricula.TurmaGUID !== "string") {
        throw new ErrorResponse(400, "TurmaGUID é obrigatório");
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(matricula.TurmaGUID)) {
        throw new ErrorResponse(400, "TurmaGUID deve ser um UUID válido");
      }

      // MatriculaDataEntrada: opcional, data válida
      if (matricula.MatriculaDataEntrada !== undefined) {
        const data = new Date(matricula.MatriculaDataEntrada);
        if (isNaN(data.getTime())) {
          throw new ErrorResponse(400, "MatriculaDataEntrada deve ser uma data válida");
        }
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
          message: "Erro ao validar dados da matrícula",
        });
      }
    }
  };

  /**
   * Valida body para atualização de matrícula (PUT)
   */
  static validarAtualizacao = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const { matricula } = req.body;

      if (!matricula || typeof matricula !== "object") {
        throw new ErrorResponse(
          400,
          'Campo "matricula" é obrigatório e deve ser um objeto'
        );
      }

      // Pelo menos um campo deve ser fornecido
      if (
        !matricula.MatriculaDataEntrada &&
        !matricula.MatriculaDataSaida &&
        !matricula.MatriculaStatus
      ) {
        throw new ErrorResponse(
          400,
          "É necessário fornecer ao menos um campo para atualização"
        );
      }

      // MatriculaDataEntrada: opcional, data válida
      if (matricula.MatriculaDataEntrada !== undefined) {
        const data = new Date(matricula.MatriculaDataEntrada);
        if (isNaN(data.getTime())) {
          throw new ErrorResponse(400, "MatriculaDataEntrada deve ser uma data válida");
        }
      }

      // MatriculaDataSaida: opcional, data válida ou null
      if (matricula.MatriculaDataSaida !== undefined && matricula.MatriculaDataSaida !== null) {
        const data = new Date(matricula.MatriculaDataSaida);
        if (isNaN(data.getTime())) {
          throw new ErrorResponse(400, "MatriculaDataSaida deve ser uma data válida ou null");
        }
      }

      // MatriculaStatus: opcional, enum
      if (
        matricula.MatriculaStatus !== undefined &&
        matricula.MatriculaStatus !== "Ativa" &&
        matricula.MatriculaStatus !== "Transferida" &&
        matricula.MatriculaStatus !== "Concluida" &&
        matricula.MatriculaStatus !== "Cancelada"
      ) {
        throw new ErrorResponse(
          400,
          'MatriculaStatus deve ser "Ativa", "Transferida", "Concluida" ou "Cancelada"'
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
          message: "Erro ao validar dados da matrícula",
        });
      }
    }
  };

  /**
   * Valida body para transferência (POST /transferir)
   */
  static validarTransferencia = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const { transferencia } = req.body;

      if (!transferencia || typeof transferencia !== "object") {
        throw new ErrorResponse(
          400,
          'Campo "transferencia" é obrigatório e deve ser um objeto'
        );
      }

      // UsuarioCPF: obrigatório, formato CPF
      if (!transferencia.UsuarioCPF || typeof transferencia.UsuarioCPF !== "string") {
        throw new ErrorResponse(400, "UsuarioCPF é obrigatório");
      }

      const cpfLimpo = transferencia.UsuarioCPF.replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        throw new ErrorResponse(400, "UsuarioCPF deve ter 11 dígitos");
      }

      // TurmaOrigemGUID: obrigatório, UUID
      if (!transferencia.TurmaOrigemGUID || typeof transferencia.TurmaOrigemGUID !== "string") {
        throw new ErrorResponse(400, "TurmaOrigemGUID é obrigatório");
      }

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(transferencia.TurmaOrigemGUID)) {
        throw new ErrorResponse(400, "TurmaOrigemGUID deve ser um UUID válido");
      }

      // TurmaDestinoGUID: obrigatório, UUID
      if (!transferencia.TurmaDestinoGUID || typeof transferencia.TurmaDestinoGUID !== "string") {
        throw new ErrorResponse(400, "TurmaDestinoGUID é obrigatório");
      }

      if (!uuidRegex.test(transferencia.TurmaDestinoGUID)) {
        throw new ErrorResponse(400, "TurmaDestinoGUID deve ser um UUID válido");
      }

      // Validar que origem e destino são diferentes
      if (transferencia.TurmaOrigemGUID === transferencia.TurmaDestinoGUID) {
        throw new ErrorResponse(400, "Turma origem e destino devem ser diferentes");
      }

      // DataTransferencia: obrigatório, data válida
      if (!transferencia.DataTransferencia) {
        throw new ErrorResponse(400, "DataTransferencia é obrigatório");
      }

      const data = new Date(transferencia.DataTransferencia);
      if (isNaN(data.getTime())) {
        throw new ErrorResponse(400, "DataTransferencia deve ser uma data válida");
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
          message: "Erro ao validar dados da transferência",
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
        throw new ErrorResponse(400, "GUID da matrícula é obrigatório");
      }

      // MatriculaGUID pode ser RA customizado (1-36 chars) ou UUID
      const guidTrimmed = guid.trim();
      if (guidTrimmed.length < 1 || guidTrimmed.length > 36) {
        throw new ErrorResponse(400, "GUID da matrícula deve ter entre 1 e 36 caracteres");
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
          message: "Erro ao validar GUID da matrícula",
        });
      }
    }
  };
}
