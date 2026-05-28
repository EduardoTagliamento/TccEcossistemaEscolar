export interface UsuarioXGrupoTarefa {
  UsuarioXGrupoTarefaGUID: string;
  GrupoTarefaGUID: string;
  UsuarioCPF: string;
  DataEntrada: Date;
  CreatedAt: Date;
}

export interface UsuarioXGrupoTarefaCreateDTO {
  GrupoTarefaGUID: string;
  UsuarioCPF: string;
}

export class UsuarioXGrupoTarefaEntity {
  #usuarioXGrupoTarefaGUID: string;
  #grupoTarefaGUID: string;
  #usuarioCPF: string;
  #dataEntrada: Date;
  #createdAt: Date;

  constructor(data: UsuarioXGrupoTarefa) {
    this.#usuarioXGrupoTarefaGUID = data.UsuarioXGrupoTarefaGUID;
    this.#grupoTarefaGUID = data.GrupoTarefaGUID;
    this.#usuarioCPF = data.UsuarioCPF;
    this.#dataEntrada = data.DataEntrada;
    this.#createdAt = data.CreatedAt;
  }

  get usuarioXGrupoTarefaGUID(): string { return this.#usuarioXGrupoTarefaGUID; }
  get grupoTarefaGUID(): string { return this.#grupoTarefaGUID; }
  get usuarioCPF(): string { return this.#usuarioCPF; }
  get dataEntrada(): Date { return this.#dataEntrada; }
  get createdAt(): Date { return this.#createdAt; }

  validar(): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(this.#usuarioXGrupoTarefaGUID)) {
      throw new Error('UsuarioXGrupoTarefaGUID inválido');
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.#grupoTarefaGUID)) {
      throw new Error('GrupoTarefaGUID inválido');
    }

    const cpfLimpo = this.#usuarioCPF.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPF deve ter 11 dígitos');
    }
  }

  toJSON(): UsuarioXGrupoTarefa {
    return {
      UsuarioXGrupoTarefaGUID: this.#usuarioXGrupoTarefaGUID,
      GrupoTarefaGUID: this.#grupoTarefaGUID,
      UsuarioCPF: this.#usuarioCPF,
      DataEntrada: this.#dataEntrada,
      CreatedAt: this.#createdAt
    };
  }
}
