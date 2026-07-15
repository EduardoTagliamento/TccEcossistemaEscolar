import { NextFunction, Request, Response } from "express";
import ProvaAgendadaService, {
  ProvaAgendadaCreateDTO,
  ProvaAgendadaUpdateDTO,
} from "../services/provaagendada.service";
import { ProvaAgendadaFilters } from "../repositories/provaagendada.repository";

/**
 * Controller para endpoints de ProvaAgendada (REFATORADO - N:N NORMALIZADO)
 *
 * Endpoints:
 * - POST   /api/prova                              (criar prova para N turmas)
 * - GET    /api/prova                              (listar com filtros)
 * - GET    /api/prova/:ProvaAgendadaGUID           (buscar por GUID)
 * - PUT    /api/prova/:ProvaAgendadaGUID           (atualizar dados compartilhados)
 * - DELETE /api/prova/:ProvaAgendadaGUID           (excluir)
 */
export default class ProvaAgendadaControl {
  #provaService: ProvaAgendadaService;

  constructor(provaServiceDependency: ProvaAgendadaService) {
    console.log("⬆️  ProvaAgendadaControl.constructor()");
    this.#provaService = provaServiceDependency;
  }

  /**
   * POST /api/prova
   * Criar nova prova agendada para N turmas
   */
  store = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 ProvaAgendadaControl.store()");
    try {
      const { prova } = request.body;
      const usuarioCPF = request.user?.UsuarioCPF;

      const datasPorTurma: Record<string, Date> | undefined = prova.DatasPorTurma
        ? Object.fromEntries(
            Object.entries(prova.DatasPorTurma as Record<string, string>).map(([turmaGUID, data]) => [
              turmaGUID,
              new Date(data),
            ])
          )
        : undefined;

      const createData: ProvaAgendadaCreateDTO = {
        TurmasGUID: prova.TurmasGUID, // Array de turmas
        MateriaGUID: prova.MateriaGUID,
        ProvaData: new Date(prova.ProvaData), // Formato: "2026-05-20T15:00:00"
        ProvaDescricao: prova.ProvaDescricao,
        anexosDescricao: prova.anexosDescricao,
        DatasPorTurma: datasPorTurma,
      };

      const provaCriada = await this.#provaService.criarProva(createData, usuarioCPF);

      response.status(201).json({
        success: true,
        message: "Prova criada com sucesso",
        data: { prova: provaCriada },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/prova
   * Listar provas com filtros opcionais (sem TurmaGUID - agora via join)
   */
  index = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 ProvaAgendadaControl.index()");
    try {
      const filters: ProvaAgendadaFilters = {
        MateriaGUID: request.query.MateriaGUID as string | undefined,
        ProvaStatus: request.query.ProvaStatus as
          | "Agendada"
          | "Realizada"
          | "Cancelada"
          | undefined,
        DataInicio: request.query.DataInicio
          ? new Date(request.query.DataInicio as string)
          : undefined,
        DataFim: request.query.DataFim ? new Date(request.query.DataFim as string) : undefined,
      };

      const provas = await this.#provaService.listarProvas(filters);

      response.status(200).json({
        success: true,
        message: "Executado com sucesso",
        data: { provas, total: provas.length },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/prova/:ProvaAgendadaGUID
   * Buscar prova por GUID
   */
  show = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 ProvaAgendadaControl.show()");
    try {
      const { ProvaAgendadaGUID } = request.params;
      const prova = await this.#provaService.buscarProva(ProvaAgendadaGUID);

      response.status(200).json({
        success: true,
        message: "Prova encontrada",
        data: { prova },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/prova/:ProvaAgendadaGUID
   * Atualizar prova
   */
  update = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 ProvaAgendadaControl.update()");
    try {
      const { ProvaAgendadaGUID } = request.params;
      const { prova } = request.body;
      const usuarioCPF = request.user?.UsuarioCPF;

      const updateData: ProvaAgendadaUpdateDTO = {
        ProvaData: prova.ProvaData ? new Date(prova.ProvaData) : undefined, // Formato: "2026-05-20T15:00:00"
        ProvaDescricao: prova.ProvaDescricao,
        ProvaStatus: prova.ProvaStatus,
      };

      const provaAtualizada = await this.#provaService.atualizarProva(
        ProvaAgendadaGUID,
        updateData,
        usuarioCPF
      );

      response.status(200).json({
        success: true,
        message: "Prova atualizada com sucesso",
        data: { prova: provaAtualizada },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/prova/:ProvaAgendadaGUID
   * Excluir prova
   */
  destroy = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 ProvaAgendadaControl.destroy()");
    try {
      const { ProvaAgendadaGUID } = request.params;
      const usuarioCPF = request.user?.UsuarioCPF;

      const excluida = await this.#provaService.excluirProva(ProvaAgendadaGUID, usuarioCPF);

      if (!excluida) {
        response.status(404).json({
          success: false,
          message: "Prova não encontrada",
          error: { message: `Não existe prova com id ${ProvaAgendadaGUID}` },
        });
        return;
      }

      response.status(200).json({
        success: true,
        message: "Prova excluída com sucesso",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };
}
