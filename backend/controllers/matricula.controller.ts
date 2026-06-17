import { Request, Response } from "express";
import MatriculaService, {
  MatriculaCreateDTO,
  MatriculaUpdateDTO,
  TransferenciaDTO,
} from "../services/matricula.service";
import ErrorResponse from "../utils/ErrorResponse";

/**
 * Controller para endpoints de Matrícula
 * 
 * Endpoints:
 * - POST /api/matricula (criar matrícula)
 * - POST /api/matricula/transferir (transferência transacional)
 * - GET /api/matricula (listar com filtros)
 * - GET /api/matricula/:guid (buscar por GUID)
 * - PUT /api/matricula/:guid (atualizar)
 * - DELETE /api/matricula/:guid (cancelar)
 * 
 * IMPORTANTE: Rota /transferir DEVE vir ANTES de /:guid para evitar colisão
 */
export default class MatriculaController {
  #matriculaService: MatriculaService;

  constructor(matriculaService: MatriculaService) {
    this.#matriculaService = matriculaService;
  }

  /**
   * POST /api/matricula
   * Criar nova matrícula (individual ou em massa)
   * 
   * Body individual: { matricula: { UsuarioCPF, TurmaGUID, MatriculaGUID?, MatriculaDataEntrada? } }
   * Body massa: { matriculas: [...], escolaGUID: "..." }
   */
  store = async (req: Request, res: Response): Promise<void> => {
    try {
      const usuarioCPF = req.user?.UsuarioCPF || '';

      // Detectar se é cadastro individual ou em massa
      if (req.body.matriculas && Array.isArray(req.body.matriculas)) {
        // Cadastro em massa
        const escolaGUID = req.body.escolaGUID;

        if (!escolaGUID) {
          res.status(400).json({
            success: false,
            message: 'escolaGUID é obrigatório para cadastro em massa'
          });
          return;
        }

        const resultado = await this.#matriculaService.criarMatriculasEmMassa(
          req.body.matriculas,
          escolaGUID,
          usuarioCPF
        );

        res.status(200).json({
          success: true,
          message: 'Processamento em massa concluído',
          data: resultado
        });
      } else {
        // Cadastro individual
        const { matricula } = req.body;

        const createData: MatriculaCreateDTO = {
          MatriculaGUID: matricula.MatriculaGUID,
          UsuarioCPF: matricula.UsuarioCPF,
          TurmaGUID: matricula.TurmaGUID,
          TurmaNome: matricula.TurmaNome,
          MatriculaDataEntrada: matricula.MatriculaDataEntrada
            ? new Date(matricula.MatriculaDataEntrada)
            : undefined,
        };

        const matriculaCriada = await this.#matriculaService.criarMatricula(
          createData,
          usuarioCPF
        );

        res.status(201).json({
          success: true,
          message: "Matrícula criada com sucesso",
          data: matriculaCriada,
        });
      }
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          details: error.details,
        });
      } else {
        console.error("Erro ao criar matrícula:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao criar matrícula",
        });
      }
    }
  };

  /**
   * POST /api/matricula/transferir
   * Transferir aluno entre turmas (operação transacional)
   * 
   * Body: { transferencia: { UsuarioCPF, TurmaOrigemGUID, TurmaDestinoGUID, DataTransferencia } }
   */
  transferir = async (req: Request, res: Response): Promise<void> => {
    try {
      const { transferencia } = req.body;
      const usuarioCPF = req.user?.UsuarioCPF || '';

      const transferenciaData: TransferenciaDTO = {
        UsuarioCPF: transferencia.UsuarioCPF,
        TurmaOrigemGUID: transferencia.TurmaOrigemGUID,
        TurmaDestinoGUID: transferencia.TurmaDestinoGUID,
        DataTransferencia: new Date(transferencia.DataTransferencia),
      };

      const resultado = await this.#matriculaService.transferirAluno(
        transferenciaData,
        usuarioCPF
      );

      res.status(200).json({
        success: true,
        message: "Transferência realizada com sucesso",
        data: resultado,
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          details: error.details,
        });
      } else {
        console.error("Erro ao transferir aluno:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao transferir aluno",
        });
      }
    }
  };

  /**
   * GET /api/matricula
   * Listar matrículas com filtros opcionais
   * 
   * Query: ?UsuarioCPF=X&TurmaGUID=Y&MatriculaStatus=Z
   */
  index = async (req: Request, res: Response): Promise<void> => {
    try {
      const { UsuarioCPF, TurmaGUID, MatriculaStatus } = req.query;

      const filters: any = {};

      if (UsuarioCPF && typeof UsuarioCPF === "string") {
        filters.UsuarioCPF = UsuarioCPF;
      }

      if (TurmaGUID && typeof TurmaGUID === "string") {
        filters.TurmaGUID = TurmaGUID;
      }

      if (MatriculaStatus && typeof MatriculaStatus === "string") {
        filters.MatriculaStatus = MatriculaStatus;
      }

      const resultado = await this.#matriculaService.listarMatriculas(filters);

      res.status(200).json({
        success: true,
        data: resultado.matriculas,
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
        console.error("Erro ao listar matrículas:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao listar matrículas",
        });
      }
    }
  };

  /**
   * GET /api/matricula/:guid
   * Buscar matrícula por GUID (RA customizado ou UUID)
   */
  show = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;

      const matricula = await this.#matriculaService.buscarMatricula(guid);

      res.status(200).json({
        success: true,
        data: matricula,
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          details: error.details,
        });
      } else {
        console.error("Erro ao buscar matrícula:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao buscar matrícula",
        });
      }
    }
  };

  /**
   * PUT /api/matricula/:guid
   * Atualizar matrícula
   * 
   * Body: { matricula: { MatriculaDataEntrada?, MatriculaDataSaida?, MatriculaStatus? } }
   */
  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const { matricula } = req.body;
      const usuarioCPF = req.user?.UsuarioCPF || '';

      const updateData: MatriculaUpdateDTO = {};

      if (matricula.MatriculaDataEntrada) {
        updateData.MatriculaDataEntrada = new Date(matricula.MatriculaDataEntrada);
      }

      if (matricula.MatriculaDataSaida !== undefined) {
        updateData.MatriculaDataSaida = matricula.MatriculaDataSaida
          ? new Date(matricula.MatriculaDataSaida)
          : null;
      }

      if (matricula.MatriculaStatus) {
        updateData.MatriculaStatus = matricula.MatriculaStatus;
      }

      const matriculaAtualizada = await this.#matriculaService.atualizarMatricula(
        guid,
        updateData,
        usuarioCPF
      );

      res.status(200).json({
        success: true,
        message: "Matrícula atualizada com sucesso",
        data: matriculaAtualizada,
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          details: error.details,
        });
      } else {
        console.error("Erro ao atualizar matrícula:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao atualizar matrícula",
        });
      }
    }
  };

  /**
   * DELETE /api/matricula/:guid
   * Cancelar matrícula (soft delete)
   */
  destroy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const usuarioCPF = req.user?.UsuarioCPF || '';

      await this.#matriculaService.excluirMatricula(guid, usuarioCPF);

      res.status(200).json({
        success: true,
        message: "Matrícula cancelada com sucesso",
      });
    } catch (error) {
      if (error instanceof ErrorResponse) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          details: error.details,
        });
      } else {
        console.error("Erro ao cancelar matrícula:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao cancelar matrícula",
        });
      }
    }
  };
}
