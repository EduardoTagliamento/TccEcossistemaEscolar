import { GoogleGenAI, Schema, createUserContent, createPartFromBase64 } from "@google/genai";
import { IAIndisponivelError } from "../aiErrors";

/**
 * Tiering por tarefa (spec §4/item 19): "leve" pra classificação/geração de
 * query (output curto, sem raciocínio pesado), "cheio" pra resumo grounded
 * (fidelidade ao texto fornecido importa mais que velocidade/custo aqui).
 */
export type GeminiTier = "leve" | "cheio";

/**
 * O catálogo de modelos do Gemini muda de forma mais rápida que o ciclo de
 * deploy deste projeto (ex.: "gemini-2.5-flash" já saiu de circulação pra
 * chaves novas em 2026-08). Por isso o id vem de env var, com um alias
 * "-latest" (sem número de versão fixo, mantido pela própria Google) como
 * fallback — se um dia quebrar de novo, dá pra corrigir só trocando a
 * variável de ambiente, sem precisar de outro deploy de código.
 *
 * ⚠️ SOLUÇÃO TEMPORÁRIA (registrada em 2026-08-04, ver
 * docs/PLANO_IMPLEMENTACAO_RECOMENDACAO_ESTUDOS_IA.md §9): o fallback do
 * tier "cheio" está apontando pro MESMO alias do "leve" (`gemini-flash-latest`)
 * em vez de `gemini-pro-latest`, porque a chave de produção testada nesta
 * data tem cota ZERO pra modelos Pro no tier gratuito do Gemini API
 * (confirmado via chamada real: 429 RESOURCE_EXHAUSTED, "limit: 0, model:
 * gemini-3.1-pro"). Isso reduz a fidelidade do resumo grounded e do
 * sumário de livro (item 19 do spec pedia "cheio" pra essas duas tarefas
 * exatamente por fidelidade) — é uma troca deliberada de qualidade por
 * "funcionar agora", não a decisão final.
 * REVERTER assim que houver billing habilitado no projeto Google Cloud da
 * chave: trocar o fallback abaixo de volta pra `gemini-pro-latest`, ou
 * (sem precisar mexer no código) só setar a env var `GEMINI_MODEL_CHEIO=gemini-pro-latest`
 * no Railway.
 */
const MODELO_POR_TIER: Record<GeminiTier, string> = {
  leve: process.env.GEMINI_MODEL_LEVE || "gemini-flash-latest",
  cheio: process.env.GEMINI_MODEL_CHEIO || "gemini-flash-latest",
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
