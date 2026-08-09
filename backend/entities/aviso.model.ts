export type AvisoAbrangencia = 'Escola' | 'Turmas';

export interface Aviso {
  AvisoGUID: string;
  EscolaGUID: string;
  UsuarioCPFAutor: string;
  AvisoTitulo: string;
  AvisoConteudo: string;
  AvisoAbrangencia: AvisoAbrangencia;
  AvisoCreatedAt: Date;
}

export interface AvisoCreateDTO {
  EscolaGUID: string;
  UsuarioCPFAutor: string;
  AvisoTitulo: string;
  AvisoConteudo: string;
  AvisoAbrangencia: AvisoAbrangencia;
  TurmaGUIDs?: string[];
  AnexoGUIDs?: string[];
}

export class AvisoEntity {
  #avisoGUID: string;
  #escolaGUID: string;
  #usuarioCPFAutor: string;
  #avisoTitulo: string;
  #avisoConteudo: string;
  #avisoAbrangencia: AvisoAbrangencia;
  #avisoCreatedAt: Date;

  constructor(data: Aviso) {
    this.#avisoGUID = data.AvisoGUID;
    this.#escolaGUID = data.EscolaGUID;
    this.#usuarioCPFAutor = data.UsuarioCPFAutor;
    this.#avisoTitulo = data.AvisoTitulo;
    this.#avisoConteudo = data.AvisoConteudo;
    this.#avisoAbrangencia = data.AvisoAbrangencia;
    this.#avisoCreatedAt = data.AvisoCreatedAt;
  }

  // Getters
  get avisoGUID(): string {
    return this.#avisoGUID;
  }

  get escolaGUID(): string {
    return this.#escolaGUID;
  }

  get usuarioCPFAutor(): string {
    return this.#usuarioCPFAutor;
  }

  get avisoTitulo(): string {
    return this.#avisoTitulo;
  }

  get avisoConteudo(): string {
    return this.#avisoConteudo;
  }

  get avisoAbrangencia(): AvisoAbrangencia {
    return this.#avisoAbrangencia;
  }

  get avisoCreatedAt(): Date {
    return this.#avisoCreatedAt;
  }

  // Validações
  validar(): void {
    const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!GUID_REGEX.test(this.#avisoGUID)) {
      throw new Error('AvisoGUID inválido (deve ser UUID)');
    }

    if (!GUID_REGEX.test(this.#escolaGUID)) {
      throw new Error('EscolaGUID inválido (deve ser UUID)');
    }

    const cpfLimpo = this.#usuarioCPFAutor.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPFAutor deve ter 11 dígitos');
    }

    if (!this.#avisoTitulo || this.#avisoTitulo.trim().length === 0) {
      throw new Error('AvisoTitulo é obrigatório');
    }
    if (this.#avisoTitulo.length > 150) {
      throw new Error('AvisoTitulo não pode exceder 150 caracteres');
    }

    if (!this.#avisoConteudo || this.#avisoConteudo.trim().length === 0) {
      throw new Error('AvisoConteudo é obrigatório');
    }

    if (this.#avisoAbrangencia !== 'Escola' && this.#avisoAbrangencia !== 'Turmas') {
      throw new Error('AvisoAbrangencia deve ser "Escola" ou "Turmas"');
    }

    if (!(this.#avisoCreatedAt instanceof Date) || isNaN(this.#avisoCreatedAt.getTime())) {
      throw new Error('AvisoCreatedAt inválido');
    }
  }

  // Serialização
  toJSON(): Aviso {
    return {
      AvisoGUID: this.#avisoGUID,
      EscolaGUID: this.#escolaGUID,
      UsuarioCPFAutor: this.#usuarioCPFAutor,
      AvisoTitulo: this.#avisoTitulo,
      AvisoConteudo: this.#avisoConteudo,
      AvisoAbrangencia: this.#avisoAbrangencia,
      AvisoCreatedAt: this.#avisoCreatedAt,
    };
  }
}
