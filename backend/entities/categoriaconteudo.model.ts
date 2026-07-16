/**
 * Representa a entidade Categoria de Conteúdo.
 *
 * Objetivo:
 * - Agrupar conteúdos de aula em tópicos (ex: "Eletrodinâmica", "Cinemática").
 * - Pessoal de cada professor: cada um mantém sua própria lista de
 *   categorias, por matéria (mesmo que dois professores lecionem a mesma
 *   matéria, cada um tem as suas).
 */
import { normalizeCPF } from "../utils/helpers/cpf.helper";

export default class CategoriaConteudo {
  #CategoriaGUID!: string;
  #UsuarioCPF!: string;
  #MateriaGUID!: string;
  #CategoriaNome: string | null = null;
  #CreatedAt: Date | null = null;
  #UpdatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  CategoriaConteudo.constructor()");
  }

  // ========== CategoriaGUID ==========
  get CategoriaGUID(): string {
    return this.#CategoriaGUID;
  }

  set CategoriaGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("CategoriaGUID deve ser uma string não vazia.");
    }
    const guid = value.trim();
    if (guid.length !== 36) {
      throw new Error("CategoriaGUID deve ter 36 caracteres.");
    }
    this.#CategoriaGUID = guid;
  }

  // ========== UsuarioCPF ==========
  get UsuarioCPF(): string {
    return this.#UsuarioCPF;
  }

  set UsuarioCPF(value: string) {
    this.#UsuarioCPF = normalizeCPF(value);
  }

  // ========== MateriaGUID ==========
  get MateriaGUID(): string {
    return this.#MateriaGUID;
  }

  set MateriaGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("MateriaGUID deve ser uma string não vazia.");
    }
    const guid = value.trim();
    if (guid.length !== 36) {
      throw new Error("MateriaGUID deve ter 36 caracteres.");
    }
    this.#MateriaGUID = guid;
  }

  // ========== CategoriaNome ==========
  get CategoriaNome(): string | null {
    return this.#CategoriaNome;
  }

  set CategoriaNome(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#CategoriaNome = null;
      return;
    }

    if (typeof value !== "string") {
      throw new Error("CategoriaNome deve ser uma string.");
    }

    const nome = value.trim();
    if (nome.length < 2) {
      throw new Error("CategoriaNome deve ter pelo menos 2 caracteres.");
    }
    if (nome.length > 100) {
      throw new Error("CategoriaNome deve ter no máximo 100 caracteres.");
    }

    this.#CategoriaNome = nome;
  }

  // ========== CreatedAt ==========
  get CreatedAt(): Date | null {
    return this.#CreatedAt;
  }

  set CreatedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#CreatedAt = null;
      return;
    }
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("CreatedAt deve ser uma data válida.");
    }
    this.#CreatedAt = value;
  }

  // ========== UpdatedAt ==========
  get UpdatedAt(): Date | null {
    return this.#UpdatedAt;
  }

  set UpdatedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#UpdatedAt = null;
      return;
    }
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("UpdatedAt deve ser uma data válida.");
    }
    this.#UpdatedAt = value;
  }
}
