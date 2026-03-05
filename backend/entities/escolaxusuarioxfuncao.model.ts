export default class EscolaxUsuarioxFuncao {
  #EscolaxUsuarioxFuncaoId: number | null = null;
  #UsuarioCPF!: string;
  #EscolaGUID!: string;
  #FuncaoId!: number;
  #FuncaoNome: string | null = null;

  constructor() {
    console.log("Server: EscolaxUsuarioxFuncao.constructor()");
  }

  get EscolaxUsuarioxFuncaoId(): number | null {
    return this.#EscolaxUsuarioxFuncaoId;
  }

  set EscolaxUsuarioxFuncaoId(value: number | null) {
    if (value === null || value === undefined) {
      this.#EscolaxUsuarioxFuncaoId = null;
      return;
    }

    if (!Number.isInteger(value) || value < 1) {
      throw new Error("EscolaxUsuarioxFuncaoId deve ser um inteiro positivo.");
    }

    this.#EscolaxUsuarioxFuncaoId = value;
  }

  get UsuarioCPF(): string {
    return this.#UsuarioCPF;
  }

  set UsuarioCPF(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("UsuarioCPF deve ser uma string nao vazia.");
    }

    const cpf = value.trim();
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

    if (!cpfRegex.test(cpf)) {
      throw new Error("UsuarioCPF deve estar no formato XXX.XXX.XXX-XX.");
    }

    this.#UsuarioCPF = cpf;
  }

  get EscolaGUID(): string {
    return this.#EscolaGUID;
  }

  set EscolaGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("EscolaGUID deve ser uma string nao vazia.");
    }

    const guid = value.trim();
    if (guid.length !== 36) {
      throw new Error("EscolaGUID deve ter 36 caracteres.");
    }

    this.#EscolaGUID = guid;
  }

  get FuncaoId(): number {
    return this.#FuncaoId;
  }

  set FuncaoId(value: number) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error("FuncaoId deve ser um inteiro positivo.");
    }

    this.#FuncaoId = value;
  }

  get FuncaoNome(): string | null {
    return this.#FuncaoNome;
  }

  set FuncaoNome(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#FuncaoNome = null;
      return;
    }

    if (typeof value !== "string") {
      throw new Error("FuncaoNome deve ser uma string.");
    }

    const nome = value.trim();
    if (nome.length < 2 || nome.length > 30) {
      throw new Error("FuncaoNome deve ter entre 2 e 30 caracteres.");
    }

    this.#FuncaoNome = nome;
  }
}
