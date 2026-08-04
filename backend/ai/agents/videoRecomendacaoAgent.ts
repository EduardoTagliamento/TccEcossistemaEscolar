import { Schema, Type } from "@google/genai";
import { getGeminiProvider } from "../providers/geminiProvider";
import { getYoutubeDataApiClient, VideoResultado } from "../../external/YoutubeDataApiClient";

const QUERIES_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    queries: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      minItems: "2",
      maxItems: "3",
    },
  },
  required: ["queries"],
};

const ORDEM_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    ordemIndices: {
      type: Type.ARRAY,
      items: { type: Type.INTEGER },
    },
  },
  required: ["ordemIndices"],
};

interface QueriesResposta {
  queries: string[];
}

interface OrdemResposta {
  ordemIndices: number[];
}

/**
 * Híbrido do spec (item 5): LLM gera queries de busca (tier leve) → YouTube
 * Data API v3 real → LLM opcionalmente reordena os resultados reais. O LLM
 * nunca inventa um vídeo, só melhora a busca e a ordenação (guardrail §7).
 */
export class VideoRecomendacaoAgent {
  recomendar = async (contexto: string, maxResultadosPorQuery = 4): Promise<VideoResultado[]> => {
    console.log("🤖 VideoRecomendacaoAgent.recomendar()");

    const queries = await this.#gerarQueriesBusca(contexto);

    const youtube = getYoutubeDataApiClient();
    const resultadosPorQuery = await Promise.all(
      queries.map((query) => youtube.buscarVideos(query, maxResultadosPorQuery))
    );

    const candidatos = this.#deduplicarPorUrl(resultadosPorQuery.flat());
    if (candidatos.length <= 1) {
      return candidatos;
    }

    return this.#reordenarPorRelevancia(contexto, candidatos);
  };

  #gerarQueriesBusca = async (contexto: string): Promise<string[]> => {
    const prompt = [
      "Gere de 2 a 3 queries curtas de busca do YouTube (em português do Brasil) pra encontrar",
      "vídeos educacionais sobre o assunto abaixo, úteis para um aluno do ensino médio estudar.",
      "Cada query deve ter no máximo 8 palavras. Não inclua aspas nem operadores de busca.",
      "",
      `Assunto: ${contexto}`,
    ].join("\n");

    try {
      const resposta = await getGeminiProvider().gerarEstruturado<QueriesResposta>(
        prompt,
        QUERIES_SCHEMA,
        "leve"
      );
      const queries = (resposta.queries ?? []).map((q) => q.trim()).filter(Boolean);
      return queries.length > 0 ? queries : [contexto];
    } catch (error) {
      console.warn("🟡 VideoRecomendacaoAgent.#gerarQueriesBusca() falhou, usando contexto bruto:", error);
      return [contexto];
    }
  };

  #reordenarPorRelevancia = async (
    contexto: string,
    candidatos: VideoResultado[]
  ): Promise<VideoResultado[]> => {
    const prompt = [
      "Você vai reordenar uma lista de vídeos reais do YouTube por relevância pra um aluno estudar o assunto abaixo.",
      "Devolva APENAS os índices (baseados em 0) na nova ordem, do mais relevante pro menos relevante.",
      "Não invente nenhum vídeo novo — use só os índices da lista fornecida.",
      "",
      `Assunto: ${contexto}`,
      "",
      "Vídeos:",
      ...candidatos.map((v, i) => `${i}. "${v.titulo}" — canal: ${v.canal}`),
    ].join("\n");

    try {
      const resposta = await getGeminiProvider().gerarEstruturado<OrdemResposta>(
        prompt,
        ORDEM_SCHEMA,
        "leve"
      );
      const indicesValidos = (resposta.ordemIndices ?? []).filter(
        (i) => Number.isInteger(i) && i >= 0 && i < candidatos.length
      );
      if (indicesValidos.length !== candidatos.length) {
        return candidatos;
      }
      return indicesValidos.map((i) => candidatos[i]);
    } catch (error) {
      console.warn("🟡 VideoRecomendacaoAgent.#reordenarPorRelevancia() falhou, mantendo ordem original:", error);
      return candidatos;
    }
  };

  #deduplicarPorUrl = (videos: VideoResultado[]): VideoResultado[] => {
    const vistos = new Set<string>();
    return videos.filter((v) => {
      if (vistos.has(v.url)) return false;
      vistos.add(v.url);
      return true;
    });
  };
}

let instanciaSingleton: VideoRecomendacaoAgent | null = null;

export function getVideoRecomendacaoAgent(): VideoRecomendacaoAgent {
  if (!instanciaSingleton) {
    instanciaSingleton = new VideoRecomendacaoAgent();
  }
  return instanciaSingleton;
}
