export default class ConversaGrupo {
  #ConversaGUID!: string;
  #ConversaGrupoNome!: string;
  #ConversaGrupoTipo!: 'Turma' | 'Tarefa';
  #ConversaGrupoRefGUID!: string;

  constructor() {
    console.log('⬆️  ConversaGrupo.constructor()');
  }

  get ConversaGUID(): string { return this.#ConversaGUID; }
  get ConversaGrupoNome(): string { return this.#ConversaGrupoNome; }
  get ConversaGrupoTipo(): 'Turma' | 'Tarefa' { return this.#ConversaGrupoTipo; }
  get ConversaGrupoRefGUID(): string { return this.#ConversaGrupoRefGUID; }

  set ConversaGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('ConversaGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#ConversaGUID = value.trim();
  }

  set ConversaGrupoNome(value: string) {
    if (typeof value !== 'string') throw new Error('ConversaGrupoNome deve ser uma string');
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      throw new Error('ConversaGrupoNome deve ter entre 1 e 100 caracteres');
    }
    this.#ConversaGrupoNome = trimmed;
  }

  set ConversaGrupoTipo(value: 'Turma' | 'Tarefa') {
    if (value !== 'Turma' && value !== 'Tarefa') {
      throw new Error('ConversaGrupoTipo deve ser "Turma" ou "Tarefa"');
    }
    this.#ConversaGrupoTipo = value;
  }

  set ConversaGrupoRefGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('ConversaGrupoRefGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#ConversaGrupoRefGUID = value.trim();
  }

  toJSON() {
    return {
      ConversaGUID: this.#ConversaGUID,
      ConversaGrupoNome: this.#ConversaGrupoNome,
      ConversaGrupoTipo: this.#ConversaGrupoTipo,
      ConversaGrupoRefGUID: this.#ConversaGrupoRefGUID,
    };
  }

  static fromDatabase(data: any): ConversaGrupo {
    const cg = new ConversaGrupo();
    cg.ConversaGUID = data.ConversaGUID;
    cg.ConversaGrupoNome = data.ConversaGrupoNome;
    cg.ConversaGrupoTipo = data.ConversaGrupoTipo;
    cg.ConversaGrupoRefGUID = data.ConversaGrupoRefGUID;
    return cg;
  }
}
