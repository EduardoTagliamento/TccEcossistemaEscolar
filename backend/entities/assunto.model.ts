/**
 * Vocabulário controlado de assunto por Matéria (spec item 3) — entidade
 * referenciável (`AssuntoGUID`) em vez de texto livre, pra travamento
 * manual na prova e futura consulta ao banco de questões (Fase 3).
 */
export type AssuntoOrigem = "Manual" | "SumarioLivro" | "SugeridoIA";

export default class Assunto {
  #AssuntoGUID!: string;
  #MateriaGUID!: string;
  #AssuntoPaiGUID: string | null = null;
  #Nome!: string;
  #SubMateriaGlobalGUID: string | null = null;
  #Origem: AssuntoOrigem = "Manual";
  #CreatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  Assunto.constructor()");
  }

  get AssuntoGUID(): string {
    return this.#AssuntoGUID;
  }

  set AssuntoGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("AssuntoGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#AssuntoGUID = value.trim();
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

  get AssuntoPaiGUID(): string | null {
    return this.#AssuntoPaiGUID;
  }

  set AssuntoPaiGUID(value: string | null) {
    this.#AssuntoPaiGUID = value && value.trim() ? value.trim() : null;
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

  get SubMateriaGlobalGUID(): string | null {
    return this.#SubMateriaGlobalGUID;
  }

  set SubMateriaGlobalGUID(value: string | null) {
    this.#SubMateriaGlobalGUID = value && value.trim() ? value.trim() : null;
  }

  get Origem(): AssuntoOrigem {
    return this.#Origem;
  }

  set Origem(value: AssuntoOrigem) {
    this.#Origem = value;
  }

  get CreatedAt(): Date | null {
    return this.#CreatedAt;
  }

  set CreatedAt(value: Date | null) {
    this.#CreatedAt = value ?? null;
  }
}
