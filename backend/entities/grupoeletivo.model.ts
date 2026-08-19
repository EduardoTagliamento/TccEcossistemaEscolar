/**
 * Entidade GrupoEletivo
 *
 * Agrupamento de alunos independente de Turma, usado como alvo alternativo
 * de alocação de matéria+professor (ver docs/PLANO_IMPLEMENTACAO_GRUPO_ELETIVO.md).
 * Não guarda as turmas de origem dos membros — só quem está dentro hoje,
 * via matrículas-sombra (matricula.GrupoEletivoGUID).
 *
 * Relacionamentos:
 * - N:1 com Escola
 * - 1:N com Matricula (matrículas-sombra, membros)
 * - 1:N com MateriaxProfessorxTurma (alocações de professor+matéria)
 */
export default class GrupoEletivo {
  #GrupoEletivoGUID!: string;
  #EscolaGUID!: string;
  #GrupoEletivoNome!: string;
  #GrupoEletivoStatus!: 'Ativo' | 'Inativo';
  #CreatedAt!: Date;
  #UpdatedAt!: Date;

  // ==================== GETTERS ====================

  get GrupoEletivoGUID(): string {
    return this.#GrupoEletivoGUID;
  }

  get EscolaGUID(): string {
    return this.#EscolaGUID;
  }

  get GrupoEletivoNome(): string {
    return this.#GrupoEletivoNome;
  }

  get GrupoEletivoStatus(): 'Ativo' | 'Inativo' {
    return this.#GrupoEletivoStatus;
  }

  get CreatedAt(): Date {
    return this.#CreatedAt;
  }

  get UpdatedAt(): Date {
    return this.#UpdatedAt;
  }

  // ==================== SETTERS ====================

  set GrupoEletivoGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('GrupoEletivoGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#GrupoEletivoGUID = value.trim();
  }

  set EscolaGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('EscolaGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#EscolaGUID = value.trim();
  }

  set GrupoEletivoNome(value: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error('GrupoEletivoNome deve ser uma string não vazia');
    }
    const nome = value.trim();
    if (nome.length > 80) {
      throw new Error('GrupoEletivoNome deve ter no máximo 80 caracteres');
    }
    this.#GrupoEletivoNome = nome;
  }

  set GrupoEletivoStatus(value: 'Ativo' | 'Inativo') {
    if (value !== 'Ativo' && value !== 'Inativo') {
      throw new Error('GrupoEletivoStatus deve ser "Ativo" ou "Inativo"');
    }
    this.#GrupoEletivoStatus = value;
  }

  set CreatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('CreatedAt deve ser uma data válida');
    }
    this.#CreatedAt = value;
  }

  set UpdatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('UpdatedAt deve ser uma data válida');
    }
    this.#UpdatedAt = value;
  }

  // ==================== MÉTODOS ====================

  validar(): void {
    if (!this.#GrupoEletivoGUID) throw new Error('GrupoEletivoGUID é obrigatório');
    if (!this.#EscolaGUID) throw new Error('EscolaGUID é obrigatório');
    if (!this.#GrupoEletivoNome) throw new Error('GrupoEletivoNome é obrigatório');
    if (!this.#GrupoEletivoStatus) throw new Error('GrupoEletivoStatus é obrigatório');
    if (!this.#CreatedAt) throw new Error('CreatedAt é obrigatório');
    if (!this.#UpdatedAt) throw new Error('UpdatedAt é obrigatório');
  }

  toJSON() {
    return {
      GrupoEletivoGUID: this.#GrupoEletivoGUID,
      EscolaGUID: this.#EscolaGUID,
      GrupoEletivoNome: this.#GrupoEletivoNome,
      GrupoEletivoStatus: this.#GrupoEletivoStatus,
      CreatedAt: this.#CreatedAt,
      UpdatedAt: this.#UpdatedAt,
    };
  }

  static fromDatabase(data: any): GrupoEletivo {
    const grupo = new GrupoEletivo();
    grupo.GrupoEletivoGUID = data.GrupoEletivoGUID;
    grupo.EscolaGUID = data.EscolaGUID;
    grupo.GrupoEletivoNome = data.GrupoEletivoNome;
    grupo.GrupoEletivoStatus = data.GrupoEletivoStatus;
    grupo.CreatedAt = data.CreatedAt;
    grupo.UpdatedAt = data.UpdatedAt;
    return grupo;
  }
}
