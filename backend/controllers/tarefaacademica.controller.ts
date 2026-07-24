import { NextFunction, Request, Response } from "express";
import TarefaAcademicaService, {
  TarefaAcademicaCreateDTO,
  TarefaAcademicaBatchCreateDTO,
  TarefaAcademicaUpdateDTO,
} from "../services/tarefaacademica.service";
import { TarefaAcademicaFilters } from "../repositories/tarefaacademica.repository";
import ErrorResponse from "../utils/ErrorResponse";
import RelacaoAnexosService from "../services/relacaoanexos.service";

/**
 * Controller para endpoints de TarefaAcademica (MODELO NORMALIZADO)
 *
 * Endpoints:
 * - POST   /api/tarefa                                (criar tarefa para N alunos)
 * - POST   /api/tarefa/batch                          (alias para criar)
 * - GET    /api/tarefa                                (listar com filtros)
 * - GET    /api/tarefa/:TarefaGUID                    (buscar por GUID)
 * - PUT    /api/tarefa/:TarefaGUID                    (atualizar dados da tarefa)
 * - PATCH  /api/tarefa/:TarefaGUID/marcar-feito       (aluno marca como feito)
 * - DELETE /api/tarefa/:TarefaGUID                    (excluir)
 * - POST   /api/tarefa/:TarefaGUID/anexo-entrega      (vincular anexo de entrega)
 * - DELETE /api/tarefa/:TarefaGUID/anexo-entrega/:AnexoGUID (desvincular anexo)
 */
export default class TarefaAcademicaControl {
  #tarefaService: TarefaAcademicaService;
  #relacaoAnexosService?: RelacaoAnexosService;

  constructor(tarefaServiceDependency: TarefaAcademicaService, relacaoAnexosService?: RelacaoAnexosService) {
    console.log("⬆️  TarefaAcademicaControl.constructor()");
    this.#tarefaService = tarefaServiceDependency;
    this.#relacaoAnexosService = relacaoAnexosService;
  }

