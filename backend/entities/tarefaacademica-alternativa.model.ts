/**
 * Entidade TarefaAcademicaAlternativa
 *
 * Representa uma alternativa de uma questão objetiva de tarefa "lista".
 * Cada questão objetiva tem N alternativas, exatamente uma marcada como
 * correta; cada alternativa carrega seus próprios pontos (permite pontuação
 * parcial/customizada, não só "certo = pontos máximos, errado = 0").
 *
 * Relacionamentos:
 * - N:1 com TarefaAcademicaQuestao
 */

import ErrorResponse from "../utils/ErrorResponse";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default class TarefaAcademicaAlternativa {
  #AlternativaGUID!: string;
  #QuestaoGUID!: string;
  #AlternativaTexto!: string;
  #AlternativaCorreta: boolean = false;
  #AlternativaPontos: number = 0;
  #AlternativaOrdem: number = 0;
  #CreatedAt: Date | null = null;

  // ========== AlternativaGUID ==========
  get AlternativaGUID(): string {
    return this.#AlternativaGUID;
  }

  set AlternativaGUID(value: string) {
    const trimmed = (value ?? "").trim();
    if (!GUID_REGEX.test(trimmed)) {
      throw new ErrorResponse(400, "AlternativaGUID inválido", {
        message: "AlternativaGUID deve ser um UUID válido",
      });
    }
    this.#AlternativaGUID = trimmed;
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

  // ========== AlternativaTexto ==========
  get AlternativaTexto(): string {
    return this.#AlternativaTexto;
  }

  set AlternativaTexto(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new ErrorResponse(400, "AlternativaTexto inválido", {
        message: "AlternativaTexto deve ser uma string não vazia",
      });
    }
    const texto = value.trim();
    if (texto.length > 512) {
      throw new ErrorResponse(400, "AlternativaTexto inválido", {
        message: "AlternativaTexto deve ter no máximo 512 caracteres",
      });
    }
    this.#AlternativaTexto = texto;
  }

  // ========== AlternativaCorreta ==========
  get AlternativaCorreta(): boolean {
    return this.#AlternativaCorreta;
  }

  set AlternativaCorreta(value: boolean) {
    this.#AlternativaCorreta = Boolean(value);
  }

  // ========== AlternativaPontos ==========
  get AlternativaPontos(): number {
    return this.#AlternativaPontos;
  }

  set AlternativaPontos(value: number) {
    const pontos = Number(value);
    if (isNaN(pontos) || pontos < 0 || pontos > 99.99) {
      throw new ErrorResponse(400, "AlternativaPontos inválido", {
        message: "AlternativaPontos deve ser um número >= 0 e <= 99.99",
      });
    }
    this.#AlternativaPontos = Math.round(pontos * 100) / 100;
  }

  // ========== AlternativaOrdem ==========
  get AlternativaOrdem(): number {
    return this.#AlternativaOrdem;
  }

  set AlternativaOrdem(value: number) {
    const ordem = Number(value);
    if (isNaN(ordem) || ordem < 0) {
      throw new ErrorResponse(400, "AlternativaOrdem inválida", {
        message: "AlternativaOrdem deve ser um número >= 0",
      });
    }
    this.#AlternativaOrdem = Math.trunc(ordem);
  }

  // ========== CreatedAt ==========
  get CreatedAt(): Date | null {
    return this.#CreatedAt;
  }

  set CreatedAt(value: Date | null) {
    this.#CreatedAt = value ?? null;
  }
}
