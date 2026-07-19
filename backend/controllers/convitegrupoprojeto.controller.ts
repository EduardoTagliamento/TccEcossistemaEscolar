import { Request, Response, NextFunction } from 'express';
import ConviteGrupoProjetoService from '../services/convitegrupoprojeto.service';

/**
 * 🔵 Controller - ConviteGrupoProjeto
 *
 * Endpoints:
 * - POST  /api/convitegrupoprojeto/:grupoGUID/convites     - Líder envia convite
 * - POST  /api/convitegrupoprojeto/:grupoGUID/solicitacoes - Aluno solicita entrada
 * - GET   /api/convitegrupoprojeto/pendentes                - Listar pendentes
 * - PATCH /api/convitegrupoprojeto/:conviteGUID/aceitar      - Aceitar
 * - PATCH /api/convitegrupoprojeto/:conviteGUID/recusar      - Recusar
 */
export default class ConviteGrupoProjetoController {
  #conviteService: ConviteGrupoProjetoService;

  constructor(conviteService: ConviteGrupoProjetoService) {
    console.log('🔵 ConviteGrupoProjetoController.constructor()');
    this.#conviteService = conviteService;
  }

  enviarConvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 ConviteGrupoProjetoController.enviarConvite()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const { grupoGUID } = req.params;
      const { UsuarioCPFConvidado } = req.body;

      const convite = await this.#conviteService.enviarConvite(grupoGUID, UsuarioCPFConvidado, usuarioCPF);

      res.status(201).json({
        success: true,
        message: 'Convite enviado com sucesso',
        data: { convite }
      });
    } catch (error) {
      next(error);
    }
  };

  solicitarEntrada = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 ConviteGrupoProjetoController.solicitarEntrada()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const { grupoGUID } = req.params;

      const solicitacao = await this.#conviteService.solicitarEntrada(grupoGUID, usuarioCPF);

      res.status(201).json({
        success: true,
        message: 'Solicitação enviada com sucesso',
        data: { solicitacao }
      });
    } catch (error) {
      next(error);
    }
  };

  listarPendentes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 ConviteGrupoProjetoController.listarPendentes()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const convites = await this.#conviteService.listarPendentes(usuarioCPF);

      res.status(200).json({
        success: true,
        message: 'Convites listados com sucesso',
        data: { convites, total: convites.length }
      });
    } catch (error) {
      next(error);
    }
  };

  aceitarConvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 ConviteGrupoProjetoController.aceitarConvite()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const { conviteGUID } = req.params;
      const resultado = await this.#conviteService.aceitar(conviteGUID, usuarioCPF);

      res.status(200).json({ success: true, message: resultado.mensagem, data: null });
    } catch (error) {
      next(error);
    }
  };

  recusarConvite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 ConviteGrupoProjetoController.recusarConvite()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const { conviteGUID } = req.params;
      const resultado = await this.#conviteService.recusar(conviteGUID, usuarioCPF);

      res.status(200).json({ success: true, message: resultado.mensagem, data: null });
    } catch (error) {
      next(error);
    }
  };
}
