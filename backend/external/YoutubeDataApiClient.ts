import axios from "axios";
import { IAIndisponivelError } from "../ai/aiErrors";

export interface VideoResultado {
  titulo: string;
  url: string;
  canal: string;
  thumbnailUrl: string | null;
}

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const TIMEOUT_MS = 10000;

/**
 * Client fino da YouTube Data API v3 (busca real, `search.list`). Nunca
 * inventa resultado — se a API não achar nada ou falhar, quem chama decide
 * (guardrail do spec §7: vídeo sempre vem da API real, a IA só orienta a
 * busca/reordena, nunca inventa título/URL).
 */
export class YoutubeDataApiClient {
  buscarVideos = async (query: string, maxResults = 5): Promise<VideoResultado[]> => {
    console.log(`🎥 YoutubeDataApiClient.buscarVideos() query="${query}"`);

    // Chave separada da do Gemini (YOUTUBE_API_KEY): na prática, uma chave
    // Google com "API restrictions" liberando só a Generative Language API
    // (caso comum ao criar a chave pelo AI Studio) devolve 401
    // UNAUTHENTICATED "API keys are not supported by this API" na YouTube
    // Data API mesmo com a API habilitada no projeto — confirmado em teste
    // real em 2026-08-04. GOOGLE_API_KEY fica como fallback pra quem usar
    // uma única chave sem essa restrição.
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new IAIndisponivelError(
        "YouTube Data API",
        new Error("YOUTUBE_API_KEY (ou GOOGLE_API_KEY) não configurada")
      );
    }

    try {
      const response = await axios.get(YOUTUBE_SEARCH_URL, {
        timeout: TIMEOUT_MS,
        params: {
          key: apiKey,
          q: query,
          part: "snippet",
          type: "video",
          maxResults,
          relevanceLanguage: "pt",
          safeSearch: "strict",
        },
      });

      const items: any[] = response.data?.items ?? [];
      return items
        .filter((item) => item?.id?.videoId)
        .map((item) => ({
          titulo: item.snippet?.title ?? "",
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          canal: item.snippet?.channelTitle ?? "",
          thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? null,
        }));
    } catch (error) {
      if (error instanceof IAIndisponivelError) throw error;
      throw new IAIndisponivelError("YouTube Data API", error);
    }
  };
}

let instanciaSingleton: YoutubeDataApiClient | null = null;

export function getYoutubeDataApiClient(): YoutubeDataApiClient {
  if (!instanciaSingleton) {
    instanciaSingleton = new YoutubeDataApiClient();
  }
  return instanciaSingleton;
}
