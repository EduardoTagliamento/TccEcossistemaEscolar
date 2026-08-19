import { gerarGUID } from "../utils/helpers/guid.helper";
import ErrorResponse from "../utils/ErrorResponse";
import ConteudoProgresso from "../entities/conteudoprogresso.model";
import { ConteudoProgressoDAO } from "../repositories/conteudoprogresso.repository";
import { ConteudoDAO } from "../repositories/conteudo.repository";
import { ConteudoPaginadoArquivoDAO } from "../repositories/conteudopaginadoarquivo.repository";
import { MatriculaDAO } from "../repositories/matricula.repository";
import ConteudoTurmaDAO from "../repositories/conteudoturma.repository";

const LIMIAR_VIDEO_CONCLUIDO = 95; // >=95% assistido conta como 100%

export interface ConteudoProgressoDTO {
  ConteudoGUID: string;
  MatriculaGUID: string;
  PercentualConcluido: number;
  UltimaPosicaoSegundos: number | null;
  ConcluidoEm: string | null;
}

export default class ConteudoProgressoService {
  #progressoDAO: ConteudoProgressoDAO;
  #conteudoDAO: ConteudoDAO;
  #paginadoDAO: ConteudoPaginadoArquivoDAO;
  #matriculaDAO: MatriculaDAO;
  #conteudoTurmaDAO: ConteudoTurmaDAO;

  constructor(
    progressoDAO: ConteudoProgressoDAO,
    conteudoDAO: ConteudoDAO,
    paginadoDAO: ConteudoPaginadoArquivoDAO,
    matriculaDAO: MatriculaDAO,
    conteudoTurmaDAO: ConteudoTurmaDAO
  ) {
    console.log("⬆️  ConteudoProgressoService.constructor()");
    this.#progressoDAO = progressoDAO;
    this.#conteudoDAO = conteudoDAO;
    this.#paginadoDAO = paginadoDAO;
    this.#matriculaDAO = matriculaDAO;
    this.#conteudoTurmaDAO = conteudoTurmaDAO;
  }

  /**
   * Resolve a matrícula ATIVA do usuário autenticado NA TURMA em que este
   * conteúdo foi atribuído — progresso é sempre por matrícula, não pelo
   * usuário direto. Um aluno pode ter uma matrícula ativa por escola (ver
   * MatriculaDAO.findMatriculaAtivaByUsuarioEEscola), então não dá mais pra
   * pegar "a" matrícula ativa sem saber qual turma — um conteúdo é atribuído
   * a N turmas (ConteudoTurma), então cruza com as turmas do aluno.
   */
  #resolverMatriculaAtiva = async (usuarioGUID: string, conteudoGUID: string): Promise<string> => {
    const atribuicoes = await this.#conteudoTurmaDAO.findByConteudo(conteudoGUID);
    const turmaGUIDs = new Set(atribuicoes.map((a) => a.TurmaGUID));

