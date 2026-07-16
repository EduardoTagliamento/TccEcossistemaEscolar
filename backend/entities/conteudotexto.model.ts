/**
 * Dados específicos de um Conteudo do tipo "texto": HTML rico (negrito,
 * itálico, tamanho de fonte, hyperlink), já sanitizado antes de chegar
 * aqui (ver ConteudoService, que usa sanitize-html). Progresso do aluno é
 * instantâneo (100% assim que abre — não há o que medir por tempo/página).
 */
export default class ConteudoTexto {
  #ConteudoGUID!: string;
  #ConteudoHtml!: string;

  get ConteudoGUID(): string {
    return this.#ConteudoGUID;
  }

  set ConteudoGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("ConteudoGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#ConteudoGUID = value.trim();
  }

  get ConteudoHtml(): string {
    return this.#ConteudoHtml;
  }

  set ConteudoHtml(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("ConteudoHtml deve ser uma string não vazia.");
    }
    if (value.length > 200000) {
      throw new Error("ConteudoHtml deve ter no máximo 200.000 caracteres.");
    }
    this.#ConteudoHtml = value;
  }

  validar(): void {
    if (!this.#ConteudoGUID) {
      throw new Error("ConteudoGUID é obrigatório.");
    }
    if (!this.#ConteudoHtml) {
      throw new Error("ConteudoHtml é obrigatório.");
    }
  }
}
