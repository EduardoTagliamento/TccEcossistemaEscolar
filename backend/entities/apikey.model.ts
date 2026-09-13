/**
 * 🔑 Entity - ApiKey
 *
 * Representa uma chave de API emitida por uma escola para uma integração
 * externa (parceiro) consumir a API sem uma sessão humana. Ver
 * docs/PLANO_IMPLEMENTACAO_API_KEYS.md.
 *
 * Campos:
 * - ApiKeyGUID: Identificador único (UUID v4)
 * - EscolaGUID: Escola dona da chave — uma chave só acessa dados dessa escola
 * - ApiKeyNome: Rótulo livre escolhido por quem emitiu (ex. "Integração Secretaria Digital")
 * - ApiKeyPrefixo: Parte visível do token pra sempre (ex. "baua_live_51h4f8a2"), só identificação
 * - ApiKeyHashSecreto: SHA-256 (hex) do token completo — nunca guardamos o valor em texto puro
 * - ApiKeyEscopos: Lista de escopos liberados (ver ESCOPOS_APIKEY_VALIDOS)
 * - ApiKeyStatus: Ativa | Revogada (soft delete — nunca removida fisicamente)
 * - ApiKeyCriadoPorGUID: UsuarioGUID de quem emitiu (sempre uma Direção)
 * - ApiKeyUltimoUsoEm: Timestamp da última chamada autenticada com essa chave (null se nunca usada)
 */

export const ESCOPOS_APIKEY_VALIDOS = [
  "usuario:leitura",
  "turma:leitura",
  "matricula:leitura",
  "tarefa:leitura",
  "prova:leitura",
  "aviso:leitura",
] as const;

export type ApiKeyEscopo = (typeof ESCOPOS_APIKEY_VALIDOS)[number];

export type ApiKeyStatus = "Ativa" | "Revogada";

export default class ApiKey {
  #ApiKeyGUID!: string;
  #EscolaGUID!: string;
  #ApiKeyNome!: string;
  #ApiKeyPrefixo!: string;
  #ApiKeyHashSecreto!: string;
  #ApiKeyEscopos!: ApiKeyEscopo[];
  #ApiKeyStatus!: ApiKeyStatus;
  #ApiKeyCriadoPorGUID!: string;
  #ApiKeyUltimoUsoEm!: Date | null;
  #ApiKeyCreatedAt!: Date;
  #ApiKeyUpdatedAt!: Date;

  // ==================== GETTERS ====================

  get ApiKeyGUID(): string {
    return this.#ApiKeyGUID;
  }

  get EscolaGUID(): string {
    return this.#EscolaGUID;
  }

  get ApiKeyNome(): string {
    return this.#ApiKeyNome;
  }

  get ApiKeyPrefixo(): string {
    return this.#ApiKeyPrefixo;
  }

  get ApiKeyHashSecreto(): string {
    return this.#ApiKeyHashSecreto;
  }

  get ApiKeyEscopos(): ApiKeyEscopo[] {
    return this.#ApiKeyEscopos;
  }

  get ApiKeyStatus(): ApiKeyStatus {
    return this.#ApiKeyStatus;
  }

  get ApiKeyCriadoPorGUID(): string {
    return this.#ApiKeyCriadoPorGUID;
  }

  get ApiKeyUltimoUsoEm(): Date | null {
    return this.#ApiKeyUltimoUsoEm;
  }

  get ApiKeyCreatedAt(): Date {
    return this.#ApiKeyCreatedAt;
  }

  get ApiKeyUpdatedAt(): Date {
    return this.#ApiKeyUpdatedAt;
  }

  // ==================== SETTERS ====================

  set ApiKeyGUID(value: string) {
    if (!value || value.length !== 36) {
      throw new Error("ApiKeyGUID inválido (deve ser UUID v4)");
    }
    this.#ApiKeyGUID = value;
  }

  set EscolaGUID(value: string) {
    if (!value || value.length !== 36) {
      throw new Error("EscolaGUID inválido (deve ser UUID v4)");
    }
    this.#EscolaGUID = value;
  }

  set ApiKeyNome(value: string) {
    const trimmed = (value || "").trim();
    if (trimmed.length < 3 || trimmed.length > 100) {
      throw new Error("ApiKeyNome deve ter entre 3 e 100 caracteres");
    }
    this.#ApiKeyNome = trimmed;
  }

