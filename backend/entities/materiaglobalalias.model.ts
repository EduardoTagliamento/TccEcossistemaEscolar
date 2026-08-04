/**
 * Alias aprendido a cada resolução manual da fila `Pendente` (spec item 17)
 * — cobre sinônimos que a similaridade de string sozinha não pegaria
 * (ex.: "Língua Portuguesa" vs "Português").
 */
export default class MateriaGlobalAlias {
  #MateriaGlobalAliasGUID!: string;
  #MateriaGlobalGUID!: string;
  #NomeAlias!: string;

  constructor() {
    console.log("⬆️  MateriaGlobalAlias.constructor()");
  }

  get MateriaGlobalAliasGUID(): string {
    return this.#MateriaGlobalAliasGUID;
  }

  set MateriaGlobalAliasGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("MateriaGlobalAliasGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#MateriaGlobalAliasGUID = value.trim();
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

  get NomeAlias(): string {
    return this.#NomeAlias;
  }

  set NomeAlias(value: string) {
    if (typeof value !== "string" || value.trim().length < 2) {
      throw new Error("NomeAlias deve ter pelo menos 2 caracteres.");
    }
    if (value.trim().length > 150) {
      throw new Error("NomeAlias deve ter no máximo 150 caracteres.");
    }
    this.#NomeAlias = value.trim();
  }
}
