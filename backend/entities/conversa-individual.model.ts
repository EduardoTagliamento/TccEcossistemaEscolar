export default class ConversaIndividual {
  #ConversaGUID!: string;
  #ConversaIndUsr1GUID!: string;
  #ConversaIndUsr2GUID!: string;

  constructor() {
    console.log('⬆️  ConversaIndividual.constructor()');
  }

  get ConversaGUID(): string        { return this.#ConversaGUID; }
  get ConversaIndUsr1GUID(): string { return this.#ConversaIndUsr1GUID; }
  get ConversaIndUsr2GUID(): string { return this.#ConversaIndUsr2GUID; }

  set ConversaGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('ConversaGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#ConversaGUID = value.trim();
  }

  set ConversaIndUsr1GUID(value: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('ConversaIndUsr1GUID inválido');
    }
    this.#ConversaIndUsr1GUID = value.trim();
  }

  set ConversaIndUsr2GUID(value: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('ConversaIndUsr2GUID inválido');
    }
    this.#ConversaIndUsr2GUID = value.trim();
  }

  toJSON() {
    return {
      ConversaGUID: this.#ConversaGUID,
      ConversaIndUsr1GUID: this.#ConversaIndUsr1GUID,
      ConversaIndUsr2GUID: this.#ConversaIndUsr2GUID,
    };
  }

  static fromDatabase(data: any): ConversaIndividual {
    const obj = new ConversaIndividual();
    obj.ConversaGUID        = data.ConversaGUID;
    obj.ConversaIndUsr1GUID = data.ConversaIndUsr1GUID;
    obj.ConversaIndUsr2GUID = data.ConversaIndUsr2GUID;
    return obj;
  }
}
