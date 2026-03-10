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
  #EscolaCNPJ: string | null = null;
  #EscolaTelefone: string | null = null;
  #EscolaEmail: string | null = null;
  #EscolaEndereco: string | null = null;
  #EscolaCorPriEs: string | null = null;
  #EscolaCorPriCl: string | null = null;
  #EscolaCorSecEs: string | null = null;
  #EscolaCorSecCl: string | null = null;
  #EscolaIcone: Buffer | null = null;
  #EscolaStatus: "Ativa" | "Inativa" = "Ativa";
  #EscolaCreatedAt: Date | null = null;
  #EscolaUpdatedAt: Date | null = null;

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

  // ========== CNPJ ==========
  get EscolaCNPJ(): string | null {
    return this.#EscolaCNPJ;
  }

  set EscolaCNPJ(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#EscolaCNPJ = null;
      return;
    }

    if (typeof value !== "string") {
      throw new Error("EscolaCNPJ deve ser uma string.");
    }

    const cnpj = value.trim();

    // Formato: XX.XXX.XXX/XXXX-XX (18 caracteres)
    if (cnpj.length !== 18) {
      throw new Error("EscolaCNPJ deve ter exatamente 18 caracteres (formato: XX.XXX.XXX/XXXX-XX).");
    }

    const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
    if (!cnpjRegex.test(cnpj)) {
      throw new Error("EscolaCNPJ deve estar no formato XX.XXX.XXX/XXXX-XX.");
    }

    this.#EscolaCNPJ = cnpj;
  }

  // ========== Telefone ==========
  get EscolaTelefone(): string | null {
    return this.#EscolaTelefone;
  }

  set EscolaTelefone(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#EscolaTelefone = null;
      return;
    }

    if (typeof value !== "string") {
      throw new Error("EscolaTelefone deve ser uma string.");
    }

    const telefone = value.trim();

    // Formato: (XX) XXXXX-XXXX (15 caracteres)
    if (telefone.length !== 15) {
      throw new Error("EscolaTelefone deve ter exatamente 15 caracteres (formato: (XX) XXXXX-XXXX).");
    }

    const telefoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
    if (!telefoneRegex.test(telefone)) {
      throw new Error("EscolaTelefone deve estar no formato (XX) XXXXX-XXXX.");
    }

    this.#EscolaTelefone = telefone;
  }

  // ========== Email ==========
  get EscolaEmail(): string | null {
    return this.#EscolaEmail;
  }

  set EscolaEmail(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#EscolaEmail = null;
      return;
    }

    if (typeof value !== "string") {
      throw new Error("EscolaEmail deve ser uma string.");
    }

    const email = value.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("EscolaEmail deve ser um email válido.");
    }

    if (email.length > 60) {
      throw new Error("EscolaEmail deve ter no máximo 60 caracteres.");
    }

    this.#EscolaEmail = email;
  }

  // ========== Endereço ==========
  get EscolaEndereco(): string | null {
    return this.#EscolaEndereco;
  }

  set EscolaEndereco(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#EscolaEndereco = null;
      return;
    }

    if (typeof value !== "string") {
      throw new Error("EscolaEndereco deve ser uma string.");
    }

    const endereco = value.trim();

    if (endereco.length > 200) {
      throw new Error("EscolaEndereco deve ter no máximo 200 caracteres.");
    }

    this.#EscolaEndereco = endereco;
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

  // ========== Status ==========
  get EscolaStatus(): "Ativa" | "Inativa" {
    return this.#EscolaStatus;
  }

  set EscolaStatus(value: "Ativa" | "Inativa") {
    const statusValidos = ["Ativa", "Inativa"];
    if (!statusValidos.includes(value)) {
      throw new Error("EscolaStatus deve ser 'Ativa' ou 'Inativa'.");
    }
    this.#EscolaStatus = value;
  }

  // ========== Created At (Read-Only) ==========
  get EscolaCreatedAt(): Date | null {
    return this.#EscolaCreatedAt;
  }

  set EscolaCreatedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#EscolaCreatedAt = null;
      return;
    }

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("EscolaCreatedAt deve ser uma data válida.");
    }

    this.#EscolaCreatedAt = value;
  }

  // ========== Updated At (Read-Only) ==========
  get EscolaUpdatedAt(): Date | null {
    return this.#EscolaUpdatedAt;
  }

  set EscolaUpdatedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#EscolaUpdatedAt = null;
      return;
    }

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("EscolaUpdatedAt deve ser uma data válida.");
    }

    this.#EscolaUpdatedAt = value;
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