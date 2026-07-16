/**
 * Representa a entidade Conteúdo (material de aula).
 *
 * Objetivo:
 * - Encapsular os dados ÚNICOS/compartilhados de um conteúdo de aula
 *   publicado pelo professor (vídeo/áudio, texto rico ou arquivo paginado).
 * - Um conteúdo é criado UMA VEZ e atribuído a N turmas via `ConteudoTurma`
 *   (mesmo padrão de ProvaAgendada).
 * - Os dados específicos de cada tipo ficam em tabelas separadas
 *   (ConteudoCronometrado, ConteudoTexto, ConteudoPaginadoArquivo).
 */
import { normalizeCPF } from "../utils/helpers/cpf.helper";

export type ConteudoTipo = "cronometrado" | "texto" | "paginado";

export default class Conteudo {
  #ConteudoGUID!: string;
  #MateriaGUID!: string;
  #UsuarioCPF!: string;
  #CategoriaGUID: string | null = null;
  #ConteudoTitulo: string | null = null;
  #ConteudoTipo!: ConteudoTipo;
  #ConteudoDescricao: string | null = null;
  #ConteudoDataPublicacao!: Date;
  #CreatedAt: Date | null = null;
  #UpdatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  Conteudo.constructor()");
  }

  // ========== ConteudoGUID ==========
  get ConteudoGUID(): string {
    return this.#ConteudoGUID;
  }

  set ConteudoGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("ConteudoGUID deve ser uma string não vazia.");
    }
    const guid = value.trim();
    if (guid.length !== 36) {
      throw new Error("ConteudoGUID deve ter 36 caracteres.");
    }
    this.#ConteudoGUID = guid;
  }

  // ========== MateriaGUID ==========
  get MateriaGUID(): string {
    return this.#MateriaGUID;
  }

  set MateriaGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("MateriaGUID deve ser uma string não vazia.");
    }
    const guid = value.trim();
    if (guid.length !== 36) {
      throw new Error("MateriaGUID deve ter 36 caracteres.");
    }
    this.#MateriaGUID = guid;
  }

  // ========== UsuarioCPF ==========
  get UsuarioCPF(): string {
    return this.#UsuarioCPF;
  }

  set UsuarioCPF(value: string) {
    this.#UsuarioCPF = normalizeCPF(value);
  }

  // ========== CategoriaGUID ==========
  get CategoriaGUID(): string | null {
    return this.#CategoriaGUID;
  }

  set CategoriaGUID(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#CategoriaGUID = null;
      return;
    }
    const guid = value.trim();
    if (guid.length !== 36) {
      throw new Error("CategoriaGUID deve ter 36 caracteres.");
    }
    this.#CategoriaGUID = guid;
  }

  // ========== ConteudoTitulo ==========
  get ConteudoTitulo(): string | null {
    return this.#ConteudoTitulo;
  }

  set ConteudoTitulo(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#ConteudoTitulo = null;
      return;
    }
    if (typeof value !== "string") {
      throw new Error("ConteudoTitulo deve ser uma string.");
    }
    const titulo = value.trim();
    if (titulo.length < 2) {
      throw new Error("ConteudoTitulo deve ter pelo menos 2 caracteres.");
    }
    if (titulo.length > 150) {
      throw new Error("ConteudoTitulo deve ter no máximo 150 caracteres.");
    }
    this.#ConteudoTitulo = titulo;
  }

  // ========== ConteudoTipo ==========
  get ConteudoTipo(): ConteudoTipo {
    return this.#ConteudoTipo;
  }

  set ConteudoTipo(value: ConteudoTipo) {
    const tiposValidos: ConteudoTipo[] = ["cronometrado", "texto", "paginado"];
    if (!tiposValidos.includes(value)) {
      throw new Error("ConteudoTipo deve ser 'cronometrado', 'texto' ou 'paginado'.");
    }
    this.#ConteudoTipo = value;
  }

  // ========== ConteudoDescricao ==========
  get ConteudoDescricao(): string | null {
    return this.#ConteudoDescricao;
  }

  set ConteudoDescricao(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#ConteudoDescricao = null;
      return;
    }
    if (typeof value !== "string") {
      throw new Error("ConteudoDescricao deve ser uma string.");
    }
    const descricao = value.trim();
    if (descricao.length > 1024) {
      throw new Error("ConteudoDescricao deve ter no máximo 1024 caracteres.");
    }
    this.#ConteudoDescricao = descricao;
  }

  // ========== ConteudoDataPublicacao ==========
  get ConteudoDataPublicacao(): Date {
    return this.#ConteudoDataPublicacao;
  }

  set ConteudoDataPublicacao(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("ConteudoDataPublicacao deve ser uma data válida.");
    }
    this.#ConteudoDataPublicacao = value;
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
