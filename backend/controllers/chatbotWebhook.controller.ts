/**
 * 🪝 Webhook de entrada do WhatsApp (Evolution API) para o chatbot.
 *
 * A Evolution API (Baileys) faz POST aqui a cada mensagem recebida no número
 * pareado (evento messages.upsert). Este controller traduz o payload cru pra
 * uma chamada do ChatbotService e devolve a resposta pelo mesmo canal
 * (EvolutionApiService.sendText).
 *
 * Sem AuthMiddleware — a Evolution não manda JWT. Proteção: um segredo no
 * path (:segredo), comparado com CHATBOT_WHATSAPP_WEBHOOK_SECRET. Responde
 * 200 imediatamente (a Evolution desabilita o webhook diante de erro
 * repetido) e processa a resposta de forma assíncrona, pra não estourar o
 * timeout do webhook — a chamada ao Gemini leva alguns segundos.
 */
import { Request, Response } from "express";
import ChatbotService from "../services/chatbot.service";
import EvolutionApiService from "../external/EvolutionApiService";

const MAX_IDS_PROCESSADOS = 500;

interface EventoWhatsapp {
  numeroJid: string;
  texto: string;
  id: string;
}

export default class ChatbotWebhookController {
  #chatbotService: ChatbotService;
  #idsProcessados = new Set<string>();

  constructor(chatbotService: ChatbotService) {
    console.log("⬆️  ChatbotWebhookController.constructor()");
    this.#chatbotService = chatbotService;
  }

  /**
   * POST /api/chatbot/webhook/whatsapp/:segredo
   */
  receberWhatsapp = (req: Request, res: Response): void => {
    const segredoEsperado = process.env.CHATBOT_WHATSAPP_WEBHOOK_SECRET;
    if (!segredoEsperado) {
      console.error("❌ [ChatbotWebhookController] CHATBOT_WHATSAPP_WEBHOOK_SECRET não configurado — webhook desativado.");
      res.status(404).json({ message: "Not found" });
      return;
    }
    if (req.params.segredo !== segredoEsperado) {
      // 404 (não 401) pra não confirmar que o endpoint existe.
      res.status(404).json({ message: "Not found" });
      return;
    }

    const evento = this.#extrair(req.body);

    // SEMPRE 200 — erro repetido faz a Evolution desabilitar o webhook.
    res.status(200).json({ ok: true });

    if (!evento) return;

    if (evento.id) {
      if (this.#idsProcessados.has(evento.id)) return; // reentrega da Evolution (reconexão do Baileys)
      this.#idsProcessados.add(evento.id);
      if (this.#idsProcessados.size > MAX_IDS_PROCESSADOS) {
        this.#idsProcessados = new Set([...this.#idsProcessados].slice(-MAX_IDS_PROCESSADOS));
      }
    }

    void this.#processar(evento).catch((erro) => {
      console.error("❌ [ChatbotWebhookController] Falha ao processar mensagem do WhatsApp:", erro);
    });
  };

  /**
   * Extrai número + texto do payload da Evolution, ou null se for um evento
   * que o chatbot deve ignorar (mensagem própria, grupo, status, sem texto).
   */
  #extrair = (body: any): EventoWhatsapp | null => {
    const data = body?.data ?? body;
    const key = data?.key ?? {};
    const remoteJid: string = key?.remoteJid ?? "";

    if (key?.fromMe === true) return null;
    // Só conversa 1:1. Descarta grupos (@g.us), status@broadcast, newsletter, etc.
    if (!remoteJid.endsWith("@s.whatsapp.net")) return null;

    const message = data?.message ?? {};
    const texto: string = message?.conversation ?? message?.extendedTextMessage?.text ?? "";
    if (!texto || !texto.trim()) return null;

    return { numeroJid: remoteJid.split("@")[0], texto: texto.trim(), id: key?.id ?? "" };
  };

  #processar = async (evento: EventoWhatsapp): Promise<void> => {
    console.log("📥 [ChatbotWebhookController] Mensagem WhatsApp recebida, processando...");

    const { resposta } = await this.#chatbotService.enviarMensagemWhatsapp(evento.numeroJid, evento.texto);
    if (!resposta || !resposta.trim()) return;

    await EvolutionApiService.getInstance().sendText(evento.numeroJid, resposta.trim());
    console.log("📤 [ChatbotWebhookController] Resposta enviada ao WhatsApp.");
  };
}