  set ApiKeyPrefixo(value: string) {
    if (!value || value.length > 16) {
      throw new Error("ApiKeyPrefixo inválido");
    }
    this.#ApiKeyPrefixo = value;
  }

  set ApiKeyHashSecreto(value: string) {
    if (!value || value.length !== 64) {
      throw new Error("ApiKeyHashSecreto deve ser um hash SHA-256 (64 caracteres hex)");
    }
    this.#ApiKeyHashSecreto = value;
  }

  set ApiKeyEscopos(value: ApiKeyEscopo[]) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error("ApiKeyEscopos deve ter ao menos um escopo");
    }
    for (const escopo of value) {
      if (!ESCOPOS_APIKEY_VALIDOS.includes(escopo)) {
        throw new Error(`Escopo inválido: ${escopo}`);
      }
    }
    this.#ApiKeyEscopos = value;
  }

  set ApiKeyStatus(value: ApiKeyStatus) {
    if (value !== "Ativa" && value !== "Revogada") {
      throw new Error("ApiKeyStatus deve ser Ativa ou Revogada");
    }
    this.#ApiKeyStatus = value;
  }

  set ApiKeyCriadoPorGUID(value: string) {
    if (!value) {
      throw new Error("ApiKeyCriadoPorGUID é obrigatório");
    }
    this.#ApiKeyCriadoPorGUID = value;
  }

  set ApiKeyUltimoUsoEm(value: Date | null) {
    this.#ApiKeyUltimoUsoEm = value;
  }

  set ApiKeyCreatedAt(value: Date) {
    this.#ApiKeyCreatedAt = value;
  }

  set ApiKeyUpdatedAt(value: Date) {
    this.#ApiKeyUpdatedAt = value;
  }

  // ==================== MÉTODOS ====================

  revogar(): void {
    this.#ApiKeyStatus = "Revogada";
    this.#ApiKeyUpdatedAt = new Date();
  }

  temEscopo(escopo: ApiKeyEscopo): boolean {
    return this.#ApiKeyEscopos.includes(escopo);
  }

  toJSON(): Record<string, unknown> {
    return {
      ApiKeyGUID: this.#ApiKeyGUID,
      EscolaGUID: this.#EscolaGUID,
      ApiKeyNome: this.#ApiKeyNome,
      ApiKeyPrefixo: this.#ApiKeyPrefixo,
      ApiKeyEscopos: this.#ApiKeyEscopos,
      ApiKeyStatus: this.#ApiKeyStatus,
      ApiKeyCriadoPorGUID: this.#ApiKeyCriadoPorGUID,
      ApiKeyUltimoUsoEm: this.#ApiKeyUltimoUsoEm,
      ApiKeyCreatedAt: this.#ApiKeyCreatedAt,
      ApiKeyUpdatedAt: this.#ApiKeyUpdatedAt,
      // ApiKeyHashSecreto de propósito FORA do toJSON — nunca deve sair pela API.
    };
  }

  static fromPlainObject(obj: any): ApiKey {
    const apiKey = new ApiKey();
    apiKey.ApiKeyGUID = obj.ApiKeyGUID;
    apiKey.EscolaGUID = obj.EscolaGUID;
    apiKey.ApiKeyNome = obj.ApiKeyNome;
    apiKey.ApiKeyPrefixo = obj.ApiKeyPrefixo;
    apiKey.ApiKeyHashSecreto = obj.ApiKeyHashSecreto;
    apiKey.ApiKeyEscopos = typeof obj.ApiKeyEscopos === "string" ? JSON.parse(obj.ApiKeyEscopos) : obj.ApiKeyEscopos;
    apiKey.ApiKeyStatus = obj.ApiKeyStatus;
    apiKey.ApiKeyCriadoPorGUID = obj.ApiKeyCriadoPorGUID;
    apiKey.ApiKeyUltimoUsoEm = obj.ApiKeyUltimoUsoEm ? new Date(obj.ApiKeyUltimoUsoEm) : null;
    apiKey.ApiKeyCreatedAt = new Date(obj.ApiKeyCreatedAt);
    apiKey.ApiKeyUpdatedAt = new Date(obj.ApiKeyUpdatedAt);
    return apiKey;
  }
}
