/** Alternativa de uma QuestaoBanco — mesmo padrão relacional de `TarefaAcademicaAlternativa`. */
export default class QuestaoBancoAlternativa {
  #AlternativaGUID!: string;
  #QuestaoBancoGUID!: string;
  #AlternativaTexto!: string;
  #AlternativaCorreta: boolean = false;
  #AlternativaOrdem: number = 0;

  constructor() {
    console.log("⬆️  QuestaoBancoAlternativa.constructor()");
  }

  get AlternativaGUID(): string {
    return this.#AlternativaGUID;
  }

  set AlternativaGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("AlternativaGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#AlternativaGUID = value.trim();
  }

  get QuestaoBancoGUID(): string {
    return this.#QuestaoBancoGUID;
  }

  set QuestaoBancoGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("QuestaoBancoGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#QuestaoBancoGUID = value.trim();
  }

  get AlternativaTexto(): string {
    return this.#AlternativaTexto;
  }

  set AlternativaTexto(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("AlternativaTexto deve ser uma string não vazia.");
    }
    if (value.length > 1000) {
      throw new Error("AlternativaTexto deve ter no máximo 1000 caracteres.");
    }
    this.#AlternativaTexto = value.trim();
  }

  get AlternativaCorreta(): boolean {
    return this.#AlternativaCorreta;
  }

  set AlternativaCorreta(value: boolean) {
    this.#AlternativaCorreta = Boolean(value);
  }

  get AlternativaOrdem(): number {
    return this.#AlternativaOrdem;
  }

  set AlternativaOrdem(value: number) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      throw new Error("AlternativaOrdem deve ser um número inteiro não negativo.");
    }
    this.#AlternativaOrdem = value;
  }
}
