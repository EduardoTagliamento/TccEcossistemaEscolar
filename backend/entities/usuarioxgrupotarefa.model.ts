export interface UsuarioXGrupoTarefa {
  UsuarioXGrupoTarefaGUID: string;
  GrupoTarefaGUID: string;
  UsuarioGUID: string;
  DataEntrada: Date;
  CreatedAt: Date;
  MembroPermissoes: Record<string, boolean> | null;
}

export interface UsuarioXGrupoTarefaCreateDTO {
  GrupoTarefaGUID: string;
  UsuarioGUID: string;
}

export class UsuarioXGrupoTarefaEntity {
  #usuarioXGrupoTarefaGUID: string;
  #grupoTarefaGUID: string;
  #usuarioGUID: string;
  #dataEntrada: Date;
  #createdAt: Date;
  #membroPermissoes: Record<string, boolean> | null;

  constructor(data: UsuarioXGrupoTarefa) {
    this.#usuarioXGrupoTarefaGUID = data.UsuarioXGrupoTarefaGUID;
    this.#grupoTarefaGUID = data.GrupoTarefaGUID;
    this.#usuarioGUID = data.UsuarioGUID;
    this.#dataEntrada = data.DataEntrada;
    this.#createdAt = data.CreatedAt;
    this.#membroPermissoes = data.MembroPermissoes ?? null;
  }

  get usuarioXGrupoTarefaGUID(): string { return this.#usuarioXGrupoTarefaGUID; }
  get grupoTarefaGUID(): string { return this.#grupoTarefaGUID; }
  get usuarioGUID(): string { return this.#usuarioGUID; }
  get dataEntrada(): Date { return this.#dataEntrada; }
  get createdAt(): Date { return this.#createdAt; }
  get membroPermissoes(): Record<string, boolean> | null { return this.#membroPermissoes; }

  validar(): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(this.#usuarioXGrupoTarefaGUID)) {
      throw new Error('UsuarioXGrupoTarefaGUID inválido');
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.#grupoTarefaGUID)) {
      throw new Error('GrupoTarefaGUID inválido');
    }

    if (!this.#usuarioGUID || this.#usuarioGUID.trim() === '') {
      throw new Error('UsuarioGUID deve ser uma string não vazia');
    }
  }

  toJSON(): UsuarioXGrupoTarefa {
    return {
      UsuarioXGrupoTarefaGUID: this.#usuarioXGrupoTarefaGUID,
      GrupoTarefaGUID: this.#grupoTarefaGUID,
      UsuarioGUID: this.#usuarioGUID,
      DataEntrada: this.#dataEntrada,
      CreatedAt: this.#createdAt,
      MembroPermissoes: this.#membroPermissoes
    };
  }
}
