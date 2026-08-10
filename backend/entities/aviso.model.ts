export type AvisoAbrangencia = 'Escola' | 'Turmas';

export interface Aviso {
  AvisoGUID: string;
  EscolaGUID: string;
  UsuarioGUIDAutor: string;
  AvisoTitulo: string;
  AvisoConteudo: string;
  AvisoAbrangencia: AvisoAbrangencia;
  AvisoCreatedAt: Date;
}

export interface AvisoCreateDTO {
  EscolaGUID: string;
  UsuarioGUIDAutor: string;
  AvisoTitulo: string;
  AvisoConteudo: string;
  AvisoAbrangencia: AvisoAbrangencia;
  TurmaGUIDs?: string[];
  AnexoGUIDs?: string[];
}

export class AvisoEntity {
  #avisoGUID: string;
  #escolaGUID: string;
  #usuarioGUIDAutor: string;
  #avisoTitulo: string;
  #avisoConteudo: string;
  #avisoAbrangencia: AvisoAbrangencia;
  #avisoCreatedAt: Date;

  constructor(data: Aviso) {
    this.#avisoGUID = data.AvisoGUID;
    this.#escolaGUID = data.EscolaGUID;
    this.#usuarioGUIDAutor = data.UsuarioGUIDAutor;
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

  get usuarioGUIDAutor(): string {
    return this.#usuarioGUIDAutor;
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

    if (!this.#usuarioGUIDAutor || this.#usuarioGUIDAutor.trim().length === 0) {
      throw new Error('UsuarioGUIDAutor é obrigatório');
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
      UsuarioGUIDAutor: this.#usuarioGUIDAutor,
      AvisoTitulo: this.#avisoTitulo,
      AvisoConteudo: this.#avisoConteudo,
      AvisoAbrangencia: this.#avisoAbrangencia,
      AvisoCreatedAt: this.#avisoCreatedAt,
    };
  }
}
