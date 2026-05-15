/**
 * Representa a entidade TarefaAcademica do sistema.
 *
 * Objetivo:
 * - Encapsular os dados de uma tarefa acadêmica atribuída a um aluno.
 * - Garantir integridade dos atributos via getters e setters.
 *
 * Relacionamentos:
 * - N:1 com Matricula (aluno)
 * - N:1 com MateriaxProfessorxTurma (matéria/professor/turma)
 * - 1:N com Anexo (via relacaoanexostarefa)
 */
export default class TarefaAcademica {
  #TarefaGUID!: string;
  #MatriculaGUID!: string;
  #matXprofXturxescGUID!: string;
  #TarefaTitulo!: string;
  #TarefaConteudo: string | null = null;
  #TarefaPostagemData!: Date;
  #TarefaPrazoData!: Date;
  #TarefaTipoEntrega!: "digital" | "fisica";
  #TarefaFeito: boolean = false;
  #TarefaRealizacaoData: Date | null = null;
  #CreatedAt: Date | null = null;
  #UpdatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  TarefaAcademica.constructor()");
  }

  // ========== TarefaGUID ==========
  get TarefaGUID(): string {
    return this.#TarefaGUID;
  }

  set TarefaGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("TarefaGUID deve ser uma string não vazia.");
    }
    const guid = value.trim();
    if (guid.length !== 36) {
      throw new Error("TarefaGUID deve ter 36 caracteres.");
    }
    this.#TarefaGUID = guid;
  }

  // ========== MatriculaGUID ==========
  get MatriculaGUID(): string {
    return this.#MatriculaGUID;
  }

  set MatriculaGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("MatriculaGUID deve ser uma string não vazia.");
    }
    const guid = value.trim();
    if (guid.length < 1 || guid.length > 36) {
      throw new Error("MatriculaGUID deve ter entre 1 e 36 caracteres.");
    }
    this.#MatriculaGUID = guid;
  }

  // ========== matXprofXturxescGUID ==========
  get matXprofXturxescGUID(): string {
    return this.#matXprofXturxescGUID;
  }

  set matXprofXturxescGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("matXprofXturxescGUID deve ser uma string não vazia.");
    }
    const guid = value.trim();
    if (guid.length !== 36) {
      throw new Error("matXprofXturxescGUID deve ter 36 caracteres.");
    }
    this.#matXprofXturxescGUID = guid;
  }

  // ========== TarefaTitulo ==========
  get TarefaTitulo(): string {
    return this.#TarefaTitulo;
  }

  set TarefaTitulo(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("TarefaTitulo deve ser uma string não vazia.");
    }
    const titulo = value.trim();
    if (titulo.length < 1 || titulo.length > 128) {
      throw new Error("TarefaTitulo deve ter entre 1 e 128 caracteres.");
    }
    this.#TarefaTitulo = titulo;
  }

  // ========== TarefaConteudo ==========
  get TarefaConteudo(): string | null {
    return this.#TarefaConteudo;
  }

  set TarefaConteudo(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#TarefaConteudo = null;
      return;
    }
    if (typeof value !== "string") {
      throw new Error("TarefaConteudo deve ser uma string.");
    }
    const conteudo = value.trim();
    if (conteudo.length > 1024) {
      throw new Error("TarefaConteudo deve ter no máximo 1024 caracteres.");
    }
    this.#TarefaConteudo = conteudo;
  }

  // ========== TarefaPostagemData ==========
  get TarefaPostagemData(): Date {
    return this.#TarefaPostagemData;
  }

  set TarefaPostagemData(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("TarefaPostagemData deve ser uma data válida.");
    }
    this.#TarefaPostagemData = value;
  }

  // ========== TarefaPrazoData ==========
  get TarefaPrazoData(): Date {
    return this.#TarefaPrazoData;
  }

  set TarefaPrazoData(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("TarefaPrazoData deve ser uma data válida.");
    }
    this.#TarefaPrazoData = value;
  }

  // ========== TarefaTipoEntrega ==========
  get TarefaTipoEntrega(): "digital" | "fisica" {
    return this.#TarefaTipoEntrega;
  }

  set TarefaTipoEntrega(value: "digital" | "fisica") {
    if (value !== "digital" && value !== "fisica") {
      throw new Error('TarefaTipoEntrega deve ser "digital" ou "fisica".');
    }
    this.#TarefaTipoEntrega = value;
  }

  // ========== TarefaFeito ==========
  get TarefaFeito(): boolean {
    return this.#TarefaFeito;
  }

  set TarefaFeito(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("TarefaFeito deve ser um booleano.");
    }
    this.#TarefaFeito = value;
  }

  // ========== TarefaRealizacaoData ==========
  get TarefaRealizacaoData(): Date | null {
    return this.#TarefaRealizacaoData;
  }

  set TarefaRealizacaoData(value: Date | null) {
    if (value === null || value === undefined) {
      this.#TarefaRealizacaoData = null;
      return;
    }
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("TarefaRealizacaoData deve ser uma data válida.");
    }
    this.#TarefaRealizacaoData = value;
  }

  // ========== CreatedAt ==========
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

  // ========== UpdatedAt ==========
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
