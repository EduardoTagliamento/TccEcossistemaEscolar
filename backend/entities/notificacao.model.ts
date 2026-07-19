/**
 * 🔔 Entidade Notificacao
 *
 * Feed in-app de notificações — uma linha por destinatário por evento
 * disparado (ver docs/PLANO_IMPLEMENTACAO_NOTIFICACOES.md, seção 2.3).
 *
 * Regras de negócio:
 * - Sempre criada independentemente das preferências de canal do usuário
 *   (canal é só sobre e-mail/whatsapp; o feed in-app é sempre populado)
 * - NotificacaoEntidadeTipo/GUID é uma referência polimórfica sem FK de
 *   banco (mesmo padrão de RelacaoAnexos), aponta pra tarefa/prova/evento/etc.
 */

export default class Notificacao {
  #NotificacaoGUID!: string;
  #NotificacaoTipoId!: number;
  #UsuarioCPF!: string;
  #EscolaGUID!: string;
  #NotificacaoTitulo!: string;
  #NotificacaoConteudo!: string | null;
  #NotificacaoEntidadeTipo!: string | null;
  #NotificacaoEntidadeGUID!: string | null;
  #NotificacaoLink!: string | null;
  #NotificacaoLida!: boolean;
  #NotificacaoLidaData!: Date | null;
  #NotificacaoCreatedAt!: Date;

  // ==================== GETTERS ====================

  get NotificacaoGUID(): string {
    return this.#NotificacaoGUID;
  }

  get NotificacaoTipoId(): number {
    return this.#NotificacaoTipoId;
  }

  get UsuarioCPF(): string {
    return this.#UsuarioCPF;
  }

  get EscolaGUID(): string {
    return this.#EscolaGUID;
  }

  get NotificacaoTitulo(): string {
    return this.#NotificacaoTitulo;
  }

  get NotificacaoConteudo(): string | null {
    return this.#NotificacaoConteudo;
  }

  get NotificacaoEntidadeTipo(): string | null {
    return this.#NotificacaoEntidadeTipo;
  }

  get NotificacaoEntidadeGUID(): string | null {
    return this.#NotificacaoEntidadeGUID;
  }

  get NotificacaoLink(): string | null {
    return this.#NotificacaoLink;
  }

  get NotificacaoLida(): boolean {
    return this.#NotificacaoLida;
  }

  get NotificacaoLidaData(): Date | null {
    return this.#NotificacaoLidaData;
  }

  get NotificacaoCreatedAt(): Date {
    return this.#NotificacaoCreatedAt;
  }

  // ==================== SETTERS ====================

  set NotificacaoGUID(value: string) {
    if (typeof value !== "string") {
      throw new Error("NotificacaoGUID deve ser uma string");
    }
    const trimmed = value.trim();
    if (trimmed.length !== 36) {
      throw new Error("NotificacaoGUID deve ter 36 caracteres (UUID v4)");
    }
    this.#NotificacaoGUID = trimmed;
  }

