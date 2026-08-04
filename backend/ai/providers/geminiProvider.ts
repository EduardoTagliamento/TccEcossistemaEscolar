import { GoogleGenAI, Schema, createUserContent, createPartFromBase64 } from "@google/genai";
import { IAIndisponivelError } from "../aiErrors";

/**
 * Tiering por tarefa (spec §4/item 19): "leve" pra classificação/geração de
 * query (output curto, sem raciocínio pesado), "cheio" pra resumo grounded
 * (fidelidade ao texto fornecido importa mais que velocidade/custo aqui).
 */
export type GeminiTier = "leve" | "cheio";

const MODELO_POR_TIER: Record<GeminiTier, string> = {
  leve: "gemini-2.5-flash",
  cheio: "gemini-2.5-pro",
};

const TIMEOUT_PADRAO_MS = 15000;

function comTimeout<T>(promise: Promise<T>, timeoutMs: number, origem: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`timeout após ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

/**
 * Wrapper fino do SDK do Gemini — só chama a API e devolve texto/JSON já
 * parseado. Não acessa banco, não conhece regra de negócio (contrato de
 * `backend/ai/README.txt`); quem monta prompt e interpreta o resultado são
 * os agents em `backend/ai/agents/`.
 */
export class GeminiProvider {
  #client: GoogleGenAI | null = null;

  #getClient(): GoogleGenAI {
    if (this.#client) return this.#client;

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new IAIndisponivelError("Gemini", new Error("GOOGLE_API_KEY não configurada"));
    }

    this.#client = new GoogleGenAI({ apiKey });
    return this.#client;
  }

  /** Gera texto livre (ex.: resumo grounded). */
  gerarTexto = async (prompt: string, tier: GeminiTier, timeoutMs = TIMEOUT_PADRAO_MS): Promise<string> => {
    console.log(`🤖 GeminiProvider.gerarTexto() tier=${tier}`);

    try {
      const client = this.#getClient();
      const response = await comTimeout(
        client.models.generateContent({ model: MODELO_POR_TIER[tier], contents: prompt }),
        timeoutMs,
        "Gemini"
      );

      const texto = response.text;
      if (!texto || !texto.trim()) {
        throw new Error("resposta vazia");
      }
      return texto.trim();
    } catch (error) {
      if (error instanceof IAIndisponivelError) throw error;
      throw new IAIndisponivelError("Gemini", error);
    }
  };

  /**
   * Gera texto a partir de uma imagem (input multimodal) + instrução —
   * usado pela extração de texto de página de `MaterialDidatico` (Fase 3):
   * evita depender de um serviço de OCR dedicado, já que o Gemini já é o
   * provedor de IA do projeto.
   */
  gerarTextoComImagem = async (
    prompt: string,
    imagemBase64: string,
    mimeType: string,
    tier: GeminiTier,
    timeoutMs = 30000
  ): Promise<string> => {
    console.log(`🤖 GeminiProvider.gerarTextoComImagem() tier=${tier}`);

    try {
      const client = this.#getClient();
      const response = await comTimeout(
        client.models.generateContent({
          model: MODELO_POR_TIER[tier],
          contents: createUserContent([prompt, createPartFromBase64(imagemBase64, mimeType)]),
        }),
        timeoutMs,
        "Gemini"
      );

      const texto = response.text;
      if (!texto || !texto.trim()) {
        throw new Error("resposta vazia");
      }
      return texto.trim();
    } catch (error) {
      if (error instanceof IAIndisponivelError) throw error;
      throw new IAIndisponivelError("Gemini", error);
    }
  };

  /**
   * Gera JSON validado contra `schema` (responseSchema nativo do Gemini) —
   * usado pra classificação/geração de query, onde a saída precisa ser
   * estruturada e restrita, nunca texto livre.
   */
  gerarEstruturado = async <T>(
    prompt: string,
    schema: Schema,
    tier: GeminiTier,
    timeoutMs = TIMEOUT_PADRAO_MS
  ): Promise<T> => {
    console.log(`🤖 GeminiProvider.gerarEstruturado() tier=${tier}`);

    try {
      const client = this.#getClient();
      const response = await comTimeout(
        client.models.generateContent({
          model: MODELO_POR_TIER[tier],
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        }),
        timeoutMs,
        "Gemini"
      );

      const texto = response.text;
      if (!texto) {
        throw new Error("resposta vazia");
      }
      return JSON.parse(texto) as T;
    } catch (error) {
      if (error instanceof IAIndisponivelError) throw error;
      throw new IAIndisponivelError("Gemini", error);
    }
  };
}

let instanciaSingleton: GeminiProvider | null = null;

export function getGeminiProvider(): GeminiProvider {
  if (!instanciaSingleton) {
    instanciaSingleton = new GeminiProvider();
  }
  return instanciaSingleton;
}
