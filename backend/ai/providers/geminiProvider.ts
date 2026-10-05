import { GoogleGenAI, Schema, createUserContent, createPartFromBase64, Content, Tool, FunctionCall } from "@google/genai";
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
 * ✅ RESOLVIDO (2026-09-29): billing habilitado no projeto Google Cloud da
 * chave — confirmado via chamada real (`gemini-pro-latest` respondendo e
 * sobrevivendo a uma rajada de 8 chamadas paralelas, sem 429). O fallback do
 * tier "cheio" volta a apontar pro modelo Pro de verdade, restaurando a
 * fidelidade do resumo grounded e do sumário de livro (item 19 do spec).
 * Ver docs/PLANO_IMPLEMENTACAO_RECOMENDACAO_ESTUDOS_IA.md §9 pro histórico da
 * solução temporária que isso substitui.
 */
const MODELO_POR_TIER: Record<GeminiTier, string> = {
  leve: process.env.GEMINI_MODEL_LEVE || "gemini-flash-latest",
  cheio: process.env.GEMINI_MODEL_CHEIO || "gemini-pro-latest",
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
 * Retry com backoff pra erros TRANSIENTES do Gemini (503 UNAVAILABLE — "high
 * demand", ou 429 RESOURCE_EXHAUSTED) — descoberto em produção durante o
 * piloto da Peça 2/3 da extração de livros P4ED: um pico de indisponibilidade
 * momentânea do Gemini derrubava uma fração aleatória de um lote de chamadas
 * simultâneas, sem chance de recuperação (nenhum retry existia antes disso).
 * Erros não-transientes (chave inválida, resposta vazia, timeout nosso) NÃO
 * são retentados — sobem direto pro catch de cada método, que already
 * embrulha em IAIndisponivelError como antes.
 */
const MAX_TENTATIVAS_TRANSIENTE = 3;
const BACKOFF_BASE_MS = 1000;

function eErroTransiente(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /"code"\s*:\s*503/.test(msg) || /UNAVAILABLE/.test(msg) || /"code"\s*:\s*429/.test(msg) || /RESOURCE_EXHAUSTED/.test(msg);
}

async function comRetryTransiente<T>(fn: () => Promise<T>, origem: string): Promise<T> {
  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_TRANSIENTE; tentativa++) {
    try {
      return await fn();
    } catch (error) {
      ultimoErro = error;
      if (!eErroTransiente(error) || tentativa === MAX_TENTATIVAS_TRANSIENTE) throw error;
      const esperaMs = BACKOFF_BASE_MS * 2 ** (tentativa - 1);
      console.log(`🤖 ${origem}: erro transiente (tentativa ${tentativa}/${MAX_TENTATIVAS_TRANSIENTE}), retry em ${esperaMs}ms`);
      await new Promise((r) => setTimeout(r, esperaMs));
    }
  }
  throw ultimoErro;
}

/**
 * Wrapper fino do SDK do Gemini — só chama a API e devolve texto/JSON já
 * parseado. Não acessa banco, não conhece regra de negócio (contrato de
 * `backend/ai/README.txt`); quem monta prompt e interpreta o resultado são
 * os agents em `backend/ai/agents/`.
 */
export class GeminiProvider {
  #client: GoogleGenAI | null = null;
  #envVarChave: string;

  constructor(envVarChave: string = "GOOGLE_API_KEY") {
    this.#envVarChave = envVarChave;
  }

  #getClient(): GoogleGenAI {
    if (this.#client) return this.#client;

    const apiKey = process.env[this.#envVarChave];
    if (!apiKey) {
      throw new IAIndisponivelError("Gemini", new Error(`${this.#envVarChave} não configurada`));
    }

    this.#client = new GoogleGenAI({ apiKey });
    return this.#client;
  }

  /** Gera texto livre (ex.: resumo grounded). */
  gerarTexto = async (prompt: string, tier: GeminiTier, timeoutMs = TIMEOUT_PADRAO_MS): Promise<string> => {
    console.log(`🤖 GeminiProvider.gerarTexto() tier=${tier}`);

    try {
      const client = this.#getClient();
      const response = await comRetryTransiente(
        () => comTimeout(client.models.generateContent({ model: MODELO_POR_TIER[tier], contents: prompt }), timeoutMs, "Gemini"),
        "GeminiProvider.gerarTexto"
      );

      const texto = response.text;
      if (!texto || !texto.trim()) {
        throw new Error("resposta vazia");
      }
      return texto.trim();
    } catch (error) {
      // Fallback automático "cheio" -> "leve": cota do modelo Pro pode
      // esgotar (visto em produção em 2026-10-05, erro 429 RESOURCE_EXHAUSTED
      // com limit=0 no free tier) sem que o "leve" esteja comprometido — nesse
      // caso é melhor um resumo gerado pelo modelo mais fraco do que nenhum
      // resumo. Só tenta uma vez, nunca recursivo (tier já é "leve" na
      // segunda chamada).
      if (tier === "cheio") {
        console.warn("🟡 GeminiProvider.gerarTexto: tier 'cheio' falhou, tentando fallback com tier 'leve':", error);
        try {
          return await this.gerarTexto(prompt, "leve", timeoutMs);
        } catch (erroFallback) {
          if (erroFallback instanceof IAIndisponivelError) throw erroFallback;
          throw new IAIndisponivelError("Gemini", erroFallback);
        }
      }
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
      const response = await comRetryTransiente(
        () =>
          comTimeout(
            client.models.generateContent({
              model: MODELO_POR_TIER[tier],
              contents: createUserContent([prompt, createPartFromBase64(imagemBase64, mimeType)]),
            }),
            timeoutMs,
            "Gemini"
          ),
        "GeminiProvider.gerarTextoComImagem"
      );

      const texto = response.text;
      if (!texto || !texto.trim()) {
        throw new Error("resposta vazia");
      }
      return texto.trim();
    } catch (error) {
      // Mesmo fallback cheio->leve de gerarTexto (ver comentário lá) —
      // extração de página de livro (ExtracaoPaginaAgent) usa tier "cheio".
      if (tier === "cheio") {
        console.warn("🟡 GeminiProvider.gerarTextoComImagem: tier 'cheio' falhou, tentando fallback com tier 'leve':", error);
        try {
          return await this.gerarTextoComImagem(prompt, imagemBase64, mimeType, "leve", timeoutMs);
        } catch (erroFallback) {
          if (erroFallback instanceof IAIndisponivelError) throw erroFallback;
          throw new IAIndisponivelError("Gemini", erroFallback);
        }
      }
      if (error instanceof IAIndisponivelError) throw error;
      throw new IAIndisponivelError("Gemini", error);
    }
  };

  /**
   * Gera texto a partir de um áudio (input multimodal) + instrução — usado
   * pela transcrição de mensagens de voz do WhatsApp (chatbot). Mesma
   * mecânica de `gerarTextoComImagem` (o Gemini aceita áudio como só mais um
   * `Part` inline em base64); timeout maior porque um áudio de alguns
   * segundos ainda leva mais tempo pra processar que uma imagem.
   */
  gerarTextoComAudio = async (
    prompt: string,
    audioBase64: string,
    mimeType: string,
    tier: GeminiTier,
    timeoutMs = 30000
  ): Promise<string> => {
    console.log(`🤖 GeminiProvider.gerarTextoComAudio() tier=${tier}`);

    try {
      const client = this.#getClient();
      const response = await comRetryTransiente(
        () =>
          comTimeout(
            client.models.generateContent({
              model: MODELO_POR_TIER[tier],
              contents: createUserContent([prompt, createPartFromBase64(audioBase64, mimeType)]),
            }),
            timeoutMs,
            "Gemini"
          ),
        "GeminiProvider.gerarTextoComAudio"
      );

      const texto = response.text;
      if (!texto || !texto.trim()) {
        throw new Error("resposta vazia");
      }
      return texto.trim();
    } catch (error) {
      // Mesmo fallback cheio->leve de gerarTexto (ver comentário lá).
      if (tier === "cheio") {
        console.warn("🟡 GeminiProvider.gerarTextoComAudio: tier 'cheio' falhou, tentando fallback com tier 'leve':", error);
        try {
          return await this.gerarTextoComAudio(prompt, audioBase64, mimeType, "leve", timeoutMs);
        } catch (erroFallback) {
          if (erroFallback instanceof IAIndisponivelError) throw erroFallback;
          throw new IAIndisponivelError("Gemini", erroFallback);
        }
      }
      if (error instanceof IAIndisponivelError) throw error;
      throw new IAIndisponivelError("Gemini", error);
    }
  };

  /**
   * Um turno de conversa com function calling manual (não o
   * "automaticFunctionCalling" do SDK — aqui quem decide se/como executar
   * cada chamada é o agent, porque as ferramentas do chatbot precisam
   * injetar estado de sessão que o modelo nunca vê nem controla, ver
   * `backend/ai/agents/assistenteAgent.ts`). Devolve o `Content` bruto do
   * modelo (pra caller anexar ao histórico) + as function calls pendentes,
   * se houver — texto e function calls nunca coexistem na prática do
   * Gemini, mas o shape permite os dois por segurança do caller.
   */
  conversarComFerramentas = async (
    contents: Content[],
    tools: Tool[],
    systemInstruction: string,
    tier: GeminiTier,
    timeoutMs = TIMEOUT_PADRAO_MS
  ): Promise<{ content: Content; functionCalls: FunctionCall[] | undefined; texto: string | undefined }> => {
    console.log(`🤖 GeminiProvider.conversarComFerramentas() tier=${tier}`);

    try {
      const client = this.#getClient();
      const response = await comRetryTransiente(
        () =>
          comTimeout(
            client.models.generateContent({
              model: MODELO_POR_TIER[tier],
              contents,
              config: { tools, systemInstruction },
            }),
            timeoutMs,
            "Gemini"
          ),
        "GeminiProvider.conversarComFerramentas"
      );

      const content = response.candidates?.[0]?.content;
      if (!content) {
        throw new Error("resposta sem conteúdo");
      }

      return { content, functionCalls: response.functionCalls, texto: response.text };
    } catch (error) {
      // Mesmo fallback cheio->leve de gerarTexto (ver comentário lá).
      if (tier === "cheio") {
        console.warn("🟡 GeminiProvider.conversarComFerramentas: tier 'cheio' falhou, tentando fallback com tier 'leve':", error);
        try {
          return await this.conversarComFerramentas(contents, tools, systemInstruction, "leve", timeoutMs);
        } catch (erroFallback) {
          if (erroFallback instanceof IAIndisponivelError) throw erroFallback;
          throw new IAIndisponivelError("Gemini", erroFallback);
        }
      }
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
      const response = await comRetryTransiente(
        () =>
          comTimeout(
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
          ),
        "GeminiProvider.gerarEstruturado"
      );

      const texto = response.text;
      if (!texto) {
        throw new Error("resposta vazia");
      }
      return JSON.parse(texto) as T;
    } catch (error) {
      // Mesmo fallback cheio->leve de gerarTexto (ver comentário lá) —
      // SumarioLivroAgent usa tier "cheio" aqui.
      if (tier === "cheio") {
        console.warn("🟡 GeminiProvider.gerarEstruturado: tier 'cheio' falhou, tentando fallback com tier 'leve':", error);
        try {
          return await this.gerarEstruturado<T>(prompt, schema, "leve", timeoutMs);
        } catch (erroFallback) {
          if (erroFallback instanceof IAIndisponivelError) throw erroFallback;
          throw new IAIndisponivelError("Gemini", erroFallback);
        }
      }
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

let instanciaSingletonLeve: GeminiProvider | null = null;

/**
 * ⚠️ CONTORNO TEMPORÁRIO (2026-09-30): a chave paga (`GOOGLE_API_KEY`) está
 * bloqueada em produção por um bug conhecido da Google — "Lightning dunning
 * decision is deny" no projeto Google Cloud, que continua negando mesmo com o
 * saldo devedor zerado (exige saldo > $0 pra reativar automaticamente, não só
 * "sem dívida"). Enquanto isso não se resolve do lado da Google, os usos mais
 * sensíveis a indisponibilidade (chatbot, resumo de estudo, recomendação de
 * vídeo, transcrição de áudio — ver `assistenteAgent.ts`, `resumoEstudoAgent.ts`,
 * `videoRecomendacaoAgent.ts`, `transcricaoAudioAgent.ts`) usam uma chave
 * SEPARADA (`GOOGLE_API_KEY_LEVE`, projeto Google Cloud "baua-light", tier
 * gratuito puro, sem o bug de billing). Classificação de assunto, sumário de
 * livro e extração de página de material didático continuam na chave paga
 * (`getGeminiProvider()`) — ficam indisponíveis enquanto a Google não destravar,
 * decisão deliberada do Eduardo (são pipelines assíncronos/background, não
 * user-facing em tempo real).
 * REVERTER pra `getGeminiProvider()` nesses 4 pontos assim que a chave paga for
 * reativada — a chave leve é tier gratuito e volta a bater cota se o volume
 * de uso crescer.
 */
export function getGeminiProviderLeve(): GeminiProvider {
  if (!instanciaSingletonLeve) {
    instanciaSingletonLeve = new GeminiProvider("GOOGLE_API_KEY_LEVE");
  }
  return instanciaSingletonLeve;
}
