import { Request, Response } from "express";
import TurmaService, { TurmaCreateDTO, TurmaUpdateDTO } from "../services/turma.service";
import ErrorResponse from "../utils/ErrorResponse";
import { TurmaFilters } from "../repositories/turma.repository";

/**
 * Controller para endpoints de Turma
 * 
 * Responsabilidades:
 * - Receber requisições HTTP
 * - Extrair dados do request
 * - Chamar service
 * - Retornar response padronizado
 */
export class TurmaController {
  #turmaService: TurmaService;

  constructor(turmaService: TurmaService) {
    this.#turmaService = turmaService;
  }

  /**
   * POST /api/turma
   * Criar nova turma
   */
  store = async (req: Request, res: Response): Promise<void> => {
    try {
      const { turma } = req.body;
      const usuarioCPF = (req as any).usuario.cpf;

      const turmaDTO: TurmaCreateDTO = {
        EscolaGUID: turma.EscolaGUID,
        TurmaSerie: turma.TurmaSerie,
        TurmaNome: turma.TurmaNome,
        TurmaIsTecnico: turma.TurmaIsTecnico,
        CursoGUID: turma.CursoGUID,
        TurmaStatus: turma.TurmaStatus,
      };

      const turmaCriada = await this.#turmaService.criarTurma(
        turmaDTO,
        usuarioCPF
      );

      res.status(201).json({
        success: true,
        message: "Turma criada com sucesso",
        data: turmaCriada,
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error("Erro ao criar turma:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao criar turma",
        });
      }
    }
  };

  /**
   * GET /api/turma
   * Listar turmas (com filtros opcionais)
   */
  index = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: TurmaFilters = {};

      // Query params opcionais
      if (req.query.EscolaGUID) {
        filters.EscolaGUID = req.query.EscolaGUID as string;
      }

      if (req.query.CursoGUID) {
        filters.CursoGUID = req.query.CursoGUID as string;
      }

      if (req.query.TurmaIsTecnico !== undefined) {
        filters.TurmaIsTecnico = req.query.TurmaIsTecnico === 'true';
      }

      if (req.query.TurmaStatus) {
        filters.TurmaStatus = req.query.TurmaStatus as 'Ativa' | 'Inativa' | 'Encerrada';
      }

      const resultado = await this.#turmaService.listarTurmas(filters);

      res.status(200).json({
        success: true,
        message: "Turmas listadas com sucesso",
        data: resultado.turmas,
        total: resultado.total,
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error("Erro ao listar turmas:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao listar turmas",
        });
      }
    }
  };

  /**
   * GET /api/turma/:guid
   * Buscar turma por GUID
   */
  show = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;

      const turma = await this.#turmaService.buscarTurma(guid);

      res.status(200).json({
        success: true,
        message: "Turma encontrada",
        data: turma,
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error("Erro ao buscar turma:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao buscar turma",
        });
      }
    }
  };

  /**
   * PUT /api/turma/:guid
   * Atualizar turma
   */
  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const { turma } = req.body;
      const usuarioCPF = (req as any).usuario.cpf;

      const turmaDTO: TurmaUpdateDTO = {
        TurmaSerie: turma.TurmaSerie,
        TurmaNome: turma.TurmaNome,
        TurmaIsTecnico: turma.TurmaIsTecnico,
        CursoGUID: turma.CursoGUID,
        TurmaStatus: turma.TurmaStatus,
      };

      const turmaAtualizada = await this.#turmaService.atualizarTurma(
        guid,
        turmaDTO,
        usuarioCPF
      );

      res.status(200).json({
        success: true,
        message: "Turma atualizada com sucesso",
        data: turmaAtualizada,
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error("Erro ao atualizar turma:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao atualizar turma",
        });
      }
    }
  };

  /**
   * DELETE /api/turma/:guid
   * Excluir turma (soft delete)
   */
  destroy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const usuarioCPF = (req as any).usuario.cpf;

      await this.#turmaService.excluirTurma(guid, usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Turma excluída com sucesso",
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error("Erro ao excluir turma:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao excluir turma",
        });
      }
    }
  };
}
