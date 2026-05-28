import { Request, Response, NextFunction } from 'express';
import ConviteGrupoTarefaService from '../services/convitegrupotarefa.service';
import ErrorResponse from '../utils/ErrorResponse';

/**
 * 🔵 Controller - ConviteGrupoTarefa
 * 
 * Endpoints:
 * - POST /api/convitegrupotarefa/:grupoGUID/convites - Líder envia convite
 * - POST /api/convitegrupotarefa/:grupoGUID/solicitacoes - Aluno solicita entrada
 * - GET /api/convitegrupotarefa/pendentes - Listar convites/solicitações pendentes
 * - PATCH /api/convitegrupotarefa/:conviteGUID/aceitar - Aceitar convite/solicitação
 * - PATCH /api/convitegrupotarefa/:conviteGUID/recusar - Recusar convite/solicitação
 */
export default class ConviteGrupoTarefaController {
  #conviteService: ConviteGrupoTarefaService;

  constructor(conviteService: ConviteGrupoTarefaService) {
    console.log('🔵 ConviteGrupoTarefaController.constructor()');
    this.#conviteService = conviteService;
  }

  /**
   * POST /api/convitegrupotarefa/:grupoGUID/convites
   * Líder envia convite para aluno
   */
  enviarConvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 ConviteGrupoTarefaController.enviarConvite()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: 'Não autenticado'
        });
        return;
      }

      const { grupoGUID } = req.params;
      const { UsuarioCPFConvidado } = req.body;

      const convite = await this.#conviteService.enviarConvite(
        grupoGUID,
        UsuarioCPFConvidado,
        usuarioCPF
      );

      res.status(201).json({
        success: true,
        message: 'Convite enviado com sucesso',
        data: {
          convite
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/convitegrupotarefa/:grupoGUID/solicitacoes
   * Aluno solicita entrada no grupo
   */
  solicitarEntrada = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 ConviteGrupoTarefaController.solicitarEntrada()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: 'Não autenticado'
        });
        return;
      }

      const { grupoGUID } = req.params;

      const solicitacao = await this.#conviteService.solicitarEntrada(
        grupoGUID,
        usuarioCPF
      );

      res.status(201).json({
        success: true,
        message: 'Solicitação enviada com sucesso',
        data: {
          solicitacao
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/convitegrupotarefa/pendentes
   * Listar convites e solicitações pendentes do usuário
   */
  listarPendentes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 ConviteGrupoTarefaController.listarPendentes()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: 'Não autenticado'
        });
        return;
      }

      const convites = await this.#conviteService.listarPendentes(usuarioCPF);

      res.status(200).json({
        success: true,
        message: 'Convites listados com sucesso',
        data: {
          convites,
          total: convites.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/convitegrupotarefa/:conviteGUID/aceitar
   * Aceitar convite ou solicitação
   */
  aceitarConvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 ConviteGrupoTarefaController.aceitarConvite()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: 'Não autenticado'
        });
        return;
      }

      const { conviteGUID } = req.params;

      const resultado = await this.#conviteService.aceitar(conviteGUID, usuarioCPF);

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
   * PATCH /api/convitegrupotarefa/:conviteGUID/recusar
   * Recusar convite ou solicitação
   */
  recusarConvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 ConviteGrupoTarefaController.recusarConvite()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: 'Não autenticado'
        });
        return;
      }

      const { conviteGUID } = req.params;

      const resultado = await this.#conviteService.recusar(conviteGUID, usuarioCPF);

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
