/**
 * Entidade Matrícula
 * 
 * Representa a matrícula de um aluno (usuário) em uma turma.
 * 
 * Regras de negócio:
 * - MatriculaGUID: aceita RA customizado (1-36 chars) OU gera UUID
 * - Um aluno só pode ter UMA matrícula ativa por vez
 * - Status: Ativa, Transferida, Concluida, Cancelada
 * - MatriculaDataSaida: null enquanto ativa
 * - Transferência: operação transacional (encerra origem + cria destino)
 * 
 * Relacionamentos:
 * - N:1 com Usuario (aluno)
 * - N:1 com Turma
 */
export default class Matricula {
  // Campos privados (encapsulamento)
  #MatriculaGUID!: string;
  #UsuarioCPF!: string;
  #TurmaGUID!: string;
  #MatriculaDataEntrada!: Date;
  #MatriculaDataSaida!: Date | null;
  #MatriculaStatus!: 'Ativa' | 'Transferida' | 'Concluida' | 'Cancelada';
  #MatriculaCreatedAt!: Date;
  #MatriculaUpdatedAt!: Date;

  // ==================== GETTERS ====================

  get MatriculaGUID(): string {
    return this.#MatriculaGUID;
  }

  get UsuarioCPF(): string {
    return this.#UsuarioCPF;
  }

  get TurmaGUID(): string {
    return this.#TurmaGUID;
  }

  get MatriculaDataEntrada(): Date | null{
    return this.#MatriculaDataEntrada;
  }

  get MatriculaDataSaida(): Date | null {
    return this.#MatriculaDataSaida;
  }

  get MatriculaStatus(): 'Ativa' | 'Transferida' | 'Concluida' | 'Cancelada' {
    return this.#MatriculaStatus;
  }

  get MatriculaCreatedAt(): Date {
    return this.#MatriculaCreatedAt;
  }

  get MatriculaUpdatedAt(): Date {
    return this.#MatriculaUpdatedAt;
  }

  // ==================== SETTERS ====================

  set MatriculaGUID(value: string) {
    if (typeof value !== 'string') {
      throw new Error('MatriculaGUID deve ser uma string');
    }
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 36) {
      throw new Error('MatriculaGUID deve ter entre 1 e 36 caracteres');
    }
    this.#MatriculaGUID = trimmed;
  }

  set UsuarioCPF(value: string) {
    if (typeof value !== 'string') {
      throw new Error('UsuarioCPF deve ser uma string');
    }
    // Validação básica de CPF (11 dígitos)
    const cpfLimpo = value.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPF deve ter 11 dígitos');
    }
    this.#UsuarioCPF = cpfLimpo;
  }

  set TurmaGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('TurmaGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#TurmaGUID = value.trim();
  }

  set MatriculaDataEntrada(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('MatriculaDataEntrada deve ser uma data válida');
    }
    this.#MatriculaDataEntrada = value;
  }

  set MatriculaDataSaida(value: Date | null) {
    if (value === null) {
      this.#MatriculaDataSaida = null;
      return;
    }
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('MatriculaDataSaida deve ser uma data válida ou null');
    }
    this.#MatriculaDataSaida = value;
  }

  set MatriculaStatus(value: 'Ativa' | 'Transferida' | 'Concluida' | 'Cancelada') {
    if (
      value !== 'Ativa' &&
      value !== 'Transferida' &&
      value !== 'Concluida' &&
      value !== 'Cancelada'
    ) {
      throw new Error('MatriculaStatus deve ser "Ativa", "Transferida", "Concluida" ou "Cancelada"');
    }
    this.#MatriculaStatus = value;
  }

  set MatriculaCreatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('MatriculaCreatedAt deve ser uma data válida');
    }
    this.#MatriculaCreatedAt = value;
  }

  set MatriculaUpdatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('MatriculaUpdatedAt deve ser uma data válida');
    }
    this.#MatriculaUpdatedAt = value;
  }

  // ==================== MÉTODOS ====================

  /**
   * Valida se todos os campos obrigatórios foram preenchidos
   */
  validar(): void {
    if (!this.#MatriculaGUID) throw new Error('MatriculaGUID é obrigatório');
    if (!this.#UsuarioCPF) throw new Error('UsuarioCPF é obrigatório');
    if (!this.#TurmaGUID) throw new Error('TurmaGUID é obrigatório');
    if (!this.#MatriculaDataEntrada) throw new Error('MatriculaDataEntrada é obrigatório');
    // MatriculaDataSaida é opcional (nullable)
    if (!this.#MatriculaStatus) throw new Error('MatriculaStatus é obrigatório');
    if (!this.#MatriculaCreatedAt) throw new Error('MatriculaCreatedAt é obrigatório');
    if (!this.#MatriculaUpdatedAt) throw new Error('MatriculaUpdatedAt é obrigatório');
  }

  /**
   * Converte a entidade para objeto simples (para JSON)
   */
  toJSON() {
    return {
      MatriculaGUID: this.#MatriculaGUID,
      UsuarioCPF: this.#UsuarioCPF,
      TurmaGUID: this.#TurmaGUID,
      MatriculaDataEntrada: this.#MatriculaDataEntrada,
      MatriculaDataSaida: this.#MatriculaDataSaida,
      MatriculaStatus: this.#MatriculaStatus,
      MatriculaCreatedAt: this.#MatriculaCreatedAt,
      MatriculaUpdatedAt: this.#MatriculaUpdatedAt,
    };
  }

  /**
   * Cria instância a partir de objeto do banco
   */
  static fromDatabase(data: any): Matricula {
    const matricula = new Matricula();
    matricula.MatriculaGUID = data.MatriculaGUID;
    matricula.UsuarioCPF = data.UsuarioCPF;
    matricula.TurmaGUID = data.TurmaGUID;
    matricula.MatriculaDataEntrada = data.MatriculaDataEntrada;
    matricula.MatriculaDataSaida = data.MatriculaDataSaida;
    matricula.MatriculaStatus = data.MatriculaStatus;
    matricula.MatriculaCreatedAt = data.MatriculaCreatedAt;
    matricula.MatriculaUpdatedAt = data.MatriculaUpdatedAt;
    return matricula;
  }
}
