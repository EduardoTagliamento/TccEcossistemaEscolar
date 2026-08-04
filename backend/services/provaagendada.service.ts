import { v4 as uuidv4 } from "uuid";
import { RowDataPacket } from "mysql2";
import ProvaAgendada from "../entities/provaagendada.model";
import ProvaAgendadaTurma from "../entities/provaagendada-turma.model";
import { ProvaAgendadaDAO, ProvaAgendadaFilters } from "../repositories/provaagendada.repository";
import ProvaAgendadaTurmaDAO from "../repositories/provaagendada-turma.repository";
import { AnexoDAO } from "../repositories/anexo.repository";
import { TurmaDAO } from "../repositories/turma.repository";
import { MateriaDAO } from "../repositories/materia.repository";
import { CategoriaConteudoDAO } from "../repositories/categoriaconteudo.repository";
import { ProvaAgendadaVisualizacaoDAO } from "../repositories/provaagendadavisualizacao.repository";
import ProvaAgendadaVisualizacao from "../entities/provaagendadavisualizacao.model";
import { MatriculaDAO } from "../repositories/matricula.repository";
import { MaterialProfessorTurmaDAO } from "../repositories/materiaxprofessorxturma.repository";
import { ProvaAgendadaAssuntoDAO } from "../repositories/provaagendadaassunto.repository";
import { AssuntoDAO } from "../repositories/assunto.repository";
import { MaterialDidaticoCapituloDAO } from "../repositories/materialdidaticocapitulo.repository";
import ErrorResponse from "../utils/ErrorResponse";
import { pool } from "../database/mysql";
import { getNotificacaoService } from "./notificacao.service";
import { getAuditoriaService } from "./auditoria.service";
import { getProvaAgendadaRecomendacaoService } from "./provaagendadarecomendacao.service";

const DATA_VALIDACAO_TOLERANCIA_MS = 60 * 1000;

/**
 * DTO para retorno de prova com turmas atribuídas (N:N normalizado)
 */
export interface TurmaResumoDTO {
  TurmaGUID: string;
  TurmaNome: string;
  TurmaSerie: string;
}

export interface ProvaAgendadaDTO {
  ProvaAgendadaGUID: string;
  MateriaGUID: string;
  ProvaData: string;
  ProvaDescricao: string | null;
  ProvaStatus: "Agendada" | "Realizada" | "Cancelada";
  TurmasAtribuidas: string[]; // Array de TurmaGUID
  /** Mesmas turmas de TurmasAtribuidas, mas com nome/série — usado pra "excluir desta turma vs. todas as turmas". */
  TurmasAtribuidasDetalhe: TurmaResumoDTO[];
  /** Data específica por turma (agendamento automático); só contém entradas para turmas com override. */
  DatasPorTurma: Record<string, string>;
  /** Assunto(s) travado(s) manualmente pelo professor (spec item 3) — vazio se a IA que classifica. */
  AssuntoGUIDs: string[];
  /** Capítulo de MaterialDidatico referenciado (spec item 9) — null se nenhum. */
  MaterialDidaticoCapituloGUID: string | null;
  CreatedAt: string | null;
  UpdatedAt: string | null;
}

export interface ProvaAgendadaCreateDTO {
  TurmasGUID: string[]; // Array de turmas para atribuir
  MateriaGUID: string;
  ProvaData: Date;
  ProvaDescricao?: string;
  anexosDescricao?: string[];
  /** Agendamento automático: data específica por turma (TurmaGUID -> data). Sobrescreve ProvaData para a turma correspondente. */
  DatasPorTurma?: Record<string, Date>;
  /** Categoria (por turma) escolhida pra cada linha de distribuição — chave é TurmaGUID. */
  CategoriasPorTurma?: Record<string, string>;
  /** Travamento manual do assunto (spec item 3) — opcional; sem isso, a IA classifica sozinha. */
  AssuntoGUIDs?: string[];
  /** Capítulo de MaterialDidatico referenciado (spec item 9) — opcional. */
  MaterialDidaticoCapituloGUID?: string | null;
}

