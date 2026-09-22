/**
 * Log de dedup do envio do resumo de IA por (prova, turma) — a recomendação
 * em si é por prova (ver ProvaAgendadaRecomendacao, compartilhada entre
 * turmas), mas o ENVIO pro grupo do WhatsApp é por turma. Uma linha aqui
 * significa "já mandei pra essa turma sobre essa prova, não manda de novo
 * no mesmo dia". Ver docs/spec-resumo-ia-prova-grupo-whatsapp.md (repo
 * interceptacaoAVA).
 */
export type ProvaAgendadaTurmaResumoEnvioDestino = "GrupoReal" | "TelefoneTeste";

export default class ProvaAgendadaTurmaResumoEnvio {
  #ProvaAgendadaTurmaResumoEnvioGUID!: string;
  #ProvaAgendadaGUID!: string;
  #TurmaGUID!: string;
  #Destino!: ProvaAgendadaTurmaResumoEnvioDestino;
  #EnviadoEm!: Date;

  constructor() {
    console.log("⬆️  ProvaAgendadaTurmaResumoEnvio.constructor()");
  }

  get ProvaAgendadaTurmaResumoEnvioGUID(): string {
    return this.#ProvaAgendadaTurmaResumoEnvioGUID;
  }

  set ProvaAgendadaTurmaResumoEnvioGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("ProvaAgendadaTurmaResumoEnvioGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#ProvaAgendadaTurmaResumoEnvioGUID = value.trim();
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

  get TurmaGUID(): string {
    return this.#TurmaGUID;
  }

  set TurmaGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("TurmaGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#TurmaGUID = value.trim();
  }

  get Destino(): ProvaAgendadaTurmaResumoEnvioDestino {
    return this.#Destino;
  }

  set Destino(value: ProvaAgendadaTurmaResumoEnvioDestino) {
    if (value !== "GrupoReal" && value !== "TelefoneTeste") {
      throw new Error('Destino deve ser "GrupoReal" ou "TelefoneTeste".');
    }
    this.#Destino = value;
  }

  get EnviadoEm(): Date {
    return this.#EnviadoEm;
  }

  set EnviadoEm(value: Date) {
    this.#EnviadoEm = value;
  }

  validar(): void {
    if (!this.#ProvaAgendadaTurmaResumoEnvioGUID) throw new Error("ProvaAgendadaTurmaResumoEnvioGUID é obrigatório");
    if (!this.#ProvaAgendadaGUID) throw new Error("ProvaAgendadaGUID é obrigatório");
    if (!this.#TurmaGUID) throw new Error("TurmaGUID é obrigatório");
    if (!this.#Destino) throw new Error("Destino é obrigatório");
  }

  toJSON() {
    return {
      ProvaAgendadaTurmaResumoEnvioGUID: this.#ProvaAgendadaTurmaResumoEnvioGUID,
      ProvaAgendadaGUID: this.#ProvaAgendadaGUID,
      TurmaGUID: this.#TurmaGUID,
      Destino: this.#Destino,
      EnviadoEm: this.#EnviadoEm,
    };
  }

  static fromDatabase(data: any): ProvaAgendadaTurmaResumoEnvio {
    const envio = new ProvaAgendadaTurmaResumoEnvio();
    envio.ProvaAgendadaTurmaResumoEnvioGUID = data.ProvaAgendadaTurmaResumoEnvioGUID;
    envio.ProvaAgendadaGUID = data.ProvaAgendadaGUID;
    envio.TurmaGUID = data.TurmaGUID;
    envio.Destino = data.Destino;
    envio.EnviadoEm = data.EnviadoEm;
    return envio;
  }
}