  set NotificacaoTipoId(value: number) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error("NotificacaoTipoId deve ser um inteiro positivo");
    }
    this.#NotificacaoTipoId = value;
  }

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

  set NotificacaoTitulo(value: string) {
    if (typeof value !== "string") {
      throw new Error("NotificacaoTitulo deve ser uma string");
    }
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 150) {
      throw new Error("NotificacaoTitulo deve ter entre 1 e 150 caracteres");
    }
    this.#NotificacaoTitulo = trimmed;
  }

  set NotificacaoConteudo(value: string | null) {
    if (value === null || value === undefined) {
      this.#NotificacaoConteudo = null;
      return;
    }
    if (typeof value !== "string") {
      throw new Error("NotificacaoConteudo deve ser uma string ou null");
    }
    const trimmed = value.trim();
    if (trimmed.length > 500) {
      throw new Error("NotificacaoConteudo deve ter no máximo 500 caracteres");
    }
    this.#NotificacaoConteudo = trimmed.length > 0 ? trimmed : null;
  }

  set NotificacaoEntidadeTipo(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#NotificacaoEntidadeTipo = null;
      return;
    }
    if (typeof value !== "string" || value.length > 40) {
      throw new Error("NotificacaoEntidadeTipo deve ser uma string de até 40 caracteres");
    }
    this.#NotificacaoEntidadeTipo = value;
  }

  set NotificacaoEntidadeGUID(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#NotificacaoEntidadeGUID = null;
      return;
    }
    if (typeof value !== "string" || value.length > 36) {
      throw new Error("NotificacaoEntidadeGUID deve ser uma string de até 36 caracteres");
    }
    this.#NotificacaoEntidadeGUID = value;
  }

  set NotificacaoLink(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#NotificacaoLink = null;
      return;
    }
    if (typeof value !== "string" || value.length > 255) {
      throw new Error("NotificacaoLink deve ser uma string de até 255 caracteres");
    }
    this.#NotificacaoLink = value;
  }

  set NotificacaoLida(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("NotificacaoLida deve ser um booleano");
    }
    this.#NotificacaoLida = value;
  }

  set NotificacaoLidaData(value: Date | null) {
    if (value === null || value === undefined) {
      this.#NotificacaoLidaData = null;
      return;
    }
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("NotificacaoLidaData deve ser uma data válida ou null");
    }
    this.#NotificacaoLidaData = value;
  }

  set NotificacaoCreatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("NotificacaoCreatedAt deve ser uma data válida");
    }
    this.#NotificacaoCreatedAt = value;
  }

  // ==================== MÉTODOS ====================

  marcarComoLida(): void {
    this.#NotificacaoLida = true;
    this.#NotificacaoLidaData = new Date();
  }

  toJSON() {
    return {
      NotificacaoGUID: this.#NotificacaoGUID,
      NotificacaoTipoId: this.#NotificacaoTipoId,
      UsuarioCPF: this.#UsuarioCPF,
      EscolaGUID: this.#EscolaGUID,
      NotificacaoTitulo: this.#NotificacaoTitulo,
      NotificacaoConteudo: this.#NotificacaoConteudo,
      NotificacaoEntidadeTipo: this.#NotificacaoEntidadeTipo,
      NotificacaoEntidadeGUID: this.#NotificacaoEntidadeGUID,
      NotificacaoLink: this.#NotificacaoLink,
      NotificacaoLida: this.#NotificacaoLida,
      NotificacaoLidaData: this.#NotificacaoLidaData,
      NotificacaoCreatedAt: this.#NotificacaoCreatedAt,
    };
  }

  static fromPlainObject(data: any): Notificacao {
    const notificacao = new Notificacao();
    notificacao.NotificacaoGUID = data.NotificacaoGUID;
    notificacao.NotificacaoTipoId = data.NotificacaoTipoId;
    notificacao.UsuarioCPF = data.UsuarioCPF;
    notificacao.EscolaGUID = data.EscolaGUID;
    notificacao.NotificacaoTitulo = data.NotificacaoTitulo;
    notificacao.NotificacaoConteudo = data.NotificacaoConteudo ?? null;
    notificacao.NotificacaoEntidadeTipo = data.NotificacaoEntidadeTipo ?? null;
    notificacao.NotificacaoEntidadeGUID = data.NotificacaoEntidadeGUID ?? null;
    notificacao.NotificacaoLink = data.NotificacaoLink ?? null;
    notificacao.NotificacaoLida = Boolean(data.NotificacaoLida);
    notificacao.NotificacaoLidaData = data.NotificacaoLidaData
      ? (data.NotificacaoLidaData instanceof Date ? data.NotificacaoLidaData : new Date(data.NotificacaoLidaData))
      : null;
    notificacao.NotificacaoCreatedAt = data.NotificacaoCreatedAt instanceof Date
      ? data.NotificacaoCreatedAt
      : new Date(data.NotificacaoCreatedAt);
    return notificacao;
  }
}
