import { Request, Response, NextFunction } from 'express';
import ProjetoService from '../services/projeto.service';

/**
 * 🔵 Controller - Projeto
 *
 * Endpoints:
 * - POST   /api/projeto                    - Criar projeto (Professor/Direção)
 * - GET    /api/projeto?EscolaGUID=         - Listar projetos visíveis ao usuário
 * - GET    /api/projeto/:projetoGUID        - Detalhe do projeto
 * - PATCH  /api/projeto/:projetoGUID        - Atualizar projeto (só criador)
 * - PATCH  /api/projeto/:projetoGUID/encerrar - Encerrar projeto (só criador)
 */
export default class ProjetoController {
  #projetoService: ProjetoService;

  constructor(projetoService: ProjetoService) {
    console.log('🔵 ProjetoController.constructor()');
    this.#projetoService = projetoService;
  }

  criarProjeto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 ProjetoController.criarProjeto()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const projeto = await this.#projetoService.criarProjeto(req.body, usuarioCPF);

      res.status(201).json({
        success: true,
        message: 'Projeto criado com sucesso',
        data: { projeto }
      });
    } catch (error) {
      next(error);
    }
  };

  listarProjetos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 ProjetoController.listarProjetos()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const { EscolaGUID } = req.query as { EscolaGUID: string };

      const projetos = await this.#projetoService.listarProjetos(EscolaGUID, usuarioCPF);

      res.status(200).json({
        success: true,
        message: 'Projetos listados com sucesso',
        data: { projetos, total: projetos.length }
      });
    } catch (error) {
      next(error);
    }
  };

  buscarProjeto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 ProjetoController.buscarProjeto()');

      const { projetoGUID } = req.params;
      const projeto = await this.#projetoService.buscarProjeto(projetoGUID);

      res.status(200).json({
        success: true,
        message: 'Projeto encontrado',
        data: { projeto }
      });
    } catch (error) {
      next(error);
    }
  };

  atualizarProjeto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 ProjetoController.atualizarProjeto()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const { projetoGUID } = req.params;
      const projeto = await this.#projetoService.atualizarProjeto(projetoGUID, req.body, usuarioCPF);

      res.status(200).json({
        success: true,
        message: 'Projeto atualizado com sucesso',
        data: { projeto }
      });
    } catch (error) {
      next(error);
    }
  };

  encerrarProjeto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 ProjetoController.encerrarProjeto()');

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const { projetoGUID } = req.params;
      const resultado = await this.#projetoService.encerrarProjeto(projetoGUID, usuarioCPF);

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
