/**
 * Questão do banco universal de vestibular (spec item 11) — curada só pela
 * plataforma (admin de plataforma, item 13), vale pra todas as escolas.
 */
export type QuestaoBancoDificuldade = "Facil" | "Media" | "Dificil";

export default class QuestaoBanco {
  #QuestaoBancoGUID!: string;
  #MateriaGlobalGUID!: string;
  #SubMateriaGlobalGUID!: string;
  #VestibularGUID!: string;
  #Dificuldade!: QuestaoBancoDificuldade;
  #Enunciado!: string;
  #VideoResolucaoUrl: string | null = null;
  #CriadoPorCPF!: string;
  #CreatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  QuestaoBanco.constructor()");
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

  get MateriaGlobalGUID(): string {
    return this.#MateriaGlobalGUID;
  }

  set MateriaGlobalGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("MateriaGlobalGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#MateriaGlobalGUID = value.trim();
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

  get VestibularGUID(): string {
    return this.#VestibularGUID;
  }

  set VestibularGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("VestibularGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#VestibularGUID = value.trim();
  }

  get Dificuldade(): QuestaoBancoDificuldade {
    return this.#Dificuldade;
  }

  set Dificuldade(value: QuestaoBancoDificuldade) {
    if (!["Facil", "Media", "Dificil"].includes(value)) {
      throw new Error("Dificuldade deve ser 'Facil', 'Media' ou 'Dificil'.");
    }
    this.#Dificuldade = value;
  }

  get Enunciado(): string {
    return this.#Enunciado;
  }

  set Enunciado(value: string) {
    if (typeof value !== "string" || value.trim().length < 5) {
      throw new Error("Enunciado deve ter pelo menos 5 caracteres.");
    }
    this.#Enunciado = value.trim();
  }

  get VideoResolucaoUrl(): string | null {
    return this.#VideoResolucaoUrl;
  }

  set VideoResolucaoUrl(value: string | null) {
    this.#VideoResolucaoUrl = value && value.trim() ? value.trim() : null;
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
