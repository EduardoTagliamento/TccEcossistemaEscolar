export default class EscolaxUsuarioxFuncao {
  #EscolaxUsuarioxFuncaoId: number | null = null;
  #UsuarioCPF!: string;
  #EscolaGUID!: string;
  #FuncaoId!: number;
  #FuncaoNome: string | null = null;
  #DataInicio: Date | null = null;
  #DataFim: Date | null = null;
  #Status: "Ativo" | "Inativo" | "Finalizado" = "Ativo";
  #CreatedAt: Date | null = null;
  #UpdatedAt: Date | null = null;

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

  // ========== Data Início ==========
  get DataInicio(): Date | null {
    return this.#DataInicio;
  }

  set DataInicio(value: Date | null) {
    if (value === null || value === undefined) {
      this.#DataInicio = null;
      return;
    }

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("DataInicio deve ser uma data válida.");
    }

    this.#DataInicio = value;
  }

  // ========== Data Fim ==========
  get DataFim(): Date | null {
    return this.#DataFim;
  }

  set DataFim(value: Date | null) {
    if (value === null || value === undefined) {
      this.#DataFim = null;
      return;
    }

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("DataFim deve ser uma data válida.");
    }

    // Validar que DataFim >= DataInicio (se ambos estiverem definidos)
    if (this.#DataInicio && value < this.#DataInicio) {
      throw new Error("DataFim não pode ser anterior à DataInicio.");
    }

    this.#DataFim = value;
  }

  // ========== Status ==========
  get Status(): "Ativo" | "Inativo" | "Finalizado" {
    return this.#Status;
  }

  set Status(value: "Ativo" | "Inativo" | "Finalizado") {
    const statusValidos = ["Ativo", "Inativo", "Finalizado"];
    if (!statusValidos.includes(value)) {
      throw new Error("Status deve ser 'Ativo', 'Inativo' ou 'Finalizado'.");
    }
    this.#Status = value;
  }

  // ========== Created At (Read-Only) ==========
  get CreatedAt(): Date | null {
    return this.#CreatedAt;
  }

  set CreatedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#CreatedAt = null;
      return;
    }

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("CreatedAt deve ser uma data válida.");
    }

    this.#CreatedAt = value;
  }

  // ========== Updated At (Read-Only) ==========
  get UpdatedAt(): Date | null {
    return this.#UpdatedAt;
  }

  set UpdatedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#UpdatedAt = null;
      return;
    }

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("UpdatedAt deve ser uma data válida.");
    }

    this.#UpdatedAt = value;
  }
}
