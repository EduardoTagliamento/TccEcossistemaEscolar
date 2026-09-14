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
      const usuarioGUIDAtor = req.user?.UsuarioGUID || '';

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
          usuarioGUIDAtor
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
          MatriculaIdentificador: matricula.MatriculaIdentificador,
          UsuarioGUID: matricula.UsuarioGUID,
          UsuarioCPF: matricula.UsuarioCPF,
          TurmaGUID: matricula.TurmaGUID,
          TurmaNome: matricula.TurmaNome,
          MatriculaDataEntrada: matricula.MatriculaDataEntrada
            ? new Date(matricula.MatriculaDataEntrada)
            : undefined,
        };

        const matriculaCriada = await this.#matriculaService.criarMatricula(
          createData,
          usuarioGUIDAtor
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
      const usuarioGUIDAtor = req.user?.UsuarioGUID || '';

      const transferenciaData: TransferenciaDTO = {
        UsuarioCPF: transferencia.UsuarioCPF,
        TurmaOrigemGUID: transferencia.TurmaOrigemGUID,
        TurmaDestinoGUID: transferencia.TurmaDestinoGUID,
        DataTransferencia: new Date(transferencia.DataTransferencia),
      };

      const resultado = await this.#matriculaService.transferirAluno(
        transferenciaData,
        usuarioGUIDAtor
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
   * Query: ?UsuarioGUID=X&TurmaGUID=Y&MatriculaStatus=Z&EscolaGUID=W
   */
  index = async (req: Request, res: Response): Promise<void> => {
    try {
      const { UsuarioGUID, TurmaGUID, GrupoEletivoGUID, MatriculaStatus, EscolaGUID } = req.query;

      const filters: any = {};

      if (UsuarioGUID && typeof UsuarioGUID === "string") {
        filters.UsuarioGUID = UsuarioGUID;
      }

      if (TurmaGUID && typeof TurmaGUID === "string") {
        filters.TurmaGUID = TurmaGUID;
      }

      if (GrupoEletivoGUID && typeof GrupoEletivoGUID === "string") {
        filters.GrupoEletivoGUID = GrupoEletivoGUID;
      }

      if (MatriculaStatus && typeof MatriculaStatus === "string") {
        filters.MatriculaStatus = MatriculaStatus;
      }

      if (EscolaGUID && typeof EscolaGUID === "string") {
        filters.EscolaGUID = EscolaGUID;
      }

      // Chamada via chave de API: SEMPRE força a escola da própria chave,
      // nunca a que o chamador pediu — impede uma chave da Escola A listar
      // matrícula da Escola B só trocando o query param.
      if (req.apiKey) {
        filters.EscolaGUID = req.apiKey.EscolaGUID;
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

      // Chamada via chave de API: só pode ver matrícula da própria escola —
      // sem isso, uma chave poderia enumerar GUIDs e ler matrícula de
      // qualquer outra escola (a rota não filtra por EscolaGUID, só pelo :guid).
      if (req.apiKey) {
        const escolaGUID = await this.#matriculaService.obterEscolaGUID(guid);
        if (escolaGUID !== req.apiKey.EscolaGUID) {
          res.status(404).json({
            success: false,
            message: "Matrícula não encontrada",
          });
          return;
        }
      }

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
      const usuarioGUIDAtor = req.user?.UsuarioGUID || '';

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
        usuarioGUIDAtor
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
   * PATCH /api/matricula/:guid/identificador
   * Atualizar só o identificador de login da matrícula (Secretaria,
   * Coordenação ou Direção)
   *
   * Body: { MatriculaIdentificador: string }
   */
  atualizarIdentificador = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const { MatriculaIdentificador } = req.body;
      const usuarioGUIDAtor = req.user?.UsuarioGUID || '';

      const matriculaAtualizada = await this.#matriculaService.atualizarIdentificador(
        guid,
        MatriculaIdentificador,
        usuarioGUIDAtor
      );

      res.status(200).json({
        success: true,
        message: "Identificador atualizado com sucesso",
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
        console.error("Erro ao atualizar identificador da matrícula:", error);
        res.status(500).json({
          success: false,
          message: "Erro interno ao atualizar identificador da matrícula",
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
      const usuarioGUIDAtor = req.user?.UsuarioGUID || '';

      await this.#matriculaService.excluirMatricula(guid, usuarioGUIDAtor);

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
