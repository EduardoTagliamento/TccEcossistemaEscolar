/**
 * 📅 Entity - Evento
 * 
 * Representa eventos da escola (reuniões, festas, palestras, etc.)
 * 
 * Campos:
 * - EventoGUID: Identificador único (UUID v4)
 * - EscolaGUID: Escola organizadora
 * - UsuarioCPF: CPF de quem criou o evento (coluna NOT NULL/FK já existente
 *   na tabela `evento` em produção, sem correspondente na entidade até
 *   2026-07-22 — ver backend/database/migrations/2026-07-22-fix-evento-schema.sql)
 * - EventoTitulo: Nome do evento (3-128 caracteres)
 * - EventoDescricao: Detalhes do evento (opcional, 0-1024 caracteres)
 * - EventoData: Data e hora do evento
 * - EventoStatus: Status do evento (Agendado, Realizado, Cancelado)
 * - EventoCreatedAt: Data de criação
 * - EventoUpdatedAt: Data de atualização
 */

export default class Evento {
  #EventoGUID: string;
  #EscolaGUID: string;
  #UsuarioCPF: string;
  #EventoTitulo: string;
  #EventoDescricao: string | null;
  #EventoData: Date;
  #EventoStatus: "Agendado" | "Realizado" | "Cancelado";
  #EventoCreatedAt: Date;
  #EventoUpdatedAt: Date;

  constructor(
    EventoGUID: string,
    EscolaGUID: string,
    UsuarioCPF: string,
    EventoTitulo: string,
    EventoDescricao: string | null,
    EventoData: Date,
    EventoStatus: "Agendado" | "Realizado" | "Cancelado",
    EventoCreatedAt: Date,
    EventoUpdatedAt: Date
  ) {
    this.#EventoGUID = EventoGUID;
    this.#EscolaGUID = EscolaGUID;
    this.#UsuarioCPF = UsuarioCPF;
    this.#EventoTitulo = EventoTitulo;
    this.#EventoDescricao = EventoDescricao;
    this.#EventoData = EventoData;
    this.#EventoStatus = EventoStatus;
    this.#EventoCreatedAt = EventoCreatedAt;
    this.#EventoUpdatedAt = EventoUpdatedAt;
  }

  // ==================== GETTERS ====================

  get EventoGUID(): string {
    return this.#EventoGUID;
  }

  get EscolaGUID(): string {
    return this.#EscolaGUID;
  }

  get UsuarioCPF(): string {
    return this.#UsuarioCPF;
  }

  get EventoTitulo(): string {
    return this.#EventoTitulo;
  }

  get EventoDescricao(): string | null {
    return this.#EventoDescricao;
  }

  get EventoData(): Date {
    return this.#EventoData;
  }

  get EventoStatus(): "Agendado" | "Realizado" | "Cancelado" {
    return this.#EventoStatus;
  }

  get EventoCreatedAt(): Date {
    return this.#EventoCreatedAt;
  }

  get EventoUpdatedAt(): Date {
    return this.#EventoUpdatedAt;
  }

  // ==================== SETTERS ====================

  set EventoTitulo(titulo: string) {
    if (titulo.trim().length < 3 || titulo.trim().length > 128) {
      throw new Error("EventoTitulo deve ter entre 3 e 128 caracteres");
    }
    this.#EventoTitulo = titulo.trim();
  }

  set EventoDescricao(descricao: string | null) {
    if (descricao !== null && descricao.trim().length > 1024) {
      throw new Error("EventoDescricao deve ter no máximo 1024 caracteres");
    }
    this.#EventoDescricao = descricao === null ? null : descricao.trim();
  }

  set EventoData(data: Date) {
    if (!(data instanceof Date) || isNaN(data.getTime())) {
      throw new Error("EventoData deve ser uma data válida");
    }
    this.#EventoData = data;
  }

  set EventoStatus(status: "Agendado" | "Realizado" | "Cancelado") {
    const statusValidos: Array<"Agendado" | "Realizado" | "Cancelado"> = [
      "Agendado",
      "Realizado",
      "Cancelado"
    ];
    if (!statusValidos.includes(status)) {
      throw new Error("EventoStatus deve ser Agendado, Realizado ou Cancelado");
    }
    this.#EventoStatus = status;
  }

  set EventoUpdatedAt(data: Date) {
    this.#EventoUpdatedAt = data;
  }

  // ==================== MÉTODOS ====================

  /**
   * Validar entidade antes de salvar no banco
   */
  validar(): void {
    // GUID
    if (!this.#EventoGUID || this.#EventoGUID.length !== 36) {
      throw new Error("EventoGUID inválido (deve ser UUID v4)");
    }

    if (!this.#EscolaGUID || this.#EscolaGUID.length !== 36) {
      throw new Error("EscolaGUID inválido (deve ser UUID v4)");
    }

    if (!this.#UsuarioCPF) {
      throw new Error("UsuarioCPF (criador do evento) é obrigatório");
    }

    // Título
    if (!this.#EventoTitulo || this.#EventoTitulo.trim().length < 3) {
      throw new Error("EventoTitulo deve ter no mínimo 3 caracteres");
    }

    if (this.#EventoTitulo.trim().length > 128) {
      throw new Error("EventoTitulo deve ter no máximo 128 caracteres");
    }

    // Descrição
    if (this.#EventoDescricao !== null && this.#EventoDescricao.trim().length > 1024) {
      throw new Error("EventoDescricao deve ter no máximo 1024 caracteres");
    }

    // Data
    if (!(this.#EventoData instanceof Date) || isNaN(this.#EventoData.getTime())) {
      throw new Error("EventoData deve ser uma data válida");
    }

    // Status
    const statusValidos: Array<"Agendado" | "Realizado" | "Cancelado"> = [
      "Agendado",
      "Realizado",
      "Cancelado"
    ];
    if (!statusValidos.includes(this.#EventoStatus)) {
      throw new Error("EventoStatus deve ser Agendado, Realizado ou Cancelado");
    }
  }

  /**
   * Marcar evento como realizado
   */
  marcarComoRealizado(): void {
    this.#EventoStatus = "Realizado";
    this.#EventoUpdatedAt = new Date();
  }

  /**
   * Cancelar evento
   */
  cancelar(): void {
    this.#EventoStatus = "Cancelado";
    this.#EventoUpdatedAt = new Date();
  }

  /**
   * Verificar se evento já aconteceu
   */
  jaAconteceu(): boolean {
    return this.#EventoData < new Date();
  }

  /**
   * Converter para JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      EventoGUID: this.#EventoGUID,
      EscolaGUID: this.#EscolaGUID,
      UsuarioCPF: this.#UsuarioCPF,
      EventoTitulo: this.#EventoTitulo,
      EventoDescricao: this.#EventoDescricao,
      EventoData: this.#EventoData,
      EventoStatus: this.#EventoStatus,
      EventoCreatedAt: this.#EventoCreatedAt,
      EventoUpdatedAt: this.#EventoUpdatedAt
    };
  }

  /**
   * Criar instância a partir de objeto simples
   */
  static fromPlainObject(obj: any): Evento {
    return new Evento(
      obj.EventoGUID,
      obj.EscolaGUID,
      obj.UsuarioCPF,
      obj.EventoTitulo,
      obj.EventoDescricao ?? null,
      new Date(obj.EventoData),
      obj.EventoStatus,
      new Date(obj.EventoCreatedAt),
      new Date(obj.EventoUpdatedAt)
    );
  }
}
