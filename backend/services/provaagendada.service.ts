import { v4 as uuidv4 } from "uuid";
import ProvaAgendada from "../entities/provaagendada.model";
import { ProvaAgendadaDAO, ProvaAgendadaFilters } from "../repositories/provaagendada.repository";
import { AnexoDAO } from "../repositories/anexo.repository";
import { TurmaDAO } from "../repositories/turma.repository";
import { MateriaDAO } from "../repositories/materia.repository";
import ErrorResponse from "../utils/ErrorResponse";

export interface ProvaAgendadaDTO {
  ProvaAgendadaGUID: string;
  TurmaGUID: string;
  MateriaGUID: string;
  ProvaData: string;
  ProvaDescricao: string | null;
  ProvaStatus: "Agendada" | "Realizada" | "Cancelada";
  CreatedAt: string | null;
  UpdatedAt: string | null;
}

export interface ProvaAgendadaCreateDTO {
  TurmaGUID: string;
  MateriaGUID: string;
  ProvaData: Date;
  ProvaDescricao?: string;
  anexosDescricao?: string[];
}

export interface ProvaAgendadaUpdateDTO {
  ProvaData?: Date;
  ProvaDescricao?: string;
  ProvaStatus?: "Agendada" | "Realizada" | "Cancelada";
}

/**
 * Service para lógica de negócio de ProvaAgendada
 *
 * Regras principais:
 * - Usuário autenticado pode criar/editar/excluir prova
 * - Data da prova não pode ser no passado ao criar/atualizar
 * - Anexos vinculados são apenas descritivos
 */
export default class ProvaAgendadaService {
  #provaDAO: ProvaAgendadaDAO;
  #anexoDAO: AnexoDAO;
  #turmaDAO: TurmaDAO;
  #materiaDAO: MateriaDAO;

  constructor(
    provaDAODependency: ProvaAgendadaDAO,
    anexoDAODependency: AnexoDAO,
    turmaDAODependency: TurmaDAO,
    materiaDAODependency: MateriaDAO
  ) {
    console.log("⬆️  ProvaAgendadaService.constructor()");
    this.#provaDAO = provaDAODependency;
    this.#anexoDAO = anexoDAODependency;
    this.#turmaDAO = turmaDAODependency;
    this.#materiaDAO = materiaDAODependency;
  }

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

    const turma = await this.#turmaDAO.findById(data.TurmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, "Turma não encontrada", {
        message: `Não existe turma com id ${data.TurmaGUID}`,
      });
    }

    const materia = await this.#materiaDAO.findById(data.MateriaGUID);
    if (!materia) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${data.MateriaGUID}`,
      });
    }

    const dataProva = new Date(data.ProvaData);
    const agoraComTolerancia = new Date(Date.now() - 60 * 1000);
    if (isNaN(dataProva.getTime()) || dataProva < agoraComTolerancia) {
      throw new ErrorResponse(400, "Data da prova inválida", {
        message: "A data da prova não pode ser no passado.",
      });
    }

    const prova = new ProvaAgendada();
    prova.ProvaAgendadaGUID = uuidv4();
    prova.TurmaGUID = data.TurmaGUID;
    prova.MateriaGUID = data.MateriaGUID;
    prova.ProvaData = dataProva;
    prova.ProvaDescricao = data.ProvaDescricao ? data.ProvaDescricao.trim() : null;
    prova.ProvaStatus = "Agendada";

    const provaCriada = await this.#provaDAO.create(prova);

    if (data.anexosDescricao && data.anexosDescricao.length > 0) {
      for (const anexoGUID of data.anexosDescricao) {
        const anexo = await this.#anexoDAO.findById(anexoGUID);
        if (anexo) {
          await this.#provaDAO.vincularAnexo(provaCriada.ProvaAgendadaGUID, anexoGUID);
        }
      }
    }

    return this.toDTO(provaCriada);
  };

  listarProvas = async (filters?: ProvaAgendadaFilters): Promise<ProvaAgendadaDTO[]> => {
    console.log("🟣 ProvaAgendadaService.listarProvas()");

    const provas = await this.#provaDAO.findAll(filters);
    return provas.map((prova) => this.toDTO(prova));
  };

  buscarProva = async (ProvaAgendadaGUID: string): Promise<ProvaAgendadaDTO> => {
    console.log("🟣 ProvaAgendadaService.buscarProva()");

    const prova = await this.#provaDAO.findById(ProvaAgendadaGUID);

    if (!prova) {
      throw new ErrorResponse(404, "Prova não encontrada", {
        message: `Não existe prova com id ${ProvaAgendadaGUID}`,
      });
    }

    return this.toDTO(prova);
  };

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

    if (data.ProvaData !== undefined) {
      const dataProva = new Date(data.ProvaData);
      const agoraComTolerancia = new Date(Date.now() - 60 * 1000);
      if (isNaN(dataProva.getTime()) || dataProva < agoraComTolerancia) {
        throw new ErrorResponse(400, "Data da prova inválida", {
          message: "A nova data da prova não pode ser no passado.",
        });
      }
      data.ProvaData = dataProva;
    }

    const updates: Partial<Pick<ProvaAgendada, "ProvaData" | "ProvaDescricao" | "ProvaStatus">> =
      {};

    if (data.ProvaData !== undefined) updates.ProvaData = data.ProvaData;
    if (data.ProvaDescricao !== undefined) updates.ProvaDescricao = data.ProvaDescricao?.trim() ?? null;
    if (data.ProvaStatus !== undefined) updates.ProvaStatus = data.ProvaStatus;

    const provaAtualizada = await this.#provaDAO.update(ProvaAgendadaGUID, updates);

    if (!provaAtualizada) {
      throw new ErrorResponse(404, "Prova não encontrada após atualização", {
        message: `Não foi possível buscar a prova ${ProvaAgendadaGUID} após atualização.`,
      });
    }

    return this.toDTO(provaAtualizada);
  };

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

    return await this.#provaDAO.delete(ProvaAgendadaGUID);
  };

  /**
   * Converte ProvaAgendada (classe) para ProvaAgendadaDTO (interface JSON)
   */
  private toDTO(prova: ProvaAgendada): ProvaAgendadaDTO {
    return {
      ProvaAgendadaGUID: prova.ProvaAgendadaGUID,
      TurmaGUID: prova.TurmaGUID,
      MateriaGUID: prova.MateriaGUID,
      ProvaData: prova.ProvaData.toISOString(),
      ProvaDescricao: prova.ProvaDescricao,
      ProvaStatus: prova.ProvaStatus,
      CreatedAt: prova.CreatedAt ? prova.CreatedAt.toISOString() : null,
      UpdatedAt: prova.UpdatedAt ? prova.UpdatedAt.toISOString() : null,
    };
  }
}
