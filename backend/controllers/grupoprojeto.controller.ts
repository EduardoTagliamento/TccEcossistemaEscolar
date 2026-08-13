import { Request, Response, NextFunction } from 'express';
import GrupoProjetoService from '../services/grupoprojeto.service';

/**
 * 🔵 Controller - GrupoProjeto
 *
 * Endpoints:
 * - POST   /api/grupoprojeto                         - Criar grupo (aluno)
 * - GET    /api/grupoprojeto/projeto/:projetoGUID     - Listar grupos de um projeto
 * - GET    /api/grupoprojeto/:grupoGUID               - Detalhe do grupo
 * - PATCH  /api/grupoprojeto/:grupoGUID               - Atualizar grupo (só líder)
 * - PATCH  /api/grupoprojeto/:grupoGUID/pontuacao     - Atribuir pontuação (só criador do projeto)
 * - POST   /api/grupoprojeto/:grupoGUID/entrar        - Entrar diretamente (só se Aberto)
 * - DELETE /api/grupoprojeto/:grupoGUID/sair          - Sair do próprio grupo
 * - DELETE /api/grupoprojeto/:grupoGUID/membros/:cpf  - Expulsar membro (líder ou criador do projeto)
 * - POST   /api/grupoprojeto/:grupoGUID/membros       - Adicionar membro direto (só criador do projeto)
 * - PATCH  /api/grupoprojeto/:grupoGUID/transferir-lider - Transferir liderança (só líder)
 */
export default class GrupoProjetoController {
  #grupoProjetoService: GrupoProjetoService;

  constructor(grupoProjetoService: GrupoProjetoService) {
    console.log('🔵 GrupoProjetoController.constructor()');
    this.#grupoProjetoService = grupoProjetoService;
  }

  criarGrupo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 GrupoProjetoController.criarGrupo()');

      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const grupo = await this.#grupoProjetoService.criarGrupo(req.body, usuarioGUID);

      res.status(201).json({
        success: true,
        message: 'Grupo criado com sucesso',
        data: { grupo }
      });
    } catch (error) {
      next(error);
    }
  };

  listarGruposDoProjeto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 GrupoProjetoController.listarGruposDoProjeto()');

      const { projetoGUID } = req.params;
      const grupos = await this.#grupoProjetoService.listarGruposDoProjeto(projetoGUID);

      res.status(200).json({
        success: true,
        message: 'Grupos listados com sucesso',
        data: { grupos, total: grupos.length }
      });
    } catch (error) {
      next(error);
    }
  };

  buscarGrupo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 GrupoProjetoController.buscarGrupo()');

      const { grupoGUID } = req.params;
      const grupo = await this.#grupoProjetoService.buscarGrupo(grupoGUID);

      res.status(200).json({
        success: true,
        message: 'Grupo encontrado',
        data: { grupo }
      });
    } catch (error) {
      next(error);
    }
  };

  atualizarGrupo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 GrupoProjetoController.atualizarGrupo()');

      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const { grupoGUID } = req.params;
      const resultado = await this.#grupoProjetoService.atualizarGrupo(grupoGUID, req.body, usuarioGUID);

      res.status(200).json({ success: true, message: resultado.mensagem, data: null });
    } catch (error) {
      next(error);
    }
  };

  atualizarPontuacao = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 GrupoProjetoController.atualizarPontuacao()');

      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const { grupoGUID } = req.params;
      const { GrupoProjetoPontuacao } = req.body;
      const resultado = await this.#grupoProjetoService.atualizarPontuacao(grupoGUID, GrupoProjetoPontuacao, usuarioGUID);

      res.status(200).json({ success: true, message: resultado.mensagem, data: null });
    } catch (error) {
      next(error);
    }
  };

  entrarGrupo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 GrupoProjetoController.entrarGrupo()');

      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const { grupoGUID } = req.params;
      const resultado = await this.#grupoProjetoService.entrarGrupo(grupoGUID, usuarioGUID);

      res.status(200).json({ success: true, message: resultado.mensagem, data: null });
    } catch (error) {
      next(error);
    }
  };

  sairGrupo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 GrupoProjetoController.sairGrupo()');

      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const { grupoGUID } = req.params;
      const resultado = await this.#grupoProjetoService.sairGrupo(grupoGUID, usuarioGUID);

      res.status(200).json({ success: true, message: resultado.mensagem, data: null });
    } catch (error) {
      next(error);
    }
  };

  expulsarMembro = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 GrupoProjetoController.expulsarMembro()');

      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const { grupoGUID, membroGUID } = req.params;
      const resultado = await this.#grupoProjetoService.expulsarMembro(grupoGUID, membroGUID, usuarioGUID);

      res.status(200).json({
        success: true,
        message: resultado.mensagem,
        data: { novoLiderGUID: resultado.novoLiderGUID ?? null, grupoDissolvido: resultado.grupoDissolvido ?? false }
      });
    } catch (error) {
      next(error);
    }
  };

  adicionarMembro = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 GrupoProjetoController.adicionarMembro()');

      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const { grupoGUID } = req.params;
      const { UsuarioGUID } = req.body;
      const resultado = await this.#grupoProjetoService.adicionarMembro(grupoGUID, UsuarioGUID, usuarioGUID);

      res.status(200).json({ success: true, message: resultado.mensagem, data: null });
    } catch (error) {
      next(error);
    }
  };

  transferirLideranca = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('🔵 GrupoProjetoController.transferirLideranca()');

      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) {
        res.status(401).json({ success: false, message: 'Não autenticado' });
        return;
      }

      const { grupoGUID } = req.params;
      const { NovoLiderGUID } = req.body;
      const resultado = await this.#grupoProjetoService.transferirLideranca(grupoGUID, NovoLiderGUID, usuarioGUID);

      res.status(200).json({ success: true, message: resultado.mensagem, data: null });
    } catch (error) {
      next(error);
    }
  };
}
