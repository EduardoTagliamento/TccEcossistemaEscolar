export default class ConversaIndividual {
  #ConversaGUID!: string;
  #ConversaIndUsr1CPF!: string;
  #ConversaIndUsr2CPF!: string;

  constructor() {
    console.log('⬆️  ConversaIndividual.constructor()');
  }

  get ConversaGUID(): string        { return this.#ConversaGUID; }
  get ConversaIndUsr1CPF(): string  { return this.#ConversaIndUsr1CPF; }
  get ConversaIndUsr2CPF(): string  { return this.#ConversaIndUsr2CPF; }

  set ConversaGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('ConversaGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#ConversaGUID = value.trim();
  }

  set ConversaIndUsr1CPF(value: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('ConversaIndUsr1CPF inválido');
    }
    this.#ConversaIndUsr1CPF = value.trim();
  }

  set ConversaIndUsr2CPF(value: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('ConversaIndUsr2CPF inválido');
    }
    this.#ConversaIndUsr2CPF = value.trim();
  }

  toJSON() {
    return {
      ConversaGUID: this.#ConversaGUID,
      ConversaIndUsr1CPF: this.#ConversaIndUsr1CPF,
      ConversaIndUsr2CPF: this.#ConversaIndUsr2CPF,
    };
  }

  static fromDatabase(data: any): ConversaIndividual {
    const obj = new ConversaIndividual();
    obj.ConversaGUID       = data.ConversaGUID;
    obj.ConversaIndUsr1CPF = data.ConversaIndUsr1CPF;
    obj.ConversaIndUsr2CPF = data.ConversaIndUsr2CPF;
    return obj;
  }
}
