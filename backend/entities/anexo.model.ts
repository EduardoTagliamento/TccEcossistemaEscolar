/**
 * Representa a entidade Anexo do sistema.
 *
 * Objetivo:
 * - Encapsular os dados de um anexo (arquivo).
 * - Garantir integridade dos atributos via getters e setters.
 */
import { normalizeCPF } from "../utils/helpers/cpf.helper";

export default class Anexo {
  #AnexoGUID!: string;
  #UsuarioCPF!: string;
  #EscolaGUID!: string;
  #AnexoCaminho!: string;
  #AnexoNomeOriginal: string | null = null;
  #AnexoTamanho: number | null = null;
  #CreatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  Anexo.constructor()");
  }

  // ========== AnexoGUID ==========
  get AnexoGUID(): string {
    return this.#AnexoGUID;
  }

  set AnexoGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("AnexoGUID deve ser uma string não vazia.");
    }

    const guid = value.trim();
    if (guid.length !== 36) {
      throw new Error("AnexoGUID deve ter 36 caracteres.");
    }

    this.#AnexoGUID = guid;
  }

  // ========== UsuarioCPF ==========
  get UsuarioCPF(): string {
    return this.#UsuarioCPF;
  }

  set UsuarioCPF(value: string) {
    this.#UsuarioCPF = normalizeCPF(value);
  }

  // ========== EscolaGUID ==========
  get EscolaGUID(): string {
    return this.#EscolaGUID;
  }

  set EscolaGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("EscolaGUID deve ser uma string não vazia.");
    }

    const guid = value.trim();
    if (guid.length !== 36) {
      throw new Error("EscolaGUID deve ter 36 caracteres.");
    }

    this.#EscolaGUID = guid;
  }

  // ========== AnexoCaminho ==========
  get AnexoCaminho(): string {
    return this.#AnexoCaminho;
  }

  set AnexoCaminho(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("AnexoCaminho deve ser uma string não vazia.");
    }

    const caminho = value.trim();
    if (caminho.length > 500) {
      throw new Error("AnexoCaminho deve ter no máximo 500 caracteres.");
    }

    this.#AnexoCaminho = caminho;
  }

  // ========== AnexoNomeOriginal ==========
  get AnexoNomeOriginal(): string | null {
    return this.#AnexoNomeOriginal;
  }

  set AnexoNomeOriginal(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#AnexoNomeOriginal = null;
      return;
    }

    if (typeof value !== "string") {
      throw new Error("AnexoNomeOriginal deve ser uma string.");
    }

    const nome = value.trim();
    if (nome.length > 255) {
      throw new Error("AnexoNomeOriginal deve ter no máximo 255 caracteres.");
    }

    this.#AnexoNomeOriginal = nome;
  }

  // ========== AnexoTamanho ==========
  get AnexoTamanho(): number | null {
    return this.#AnexoTamanho;
  }

  set AnexoTamanho(value: number | null) {
    if (value === null || value === undefined) {
      this.#AnexoTamanho = null;
      return;
    }

    if (typeof value !== "number" || value < 0) {
      throw new Error("AnexoTamanho deve ser um número positivo.");
    }

    // Limite: 50MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (value > MAX_SIZE) {
      throw new Error(`AnexoTamanho não pode exceder ${MAX_SIZE} bytes (50MB).`);
    }

    this.#AnexoTamanho = value;
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
}
