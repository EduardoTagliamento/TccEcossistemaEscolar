export type GrupoProjetoVisibilidade = 'Aberto' | 'Fechado';

export interface GrupoProjeto {
  GrupoProjetoGUID: string;
  ProjetoGUID: string;
  UsuarioCPFLider: string;
  GrupoProjetoNome: string | null;
  GrupoProjetoProposta: string;
  GrupoProjetoVisibilidade: GrupoProjetoVisibilidade;
  GrupoProjetoPontuacao: number | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface GrupoProjetoCreateDTO {
  ProjetoGUID: string;
  UsuarioCPFLider: string;
  GrupoProjetoNome?: string;
  GrupoProjetoProposta: string;
  GrupoProjetoVisibilidade: GrupoProjetoVisibilidade;
}

export interface GrupoProjetoUpdateDTO {
  GrupoProjetoNome?: string | null;
  GrupoProjetoProposta?: string;
  GrupoProjetoVisibilidade?: GrupoProjetoVisibilidade;
  UsuarioCPFLider?: string; // Para transferência de liderança
}

export interface MembroGrupoProjetoDTO {
  UsuarioCPF: string;
  UsuarioNome: string;
  DataEntrada: Date;
  IsLider: boolean;
}

export interface GrupoProjetoComMembrosDTO {
  GrupoProjetoGUID: string;
  ProjetoGUID: string;
  UsuarioCPFLider: string;
  NomeLider: string;
  GrupoProjetoNome: string | null;
  GrupoProjetoProposta: string;
  GrupoProjetoVisibilidade: GrupoProjetoVisibilidade;
  GrupoProjetoPontuacao: number | null;
  Membros: MembroGrupoProjetoDTO[];
  TotalMembros: number;
  LimiteMaximo: number;
  PodeEntrar: boolean;
  CreatedAt: Date;
}

/**
 * Classe Entity com encapsulamento e validações
 */
export class GrupoProjetoEntity {
  #grupoProjetoGUID: string;
  #projetoGUID: string;
  #usuarioCPFLider: string;
  #grupoProjetoNome: string | null;
  #grupoProjetoProposta: string;
  #grupoProjetoVisibilidade: GrupoProjetoVisibilidade;
  #grupoProjetoPontuacao: number | null;
  #createdAt: Date;
  #updatedAt: Date;

  constructor(data: GrupoProjeto) {
    this.#grupoProjetoGUID = data.GrupoProjetoGUID;
    this.#projetoGUID = data.ProjetoGUID;
    this.#usuarioCPFLider = data.UsuarioCPFLider;
    this.#grupoProjetoNome = data.GrupoProjetoNome;
    this.#grupoProjetoProposta = data.GrupoProjetoProposta;
    this.#grupoProjetoVisibilidade = data.GrupoProjetoVisibilidade;
    this.#grupoProjetoPontuacao = data.GrupoProjetoPontuacao;
    this.#createdAt = data.CreatedAt;
    this.#updatedAt = data.UpdatedAt;
  }

  get grupoProjetoGUID(): string { return this.#grupoProjetoGUID; }
  get projetoGUID(): string { return this.#projetoGUID; }
  get usuarioCPFLider(): string { return this.#usuarioCPFLider; }
  get grupoProjetoNome(): string | null { return this.#grupoProjetoNome; }
  get grupoProjetoProposta(): string { return this.#grupoProjetoProposta; }
  get grupoProjetoVisibilidade(): GrupoProjetoVisibilidade { return this.#grupoProjetoVisibilidade; }
  get grupoProjetoPontuacao(): number | null { return this.#grupoProjetoPontuacao; }
  get createdAt(): Date { return this.#createdAt; }
  get updatedAt(): Date { return this.#updatedAt; }

  set grupoProjetoNome(value: string | null) {
    if (value && value.length > 128) {
      throw new Error('GrupoProjetoNome não pode exceder 128 caracteres');
    }
    this.#grupoProjetoNome = value;
  }

  set grupoProjetoProposta(value: string) {
    if (!value || value.trim().length < 1 || value.length > 2048) {
      throw new Error('GrupoProjetoProposta deve ter entre 1 e 2048 caracteres');
    }
    this.#grupoProjetoProposta = value.trim();
  }

  set grupoProjetoVisibilidade(value: GrupoProjetoVisibilidade) {
    const valoresValidos: GrupoProjetoVisibilidade[] = ['Aberto', 'Fechado'];
    if (!valoresValidos.includes(value)) {
      throw new Error(`GrupoProjetoVisibilidade inválida: ${value}`);
    }
    this.#grupoProjetoVisibilidade = value;
  }

  set usuarioCPFLider(value: string) {
    const cpfLimpo = value.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPFLider deve ter 11 dígitos');
    }
    this.#usuarioCPFLider = value;
  }

  set grupoProjetoPontuacao(value: number | null) {
    if (value !== null && (isNaN(value) || value < 0)) {
      throw new Error('GrupoProjetoPontuacao deve ser um número >= 0');
    }
    this.#grupoProjetoPontuacao = value;
  }

  validar(): void {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(this.#grupoProjetoGUID)) {
      throw new Error('GrupoProjetoGUID inválido (deve ser UUID v4)');
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.#projetoGUID)) {
      throw new Error('ProjetoGUID inválido');
    }

    const cpfLimpo = this.#usuarioCPFLider.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPFLider deve ter 11 dígitos');
    }

    if (this.#grupoProjetoNome && this.#grupoProjetoNome.length > 128) {
      throw new Error('GrupoProjetoNome não pode exceder 128 caracteres');
    }

    if (!this.#grupoProjetoProposta || this.#grupoProjetoProposta.length < 1 || this.#grupoProjetoProposta.length > 2048) {
      throw new Error('GrupoProjetoProposta deve ter entre 1 e 2048 caracteres');
    }

    const valoresValidos: GrupoProjetoVisibilidade[] = ['Aberto', 'Fechado'];
    if (!valoresValidos.includes(this.#grupoProjetoVisibilidade)) {
      throw new Error(`GrupoProjetoVisibilidade inválida: ${this.#grupoProjetoVisibilidade}`);
    }
  }

  toJSON(): GrupoProjeto {
    return {
      GrupoProjetoGUID: this.#grupoProjetoGUID,
      ProjetoGUID: this.#projetoGUID,
      UsuarioCPFLider: this.#usuarioCPFLider,
      GrupoProjetoNome: this.#grupoProjetoNome,
      GrupoProjetoProposta: this.#grupoProjetoProposta,
      GrupoProjetoVisibilidade: this.#grupoProjetoVisibilidade,
      GrupoProjetoPontuacao: this.#grupoProjetoPontuacao,
      CreatedAt: this.#createdAt,
      UpdatedAt: this.#updatedAt
    };
  }
}
