/**
 * Vínculo 1:1 entre uma Turma e o grupo de WhatsApp dela — ver
 * docs/spec-resumo-ia-prova-grupo-whatsapp.md (repo interceptacaoAVA).
 * Nunca duas turmas linkadas ao mesmo grupo, nem uma turma com dois grupos
 * (UNIQUE nos dois lados no schema).
 */
export default class TurmaGrupoWhatsapp {
  #TurmaGrupoWhatsappGUID!: string;
  #TurmaGUID!: string;
  #GrupoWhatsappJID!: string;
  #CriadoPorBaua: boolean = false;
  #CriadoPorUsuarioGUID!: string;
  #CreatedAt!: Date;
  #UpdatedAt!: Date;

  constructor() {
    console.log("⬆️  TurmaGrupoWhatsapp.constructor()");
  }

  get TurmaGrupoWhatsappGUID(): string {
    return this.#TurmaGrupoWhatsappGUID;
  }

  set TurmaGrupoWhatsappGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("TurmaGrupoWhatsappGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#TurmaGrupoWhatsappGUID = value.trim();
  }

  get TurmaGUID(): string {
    return this.#TurmaGUID;
  }

  set TurmaGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("TurmaGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#TurmaGUID = value.trim();
  }

  get GrupoWhatsappJID(): string {
    return this.#GrupoWhatsappJID;
  }

  set GrupoWhatsappJID(value: string) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error("GrupoWhatsappJID é obrigatório.");
    }
    this.#GrupoWhatsappJID = value.trim();
  }

  get CriadoPorBaua(): boolean {
    return this.#CriadoPorBaua;
  }

  set CriadoPorBaua(value: boolean) {
    this.#CriadoPorBaua = !!value;
  }

  get CriadoPorUsuarioGUID(): string {
    return this.#CriadoPorUsuarioGUID;
  }

  set CriadoPorUsuarioGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("CriadoPorUsuarioGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#CriadoPorUsuarioGUID = value.trim();
  }

  get CreatedAt(): Date {
    return this.#CreatedAt;
  }

  set CreatedAt(value: Date) {
    this.#CreatedAt = value;
  }

  get UpdatedAt(): Date {
    return this.#UpdatedAt;
  }

  set UpdatedAt(value: Date) {
    this.#UpdatedAt = value;
  }

  validar(): void {
    if (!this.#TurmaGrupoWhatsappGUID) throw new Error("TurmaGrupoWhatsappGUID é obrigatório");
    if (!this.#TurmaGUID) throw new Error("TurmaGUID é obrigatório");
    if (!this.#GrupoWhatsappJID) throw new Error("GrupoWhatsappJID é obrigatório");
    if (!this.#CriadoPorUsuarioGUID) throw new Error("CriadoPorUsuarioGUID é obrigatório");
  }

  toJSON() {
    return {
      TurmaGrupoWhatsappGUID: this.#TurmaGrupoWhatsappGUID,
      TurmaGUID: this.#TurmaGUID,
      GrupoWhatsappJID: this.#GrupoWhatsappJID,
      CriadoPorBaua: this.#CriadoPorBaua,
      CriadoPorUsuarioGUID: this.#CriadoPorUsuarioGUID,
      CreatedAt: this.#CreatedAt,
      UpdatedAt: this.#UpdatedAt,
    };
  }

  static fromDatabase(data: any): TurmaGrupoWhatsapp {
    const vinculo = new TurmaGrupoWhatsapp();
    vinculo.TurmaGrupoWhatsappGUID = data.TurmaGrupoWhatsappGUID;
    vinculo.TurmaGUID = data.TurmaGUID;
    vinculo.GrupoWhatsappJID = data.GrupoWhatsappJID;
    vinculo.CriadoPorBaua = !!data.CriadoPorBaua;
    vinculo.CriadoPorUsuarioGUID = data.CriadoPorUsuarioGUID;
    vinculo.CreatedAt = data.CreatedAt;
    vinculo.UpdatedAt = data.UpdatedAt;
    return vinculo;
  }
}
