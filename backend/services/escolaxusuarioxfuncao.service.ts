import ErrorResponse from "../utils/ErrorResponse.js";
import EscolaxUsuarioxFuncao from "../entities/escolaxusuarioxfuncao.model.js";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";

export interface EscolaxUsuarioxFuncaoDTO {
  EscolaxUsuarioxFuncaoId: number;
  UsuarioCPF: string;
  EscolaGUID: string;
  FuncaoId: number;
  FuncaoNome: string | null;
  DataInicio: string | null; // ISO date YYYY-MM-DD
  DataFim: string | null; // ISO date YYYY-MM-DD
  Status: string; // "Ativo" | "Inativo" | "Finalizado"
  CreatedAt: string; // ISO timestamp
  UpdatedAt: string; // ISO timestamp
}

interface FindFiltersDTO {
  UsuarioCPF?: string;
  EscolaGUID?: string;
  FuncaoId?: number;
}

export default class EscolaxUsuarioxFuncaoService {
  #relacaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(relacaoDAODependency: EscolaxUsuarioxFuncaoDAO) {
    console.log("Service: EscolaxUsuarioxFuncaoService.constructor()");
    this.#relacaoDAO = relacaoDAODependency;
  }

  createRelacao = async (
    payload: Record<string, unknown>
  ): Promise<EscolaxUsuarioxFuncaoDTO> => {
    console.log("Service: EscolaxUsuarioxFuncaoService.createRelacao()");

    const usuarioCPF = payload.UsuarioCPF as string;
    const escolaGUID = payload.EscolaGUID as string;
    const funcaoId = Number(payload.FuncaoId);

    await this.validateReferences(usuarioCPF, escolaGUID, funcaoId);

    const duplicated = await this.#relacaoDAO.findByTripla(usuarioCPF, escolaGUID, funcaoId);
    if (duplicated) {
      throw new ErrorResponse(409, "Relacao ja existe", {
        message:
          "Ja existe um vinculo para este UsuarioCPF, EscolaGUID e FuncaoId.",
      });
    }

    const relacao = new EscolaxUsuarioxFuncao();
    relacao.UsuarioCPF = usuarioCPF;
    relacao.EscolaGUID = escolaGUID;
    relacao.FuncaoId = funcaoId;
    relacao.DataInicio = payload.DataInicio ? new Date(payload.DataInicio as string) : null;
    relacao.DataFim = payload.DataFim ? new Date(payload.DataFim as string) : null;
    relacao.Status = (payload.Status as "Ativo" | "Inativo" | "Finalizado") ?? "Ativo";

    const id = await this.#relacaoDAO.create(relacao);
    const created = await this.#relacaoDAO.findById(id);

    if (!created) {
      throw new ErrorResponse(500, "Erro ao criar relacao", {
        message: "Falha ao recuperar registro apos criacao.",
      });
    }

    return this.toDTO(created);
  };

  findAll = async (filters?: FindFiltersDTO): Promise<EscolaxUsuarioxFuncaoDTO[]> => {
    console.log("Service: EscolaxUsuarioxFuncaoService.findAll()");
    const relacoes = await this.#relacaoDAO.findAll(filters);
    return relacoes.map((item) => this.toDTO(item));
  };

  findById = async (EscolaxUsuarioxFuncaoId: number): Promise<EscolaxUsuarioxFuncaoDTO> => {
    console.log("Service: EscolaxUsuarioxFuncaoService.findById()");

    const relacao = await this.#relacaoDAO.findById(EscolaxUsuarioxFuncaoId);
    if (!relacao) {
      throw new ErrorResponse(404, "Relacao nao encontrada", {
        message: `Nao existe relacao com id ${EscolaxUsuarioxFuncaoId}`,
      });
    }

    return this.toDTO(relacao);
  };

  updateRelacao = async (
    EscolaxUsuarioxFuncaoId: number,
    payload: Record<string, unknown>
  ): Promise<EscolaxUsuarioxFuncaoDTO> => {
    console.log("Service: EscolaxUsuarioxFuncaoService.updateRelacao()");

    const existente = await this.#relacaoDAO.findById(EscolaxUsuarioxFuncaoId);
    if (!existente) {
      throw new ErrorResponse(404, "Relacao nao encontrada", {
        message: `Nao existe relacao com id ${EscolaxUsuarioxFuncaoId}`,
      });
    }

    const usuarioCPF =
      payload.UsuarioCPF !== undefined
        ? (payload.UsuarioCPF as string)
        : existente.UsuarioCPF;

    const escolaGUID =
      payload.EscolaGUID !== undefined
        ? (payload.EscolaGUID as string)
        : existente.EscolaGUID;

    const funcaoId =
      payload.FuncaoId !== undefined
        ? Number(payload.FuncaoId)
        : existente.FuncaoId;

    await this.validateReferences(usuarioCPF, escolaGUID, funcaoId);

    const duplicated = await this.#relacaoDAO.findByTripla(usuarioCPF, escolaGUID, funcaoId);
    if (
      duplicated &&
      duplicated.EscolaxUsuarioxFuncaoId !== EscolaxUsuarioxFuncaoId
    ) {
      throw new ErrorResponse(409, "Relacao ja existe", {
        message:
          "Ja existe um vinculo para este UsuarioCPF, EscolaGUID e FuncaoId.",
      });
    }

    const relacao = new EscolaxUsuarioxFuncao();
    relacao.EscolaxUsuarioxFuncaoId = EscolaxUsuarioxFuncaoId;
    relacao.UsuarioCPF = usuarioCPF;
    relacao.EscolaGUID = escolaGUID;
    relacao.FuncaoId = funcaoId;

    if (payload.DataInicio !== undefined) {
      relacao.DataInicio = payload.DataInicio ? new Date(payload.DataInicio as string) : null;
    } else {
      relacao.DataInicio = existente.DataInicio;
    }

    if (payload.DataFim !== undefined) {
      relacao.DataFim = payload.DataFim ? new Date(payload.DataFim as string) : null;
    } else {
      relacao.DataFim = existente.DataFim;
    }

    if (payload.Status !== undefined) {
      relacao.Status = payload.Status as "Ativo" | "Inativo" | "Finalizado";
    } else {
      relacao.Status = existente.Status;
    }

    const updated = await this.#relacaoDAO.update(relacao);
    if (!updated) {
      throw new ErrorResponse(500, "Erro ao atualizar relacao", {
        message: "Nao foi possivel atualizar o registro.",
      });
    }

    const refreshed = await this.#relacaoDAO.findById(EscolaxUsuarioxFuncaoId);
    if (!refreshed) {
      throw new ErrorResponse(500, "Erro ao atualizar relacao", {
        message: "Falha ao recuperar registro apos atualizacao.",
      });
    }

    return this.toDTO(refreshed);
  };

  deleteRelacao = async (EscolaxUsuarioxFuncaoId: number): Promise<boolean> => {
    console.log("Service: EscolaxUsuarioxFuncaoService.deleteRelacao()");

    const existente = await this.#relacaoDAO.findById(EscolaxUsuarioxFuncaoId);
    if (!existente) {
      throw new ErrorResponse(404, "Relacao nao encontrada", {
        message: `Nao existe relacao com id ${EscolaxUsuarioxFuncaoId}`,
      });
    }

    const deleted = await this.#relacaoDAO.delete(EscolaxUsuarioxFuncaoId);
    if (!deleted) {
      throw new ErrorResponse(500, "Erro ao deletar relacao", {
        message: "Nao foi possivel remover o registro.",
      });
    }

    return true;
  };

  private validateReferences = async (
    usuarioCPF: string,
    escolaGUID: string,
    funcaoId: number
  ): Promise<void> => {
    const [usuarioExists, escolaExists, funcaoExists] = await Promise.all([
      this.#relacaoDAO.usuarioExists(usuarioCPF),
      this.#relacaoDAO.escolaExists(escolaGUID),
      this.#relacaoDAO.funcaoExists(funcaoId),
    ]);

    if (!usuarioExists) {
      throw new ErrorResponse(404, "Usuario nao encontrado", {
        message: `Nao existe usuario com CPF ${usuarioCPF}`,
      });
    }

    if (!escolaExists) {
      throw new ErrorResponse(404, "Escola nao encontrada", {
        message: `Nao existe escola com GUID ${escolaGUID}`,
      });
    }

    if (!funcaoExists) {
      throw new ErrorResponse(404, "Funcao nao encontrada", {
        message: `Nao existe funcao com id ${funcaoId}`,
      });
    }
  };

  /**
   * Busca todas as escolas vinculadas a um usuário
   * Retorna estrutura completa com dados da escola e funções associadas
   */
  findEscolasByUsuario = async (UsuarioCPF: string): Promise<Array<{
    escola: {
      EscolaGUID: string;
      EscolaNome: string;
      EscolaEmail: string | null;
      EscolaCor1: string | null;
      EscolaCor2: string | null;
      EscolaCor3: string | null;
      EscolaCor4: string | null;
      EscolaLogo: string | null;
    };
    funcoes: Array<{
      EscolaxUsuarioxFuncaoId: number;
      FuncaoId: number;
      FuncaoNome: string;
      DataInicio: string | null;
      DataFim: string | null;
      Status: "Ativo" | "Inativo" | "Finalizado";
    }>;
  }>> => {
    console.log("Service: EscolaxUsuarioxFuncaoService.findEscolasByUsuario()");

    // Buscar dados no repositório
    const escolas = await this.#relacaoDAO.findEscolasByUsuarioCPF(UsuarioCPF);

    // Converter datas para strings ISO
    return escolas.map(item => ({
      escola: item.escola,
      funcoes: item.funcoes.map(funcao => ({
        EscolaxUsuarioxFuncaoId: funcao.EscolaxUsuarioxFuncaoId,
        FuncaoId: funcao.FuncaoId,
        FuncaoNome: funcao.FuncaoNome,
        DataInicio: funcao.DataInicio ? funcao.DataInicio.toISOString().split('T')[0] : null,
        DataFim: funcao.DataFim ? funcao.DataFim.toISOString().split('T')[0] : null,
        Status: funcao.Status,
      })),
    }));
  };

  private toDTO = (relacao: EscolaxUsuarioxFuncao): EscolaxUsuarioxFuncaoDTO => {
    const id = relacao.EscolaxUsuarioxFuncaoId;
    if (id === null) {
      throw new Error("EscolaxUsuarioxFuncaoId nao pode ser nulo ao converter para DTO.");
    }

    if (relacao.CreatedAt === null || relacao.UpdatedAt === null) {
      throw new Error("CreatedAt e UpdatedAt nao podem ser nulos para registros existentes.");
    }

    return {
      EscolaxUsuarioxFuncaoId: id,
      UsuarioCPF: relacao.UsuarioCPF,
      EscolaGUID: relacao.EscolaGUID,
      FuncaoId: relacao.FuncaoId,
      FuncaoNome: relacao.FuncaoNome,
      DataInicio: relacao.DataInicio ? relacao.DataInicio.toISOString().split('T')[0] : null,
      DataFim: relacao.DataFim ? relacao.DataFim.toISOString().split('T')[0] : null,
      Status: relacao.Status,
      CreatedAt: relacao.CreatedAt.toISOString(),
      UpdatedAt: relacao.UpdatedAt.toISOString(),
    };
  };
}
