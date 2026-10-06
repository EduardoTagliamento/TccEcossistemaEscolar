/**
 * Progresso de um aluno numa questão do Banco de Questões — 1 linha por
 * (UsuarioGUID, QuestaoBancoGUID), com 2 flags independentes:
 * - Feita: resolveu (Acertou/FeitaEm preenchidos) — some do pool de
 *   randomização da prática; "revisitar" reseta pra false.
 * - Marcada: favoritar pra ver depois — independente de Feita.
 */
export default class QuestaoBancoProgresso {
  #QuestaoBancoProgressoGUID!: string;
  #UsuarioGUID!: string;
  #QuestaoBancoGUID!: string;
  #Feita: boolean = false;
  #Acertou: boolean | null = null;
  #FeitaEm: Date | null = null;
  #Marcada: boolean = false;
  #MarcadaEm: Date | null = null;
  #CreatedAt: Date | null = null;
  #UpdatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  QuestaoBancoProgresso.constructor()");
  }

  get QuestaoBancoProgressoGUID(): string {
    return this.#QuestaoBancoProgressoGUID;
  }

  set QuestaoBancoProgressoGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("QuestaoBancoProgressoGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#QuestaoBancoProgressoGUID = value.trim();
  }

  get UsuarioGUID(): string {
    return this.#UsuarioGUID;
  }

  set UsuarioGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("UsuarioGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#UsuarioGUID = value.trim();
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

  get Feita(): boolean {
    return this.#Feita;
  }

  set Feita(value: boolean) {
    this.#Feita = !!value;
  }

  get Acertou(): boolean | null {
    return this.#Acertou;
  }

  set Acertou(value: boolean | null) {
    this.#Acertou = value === null || value === undefined ? null : !!value;
  }

  get FeitaEm(): Date | null {
    return this.#FeitaEm;
  }

  set FeitaEm(value: Date | null) {
    this.#FeitaEm = value ?? null;
  }

  get Marcada(): boolean {
    return this.#Marcada;
  }

  set Marcada(value: boolean) {
    this.#Marcada = !!value;
  }

  get MarcadaEm(): Date | null {
    return this.#MarcadaEm;
  }

  set MarcadaEm(value: Date | null) {
    this.#MarcadaEm = value ?? null;
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

  toJSON() {
    return {
      QuestaoBancoProgressoGUID: this.QuestaoBancoProgressoGUID,
      UsuarioGUID: this.UsuarioGUID,
      QuestaoBancoGUID: this.QuestaoBancoGUID,
      Feita: this.Feita,
      Acertou: this.Acertou,
      FeitaEm: this.FeitaEm,
      Marcada: this.Marcada,
      MarcadaEm: this.MarcadaEm,
      CreatedAt: this.CreatedAt,
      UpdatedAt: this.UpdatedAt,
    };
  }
}
