import { Request, Response } from "express";
import CursoService, { CursoCreateDTO, CursoUpdateDTO } from "../services/curso.service";
import ErrorResponse from "../utils/ErrorResponse";
import { CursoFilters } from "../repositories/curso.repository";

/**
 * Controller para endpoints de Curso
 * 
 * Responsabilidades:
 * - Receber requisições HTTP
 * - Extrair dados do request
 * - Chamar service
 * - Retornar response padronizado
 */
export class CursoController {
  #cursoService: CursoService;

  constructor(cursoService: CursoService) {
    this.#cursoService = cursoService;
  }

  /**
   * POST /api/curso
   * Criar novo curso (individual ou em massa)
   * 
   * Body para individual:
   * { curso: { EscolaGUID, CursoNome, CursoStatus? } }
   * 
   * Body para massa:
   * { cursos: [{ EscolaGUID, CursoNome, CursoStatus? }, ...] }
   */
  store = async (req: Request, res: Response): Promise<void> => {
    try {
      const { curso, cursos } = req.body;
      const usuarioCPF = req.user?.UsuarioCPF || '';

      // Cadastro em massa
      if (cursos && Array.isArray(cursos)) {
        const cursosDTO: CursoCreateDTO[] = cursos.map((c: any) => ({
          EscolaGUID: c.EscolaGUID,
          CursoNome: c.CursoNome,
          CursoStatus: c.CursoStatus,
        }));

        const resultado = await this.#cursoService.criarCursosEmMassa(
          cursosDTO,
          usuarioCPF
        );

        res.status(201).json({
          success: true,
          message: `Processamento concluído: ${resultado.criados} criados, ${resultado.duplicados} duplicados, ${resultado.erros} erros`,
          data: resultado,
        });
        return;
      }

      // Cadastro individual
      if (curso) {
        const cursoDTO: CursoCreateDTO = {
          EscolaGUID: curso.EscolaGUID,
          CursoNome: curso.CursoNome,
          CursoStatus: curso.CursoStatus,
        };

        const cursoCriado = await this.#cursoService.criarCurso(
          cursoDTO,
          usuarioCPF
        );

        res.status(201).json({
          success: true,
          message: "Curso criado com sucesso",
          data: cursoCriado,
        });
        return;
      }

      // Nenhum dado fornecido
      res.status(400).json({
        success: false,
        message: "Forneça 'curso' para cadastro individual ou 'cursos' para cadastro em massa",
      });

    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error("Erro ao criar curso:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao criar curso",
        });
      }
    }
  };

  /**
   * GET /api/curso
   * Listar cursos (com filtros opcionais)
   */
  index = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: CursoFilters = {};

      // Query params opcionais
      if (req.query.EscolaGUID) {
        filters.EscolaGUID = req.query.EscolaGUID as string;
      }

      if (req.query.CursoStatus) {
        filters.CursoStatus = req.query.CursoStatus as 'Ativo' | 'Inativo';
      }

      const resultado = await this.#cursoService.listarCursos(filters);

      res.status(200).json({
        success: true,
        message: "Cursos listados com sucesso",
        data: resultado.cursos,
        total: resultado.total,
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error("Erro ao listar cursos:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao listar cursos",
        });
      }
    }
  };

  /**
   * GET /api/curso/:guid
   * Buscar curso por GUID
   */
  show = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;

      const curso = await this.#cursoService.buscarCurso(guid);

      res.status(200).json({
        success: true,
        message: "Curso encontrado",
        data: curso,
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error("Erro ao buscar curso:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao buscar curso",
        });
      }
    }
  };

  /**
   * PUT /api/curso/:guid
   * Atualizar curso
   */
  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const { curso } = req.body;
      const usuarioCPF = req.user?.UsuarioCPF || '';

      const cursoDTO: CursoUpdateDTO = {
        CursoNome: curso.CursoNome,
        CursoStatus: curso.CursoStatus,
      };

      const cursoAtualizado = await this.#cursoService.atualizarCurso(
        guid,
        cursoDTO,
        usuarioCPF
      );

      res.status(200).json({
        success: true,
        message: "Curso atualizado com sucesso",
        data: cursoAtualizado,
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error("Erro ao atualizar curso:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao atualizar curso",
        });
      }
    }
  };

  /**
   * DELETE /api/curso/:guid
   * Excluir curso (soft delete)
   */
  destroy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const usuarioCPF = req.user?.UsuarioCPF || '';

      await this.#cursoService.excluirCurso(guid, usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Curso excluído com sucesso",
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error("Erro ao excluir curso:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao excluir curso",
        });
      }
    }
  };
}
