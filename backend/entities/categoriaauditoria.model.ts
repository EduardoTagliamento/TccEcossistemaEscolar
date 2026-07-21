/**
 * 🗂️ Entidade CategoriaAuditoria
 *
 * Catálogo estático de categorias de sensibilidade/retenção usado pelo
 * Registro de Auditoria (ver docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md,
 * Seção 3.1). Seed via migration, não editável pelo usuário na v1.
 */

export default class CategoriaAuditoria {
  #CategoriaAuditoriaId!: number;
  #CategoriaAuditoriaNome!: string;
  #CategoriaAuditoriaRetencaoDias!: number;
  #CategoriaAuditoriaDescricao!: string | null;

  // ==================== GETTERS ====================

  get CategoriaAuditoriaId(): number {
    return this.#CategoriaAuditoriaId;
  }

  get CategoriaAuditoriaNome(): string {
    return this.#CategoriaAuditoriaNome;
  }

  get CategoriaAuditoriaRetencaoDias(): number {
    return this.#CategoriaAuditoriaRetencaoDias;
  }

  get CategoriaAuditoriaDescricao(): string | null {
    return this.#CategoriaAuditoriaDescricao;
  }

  // ==================== SETTERS ====================

  set CategoriaAuditoriaId(value: number) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error("CategoriaAuditoriaId deve ser um inteiro positivo");
    }
    this.#CategoriaAuditoriaId = value;
  }

  set CategoriaAuditoriaNome(value: string) {
    if (typeof value !== "string") {
      throw new Error("CategoriaAuditoriaNome deve ser uma string");
    }
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 40) {
      throw new Error("CategoriaAuditoriaNome deve ter entre 1 e 40 caracteres");
    }
    this.#CategoriaAuditoriaNome = trimmed;
  }

  set CategoriaAuditoriaRetencaoDias(value: number) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error("CategoriaAuditoriaRetencaoDias deve ser um inteiro positivo");
    }
    this.#CategoriaAuditoriaRetencaoDias = value;
  }

  set CategoriaAuditoriaDescricao(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#CategoriaAuditoriaDescricao = null;
      return;
    }
    if (typeof value !== "string" || value.length > 255) {
      throw new Error("CategoriaAuditoriaDescricao deve ser uma string de até 255 caracteres");
    }
    this.#CategoriaAuditoriaDescricao = value;
  }

  // ==================== MÉTODOS ====================

  toJSON() {
    return {
      CategoriaAuditoriaId: this.#CategoriaAuditoriaId,
      CategoriaAuditoriaNome: this.#CategoriaAuditoriaNome,
      CategoriaAuditoriaRetencaoDias: this.#CategoriaAuditoriaRetencaoDias,
      CategoriaAuditoriaDescricao: this.#CategoriaAuditoriaDescricao,
    };
  }

  static fromPlainObject(data: any): CategoriaAuditoria {
    const categoria = new CategoriaAuditoria();
    categoria.CategoriaAuditoriaId = data.CategoriaAuditoriaId;
    categoria.CategoriaAuditoriaNome = data.CategoriaAuditoriaNome;
    categoria.CategoriaAuditoriaRetencaoDias = data.CategoriaAuditoriaRetencaoDias;
    categoria.CategoriaAuditoriaDescricao = data.CategoriaAuditoriaDescricao ?? null;
    return categoria;
  }
}
