/**
 * Representa a entidade Escola do sistema.
 *
 * Objetivo:
 * - Encapsular os dados de uma escola.
 * - Garantir integridade dos atributos via getters e setters.
 */
export default class Escola {
  #EscolaGUID!: string;
  #EscolaNome: string | null = null;
  #EscolaCorPriEs: string | null = null;
  #EscolaCorPriCl: string | null = null;
  #EscolaCorSecEs: string | null = null;
  #EscolaCorSecCl: string | null = null;
  #EscolaIcone: Buffer | null = null;

  constructor() {
    console.log("⬆️  Escola.constructor()");
  }

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

  get EscolaNome(): string | null {
    return this.#EscolaNome;
  }

  set EscolaNome(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#EscolaNome = null;
      return;
    }

    if (typeof value !== "string") {
      throw new Error("EscolaNome deve ser uma string.");
    }

    const nome = value.trim();
    if (nome.length < 3) {
      throw new Error("EscolaNome deve ter pelo menos 3 caracteres.");
    }
    if (nome.length > 100) {
      throw new Error("EscolaNome deve ter no máximo 100 caracteres.");
    }

    this.#EscolaNome = nome;
  }

  get EscolaCorPriEs(): string | null {
    return this.#EscolaCorPriEs;
  }

  set EscolaCorPriEs(value: string | null) {
    this.#EscolaCorPriEs = this.validateHex(value, "EscolaCorPriEs");
  }

  get EscolaCorPriCl(): string | null {
    return this.#EscolaCorPriCl;
  }

  set EscolaCorPriCl(value: string | null) {
    this.#EscolaCorPriCl = this.validateHex(value, "EscolaCorPriCl");
  }

  get EscolaCorSecEs(): string | null {
    return this.#EscolaCorSecEs;
  }

  set EscolaCorSecEs(value: string | null) {
    this.#EscolaCorSecEs = this.validateHex(value, "EscolaCorSecEs");
  }

  get EscolaCorSecCl(): string | null {
    return this.#EscolaCorSecCl;
  }

  set EscolaCorSecCl(value: string | null) {
    this.#EscolaCorSecCl = this.validateHex(value, "EscolaCorSecCl");
  }

  get EscolaIcone(): Buffer | null {
    return this.#EscolaIcone;
  }

  set EscolaIcone(value: Buffer | null) {
    if (value === null || value === undefined) {
      this.#EscolaIcone = null;
      return;
    }

    if (!Buffer.isBuffer(value)) {
      throw new Error("EscolaIcone deve ser um Buffer.");
    }

    this.#EscolaIcone = value;
  }

  private validateHex(value: string | null, fieldName: string): string | null {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    if (typeof value !== "string") {
      throw new Error(`${fieldName} deve ser uma string.`);
    }

    const hex = value.trim();
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
      throw new Error(`${fieldName} deve ser um HEX com 6 caracteres.`);
    }

    return hex;
  }
}