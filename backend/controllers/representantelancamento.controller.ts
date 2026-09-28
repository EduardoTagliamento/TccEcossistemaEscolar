import { NextFunction, Request, Response } from "express";
import RepresentanteLancamentoService from "../services/representantelancamento.service";
import { getProvaAgendadaService } from "../services/provaagendada.service";
import { getTarefaAcademicaService } from "../services/tarefaacademica.service";
import { getConteudoService } from "../services/conteudo.service";
import { EscolaConfiguracaoDAO } from "../repositories/escolaconfiguracao.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import ErrorResponse from "../utils/ErrorResponse";
import { parseDataBrasil } from "../utils/timezone.util";

/**
 * Controller do fluxo "Lançamento de Prova/Tarefa/Conteúdo por
 * Representante" — ver docs/PLANO_IMPLEMENTACAO_LANCAMENTO_POR_REPRESENTANTE.md.
 *
 * Endpoints:
 * - GET  /api/representante/escolas/:escolaGUID/minhas-alocacoes
 * - GET  /api/representante/turmas/:turmaGUID/permissao?MateriaGUID=...
 * - POST /api/representante/turmas/:turmaGUID/provas
 * - POST /api/representante/turmas/:turmaGUID/tarefas
 * - POST /api/representante/turmas/:turmaGUID/conteudos
 * - GET  /api/representante/escolas/:escolaGUID/flag
 * - PUT  /api/representante/escolas/:escolaGUID/flag
 *
 * Em toda rota de criação, `usuarioGUID` autenticado é o REPRESENTANTE — o
 * controller resolve o professor responsável e chama o *Service já existente
 * (ProvaAgendadaService/TarefaAcademicaService/ConteudoService) passando o
 * GUID do PROFESSOR como autor (preserva 100% das validações de
 * categoria/alocação já existentes ali, sem duplicar lógica de permissão),
 * mais `CriadoPorRepresentanteUsuarioGUID` pra auditoria e disparo do fan-out.
 */
export default class RepresentanteLancamentoControl {
  #service: RepresentanteLancamentoService;
  #escolaConfiguracaoDAO: EscolaConfiguracaoDAO;
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(
    service: RepresentanteLancamentoService,
    escolaConfiguracaoDAO: EscolaConfiguracaoDAO,
    escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO
  ) {
    console.log("⬆️  RepresentanteLancamentoControl.constructor()");
    this.#service = service;
    this.#escolaConfiguracaoDAO = escolaConfiguracaoDAO;
    this.#escolaxUsuarioxFuncaoDAO = escolaxUsuarioxFuncaoDAO;
  }

