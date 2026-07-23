/**
 * Representa a identidade visual de uma Matéria, por professor.
 *
 * Objetivo:
 * - Mesma matéria pode ter capa/cor/mensagem de boas-vindas diferentes
 *   dependendo de qual professor está lecionando (cada um "marca" a
 *   matéria do seu jeito, mesmo padrão do Google Classroom).
 * - Sem customização (nenhuma linha ainda): fallback é a cor primária da
 *   escola + label com o nome da matéria (resolvido no service, não aqui).
 */
import { normalizeCPF } from "../utils/helpers/cpf.helper";

export default class MateriaCustomizacao {
  #MateriaCustomizacaoGUID!: string;
  #MateriaGUID!: string;
  #UsuarioCPF!: string;
  #ImagemUrl: string | null = null;
  #CorFundo: string | null = null;
  #MensagemBoasVindas: string | null = null;
  #CreatedAt: Date | null = null;
  #UpdatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  MateriaCustomizacao.constructor()");
  }

  // ========== MateriaCustomizacaoGUID ==========
  get MateriaCustomizacaoGUID(): string {
    return this.#MateriaCustomizacaoGUID;
  }

  set MateriaCustomizacaoGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("MateriaCustomizacaoGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#MateriaCustomizacaoGUID = value.trim();
  }

  // ========== MateriaGUID ==========
  get MateriaGUID(): string {
    return this.#MateriaGUID;
  }

  set MateriaGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("MateriaGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#MateriaGUID = value.trim();
  }

  // ========== UsuarioCPF ==========
  get UsuarioCPF(): string {
    return this.#UsuarioCPF;
  }

  set UsuarioCPF(value: string) {
    this.#UsuarioCPF = normalizeCPF(value);
  }

  // ========== ImagemUrl ==========
  get ImagemUrl(): string | null {
    return this.#ImagemUrl;
  }

  set ImagemUrl(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#ImagemUrl = null;
      return;
    }
    if (typeof value !== "string" || value.length > 500) {
      throw new Error("ImagemUrl deve ter no máximo 500 caracteres.");
    }
    this.#ImagemUrl = value;
  }

  // ========== CorFundo ==========
  get CorFundo(): string | null {
    return this.#CorFundo;
  }

  set CorFundo(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#CorFundo = null;
      return;
    }
    const cor = value.trim();
    if (!/^#?[0-9a-fA-F]{6}$/.test(cor)) {
      throw new Error("CorFundo deve ser uma cor hexadecimal válida (ex: #17C077).");
    }
    this.#CorFundo = cor.startsWith("#") ? cor : `#${cor}`;
  }

  // ========== MensagemBoasVindas ==========
  get MensagemBoasVindas(): string | null {
    return this.#MensagemBoasVindas;
  }

  set MensagemBoasVindas(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#MensagemBoasVindas = null;
      return;
    }
    const mensagem = value.trim();
    if (mensagem.length > 500) {
      throw new Error("MensagemBoasVindas deve ter no máximo 500 caracteres.");
    }
    this.#MensagemBoasVindas = mensagem;
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
