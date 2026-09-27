/**
 * Entidade ProfessorMateria (Tabela de Junção)
 *
 * Representa a QUALIFICAÇÃO de um professor pra lecionar uma matéria numa
 * escola — independente de turma. Existe pra resolver o bootstrap de
 * "professor só pode ser alocado (materiaxprofessorxturma) em matérias que
 * ele está qualificado a lecionar": sem isso, não haveria como representar
 * "professor X pode lecionar Y" antes de existir uma turma pra alocar.
 *
 * Regras de negócio:
 * - Professor = Usuário com FuncaoId=3 na escola
 * - Uma qualificação = Professor + Matéria (UNIQUE)
 * - Status: Ativa, Inativa
 * - Matéria deve ser da mesma escola (EscolaGUID)
 *
 * Relacionamentos:
 * - N:1 com Materia
 * - N:1 com Usuario (professor)
 * - N:1 com Escola
 */
export default class ProfessorMateria {
  #ProfessorMateriaGUID!: string;
  #EscolaGUID!: string;
  #UsuarioGUID!: string;
  #MateriaGUID!: string;
  #ProfessorMateriaStatus!: 'Ativa' | 'Inativa';
  #CreatedAt!: Date;
  #UpdatedAt!: Date;

  // ==================== GETTERS ====================

  get ProfessorMateriaGUID(): string {
    return this.#ProfessorMateriaGUID;
  }

  get EscolaGUID(): string {
    return this.#EscolaGUID;
  }

  get UsuarioGUID(): string {
    return this.#UsuarioGUID;
  }

  get MateriaGUID(): string {
    return this.#MateriaGUID;
  }

  get ProfessorMateriaStatus(): 'Ativa' | 'Inativa' {
    return this.#ProfessorMateriaStatus;
  }

  get CreatedAt(): Date {
    return this.#CreatedAt;
  }

  get UpdatedAt(): Date {
    return this.#UpdatedAt;
  }

  // ==================== SETTERS ====================

  set ProfessorMateriaGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('ProfessorMateriaGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#ProfessorMateriaGUID = value.trim();
  }

  set EscolaGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('EscolaGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#EscolaGUID = value.trim();
  }

  set UsuarioGUID(value: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error('UsuarioGUID deve ser uma string não vazia');
    }
    this.#UsuarioGUID = value.trim();
  }

  set MateriaGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('MateriaGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#MateriaGUID = value.trim();
  }

  set ProfessorMateriaStatus(value: 'Ativa' | 'Inativa') {
    if (value !== 'Ativa' && value !== 'Inativa') {
      throw new Error('ProfessorMateriaStatus deve ser "Ativa" ou "Inativa"');
    }
    this.#ProfessorMateriaStatus = value;
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
    if (!this.#ProfessorMateriaGUID) throw new Error('ProfessorMateriaGUID é obrigatório');
    if (!this.#EscolaGUID) throw new Error('EscolaGUID é obrigatório');
    if (!this.#UsuarioGUID) throw new Error('UsuarioGUID é obrigatório');
    if (!this.#MateriaGUID) throw new Error('MateriaGUID é obrigatório');
    if (!this.#ProfessorMateriaStatus) throw new Error('ProfessorMateriaStatus é obrigatório');
    if (!this.#CreatedAt) throw new Error('CreatedAt é obrigatório');
    if (!this.#UpdatedAt) throw new Error('UpdatedAt é obrigatório');
  }

  toJSON() {
    return {
      ProfessorMateriaGUID: this.#ProfessorMateriaGUID,
      EscolaGUID: this.#EscolaGUID,
      UsuarioGUID: this.#UsuarioGUID,
      MateriaGUID: this.#MateriaGUID,
      ProfessorMateriaStatus: this.#ProfessorMateriaStatus,
      CreatedAt: this.#CreatedAt,
      UpdatedAt: this.#UpdatedAt,
    };
  }

  static fromDatabase(data: any): ProfessorMateria {
    const pm = new ProfessorMateria();
    pm.ProfessorMateriaGUID = data.ProfessorMateriaGUID;
    pm.EscolaGUID = data.EscolaGUID;
    pm.UsuarioGUID = data.UsuarioGUID;
    pm.MateriaGUID = data.MateriaGUID;
    pm.ProfessorMateriaStatus = data.ProfessorMateriaStatus;
    pm.CreatedAt = data.CreatedAt;
    pm.UpdatedAt = data.UpdatedAt;
    return pm;
  }
}
