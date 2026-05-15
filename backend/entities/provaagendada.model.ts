/**
 * Representa a entidade ProvaAgendada do sistema.
 *
 * Objetivo:
 * - Encapsular os dados de uma prova agendada para uma turma/matéria.
 * - Garantir integridade dos atributos via getters e setters.
 *
 * Relacionamentos:
 * - N:1 com Turma
 * - N:1 com Materia
 * - 1:N com Anexo (via relacaoanexosprova)
 */
export default class ProvaAgendada {
  #ProvaAgendadaGUID!: string;
  #TurmaGUID!: string;
  #MateriaGUID!: string;
  #ProvaData!: Date;
  #ProvaDescricao: string | null = null;
  #ProvaStatus: "Agendada" | "Realizada" | "Cancelada" = "Agendada";
  #CreatedAt: Date | null = null;
  #UpdatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  ProvaAgendada.constructor()");
  }

  // ========== ProvaAgendadaGUID ==========
  get ProvaAgendadaGUID(): string {
    return this.#ProvaAgendadaGUID;
  }

  set ProvaAgendadaGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("ProvaAgendadaGUID deve ser uma string não vazia.");
    }
    const guid = value.trim();
    if (guid.length !== 36) {
      throw new Error("ProvaAgendadaGUID deve ter 36 caracteres.");
    }
    this.#ProvaAgendadaGUID = guid;
  }

  // ========== TurmaGUID ==========
  get TurmaGUID(): string {
    return this.#TurmaGUID;
  }

  set TurmaGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("TurmaGUID deve ser uma string não vazia.");
    }
    const guid = value.trim();
    if (guid.length !== 36) {
      throw new Error("TurmaGUID deve ter 36 caracteres.");
    }
    this.#TurmaGUID = guid;
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

  // ========== ProvaData ==========
  get ProvaData(): Date {
    return this.#ProvaData;
  }

  set ProvaData(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("ProvaData deve ser uma data válida.");
    }
    this.#ProvaData = value;
  }

  // ========== ProvaDescricao ==========
  get ProvaDescricao(): string | null {
    return this.#ProvaDescricao;
  }

  set ProvaDescricao(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#ProvaDescricao = null;
      return;
    }

    if (typeof value !== "string") {
      throw new Error("ProvaDescricao deve ser uma string.");
    }

    const descricao = value.trim();
    if (descricao.length > 1024) {
      throw new Error("ProvaDescricao deve ter no máximo 1024 caracteres.");
    }

    this.#ProvaDescricao = descricao;
  }

  // ========== ProvaStatus ==========
  get ProvaStatus(): "Agendada" | "Realizada" | "Cancelada" {
    return this.#ProvaStatus;
  }

  set ProvaStatus(value: "Agendada" | "Realizada" | "Cancelada") {
    if (!["Agendada", "Realizada", "Cancelada"].includes(value)) {
      throw new Error('ProvaStatus deve ser "Agendada", "Realizada" ou "Cancelada".');
    }
    this.#ProvaStatus = value;
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
