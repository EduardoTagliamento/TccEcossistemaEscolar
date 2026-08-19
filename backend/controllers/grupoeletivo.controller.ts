import { Request, Response } from "express";
import GrupoEletivoService, {
  GrupoEletivoCreateDTO,
  GrupoEletivoUpdateDTO,
} from "../services/grupoeletivo.service";
import ErrorResponse from "../utils/ErrorResponse";
import { GrupoEletivoFilters } from "../repositories/grupoeletivo.repository";

/**
 * Controller para endpoints de Grupo Eletivo (turmas mistas/eletivas)
 * Ver docs/PLANO_IMPLEMENTACAO_GRUPO_ELETIVO.md.
 */
export class GrupoEletivoController {
  #grupoEletivoService: GrupoEletivoService;

  constructor(grupoEletivoService: GrupoEletivoService) {
    this.#grupoEletivoService = grupoEletivoService;
  }

  /**
   * POST /api/grupoeletivo
   * Body: { EscolaGUID, GrupoEletivoNome }
   */
  store = async (req: Request, res: Response): Promise<void> => {
    try {
      const usuarioGUIDAtor = req.user?.UsuarioGUID || '';
      const dto: GrupoEletivoCreateDTO = {
        EscolaGUID: req.body.EscolaGUID,
        GrupoEletivoNome: req.body.GrupoEletivoNome,
      };

      const criado = await this.#grupoEletivoService.criarGrupo(dto, usuarioGUIDAtor);

      res.status(201).json({
        success: true,
        message: "Grupo eletivo criado com sucesso",
        data: criado,
      });
    } catch (error) {
      this.#handleError(res, error, "criar grupo eletivo");
    }
  };

  /**
   * GET /api/grupoeletivo?EscolaGUID=&GrupoEletivoStatus=
   */
  index = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: GrupoEletivoFilters = {};
      if (req.query.EscolaGUID && typeof req.query.EscolaGUID === "string") {
        filters.EscolaGUID = req.query.EscolaGUID;
      }
      if (req.query.GrupoEletivoStatus && typeof req.query.GrupoEletivoStatus === "string") {
        filters.GrupoEletivoStatus = req.query.GrupoEletivoStatus as 'Ativo' | 'Inativo';
      }

      const grupos = await this.#grupoEletivoService.listarGrupos(filters);

      res.status(200).json({
        success: true,
        data: grupos,
        total: grupos.length,
      });
    } catch (error) {
      this.#handleError(res, error, "listar grupos eletivos");
    }
  };

  /**
   * GET /api/grupoeletivo/:guid
   */
  show = async (req: Request, res: Response): Promise<void> => {
    try {
      const grupo = await this.#grupoEletivoService.buscarGrupo(req.params.guid);
      res.status(200).json({ success: true, data: grupo });
    } catch (error) {
      this.#handleError(res, error, "buscar grupo eletivo");
    }
  };

  /**
   * PUT /api/grupoeletivo/:guid
   * Body: { GrupoEletivoNome?, GrupoEletivoStatus? }
   */
  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const usuarioGUIDAtor = req.user?.UsuarioGUID || '';
      const dto: GrupoEletivoUpdateDTO = {
        GrupoEletivoNome: req.body.GrupoEletivoNome,
        GrupoEletivoStatus: req.body.GrupoEletivoStatus,
      };

      const atualizado = await this.#grupoEletivoService.atualizarGrupo(
        req.params.guid,
        dto,
        usuarioGUIDAtor
      );

      res.status(200).json({
        success: true,
        message: "Grupo eletivo atualizado com sucesso",
        data: atualizado,
      });
    } catch (error) {
      this.#handleError(res, error, "atualizar grupo eletivo");
    }
  };

  /**
   * DELETE /api/grupoeletivo/:guid
   */
  destroy = async (req: Request, res: Response): Promise<void> => {
    try {
      const usuarioGUIDAtor = req.user?.UsuarioGUID || '';
      await this.#grupoEletivoService.excluirGrupo(req.params.guid, usuarioGUIDAtor);
      res.status(200).json({ success: true, message: "Grupo eletivo excluído com sucesso" });
    } catch (error) {
      this.#handleError(res, error, "excluir grupo eletivo");
    }
  };

  /**
   * GET /api/grupoeletivo/:guid/membros
   */
  listarMembros = async (req: Request, res: Response): Promise<void> => {
    try {
      const membros = await this.#grupoEletivoService.listarMembros(req.params.guid);
      res.status(200).json({ success: true, data: membros, total: membros.length });
    } catch (error) {
      this.#handleError(res, error, "listar membros do grupo eletivo");
    }
  };

  /**
   * POST /api/grupoeletivo/:guid/membros
   * Body: { UsuarioGUID }
   */
  adicionarMembro = async (req: Request, res: Response): Promise<void> => {
    try {
      const usuarioGUIDAtor = req.user?.UsuarioGUID || '';
      const membro = await this.#grupoEletivoService.adicionarMembro(
        req.params.guid,
        req.body.UsuarioGUID,
        usuarioGUIDAtor
      );
      res.status(201).json({ success: true, message: "Membro adicionado com sucesso", data: membro });
    } catch (error) {
      this.#handleError(res, error, "adicionar membro ao grupo eletivo");
    }
  };

  /**
   * DELETE /api/grupoeletivo/:guid/membros/:usuarioGUID
   */
  removerMembro = async (req: Request, res: Response): Promise<void> => {
    try {
      const usuarioGUIDAtor = req.user?.UsuarioGUID || '';
      await this.#grupoEletivoService.removerMembro(
        req.params.guid,
        req.params.usuarioGUID,
        usuarioGUIDAtor
      );
      res.status(200).json({ success: true, message: "Membro removido com sucesso" });
    } catch (error) {
      this.#handleError(res, error, "remover membro do grupo eletivo");
    }
  };

  #handleError(res: Response, error: unknown, acao: string): void {
    if (error instanceof ErrorResponse) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        details: error.details,
      });
    } else {
      console.error(`Erro ao ${acao}:`, error);
      res.status(500).json({
        success: false,
        message: `Erro interno ao ${acao}`,
      });
    }
  }
}
