/**
 * Um arquivo (página) de um Conteudo do tipo "paginado". Cobre dois casos:
 * - Um único arquivo (PDF/PPTX/DOCX): 1 linha só, cuja paginação interna
 *   fica a cargo do futuro visualizador (fora do escopo deste módulo).
 * - Uma coleção de imagens: N linhas, cada uma é literalmente uma página.
 * Progresso do aluno é medido por página vista (na tela de visualização).
 */
export default class ConteudoPaginadoArquivo {
  #ConteudoPaginadoArquivoGUID!: string;
  #ConteudoGUID!: string;
  #Ordem!: number;
  #ArquivoUrl!: string;
  #ArquivoMimeType!: string;

  get ConteudoPaginadoArquivoGUID(): string {
    return this.#ConteudoPaginadoArquivoGUID;
  }

  set ConteudoPaginadoArquivoGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("ConteudoPaginadoArquivoGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#ConteudoPaginadoArquivoGUID = value.trim();
  }

  get ConteudoGUID(): string {
    return this.#ConteudoGUID;
  }

  set ConteudoGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("ConteudoGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#ConteudoGUID = value.trim();
  }

  get Ordem(): number {
    return this.#Ordem;
  }

  set Ordem(value: number) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
      throw new Error("Ordem deve ser um número inteiro >= 1.");
    }
    this.#Ordem = value;
  }

  get ArquivoUrl(): string {
    return this.#ArquivoUrl;
  }

  set ArquivoUrl(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("ArquivoUrl deve ser uma string não vazia.");
    }
    if (value.length > 500) {
      throw new Error("ArquivoUrl deve ter no máximo 500 caracteres.");
    }
    this.#ArquivoUrl = value.trim();
  }

  get ArquivoMimeType(): string {
    return this.#ArquivoMimeType;
  }

  set ArquivoMimeType(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("ArquivoMimeType deve ser uma string não vazia.");
    }
    this.#ArquivoMimeType = value.trim();
  }

  validar(): void {
    if (!this.#ConteudoGUID) {
      throw new Error("ConteudoGUID é obrigatório.");
    }
    if (!this.#ArquivoUrl) {
      throw new Error("ArquivoUrl é obrigatório.");
    }
    if (!this.#ArquivoMimeType) {
      throw new Error("ArquivoMimeType é obrigatório.");
    }
  }
}
