export default class Mensagem {
  #MensagemGUID!: string;
  #ConversaGUID!: string;
  #MensagemRemetenteCPF!: string;
  #MensagemConteudo!: string;
  #MensagemTipo!: 'Texto' | 'Arquivo' | 'Imagem';
  #MensagemCreatedAt!: Date;
  #MensagemDeletedAt: Date | null = null;
  #MensagemEditadaAt: Date | null = null;

  constructor() {
    console.log('⬆️  Mensagem.constructor()');
  }

  get MensagemGUID(): string { return this.#MensagemGUID; }
  get ConversaGUID(): string { return this.#ConversaGUID; }
  get MensagemRemetenteCPF(): string { return this.#MensagemRemetenteCPF; }
  get MensagemConteudo(): string { return this.#MensagemConteudo; }
  get MensagemTipo(): 'Texto' | 'Arquivo' | 'Imagem' { return this.#MensagemTipo; }
  get MensagemCreatedAt(): Date { return this.#MensagemCreatedAt; }
  get MensagemDeletedAt(): Date | null { return this.#MensagemDeletedAt; }
  get MensagemEditadaAt(): Date | null { return this.#MensagemEditadaAt; }

  set MensagemGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('MensagemGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#MensagemGUID = value.trim();
  }

  set ConversaGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('ConversaGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#ConversaGUID = value.trim();
  }

  set MensagemRemetenteCPF(value: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('MensagemRemetenteCPF não pode ser vazio');
    }
    this.#MensagemRemetenteCPF = value.trim();
  }

  set MensagemConteudo(value: string) {
    if (typeof value !== 'string') throw new Error('MensagemConteudo deve ser uma string');
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 4000) {
      throw new Error('MensagemConteudo deve ter entre 1 e 4000 caracteres');
    }
    this.#MensagemConteudo = trimmed;
  }

  set MensagemTipo(value: 'Texto' | 'Arquivo' | 'Imagem') {
    if (!['Texto', 'Arquivo', 'Imagem'].includes(value)) {
      throw new Error('MensagemTipo deve ser "Texto", "Arquivo" ou "Imagem"');
    }
    this.#MensagemTipo = value;
  }

  set MensagemCreatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('MensagemCreatedAt deve ser uma data válida');
    }
    this.#MensagemCreatedAt = value;
  }

  set MensagemDeletedAt(value: Date | null) {
    if (value !== null && (!(value instanceof Date) || isNaN(value.getTime()))) {
      throw new Error('MensagemDeletedAt deve ser uma data válida ou null');
    }
    this.#MensagemDeletedAt = value;
  }

  set MensagemEditadaAt(value: Date | null) {
    if (value !== null && (!(value instanceof Date) || isNaN(value.getTime()))) {
      throw new Error('MensagemEditadaAt deve ser uma data válida ou null');
    }
    this.#MensagemEditadaAt = value;
  }

  toJSON() {
    return {
      MensagemGUID: this.#MensagemGUID,
      ConversaGUID: this.#ConversaGUID,
      MensagemRemetenteCPF: this.#MensagemRemetenteCPF,
      MensagemConteudo: this.#MensagemConteudo,
      MensagemTipo: this.#MensagemTipo,
      MensagemCreatedAt: this.#MensagemCreatedAt.toISOString(),
      MensagemDeletedAt: this.#MensagemDeletedAt?.toISOString() ?? null,
      MensagemEditadaAt: this.#MensagemEditadaAt?.toISOString() ?? null,
    };
  }

  static fromDatabase(data: any): Mensagem {
    const m = new Mensagem();
    m.MensagemGUID = data.MensagemGUID;
    m.ConversaGUID = data.ConversaGUID;
    m.MensagemRemetenteCPF = data.MensagemRemetenteCPF;
    m.MensagemConteudo = data.MensagemConteudo;
    m.MensagemTipo = data.MensagemTipo;
    m.MensagemCreatedAt = data.MensagemCreatedAt;
    m.MensagemDeletedAt = data.MensagemDeletedAt ?? null;
    m.MensagemEditadaAt = data.MensagemEditadaAt ?? null;
    return m;
  }
}
