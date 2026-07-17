import { v4 as uuidv4 } from "uuid";
import ProvaAgendada from "../entities/provaagendada.model";
import ProvaAgendadaTurma from "../entities/provaagendada-turma.model";
import { ProvaAgendadaDAO, ProvaAgendadaFilters } from "../repositories/provaagendada.repository";
import ProvaAgendadaTurmaDAO from "../repositories/provaagendada-turma.repository";
import { AnexoDAO } from "../repositories/anexo.repository";
import { TurmaDAO } from "../repositories/turma.repository";
import { MateriaDAO } from "../repositories/materia.repository";
import ErrorResponse from "../utils/ErrorResponse";

const DATA_VALIDACAO_TOLERANCIA_MS = 60 * 1000;

/**
 * DTO para retorno de prova com turmas atribuídas (N:N normalizado)
 */
export interface ProvaAgendadaDTO {
  ProvaAgendadaGUID: string;
  MateriaGUID: string;
  ProvaData: string;
  ProvaDescricao: string | null;
  ProvaStatus: "Agendada" | "Realizada" | "Cancelada";
  TurmasAtribuidas: string[]; // Array de TurmaGUID
  /** Data específica por turma (agendamento automático); só contém entradas para turmas com override. */
  DatasPorTurma: Record<string, string>;
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
}

export interface ProvaAgendadaUpdateDTO {
  ProvaData?: Date;
  ProvaDescricao?: string;
  ProvaStatus?: "Agendada" | "Realizada" | "Cancelada";
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

  constructor(
    provaDAODependency: ProvaAgendadaDAO,
    provaTurmaDAODependency: ProvaAgendadaTurmaDAO,
    anexoDAODependency: AnexoDAO,
    turmaDAODependency: TurmaDAO,
    materiaDAODependency: MateriaDAO
  ) {
    console.log("⬆️  ProvaAgendadaService.constructor()");
    this.#provaDAO = provaDAODependency;
    this.#provaTurmaDAO = provaTurmaDAODependency;
    this.#anexoDAO = anexoDAODependency;
    this.#turmaDAO = turmaDAODependency;
    this.#materiaDAO = materiaDAODependency;
  }

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
    for (const turmaGUID of data.TurmasGUID) {
      const turma = await this.#turmaDAO.findById(turmaGUID);
      if (!turma) {
        throw new ErrorResponse(404, "Turma não encontrada", {
          message: `Não existe turma com id ${turmaGUID}`,
        });
      }
    }

    const materia = await this.#materiaDAO.findById(data.MateriaGUID);
    if (!materia) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${data.MateriaGUID}`,
      });
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
      atribuicoes.push(atribuicao);
    }

    await this.#provaTurmaDAO.createBatch(atribuicoes);

    // 3. Vincular anexos (se houver)
    if (data.anexosDescricao && data.anexosDescricao.length > 0) {
      for (const anexoGUID of data.anexosDescricao) {
        const anexo = await this.#anexoDAO.findById(anexoGUID);
        if (anexo) {
          await this.#provaDAO.vincularAnexo(provaCriada.ProvaAgendadaGUID, anexoGUID);
        }
      }
    }

    return this.toDTO(provaCriada, atribuicoes);
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

    const updates: Partial<Pick<ProvaAgendada, "ProvaData" | "ProvaDescricao" | "ProvaStatus">> =
      {};

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

    const provaAtualizada = await this.#provaDAO.update(ProvaAgendadaGUID, updates);

    if (!provaAtualizada) {
      throw new ErrorResponse(404, "Prova não encontrada após atualização", {
        message: `Não foi possível buscar a prova ${ProvaAgendadaGUID} após atualização.`,
      });
    }

    // Buscar turmas atribuídas
    const atribuicoes = await this.#provaTurmaDAO.findByProva(ProvaAgendadaGUID);

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

    // Deleta prova (CASCADE deleta atribuições automaticamente)
    return await this.#provaDAO.delete(ProvaAgendadaGUID);
  };

  /**
   * Converte ProvaAgendada (classe) para ProvaAgendadaDTO (interface JSON)
   */
  private toDTO(prova: ProvaAgendada, atribuicoes: ProvaAgendadaTurma[]): ProvaAgendadaDTO {
    const datasPorTurma: Record<string, string> = {};
    atribuicoes.forEach((a) => {
      if (a.ProvaDataTurma) {
        datasPorTurma[a.TurmaGUID] = a.ProvaDataTurma.toISOString();
      }
    });

    return {
      ProvaAgendadaGUID: prova.ProvaAgendadaGUID,
      MateriaGUID: prova.MateriaGUID,
      ProvaData: prova.ProvaData.toISOString(),
      ProvaDescricao: prova.ProvaDescricao,
      ProvaStatus: prova.ProvaStatus,
      TurmasAtribuidas: atribuicoes.map((a) => a.TurmaGUID),
      DatasPorTurma: datasPorTurma,
      CreatedAt: prova.CreatedAt ? prova.CreatedAt.toISOString() : null,
      UpdatedAt: prova.UpdatedAt ? prova.UpdatedAt.toISOString() : null,
    };
  }
}
