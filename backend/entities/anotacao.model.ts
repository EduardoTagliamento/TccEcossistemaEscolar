export interface Anotacao {
  AnotacaoGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string;
  AnotacaoData: Date;
  AnotacaoTitulo: string;
  AnotacaoDescricao: string | null;
  AnotacaoIsFeito: boolean;
  AnotacaoCreatedAt: Date;
  AnotacaoUpdatedAt: Date;
}

export interface AnotacaoCreateDTO {
  UsuarioCPF: string;
  EscolaGUID: string;
  AnotacaoData: string;                  // ISO string (frontend envia em GMT-3)
  AnotacaoTitulo: string;
  AnotacaoDescricao?: string;
}

export interface AnotacaoUpdateDTO {
  AnotacaoData?: string;
  AnotacaoTitulo?: string;
  AnotacaoDescricao?: string | null;
  AnotacaoIsFeito?: boolean;
}

export class AnotacaoEntity {
  #anotacaoGUID: string;
  #usuarioCPF: string;
  #escolaGUID: string;
  #anotacaoData: Date;
  #anotacaoTitulo: string;
  #anotacaoDescricao: string | null;
  #anotacaoIsFeito: boolean;
  #anotacaoCreatedAt: Date;
  #anotacaoUpdatedAt: Date;

  constructor(data: Anotacao) {
    this.#anotacaoGUID = data.AnotacaoGUID;
    this.#usuarioCPF = data.UsuarioCPF;
    this.#escolaGUID = data.EscolaGUID;
    this.#anotacaoData = data.AnotacaoData;
    this.#anotacaoTitulo = data.AnotacaoTitulo;
    this.#anotacaoDescricao = data.AnotacaoDescricao;
    this.#anotacaoIsFeito = data.AnotacaoIsFeito;
    this.#anotacaoCreatedAt = data.AnotacaoCreatedAt;
    this.#anotacaoUpdatedAt = data.AnotacaoUpdatedAt;
  }

  // Getters
  get anotacaoGUID(): string {
    return this.#anotacaoGUID;
  }

  get usuarioCPF(): string {
    return this.#usuarioCPF;
  }

  get escolaGUID(): string {
    return this.#escolaGUID;
  }

  get anotacaoData(): Date {
    return this.#anotacaoData;
  }

  get anotacaoTitulo(): string {
    return this.#anotacaoTitulo;
  }

  get anotacaoDescricao(): string | null {
    return this.#anotacaoDescricao;
  }

  get anotacaoIsFeito(): boolean {
    return this.#anotacaoIsFeito;
  }

  get anotacaoCreatedAt(): Date {
    return this.#anotacaoCreatedAt;
  }

  get anotacaoUpdatedAt(): Date {
    return this.#anotacaoUpdatedAt;
  }

  // Setters (para updates)
  set anotacaoData(value: Date) {
    this.#anotacaoData = value;
  }

  set anotacaoTitulo(value: string) {
    if (value.length > 256) {
      throw new Error('AnotacaoTitulo não pode exceder 256 caracteres');
    }
    this.#anotacaoTitulo = value;
  }

  set anotacaoDescricao(value: string | null) {
    if (value && value.length > 2048) {
      throw new Error('AnotacaoDescricao não pode exceder 2048 caracteres');
    }
    this.#anotacaoDescricao = value;
  }

  set anotacaoIsFeito(value: boolean) {
    this.#anotacaoIsFeito = value;
  }

  // Validações
  validar(): void {
    // UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(this.#anotacaoGUID)) {
      throw new Error('AnotacaoGUID inválido (deve ser UUID v4)');
    }

    // CPF
    const cpfLimpo = this.#usuarioCPF.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPF deve ter 11 dígitos');
    }

    // EscolaGUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.#escolaGUID)) {
      throw new Error('EscolaGUID inválido (deve ser UUID)');
    }

    // Titulo
    if (!this.#anotacaoTitulo || this.#anotacaoTitulo.trim().length === 0) {
      throw new Error('AnotacaoTitulo é obrigatório');
    }
    if (this.#anotacaoTitulo.length > 256) {
      throw new Error('AnotacaoTitulo não pode exceder 256 caracteres');
    }

    // Descrição (opcional, mas se existir...)
    if (this.#anotacaoDescricao && this.#anotacaoDescricao.length > 2048) {
      throw new Error('AnotacaoDescricao não pode exceder 2048 caracteres');
    }

    // Data
    if (!(this.#anotacaoData instanceof Date) || isNaN(this.#anotacaoData.getTime())) {
      throw new Error('AnotacaoData inválida');
    }
  }

  // Serialização
  toJSON(): Anotacao {
    return {
      AnotacaoGUID: this.#anotacaoGUID,
      UsuarioCPF: this.#usuarioCPF,
      EscolaGUID: this.#escolaGUID,
      AnotacaoData: this.#anotacaoData,
      AnotacaoTitulo: this.#anotacaoTitulo,
      AnotacaoDescricao: this.#anotacaoDescricao,
      AnotacaoIsFeito: this.#anotacaoIsFeito,
      AnotacaoCreatedAt: this.#anotacaoCreatedAt,
      AnotacaoUpdatedAt: this.#anotacaoUpdatedAt
    };
  }
}
