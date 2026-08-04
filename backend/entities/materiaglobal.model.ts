/**
 * Taxonomia global de matéria (cross-escola) — ponte pro banco de questões
 * universal (Fase 3), já que `Materia` é escopada por `EscolaGUID` (spec
 * item 14). `Status='Pendente'` quando formalizada automaticamente sem
 * match (spec item 16); `'Confirmado'` quando curada pela plataforma ou
 * confirmada manualmente.
 */
export type MateriaGlobalStatus = "Pendente" | "Confirmado";

export default class MateriaGlobal {
  #MateriaGlobalGUID!: string;
  #Nome!: string;
  #Status: MateriaGlobalStatus = "Confirmado";
  #CreatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  MateriaGlobal.constructor()");
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

  get Status(): MateriaGlobalStatus {
    return this.#Status;
  }

  set Status(value: MateriaGlobalStatus) {
    this.#Status = value;
  }

  get CreatedAt(): Date | null {
    return this.#CreatedAt;
  }

  set CreatedAt(value: Date | null) {
    this.#CreatedAt = value ?? null;
  }
}
