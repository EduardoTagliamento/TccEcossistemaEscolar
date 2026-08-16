/**
 * Representa a entidade ExclusaoEscola do sistema.
 *
 * Objetivo:
 * - Armazenar códigos de confirmação (por email) pra exclusão de escola,
 *   solicitados pela Direção na tela de Configurações.
 * - Mesmo padrão de VerificacaoEmail (código de 6 dígitos, expira, uso único).
 */
export default class ExclusaoEscola {
  #ExclusaoId: number | null = null;
  #EscolaGUID!: string;
  #UsuarioGUIDSolicitante!: string;
  #ExclusaoCodigo!: string;
  #ExclusaoExpiresAt!: Date;
  #ExclusaoUsado: boolean = false;
  #ExclusaoCreatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  ExclusaoEscola.constructor()");
  }

  get ExclusaoId(): number | null {
    return this.#ExclusaoId;
  }

  set ExclusaoId(value: number | null) {
    if (value === null || value === undefined) {
      this.#ExclusaoId = null;
      return;
    }
    if (!Number.isInteger(value) || value < 1) {
      throw new Error("ExclusaoId deve ser um inteiro positivo.");
    }
    this.#ExclusaoId = value;
  }

  get EscolaGUID(): string {
    return this.#EscolaGUID;
  }

  set EscolaGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("EscolaGUID deve ser uma string não vazia.");
    }
    this.#EscolaGUID = value.trim();
  }

  get UsuarioGUIDSolicitante(): string {
    return this.#UsuarioGUIDSolicitante;
  }

  set UsuarioGUIDSolicitante(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("UsuarioGUIDSolicitante deve ser uma string não vazia.");
    }
    this.#UsuarioGUIDSolicitante = value.trim();
  }

  get ExclusaoCodigo(): string {
    return this.#ExclusaoCodigo;
  }

  set ExclusaoCodigo(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("ExclusaoCodigo deve ser uma string não vazia.");
    }
    const codigo = value.trim();
    if (!/^\d{6}$/.test(codigo)) {
      throw new Error("ExclusaoCodigo deve ter exatamente 6 dígitos numéricos.");
    }
    this.#ExclusaoCodigo = codigo;
  }

  get ExclusaoExpiresAt(): Date {
    return this.#ExclusaoExpiresAt;
  }

  set ExclusaoExpiresAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("ExclusaoExpiresAt deve ser uma data válida.");
    }
    this.#ExclusaoExpiresAt = value;
  }

  get ExclusaoUsado(): boolean {
    return this.#ExclusaoUsado;
  }

  set ExclusaoUsado(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("ExclusaoUsado deve ser boolean.");
    }
    this.#ExclusaoUsado = value;
  }

  get ExclusaoCreatedAt(): Date | null {
    return this.#ExclusaoCreatedAt;
  }

  set ExclusaoCreatedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#ExclusaoCreatedAt = null;
      return;
    }
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("ExclusaoCreatedAt deve ser uma data válida.");
    }
    this.#ExclusaoCreatedAt = value;
  }
}