  /**
   * POST /api/tarefa
   * Criar nova tarefa acadêmica para múltiplos alunos
   *
   * Body: { tarefa: { MatriculasGUID[], matXprofXturxescGUID, TarefaTitulo, TarefaConteudo?,
   *                   TarefaPrazoData, TarefaTipoEntrega, anexosDescricao? } }
   */
  store = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 TarefaAcademicaControl.store()");
    try {
      const { tarefa } = request.body;
      const usuarioCPF = request.user?.UsuarioCPF;

      const datasPorMatricula: Record<string, Date> | undefined = tarefa.DatasPorMatricula
        ? Object.fromEntries(
            Object.entries(tarefa.DatasPorMatricula as Record<string, string>).map(
              ([matriculaGUID, data]) => [matriculaGUID, new Date(data)]
            )
          )
        : undefined;

      const createData: TarefaAcademicaCreateDTO = {
        MatriculasGUID: tarefa.MatriculasGUID,
        matXprofXturxescGUID: tarefa.matXprofXturxescGUID,
        TarefaTitulo: tarefa.TarefaTitulo,
        TarefaConteudo: tarefa.TarefaConteudo,
        TarefaPrazoData: new Date(tarefa.TarefaPrazoData),
        TarefaTipoEntrega: tarefa.TarefaTipoEntrega,
        CategoriaGUID: tarefa.CategoriaGUID,
        anexosDescricao: tarefa.anexosDescricao,
        TarefaCompartilhada: tarefa.TarefaCompartilhada || false,
        TarefaMinPessoas: tarefa.TarefaMinPessoas,
        TarefaMaxPessoas: tarefa.TarefaMaxPessoas,
        DatasPorMatricula: datasPorMatricula,
      };

      const tarefaCriada = await this.#tarefaService.criarTarefa(createData, usuarioCPF);

      response.status(201).json({
        success: true,
        message: "Tarefa criada com sucesso",
        data: { tarefa: tarefaCriada },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/tarefa/batch
   * Criar tarefa para vários alunos (alias para store)
   *
   * Body: { tarefa: { MatriculasGUID[], matXprofXturxescGUID, TarefaTitulo, TarefaConteudo?,
   *                   TarefaPrazoData, TarefaTipoEntrega, anexosDescricao? } }
   */
  storeBatch = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 TarefaAcademicaControl.storeBatch()");
    try {
      const { tarefa } = request.body;
      const usuarioCPF = request.user?.UsuarioCPF;

      const batchCreateData: TarefaAcademicaBatchCreateDTO = {
        MatriculasGUID: tarefa.MatriculasGUID,
        matXprofXturxescGUID: tarefa.matXprofXturxescGUID,
        TarefaTitulo: tarefa.TarefaTitulo,
        TarefaConteudo: tarefa.TarefaConteudo,
        TarefaPrazoData: new Date(tarefa.TarefaPrazoData),
        TarefaTipoEntrega: tarefa.TarefaTipoEntrega,
        CategoriaGUID: tarefa.CategoriaGUID,
        anexosDescricao: tarefa.anexosDescricao,
        TarefaCompartilhada: tarefa.TarefaCompartilhada || false,
        TarefaMinPessoas: tarefa.TarefaMinPessoas,
        TarefaMaxPessoas: tarefa.TarefaMaxPessoas,
      };

      const resultado = await this.#tarefaService.criarTarefasBatch(batchCreateData, usuarioCPF);

      response.status(201).json({
        success: true,
        message: `${resultado.count} tarefa(s) criada(s) com sucesso`,
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/tarefa
   * Listar tarefas com filtros opcionais
   * Query: ?matXprofXturxescGUID=Y&DataInicio=Z&DataFim=W&TarefaCompartilhada=true
   */
  index = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 TarefaAcademicaControl.index()");
    try {
      const filters: TarefaAcademicaFilters = {
        matXprofXturxescGUID: request.query.matXprofXturxescGUID as string | undefined,
        DataInicio: request.query.DataInicio
          ? new Date(request.query.DataInicio as string)
          : undefined,
        DataFim: request.query.DataFim ? new Date(request.query.DataFim as string) : undefined,
        TarefaCompartilhada: request.query.TarefaCompartilhada !== undefined
          ? request.query.TarefaCompartilhada === 'true'
          : undefined,
      };

      const tarefas = await this.#tarefaService.listarTarefas(filters);

      response.status(200).json({
        success: true,
        message: "Executado com sucesso",
        data: { tarefas, total: tarefas.length },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/tarefa/:TarefaGUID
   * Buscar tarefa por GUID
   */
  show = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 TarefaAcademicaControl.show()");
    try {
      const { TarefaGUID } = request.params;
      const tarefa = await this.#tarefaService.buscarTarefa(TarefaGUID);

      response.status(200).json({
        success: true,
        message: "Tarefa encontrada",
        data: { tarefa },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/tarefa/:TarefaGUID
   * Atualizar tarefa (afeta todos os alunos)
   *
   * Body: { tarefa: { TarefaTitulo?, TarefaConteudo?, TarefaPrazoData?, TarefaTipoEntrega? } }
   */
  update = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 TarefaAcademicaControl.update()");
    try {
      const { TarefaGUID } = request.params;
      const { tarefa } = request.body;
      const usuarioCPF = request.user?.UsuarioCPF;

      const updateData: TarefaAcademicaUpdateDTO = {
        TarefaTitulo: tarefa.TarefaTitulo,
        TarefaConteudo: tarefa.TarefaConteudo,
        TarefaPrazoData: tarefa.TarefaPrazoData ? new Date(tarefa.TarefaPrazoData) : undefined,
        TarefaTipoEntrega: tarefa.TarefaTipoEntrega,
        CategoriaGUID: tarefa.CategoriaGUID,
        TarefaMinPessoas: tarefa.TarefaMinPessoas,
        TarefaMaxPessoas: tarefa.TarefaMaxPessoas,
      };

      const tarefaAtualizada = await this.#tarefaService.atualizarTarefa(
        TarefaGUID,
        updateData,
        usuarioCPF
      );

      response.status(200).json({
        success: true,
        message: "Tarefa atualizada com sucesso",
        data: { tarefa: tarefaAtualizada },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/tarefa/:TarefaGUID/marcar-feito
   * Aluno marca tarefa como feita (ou desmarca)
   * 
   * Body: { MatriculaGUID: string, TarefaFeito: boolean }
   */
  marcarComoFeito = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 TarefaAcademicaControl.marcarComoFeito()");
    try {
      const { TarefaGUID } = request.params;
      const { MatriculaGUID, TarefaFeito } = request.body;
      const usuarioCPF = request.user?.UsuarioCPF;

      const atribuicaoAtualizada = await this.#tarefaService.marcarComoFeito(
        TarefaGUID,
        MatriculaGUID,
        TarefaFeito,
        usuarioCPF
      );

      response.status(200).json({
        success: true,
        message: `Tarefa marcada como ${TarefaFeito ? "feita" : "não feita"}`,
        data: { atribuicao: atribuicaoAtualizada }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/tarefa/matricula/:TarefaMatriculaGUID/avaliar
   * Professor atribui nota (0-10) a uma entrega
   * Body: { Nota: number }
   */
  avaliar = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 TarefaAcademicaControl.avaliar()");
    try {
      const { TarefaMatriculaGUID } = request.params;
      const { Nota } = request.body;
      const usuarioCPF = request.user?.UsuarioCPF;

      if (!usuarioCPF) {
        response.status(401).json({ success: false, message: "Usuário não autenticado" });
        return;
      }

      const atribuicaoAvaliada = await this.#tarefaService.avaliarTarefa(TarefaMatriculaGUID, Number(Nota), usuarioCPF);

      response.status(200).json({
        success: true,
        message: "Tarefa avaliada com sucesso",
        data: { atribuicao: atribuicaoAvaliada },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/tarefa/pendentes-aluno?UsuarioCPF=
   */
  pendentesAluno = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 TarefaAcademicaControl.pendentesAluno()");
    try {
      const usuarioCPF = (request.query.UsuarioCPF as string) || request.user?.UsuarioCPF || "";
      const pendentes = await this.#tarefaService.listarPendentesAluno(usuarioCPF);
      response.status(200).json({ success: true, message: "Pendentes listadas com sucesso", data: { pendentes } });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/tarefa/pendentes-avaliacao-professor?UsuarioCPF=
   */
  pendentesAvaliacaoProfessor = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 TarefaAcademicaControl.pendentesAvaliacaoProfessor()");
    try {
      const usuarioCPF = (request.query.UsuarioCPF as string) || request.user?.UsuarioCPF || "";
      const pendentes = await this.#tarefaService.listarPendentesAvaliacaoProfessor(usuarioCPF);
      response.status(200).json({ success: true, message: "Pendentes listadas com sucesso", data: { pendentes } });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/tarefa/:TarefaGUID
   * Excluir tarefa
   */
  destroy = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 TarefaAcademicaControl.destroy()");
    try {
      const { TarefaGUID } = request.params;
      const usuarioCPF = request.user?.UsuarioCPF;

      const excluida = await this.#tarefaService.excluirTarefa(TarefaGUID, usuarioCPF);

      if (!excluida) {
        response.status(404).json({
          success: false,
          message: "Tarefa não encontrada",
          error: { message: `Não existe tarefa com id ${TarefaGUID}` },
        });
        return;
      }

      response.status(200).json({
        success: true,
        message: "Tarefa excluída com sucesso",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/tarefa/:TarefaGUID/anexo-entrega
   * Vincular anexo de entrega a uma tarefa (aluno envia sua entrega)
   *
   * Body: { AnexoGUID: string }
   */
  enviarAnexoEntrega = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("🔵 TarefaAcademicaControl.enviarAnexoEntrega()");
    try {
      const { TarefaGUID } = request.params;
      const { AnexoGUID } = request.body;
      const usuarioCPF = request.user?.UsuarioCPF;

      await this.#tarefaService.enviarAnexoEntrega(TarefaGUID, AnexoGUID, usuarioCPF);

      response.status(200).json({
        success: true,
        message: "Anexo de entrega vinculado com sucesso",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/tarefa/:TarefaGUID/anexo-entrega/:AnexoGUID
   * Remover vínculo de um anexo da tarefa
   */
  removerAnexo = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("🔵 TarefaAcademicaControl.removerAnexo()");
    try {
      const { TarefaGUID, AnexoGUID } = request.params;
      const usuarioCPF = request.user?.UsuarioCPF;

      await this.#tarefaService.removerAnexo(TarefaGUID, AnexoGUID, usuarioCPF);

      response.status(200).json({
        success: true,
        message: "Anexo removido da tarefa com sucesso",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/tarefa/:TarefaGUID/anexos
   * Listar anexos vinculados à tarefa (materiais de apoio)
   */
  listarAnexos = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("🔵 TarefaAcademicaControl.listarAnexos()");
    try {
      if (!this.#relacaoAnexosService) {
        return next(new ErrorResponse(500, "Serviço de anexos não configurado"));
      }

      const { TarefaGUID } = request.params;
      const usuarioCPF = request.user?.UsuarioCPF;

      if (!usuarioCPF) {
        return next(new ErrorResponse(401, "Não autenticado"));
      }

      const anexos = await this.#relacaoAnexosService.listarAnexosTarefa(TarefaGUID, usuarioCPF);

      response.status(200).json({
        success: true,
        message: "Anexos listados com sucesso",
        data: {
          anexos,
          total: anexos.length
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/tarefa/:TarefaGUID/anexos
   * Vincular anexo à tarefa (material de apoio)
   */
  vincularAnexo = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("🔵 TarefaAcademicaControl.vincularAnexo()");
    try {
      if (!this.#relacaoAnexosService) {
        return next(new ErrorResponse(500, "Serviço de anexos não configurado"));
      }

      const { TarefaGUID } = request.params;
      const { AnexoGUID } = request.body;
      const usuarioCPF = request.user?.UsuarioCPF;

      if (!usuarioCPF) {
        return next(new ErrorResponse(401, "Não autenticado"));
      }

      if (!AnexoGUID) {
        return next(new ErrorResponse(400, "AnexoGUID é obrigatório"));
      }

      const relacao = await this.#relacaoAnexosService.vincularAnexo(
        AnexoGUID,
        "tarefa",
        TarefaGUID,
        usuarioCPF
      );

      response.status(201).json({
        success: true,
        message: "Anexo vinculado à tarefa com sucesso",
        data: { relacao },
      });
    } catch (error) {
      next(error);
    }
  };
}
