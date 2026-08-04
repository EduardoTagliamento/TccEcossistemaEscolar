/** Submatéria dentro da taxonomia global (ex.: "Trigonometria" em "Matemática"). */
export default class SubMateriaGlobal {
  #SubMateriaGlobalGUID!: string;
  #MateriaGlobalGUID!: string;
  #Nome!: string;

  constructor() {
    console.log("⬆️  SubMateriaGlobal.constructor()");
  }

  get SubMateriaGlobalGUID(): string {
    return this.#SubMateriaGlobalGUID;
  }

  set SubMateriaGlobalGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("SubMateriaGlobalGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#SubMateriaGlobalGUID = value.trim();
  }

  get MateriaGlobalGUID(): string {
    return this.#MateriaGlobalGUID;
  }

  set MateriaGlobalGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("MateriaGlobalGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#MateriaGlobalGUID = value.trim();
  }

  get Nome(): string {
    return this.#Nome;
  }

  set Nome(value: string) {
    if (typeof value !== "string" || value.trim().length < 2) {
      throw new Error("Nome deve ter pelo menos 2 caracteres.");
    }
    if (value.trim().length > 150) {
      throw new Error("Nome deve ter no máximo 150 caracteres.");
    }
    this.#Nome = value.trim();
  }
}
