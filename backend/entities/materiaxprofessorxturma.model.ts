/**
 * Entidade MaterialProfessorTurma (Tabela de Junção)
 * 
 * Representa a alocação de um professor em uma matéria+turma.
 * 
 * Regras de negócio:
 * - Professor = Usuário com FuncaoId=3 na escola
 * - Uma alocação = Professor + Matéria + Turma (UNIQUE)
 * - Status: Ativa, Inativa
 * - Matéria e Turma devem ser da mesma escola
 * - Professor deve estar ativo na escola (Status='Ativo' em escolaxusuarioxfuncao)
 * 
 * Relacionamentos:
 * - N:1 com Materia
 * - N:1 com Turma
 * - N:1 com Usuario (professor)
 */
export default class MaterialProfessorTurma {
  // Campos privados (encapsulamento)
  #MatProfTurGUID!: string;
  #MateriaGUID!: string;
  #TurmaGUID!: string;
  #UsuarioCPF!: string;
  #AlocacaoStatus!: 'Ativa' | 'Inativa';
  #AlocacaoCreatedAt!: Date;
  #AlocacaoUpdatedAt!: Date;

  // ==================== GETTERS ====================

  get MatProfTurGUID(): string {
    return this.#MatProfTurGUID;
  }

  get MateriaGUID(): string {
    return this.#MateriaGUID;
  }

  get TurmaGUID(): string {
    return this.#TurmaGUID;
  }

  get UsuarioCPF(): string {
    return this.#UsuarioCPF;
  }

  get AlocacaoStatus(): 'Ativa' | 'Inativa' {
    return this.#AlocacaoStatus;
  }

  get AlocacaoCreatedAt(): Date {
    return this.#AlocacaoCreatedAt;
  }

  get AlocacaoUpdatedAt(): Date {
    return this.#AlocacaoUpdatedAt;
  }

  // ==================== SETTERS ====================

  set MatProfTurGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('MatProfTurGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#MatProfTurGUID = value.trim();
  }

  set MateriaGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('MateriaGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#MateriaGUID = value.trim();
  }

  set TurmaGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('TurmaGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#TurmaGUID = value.trim();
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

  set AlocacaoStatus(value: 'Ativa' | 'Inativa') {
    if (value !== 'Ativa' && value !== 'Inativa') {
      throw new Error('AlocacaoStatus deve ser "Ativa" ou "Inativa"');
    }
    this.#AlocacaoStatus = value;
  }

  set AlocacaoCreatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('AlocacaoCreatedAt deve ser uma data válida');
    }
    this.#AlocacaoCreatedAt = value;
  }

  set AlocacaoUpdatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('AlocacaoUpdatedAt deve ser uma data válida');
    }
    this.#AlocacaoUpdatedAt = value;
  }

  // ==================== MÉTODOS ====================

  /**
   * Valida se todos os campos obrigatórios foram preenchidos
   */
  validar(): void {
    if (!this.#MatProfTurGUID) throw new Error('MatProfTurGUID é obrigatório');
    if (!this.#MateriaGUID) throw new Error('MateriaGUID é obrigatório');
    if (!this.#TurmaGUID) throw new Error('TurmaGUID é obrigatório');
    if (!this.#UsuarioCPF) throw new Error('UsuarioCPF é obrigatório');
    if (!this.#AlocacaoStatus) throw new Error('AlocacaoStatus é obrigatório');
    if (!this.#AlocacaoCreatedAt) throw new Error('AlocacaoCreatedAt é obrigatório');
    if (!this.#AlocacaoUpdatedAt) throw new Error('AlocacaoUpdatedAt é obrigatório');
  }

  /**
   * Converte a entidade para objeto simples (para JSON)
   */
  toJSON() {
    return {
      MatProfTurGUID: this.#MatProfTurGUID,
      MateriaGUID: this.#MateriaGUID,
      TurmaGUID: this.#TurmaGUID,
      UsuarioCPF: this.#UsuarioCPF,
      AlocacaoStatus: this.#AlocacaoStatus,
      AlocacaoCreatedAt: this.#AlocacaoCreatedAt,
      AlocacaoUpdatedAt: this.#AlocacaoUpdatedAt,
    };
  }

  /**
   * Cria instância a partir de objeto do banco
   */
  static fromDatabase(data: any): MaterialProfessorTurma {
    const alocacao = new MaterialProfessorTurma();
    alocacao.MatProfTurGUID = data.MatProfTurGUID;
    alocacao.MateriaGUID = data.MateriaGUID;
    alocacao.TurmaGUID = data.TurmaGUID;
    alocacao.UsuarioCPF = data.UsuarioCPF;
    alocacao.AlocacaoStatus = data.AlocacaoStatus;
    alocacao.AlocacaoCreatedAt = data.AlocacaoCreatedAt;
    alocacao.AlocacaoUpdatedAt = data.AlocacaoUpdatedAt;
    return alocacao;
  }
}
