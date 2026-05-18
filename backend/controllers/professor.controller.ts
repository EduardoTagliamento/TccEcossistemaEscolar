import { Request, Response } from "express";
import ProfessorService, {
  AlocacaoCreateDTO,
  AlocacaoUpdateDTO,
} from "../services/professor.service";
import ErrorResponse from "../utils/ErrorResponse";

/**
 * Controller para endpoints de Professor e Alocações
 * 
 * Conceito:
 * - Professor = Usuário com FuncaoId=3
 * - Alocação = Vínculo professor-matéria-turma
 * 
 * Endpoints:
 * - GET /api/professor?EscolaGUID=X (listar professores da escola)
 * - GET /api/professor/:cpf/escolas/:escolaGUID/alocacoes (buscar alocações do professor)
 * - POST /api/professor/alocacao (criar alocação)
 * - GET /api/professor/alocacao (listar alocações com filtros)
 * - GET /api/professor/alocacao/:guid (buscar alocação)
 * - PUT /api/professor/alocacao/:guid (atualizar alocação)
 * - DELETE /api/professor/alocacao/:guid (excluir alocação)
 */
export default class ProfessorController {
  #professorService: ProfessorService;

  constructor(professorService: ProfessorService) {
    this.#professorService = professorService;
  }

  /**
   * GET /api/professor?EscolaGUID=X
   * Listar professores de uma escola
   */
  listarProfessores = async (req: Request, res: Response): Promise<void> => {
    try {
      const { EscolaGUID } = req.query;

      const resultado = await this.#professorService.listarProfessores(
        EscolaGUID as string
      );

      res.status(200).json({
        success: true,
        data: resultado.professores,
        total: resultado.total,
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          details: error.details,
        });
      } else {
        console.error("Erro ao listar professores:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao listar professores",
        });
      }
    }
  };

  /**
   * GET /api/professor/:cpf/escolas/:escolaGUID/alocacoes
   * Buscar alocações de um professor em uma escola
   */
  buscarAlocacoesProfessor = async (req: Request, res: Response): Promise<void> => {
    try {
      const { cpf, escolaGUID } = req.params;

      const resultado = await this.#professorService.buscarAlocacoesProfessor(
        cpf,
        escolaGUID
      );

      res.status(200).json({
        success: true,
        data: resultado.alocacoes,
        total: resultado.total,
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          details: error.details,
        });
      } else {
        console.error("Erro ao buscar alocações do professor:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao buscar alocações",
        });
      }
    }
  };

  /**
   * POST /api/professor/alocacao
   * Criar alocação (vincular professor a matéria+turma)
   * 
   * Body: { alocacao: { MateriaGUID, TurmaGUID, UsuarioCPF, AlocacaoStatus? } }
   */
  criarAlocacao = async (req: Request, res: Response): Promise<void> => {
    try {
      const { alocacao } = req.body;
      const usuarioCPF = (req as any).usuario.cpf;

      const createData: AlocacaoCreateDTO = {
        MateriaGUID: alocacao.MateriaGUID,
        TurmaGUID: alocacao.TurmaGUID,
        UsuarioCPF: alocacao.UsuarioCPF,
        AlocacaoStatus: alocacao.AlocacaoStatus,
      };

      const alocacaoCriada = await this.#professorService.criarAlocacao(
        createData,
        usuarioCPF
      );

      res.status(201).json({
        success: true,
        message: "Alocação criada com sucesso",
        data: alocacaoCriada,
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          details: error.details,
        });
      } else {
        console.error("Erro ao criar alocação:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao criar alocação",
        });
      }
    }
  };

  /**
   * GET /api/professor/alocacao
   * Listar alocações com filtros opcionais
   * 
   * Query: ?MateriaGUID=X&TurmaGUID=Y&UsuarioCPF=Z&AlocacaoStatus=W
   */
  listarAlocacoes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { MateriaGUID, TurmaGUID, UsuarioCPF, AlocacaoStatus } = req.query;

      const filters: any = {};

      if (MateriaGUID && typeof MateriaGUID === "string") {
        filters.MateriaGUID = MateriaGUID;
      }

      if (TurmaGUID && typeof TurmaGUID === "string") {
        filters.TurmaGUID = TurmaGUID;
      }

      if (UsuarioCPF && typeof UsuarioCPF === "string") {
        filters.UsuarioCPF = UsuarioCPF;
      }

      if (AlocacaoStatus && typeof AlocacaoStatus === "string") {
        filters.AlocacaoStatus = AlocacaoStatus;
      }

      const resultado = await this.#professorService.listarAlocacoes(filters);

      res.status(200).json({
        success: true,
        data: resultado.alocacoes,
        total: resultado.total,
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          details: error.details,
        });
      } else {
        console.error("Erro ao listar alocações:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao listar alocações",
        });
      }
    }
  };

  /**
   * GET /api/professor/alocacao/:guid
   * Buscar alocação por GUID
   */
  buscarAlocacao = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;

      const alocacao = await this.#professorService.buscarAlocacao(guid);

      res.status(200).json({
        success: true,
        data: alocacao,
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          details: error.details,
        });
      } else {
        console.error("Erro ao buscar alocação:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao buscar alocação",
        });
      }
    }
  };

  /**
   * PUT /api/professor/alocacao/:guid
   * Atualizar alocação (apenas status)
   * 
   * Body: { alocacao: { AlocacaoStatus } }
   */
  atualizarAlocacao = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const { alocacao } = req.body;
      const usuarioCPF = (req as any).usuario.cpf;

      const updateData: AlocacaoUpdateDTO = {
        AlocacaoStatus: alocacao.AlocacaoStatus,
      };

      const alocacaoAtualizada = await this.#professorService.atualizarAlocacao(
        guid,
        updateData,
        usuarioCPF
      );

      res.status(200).json({
        success: true,
        message: "Alocação atualizada com sucesso",
        data: alocacaoAtualizada,
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          details: error.details,
        });
      } else {
        console.error("Erro ao atualizar alocação:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao atualizar alocação",
        });
      }
    }
  };

  /**
   * DELETE /api/professor/alocacao/:guid
   * Excluir alocação (soft delete)
   */
  excluirAlocacao = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const usuarioCPF = (req as any).usuario.cpf;

      await this.#professorService.excluirAlocacao(guid, usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Alocação excluída com sucesso",
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          details: error.details,
        });
      } else {
        console.error("Erro ao excluir alocação:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao excluir alocação",
        });
      }
    }
  };

  /**
   * GET /api/professor/materias
   * Buscar matérias que o professor logado leciona
   * Retorna: { MatProfTurGUID, MateriaNome, TurmaNome, TurmaSerie }
   */
  buscarMateriasProfessor = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log("🔵 ProfessorController.buscarMateriasProfessor()");
      
      const usuarioCPF = req.user?.UsuarioCPF;
      const { EscolaGUID } = req.query;

      if (!usuarioCPF) {
        res.status(401).json({
          success: false,
          message: "Não autenticado"
        });
        return;
      }

      if (!EscolaGUID || typeof EscolaGUID !== 'string') {
        throw new ErrorResponse(400, 'EscolaGUID é obrigatório');
      }

      const materias = await this.#professorService.buscarMateriasProfessor(
        usuarioCPF,
        EscolaGUID
      );

      res.status(200).json({
        success: true,
        data: materias,
        total: materias.length
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          details: error.details,
        });
      } else {
        console.error("❌ Erro ao buscar matérias do professor:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao buscar matérias",
        });
      }
    }
  };

  /**
   * GET /api/professor/turmas-alunos?MatProfTurGUID=X
   * Buscar estrutura hierárquica de turmas e alunos para uma alocação
   * Retorna: { series: [{ TurmaSerie, turmas: [{ TurmaGUID, TurmaNome, alunos: [{ MatriculaGUID, UsuarioNome }] }] }] }
   */
  buscarTurmasAlunos = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log("🔵 ProfessorController.buscarTurmasAlunos()");
      console.log("📋 [DEBUG] Query params:", req.query);
      console.log("📋 [DEBUG] Usuario autenticado:", req.user?.UsuarioNome);
      
      const { MatProfTurGUID } = req.query;
      const usuarioCPF = req.user?.UsuarioCPF;

      if (!usuarioCPF) {
        console.log("❌ [DEBUG] Não autenticado");
        res.status(401).json({
          success: false,
          message: "Não autenticado"
        });
        return;
      }

      if (!MatProfTurGUID || typeof MatProfTurGUID !== 'string') {
        console.log("❌ [DEBUG] MatProfTurGUID inválido:", MatProfTurGUID);
        throw new ErrorResponse(400, 'MatProfTurGUID é obrigatório');
      }

      console.log("✅ [DEBUG] Buscando estrutura para MatProfTurGUID:", MatProfTurGUID);

      const estrutura = await this.#professorService.buscarTurmasAlunos(
        MatProfTurGUID,
        usuarioCPF
      );

      console.log("✅ [DEBUG] Estrutura retornada:", JSON.stringify(estrutura, null, 2));

      res.status(200).json({
        success: true,
        data: estrutura
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          details: error.details,
        });
      } else {
        console.error("❌ Erro ao buscar turmas e alunos:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao buscar turmas e alunos",
        });
      }
    }
  };
}
