/**
 * Representa a entidade Matéria do sistema.
 *
 * Objetivo:
 * - Encapsular os dados de uma matéria/disciplina escolar.
 * - Garantir integridade dos atributos via getters e setters.
 */
export default class Materia {
  #MateriaGUID!: string;
  #EscolaGUID!: string;
  #CursoGUID: string | null = null;
  #MateriaNome: string | null = null;
  #MateriaIsTecnica: boolean = false;
  #MateriaAulasPorSemanaPadrao: number | null = null;
  #MateriaStatus: "Ativa" | "Inativa" = "Ativa";
  #MateriaCreatedAt: Date | null = null;
  #MateriaUpdatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  Materia.constructor()");
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

  // ========== CursoGUID ==========
  get CursoGUID(): string | null {
    return this.#CursoGUID;
  }

  set CursoGUID(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#CursoGUID = null;
      return;
    }

    if (typeof value !== "string") {
      throw new Error("CursoGUID deve ser uma string.");
    }

    const guid = value.trim();
    if (guid.length !== 36) {
      throw new Error("CursoGUID deve ter 36 caracteres.");
    }

    this.#CursoGUID = guid;
  }

  // ========== MateriaNome ==========
  get MateriaNome(): string | null {
    return this.#MateriaNome;
  }

  set MateriaNome(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#MateriaNome = null;
      return;
    }

    if (typeof value !== "string") {
      throw new Error("MateriaNome deve ser uma string.");
    }

    const nome = value.trim();
    if (nome.length < 3) {
      throw new Error("MateriaNome deve ter pelo menos 3 caracteres.");
    }
    if (nome.length > 100) {
      throw new Error("MateriaNome deve ter no máximo 100 caracteres.");
    }

    this.#MateriaNome = nome;
  }

  // ========== MateriaIsTecnica ==========
  get MateriaIsTecnica(): boolean {
    return this.#MateriaIsTecnica;
  }

  set MateriaIsTecnica(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("MateriaIsTecnica deve ser um booleano.");
    }
    this.#MateriaIsTecnica = value;
  }

  // ========== MateriaAulasPorSemanaPadrao ==========
  get MateriaAulasPorSemanaPadrao(): number | null {
    return this.#MateriaAulasPorSemanaPadrao;
  }

  set MateriaAulasPorSemanaPadrao(value: number | null) {
    if (value === null || value === undefined) {
      this.#MateriaAulasPorSemanaPadrao = null;
      return;
    }

    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new Error("MateriaAulasPorSemanaPadrao deve ser um número inteiro.");
    }
    if (value < 1 || value > 20) {
      throw new Error("MateriaAulasPorSemanaPadrao deve estar entre 1 e 20.");
    }

    this.#MateriaAulasPorSemanaPadrao = value;
  }

  // ========== MateriaStatus ==========
  get MateriaStatus(): "Ativa" | "Inativa" {
    return this.#MateriaStatus;
  }

  set MateriaStatus(value: "Ativa" | "Inativa") {
    const statusValidos = ["Ativa", "Inativa"];
    if (!statusValidos.includes(value)) {
      throw new Error("MateriaStatus deve ser 'Ativa' ou 'Inativa'.");
    }
    this.#MateriaStatus = value;
  }

  // ========== MateriaCreatedAt ==========
  get MateriaCreatedAt(): Date | null {
    return this.#MateriaCreatedAt;
  }

  set MateriaCreatedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#MateriaCreatedAt = null;
      return;
    }

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("MateriaCreatedAt deve ser uma data válida.");
    }

    this.#MateriaCreatedAt = value;
  }

  // ========== MateriaUpdatedAt ==========
  get MateriaUpdatedAt(): Date | null {
    return this.#MateriaUpdatedAt;
  }

  set MateriaUpdatedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#MateriaUpdatedAt = null;
      return;
    }

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("MateriaUpdatedAt deve ser uma data válida.");
    }

    this.#MateriaUpdatedAt = value;
  }
}
