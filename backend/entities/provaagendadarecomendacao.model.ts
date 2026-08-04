/**
 * Cache da recomendação de estudo gerada por IA para uma ProvaAgendada —
 * uma linha por prova, compartilhada por todas as turmas dela (spec item 20).
 * Cada peça (vídeo/resumo) é independente: se uma faltar, a outra aparece
 * normalmente (spec item 22) — por isso os campos são nullable mesmo com
 * StatusGeracao='Concluida'.
 */
export type ProvaAgendadaRecomendacaoStatus = "Pendente" | "Concluida" | "Falhou";

export interface RecomendacaoVideo {
  titulo: string;
  url: string;
  canal: string;
  thumbnailUrl: string | null;
}

export interface RecomendacaoFonte {
  tipo: "Conteudo" | "MaterialDidatico";
  guid: string;
  rotulo: string;
}

export interface RecomendacaoPaginaLivro {
  materialDidaticoGUID: string;
  materialDidaticoTitulo: string;
  capituloGUID: string;
  capituloTitulo: string;
  paginaInicio: number;
  paginaFim: number;
}

export default class ProvaAgendadaRecomendacao {
  #ProvaAgendadaRecomendacaoGUID!: string;
  #ProvaAgendadaGUID!: string;
  #VideosJson: RecomendacaoVideo[] | null = null;
  #ResumoTexto: string | null = null;
  #FontesUsadas: RecomendacaoFonte[] | null = null;
  #ModeloUsado: string | null = null;
  #StatusGeracao: ProvaAgendadaRecomendacaoStatus = "Pendente";
  #ErroGeracao: string | null = null;
  #PaginaLivroJson: RecomendacaoPaginaLivro | null = null;
  #SubMateriaGlobalGUID: string | null = null;
  #GeradoEm: Date | null = null;
  #UpdatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  ProvaAgendadaRecomendacao.constructor()");
  }

  get ProvaAgendadaRecomendacaoGUID(): string {
    return this.#ProvaAgendadaRecomendacaoGUID;
  }

  set ProvaAgendadaRecomendacaoGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("ProvaAgendadaRecomendacaoGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#ProvaAgendadaRecomendacaoGUID = value.trim();
  }

  get ProvaAgendadaGUID(): string {
    return this.#ProvaAgendadaGUID;
  }

  set ProvaAgendadaGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("ProvaAgendadaGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#ProvaAgendadaGUID = value.trim();
  }

  get VideosJson(): RecomendacaoVideo[] | null {
    return this.#VideosJson;
  }

  set VideosJson(value: RecomendacaoVideo[] | null) {
    this.#VideosJson = value && value.length > 0 ? value : null;
  }

  get ResumoTexto(): string | null {
    return this.#ResumoTexto;
  }

  set ResumoTexto(value: string | null) {
    this.#ResumoTexto = value && value.trim() ? value : null;
  }

  get FontesUsadas(): RecomendacaoFonte[] | null {
    return this.#FontesUsadas;
  }

  set FontesUsadas(value: RecomendacaoFonte[] | null) {
    this.#FontesUsadas = value && value.length > 0 ? value : null;
  }

  get ModeloUsado(): string | null {
    return this.#ModeloUsado;
  }

  set ModeloUsado(value: string | null) {
    this.#ModeloUsado = value ?? null;
  }

  get StatusGeracao(): ProvaAgendadaRecomendacaoStatus {
    return this.#StatusGeracao;
  }

  set StatusGeracao(value: ProvaAgendadaRecomendacaoStatus) {
    this.#StatusGeracao = value;
  }

  get ErroGeracao(): string | null {
    return this.#ErroGeracao;
  }

  set ErroGeracao(value: string | null) {
    this.#ErroGeracao = value ? value.slice(0, 500) : null;
  }

  get PaginaLivroJson(): RecomendacaoPaginaLivro | null {
    return this.#PaginaLivroJson;
  }

  set PaginaLivroJson(value: RecomendacaoPaginaLivro | null) {
    this.#PaginaLivroJson = value ?? null;
  }

  get SubMateriaGlobalGUID(): string | null {
    return this.#SubMateriaGlobalGUID;
  }

  set SubMateriaGlobalGUID(value: string | null) {
    this.#SubMateriaGlobalGUID = value && value.trim() ? value.trim() : null;
  }

  get GeradoEm(): Date | null {
    return this.#GeradoEm;
  }

  set GeradoEm(value: Date | null) {
    this.#GeradoEm = value ?? null;
  }

  get UpdatedAt(): Date | null {
    return this.#UpdatedAt;
  }

  set UpdatedAt(value: Date | null) {
    this.#UpdatedAt = value ?? null;
  }
}