export interface ProvaAgendadaUpdateDTO {
  ProvaData?: Date;
  ProvaDescricao?: string;
  ProvaStatus?: "Agendada" | "Realizada" | "Cancelada";
  AssuntoGUIDs?: string[];
  MaterialDidaticoCapituloGUID?: string | null;
}

/**
 * Service para lógica de negócio de ProvaAgendada (REFATORADO - N:N NORMALIZADO)
 *
 * Modelo anterior (desnormalizado):
 * - 1 prova para 5 turmas = 5 registros COM DADOS DUPLICADOS
 *
 * Modelo atual (normalizado):
 * - 1 prova para 5 turmas = 1 registro + 5 atribuições
 *
 * Regras principais:
 * - Usuário autenticado pode criar/editar/excluir prova
 * - Data da prova não pode ser no passado ao criar/atualizar
 * - Anexos vinculados são apenas descritivos
 * - Uma prova é criada UMA VEZ e compartilhada por N turmas
 */
export default class ProvaAgendadaService {
  #provaDAO: ProvaAgendadaDAO;
  #provaTurmaDAO: ProvaAgendadaTurmaDAO;
  #anexoDAO: AnexoDAO;
  #turmaDAO: TurmaDAO;
  #materiaDAO: MateriaDAO;
  #categoriaDAO: CategoriaConteudoDAO;
  #visualizacaoDAO: ProvaAgendadaVisualizacaoDAO;
  #matriculaDAO: MatriculaDAO;
  #alocacaoDAO: MaterialProfessorTurmaDAO;
  #provaAssuntoDAO: ProvaAgendadaAssuntoDAO;
  #assuntoDAO: AssuntoDAO;
  #materialDidaticoCapituloDAO: MaterialDidaticoCapituloDAO;

  constructor(
    provaDAODependency: ProvaAgendadaDAO,
    provaTurmaDAODependency: ProvaAgendadaTurmaDAO,
    anexoDAODependency: AnexoDAO,
    turmaDAODependency: TurmaDAO,
    materiaDAODependency: MateriaDAO,
    categoriaDAODependency: CategoriaConteudoDAO,
    visualizacaoDAODependency: ProvaAgendadaVisualizacaoDAO,
    matriculaDAODependency: MatriculaDAO,
    alocacaoDAODependency: MaterialProfessorTurmaDAO,
    provaAssuntoDAODependency: ProvaAgendadaAssuntoDAO,
    assuntoDAODependency: AssuntoDAO,
    materialDidaticoCapituloDAODependency: MaterialDidaticoCapituloDAO
  ) {
    console.log("⬆️  ProvaAgendadaService.constructor()");
    this.#provaDAO = provaDAODependency;
    this.#provaTurmaDAO = provaTurmaDAODependency;
    this.#anexoDAO = anexoDAODependency;
    this.#turmaDAO = turmaDAODependency;
    this.#materiaDAO = materiaDAODependency;
    this.#categoriaDAO = categoriaDAODependency;
    this.#visualizacaoDAO = visualizacaoDAODependency;
    this.#matriculaDAO = matriculaDAODependency;
    this.#alocacaoDAO = alocacaoDAODependency;
    this.#provaAssuntoDAO = provaAssuntoDAODependency;
    this.#assuntoDAO = assuntoDAODependency;
    this.#materialDidaticoCapituloDAO = materialDidaticoCapituloDAODependency;
  }