  listarMinhasAlocacoes = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 RepresentanteLancamentoControl.listarMinhasAlocacoes()");
    try {
      const { escolaGUID } = request.params;
      const usuarioGUID = request.user?.UsuarioGUID as string;

      const alocacoes = await this.#service.listarAlocacoesOndeERepresentante(usuarioGUID, escolaGUID);
      response.status(200).json({ success: true, data: { alocacoes } });
    } catch (error) {
      next(error);
    }
  };

  verificarPermissao = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 RepresentanteLancamentoControl.verificarPermissao()");
    try {
      const { turmaGUID } = request.params;
      const usuarioGUID = request.user?.UsuarioGUID as string;

      const podeLancar = await this.#service.podeLancarEmNomeDoProfessor(usuarioGUID, turmaGUID);
      response.status(200).json({ success: true, data: { podeLancar } });
    } catch (error) {
      next(error);
    }
  };

  #exigirPermissao = async (usuarioGUID: string, turmaGUID: string): Promise<void> => {
    const podeLancar = await this.#service.podeLancarEmNomeDoProfessor(usuarioGUID, turmaGUID);
    if (!podeLancar) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você não é representante ativo desta turma, ou a escola não habilitou este recurso.",
      });
    }
  };

  criarProva = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 RepresentanteLancamentoControl.criarProva()");
    try {
      const { turmaGUID } = request.params;
      const usuarioGUID = request.user?.UsuarioGUID as string;
      const body = request.body;

      await this.#exigirPermissao(usuarioGUID, turmaGUID);

      const professor = await this.#service.resolverProfessorDaTurmaEMateria(turmaGUID, body.MateriaGUID);
      if (!professor) {
        throw new ErrorResponse(404, "Professor não encontrado", {
          message: "Nenhum professor leciona esta matéria nesta turma.",
        });
      }

      const provaCriada = await getProvaAgendadaService().criarProva(
        {
          TurmasGUID: [turmaGUID],
          MateriaGUID: body.MateriaGUID,
          ProvaTitulo: body.ProvaTitulo,
          ProvaData: parseDataBrasil(body.ProvaData),
          ProvaDescricao: body.ProvaDescricao,
          CriadoPorRepresentanteUsuarioGUID: usuarioGUID,
          ModoAutomatico: body.ModoAutomatico,
          SemanaBase: body.SemanaBase,
          DiaSemana: body.DiaSemana,
        },
        professor.UsuarioGUID
      );

      response.status(201).json({ success: true, message: "Prova criada com sucesso", data: { prova: provaCriada } });
    } catch (error) {
      next(error);
    }
  };

  criarTarefa = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 RepresentanteLancamentoControl.criarTarefa()");
    try {
      const { turmaGUID } = request.params;
      const usuarioGUID = request.user?.UsuarioGUID as string;
      const body = request.body;

      await this.#exigirPermissao(usuarioGUID, turmaGUID);

      const origem = await this.#service.prepararOrigemTarefa(turmaGUID, body.MateriaGUID);
      if (!origem) {
        throw new ErrorResponse(404, "Professor não encontrado", {
          message: "Nenhum professor leciona esta matéria nesta turma.",
        });
      }

      const tarefaCriada = await getTarefaAcademicaService().criarTarefa(
        {
          MatriculasGUID: origem.matriculasGUID,
          matXprofXturxescGUID: origem.matXprofXturxescGUID,
          TarefaTitulo: body.TarefaTitulo,
          TarefaConteudo: body.TarefaConteudo,
          TarefaPrazoData: parseDataBrasil(body.TarefaPrazoData),
          TarefaTipoEntrega: body.TarefaTipoEntrega,
          CriadoPorRepresentanteUsuarioGUID: usuarioGUID,
          ModoAutomatico: body.ModoAutomatico,
          SemanaBase: body.SemanaBase,
          DiaSemana: body.DiaSemana,
        },
        origem.professorUsuarioGUID
      );

      response.status(201).json({ success: true, message: "Tarefa criada com sucesso", data: { tarefa: tarefaCriada } });
    } catch (error) {
      next(error);
    }
  };

  criarConteudo = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 RepresentanteLancamentoControl.criarConteudo()");
    try {
      const { turmaGUID } = request.params;
      const usuarioGUID = request.user?.UsuarioGUID as string;
      const body = request.body;

      await this.#exigirPermissao(usuarioGUID, turmaGUID);

      const professor = await this.#service.resolverProfessorDaTurmaEMateria(turmaGUID, body.MateriaGUID);
      if (!professor) {
        throw new ErrorResponse(404, "Professor não encontrado", {
          message: "Nenhum professor leciona esta matéria nesta turma.",
        });
      }

      const conteudoCriado = await getConteudoService().criarConteudo(
        {
          MateriaGUID: body.MateriaGUID,
          ConteudoTitulo: body.ConteudoTitulo,
          ConteudoTipo: "texto",
          ConteudoDescricao: body.ConteudoDescricao,
          TurmasGUID: [turmaGUID],
          ConteudoDataPublicacao: parseDataBrasil(body.ConteudoDataPublicacao),
          ConteudoHtml: body.ConteudoHtml,
          CriadoPorRepresentanteUsuarioGUID: usuarioGUID,
        },
        {},
        professor.UsuarioGUID
      );

      response.status(201).json({ success: true, message: "Conteúdo criado com sucesso", data: { conteudo: conteudoCriado } });
    } catch (error) {
      next(error);
    }
  };

  obterFlag = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 RepresentanteLancamentoControl.obterFlag()");
    try {
      const { escolaGUID } = request.params;
      const habilitado = await this.#escolaConfiguracaoDAO.getPermiteLancamentoPorRepresentante(escolaGUID);
      response.status(200).json({ success: true, data: { PermiteLancamentoPorRepresentante: habilitado } });
    } catch (error) {
      next(error);
    }
  };

  definirFlag = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 RepresentanteLancamentoControl.definirFlag()");
    try {
      const { escolaGUID } = request.params;
      const usuarioGUID = request.user?.UsuarioGUID as string;

      const autorizado = await this.#escolaxUsuarioxFuncaoDAO.isCoordSecretariaOuDirecaoEmEscola(usuarioGUID, escolaGUID);
      if (!autorizado) {
        throw new ErrorResponse(403, "Sem permissão", {
          message: "Só coordenação, secretaria ou direção podem ativar/desativar este recurso.",
        });
      }

      await this.#escolaConfiguracaoDAO.definirPermiteLancamentoPorRepresentante(
        escolaGUID,
        request.body.PermiteLancamentoPorRepresentante
      );
      response.status(200).json({ success: true, message: "Configuração atualizada com sucesso" });
    } catch (error) {
      next(error);
    }
  };
}
