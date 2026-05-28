export interface GrupoTarefa {
  GrupoTarefaGUID: string;
  TarefaGUID: string;
  TurmaGUID: string;
  UsuarioCPFLider: string;
  GrupoNome: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface GrupoTarefaCreateDTO {
  TarefaGUID: string;
  TurmaGUID: string;
  UsuarioCPFLider: string;
  GrupoNome?: string;
}

export interface GrupoTarefaUpdateDTO {
  GrupoNome?: string;
  UsuarioCPFLider?: string;  // Para transferência de liderança
}

export interface GrupoTarefaComMembrosDTO {
  GrupoTarefaGUID: string;
  TarefaGUID: string;
  TurmaGUID: string;
  UsuarioCPFLider: string;
  NomeLider: string;
  GrupoNome: string | null;
  Membros: MembroGrupoDTO[];
  TotalMembros: number;
  LimiteMaximo: number;
  PodeConvidar: boolean;
  CreatedAt: Date;
}

export interface MembroGrupoDTO {
  UsuarioCPF: string;
  UsuarioNome: string;
  DataEntrada: Date;
  IsLider: boolean;
}

/**
 * Classe Entity com encapsulamento e validações
 */
export class GrupoTarefaEntity {
  #grupoTarefaGUID: string;
  #tarefaGUID: string;
  #turmaGUID: string;
  #usuarioCPFLider: string;
  #grupoNome: string | null;
  #createdAt: Date;
  #updatedAt: Date;

  constructor(data: GrupoTarefa) {
    this.#grupoTarefaGUID = data.GrupoTarefaGUID;
    this.#tarefaGUID = data.TarefaGUID;
    this.#turmaGUID = data.TurmaGUID;
    this.#usuarioCPFLider = data.UsuarioCPFLider;
    this.#grupoNome = data.GrupoNome;
    this.#createdAt = data.CreatedAt;
    this.#updatedAt = data.UpdatedAt;
  }

  // Getters
  get grupoTarefaGUID(): string { return this.#grupoTarefaGUID; }
  get tarefaGUID(): string { return this.#tarefaGUID; }
  get turmaGUID(): string { return this.#turmaGUID; }
  get usuarioCPFLider(): string { return this.#usuarioCPFLider; }
  get grupoNome(): string | null { return this.#grupoNome; }
  get createdAt(): Date { return this.#createdAt; }
  get updatedAt(): Date { return this.#updatedAt; }

  // Setters
  set grupoNome(value: string | null) {
    if (value && value.length > 128) {
      throw new Error('GrupoNome não pode exceder 128 caracteres');
    }
    this.#grupoNome = value;
  }

  set usuarioCPFLider(value: string) {
    const cpfLimpo = value.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPFLider deve ter 11 dígitos');
    }
    this.#usuarioCPFLider = value;
  }

  // Validações
  validar(): void {
    // UUID do grupo
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(this.#grupoTarefaGUID)) {
      throw new Error('GrupoTarefaGUID inválido (deve ser UUID v4)');
    }

    // UUID da tarefa
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.#tarefaGUID)) {
      throw new Error('TarefaGUID inválido');
    }

    // UUID da turma
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.#turmaGUID)) {
      throw new Error('TurmaGUID inválido');
    }

    // CPF do líder
    const cpfLimpo = this.#usuarioCPFLider.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPFLider deve ter 11 dígitos');
    }

    // Nome do grupo (opcional)
    if (this.#grupoNome && this.#grupoNome.length > 128) {
      throw new Error('GrupoNome não pode exceder 128 caracteres');
    }
  }

  toJSON(): GrupoTarefa {
    return {
      GrupoTarefaGUID: this.#grupoTarefaGUID,
      TarefaGUID: this.#tarefaGUID,
      TurmaGUID: this.#turmaGUID,
      UsuarioCPFLider: this.#usuarioCPFLider,
      GrupoNome: this.#grupoNome,
      CreatedAt: this.#createdAt,
      UpdatedAt: this.#updatedAt
    };
  }
}
