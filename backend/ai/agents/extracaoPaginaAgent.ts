import { getGeminiProvider } from "../providers/geminiProvider";

const SEM_TEXTO_LEGIVEL = "SEM_TEXTO_LEGIVEL";

/**
 * Extração de texto de página escaneada via Gemini multimodal (input
 * imagem) em vez de um serviço de OCR dedicado — ponto em aberto do plano
 * (§7) resolvido a favor de reaproveitar o provedor de IA já integrado,
 * evitando mais uma chave/dependência só pra isso. Tier "cheio": fidelidade
 * de transcrição importa mais que custo aqui (roda 1x por página, não por
 * prova).
 */
export class ExtracaoPaginaAgent {
  extrairTexto = async (imagemBase64: string, mimeType: string): Promise<string | null> => {
    console.log("🤖 ExtracaoPaginaAgent.extrairTexto()");

    const prompt = [
      "Transcreva integralmente o texto visível nesta imagem de página de livro didático, em português.",
      "Preserve parágrafos. Não resuma, não comente, não traduza — só transcreva o texto como está.",
      `Se a imagem não tiver texto legível (página em branco, ilustração pura, foto ilegível), responda exatamente: ${SEM_TEXTO_LEGIVEL}`,
    ].join("\n");

    const texto = await getGeminiProvider().gerarTextoComImagem(prompt, imagemBase64, mimeType, "cheio");

    if (texto.trim() === SEM_TEXTO_LEGIVEL) {
      return null;
    }
    return texto;
  };
}

let instanciaSingleton: ExtracaoPaginaAgent | null = null;

export function getExtracaoPaginaAgent(): ExtracaoPaginaAgent {
  if (!instanciaSingleton) {
    instanciaSingleton = new ExtracaoPaginaAgent();
  }
  return instanciaSingleton;
}
