/**
 * Livro didático cadastrado uma vez, em nível de Escola (spec item 7-9) —
 * não trava matéria: cada capítulo (`MaterialDidaticoCapitulo`) tem sua
 * própria `MateriaGUID`, cobrindo tanto livro de matéria única quanto
 * livro geral (ex.: "Ciências" com seções de Física/Química/Biologia).
 */
export default class MaterialDidatico {
  #MaterialDidaticoGUID!: string;
  #EscolaGUID!: string;
  #Titulo!: string;
  #CriadoPorCPF!: string;
  #CreatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  MaterialDidatico.constructor()");
  }

  get MaterialDidaticoGUID(): string {
    return this.#MaterialDidaticoGUID;
  }

  set MaterialDidaticoGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("MaterialDidaticoGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#MaterialDidaticoGUID = value.trim();
  }

  get EscolaGUID(): string {
    return this.#EscolaGUID;
  }

  set EscolaGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("EscolaGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#EscolaGUID = value.trim();
  }

  get Titulo(): string {
    return this.#Titulo;
  }

  set Titulo(value: string) {
    if (typeof value !== "string" || value.trim().length < 2) {
      throw new Error("Titulo deve ter pelo menos 2 caracteres.");
    }
    if (value.trim().length > 255) {
      throw new Error("Titulo deve ter no máximo 255 caracteres.");
    }
    this.#Titulo = value.trim();
  }

  get CriadoPorCPF(): string {
    return this.#CriadoPorCPF;
  }

  set CriadoPorCPF(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("CriadoPorCPF deve ser uma string não vazia.");
    }
    this.#CriadoPorCPF = value.trim();
  }

  get CreatedAt(): Date | null {
    return this.#CreatedAt;
  }

  set CreatedAt(value: Date | null) {
    this.#CreatedAt = value ?? null;
  }
}
