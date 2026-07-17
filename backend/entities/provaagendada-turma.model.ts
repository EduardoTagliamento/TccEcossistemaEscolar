/**
 * Entidade ProvaAgendadaTurma (Tabela Intermediária)
 * 
 * Representa a atribuição de uma prova a uma turma específica.
 * Relacionamento N:N entre ProvaAgendada e Turma.
 * 
 * Regras de negócio:
 * - Cada prova pode ser atribuída a múltiplas turmas
 * - Cada turma pode ter múltiplas provas
 * - Uma prova é criada UMA VEZ e compartilhada por N turmas
 * 
 * Relacionamentos:
 * - N:1 com ProvaAgendada
 * - N:1 com Turma
 */

import ErrorResponse from "../utils/ErrorResponse";

export default class ProvaAgendadaTurma {
  // Campos privados (encapsulamento)
  #ProvaAgendadaTurmaGUID!: string;
  #ProvaAgendadaGUID!: string;
  #TurmaGUID!: string;
  #ProvaDataTurma: Date | null = null;
  #CreatedAt?: Date;

  // ========== Getters e Setters ==========

  get ProvaAgendadaTurmaGUID(): string {
    return this.#ProvaAgendadaTurmaGUID;
  }

  set ProvaAgendadaTurmaGUID(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 36) {
      throw new ErrorResponse(400, 'ProvaAgendadaTurmaGUID inválido', {
        message: 'ProvaAgendadaTurmaGUID deve ter entre 1 e 36 caracteres',
        received: trimmed.length
      });
    }
    this.#ProvaAgendadaTurmaGUID = trimmed;
  }

  get ProvaAgendadaGUID(): string {
    return this.#ProvaAgendadaGUID;
  }

  set ProvaAgendadaGUID(value: string) {
    const trimmed = value.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmed)) {
      throw new ErrorResponse(400, 'ProvaAgendadaGUID inválido', {
        message: 'ProvaAgendadaGUID deve ser um UUID válido',
        received: trimmed
      });
    }
    this.#ProvaAgendadaGUID = trimmed;
  }

  get TurmaGUID(): string {
    return this.#TurmaGUID;
  }

  set TurmaGUID(value: string) {
    const trimmed = value.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmed)) {
      throw new ErrorResponse(400, 'TurmaGUID inválido', {
        message: 'TurmaGUID deve ser um UUID válido',
        received: trimmed
      });
    }
    this.#TurmaGUID = trimmed;
  }

  get ProvaDataTurma(): Date | null {
    return this.#ProvaDataTurma;
  }

  set ProvaDataTurma(value: Date | null) {
    if (value === null || value === undefined) {
      this.#ProvaDataTurma = null;
      return;
    }
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new ErrorResponse(400, "ProvaDataTurma inválida", {
        message: "ProvaDataTurma deve ser uma data válida",
      });
    }
    this.#ProvaDataTurma = value;
  }

  get CreatedAt(): Date | undefined {
    return this.#CreatedAt;
  }

  set CreatedAt(value: Date | undefined) {
    this.#CreatedAt = value;
  }

  // ========== Métodos ==========

  /**
   * Valida todos os campos obrigatórios
   */
  validar(): void {
    if (!this.#ProvaAgendadaTurmaGUID) {
      throw new ErrorResponse(400, 'Validação falhou', {
        message: 'ProvaAgendadaTurmaGUID é obrigatório'
      });
    }

    if (!this.#ProvaAgendadaGUID) {
      throw new ErrorResponse(400, 'Validação falhou', {
        message: 'ProvaAgendadaGUID é obrigatório'
      });
    }

    if (!this.#TurmaGUID) {
      throw new ErrorResponse(400, 'Validação falhou', {
        message: 'TurmaGUID é obrigatório'
      });
    }
  }

  /**
   * Converte entidade para JSON (para envio via API)
   */
  toDTO(): Record<string, any> {
    return {
      ProvaAgendadaTurmaGUID: this.#ProvaAgendadaTurmaGUID,
      ProvaAgendadaGUID: this.#ProvaAgendadaGUID,
      TurmaGUID: this.#TurmaGUID,
      ProvaDataTurma: this.#ProvaDataTurma?.toISOString() || null,
      CreatedAt: this.#CreatedAt?.toISOString() || null
    };
  }
}
