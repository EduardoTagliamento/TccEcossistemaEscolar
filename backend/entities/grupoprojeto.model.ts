export type GrupoProjetoVisibilidade = 'Aberto' | 'Fechado';

export interface GrupoProjeto {
  GrupoProjetoGUID: string;
  ProjetoGUID: string;
  UsuarioGUIDLider: string;
  GrupoProjetoNome: string | null;
  GrupoProjetoProposta: string;
  GrupoProjetoVisibilidade: GrupoProjetoVisibilidade;
  GrupoProjetoPontuacao: number | null;
  GrupoProjetoSubmetidoEm: Date | null;
  GrupoProjetoSubmetidoPorGUID: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface GrupoProjetoCreateDTO {
  ProjetoGUID: string;
  UsuarioGUIDLider: string;
  GrupoProjetoNome?: string;
  GrupoProjetoProposta: string;
  GrupoProjetoVisibilidade: GrupoProjetoVisibilidade;
}

export interface GrupoProjetoUpdateDTO {
  GrupoProjetoNome?: string | null;
  GrupoProjetoProposta?: string;
  GrupoProjetoVisibilidade?: GrupoProjetoVisibilidade;
  UsuarioGUIDLider?: string; // Para transferência de liderança
  GrupoProjetoSubmetidoEm?: Date | null;
  GrupoProjetoSubmetidoPorGUID?: string | null;
}

export interface MembroGrupoProjetoDTO {
  UsuarioGUID: string;
  UsuarioNome: string;
  DataEntrada: Date;
  IsLider: boolean;
  /** Capacidades resolvidas deste membro — líder sempre true; membro comum só com override explícito. */
  Permissoes: { PodeExpulsarMembros: boolean; PodeAtualizarGrupo: boolean; PodeSubmeterProjeto: boolean };
}

export interface GrupoProjetoComMembrosDTO {
  GrupoProjetoGUID: string;
  ProjetoGUID: string;
  UsuarioGUIDLider: string;
  NomeLider: string;
  GrupoProjetoNome: string | null;
  GrupoProjetoProposta: string;
  GrupoProjetoVisibilidade: GrupoProjetoVisibilidade;
  GrupoProjetoPontuacao: number | null;
  GrupoProjetoSubmetidoEm: Date | null;
  GrupoProjetoSubmetidoPorGUID: string | null;
  /** GUID da conversa de chat do grupo — null se ainda não foi criada (grupos antigos, ver migration de backfill). */
  ConversaGUID: string | null;
  Membros: MembroGrupoProjetoDTO[];
  TotalMembros: number;
  LimiteMaximo: number;
  PodeEntrar: boolean;
  /** Capacidades do usuário autenticado neste grupo — null quando não solicitado (contexto sem usuarioGUID). */
  MinhasPermissoes?: { PodeExpulsarMembros: boolean; PodeAtualizarGrupo: boolean; PodeSubmeterProjeto: boolean } | null;
  CreatedAt: Date;
}

/**
 * Classe Entity com encapsulamento e validações
 */
export class GrupoProjetoEntity {
  #grupoProjetoGUID: string;
  #projetoGUID: string;
  #usuarioGUIDLider: string;
  #grupoProjetoNome: string | null;
  #grupoProjetoProposta: string;
  #grupoProjetoVisibilidade: GrupoProjetoVisibilidade;
  #grupoProjetoPontuacao: number | null;
  #grupoProjetoSubmetidoEm: Date | null;
  #grupoProjetoSubmetidoPorGUID: string | null;
  #createdAt: Date;
  #updatedAt: Date;

  constructor(data: GrupoProjeto) {
    this.#grupoProjetoGUID = data.GrupoProjetoGUID;
    this.#projetoGUID = data.ProjetoGUID;
    this.#usuarioGUIDLider = data.UsuarioGUIDLider;
    this.#grupoProjetoNome = data.GrupoProjetoNome;
    this.#grupoProjetoProposta = data.GrupoProjetoProposta;
    this.#grupoProjetoVisibilidade = data.GrupoProjetoVisibilidade;
    this.#grupoProjetoPontuacao = data.GrupoProjetoPontuacao;
    this.#grupoProjetoSubmetidoEm = data.GrupoProjetoSubmetidoEm ?? null;
    this.#grupoProjetoSubmetidoPorGUID = data.GrupoProjetoSubmetidoPorGUID ?? null;
    this.#createdAt = data.CreatedAt;
    this.#updatedAt = data.UpdatedAt;
  }

  get grupoProjetoGUID(): string { return this.#grupoProjetoGUID; }
  get projetoGUID(): string { return this.#projetoGUID; }
  get usuarioGUIDLider(): string { return this.#usuarioGUIDLider; }
  get grupoProjetoNome(): string | null { return this.#grupoProjetoNome; }
  get grupoProjetoProposta(): string { return this.#grupoProjetoProposta; }
  get grupoProjetoVisibilidade(): GrupoProjetoVisibilidade { return this.#grupoProjetoVisibilidade; }
  get grupoProjetoPontuacao(): number | null { return this.#grupoProjetoPontuacao; }
  get grupoProjetoSubmetidoEm(): Date | null { return this.#grupoProjetoSubmetidoEm; }
  get grupoProjetoSubmetidoPorGUID(): string | null { return this.#grupoProjetoSubmetidoPorGUID; }
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

  set usuarioGUIDLider(value: string) {
    if (!value || value.trim() === '') {
      throw new Error('UsuarioGUIDLider deve ser uma string não vazia');
    }
    this.#usuarioGUIDLider = value;
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

    if (!this.#usuarioGUIDLider || this.#usuarioGUIDLider.trim() === '') {
      throw new Error('UsuarioGUIDLider deve ser uma string não vazia');
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
      UsuarioGUIDLider: this.#usuarioGUIDLider,
      GrupoProjetoNome: this.#grupoProjetoNome,
      GrupoProjetoProposta: this.#grupoProjetoProposta,
      GrupoProjetoVisibilidade: this.#grupoProjetoVisibilidade,
      GrupoProjetoPontuacao: this.#grupoProjetoPontuacao,
      GrupoProjetoSubmetidoEm: this.#grupoProjetoSubmetidoEm,
      GrupoProjetoSubmetidoPorGUID: this.#grupoProjetoSubmetidoPorGUID,
      CreatedAt: this.#createdAt,
      UpdatedAt: this.#updatedAt
    };
  }
}
