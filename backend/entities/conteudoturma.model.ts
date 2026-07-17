/**
 * Entidade ConteudoTurma (Tabela Intermediária N:N)
 *
 * Representa a atribuição de um conteúdo a uma turma específica, com uma
 * data/hora de publicação própria opcional (se não houver, usa a data
 * compartilhada em Conteudo.ConteudoDataPublicacao).
 */
import ErrorResponse from "../utils/ErrorResponse";

export default class ConteudoTurma {
  #ConteudoTurmaGUID!: string;
  #ConteudoGUID!: string;
  #TurmaGUID!: string;
  #ConteudoDataPublicacaoTurma: Date | null = null;
  #CreatedAt?: Date;

  get ConteudoTurmaGUID(): string {
    return this.#ConteudoTurmaGUID;
  }

  set ConteudoTurmaGUID(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 36) {
      throw new ErrorResponse(400, "ConteudoTurmaGUID inválido", {
        message: "ConteudoTurmaGUID deve ter entre 1 e 36 caracteres",
      });
    }
    this.#ConteudoTurmaGUID = trimmed;
  }

  get ConteudoGUID(): string {
    return this.#ConteudoGUID;
  }

  set ConteudoGUID(value: string) {
    const trimmed = value.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmed)) {
      throw new ErrorResponse(400, "ConteudoGUID inválido", {
        message: "ConteudoGUID deve ser um UUID válido",
      });
    }
    this.#ConteudoGUID = trimmed;
  }

  get TurmaGUID(): string {
    return this.#TurmaGUID;
  }

  set TurmaGUID(value: string) {
    const trimmed = value.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmed)) {
      throw new ErrorResponse(400, "TurmaGUID inválido", {
        message: "TurmaGUID deve ser um UUID válido",
      });
    }
    this.#TurmaGUID = trimmed;
  }

  get ConteudoDataPublicacaoTurma(): Date | null {
    return this.#ConteudoDataPublicacaoTurma;
  }

  set ConteudoDataPublicacaoTurma(value: Date | null) {
    if (value === null || value === undefined) {
      this.#ConteudoDataPublicacaoTurma = null;
      return;
    }
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new ErrorResponse(400, "ConteudoDataPublicacaoTurma inválida", {
        message: "ConteudoDataPublicacaoTurma deve ser uma data válida",
      });
    }
    this.#ConteudoDataPublicacaoTurma = value;
  }

  get CreatedAt(): Date | undefined {
    return this.#CreatedAt;
  }

  set CreatedAt(value: Date | undefined) {
    this.#CreatedAt = value;
  }

  validar(): void {
    if (!this.#ConteudoTurmaGUID) {
      throw new ErrorResponse(400, "Validação falhou", { message: "ConteudoTurmaGUID é obrigatório" });
    }
    if (!this.#ConteudoGUID) {
      throw new ErrorResponse(400, "Validação falhou", { message: "ConteudoGUID é obrigatório" });
    }
    if (!this.#TurmaGUID) {
      throw new ErrorResponse(400, "Validação falhou", { message: "TurmaGUID é obrigatório" });
    }
  }

  toDTO(): Record<string, any> {
    return {
      ConteudoTurmaGUID: this.#ConteudoTurmaGUID,
      ConteudoGUID: this.#ConteudoGUID,
      TurmaGUID: this.#TurmaGUID,
      ConteudoDataPublicacaoTurma: this.#ConteudoDataPublicacaoTurma?.toISOString() || null,
      CreatedAt: this.#CreatedAt?.toISOString() || null,
    };
  }
}
