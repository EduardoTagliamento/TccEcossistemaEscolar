export default class ConversaGrupo {
  #ConversaGUID!: string;
  #ConversaGrupoNome!: string;
  #ConversaGrupoTipo!: 'Turma' | 'Tarefa' | 'Projeto';
  #ConversaGrupoRefGUID!: string;
  #ConversaGrupoCorFundo: string | null = null;
  #ConversaGrupoImagemUrl: string | null = null;

  constructor() {
    console.log('⬆️  ConversaGrupo.constructor()');
  }

  get ConversaGUID(): string { return this.#ConversaGUID; }
  get ConversaGrupoNome(): string { return this.#ConversaGrupoNome; }
  get ConversaGrupoTipo(): 'Turma' | 'Tarefa' | 'Projeto' { return this.#ConversaGrupoTipo; }
  get ConversaGrupoRefGUID(): string { return this.#ConversaGrupoRefGUID; }
  get ConversaGrupoCorFundo(): string | null { return this.#ConversaGrupoCorFundo; }
  get ConversaGrupoImagemUrl(): string | null { return this.#ConversaGrupoImagemUrl; }

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

  set ConversaGrupoTipo(value: 'Turma' | 'Tarefa' | 'Projeto') {
    if (value !== 'Turma' && value !== 'Tarefa' && value !== 'Projeto') {
      throw new Error('ConversaGrupoTipo deve ser "Turma", "Tarefa" ou "Projeto"');
    }
    this.#ConversaGrupoTipo = value;
  }

  set ConversaGrupoRefGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('ConversaGrupoRefGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#ConversaGrupoRefGUID = value.trim();
  }

  set ConversaGrupoCorFundo(value: string | null) {
    if (value === null) {
      this.#ConversaGrupoCorFundo = null;
      return;
    }
    if (typeof value !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(value)) {
      throw new Error('ConversaGrupoCorFundo deve ser uma cor hex válida (#RRGGBB)');
    }
    this.#ConversaGrupoCorFundo = value;
  }

  set ConversaGrupoImagemUrl(value: string | null) {
    if (value === null) {
      this.#ConversaGrupoImagemUrl = null;
      return;
    }
    if (typeof value !== 'string' || value.length > 500) {
      throw new Error('ConversaGrupoImagemUrl deve ter no máximo 500 caracteres');
    }
    this.#ConversaGrupoImagemUrl = value;
  }

  toJSON() {
    return {
      ConversaGUID: this.#ConversaGUID,
      ConversaGrupoNome: this.#ConversaGrupoNome,
      ConversaGrupoTipo: this.#ConversaGrupoTipo,
      ConversaGrupoRefGUID: this.#ConversaGrupoRefGUID,
      ConversaGrupoCorFundo: this.#ConversaGrupoCorFundo,
      ConversaGrupoImagemUrl: this.#ConversaGrupoImagemUrl,
    };
  }

  static fromDatabase(data: any): ConversaGrupo {
    const cg = new ConversaGrupo();
    cg.ConversaGUID = data.ConversaGUID;
    cg.ConversaGrupoNome = data.ConversaGrupoNome;
    cg.ConversaGrupoTipo = data.ConversaGrupoTipo;
    cg.ConversaGrupoRefGUID = data.ConversaGrupoRefGUID;
    cg.ConversaGrupoCorFundo = data.ConversaGrupoCorFundo ?? null;
    cg.ConversaGrupoImagemUrl = data.ConversaGrupoImagemUrl ?? null;
    return cg;
  }
}
