import { Request, Response, NextFunction } from 'express';
import GrupoTarefaService from '../services/grupotarefa.service';
import ErrorResponse from '../utils/ErrorResponse';

/**
 * 🔵 Controller - GrupoTarefa
 * 
 * Endpoints:
 * - GET /api/grupotarefa/:tarefaGUID - Listar grupos de uma tarefa
 * - GET /api/grupotarefa/grupo/:grupoGUID - Buscar grupo específico
 * - PATCH /api/grupotarefa/:grupoGUID/nome - Atualizar nome do grupo
 * - DELETE /api/grupotarefa/:grupoGUID/membros/:cpf - Expulsar membro
 * - PATCH /api/grupotarefa/:grupoGUID/transferir-lider - Transferir liderança
 */
export default class GrupoTarefaController {
  #grupoTarefaService: GrupoTarefaService;

  constructor(grupoTarefaService: GrupoTarefaService) {
    console.log('🔵 GrupoTarefaController.constructor()');
    this.#grupoTarefaService = grupoTarefaService;
  }

  /**
   * GET /api/grupotarefa/:tarefaGUID
   * Listar todos os grupos de uma tarefa
   */
  listarGruposDaTarefa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 GrupoTarefaController.listarGruposDaTarefa()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: 'Não autenticado'
        });
        return;
      }

      const { tarefaGUID } = req.params;

      const grupos = await this.#grupoTarefaService.listarGruposDaTarefa(tarefaGUID, usuarioCPF);

      res.status(200).json({
        success: true,
        message: 'Grupos listados com sucesso',
        data: {
          grupos,
          total: grupos.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/grupotarefa/grupo/:grupoGUID
   * Buscar grupo específico com lista de membros
   */
  buscarGrupo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 GrupoTarefaController.buscarGrupo()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: 'Não autenticado'
        });
        return;
      }

      const { grupoGUID } = req.params;

      const grupo = await this.#grupoTarefaService.buscarGrupo(grupoGUID, usuarioCPF);

      res.status(200).json({
        success: true,
        message: 'Grupo encontrado',
        data: {
          grupo
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/grupotarefa/:grupoGUID/nome
   * Atualizar nome do grupo (apenas líder)
   */
  atualizarNomeGrupo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 GrupoTarefaController.atualizarNomeGrupo()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: 'Não autenticado'
        });
        return;
      }

      const { grupoGUID } = req.params;
      const { GrupoNome } = req.body;

      const resultado = await this.#grupoTarefaService.atualizarNomeGrupo(
        grupoGUID,
        GrupoNome,
        usuarioCPF
      );

      res.status(200).json({
        success: true,
        message: resultado.mensagem,
        data: null
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/grupotarefa/:grupoGUID/membros/:cpf
   * Expulsar membro do grupo (apenas líder)
   */
  expulsarMembro = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 GrupoTarefaController.expulsarMembro()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: 'Não autenticado'
        });
        return;
      }

      const { grupoGUID, cpf } = req.params;

      const resultado = await this.#grupoTarefaService.expulsarMembro(
        grupoGUID,
        cpf,
        usuarioCPF
      );

      res.status(200).json({
        success: true,
        message: resultado.mensagem,
        data: {
          novoGrupoGUID: resultado.novoGrupoGUID
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/grupotarefa/:grupoGUID/transferir-lider
   * Transferir liderança para outro membro (apenas líder atual)
   */
  transferirLideranca = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 GrupoTarefaController.transferirLideranca()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: 'Não autenticado'
        });
        return;
      }

      const { grupoGUID } = req.params;
      const { NovoLiderCPF } = req.body;

      const resultado = await this.#grupoTarefaService.transferirLideranca(
        grupoGUID,
        NovoLiderCPF,
        usuarioCPF
      );

      res.status(200).json({
        success: true,
        message: resultado.mensagem,
        data: null
      });
    } catch (error) {
      next(error);
    }
  };
}
