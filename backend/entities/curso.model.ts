/**
 * Entidade Curso
 * 
 * Representa um curso técnico oferecido por uma escola.
 * 
 * Regras de negócio:
 * - Cursos são SEMPRE técnicos (não existe curso regular)
 * - Só podem ser criados em escolas técnicas (EscolaIsTecnica = TRUE)
 * - CursoNome único por escola
 * - Status: Ativo ou Inativo (soft delete)
 * 
 * Relacionamentos:
 * - N:1 com Escola (escola técnica)
 * - 1:N com Turma (turmas vinculadas ao curso)
 */
export default class Curso {
  // Campos privados (encapsulamento)
  #CursoGUID!: string;
  #EscolaGUID!: string;
  #CursoNome!: string;
  #CursoStatus!: 'Ativo' | 'Inativo';
  #CursoCreatedAt!: Date;
  #CursoUpdatedAt!: Date;

  // ==================== GETTERS ====================

  get CursoGUID(): string {
    return this.#CursoGUID;
  }

  get EscolaGUID(): string {
    return this.#EscolaGUID;
  }

  get CursoNome(): string {
    return this.#CursoNome;
  }

  get CursoStatus(): 'Ativo' | 'Inativo' {
    return this.#CursoStatus;
  }

  get CursoCreatedAt(): Date {
    return this.#CursoCreatedAt;
  }

  get CursoUpdatedAt(): Date {
    return this.#CursoUpdatedAt;
  }

  // ==================== SETTERS ====================

  set CursoGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('CursoGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#CursoGUID = value.trim();
  }

  set EscolaGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('EscolaGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#EscolaGUID = value.trim();
  }

  set CursoNome(value: string) {
    if (typeof value !== 'string') {
      throw new Error('CursoNome deve ser uma string');
    }
    const trimmed = value.trim();
    if (trimmed.length < 3 || trimmed.length > 100) {
      throw new Error('CursoNome deve ter entre 3 e 100 caracteres');
    }
    this.#CursoNome = trimmed;
  }

  set CursoStatus(value: 'Ativo' | 'Inativo') {
    if (value !== 'Ativo' && value !== 'Inativo') {
      throw new Error('CursoStatus deve ser "Ativo" ou "Inativo"');
    }
    this.#CursoStatus = value;
  }

  set CursoCreatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('CursoCreatedAt deve ser uma data válida');
    }
    this.#CursoCreatedAt = value;
  }

  set CursoUpdatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('CursoUpdatedAt deve ser uma data válida');
    }
    this.#CursoUpdatedAt = value;
  }

  // ==================== MÉTODOS ====================

  /**
   * Valida se todos os campos obrigatórios foram preenchidos
   */
  validar(): void {
    if (!this.#CursoGUID) throw new Error('CursoGUID é obrigatório');
    if (!this.#EscolaGUID) throw new Error('EscolaGUID é obrigatório');
    if (!this.#CursoNome) throw new Error('CursoNome é obrigatório');
    if (!this.#CursoStatus) throw new Error('CursoStatus é obrigatório');
    if (!this.#CursoCreatedAt) throw new Error('CursoCreatedAt é obrigatório');
    if (!this.#CursoUpdatedAt) throw new Error('CursoUpdatedAt é obrigatório');
  }

  /**
   * Converte a entidade para objeto simples (para JSON)
   */
  toJSON() {
    return {
      CursoGUID: this.#CursoGUID,
      EscolaGUID: this.#EscolaGUID,
      CursoNome: this.#CursoNome,
      CursoStatus: this.#CursoStatus,
      CursoCreatedAt: this.#CursoCreatedAt,
      CursoUpdatedAt: this.#CursoUpdatedAt,
    };
  }

  /**
   * Cria instância a partir de objeto do banco
   */
  static fromDatabase(data: any): Curso {
    const curso = new Curso();
    curso.CursoGUID = data.CursoGUID;
    curso.EscolaGUID = data.EscolaGUID;
    curso.CursoNome = data.CursoNome;
    curso.CursoStatus = data.CursoStatus;
    curso.CursoCreatedAt = data.CursoCreatedAt;
    curso.CursoUpdatedAt = data.CursoUpdatedAt;
    return curso;
  }
}
