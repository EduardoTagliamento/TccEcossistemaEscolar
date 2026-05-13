import { v4 as uuidv4 } from "uuid";
import ErrorResponse from "../utils/ErrorResponse.js";
import Escola from "../entities/escola.model.js";
import { EscolaDAO } from "../repositories/escola.repository";
import EscolaxUsuarioxFuncao from "../entities/escolaxusuarioxfuncao.model.js";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";

export interface EscolaDTO {
  EscolaGUID: string;
  EscolaNome: string | null;
  EscolaCNPJ: string | null;
  EscolaTelefone: string | null;
  EscolaEmail: string | null;
  EscolaEndereco: string | null;
  EscolaCorPriEs: string | null;
  EscolaCorPriCl: string | null;
  EscolaCorSecEs: string | null;
  EscolaCorSecCl: string | null;
  EscolaIcone: string | null; // base64
  EscolaStatus: "Ativa" | "Inativa";
  EscolaIsTecnica: boolean;
  EscolaCreatedAt: string | null; // ISO string
  EscolaUpdatedAt: string | null; // ISO string
}

export default class EscolaService {
  #escolaDAO: EscolaDAO;
  #escolaxusuarioxfuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(
    escolaDAODependency: EscolaDAO,
    escolaxusuarioxfuncaoDAODependency: EscolaxUsuarioxFuncaoDAO
  ) {
    console.log("⬆️  EscolaService.constructor()");
    this.#escolaDAO = escolaDAODependency;
    this.#escolaxusuarioxfuncaoDAO = escolaxusuarioxfuncaoDAODependency;
  }

  createEscola = async (
    jsonEscola: Record<string, unknown>,
    usuarioCPF?: string
  ): Promise<EscolaDTO> => {
    console.log("🟣 EscolaService.createEscola()");

    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para criar escola.",
      });
    }

    const escola = new Escola();
    escola.EscolaGUID = (jsonEscola.EscolaGUID as string) || uuidv4();
    escola.EscolaNome = (jsonEscola.EscolaNome as string | null) ?? null;
    escola.EscolaCNPJ = (jsonEscola.EscolaCNPJ as string | null) ?? null;
    escola.EscolaTelefone = (jsonEscola.EscolaTelefone as string | null) ?? null;
    escola.EscolaEmail = (jsonEscola.EscolaEmail as string | null) ?? null;
    escola.EscolaEndereco = (jsonEscola.EscolaEndereco as string | null) ?? null;
    escola.EscolaCorPriEs = (jsonEscola.EscolaCorPriEs as string | null) ?? null;
    escola.EscolaCorPriCl = (jsonEscola.EscolaCorPriCl as string | null) ?? null;
    escola.EscolaCorSecEs = (jsonEscola.EscolaCorSecEs as string | null) ?? null;
    escola.EscolaCorSecCl = (jsonEscola.EscolaCorSecCl as string | null) ?? null;
    escola.EscolaStatus = (jsonEscola.EscolaStatus as "Ativa" | "Inativa") ?? "Ativa";
    escola.EscolaIsTecnica = (jsonEscola.EscolaIsTecnica as boolean) ?? false;

    if (jsonEscola.EscolaIcone !== undefined && jsonEscola.EscolaIcone !== null) {
      const base64Icone = jsonEscola.EscolaIcone as string;
      escola.EscolaIcone = base64Icone ? Buffer.from(base64Icone, "base64") : null;
    }

    if (jsonEscola.EscolaLogo !== undefined) {
      escola.EscolaLogo = (jsonEscola.EscolaLogo as string | null) ?? null;
    }

    // Validar CNPJ único (se fornecido)
    if (escola.EscolaCNPJ) {
      const existente = await this.#escolaDAO.findByField("EscolaCNPJ", escola.EscolaCNPJ);
      if (existente.length > 0) {
        throw new ErrorResponse(400, "CNPJ já cadastrado", {
          message: `O CNPJ ${escola.EscolaCNPJ} já está cadastrado no sistema`,
        });
      }
    }

    await this.#escolaDAO.create(escola);

    try {
      // Vincula automaticamente o usuário criador como Direção (FuncaoId = 6).
      const vinculoExistente = await this.#escolaxusuarioxfuncaoDAO.findByTripla(
        usuarioCPF,
        escola.EscolaGUID,
        6
      );

      if (!vinculoExistente) {
        const relacao = new EscolaxUsuarioxFuncao();
        relacao.UsuarioCPF = this.normalizeCPF(usuarioCPF);
        relacao.EscolaGUID = escola.EscolaGUID;
        relacao.FuncaoId = 6;
        relacao.Status = "Ativo";
        relacao.DataInicio = new Date();
        relacao.DataFim = null;

        await this.#escolaxusuarioxfuncaoDAO.create(relacao);
      }
    } catch (error: any) {
      // Mantém consistência dos dados caso o vínculo obrigatório falhe.
      await this.#escolaDAO.delete(escola.EscolaGUID);
      throw new ErrorResponse(500, "Erro ao vincular usuário à escola", {
        message: error?.message || "A escola não pôde ser criada com vínculo de Direção.",
      });
    }

    return this.toDTO(escola);
  };

  findAll = async (nome?: string): Promise<EscolaDTO[]> => {
    console.log("🟣 EscolaService.findAll()");
    const escolas = await this.#escolaDAO.findAll(nome);
    return escolas.map((escola) => this.toDTO(escola));
  };

  findById = async (EscolaGUID: string): Promise<EscolaDTO> => {
    console.log("🟣 EscolaService.findById()");
    const escola = await this.#escolaDAO.findById(EscolaGUID);

    if (!escola) {
      throw new ErrorResponse(404, "Escola não encontrada", {
        message: `Não existe escola com id ${EscolaGUID}`,
      });
    }

    return this.toDTO(escola);
  };

  updateEscola = async (EscolaGUID: string, jsonEscola: Record<string, unknown>): Promise<EscolaDTO> => {
    console.log("🟣 EscolaService.updateEscola()");

    const existente = await this.#escolaDAO.findById(EscolaGUID);
    if (!existente) {
      throw new ErrorResponse(404, "Escola não encontrada", {
        message: `Não existe escola com id ${EscolaGUID}`,
      });
    }

    const escola = new Escola();
    escola.EscolaGUID = EscolaGUID;
    escola.EscolaNome =
      jsonEscola.EscolaNome !== undefined
        ? (jsonEscola.EscolaNome as string | null)
        : existente.EscolaNome;
    escola.EscolaCNPJ =
      jsonEscola.EscolaCNPJ !== undefined
        ? (jsonEscola.EscolaCNPJ  as string | null)
        : existente.EscolaCNPJ;
    escola.EscolaTelefone =
      jsonEscola.EscolaTelefone !== undefined
        ? (jsonEscola.EscolaTelefone as string | null)
        : existente.EscolaTelefone;
    escola.EscolaEmail =
      jsonEscola.EscolaEmail !== undefined
        ? (jsonEscola.EscolaEmail as string | null)
        : existente.EscolaEmail;
    escola.EscolaEndereco =
      jsonEscola.EscolaEndereco !== undefined
        ? (jsonEscola.EscolaEndereco as string | null)
        : existente.EscolaEndereco;
    escola.EscolaCorPriEs =
      jsonEscola.EscolaCorPriEs !== undefined
        ? (jsonEscola.EscolaCorPriEs as string | null)
        : existente.EscolaCorPriEs;
    escola.EscolaCorPriCl =
      jsonEscola.EscolaCorPriCl !== undefined
        ? (jsonEscola.EscolaCorPriCl as string | null)
        : existente.EscolaCorPriCl;
    escola.EscolaCorSecEs =
      jsonEscola.EscolaCorSecEs !== undefined
        ? (jsonEscola.EscolaCorSecEs as string | null)
        : existente.EscolaCorSecEs;
    escola.EscolaCorSecCl =
      jsonEscola.EscolaCorSecCl !== undefined
        ? (jsonEscola.EscolaCorSecCl as string | null)
        : existente.EscolaCorSecCl;
    escola.EscolaStatus =
      jsonEscola.EscolaStatus !== undefined
        ? (jsonEscola.EscolaStatus as "Ativa" | "Inativa")
        : existente.EscolaStatus;
    escola.EscolaIsTecnica =
      jsonEscola.EscolaIsTecnica !== undefined
        ? (jsonEscola.EscolaIsTecnica as boolean)
        : existente.EscolaIsTecnica;

    if (jsonEscola.EscolaIcone === undefined) {
      escola.EscolaIcone = existente.EscolaIcone;
    } else if (jsonEscola.EscolaIcone === null || jsonEscola.EscolaIcone === "") {
      escola.EscolaIcone = null;
    } else {
      escola.EscolaIcone = Buffer.from(jsonEscola.EscolaIcone as string, "base64");
    }

    await this.#escolaDAO.update(escola);
    return this.toDTO(escola);
  };

  deleteEscola = async (EscolaGUID: string): Promise<boolean> => {
    console.log("🟣 EscolaService.deleteEscola()");
    await this.#escolaxusuarioxfuncaoDAO.deleteByEscolaGUID(EscolaGUID);
    return this.#escolaDAO.delete(EscolaGUID);
  };

  private toDTO(escola: Escola): EscolaDTO {
    return {
      EscolaGUID: escola.EscolaGUID,
      EscolaNome: escola.EscolaNome,
      EscolaCNPJ: escola.EscolaCNPJ,
      EscolaTelefone: escola.EscolaTelefone,
      EscolaEmail: escola.EscolaEmail,
      EscolaEndereco: escola.EscolaEndereco,
      EscolaCorPriEs: escola.EscolaCorPriEs,
      EscolaCorPriCl: escola.EscolaCorPriCl,
      EscolaCorSecEs: escola.EscolaCorSecEs,
      EscolaCorSecCl: escola.EscolaCorSecCl,
      EscolaIcone: escola.EscolaIcone ? escola.EscolaIcone.toString("base64") : null,
      EscolaStatus: escola.EscolaStatus,
      EscolaIsTecnica: escola.EscolaIsTecnica,
      EscolaCreatedAt: escola.EscolaCreatedAt ? escola.EscolaCreatedAt.toISOString() : null,
      EscolaUpdatedAt: escola.EscolaUpdatedAt ? escola.EscolaUpdatedAt.toISOString() : null,
    };
  }

  private normalizeCPF(cpf: string): string {
    const normalized = cpf.trim();
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(normalized)) {
      return normalized;
    }

    const digits = normalized.replace(/\D/g, "");
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    }

    return normalized;
  }
}