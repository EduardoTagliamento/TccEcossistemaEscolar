/**
 * Entidade TarefaAcademicaMatricula (Tabela Intermediária)
 * 
 * Representa a atribuição de uma tarefa a um aluno específico (matrícula).
 * Relacionamento N:N entre TarefaAcademica e Matricula.
 * 
 * Regras de negócio:
 * - Cada tarefa pode ser atribuída a múltiplos alunos
 * - Cada aluno pode ter múltiplas tarefas
 * - Cada aluno marca individualmente se completou a tarefa
 * - TarefaRealizacaoData: preenchido automaticamente quando TarefaFeito = true
 * 
 * Relacionamentos:
 * - N:1 com TarefaAcademica
 * - N:1 com Matricula
 */

import ErrorResponse from "../utils/ErrorResponse";

export default class TarefaAcademicaMatricula {
  // Campos privados (encapsulamento)
  #TarefaMatriculaGUID!: string;
  #TarefaGUID!: string;
  #MatriculaGUID!: string;
  #TarefaPrazoDataMatricula: Date | null = null;
  #TarefaFeito!: boolean;
  #TarefaRealizacaoData!: Date | null;
  #TarefaNota: number | null = null;
  #TarefaAvaliadoEm: Date | null = null;
  #TarefaAvaliadoPorCPF: string | null = null;
  #CreatedAt?: Date;
  #UpdatedAt?: Date;

  // ========== Getters e Setters ==========

  get TarefaMatriculaGUID(): string {
    return this.#TarefaMatriculaGUID;
  }

  set TarefaMatriculaGUID(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 36) {
      throw new ErrorResponse(400, 'TarefaMatriculaGUID inválido', {
        message: 'TarefaMatriculaGUID deve ter entre 1 e 36 caracteres',
        received: trimmed.length
      });
    }
    this.#TarefaMatriculaGUID = trimmed;
  }

  get TarefaGUID(): string {
    return this.#TarefaGUID;
  }

  set TarefaGUID(value: string) {
    const trimmed = value.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmed)) {
      throw new ErrorResponse(400, 'TarefaGUID inválido', {
        message: 'TarefaGUID deve ser um UUID válido',
        received: trimmed
      });
    }
    this.#TarefaGUID = trimmed;
  }

  get MatriculaGUID(): string {
    return this.#MatriculaGUID;
  }

  set MatriculaGUID(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 36) {
      throw new ErrorResponse(400, 'MatriculaGUID inválido', {
        message: 'MatriculaGUID deve ter entre 1 e 36 caracteres (UUID ou RA)',
        received: trimmed.length
      });
    }
    this.#MatriculaGUID = trimmed;
  }

  get TarefaPrazoDataMatricula(): Date | null {
    return this.#TarefaPrazoDataMatricula;
  }

  set TarefaPrazoDataMatricula(value: Date | null) {
    if (value === null || value === undefined) {
      this.#TarefaPrazoDataMatricula = null;
      return;
    }
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new ErrorResponse(400, "TarefaPrazoDataMatricula inválida", {
        message: "TarefaPrazoDataMatricula deve ser uma data válida",
      });
    }
    this.#TarefaPrazoDataMatricula = value;
  }

  get TarefaFeito(): boolean {
    return this.#TarefaFeito;
  }

  set TarefaFeito(value: boolean) {
    this.#TarefaFeito = value;
  }

  get TarefaRealizacaoData(): Date | null {
    return this.#TarefaRealizacaoData;
  }

  set TarefaRealizacaoData(value: Date | null) {
    this.#TarefaRealizacaoData = value;
  }

  get TarefaNota(): number | null {
    return this.#TarefaNota;
  }

  set TarefaNota(value: number | null) {
    if (value === null || value === undefined) {
      this.#TarefaNota = null;
      return;
    }
    if (typeof value !== "number" || isNaN(value) || value < 0 || value > 10) {
      throw new ErrorResponse(400, "TarefaNota inválida", {
        message: "TarefaNota deve ser um número entre 0 e 10",
      });
    }
    this.#TarefaNota = Math.round(value * 100) / 100;
  }

  get TarefaAvaliadoEm(): Date | null {
    return this.#TarefaAvaliadoEm;
  }

  set TarefaAvaliadoEm(value: Date | null) {
    if (value === null || value === undefined) {
      this.#TarefaAvaliadoEm = null;
      return;
    }
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new ErrorResponse(400, "TarefaAvaliadoEm inválido", {
        message: "TarefaAvaliadoEm deve ser uma data válida",
      });
    }
    this.#TarefaAvaliadoEm = value;
  }

  get TarefaAvaliadoPorCPF(): string | null {
    return this.#TarefaAvaliadoPorCPF;
  }

  set TarefaAvaliadoPorCPF(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#TarefaAvaliadoPorCPF = null;
      return;
    }
    this.#TarefaAvaliadoPorCPF = value.trim();
  }

  get CreatedAt(): Date | undefined {
    return this.#CreatedAt;
  }

  set CreatedAt(value: Date | undefined) {
    this.#CreatedAt = value;
  }

  get UpdatedAt(): Date | undefined {
    return this.#UpdatedAt;
  }

  set UpdatedAt(value: Date | undefined) {
    this.#UpdatedAt = value;
  }

  // ========== Métodos ==========

  /**
   * Valida todos os campos obrigatórios
   */
  validar(): void {
    if (!this.#TarefaMatriculaGUID) {
      throw new ErrorResponse(400, 'Validação falhou', {
        message: 'TarefaMatriculaGUID é obrigatório'
      });
    }

    if (!this.#TarefaGUID) {
      throw new ErrorResponse(400, 'Validação falhou', {
        message: 'TarefaGUID é obrigatório'
      });
    }

    if (!this.#MatriculaGUID) {
      throw new ErrorResponse(400, 'Validação falhou', {
        message: 'MatriculaGUID é obrigatório'
      });
    }

    if (this.#TarefaFeito === undefined || this.#TarefaFeito === null) {
      throw new ErrorResponse(400, 'Validação falhou', {
        message: 'TarefaFeito é obrigatório'
      });
    }
  }

  /**
   * Converte entidade para JSON (para envio via API)
   */
  toDTO(): Record<string, any> {
    return {
      TarefaMatriculaGUID: this.#TarefaMatriculaGUID,
      TarefaGUID: this.#TarefaGUID,
      MatriculaGUID: this.#MatriculaGUID,
      TarefaPrazoDataMatricula: this.#TarefaPrazoDataMatricula?.toISOString() || null,
      TarefaFeito: this.#TarefaFeito,
      TarefaRealizacaoData: this.#TarefaRealizacaoData?.toISOString() || null,
      TarefaNota: this.#TarefaNota,
      TarefaAvaliadoEm: this.#TarefaAvaliadoEm?.toISOString() || null,
      TarefaAvaliadoPorCPF: this.#TarefaAvaliadoPorCPF,
      CreatedAt: this.#CreatedAt?.toISOString() || null,
      UpdatedAt: this.#UpdatedAt?.toISOString() || null
    };
  }
}
