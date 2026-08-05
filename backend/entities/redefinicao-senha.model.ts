/**
 * Representa a entidade RedefinicaoSenha do sistema.
 *
 * Objetivo:
 * - Armazenar tokens de "esqueci minha senha" enviados por email
 * - Controlar expiração e uso único do token
 */
import { normalizeCPF } from "../utils/helpers/cpf.helper";

export default class RedefinicaoSenha {
  #RedefinicaoId: number | null = null;
  #UsuarioCPF!: string;
  #RedefinicaoToken!: string;
  #RedefinicaoExpiresAt!: Date;
  #RedefinicaoUsado: boolean = false;
  #RedefinicaoCreatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  RedefinicaoSenha.constructor()");
  }

  // ========== ID (Auto Increment) ==========
  get RedefinicaoId(): number | null {
    return this.#RedefinicaoId;
  }

  set RedefinicaoId(value: number | null) {
    if (value === null || value === undefined) {
      this.#RedefinicaoId = null;
      return;
    }

    if (!Number.isInteger(value) || value < 1) {
      throw new Error("RedefinicaoId deve ser um inteiro positivo.");
    }

    this.#RedefinicaoId = value;
  }

  // ========== CPF do Usuário ==========
  get UsuarioCPF(): string {
    return this.#UsuarioCPF;
  }

  set UsuarioCPF(value: string) {
    this.#UsuarioCPF = normalizeCPF(value);
  }

  // ========== Token de Redefinição ==========
  get RedefinicaoToken(): string {
    return this.#RedefinicaoToken;
  }

  set RedefinicaoToken(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("RedefinicaoToken deve ser uma string não vazia.");
    }

    const token = value.trim();

    if (!/^[a-f0-9]{64}$/.test(token)) {
      throw new Error("RedefinicaoToken deve ter 64 caracteres hexadecimais.");
    }

    this.#RedefinicaoToken = token;
  }

  // ========== Data de Expiração ==========
  get RedefinicaoExpiresAt(): Date {
    return this.#RedefinicaoExpiresAt;
  }

  set RedefinicaoExpiresAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("RedefinicaoExpiresAt deve ser uma data válida.");
    }

    this.#RedefinicaoExpiresAt = value;
  }

  // ========== Flag: Token foi usado? ==========
  get RedefinicaoUsado(): boolean {
    return this.#RedefinicaoUsado;
  }

  set RedefinicaoUsado(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("RedefinicaoUsado deve ser boolean.");
    }

    this.#RedefinicaoUsado = value;
  }

  // ========== Data de Criação (Read-Only) ==========
  get RedefinicaoCreatedAt(): Date | null {
    return this.#RedefinicaoCreatedAt;
  }

  set RedefinicaoCreatedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#RedefinicaoCreatedAt = null;
      return;
    }

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("RedefinicaoCreatedAt deve ser uma data válida.");
    }

    this.#RedefinicaoCreatedAt = value;
  }
}