    const matriculas = await this.#matriculaDAO.findAllMatriculasAtivasByUsuario(usuarioGUID);
    // Matrícula-sombra de grupo eletivo (TurmaGUID=null) nunca bate aqui — conteúdo
    // ainda é atribuído só por turma (ver docs/PLANO_IMPLEMENTACAO_GRUPO_ELETIVO.md, §8).
    const matricula = matriculas.find((m) => m.TurmaGUID && turmaGUIDs.has(m.TurmaGUID));
    if (!matricula) {
      throw new ErrorResponse(404, "Matrícula não encontrada", {
        message: "Usuário não possui matrícula ativa na turma deste conteúdo.",
      });
    }
    return matricula.MatriculaGUID;
  };

  registrarProgressoVideo = async (
    conteudoGUID: string,
    usuarioGUID: string,
    segundosAssistidos: number,
    duracaoTotalSegundos: number
  ): Promise<ConteudoProgressoDTO> => {
    console.log("🟣 ConteudoProgressoService.registrarProgressoVideo()");

    const conteudo = await this.#conteudoDAO.findById(conteudoGUID);
    if (!conteudo) {
      throw new ErrorResponse(404, "Conteúdo não encontrado");
    }

    const matriculaGUID = await this.#resolverMatriculaAtiva(usuarioGUID, conteudoGUID);

    let percentual = duracaoTotalSegundos > 0 ? Math.round((segundosAssistidos / duracaoTotalSegundos) * 100) : 0;
    percentual = Math.min(100, Math.max(0, percentual));
    if (percentual >= LIMIAR_VIDEO_CONCLUIDO) percentual = 100;

    const progresso = new ConteudoProgresso();
    progresso.ConteudoProgressoGUID = gerarGUID();
    progresso.ConteudoGUID = conteudoGUID;
    progresso.MatriculaGUID = matriculaGUID;
    progresso.PercentualConcluido = percentual;
    progresso.UltimaPosicaoSegundos = Math.round(segundosAssistidos);
    progresso.ConcluidoEm = percentual === 100 ? new Date() : null;

    await this.#progressoDAO.upsert(progresso);

    return this.toDTO(progresso);
  };

  registrarVisualizacaoPagina = async (
    conteudoPaginadoArquivoGUID: string,
    usuarioGUID: string
  ): Promise<ConteudoProgressoDTO> => {
    console.log("🟣 ConteudoProgressoService.registrarVisualizacaoPagina()");

    const pagina = await this.#paginadoDAO.findById(conteudoPaginadoArquivoGUID);
    if (!pagina) {
      throw new ErrorResponse(404, "Página não encontrada");
    }

    const matriculaGUID = await this.#resolverMatriculaAtiva(usuarioGUID, pagina.ConteudoGUID);

    await this.#progressoDAO.registrarPaginaVista(conteudoPaginadoArquivoGUID, matriculaGUID, gerarGUID());

    const todasPaginas = await this.#paginadoDAO.findByConteudo(pagina.ConteudoGUID);
    const vistas = await this.#progressoDAO.contarPaginasVistas(pagina.ConteudoGUID, matriculaGUID);
    const percentual = todasPaginas.length > 0 ? Math.round((vistas / todasPaginas.length) * 100) : 0;

    const progresso = new ConteudoProgresso();
    progresso.ConteudoProgressoGUID = gerarGUID();
    progresso.ConteudoGUID = pagina.ConteudoGUID;
    progresso.MatriculaGUID = matriculaGUID;
    progresso.PercentualConcluido = percentual;
    progresso.ConcluidoEm = percentual === 100 ? new Date() : null;

    await this.#progressoDAO.upsert(progresso);

    return this.toDTO(progresso);
  };

  registrarLeituraTexto = async (conteudoGUID: string, usuarioGUID: string): Promise<ConteudoProgressoDTO> => {
    console.log("🟣 ConteudoProgressoService.registrarLeituraTexto()");

    const conteudo = await this.#conteudoDAO.findById(conteudoGUID);
    if (!conteudo) {
      throw new ErrorResponse(404, "Conteúdo não encontrado");
    }

    const matriculaGUID = await this.#resolverMatriculaAtiva(usuarioGUID, conteudoGUID);

    const progresso = new ConteudoProgresso();
    progresso.ConteudoProgressoGUID = gerarGUID();
    progresso.ConteudoGUID = conteudoGUID;
    progresso.MatriculaGUID = matriculaGUID;
    progresso.PercentualConcluido = 100;
    progresso.ConcluidoEm = new Date();

    await this.#progressoDAO.upsert(progresso);

    return this.toDTO(progresso);
  };

  buscarProgresso = async (conteudoGUID: string, usuarioGUID: string): Promise<ConteudoProgressoDTO> => {
    console.log("🟣 ConteudoProgressoService.buscarProgresso()");

    const matriculaGUID = await this.#resolverMatriculaAtiva(usuarioGUID, conteudoGUID);
    const progresso = await this.#progressoDAO.findByConteudoEMatricula(conteudoGUID, matriculaGUID);

    if (!progresso) {
      return { ConteudoGUID: conteudoGUID, MatriculaGUID: matriculaGUID, PercentualConcluido: 0, UltimaPosicaoSegundos: null, ConcluidoEm: null };
    }

    return this.toDTO(progresso);
  };

  private toDTO(progresso: ConteudoProgresso): ConteudoProgressoDTO {
    return {
      ConteudoGUID: progresso.ConteudoGUID,
      MatriculaGUID: progresso.MatriculaGUID,
      PercentualConcluido: progresso.PercentualConcluido,
      UltimaPosicaoSegundos: progresso.UltimaPosicaoSegundos,
      ConcluidoEm: progresso.ConcluidoEm ? progresso.ConcluidoEm.toISOString() : null,
    };
  }
}
