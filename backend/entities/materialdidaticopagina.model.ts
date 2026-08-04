/**
 * Uma página escaneada de um `MaterialDidatico` — texto extraído
 * assincronamente (agent multimodal do Gemini), só "vale" oficialmente
 * depois de `RevisadoPorCPF` preenchido (spec item 10, revisão humana
 * obrigatória).
 */
export type MaterialDidaticoPaginaStatus = "Pendente" | "Concluida" | "Falhou";

export default class MaterialDidaticoPagina {
  #MaterialDidaticoPaginaGUID!: string;
  #MaterialDidaticoGUID!: string;
  #NumeroPagina!: number;
  #ArquivoUrl!: string;
  #TextoExtraido: string | null = null;
  #StatusExtracao: MaterialDidaticoPaginaStatus = "Pendente";
  #RevisadoPorCPF: string | null = null;
  #RevisadoEm: Date | null = null;
  #ExtraidoEm: Date | null = null;

  constructor() {
    console.log("⬆️  MaterialDidaticoPagina.constructor()");
  }

  get MaterialDidaticoPaginaGUID(): string {
    return this.#MaterialDidaticoPaginaGUID;
  }

  set MaterialDidaticoPaginaGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("MaterialDidaticoPaginaGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#MaterialDidaticoPaginaGUID = value.trim();
  }

  get MaterialDidaticoGUID(): string {
    return this.#MaterialDidaticoGUID;
  }

  set MaterialDidaticoGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("MaterialDidaticoGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#MaterialDidaticoGUID = value.trim();
  }

  get NumeroPagina(): number {
    return this.#NumeroPagina;
  }

  set NumeroPagina(value: number) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
      throw new Error("NumeroPagina deve ser um número inteiro positivo.");
    }
    this.#NumeroPagina = value;
  }

  get ArquivoUrl(): string {
    return this.#ArquivoUrl;
  }

  set ArquivoUrl(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("ArquivoUrl deve ser uma string não vazia.");
    }
    this.#ArquivoUrl = value.trim();
  }

  get TextoExtraido(): string | null {
    return this.#TextoExtraido;
  }

  set TextoExtraido(value: string | null) {
    this.#TextoExtraido = value && value.trim() ? value : null;
  }

  get StatusExtracao(): MaterialDidaticoPaginaStatus {
    return this.#StatusExtracao;
  }

  set StatusExtracao(value: MaterialDidaticoPaginaStatus) {
    this.#StatusExtracao = value;
  }

  get RevisadoPorCPF(): string | null {
    return this.#RevisadoPorCPF;
  }

  set RevisadoPorCPF(value: string | null) {
    this.#RevisadoPorCPF = value && value.trim() ? value.trim() : null;
  }

  get RevisadoEm(): Date | null {
    return this.#RevisadoEm;
  }

  set RevisadoEm(value: Date | null) {
    this.#RevisadoEm = value ?? null;
  }

  get ExtraidoEm(): Date | null {
    return this.#ExtraidoEm;
  }

  set ExtraidoEm(value: Date | null) {
    this.#ExtraidoEm = value ?? null;
  }
}
