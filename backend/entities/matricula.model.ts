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
  #UsuarioGUID!: string;
  #TurmaGUID: string | null = null;
  #GrupoEletivoGUID: string | null = null;
  #MatriculaDataEntrada!: Date;
  #MatriculaDataSaida!: Date | null;
  #MatriculaStatus!: 'Ativa' | 'Transferida' | 'Concluida' | 'Cancelada';
  #MatriculaCreatedAt!: Date;
  #MatriculaUpdatedAt!: Date;

  // ==================== GETTERS ====================

  get MatriculaGUID(): string {
    return this.#MatriculaGUID;
  }

  get UsuarioGUID(): string {
    return this.#UsuarioGUID;
  }

  get TurmaGUID(): string | null {
    return this.#TurmaGUID;
  }

  get GrupoEletivoGUID(): string | null {
    return this.#GrupoEletivoGUID;
  }

  get MatriculaDataEntrada(): Date {
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

  set UsuarioGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("UsuarioGUID deve ser uma string não vazia.");
    }
    this.#UsuarioGUID = value;
  }

  set TurmaGUID(value: string | null) {
    if (value === null || value === undefined) {
      this.#TurmaGUID = null;
      return;
    }
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('TurmaGUID deve ser um UUID válido (36 caracteres) ou null');
    }
    this.#TurmaGUID = value.trim();
  }

  /**
   * Matrícula-sombra de grupo eletivo: mutuamente exclusiva com TurmaGUID
   * (ver docs/PLANO_IMPLEMENTACAO_GRUPO_ELETIVO.md, §2). Não é exposta como
   * "matrícula" na UI — existe só pra tarefaacademica_matricula/
   * conteudoprogresso continuarem funcionando sem mudança pra alunos de
   * grupo eletivo.
   */
  set GrupoEletivoGUID(value: string | null) {
    if (value === null || value === undefined) {
      this.#GrupoEletivoGUID = null;
      return;
    }
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('GrupoEletivoGUID deve ser um UUID válido (36 caracteres) ou null');
    }
    this.#GrupoEletivoGUID = value.trim();
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
    if (!this.#UsuarioGUID) throw new Error('UsuarioGUID é obrigatório');
    if (!this.#TurmaGUID && !this.#GrupoEletivoGUID) {
      throw new Error('Matrícula precisa de TurmaGUID ou GrupoEletivoGUID');
    }
    if (this.#TurmaGUID && this.#GrupoEletivoGUID) {
      throw new Error('Matrícula não pode ter TurmaGUID e GrupoEletivoGUID ao mesmo tempo');
    }
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
      UsuarioGUID: this.#UsuarioGUID,
      TurmaGUID: this.#TurmaGUID,
      GrupoEletivoGUID: this.#GrupoEletivoGUID,
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
    matricula.UsuarioGUID = data.UsuarioGUID;
    matricula.TurmaGUID = data.TurmaGUID ?? null;
    matricula.GrupoEletivoGUID = data.GrupoEletivoGUID ?? null;
    matricula.MatriculaDataEntrada = data.MatriculaDataEntrada;
    matricula.MatriculaDataSaida = data.MatriculaDataSaida;
    matricula.MatriculaStatus = data.MatriculaStatus;
    matricula.MatriculaCreatedAt = data.MatriculaCreatedAt;
    matricula.MatriculaUpdatedAt = data.MatriculaUpdatedAt;
    return matricula;
  }
}
