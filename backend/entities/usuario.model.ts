/**
 * Representa a entidade Usuario do sistema.
 *
 * Objetivo:
 * - Encapsular os dados de um usuário.
 * - Garantir integridade dos atributos via getters e setters.
 * - Validar CPF, Email, Telefone e outros campos.
 */
export default class Usuario {
  #UsuarioCPF!: string;
  #UsuarioEmail: string | null = null;
  #UsuarioId: string | null = null;
  #UsuarioTelefone: string | null = null;
  #UsuarioNome!: string;
  #UsuarioSenha!: string;
  #UsuarioEmailVerificado: boolean = false;
  #UsuarioDataNascimento: Date | null = null;
  #UsuarioStatus: "Ativo" | "Inativo" | "Bloqueado" = "Ativo";
  #UsuarioUltimoAcesso: Date | null = null;
  #UsuarioCreatedAt: Date | null = null;
  #UsuarioUpdatedAt: Date | null = null;
  #UsuarioDeletedAt: Date | null = null;

  constructor() {
    console.log("⬆️  Usuario.constructor()");
  }

  // ========== CPF (Primary Key) ==========
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

    // Validar formato regex
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(cpf)) {
      throw new Error("UsuarioCPF deve estar no formato XXX.XXX.XXX-XX.");
    }

    this.#UsuarioCPF = cpf;
  }

  // ========== Email ==========
  get UsuarioEmail(): string | null {
    return this.#UsuarioEmail;
  }

  set UsuarioEmail(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#UsuarioEmail = null;
      return;
    }

    if (typeof value !== "string") {
      throw new Error("UsuarioEmail deve ser uma string.");
    }

    const email = value.trim();

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("UsuarioEmail deve ser um email válido.");
    }

    if (email.length > 60) {
      throw new Error("UsuarioEmail deve ter no máximo 60 caracteres.");
    }

    this.#UsuarioEmail = email;
  }

  // ========== Id ==========
  get UsuarioId(): string | null {
    return this.#UsuarioId;
  }

  set UsuarioId(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#UsuarioId = null;
      return;
    }

    if (typeof value !== "string") {
      throw new Error("UsuarioId deve ser uma string.");
    }

    const id = value.trim();

    if (id.length > 45) {
      throw new Error("UsuarioId deve ter no máximo 45 caracteres.");
    }

    this.#UsuarioId = id;
  }

  // ========== Telefone ==========
  get UsuarioTelefone(): string | null {
    return this.#UsuarioTelefone;
  }

  set UsuarioTelefone(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#UsuarioTelefone = null;
      return;
    }

    if (typeof value !== "string") {
      throw new Error("UsuarioTelefone deve ser uma string.");
    }

    const telefone = value.trim();

    // Validar formato: (XX) XXXXX-XXXX (15 caracteres)
    if (telefone.length !== 15) {
      throw new Error("UsuarioTelefone deve ter exatamente 15 caracteres (formato: (XX) XXXXX-XXXX).");
    }

    const telefoneRegex = /^\(\d{2}\) \d{5}-\d{4}$/;
    if (!telefoneRegex.test(telefone)) {
      throw new Error("UsuarioTelefone deve estar no formato (XX) XXXXX-XXXX.");
    }

    this.#UsuarioTelefone = telefone;
  }

  // ========== Nome ==========
  get UsuarioNome(): string {
    return this.#UsuarioNome;
  }

  set UsuarioNome(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("UsuarioNome deve ser uma string não vazia.");
    }

    const nome = value.trim();

    if (nome.length < 3) {
      throw new Error("UsuarioNome deve ter pelo menos 3 caracteres.");
    }

    if (nome.length > 100) {
      throw new Error("UsuarioNome deve ter no máximo 100 caracteres.");
    }

    this.#UsuarioNome = nome;
  }

  // ========== Senha (Hash) ==========
  get UsuarioSenha(): string {
    return this.#UsuarioSenha;
  }

  set UsuarioSenha(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("UsuarioSenha deve ser uma string não vazia.");
    }

    const senha = value.trim();

    if (senha.length > 100) {
      throw new Error("UsuarioSenha deve ter no máximo 100 caracteres.");
    }

    // Nota: A senha já deve vir hasheada do Service
    // Aqui apenas armazenamos o hash
    this.#UsuarioSenha = senha;
  }

  // ========== Email Verificado ==========
  get UsuarioEmailVerificado(): boolean {
    return this.#UsuarioEmailVerificado;
  }

  set UsuarioEmailVerificado(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("UsuarioEmailVerificado deve ser boolean.");
    }
    this.#UsuarioEmailVerificado = value;
  }

  // ========== Data de Nascimento ==========
  get UsuarioDataNascimento(): Date | null {
    return this.#UsuarioDataNascimento;
  }

  set UsuarioDataNascimento(value: Date | null) {
    if (value === null || value === undefined) {
      this.#UsuarioDataNascimento = null;
      return;
    }

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("UsuarioDataNascimento deve ser uma data válida.");
    }

    // Verificar se data não é futura
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataNasc = new Date(value);
    dataNasc.setHours(0, 0, 0, 0);

    if (dataNasc > hoje) {
      throw new Error("UsuarioDataNascimento não pode ser uma data futura.");
    }

    this.#UsuarioDataNascimento = value;
  }

  // ========== Status ==========
  get UsuarioStatus(): "Ativo" | "Inativo" | "Bloqueado" {
    return this.#UsuarioStatus;
  }

  set UsuarioStatus(value: "Ativo" | "Inativo" | "Bloqueado") {
    const statusValidos = ["Ativo", "Inativo", "Bloqueado"];
    if (!statusValidos.includes(value)) {
      throw new Error("UsuarioStatus deve ser 'Ativo', 'Inativo' ou 'Bloqueado'.");
    }
    this.#UsuarioStatus = value;
  }

  // ========== Último Acesso ==========
  get UsuarioUltimoAcesso(): Date | null {
    return this.#UsuarioUltimoAcesso;
  }

  set UsuarioUltimoAcesso(value: Date | null) {
    if (value === null || value === undefined) {
      this.#UsuarioUltimoAcesso = null;
      return;
    }

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("UsuarioUltimoAcesso deve ser uma data válida.");
    }

    this.#UsuarioUltimoAcesso = value;
  }

  // ========== Created At (Read-Only) ==========
  get UsuarioCreatedAt(): Date | null {
    return this.#UsuarioCreatedAt;
  }

  set UsuarioCreatedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#UsuarioCreatedAt = null;
      return;
    }

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("UsuarioCreatedAt deve ser uma data válida.");
    }

    this.#UsuarioCreatedAt = value;
  }

  // ========== Updated At (Read-Only) ==========
  get UsuarioUpdatedAt(): Date | null {
    return this.#UsuarioUpdatedAt;
  }

  set UsuarioUpdatedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#UsuarioUpdatedAt = null;
      return;
    }

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("UsuarioUpdatedAt deve ser uma data válida.");
    }

    this.#UsuarioUpdatedAt = value;
  }

  // ========== Deleted At (Soft Delete) ==========
  get UsuarioDeletedAt(): Date | null {
    return this.#UsuarioDeletedAt;
  }

  set UsuarioDeletedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#UsuarioDeletedAt = null;
      return;
    }

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("UsuarioDeletedAt deve ser uma data válida.");
    }

    this.#UsuarioDeletedAt = value;
  }
}
