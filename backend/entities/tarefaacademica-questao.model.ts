/**
 * Entidade TarefaAcademicaQuestao
 *
 * Representa uma questão de uma TarefaAcademica do tipo "lista" (quiz estilo
 * Forms). Uma tarefa lista tem N questões, cada uma objetiva (com
 * alternativas, correção automática) ou discursiva (correção manual pelo
 * professor, questão a questão).
 *
 * Relacionamentos:
 * - N:1 com TarefaAcademica
 * - 1:N com TarefaAcademicaAlternativa (só faz sentido para QuestaoTipo='objetiva')
 * - 1:N com TarefaAcademicaResposta
 */

import ErrorResponse from "../utils/ErrorResponse";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default class TarefaAcademicaQuestao {
  #QuestaoGUID!: string;
  #TarefaGUID!: string;
  #QuestaoEnunciado!: string;
  #QuestaoTipo!: "objetiva" | "discursiva";
  #QuestaoPontosMaximos: number = 1;
  #QuestaoExplicacao: string | null = null;
  #QuestaoOrdem: number = 0;
  #CreatedAt: Date | null = null;
  #UpdatedAt: Date | null = null;

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

  // ========== TarefaGUID ==========
  get TarefaGUID(): string {
    return this.#TarefaGUID;
  }

  set TarefaGUID(value: string) {
    const trimmed = (value ?? "").trim();
    if (!GUID_REGEX.test(trimmed)) {
      throw new ErrorResponse(400, "TarefaGUID inválido", {
        message: "TarefaGUID deve ser um UUID válido",
      });
    }
    this.#TarefaGUID = trimmed;
  }

  // ========== QuestaoEnunciado ==========
  get QuestaoEnunciado(): string {
    return this.#QuestaoEnunciado;
  }

  set QuestaoEnunciado(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new ErrorResponse(400, "QuestaoEnunciado inválido", {
        message: "QuestaoEnunciado deve ser uma string não vazia",
      });
    }
    const enunciado = value.trim();
    if (enunciado.length > 4000) {
      throw new ErrorResponse(400, "QuestaoEnunciado inválido", {
        message: "QuestaoEnunciado deve ter no máximo 4000 caracteres",
      });
    }
    this.#QuestaoEnunciado = enunciado;
  }

  // ========== QuestaoTipo ==========
  get QuestaoTipo(): "objetiva" | "discursiva" {
    return this.#QuestaoTipo;
  }

  set QuestaoTipo(value: "objetiva" | "discursiva") {
    if (value !== "objetiva" && value !== "discursiva") {
      throw new ErrorResponse(400, "QuestaoTipo inválido", {
        message: "QuestaoTipo deve ser 'objetiva' ou 'discursiva'",
      });
    }
    this.#QuestaoTipo = value;
  }

  // ========== QuestaoPontosMaximos ==========
  get QuestaoPontosMaximos(): number {
    return this.#QuestaoPontosMaximos;
  }

  set QuestaoPontosMaximos(value: number) {
    const pontos = Number(value);
    if (isNaN(pontos) || pontos <= 0 || pontos > 99.99) {
      throw new ErrorResponse(400, "QuestaoPontosMaximos inválido", {
        message: "QuestaoPontosMaximos deve ser um número > 0 e <= 99.99",
      });
    }
    this.#QuestaoPontosMaximos = Math.round(pontos * 100) / 100;
  }

  // ========== QuestaoExplicacao ==========
  get QuestaoExplicacao(): string | null {
    return this.#QuestaoExplicacao;
  }

  set QuestaoExplicacao(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#QuestaoExplicacao = null;
      return;
    }
    if (typeof value !== "string") {
      throw new ErrorResponse(400, "QuestaoExplicacao inválida", {
        message: "QuestaoExplicacao deve ser uma string",
      });
    }
    const explicacao = value.trim();
    if (explicacao.length > 2000) {
      throw new ErrorResponse(400, "QuestaoExplicacao inválida", {
        message: "QuestaoExplicacao deve ter no máximo 2000 caracteres",
      });
    }
    this.#QuestaoExplicacao = explicacao;
  }

  // ========== QuestaoOrdem ==========
  get QuestaoOrdem(): number {
    return this.#QuestaoOrdem;
  }

  set QuestaoOrdem(value: number) {
    const ordem = Number(value);
    if (isNaN(ordem) || ordem < 0) {
      throw new ErrorResponse(400, "QuestaoOrdem inválida", {
        message: "QuestaoOrdem deve ser um número >= 0",
      });
    }
    this.#QuestaoOrdem = Math.trunc(ordem);
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
