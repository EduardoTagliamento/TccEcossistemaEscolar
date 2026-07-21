/**
 * 🗂️ Entidade RegistroAuditoria
 *
 * Uma linha por ação de escrita (Create/Update/Delete) relevante ocorrida
 * numa escola — quem fez, o quê, quando, em qual entidade. Sem diff campo a
 * campo (ver docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md, Seção 3.2/3.3
 * e decisão de negócio #4).
 *
 * EntidadeGUID é uma referência polimórfica sem FK de banco (mesmo padrão
 * de NotificacaoEntidadeTipo/GUID) — aponta pra matricula/pendencia/
 * evento/turma/etc.
 */

export type AcaoAuditoriaTipo = "Create" | "Update" | "Delete";

const ACOES_VALIDAS: AcaoAuditoriaTipo[] = ["Create", "Update", "Delete"];

export default class RegistroAuditoria {
  #RegistroAuditoriaGUID!: string;
  #EscolaGUID!: string;
  #UsuarioCPFAtor!: string;
  #AcaoTipo!: AcaoAuditoriaTipo;
  #EntidadeTipo!: string;
  #EntidadeGUID!: string;
  #EntidadeDescricao!: string | null;
  #CategoriaAuditoriaId!: number;
  #CreatedAt!: Date;

  // ==================== GETTERS ====================

  get RegistroAuditoriaGUID(): string {
    return this.#RegistroAuditoriaGUID;
  }

  get EscolaGUID(): string {
    return this.#EscolaGUID;
  }

  get UsuarioCPFAtor(): string {
    return this.#UsuarioCPFAtor;
  }

  get AcaoTipo(): AcaoAuditoriaTipo {
    return this.#AcaoTipo;
  }

  get EntidadeTipo(): string {
    return this.#EntidadeTipo;
  }

  get EntidadeGUID(): string {
    return this.#EntidadeGUID;
  }

  get EntidadeDescricao(): string | null {
    return this.#EntidadeDescricao;
  }

  get CategoriaAuditoriaId(): number {
    return this.#CategoriaAuditoriaId;
  }

  get CreatedAt(): Date {
    return this.#CreatedAt;
  }

  // ==================== SETTERS ====================

  set RegistroAuditoriaGUID(value: string) {
    if (typeof value !== "string") {
      throw new Error("RegistroAuditoriaGUID deve ser uma string");
    }
    const trimmed = value.trim();
    if (trimmed.length !== 36) {
      throw new Error("RegistroAuditoriaGUID deve ter 36 caracteres (UUID v4)");
    }
    this.#RegistroAuditoriaGUID = trimmed;
  }

  set EscolaGUID(value: string) {
    if (typeof value !== "string") {
      throw new Error("EscolaGUID deve ser uma string");
    }
    const trimmed = value.trim();
    if (trimmed.length !== 36) {
      throw new Error("EscolaGUID deve ter 36 caracteres (UUID v4)");
    }
    this.#EscolaGUID = trimmed;
  }

  set UsuarioCPFAtor(value: string) {
    if (typeof value !== "string") {
      throw new Error("UsuarioCPFAtor deve ser uma string");
    }
    const cpfLimpo = value.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) {
      throw new Error("UsuarioCPFAtor deve ter 11 dígitos");
    }
    this.#UsuarioCPFAtor = value;
  }

  set AcaoTipo(value: AcaoAuditoriaTipo) {
    if (!ACOES_VALIDAS.includes(value)) {
      throw new Error("AcaoTipo deve ser 'Create', 'Update' ou 'Delete'");
    }
    this.#AcaoTipo = value;
  }

  set EntidadeTipo(value: string) {
    if (typeof value !== "string") {
      throw new Error("EntidadeTipo deve ser uma string");
    }
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 60) {
      throw new Error("EntidadeTipo deve ter entre 1 e 60 caracteres");
    }
    this.#EntidadeTipo = trimmed;
  }

  set EntidadeGUID(value: string) {
    if (typeof value !== "string") {
      throw new Error("EntidadeGUID deve ser uma string");
    }
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 36) {
      throw new Error("EntidadeGUID deve ter entre 1 e 36 caracteres");
    }
    this.#EntidadeGUID = trimmed;
  }

  set EntidadeDescricao(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#EntidadeDescricao = null;
      return;
    }
    if (typeof value !== "string" || value.length > 255) {
      throw new Error("EntidadeDescricao deve ser uma string de até 255 caracteres");
    }
    this.#EntidadeDescricao = value;
  }

  set CategoriaAuditoriaId(value: number) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error("CategoriaAuditoriaId deve ser um inteiro positivo");
    }
    this.#CategoriaAuditoriaId = value;
  }

  set CreatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("CreatedAt deve ser uma data válida");
    }
    this.#CreatedAt = value;
  }

  // ==================== MÉTODOS ====================

  toJSON() {
    return {
      RegistroAuditoriaGUID: this.#RegistroAuditoriaGUID,
      EscolaGUID: this.#EscolaGUID,
      UsuarioCPFAtor: this.#UsuarioCPFAtor,
      AcaoTipo: this.#AcaoTipo,
      EntidadeTipo: this.#EntidadeTipo,
      EntidadeGUID: this.#EntidadeGUID,
      EntidadeDescricao: this.#EntidadeDescricao,
      CategoriaAuditoriaId: this.#CategoriaAuditoriaId,
      CreatedAt: this.#CreatedAt,
    };
  }

  static fromPlainObject(data: any): RegistroAuditoria {
    const registro = new RegistroAuditoria();
    registro.RegistroAuditoriaGUID = data.RegistroAuditoriaGUID;
    registro.EscolaGUID = data.EscolaGUID;
    registro.UsuarioCPFAtor = data.UsuarioCPFAtor;
    registro.AcaoTipo = data.AcaoTipo;
    registro.EntidadeTipo = data.EntidadeTipo;
    registro.EntidadeGUID = data.EntidadeGUID;
    registro.EntidadeDescricao = data.EntidadeDescricao ?? null;
    registro.CategoriaAuditoriaId = data.CategoriaAuditoriaId;
    registro.CreatedAt = data.CreatedAt instanceof Date ? data.CreatedAt : new Date(data.CreatedAt);
    return registro;
  }
}
