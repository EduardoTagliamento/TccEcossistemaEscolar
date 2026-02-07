import { v4 as uuidv4 } from "uuid";
import ErrorResponse from "../utils/ErrorResponse.js";
import Escola from "../entities/escola.model.js";
import { EscolaDAO } from "../repositories/escola.repository";

export interface EscolaDTO {
  EscolaGUID: string;
  EscolaNome: string | null;
  EscolaCorPriEs: string | null;
  EscolaCorPriCl: string | null;
  EscolaCorSecEs: string | null;
  EscolaCorSecCl: string | null;
  EscolaIcone: string | null; // base64
}

export default class EscolaService {
  #escolaDAO: EscolaDAO;

  constructor(escolaDAODependency: EscolaDAO) {
    console.log("⬆️  EscolaService.constructor()");
    this.#escolaDAO = escolaDAODependency;
  }

  createEscola = async (jsonEscola: Record<string, unknown>): Promise<EscolaDTO> => {
    console.log("🟣 EscolaService.createEscola()");

    const escola = new Escola();
    escola.EscolaGUID = (jsonEscola.EscolaGUID as string) || uuidv4();
    escola.EscolaNome = (jsonEscola.EscolaNome as string | null) ?? null;
    escola.EscolaCorPriEs = (jsonEscola.EscolaCorPriEs as string | null) ?? null;
    escola.EscolaCorPriCl = (jsonEscola.EscolaCorPriCl as string | null) ?? null;
    escola.EscolaCorSecEs = (jsonEscola.EscolaCorSecEs as string | null) ?? null;
    escola.EscolaCorSecCl = (jsonEscola.EscolaCorSecCl as string | null) ?? null;

    if (jsonEscola.EscolaIcone !== undefined && jsonEscola.EscolaIcone !== null) {
      const base64Icone = jsonEscola.EscolaIcone as string;
      escola.EscolaIcone = base64Icone ? Buffer.from(base64Icone, "base64") : null;
    }

    if (escola.EscolaNome) {
      const existente = await this.#escolaDAO.findByField("EscolaNome", escola.EscolaNome);
      if (existente.length > 0) {
        throw new ErrorResponse(400, "Escola já existe", {
          message: `A escola ${escola.EscolaNome} já está cadastrada`,
        });
      }
    }

    await this.#escolaDAO.create(escola);
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
    return this.#escolaDAO.delete(EscolaGUID);
  };

  private toDTO(escola: Escola): EscolaDTO {
    return {
      EscolaGUID: escola.EscolaGUID,
      EscolaNome: escola.EscolaNome,
      EscolaCorPriEs: escola.EscolaCorPriEs,
      EscolaCorPriCl: escola.EscolaCorPriCl,
      EscolaCorSecEs: escola.EscolaCorSecEs,
      EscolaCorSecCl: escola.EscolaCorSecCl,
      EscolaIcone: escola.EscolaIcone ? escola.EscolaIcone.toString("base64") : null,
    };
  }
}