import { v4 as uuidv4 } from "uuid";
import ErrorResponse from "../utils/ErrorResponse";
import CategoriaConteudo from "../entities/categoriaconteudo.model";
import { CategoriaConteudoDAO, CategoriaConteudoFilters } from "../repositories/categoriaconteudo.repository";
import { MateriaDAO } from "../repositories/materia.repository";

export interface CategoriaConteudoDTO {
  CategoriaGUID: string;
  UsuarioCPF: string;
  MateriaGUID: string;
  CategoriaNome: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface CategoriaConteudoCreateDTO {
  MateriaGUID: string;
  CategoriaNome: string;
}

export default class CategoriaConteudoService {
  #categoriaDAO: CategoriaConteudoDAO;
  #materiaDAO: MateriaDAO;

  constructor(categoriaDAO: CategoriaConteudoDAO, materiaDAO: MateriaDAO) {
    console.log("⬆️  CategoriaConteudoService.constructor()");
    this.#categoriaDAO = categoriaDAO;
    this.#materiaDAO = materiaDAO;
  }

  criarCategoria = async (
    data: CategoriaConteudoCreateDTO,
    usuarioCPF: string
  ): Promise<CategoriaConteudoDTO> => {
    console.log("🟣 CategoriaConteudoService.criarCategoria()");

    const materia = await this.#materiaDAO.findById(data.MateriaGUID);
    if (!materia) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${data.MateriaGUID}`,
      });
    }

    const nome = data.CategoriaNome.trim();
    const existente = await this.#categoriaDAO.findByUsuarioMateriaNome(usuarioCPF, data.MateriaGUID, nome);
    if (existente) {
      throw new ErrorResponse(409, "Categoria já existe", {
        message: `Você já tem uma categoria chamada "${nome}" nesta matéria.`,
      });
    }

    const categoria = new CategoriaConteudo();
    categoria.CategoriaGUID = uuidv4();
    categoria.UsuarioCPF = usuarioCPF;
    categoria.MateriaGUID = data.MateriaGUID;
    categoria.CategoriaNome = nome;

    await this.#categoriaDAO.create(categoria);

    return this.toDTO(categoria);
  };

  listarCategorias = async (filters: CategoriaConteudoFilters): Promise<CategoriaConteudoDTO[]> => {
    console.log("🟣 CategoriaConteudoService.listarCategorias()");

    const categorias = await this.#categoriaDAO.findAll(filters);
    return categorias.map((c) => this.toDTO(c));
  };

  atualizarCategoria = async (
    guid: string,
    novoNome: string,
    usuarioCPF: string
  ): Promise<CategoriaConteudoDTO> => {
    console.log("🟣 CategoriaConteudoService.atualizarCategoria()");

    const categoria = await this.#categoriaDAO.findById(guid);
    if (!categoria) {
      throw new ErrorResponse(404, "Categoria não encontrada", {
        message: `Não existe categoria com id ${guid}`,
      });
    }

    if (categoria.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você só pode editar suas próprias categorias.",
      });
    }

    const nome = novoNome.trim();
    const duplicada = await this.#categoriaDAO.findByUsuarioMateriaNome(usuarioCPF, categoria.MateriaGUID, nome);
    if (duplicada && duplicada.CategoriaGUID !== guid) {
      throw new ErrorResponse(409, "Categoria já existe", {
        message: `Você já tem uma categoria chamada "${nome}" nesta matéria.`,
      });
    }

    const atualizada = await this.#categoriaDAO.update(guid, nome);
    if (!atualizada) {
      throw new ErrorResponse(500, "Erro ao atualizar categoria");
    }

    return this.toDTO(atualizada);
  };

  excluirCategoria = async (guid: string, usuarioCPF: string): Promise<void> => {
    console.log("🟣 CategoriaConteudoService.excluirCategoria()");

    const categoria = await this.#categoriaDAO.findById(guid);
    if (!categoria) {
      throw new ErrorResponse(404, "Categoria não encontrada", {
        message: `Não existe categoria com id ${guid}`,
      });
    }

    if (categoria.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você só pode excluir suas próprias categorias.",
      });
    }

    await this.#categoriaDAO.delete(guid);
  };

  private toDTO(categoria: CategoriaConteudo): CategoriaConteudoDTO {
    return {
      CategoriaGUID: categoria.CategoriaGUID,
      UsuarioCPF: categoria.UsuarioCPF,
      MateriaGUID: categoria.MateriaGUID,
      CategoriaNome: categoria.CategoriaNome || "",
      CreatedAt: categoria.CreatedAt ? categoria.CreatedAt.toISOString() : new Date().toISOString(),
      UpdatedAt: categoria.UpdatedAt ? categoria.UpdatedAt.toISOString() : new Date().toISOString(),
    };
  }
}
