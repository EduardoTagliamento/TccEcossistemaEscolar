import { getGeminiProviderLeve } from "../providers/geminiProvider";

const SEM_FALA_RECONHECIVEL = "SEM_FALA_RECONHECIVEL";

/**
 * Transcrição de mensagens de voz do WhatsApp via Gemini multimodal (input
 * áudio), mesma decisão de `ExtracaoPaginaAgent`: reaproveitar o provedor de
 * IA já integrado em vez de um serviço de STT dedicado. Tier "leve" — igual
 * ao resto da conversa do chatbot (`assistenteAgent.ts`), já que aqui
 * responsividade importa mais que num resumo grounded.
 */
export class TranscricaoAudioAgent {
  transcrever = async (audioBase64: string, mimeType: string): Promise<string | null> => {
    console.log("🤖 TranscricaoAudioAgent.transcrever()");

    const prompt = [
      "Transcreva literalmente a fala deste áudio, em português.",
      "Não resuma, não comente, não traduza, não corrija gramática — só transcreva exatamente o que foi dito.",
      `Se o áudio não tiver fala reconhecível (silêncio, ruído puro, música sem letra), responda exatamente: ${SEM_FALA_RECONHECIVEL}`,
    ].join("\n");

    const texto = await getGeminiProviderLeve().gerarTextoComAudio(prompt, audioBase64, mimeType, "leve");

    if (texto.trim() === SEM_FALA_RECONHECIVEL) {
      return null;
    }
    return texto;
  };
}

let instanciaSingleton: TranscricaoAudioAgent | null = null;

export function getTranscricaoAudioAgent(): TranscricaoAudioAgent {
  if (!instanciaSingleton) {
    instanciaSingleton = new TranscricaoAudioAgent();
  }
  return instanciaSingleton;
}
