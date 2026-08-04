import { v4 as uuidv4 } from "uuid";
import Assunto, { AssuntoOrigem } from "../entities/assunto.model";
import { AssuntoDAO } from "../repositories/assunto.repository";
import { MateriaDAO } from "../repositories/materia.repository";
import { MaterialProfessorTurmaDAO } from "../repositories/materiaxprofessorxturma.repository";
import ErrorResponse from "../utils/ErrorResponse";

export interface AssuntoDTO {
  AssuntoGUID: string;
  MateriaGUID: string;
  AssuntoPaiGUID: string | null;
  Nome: string;
  SubMateriaGlobalGUID: string | null;
  Origem: AssuntoOrigem;
  CreatedAt: string | null;
}

export interface AssuntoCreateDTO {
  MateriaGUID: string;
  Nome: string;
  AssuntoPaiGUID?: string | null;
  SubMateriaGlobalGUID?: string | null;
  Origem?: AssuntoOrigem;
}

/**
 * Vocabulário controlado de assunto por Matéria (spec item 3) — CRUD
 * simples, escopado por professor alocado na matéria (mesmo padrão de
 * ownership de `ProvaAgendadaService.#validarProfessorResponsavel`).
 */
export default class AssuntoService {
  #assuntoDAO: AssuntoDAO;
  #materiaDAO: MateriaDAO;
  #alocacaoDAO: MaterialProfessorTurmaDAO;

  constructor(
    assuntoDAODependency: AssuntoDAO,
    materiaDAODependency: MateriaDAO,
    alocacaoDAODependency: MaterialProfessorTurmaDAO
  ) {
    console.log("⬆️  AssuntoService.constructor()");
    this.#assuntoDAO = assuntoDAODependency;
    this.#materiaDAO = materiaDAODependency;
    this.#alocacaoDAO = alocacaoDAODependency;
  }

  #validarProfessorResponsavel = async (materiaGUID: string, usuarioCPF: string): Promise<void> => {
    const alocacoes = await this.#alocacaoDAO.findByProfessor(usuarioCPF);
    const alocado = alocacoes.some((a) => a.MateriaGUID === materiaGUID && a.AlocacaoStatus === "Ativa");
    if (!alocado) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Só um professor ativamente alocado nesta matéria pode gerenciar assuntos dela.",
      });
    }
  };

  criarAssunto = async (data: AssuntoCreateDTO, usuarioCPF: string): Promise<AssuntoDTO> => {
    console.log("🟣 AssuntoService.criarAssunto()");

    const materia = await this.#materiaDAO.findById(data.MateriaGUID);
    if (!materia) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${data.MateriaGUID}`,
      });
    }

    await this.#validarProfessorResponsavel(data.MateriaGUID, usuarioCPF);

    const nome = data.Nome.trim();
    const existente = await this.#assuntoDAO.findByNomeExato(data.MateriaGUID, nome);
    if (existente) {
      throw new ErrorResponse(409, "Assunto já existe", {
        message: `Já existe o assunto "${nome}" cadastrado para esta matéria.`,
      });
    }

    const assunto = new Assunto();
    assunto.AssuntoGUID = uuidv4();
    assunto.MateriaGUID = data.MateriaGUID;
    assunto.AssuntoPaiGUID = data.AssuntoPaiGUID ?? null;
    assunto.Nome = nome;
    assunto.SubMateriaGlobalGUID = data.SubMateriaGlobalGUID ?? null;
    assunto.Origem = data.Origem ?? "Manual";

    await this.#assuntoDAO.create(assunto);

    return this.toDTO(assunto);
  };

  /**
   * Usado pela listbox de criação de prova (spec §3.4a passo 5): quando o
   * professor escolhe uma `SubMateriaGlobal` em vez de digitar texto livre,
   * resolve (ou cria na hora) o `Assunto` local correspondente — já nasce
   * com `SubMateriaGlobalGUID` preenchido, sem curadoria extra.
   */
  resolverOuCriarPorSubMateriaGlobal = async (
    materiaGUID: string,
    subMateriaGlobalGUID: string,
    nome: string
  ): Promise<AssuntoDTO> => {
    console.log("🟣 AssuntoService.resolverOuCriarPorSubMateriaGlobal()");

    const nomeNormalizado = nome.trim();
    const existente = await this.#assuntoDAO.findByNomeExato(materiaGUID, nomeNormalizado);
    if (existente) return this.toDTO(existente);

    const assunto = new Assunto();
    assunto.AssuntoGUID = uuidv4();
    assunto.MateriaGUID = materiaGUID;
    assunto.Nome = nomeNormalizado;
    assunto.SubMateriaGlobalGUID = subMateriaGlobalGUID;
    assunto.Origem = "Manual";

    await this.#assuntoDAO.create(assunto);
    return this.toDTO(assunto);
  };

  listarPorMateria = async (materiaGUID: string): Promise<AssuntoDTO[]> => {
    console.log("🟣 AssuntoService.listarPorMateria()");

    const assuntos = await this.#assuntoDAO.findByMateria(materiaGUID);
    return assuntos.map((assunto) => this.toDTO(assunto));
  };

  excluirAssunto = async (guid: string, usuarioCPF: string): Promise<boolean> => {
    console.log("🟣 AssuntoService.excluirAssunto()");

    const assunto = await this.#assuntoDAO.findById(guid);
    if (!assunto) {
      throw new ErrorResponse(404, "Assunto não encontrado", {
        message: `Não existe assunto com id ${guid}`,
      });
    }

    await this.#validarProfessorResponsavel(assunto.MateriaGUID, usuarioCPF);

    return this.#assuntoDAO.delete(guid);
  };

  private toDTO(assunto: Assunto): AssuntoDTO {
    return {
      AssuntoGUID: assunto.AssuntoGUID,
      MateriaGUID: assunto.MateriaGUID,
      AssuntoPaiGUID: assunto.AssuntoPaiGUID,
      Nome: assunto.Nome,
      SubMateriaGlobalGUID: assunto.SubMateriaGlobalGUID,
      Origem: assunto.Origem,
      CreatedAt: assunto.CreatedAt ? assunto.CreatedAt.toISOString() : null,
    };
  }
}
