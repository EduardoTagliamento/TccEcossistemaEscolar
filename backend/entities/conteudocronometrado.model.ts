/**
 * Dados específicos de um Conteudo do tipo "cronometrado" (vídeo/áudio):
 * arquivo enviado (upload) OU link externo (ex: YouTube). Progresso do
 * aluno é medido por tempo assistido/ouvido (a tela de visualização, que
 * calcula esse percentual, não faz parte deste módulo de cadastro).
 */
export type ConteudoCronometradoOrigem = "upload" | "link";

export default class ConteudoCronometrado {
  #ConteudoGUID!: string;
  #OrigemTipo!: ConteudoCronometradoOrigem;
  #ArquivoUrl: string | null = null;
  #LinkUrl: string | null = null;
  #DuracaoSegundos: number | null = null;
  #ArquivoMimeType: string | null = null;

  get ConteudoGUID(): string {
    return this.#ConteudoGUID;
  }

  set ConteudoGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("ConteudoGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#ConteudoGUID = value.trim();
  }

  get OrigemTipo(): ConteudoCronometradoOrigem {
    return this.#OrigemTipo;
  }

  set OrigemTipo(value: ConteudoCronometradoOrigem) {
    if (value !== "upload" && value !== "link") {
      throw new Error("OrigemTipo deve ser 'upload' ou 'link'.");
    }
    this.#OrigemTipo = value;
  }

  get ArquivoUrl(): string | null {
    return this.#ArquivoUrl;
  }

  set ArquivoUrl(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#ArquivoUrl = null;
      return;
    }
    if (value.length > 500) {
      throw new Error("ArquivoUrl deve ter no máximo 500 caracteres.");
    }
    this.#ArquivoUrl = value.trim();
  }

  get LinkUrl(): string | null {
    return this.#LinkUrl;
  }

  set LinkUrl(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#LinkUrl = null;
      return;
    }
    if (value.length > 500) {
      throw new Error("LinkUrl deve ter no máximo 500 caracteres.");
    }
    this.#LinkUrl = value.trim();
  }

  get DuracaoSegundos(): number | null {
    return this.#DuracaoSegundos;
  }

  set DuracaoSegundos(value: number | null) {
    if (value === null || value === undefined) {
      this.#DuracaoSegundos = null;
      return;
    }
    if (typeof value !== "number" || value < 0) {
      throw new Error("DuracaoSegundos deve ser um número positivo.");
    }
    this.#DuracaoSegundos = value;
  }

  get ArquivoMimeType(): string | null {
    return this.#ArquivoMimeType;
  }

  set ArquivoMimeType(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#ArquivoMimeType = null;
      return;
    }
    this.#ArquivoMimeType = value.trim();
  }

  validar(): void {
    if (!this.#ConteudoGUID) {
      throw new Error("ConteudoGUID é obrigatório.");
    }
    if (this.#OrigemTipo === "upload" && !this.#ArquivoUrl) {
      throw new Error("ArquivoUrl é obrigatório quando OrigemTipo é 'upload'.");
    }
    if (this.#OrigemTipo === "link" && !this.#LinkUrl) {
      throw new Error("LinkUrl é obrigatório quando OrigemTipo é 'link'.");
    }
  }
}
