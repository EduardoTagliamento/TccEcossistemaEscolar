export type ConviteTipo = 'Convite' | 'Solicitacao';
export type ConviteStatus = 'Pendente' | 'Aceito' | 'Recusado' | 'Expirado';

export interface ConviteGrupoTarefa {
  ConviteGUID: string;
  GrupoTarefaGUID: string;
  UsuarioGUIDConvidado: string;
  ConviteTipo: ConviteTipo;
  ConviteStatus: ConviteStatus;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ConviteGrupoTarefaCreateDTO {
  GrupoTarefaGUID: string;
  UsuarioGUIDConvidado: string;
  ConviteTipo: ConviteTipo;
}

export interface ConviteGrupoTarefaDTO {
  ConviteGUID: string;
  GrupoTarefaGUID: string;
  GrupoNome: string | null;
  LiderGUID: string;
  LiderNome: string;
  UsuarioGUIDConvidado: string;
  NomeConvidado: string;
  ConviteTipo: ConviteTipo;
  ConviteStatus: ConviteStatus;
  TarefaTitulo: string;
  TarefaPrazoData: string;
  TotalMembros: number;
  MaxPessoas: number;
  CreatedAt: Date;
}

export class ConviteGrupoTarefaEntity {
  #conviteGUID: string;
  #grupoTarefaGUID: string;
  #usuarioGUIDConvidado: string;
  #conviteTipo: ConviteTipo;
  #conviteStatus: ConviteStatus;
  #createdAt: Date;
  #updatedAt: Date;

  constructor(data: ConviteGrupoTarefa) {
    this.#conviteGUID = data.ConviteGUID;
    this.#grupoTarefaGUID = data.GrupoTarefaGUID;
    this.#usuarioGUIDConvidado = data.UsuarioGUIDConvidado;
    this.#conviteTipo = data.ConviteTipo;
    this.#conviteStatus = data.ConviteStatus;
    this.#createdAt = data.CreatedAt;
    this.#updatedAt = data.UpdatedAt;
  }

  get conviteGUID(): string { return this.#conviteGUID; }
  get grupoTarefaGUID(): string { return this.#grupoTarefaGUID; }
  get usuarioGUIDConvidado(): string { return this.#usuarioGUIDConvidado; }
  get conviteTipo(): ConviteTipo { return this.#conviteTipo; }
  get conviteStatus(): ConviteStatus { return this.#conviteStatus; }
  get createdAt(): Date { return this.#createdAt; }
  get updatedAt(): Date { return this.#updatedAt; }

  set conviteStatus(value: ConviteStatus) {
    const statusValidos: ConviteStatus[] = ['Pendente', 'Aceito', 'Recusado', 'Expirado'];
    if (!statusValidos.includes(value)) {
      throw new Error(`ConviteStatus inválido: ${value}`);
    }
    this.#conviteStatus = value;
  }

  validar(): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(this.#conviteGUID)) {
      throw new Error('ConviteGUID inválido');
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.#grupoTarefaGUID)) {
      throw new Error('GrupoTarefaGUID inválido');
    }

    if (!this.#usuarioGUIDConvidado || this.#usuarioGUIDConvidado.trim() === '') {
      throw new Error('UsuarioGUIDConvidado deve ser uma string não vazia');
    }

    const tiposValidos: ConviteTipo[] = ['Convite', 'Solicitacao'];
    if (!tiposValidos.includes(this.#conviteTipo)) {
      throw new Error(`ConviteTipo inválido: ${this.#conviteTipo}`);
    }

    const statusValidos: ConviteStatus[] = ['Pendente', 'Aceito', 'Recusado', 'Expirado'];
    if (!statusValidos.includes(this.#conviteStatus)) {
      throw new Error(`ConviteStatus inválido: ${this.#conviteStatus}`);
    }
  }

  toJSON(): ConviteGrupoTarefa {
    return {
      ConviteGUID: this.#conviteGUID,
      GrupoTarefaGUID: this.#grupoTarefaGUID,
      UsuarioGUIDConvidado: this.#usuarioGUIDConvidado,
      ConviteTipo: this.#conviteTipo,
      ConviteStatus: this.#conviteStatus,
      CreatedAt: this.#createdAt,
      UpdatedAt: this.#updatedAt
    };
  }
}
