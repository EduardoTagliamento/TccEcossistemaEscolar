/**
 * Entidade TarefaAcademicaResposta
 *
 * Representa a resposta de UM aluno (via TarefaMatriculaGUID) a UMA questão
 * de uma tarefa "lista". Objetiva: AlternativaGUID preenchido,
 * RespostaPontosObtidos calculado na hora (correção automática). Discursiva:
 * RespostaTextoDiscursiva preenchido, RespostaPontosObtidos fica null até o
 * professor corrigir.
 *
 * `RespostaAvaliadoPorCPF IS NULL` é o mesmo sinal canônico de "correção
 * automática/sistema" vs. correção humana usado em
 * tarefaacademica_matricula.TarefaAvaliadoPorCPF.
 *
 * Relacionamentos:
 * - N:1 com TarefaAcademicaMatricula
 * - N:1 com TarefaAcademicaQuestao
 * - N:1 com TarefaAcademicaAlternativa (opcional)
 */

import ErrorResponse from "../utils/ErrorResponse";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default class TarefaAcademicaResposta {
  #RespostaGUID!: string;
  #TarefaMatriculaGUID!: string;
  #QuestaoGUID!: string;
  #AlternativaGUID: string | null = null;
  #RespostaTextoDiscursiva: string | null = null;
  #RespostaPontosObtidos: number | null = null;
  #RespostaAvaliadoEm: Date | null = null;
  #RespostaAvaliadoPorCPF: string | null = null;
  #RespondidoEm: Date | null = null;
  #CreatedAt: Date | null = null;
  #UpdatedAt: Date | null = null;

  // ========== RespostaGUID ==========
  get RespostaGUID(): string {
    return this.#RespostaGUID;
  }

  set RespostaGUID(value: string) {
    const trimmed = (value ?? "").trim();
    if (!GUID_REGEX.test(trimmed)) {
      throw new ErrorResponse(400, "RespostaGUID inválido", {
        message: "RespostaGUID deve ser um UUID válido",
      });
    }
    this.#RespostaGUID = trimmed;
  }

  // ========== TarefaMatriculaGUID ==========
  get TarefaMatriculaGUID(): string {
    return this.#TarefaMatriculaGUID;
  }

  set TarefaMatriculaGUID(value: string) {
    const trimmed = (value ?? "").trim();
    if (trimmed.length < 1 || trimmed.length > 36) {
      throw new ErrorResponse(400, "TarefaMatriculaGUID inválido", {
        message: "TarefaMatriculaGUID deve ter entre 1 e 36 caracteres",
      });
    }
    this.#TarefaMatriculaGUID = trimmed;
  }

  // ========== QuestaoGUID ==========
  get QuestaoGUID(): string {
    return this.#QuestaoGUID;
  }

  set QuestaoGUID(value: string) {
    const trimmed = (value ?? "").trim();
    if (!GUID_REGEX.test(trimmed)) {
      throw new ErrorResponse(400, "QuestaoGUID inválido", {
        message: "QuestaoGUID deve ser um UUID válido",
      });
    }
    this.#QuestaoGUID = trimmed;
  }

  // ========== AlternativaGUID ==========
  get AlternativaGUID(): string | null {
    return this.#AlternativaGUID;
  }

  set AlternativaGUID(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#AlternativaGUID = null;
      return;
    }
    const trimmed = value.trim();
    if (!GUID_REGEX.test(trimmed)) {
      throw new ErrorResponse(400, "AlternativaGUID inválido", {
        message: "AlternativaGUID deve ser um UUID válido ou null",
      });
    }
    this.#AlternativaGUID = trimmed;
  }

  // ========== RespostaTextoDiscursiva ==========
  get RespostaTextoDiscursiva(): string | null {
    return this.#RespostaTextoDiscursiva;
  }

  set RespostaTextoDiscursiva(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#RespostaTextoDiscursiva = null;
      return;
    }
    if (typeof value !== "string") {
      throw new ErrorResponse(400, "RespostaTextoDiscursiva inválida", {
        message: "RespostaTextoDiscursiva deve ser uma string",
      });
    }
    const texto = value.trim();
    if (texto.length > 8000) {
      throw new ErrorResponse(400, "RespostaTextoDiscursiva inválida", {
        message: "RespostaTextoDiscursiva deve ter no máximo 8000 caracteres",
      });
    }
    this.#RespostaTextoDiscursiva = texto;
  }

  // ========== RespostaPontosObtidos ==========
  get RespostaPontosObtidos(): number | null {
    return this.#RespostaPontosObtidos;
  }

  set RespostaPontosObtidos(value: number | null) {
    if (value === null || value === undefined) {
      this.#RespostaPontosObtidos = null;
      return;
    }
    const pontos = Number(value);
    if (isNaN(pontos) || pontos < 0 || pontos > 99.99) {
      throw new ErrorResponse(400, "RespostaPontosObtidos inválido", {
        message: "RespostaPontosObtidos deve ser um número >= 0 e <= 99.99",
      });
    }
    this.#RespostaPontosObtidos = Math.round(pontos * 100) / 100;
  }

  // ========== RespostaAvaliadoEm ==========
  get RespostaAvaliadoEm(): Date | null {
    return this.#RespostaAvaliadoEm;
  }

  set RespostaAvaliadoEm(value: Date | null) {
    this.#RespostaAvaliadoEm = value ?? null;
  }

  // ========== RespostaAvaliadoPorCPF ==========
  get RespostaAvaliadoPorCPF(): string | null {
    return this.#RespostaAvaliadoPorCPF;
  }

  set RespostaAvaliadoPorCPF(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#RespostaAvaliadoPorCPF = null;
      return;
    }
    this.#RespostaAvaliadoPorCPF = value.trim();
  }

  // ========== RespondidoEm ==========
  get RespondidoEm(): Date | null {
    return this.#RespondidoEm;
  }

  set RespondidoEm(value: Date | null) {
    this.#RespondidoEm = value ?? null;
  }

  // ========== CreatedAt ==========
  get CreatedAt(): Date | null {
    return this.#CreatedAt;
  }

  set CreatedAt(value: Date | null) {
    this.#CreatedAt = value ?? null;
  }

  // ========== UpdatedAt ==========
  get UpdatedAt(): Date | null {
    return this.#UpdatedAt;
  }

  set UpdatedAt(value: Date | null) {
    this.#UpdatedAt = value ?? null;
  }
}
