/**
 * Representa a entidade VerificacaoEmail do sistema.
 * 
 * Objetivo:
 * - Armazenar códigos de verificação enviados por email
 * - Controlar expiração e uso único dos códigos
 */
export default class VerificacaoEmail {
  #VerificacaoId: number | null = null;
  #UsuarioCPF!: string;
  #VerificacaoCodigo!: string;
  #VerificacaoExpiresAt!: Date;
  #VerificacaoUsado: boolean = false;
  #VerificacaoCreatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  VerificacaoEmail.constructor()");
  }

  // ========== ID (Auto Increment) ==========
  get VerificacaoId(): number | null {
    return this.#VerificacaoId;
  }

  set VerificacaoId(value: number | null) {
    if (value === null || value === undefined) {
      this.#VerificacaoId = null;
      return;
    }

    if (!Number.isInteger(value) || value < 1) {
      throw new Error("VerificacaoId deve ser um inteiro positivo.");
    }

    this.#VerificacaoId = value;
  }

  // ========== CPF do Usuário ==========
  get UsuarioCPF(): string {
    return this.#UsuarioCPF;
  }

  set UsuarioCPF(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("UsuarioCPF deve ser uma string não vazia.");
    }

    const cpf = value.trim();
    
    // Validar formato: XXX.XXX.XXX-XX (14 caracteres)
    if (cpf.length !== 14) {
      throw new Error("UsuarioCPF deve ter exatamente 14 caracteres (formato: XXX.XXX.XXX-XX).");
    }

    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(cpf)) {
      throw new Error("UsuarioCPF deve estar no formato XXX.XXX.XXX-XX.");
    }

    this.#UsuarioCPF = cpf;
  }

  // ========== Código de Verificação ==========
  get VerificacaoCodigo(): string {
    return this.#VerificacaoCodigo;
  }

  set VerificacaoCodigo(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("VerificacaoCodigo deve ser uma string não vazia.");
    }

    const codigo = value.trim();

    // Validar formato: 6 dígitos numéricos
    if (codigo.length !== 6) {
      throw new Error("VerificacaoCodigo deve ter exatamente 6 dígitos.");
    }

    const codigoRegex = /^\d{6}$/;
    if (!codigoRegex.test(codigo)) {
      throw new Error("VerificacaoCodigo deve conter apenas dígitos numéricos (0-9).");
    }

    this.#VerificacaoCodigo = codigo;
  }

  // ========== Data de Expiração ==========
  get VerificacaoExpiresAt(): Date {
    return this.#VerificacaoExpiresAt;
  }

  set VerificacaoExpiresAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("VerificacaoExpiresAt deve ser uma data válida.");
    }

    this.#VerificacaoExpiresAt = value;
  }

  // ========== Flag: Código foi usado? ==========
  get VerificacaoUsado(): boolean {
    return this.#VerificacaoUsado;
  }

  set VerificacaoUsado(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("VerificacaoUsado deve ser boolean.");
    }

    this.#VerificacaoUsado = value;
  }

  // ========== Data de Criação (Read-Only) ==========
  get VerificacaoCreatedAt(): Date | null {
    return this.#VerificacaoCreatedAt;
  }

  set VerificacaoCreatedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#VerificacaoCreatedAt = null;
      return;
    }

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("VerificacaoCreatedAt deve ser uma data válida.");
    }

    this.#VerificacaoCreatedAt = value;
  }
}
