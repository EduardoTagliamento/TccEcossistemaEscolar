/** Vestibular de origem de uma QuestaoBanco (ex.: "ENEM", "FUVEST") — tabela pra filtro não virar texto livre fragmentado. */
export default class Vestibular {
  #VestibularGUID!: string;
  #Nome!: string;

  constructor() {
    console.log("⬆️  Vestibular.constructor()");
  }

  get VestibularGUID(): string {
    return this.#VestibularGUID;
  }

  set VestibularGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("VestibularGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#VestibularGUID = value.trim();
  }

  get Nome(): string {
    return this.#Nome;
  }

  set Nome(value: string) {
    if (typeof value !== "string" || value.trim().length < 2) {
      throw new Error("Nome deve ter pelo menos 2 caracteres.");
    }
    if (value.trim().length > 100) {
      throw new Error("Nome deve ter no máximo 100 caracteres.");
    }
    this.#Nome = value.trim();
  }
}