  /** Valida que o capítulo existe e pertence à MESMA matéria da prova (guardrail §7: nunca texto livre de página). */
  #validarCapitulo = async (materiaGUID: string, materialDidaticoCapituloGUID: string): Promise<void> => {
    const capitulo = await this.#materialDidaticoCapituloDAO.findById(materialDidaticoCapituloGUID);
    if (!capitulo || capitulo.MateriaGUID !== materiaGUID) {
      throw new ErrorResponse(400, "Capítulo inválido", {
        message: "O capítulo de material didático informado não existe ou não pertence a esta matéria.",
      });
    }
  };

  /** Valida que cada AssuntoGUID existe e pertence à MESMA matéria da prova. */
  #validarAssuntos = async (materiaGUID: string, assuntoGUIDs: string[]): Promise<void> => {
    for (const assuntoGUID of assuntoGUIDs) {
      const assunto = await this.#assuntoDAO.findById(assuntoGUID);
      if (!assunto || assunto.MateriaGUID !== materiaGUID) {
        throw new ErrorResponse(400, "Assunto inválido", {
          message: `O assunto ${assuntoGUID} não existe ou não pertence a esta matéria.`,
        });
      }
    }
  };

  /**
   * Confirma que usuarioCPF é professor ativamente alocado na matéria da
   * prova — ProvaAgendada não tem UsuarioCPF próprio (é por MateriaGUID,
   * compartilhada entre turmas), então ownership é resolvido via alocação.
   */
  #validarProfessorResponsavel = async (materiaGUID: string, usuarioCPF: string): Promise<void> => {
    const alocacoes = await this.#alocacaoDAO.findByProfessor(usuarioCPF);
    const alocado = alocacoes.some(
      (a) => a.MateriaGUID === materiaGUID && a.AlocacaoStatus === "Ativa"
    );
    if (!alocado) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Só um professor ativamente alocado nesta matéria pode alterar/excluir esta prova.",
      });
    }
  };

  /**
   * Aluno abre/visualiza uma prova — marca 100% instantâneo, igual conteúdo
   * tipo texto. Sem relação nenhuma com nota (fora de escopo desta fase).
   */
  registrarVisualizacao = async (provaAgendadaTurmaGUID: string, usuarioCPF: string): Promise<void> => {
    console.log("🟣 ProvaAgendadaService.registrarVisualizacao()");

    const matricula = await this.#matriculaDAO.findMatriculaAtivaByUsuario(usuarioCPF);
    if (!matricula) {
      throw new ErrorResponse(404, "Matrícula não encontrada", {
        message: "Usuário não possui matrícula ativa.",
      });
    }

    const visualizacao = new ProvaAgendadaVisualizacao();
    visualizacao.ProvaAgendadaVisualizacaoGUID = uuidv4();
    visualizacao.ProvaAgendadaTurmaGUID = provaAgendadaTurmaGUID;
    visualizacao.MatriculaGUID = matricula.MatriculaGUID;

    await this.#visualizacaoDAO.registrar(visualizacao);
  };

  /**
   * Cria uma prova UMA VEZ e atribui a N turmas
   */
  criarProva = async (
    data: ProvaAgendadaCreateDTO,
    usuarioCPF?: string
  ): Promise<ProvaAgendadaDTO> => {
    console.log("🟣 ProvaAgendadaService.criarProva()");

    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para criar uma prova.",
      });
    }

    if (!data.TurmasGUID || data.TurmasGUID.length === 0) {
      throw new ErrorResponse(400, "Nenhuma turma selecionada", {
        message: "É necessário selecionar pelo menos uma turma para criar a prova.",
      });
    }

    // Validar todas as turmas existem
    let escolaGUID: string | null = null;
    for (const turmaGUID of data.TurmasGUID) {
      const turma = await this.#turmaDAO.findById(turmaGUID);
      if (!turma) {
        throw new ErrorResponse(404, "Turma não encontrada", {
          message: `Não existe turma com id ${turmaGUID}`,
        });
      }
      if (!escolaGUID) {
        escolaGUID = turma.EscolaGUID;
      }
    }

    const materia = await this.#materiaDAO.findById(data.MateriaGUID);
    if (!materia) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${data.MateriaGUID}`,
      });
    }

    // Validar categorias por turma (se fornecidas) — cada uma deve pertencer
    // a este professor + matéria + à MESMA turma daquela linha de distribuição
    if (data.CategoriasPorTurma) {
      for (const [turmaGUID, categoriaGUID] of Object.entries(data.CategoriasPorTurma)) {
        const categoria = await this.#categoriaDAO.findById(categoriaGUID);
        if (
          !categoria ||
          categoria.UsuarioCPF !== usuarioCPF ||
          categoria.MateriaGUID !== data.MateriaGUID ||
          categoria.TurmaGUID !== turmaGUID
        ) {
          throw new ErrorResponse(400, "Categoria inválida", {
            message: `A categoria informada para a turma ${turmaGUID} não existe ou não pertence a você/esta matéria/turma.`,
          });
        }
      }
    }

    // Validar assunto(s) travado(s) manualmente (spec item 3), se fornecidos
    if (data.AssuntoGUIDs && data.AssuntoGUIDs.length > 0) {
      await this.#validarAssuntos(data.MateriaGUID, data.AssuntoGUIDs);
    }

    // Validar capítulo de material didático referenciado (spec item 9), se fornecido
    if (data.MaterialDidaticoCapituloGUID) {
      await this.#validarCapitulo(data.MateriaGUID, data.MaterialDidaticoCapituloGUID);
    }

    const agoraComTolerancia = new Date(Date.now() - DATA_VALIDACAO_TOLERANCIA_MS);

    // Validar datas por turma (agendamento automático), se fornecidas
    if (data.DatasPorTurma) {
      for (const [turmaGUID, dataTurma] of Object.entries(data.DatasPorTurma)) {
        const dataConvertida = new Date(dataTurma);
        if (isNaN(dataConvertida.getTime()) || dataConvertida < agoraComTolerancia) {
          throw new ErrorResponse(400, "Data da prova inválida", {
            message: `A data calculada para a turma ${turmaGUID} não pode ser no passado.`,
          });
        }
      }
    }

    // Data "base" da prova: se houver datas por turma, usa a mais antiga entre
    // elas como referência compartilhada; senão, usa a data informada manualmente.
    const dataProva = data.DatasPorTurma && Object.keys(data.DatasPorTurma).length > 0
      ? new Date(Math.min(...Object.values(data.DatasPorTurma).map((d) => new Date(d).getTime())))
      : new Date(data.ProvaData);

    if (isNaN(dataProva.getTime()) || dataProva < agoraComTolerancia) {
      throw new ErrorResponse(400, "Data da prova inválida", {
        message: "A data da prova não pode ser no passado.",
      });
    }

    // 1. Criar prova ÚNICA (dados compartilhados)
    const prova = new ProvaAgendada();
    prova.ProvaAgendadaGUID = uuidv4();
    prova.MateriaGUID = data.MateriaGUID;
    prova.ProvaData = dataProva;
    prova.ProvaDescricao = data.ProvaDescricao ? data.ProvaDescricao.trim() : null;
    prova.ProvaStatus = "Agendada";
    prova.MaterialDidaticoCapituloGUID = data.MaterialDidaticoCapituloGUID ?? null;

    const provaCriada = await this.#provaDAO.create(prova);

    // 2. Criar atribuições para N turmas (com data específica quando houver override)
    const atribuicoes: ProvaAgendadaTurma[] = [];
    for (const turmaGUID of data.TurmasGUID) {
      const atribuicao = new ProvaAgendadaTurma();
      atribuicao.ProvaAgendadaTurmaGUID = uuidv4();
      atribuicao.ProvaAgendadaGUID = provaCriada.ProvaAgendadaGUID;
      atribuicao.TurmaGUID = turmaGUID;
      atribuicao.ProvaDataTurma = data.DatasPorTurma?.[turmaGUID]
        ? new Date(data.DatasPorTurma[turmaGUID])
        : null;
      atribuicao.CategoriaGUID = data.CategoriasPorTurma?.[turmaGUID] || null;
      atribuicoes.push(atribuicao);
    }

    await this.#provaTurmaDAO.createBatch(atribuicoes);

    if (data.AssuntoGUIDs && data.AssuntoGUIDs.length > 0) {
      await this.#provaAssuntoDAO.substituir(provaCriada.ProvaAgendadaGUID, data.AssuntoGUIDs);
    }

    // 3. Vincular anexos (se houver)
    if (data.anexosDescricao && data.anexosDescricao.length > 0) {
      for (const anexoGUID of data.anexosDescricao) {
        const anexo = await this.#anexoDAO.findById(anexoGUID);
        if (anexo) {
          await this.#provaDAO.vincularAnexo(provaCriada.ProvaAgendadaGUID, anexoGUID);
        }
      }
    }

    if (escolaGUID) {
      this.#notificarProvaPostada(provaCriada, data.TurmasGUID, escolaGUID).catch((error) => {
        console.error("🔴 ProvaAgendadaService.#notificarProvaPostada() falhou:", error);
      });

      void getAuditoriaService().registrar({
        EscolaGUID: escolaGUID,
        UsuarioCPFAtor: usuarioCPF,
        AcaoTipo: "Create",
        EntidadeTipo: "provaagendada",
        EntidadeGUID: provaCriada.ProvaAgendadaGUID,
        EntidadeDescricao: provaCriada.ProvaDescricao,
        CategoriaAuditoriaId: 2,
      });
    }

    // Recomendação de estudo por IA (spec item 20): gerada uma vez, na
    // criação, compartilhada por todas as turmas — fire-and-forget, nunca
    // atrasa a resposta de criação da prova (guardrail §7 do plano).
    void getProvaAgendadaRecomendacaoService()
      .gerarRecomendacao(provaCriada.ProvaAgendadaGUID)
      .catch((error) => {
        console.error("🔴 ProvaAgendadaService: geração de recomendação de estudo falhou:", error);
      });

    return this.toDTO(provaCriada, atribuicoes);
  };

  /** Notifica os alunos matriculados nas turmas atribuídas (tipo `prova_postada`) */
  #notificarProvaPostada = async (prova: ProvaAgendada, turmasGUID: string[], escolaGUID: string): Promise<void> => {
    const placeholders = turmasGUID.map(() => "?").join(", ");
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT UsuarioCPF FROM matricula WHERE TurmaGUID IN (${placeholders}) AND MatriculaStatus = 'Ativa'`,
      turmasGUID
    );
    const destinatarios = (rows as any[]).map((r) => r.UsuarioCPF);
    if (destinatarios.length === 0) return;

    await getNotificacaoService().disparar({
      tipoSlug: "prova_postada",
      destinatarios,
      escolaGUID,
      titulo: "Nova prova agendada",
      conteudo: prova.ProvaDescricao,
      entidadeTipo: "prova",
      entidadeGUID: prova.ProvaAgendadaGUID,
      link: `/dashboard/${escolaGUID}/calendario`,
    });
  };

  /**
   * Lista provas com turmas atribuídas
   */
  listarProvas = async (filters?: ProvaAgendadaFilters): Promise<ProvaAgendadaDTO[]> => {
    console.log("🟣 ProvaAgendadaService.listarProvas()");

    const provas = await this.#provaDAO.findAll(filters);

    // Buscar turmas atribuídas para cada prova
    const provasComTurmas = await Promise.all(
      provas.map(async (prova) => {
        const atribuicoes = await this.#provaTurmaDAO.findByProva(prova.ProvaAgendadaGUID);
        return this.toDTO(prova, atribuicoes);
      })
    );

    return provasComTurmas;
  };

  /**
   * Busca prova com turmas atribuídas
   */
  buscarProva = async (ProvaAgendadaGUID: string): Promise<ProvaAgendadaDTO> => {
    console.log("🟣 ProvaAgendadaService.buscarProva()");

    const prova = await this.#provaDAO.findById(ProvaAgendadaGUID);

    if (!prova) {
      throw new ErrorResponse(404, "Prova não encontrada", {
        message: `Não existe prova com id ${ProvaAgendadaGUID}`,
      });
    }

    const atribuicoes = await this.#provaTurmaDAO.findByProva(ProvaAgendadaGUID);

    return this.toDTO(prova, atribuicoes);
  };

  /**
   * Atualiza dados compartilhados da prova (afeta TODAS as turmas)
   */
  atualizarProva = async (
    ProvaAgendadaGUID: string,
    data: ProvaAgendadaUpdateDTO,
    usuarioCPF?: string
  ): Promise<ProvaAgendadaDTO> => {
    console.log("🟣 ProvaAgendadaService.atualizarProva()");

    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para atualizar uma prova.",
      });
    }

    const prova = await this.#provaDAO.findById(ProvaAgendadaGUID);
    if (!prova) {
      throw new ErrorResponse(404, "Prova não encontrada", {
        message: `Não existe prova com id ${ProvaAgendadaGUID}`,
      });
    }

    await this.#validarProfessorResponsavel(prova.MateriaGUID, usuarioCPF);

    const updates: Partial<
      Pick<ProvaAgendada, "ProvaData" | "ProvaDescricao" | "ProvaStatus" | "MaterialDidaticoCapituloGUID">
    > = {};

    if (data.ProvaData !== undefined) {
      const dataProva = new Date(data.ProvaData);
      const agoraComTolerancia = new Date(Date.now() - DATA_VALIDACAO_TOLERANCIA_MS);
      if (isNaN(dataProva.getTime()) || dataProva < agoraComTolerancia) {
        throw new ErrorResponse(400, "Data da prova inválida", {
          message: "A nova data da prova não pode ser no passado.",
        });
      }
      updates.ProvaData = dataProva;
    }
    if (data.ProvaDescricao !== undefined) updates.ProvaDescricao = data.ProvaDescricao?.trim() ?? null;
    if (data.ProvaStatus !== undefined) updates.ProvaStatus = data.ProvaStatus;
    if (data.MaterialDidaticoCapituloGUID !== undefined) {
      if (data.MaterialDidaticoCapituloGUID) {
        await this.#validarCapitulo(prova.MateriaGUID, data.MaterialDidaticoCapituloGUID);
      }
      updates.MaterialDidaticoCapituloGUID = data.MaterialDidaticoCapituloGUID;
    }

    const descricaoMudou =
      updates.ProvaDescricao !== undefined && updates.ProvaDescricao !== prova.ProvaDescricao;
    const capituloMudou =
      updates.MaterialDidaticoCapituloGUID !== undefined &&
      updates.MaterialDidaticoCapituloGUID !== prova.MaterialDidaticoCapituloGUID;

    let assuntoMudou = false;
    if (data.AssuntoGUIDs !== undefined) {
      if (data.AssuntoGUIDs.length > 0) {
        await this.#validarAssuntos(prova.MateriaGUID, data.AssuntoGUIDs);
      }
      const assuntosAtuais = new Set(await this.#provaAssuntoDAO.findByProva(ProvaAgendadaGUID));
      const assuntosNovos = new Set(data.AssuntoGUIDs);
      assuntoMudou =
        assuntosAtuais.size !== assuntosNovos.size ||
        [...assuntosNovos].some((guid) => !assuntosAtuais.has(guid));

      await this.#provaAssuntoDAO.substituir(ProvaAgendadaGUID, data.AssuntoGUIDs);
    }

    const provaAtualizada = await this.#provaDAO.update(ProvaAgendadaGUID, updates);

    if (!provaAtualizada) {
      throw new ErrorResponse(404, "Prova não encontrada após atualização", {
        message: `Não foi possível buscar a prova ${ProvaAgendadaGUID} após atualização.`,
      });
    }

    // Buscar turmas atribuídas
    const atribuicoes = await this.#provaTurmaDAO.findByProva(ProvaAgendadaGUID);

    if (atribuicoes.length > 0) {
      const turmaRef = await this.#turmaDAO.findById(atribuicoes[0].TurmaGUID);
      if (turmaRef) {
        void getAuditoriaService().registrar({
          EscolaGUID: turmaRef.EscolaGUID,
          UsuarioCPFAtor: usuarioCPF,
          AcaoTipo: "Update",
          EntidadeTipo: "provaagendada",
          EntidadeGUID: provaAtualizada.ProvaAgendadaGUID,
          EntidadeDescricao: provaAtualizada.ProvaDescricao,
          CategoriaAuditoriaId: 2,
        });
      }
    }

    // Regeneração automática (spec item 21): só quando algo que alimenta o
    // contexto da IA realmente mudou — ProvaDescricao, assunto travado
    // manualmente ou capítulo de material didático referenciado (o sinal
    // de categoria muda via ProvaAgendadaTurma, fora deste método).
    // Continua uma recomendação por prova, nunca por turma.
    if (descricaoMudou || assuntoMudou || capituloMudou) {
      void getProvaAgendadaRecomendacaoService()
        .gerarRecomendacao(provaAtualizada.ProvaAgendadaGUID)
        .catch((error) => {
          console.error("🔴 ProvaAgendadaService: regeneração de recomendação de estudo falhou:", error);
        });
    }

    return this.toDTO(provaAtualizada, atribuicoes);
  };

  /**
   * Exclui prova (cascata: deleta atribuições automaticamente)
   */
  excluirProva = async (ProvaAgendadaGUID: string, usuarioCPF?: string): Promise<boolean> => {
    console.log("🟣 ProvaAgendadaService.excluirProva()");

    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para excluir uma prova.",
      });
    }

    const prova = await this.#provaDAO.findById(ProvaAgendadaGUID);
    if (!prova) {
      throw new ErrorResponse(404, "Prova não encontrada", {
        message: `Não existe prova com id ${ProvaAgendadaGUID}`,
      });
    }

    await this.#validarProfessorResponsavel(prova.MateriaGUID, usuarioCPF);

    // Resolver EscolaGUID antes de excluir (CASCADE apaga as atribuições junto)
    const atribuicoesParaAuditoria = await this.#provaTurmaDAO.findByProva(ProvaAgendadaGUID);
    let escolaGUIDParaAuditoria: string | null = null;
    if (atribuicoesParaAuditoria.length > 0) {
      const turmaRef = await this.#turmaDAO.findById(atribuicoesParaAuditoria[0].TurmaGUID);
      escolaGUIDParaAuditoria = turmaRef?.EscolaGUID ?? null;
    }

    // Deleta prova (CASCADE deleta atribuições automaticamente)
    const excluida = await this.#provaDAO.delete(ProvaAgendadaGUID);

    if (excluida && escolaGUIDParaAuditoria) {
      void getAuditoriaService().registrar({
        EscolaGUID: escolaGUIDParaAuditoria,
        UsuarioCPFAtor: usuarioCPF,
        AcaoTipo: "Delete",
        EntidadeTipo: "provaagendada",
        EntidadeGUID: prova.ProvaAgendadaGUID,
        EntidadeDescricao: prova.ProvaDescricao,
        CategoriaAuditoriaId: 2,
      });
    }

    return excluida;
  };

  /**
   * Excluir prova de UMA turma só (mantém as demais) — se for a última turma
   * restante, cai pra exclusão completa (reaproveita excluirProva, incluindo
   * auditoria e cascade das subtabelas).
   */
  removerProvaDeTurma = async (
    ProvaAgendadaGUID: string,
    turmaGUID: string,
    usuarioCPF?: string
  ): Promise<{ provaExcluidaPorCompleto: boolean }> => {
    console.log("🟣 ProvaAgendadaService.removerProvaDeTurma()");

    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para excluir uma prova.",
      });
    }

    const prova = await this.#provaDAO.findById(ProvaAgendadaGUID);
    if (!prova) {
      throw new ErrorResponse(404, "Prova não encontrada", {
        message: `Não existe prova com id ${ProvaAgendadaGUID}`,
      });
    }

    await this.#validarProfessorResponsavel(prova.MateriaGUID, usuarioCPF);

    const atribuicoes = await this.#provaTurmaDAO.findByProva(ProvaAgendadaGUID);
    const atribuicaoDaTurma = atribuicoes.find((a) => a.TurmaGUID === turmaGUID);
    if (!atribuicaoDaTurma) {
      throw new ErrorResponse(404, "Vínculo não encontrado", {
        message: "Esta prova não está agendada para esta turma.",
      });
    }

    if (atribuicoes.length === 1) {
      await this.excluirProva(ProvaAgendadaGUID, usuarioCPF);
      return { provaExcluidaPorCompleto: true };
    }

    const turma = await this.#turmaDAO.findById(turmaGUID);
    await this.#provaTurmaDAO.delete(atribuicaoDaTurma.ProvaAgendadaTurmaGUID);

    if (turma) {
      void getAuditoriaService().registrar({
        EscolaGUID: turma.EscolaGUID,
        UsuarioCPFAtor: usuarioCPF,
        AcaoTipo: "Delete",
        EntidadeTipo: "provaagendada",
        EntidadeGUID: ProvaAgendadaGUID,
        EntidadeDescricao: `${prova.ProvaDescricao ?? 'Prova'} — removida da turma ${turma.TurmaSerie} ${turma.TurmaNome}`,
        CategoriaAuditoriaId: 2,
      });
    }

    return { provaExcluidaPorCompleto: false };
  };

  /**
   * Converte ProvaAgendada (classe) para ProvaAgendadaDTO (interface JSON)
   */
  private toDTO = async (prova: ProvaAgendada, atribuicoes: ProvaAgendadaTurma[]): Promise<ProvaAgendadaDTO> => {
    const datasPorTurma: Record<string, string> = {};
    atribuicoes.forEach((a) => {
      if (a.ProvaDataTurma) {
        datasPorTurma[a.TurmaGUID] = a.ProvaDataTurma.toISOString();
      }
    });

    const turmas = await Promise.all(atribuicoes.map((a) => this.#turmaDAO.findById(a.TurmaGUID)));
    const turmasAtribuidasDetalhe: TurmaResumoDTO[] = turmas
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .map((t) => ({ TurmaGUID: t.TurmaGUID, TurmaNome: t.TurmaNome, TurmaSerie: t.TurmaSerie }));

    const assuntoGUIDs = await this.#provaAssuntoDAO.findByProva(prova.ProvaAgendadaGUID);

    return {
      ProvaAgendadaGUID: prova.ProvaAgendadaGUID,
      MateriaGUID: prova.MateriaGUID,
      ProvaData: prova.ProvaData.toISOString(),
      ProvaDescricao: prova.ProvaDescricao,
      ProvaStatus: prova.ProvaStatus,
      TurmasAtribuidas: atribuicoes.map((a) => a.TurmaGUID),
      TurmasAtribuidasDetalhe: turmasAtribuidasDetalhe,
      DatasPorTurma: datasPorTurma,
      AssuntoGUIDs: assuntoGUIDs,
      MaterialDidaticoCapituloGUID: prova.MaterialDidaticoCapituloGUID,
      CreatedAt: prova.CreatedAt ? prova.CreatedAt.toISOString() : null,
      UpdatedAt: prova.UpdatedAt ? prova.UpdatedAt.toISOString() : null,
    };
  };
}
