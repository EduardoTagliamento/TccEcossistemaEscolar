export default class Conversa {
  #ConversaGUID!: string;
  #ConversaTipo!: 'Individual' | 'Grupo';
  #ConversaStatus!: 'Ativa' | 'Inativa';
  #ConversaCreatedAt!: Date;
  #ConversaUpdatedAt!: Date;

  constructor() {
    console.log('⬆️  Conversa.constructor()');
  }

  get ConversaGUID(): string { return this.#ConversaGUID; }
  get ConversaTipo(): 'Individual' | 'Grupo' { return this.#ConversaTipo; }
  get ConversaStatus(): 'Ativa' | 'Inativa' { return this.#ConversaStatus; }
  get ConversaCreatedAt(): Date { return this.#ConversaCreatedAt; }
  get ConversaUpdatedAt(): Date { return this.#ConversaUpdatedAt; }

  set ConversaGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('ConversaGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#ConversaGUID = value.trim();
  }

  set ConversaTipo(value: 'Individual' | 'Grupo') {
    if (value !== 'Individual' && value !== 'Grupo') {
      throw new Error('ConversaTipo deve ser "Individual" ou "Grupo"');
    }
    this.#ConversaTipo = value;
  }

  set ConversaStatus(value: 'Ativa' | 'Inativa') {
    if (value !== 'Ativa' && value !== 'Inativa') {
      throw new Error('ConversaStatus deve ser "Ativa" ou "Inativa"');
    }
    this.#ConversaStatus = value;
  }

  set ConversaCreatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('ConversaCreatedAt deve ser uma data válida');
    }
    this.#ConversaCreatedAt = value;
  }

  set ConversaUpdatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('ConversaUpdatedAt deve ser uma data válida');
    }
    this.#ConversaUpdatedAt = value;
  }

  toJSON() {
    return {
      ConversaGUID: this.#ConversaGUID,
      ConversaTipo: this.#ConversaTipo,
      ConversaStatus: this.#ConversaStatus,
      ConversaCreatedAt: this.#ConversaCreatedAt.toISOString(),
      ConversaUpdatedAt: this.#ConversaUpdatedAt.toISOString(),
    };
  }

  static fromDatabase(data: any): Conversa {
    const c = new Conversa();
    c.ConversaGUID = data.ConversaGUID;
    c.ConversaTipo = data.ConversaTipo;
    c.ConversaStatus = data.ConversaStatus;
    c.ConversaCreatedAt = data.ConversaCreatedAt;
    c.ConversaUpdatedAt = data.ConversaUpdatedAt;
    return c;
  }
}
