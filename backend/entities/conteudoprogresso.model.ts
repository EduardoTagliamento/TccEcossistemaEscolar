/**
 * Representa o progresso de consumo de um Conteudo por um aluno (matrícula).
 *
 * Cobre os 3 tipos de conteúdo com semânticas diferentes:
 * - texto: sempre 100% assim que aberto (instantâneo)
 * - cronometrado (vídeo/áudio): percentual = tempo assistido / duração total
 * - paginado (galeria): percentual = páginas distintas vistas / total de páginas
 *   (a granularidade de qual página foi vista mora em ConteudoPaginadoVisualizacao)
 */
export default class ConteudoProgresso {
  #ConteudoProgressoGUID!: string;
  #ConteudoGUID!: string;
  #MatriculaGUID!: string;
  #PercentualConcluido: number = 0;
  #UltimaPosicaoSegundos: number | null = null;
  #ConcluidoEm: Date | null = null;
  #CreatedAt: Date | null = null;
  #UpdatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  ConteudoProgresso.constructor()");
  }

  get ConteudoProgressoGUID(): string {
    return this.#ConteudoProgressoGUID;
  }

  set ConteudoProgressoGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("ConteudoProgressoGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#ConteudoProgressoGUID = value.trim();
  }

  get ConteudoGUID(): string {
    return this.#ConteudoGUID;
  }

  set ConteudoGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("ConteudoGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#ConteudoGUID = value.trim();
  }

  get MatriculaGUID(): string {
    return this.#MatriculaGUID;
  }

  set MatriculaGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "" || value.trim().length > 36) {
      throw new Error("MatriculaGUID deve ser uma string não vazia de até 36 caracteres.");
    }
    this.#MatriculaGUID = value.trim();
  }

  get PercentualConcluido(): number {
    return this.#PercentualConcluido;
  }

  set PercentualConcluido(value: number) {
    if (typeof value !== "number" || isNaN(value) || value < 0 || value > 100) {
      throw new Error("PercentualConcluido deve ser um número entre 0 e 100.");
    }
    this.#PercentualConcluido = Math.round(value);
  }

  get UltimaPosicaoSegundos(): number | null {
    return this.#UltimaPosicaoSegundos;
  }

  set UltimaPosicaoSegundos(value: number | null) {
    if (value === null || value === undefined) {
      this.#UltimaPosicaoSegundos = null;
      return;
    }
    if (typeof value !== "number" || isNaN(value) || value < 0) {
      throw new Error("UltimaPosicaoSegundos deve ser um número maior ou igual a zero.");
    }
    this.#UltimaPosicaoSegundos = Math.round(value);
  }

  get ConcluidoEm(): Date | null {
    return this.#ConcluidoEm;
  }

  set ConcluidoEm(value: Date | null) {
    if (value === null || value === undefined) {
      this.#ConcluidoEm = null;
      return;
    }
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("ConcluidoEm deve ser uma data válida.");
    }
    this.#ConcluidoEm = value;
  }

  get CreatedAt(): Date | null {
    return this.#CreatedAt;
  }

  set CreatedAt(value: Date | null) {
    this.#CreatedAt = value ?? null;
  }

  get UpdatedAt(): Date | null {
    return this.#UpdatedAt;
  }

  set UpdatedAt(value: Date | null) {
    this.#UpdatedAt = value ?? null;
  }
}
