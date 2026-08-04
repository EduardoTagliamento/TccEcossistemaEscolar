/**
 * Sumário do livro: capítulo/faixa de página → matéria + assunto (gerado
 * 1x pelo `sumarioLivroAgent`, revisável). `MateriaGUID` fica AQUI, não no
 * livro — permite tanto livro de matéria única (todos os capítulos com a
 * mesma matéria) quanto livro geral (capítulos com matérias diferentes).
 */
export default class MaterialDidaticoCapitulo {
  #MaterialDidaticoCapituloGUID!: string;
  #MaterialDidaticoGUID!: string;
  #MateriaGUID!: string;
  #Titulo!: string;
  #PaginaInicio!: number;
  #PaginaFim!: number;
  #AssuntoGUID: string | null = null;

  constructor() {
    console.log("⬆️  MaterialDidaticoCapitulo.constructor()");
  }

  get MaterialDidaticoCapituloGUID(): string {
    return this.#MaterialDidaticoCapituloGUID;
  }

  set MaterialDidaticoCapituloGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("MaterialDidaticoCapituloGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#MaterialDidaticoCapituloGUID = value.trim();
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

  get MateriaGUID(): string {
    return this.#MateriaGUID;
  }

  set MateriaGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("MateriaGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#MateriaGUID = value.trim();
  }

  get Titulo(): string {
    return this.#Titulo;
  }

  set Titulo(value: string) {
    if (typeof value !== "string" || value.trim().length < 1) {
      throw new Error("Titulo deve ser uma string não vazia.");
    }
    if (value.trim().length > 255) {
      throw new Error("Titulo deve ter no máximo 255 caracteres.");
    }
    this.#Titulo = value.trim();
  }

  get PaginaInicio(): number {
    return this.#PaginaInicio;
  }

  set PaginaInicio(value: number) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
      throw new Error("PaginaInicio deve ser um número inteiro positivo.");
    }
    this.#PaginaInicio = value;
  }

  get PaginaFim(): number {
    return this.#PaginaFim;
  }

  set PaginaFim(value: number) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
      throw new Error("PaginaFim deve ser um número inteiro positivo.");
    }
    this.#PaginaFim = value;
  }

  get AssuntoGUID(): string | null {
    return this.#AssuntoGUID;
  }

  set AssuntoGUID(value: string | null) {
    this.#AssuntoGUID = value && value.trim() ? value.trim() : null;
  }

  validar(): void {
    if (this.#PaginaFim < this.#PaginaInicio) {
      throw new Error("PaginaFim deve ser maior ou igual a PaginaInicio.");
    }
  }
}
