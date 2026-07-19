/**
 * 🔔 Entidade NotificacaoTipo
 *
 * Catálogo estático dos tipos de notificação existentes no sistema
 * (ver docs/PLANO_IMPLEMENTACAO_NOTIFICACOES.md, seção 2.6).
 *
 * Regras de negócio:
 * - NotificacaoTipoSlug é o identificador usado no código (NotificacaoService.disparar)
 * - NotificacaoTipoCategoria distingue Aviso (disparado por ação) de Lembrete (disparado por cron)
 * - NotificacaoTipoEmailPadrao/WhatsappPadrao são os valores usados quando o usuário
 *   não tem override em usuarionotificacaopreferencia
 */

export type NotificacaoTipoCategoria = "Aviso" | "Lembrete";

export default class NotificacaoTipo {
  #NotificacaoTipoId!: number;
  #NotificacaoTipoSlug!: string;
  #NotificacaoTipoDescricao!: string;
  #NotificacaoTipoCategoria!: NotificacaoTipoCategoria;
  #NotificacaoTipoEmailPadrao!: boolean;
  #NotificacaoTipoWhatsappPadrao!: boolean;
  #NotificacaoTipoAtivo!: boolean;
  #CreatedAt!: Date;
  #UpdatedAt!: Date;

  // ==================== GETTERS ====================

  get NotificacaoTipoId(): number {
    return this.#NotificacaoTipoId;
  }

  get NotificacaoTipoSlug(): string {
    return this.#NotificacaoTipoSlug;
  }

  get NotificacaoTipoDescricao(): string {
    return this.#NotificacaoTipoDescricao;
  }

  get NotificacaoTipoCategoria(): NotificacaoTipoCategoria {
    return this.#NotificacaoTipoCategoria;
  }

  get NotificacaoTipoEmailPadrao(): boolean {
    return this.#NotificacaoTipoEmailPadrao;
  }

  get NotificacaoTipoWhatsappPadrao(): boolean {
    return this.#NotificacaoTipoWhatsappPadrao;
  }

  get NotificacaoTipoAtivo(): boolean {
    return this.#NotificacaoTipoAtivo;
  }

  get CreatedAt(): Date {
    return this.#CreatedAt;
  }

  get UpdatedAt(): Date {
    return this.#UpdatedAt;
  }

  // ==================== SETTERS ====================

  set NotificacaoTipoId(value: number) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error("NotificacaoTipoId deve ser um inteiro positivo");
    }
    this.#NotificacaoTipoId = value;
  }

  set NotificacaoTipoSlug(value: string) {
    if (typeof value !== "string") {
      throw new Error("NotificacaoTipoSlug deve ser uma string");
    }
    const trimmed = value.trim();
    if (trimmed.length < 3 || trimmed.length > 50) {
      throw new Error("NotificacaoTipoSlug deve ter entre 3 e 50 caracteres");
    }
    this.#NotificacaoTipoSlug = trimmed;
  }

  set NotificacaoTipoDescricao(value: string) {
    if (typeof value !== "string") {
      throw new Error("NotificacaoTipoDescricao deve ser uma string");
    }
    const trimmed = value.trim();
    if (trimmed.length < 3 || trimmed.length > 150) {
      throw new Error("NotificacaoTipoDescricao deve ter entre 3 e 150 caracteres");
    }
    this.#NotificacaoTipoDescricao = trimmed;
  }

  set NotificacaoTipoCategoria(value: NotificacaoTipoCategoria) {
    if (value !== "Aviso" && value !== "Lembrete") {
      throw new Error("NotificacaoTipoCategoria deve ser 'Aviso' ou 'Lembrete'");
    }
    this.#NotificacaoTipoCategoria = value;
  }

  set NotificacaoTipoEmailPadrao(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("NotificacaoTipoEmailPadrao deve ser um booleano");
    }
    this.#NotificacaoTipoEmailPadrao = value;
  }

  set NotificacaoTipoWhatsappPadrao(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("NotificacaoTipoWhatsappPadrao deve ser um booleano");
    }
    this.#NotificacaoTipoWhatsappPadrao = value;
  }

  set NotificacaoTipoAtivo(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("NotificacaoTipoAtivo deve ser um booleano");
    }
    this.#NotificacaoTipoAtivo = value;
  }

  set CreatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("CreatedAt deve ser uma data válida");
    }
    this.#CreatedAt = value;
  }

  set UpdatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("UpdatedAt deve ser uma data válida");
    }
    this.#UpdatedAt = value;
  }

  // ==================== MÉTODOS ====================

  toJSON() {
    return {
      NotificacaoTipoId: this.#NotificacaoTipoId,
      NotificacaoTipoSlug: this.#NotificacaoTipoSlug,
      NotificacaoTipoDescricao: this.#NotificacaoTipoDescricao,
      NotificacaoTipoCategoria: this.#NotificacaoTipoCategoria,
      NotificacaoTipoEmailPadrao: this.#NotificacaoTipoEmailPadrao,
      NotificacaoTipoWhatsappPadrao: this.#NotificacaoTipoWhatsappPadrao,
      NotificacaoTipoAtivo: this.#NotificacaoTipoAtivo,
      CreatedAt: this.#CreatedAt,
      UpdatedAt: this.#UpdatedAt,
    };
  }

  static fromPlainObject(data: any): NotificacaoTipo {
    const tipo = new NotificacaoTipo();
    tipo.NotificacaoTipoId = data.NotificacaoTipoId;
    tipo.NotificacaoTipoSlug = data.NotificacaoTipoSlug;
    tipo.NotificacaoTipoDescricao = data.NotificacaoTipoDescricao;
    tipo.NotificacaoTipoCategoria = data.NotificacaoTipoCategoria;
    tipo.NotificacaoTipoEmailPadrao = Boolean(data.NotificacaoTipoEmailPadrao);
    tipo.NotificacaoTipoWhatsappPadrao = Boolean(data.NotificacaoTipoWhatsappPadrao);
    tipo.NotificacaoTipoAtivo = Boolean(data.NotificacaoTipoAtivo);
    tipo.CreatedAt = data.CreatedAt instanceof Date ? data.CreatedAt : new Date(data.CreatedAt);
    tipo.UpdatedAt = data.UpdatedAt instanceof Date ? data.UpdatedAt : new Date(data.UpdatedAt);
    return tipo;
  }
}
