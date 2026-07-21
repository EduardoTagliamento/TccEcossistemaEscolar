/**
 * 🗂️ Controller - Auditoria
 *
 * Camada de controle HTTP pra consulta do Registro de Auditoria (ver
 * docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md, Seção 5). Restrito a
 * Coordenação/Secretaria/Direção da escola consultada.
 *
 * Endpoints:
 * - GET /api/auditoria?EscolaGUID=&UsuarioCPFAtor=&AcaoTipo=&EntidadeTipo=&CategoriaAuditoriaId=&dataInicio=&dataFim=&limit=&offset=
 * - GET /api/auditoria/:RegistroAuditoriaGUID?EscolaGUID=
 * - GET /api/auditoria/categorias
 */

import { Request, Response, NextFunction } from "express";
import AuditoriaService from "../services/auditoria.service";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import { AcaoAuditoriaTipo } from "../entities/registroauditoria.model";
import ErrorResponse from "../utils/ErrorResponse";

const ACOES_VALIDAS: AcaoAuditoriaTipo[] = ["Create", "Update", "Delete"];

export default class AuditoriaController {
  #auditoriaService: AuditoriaService;
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(auditoriaService: AuditoriaService, escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO) {
    console.log("🔵 AuditoriaController.constructor()");
    this.#auditoriaService = auditoriaService;
    this.#escolaxUsuarioxFuncaoDAO = escolaxUsuarioxFuncaoDAO;
  }

  index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 AuditoriaController.index()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        return next(new ErrorResponse(401, "Não autenticado"));
      }

      const escolaGUID = typeof req.query.EscolaGUID === "string" ? req.query.EscolaGUID : undefined;
      if (!escolaGUID) {
        return next(new ErrorResponse(400, "Erro na validação de dados", { message: "O parâmetro 'EscolaGUID' é obrigatório." }));
      }

      await this.#validarPermissao(usuarioCPF, escolaGUID);

      const acaoTipoParam = typeof req.query.AcaoTipo === "string" ? req.query.AcaoTipo : undefined;
      if (acaoTipoParam && !ACOES_VALIDAS.includes(acaoTipoParam as AcaoAuditoriaTipo)) {
        return next(new ErrorResponse(400, "Erro na validação de dados", { message: "AcaoTipo deve ser 'Create', 'Update' ou 'Delete'." }));
      }

      const categoriaParam = req.query.CategoriaAuditoriaId;
      const categoriaAuditoriaId = typeof categoriaParam === "string" && categoriaParam !== "" ? Number(categoriaParam) : undefined;

      const registros = await this.#auditoriaService.listar(escolaGUID, {
        UsuarioCPFAtor: typeof req.query.UsuarioCPFAtor === "string" ? req.query.UsuarioCPFAtor : undefined,
        AcaoTipo: acaoTipoParam as AcaoAuditoriaTipo | undefined,
        EntidadeTipo: typeof req.query.EntidadeTipo === "string" ? req.query.EntidadeTipo : undefined,
        CategoriaAuditoriaId: categoriaAuditoriaId,
        dataInicio: typeof req.query.dataInicio === "string" ? req.query.dataInicio : undefined,
        dataFim: typeof req.query.dataFim === "string" ? req.query.dataFim : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      });

      res.status(200).json({
        success: true,
        message: "Registros de auditoria listados com sucesso",
        data: { registros, total: registros.length },
      });
    } catch (error) {
      next(error);
    }
  };

  show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 AuditoriaController.show()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        return next(new ErrorResponse(401, "Não autenticado"));
      }

      const escolaGUID = typeof req.query.EscolaGUID === "string" ? req.query.EscolaGUID : undefined;
      if (!escolaGUID) {
        return next(new ErrorResponse(400, "Erro na validação de dados", { message: "O parâmetro 'EscolaGUID' é obrigatório." }));
      }

      await this.#validarPermissao(usuarioCPF, escolaGUID);

      const { RegistroAuditoriaGUID } = req.params;
      const registro = await this.#auditoriaService.buscarPorId(RegistroAuditoriaGUID, escolaGUID);

      res.status(200).json({
        success: true,
        message: "Executado com sucesso",
        data: { registro },
      });
    } catch (error) {
      next(error);
    }
  };

  categorias = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("🔵 AuditoriaController.categorias()");

      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        return next(new ErrorResponse(401, "Não autenticado"));
      }

      const categorias = await this.#auditoriaService.listarCategorias();

      res.status(200).json({
        success: true,
        message: "Catálogo de categorias de auditoria",
        data: { categorias },
      });
    } catch (error) {
      next(error);
    }
  };

  #validarPermissao = async (usuarioCPF: string, escolaGUID: string): Promise<void> => {
    const permitido = await this.#escolaxUsuarioxFuncaoDAO.isCoordSecretariaOuDirecaoEmEscola(usuarioCPF, escolaGUID);
    if (!permitido) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você não tem permissão para consultar o registro de auditoria desta escola. Apenas Coordenação, Secretaria ou Direção.",
      });
    }
  };
}
