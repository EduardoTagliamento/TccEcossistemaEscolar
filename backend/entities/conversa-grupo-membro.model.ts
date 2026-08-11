export default class ConversaGrupoMembro {
  #ConversaGUID!: string;
  #MembroUsuarioGUID!: string;
  #MembroFuncao!: 'Membro' | 'Lider' | 'Representante' | 'Vice-Representante';
  #MembroStatus!: 'Ativo' | 'Inativo';
  #MembroEntradaAt!: Date;
  #MembroSaidaAt: Date | null = null;

  constructor() {
    console.log('⬆️  ConversaGrupoMembro.constructor()');
  }

  get ConversaGUID(): string { return this.#ConversaGUID; }
  get MembroUsuarioGUID(): string { return this.#MembroUsuarioGUID; }
  get MembroFuncao(): 'Membro' | 'Lider' | 'Representante' | 'Vice-Representante' { return this.#MembroFuncao; }
  get MembroStatus(): 'Ativo' | 'Inativo' { return this.#MembroStatus; }
  get MembroEntradaAt(): Date { return this.#MembroEntradaAt; }
  get MembroSaidaAt(): Date | null { return this.#MembroSaidaAt; }

  set ConversaGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('ConversaGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#ConversaGUID = value.trim();
  }

  set MembroUsuarioGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('MembroUsuarioGUID não pode ser vazio');
    }
    this.#MembroUsuarioGUID = value.trim();
  }

  set MembroFuncao(value: 'Membro' | 'Lider' | 'Representante' | 'Vice-Representante') {
    const valid = ['Membro', 'Lider', 'Representante', 'Vice-Representante'];
    if (!valid.includes(value)) {
      throw new Error('MembroFuncao inválido');
    }
    this.#MembroFuncao = value;
  }

  set MembroStatus(value: 'Ativo' | 'Inativo') {
    if (value !== 'Ativo' && value !== 'Inativo') {
      throw new Error('MembroStatus deve ser "Ativo" ou "Inativo"');
    }
    this.#MembroStatus = value;
  }

  set MembroEntradaAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('MembroEntradaAt deve ser uma data válida');
    }
    this.#MembroEntradaAt = value;
  }

  set MembroSaidaAt(value: Date | null) {
    if (value !== null && (!(value instanceof Date) || isNaN(value.getTime()))) {
      throw new Error('MembroSaidaAt deve ser uma data válida ou null');
    }
    this.#MembroSaidaAt = value;
  }

  toJSON() {
    return {
      ConversaGUID: this.#ConversaGUID,
      MembroUsuarioGUID: this.#MembroUsuarioGUID,
      MembroFuncao: this.#MembroFuncao,
      MembroStatus: this.#MembroStatus,
      MembroEntradaAt: this.#MembroEntradaAt.toISOString(),
      MembroSaidaAt: this.#MembroSaidaAt?.toISOString() ?? null,
    };
  }

  static fromDatabase(data: any): ConversaGrupoMembro {
    const m = new ConversaGrupoMembro();
    m.ConversaGUID = data.ConversaGUID;
    m.MembroUsuarioGUID = data.MembroUsuarioGUID;
    m.MembroFuncao = data.MembroFuncao;
    m.MembroStatus = data.MembroStatus;
    m.MembroEntradaAt = data.MembroEntradaAt;
    m.MembroSaidaAt = data.MembroSaidaAt ?? null;
    return m;
  }
}
