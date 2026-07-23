/**
 * Entidade Turma
 * 
 * Representa uma turma em uma escola (técnica ou regular).
 * 
 * Regras de negócio:
 * - TurmaSerie + TurmaNome único por escola (UNIQUE composto)
 * - TurmaIsTecnico = true requer EscolaIsTecnica = true
 * - Se escola não-técnica, TurmaIsTecnico = false e CursoGUID = null
 * - CursoGUID opcional (turma técnica pode ou não ter curso)
 * - Se CursoGUID informado, deve pertencer à mesma escola
 * - Status: Ativa, Inativa ou Encerrada
 * 
 * Relacionamentos:
 * - N:1 com Escola (obrigatório)
 * - N:1 com Curso (opcional, nullable)
 * - 1:N com Matrícula (alunos matriculados)
 */
export default class Turma {
  // Campos privados (encapsulamento)
  #TurmaGUID!: string;
  #EscolaGUID!: string;
  #TurmaSerie!: string;
  #TurmaNome!: string;
  #TurmaIsTecnico!: boolean;
  #CursoGUID!: string | null;
  #TurmaStatus!: 'Ativa' | 'Inativa' | 'Encerrada';
  #TurmaImagemUrl: string | null = null;
  #TurmaCorFundo: string | null = null;
  #TurmaCreatedAt!: Date;
  #TurmaUpdatedAt!: Date;

  // ==================== GETTERS ====================

  get TurmaGUID(): string {
    return this.#TurmaGUID;
  }

  get EscolaGUID(): string {
    return this.#EscolaGUID;
  }

  get TurmaSerie(): string {
    return this.#TurmaSerie;
  }

  get TurmaNome(): string {
    return this.#TurmaNome;
  }

  get TurmaIsTecnico(): boolean {
    return this.#TurmaIsTecnico;
  }

  get CursoGUID(): string | null {
    return this.#CursoGUID;
  }

  get TurmaStatus(): 'Ativa' | 'Inativa' | 'Encerrada' {
    return this.#TurmaStatus;
  }

  get TurmaImagemUrl(): string | null {
    return this.#TurmaImagemUrl;
  }

  get TurmaCorFundo(): string | null {
    return this.#TurmaCorFundo;
  }

  get TurmaCreatedAt(): Date {
    return this.#TurmaCreatedAt;
  }

  get TurmaUpdatedAt(): Date {
    return this.#TurmaUpdatedAt;
  }

  // ==================== SETTERS ====================

  set TurmaGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('TurmaGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#TurmaGUID = value.trim();
  }

  set EscolaGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('EscolaGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#EscolaGUID = value.trim();
  }

