/**
 * 🔔 Entidade UsuarioNotificacaoPreferencia
 *
 * Override esparso das preferências de canal (e-mail/whatsapp) do usuário
 * por tipo de notificação. Só existe linha quando o usuário muda o padrão
 * do catálogo (`notificacaotipo`) — ver docs/PLANO_IMPLEMENTACAO_NOTIFICACOES.md,
 * seção 2.5. Preferência é global por usuário, não por escola.
 */

export default class UsuarioNotificacaoPreferencia {
  #UsuarioCPF!: string;
  #NotificacaoTipoId!: number;
  #PreferenciaEmailAtivo!: boolean;
  #PreferenciaWhatsappAtivo!: boolean;
  #UpdatedAt!: Date;

  // ==================== GETTERS ====================

  get UsuarioCPF(): string {
    return this.#UsuarioCPF;
  }

  get NotificacaoTipoId(): number {
    return this.#NotificacaoTipoId;
  }

  get PreferenciaEmailAtivo(): boolean {
    return this.#PreferenciaEmailAtivo;
  }

  get PreferenciaWhatsappAtivo(): boolean {
    return this.#PreferenciaWhatsappAtivo;
  }

  get UpdatedAt(): Date {
    return this.#UpdatedAt;
  }

  // ==================== SETTERS ====================

  set UsuarioCPF(value: string) {
    if (typeof value !== "string") {
      throw new Error("UsuarioCPF deve ser uma string");
    }
    const cpfLimpo = value.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) {
      throw new Error("UsuarioCPF deve ter 11 dígitos");
    }
    this.#UsuarioCPF = value;
  }

  set NotificacaoTipoId(value: number) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error("NotificacaoTipoId deve ser um inteiro positivo");
    }
    this.#NotificacaoTipoId = value;
  }

  set PreferenciaEmailAtivo(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("PreferenciaEmailAtivo deve ser um booleano");
    }
    this.#PreferenciaEmailAtivo = value;
  }

  set PreferenciaWhatsappAtivo(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("PreferenciaWhatsappAtivo deve ser um booleano");
    }
    this.#PreferenciaWhatsappAtivo = value;
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
      UsuarioCPF: this.#UsuarioCPF,
      NotificacaoTipoId: this.#NotificacaoTipoId,
      PreferenciaEmailAtivo: this.#PreferenciaEmailAtivo,
      PreferenciaWhatsappAtivo: this.#PreferenciaWhatsappAtivo,
      UpdatedAt: this.#UpdatedAt,
    };
  }

  static fromPlainObject(data: any): UsuarioNotificacaoPreferencia {
    const preferencia = new UsuarioNotificacaoPreferencia();
    preferencia.UsuarioCPF = data.UsuarioCPF;
    preferencia.NotificacaoTipoId = data.NotificacaoTipoId;
    preferencia.PreferenciaEmailAtivo = Boolean(data.PreferenciaEmailAtivo);
    preferencia.PreferenciaWhatsappAtivo = Boolean(data.PreferenciaWhatsappAtivo);
    preferencia.UpdatedAt = data.UpdatedAt instanceof Date ? data.UpdatedAt : new Date(data.UpdatedAt);
    return preferencia;
  }
}