  set TurmaSerie(value: string) {
    if (typeof value !== 'string') {
      throw new Error('TurmaSerie deve ser uma string');
    }
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 20) {
      throw new Error('TurmaSerie deve ter entre 1 e 20 caracteres');
    }
    this.#TurmaSerie = trimmed;
  }

  set TurmaNome(value: string) {
    if (typeof value !== 'string') {
      throw new Error('TurmaNome deve ser uma string');
    }
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 50) {
      throw new Error('TurmaNome deve ter entre 1 e 50 caracteres');
    }
    this.#TurmaNome = trimmed;
  }

  set TurmaIsTecnico(value: boolean) {
    if (typeof value !== 'boolean') {
      throw new Error('TurmaIsTecnico deve ser um boolean');
    }
    this.#TurmaIsTecnico = value;
  }

  set CursoGUID(value: string | null) {
    if (value === null) {
      this.#CursoGUID = null;
      return;
    }
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('CursoGUID deve ser um UUID válido (36 caracteres) ou null');
    }
    this.#CursoGUID = value.trim();
  }

  set TurmaStatus(value: 'Ativa' | 'Inativa' | 'Encerrada') {
    if (value !== 'Ativa' && value !== 'Inativa' && value !== 'Encerrada') {
      throw new Error('TurmaStatus deve ser "Ativa", "Inativa" ou "Encerrada"');
    }
    this.#TurmaStatus = value;
  }

  set TurmaImagemUrl(value: string | null) {
    if (value === null) {
      this.#TurmaImagemUrl = null;
      return;
    }
    if (typeof value !== 'string' || value.trim().length > 500) {
      throw new Error('TurmaImagemUrl deve ser uma string de até 500 caracteres');
    }
    this.#TurmaImagemUrl = value.trim();
  }

  set TurmaCorFundo(value: string | null) {
    if (value === null) {
      this.#TurmaCorFundo = null;
      return;
    }
    const cor = value.trim();
    if (!/^#?[0-9a-fA-F]{6}$/.test(cor)) {
      throw new Error('TurmaCorFundo deve ser uma cor hexadecimal válida (ex: #17C077)');
    }
    this.#TurmaCorFundo = cor.startsWith('#') ? cor : `#${cor}`;
  }

  set TurmaCreatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('TurmaCreatedAt deve ser uma data válida');
    }
    this.#TurmaCreatedAt = value;
  }

  set TurmaUpdatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('TurmaUpdatedAt deve ser uma data válida');
    }
    this.#TurmaUpdatedAt = value;
  }

  // ==================== MÉTODOS ====================

  /**
   * Valida se todos os campos obrigatórios foram preenchidos
   */
  validar(): void {
    if (!this.#TurmaGUID) throw new Error('TurmaGUID é obrigatório');
    if (!this.#EscolaGUID) throw new Error('EscolaGUID é obrigatório');
    if (!this.#TurmaSerie) throw new Error('TurmaSerie é obrigatório');
    if (!this.#TurmaNome) throw new Error('TurmaNome é obrigatório');
    if (this.#TurmaIsTecnico === undefined) throw new Error('TurmaIsTecnico é obrigatório');
    // CursoGUID é opcional (nullable)
    if (!this.#TurmaStatus) throw new Error('TurmaStatus é obrigatório');
    if (!this.#TurmaCreatedAt) throw new Error('TurmaCreatedAt é obrigatório');
    if (!this.#TurmaUpdatedAt) throw new Error('TurmaUpdatedAt é obrigatório');
  }

  /**
   * Converte a entidade para objeto simples (para JSON)
   */
  toJSON() {
    return {
      TurmaGUID: this.#TurmaGUID,
      EscolaGUID: this.#EscolaGUID,
      TurmaSerie: this.#TurmaSerie,
      TurmaNome: this.#TurmaNome,
      TurmaIsTecnico: this.#TurmaIsTecnico,
      CursoGUID: this.#CursoGUID,
      TurmaStatus: this.#TurmaStatus,
      TurmaImagemUrl: this.#TurmaImagemUrl,
      TurmaCorFundo: this.#TurmaCorFundo,
      TurmaCreatedAt: this.#TurmaCreatedAt,
      TurmaUpdatedAt: this.#TurmaUpdatedAt,
    };
  }

  /**
   * Cria instância a partir de objeto do banco
   */
  static fromDatabase(data: any): Turma {
    const turma = new Turma();
    turma.TurmaGUID = data.TurmaGUID;
    turma.EscolaGUID = data.EscolaGUID;
    turma.TurmaSerie = data.TurmaSerie;
    turma.TurmaNome = data.TurmaNome;
    turma.TurmaIsTecnico = data.TurmaIsTecnico;
    turma.CursoGUID = data.CursoGUID;
    turma.TurmaStatus = data.TurmaStatus;
    turma.TurmaImagemUrl = data.TurmaImagemUrl ?? null;
    turma.TurmaCorFundo = data.TurmaCorFundo ?? null;
    turma.TurmaCreatedAt = data.TurmaCreatedAt;
    turma.TurmaUpdatedAt = data.TurmaUpdatedAt;
    return turma;
  }
}
