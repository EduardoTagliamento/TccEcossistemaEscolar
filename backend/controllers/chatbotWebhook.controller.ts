/**
 * 🪝 Webhook de entrada do WhatsApp (Evolution API) para o chatbot.
 *
 * A Evolution API (Baileys) faz POST aqui a cada mensagem recebida no número
 * pareado (evento messages.upsert). Este controller traduz o payload cru pra
 * uma chamada do ChatbotService e devolve a resposta pelo mesmo canal
 * (EvolutionApiService.sendTextRapido — sem a verificação de entrega de
 * 6-12s que `sendText` faz pra fila de notificação; aqui responsividade
 * importa mais).
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
const MIMES_ANEXO_ACEITOS = ["image/", "application/pdf"];
const TAMANHO_MAX_ANEXO_BYTES = 16 * 1024 * 1024; // limite do próprio WhatsApp

interface EventoWhatsapp {
  numeroJid: string;
  texto: string;
  id: string;
  /** Quando a mensagem traz imagem/PDF: o objeto `message` cru (a Evolution precisa dele inteiro pra baixar a mídia). */
  midiaMensagemCru?: unknown;
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
    console.log(
      `🪝 [ChatbotWebhookController] hit — event=${(req.body?.event ?? req.body?.data?.event ?? "?")} ` +
        `secretOk=${!!segredoEsperado && req.params.segredo === segredoEsperado} ` +
        `msgKeys=${Object.keys(req.body?.data?.message ?? req.body?.message ?? {}).join(",") || "-"}`
    );

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

    if (!evento) {
      console.log("🪝 [ChatbotWebhookController] evento ignorado (fromMe / não-1:1 / sem texto nem mídia aceita).");
      return;
    }

    if (evento.id) {
      if (this.#idsProcessados.has(evento.id)) return; // reentrega da Evolution (reconexão do Baileys)
      this.#idsProcessados.add(evento.id);
      if (this.#idsProcessados.size > MAX_IDS_PROCESSADOS) {
        this.#idsProcessados = new Set([...this.#idsProcessados].slice(-MAX_IDS_PROCESSADOS));
      }
    }

    void this.#processar(evento).catch(async (erro) => {
      console.error("❌ [ChatbotWebhookController] Falha ao processar mensagem do WhatsApp:", erro);
      // Sem isso, uma falha aqui (ex.: timeout do Gemini) deixa o usuário sem
      // resposta nenhuma — silêncio total, sem indicar que algo deu errado.
      try {
        await EvolutionApiService.getInstance().sendTextRapido(
          evento.numeroJid,
          "Tive um problema pra responder agora. Pode tentar de novo em instantes?"
        );
      } catch (erroEnvio) {
        console.error("❌ [ChatbotWebhookController] Falha ao enviar mensagem de erro de fallback:", erroEnvio);
      }
    });
  };

  /**
   * Extrai número + texto (+ mídia) do payload da Evolution, ou null se for
   * um evento que o chatbot deve ignorar (mensagem própria, grupo, status,
   * sem texto nem mídia aceita).
   */
  #extrair = (body: any): EventoWhatsapp | null => {
    const data = body?.data ?? body;
    const key = data?.key ?? {};
    const remoteJid: string = key?.remoteJid ?? "";
    const remoteJidAlt: string = key?.remoteJidAlt ?? "";

    if (key?.fromMe === true) return null;
    if (remoteJid.endsWith("@g.us")) return null; // grupo
    // WhatsApp "lid" addressing: remoteJid vem como <id>@lid e o número real
    // fica em remoteJidAlt. Aceita se QUALQUER um dos dois for um JID de número
    // (@s.whatsapp.net); descarta status@broadcast, newsletter, lid sem alt.
    const jidNumero = [remoteJid, remoteJidAlt].find((j) => j.endsWith("@s.whatsapp.net"));
    if (!jidNumero) return null;

    const message = data?.message ?? {};
    const texto: string = message?.conversation ?? message?.extendedTextMessage?.text ?? "";

    // Imagem ou PDF: aceita como anexo pendente. O caption (se houver) vira o texto.
    const imagem = message?.imageMessage;
    const documento = message?.documentMessage ?? message?.documentWithCaptionMessage?.message?.documentMessage;
    const midia = imagem ?? documento;
    let midiaMensagemCru: unknown;
    let textoFinal = texto.trim();

    if (midia) {
      const mimetype: string = midia?.mimetype ?? "";
      const tamanho = this.#extrairTamanho(midia?.fileLength);
      const aceito = MIMES_ANEXO_ACEITOS.some((m) => mimetype.startsWith(m));
      if (aceito && (tamanho === 0 || tamanho <= TAMANHO_MAX_ANEXO_BYTES)) {
        midiaMensagemCru = data;
        if (!textoFinal) {
          textoFinal = String(imagem?.caption ?? documento?.caption ?? "").trim();
        }
      }
    }

    if (!textoFinal && !midiaMensagemCru) return null;

    return {
      numeroJid: jidNumero.split("@")[0],
      texto: textoFinal,
      id: key?.id ?? "",
      midiaMensagemCru,
    };
  };

  /**
   * `fileLength` no payload da Evolution/Baileys chega como um "Long" de
   * protobuf serializado em JSON (`{ low, high, unsigned }`), não como number
   * puro — `Number(fileLength)` nesse formato dá `NaN`, e `NaN <= X` é sempre
   * false, então TODO arquivo era descartado como "grande demais" mesmo
   * sendo pequeno (bug real, confirmado em produção 2026-09-11: imagem de
   * 1 usuário nunca chegava a virar anexoPendente). `high` != 0 significaria
   * um arquivo teoricamente >4GB — trata como grande demais de propósito.
   */
  #extrairTamanho = (valor: unknown): number => {
    if (typeof valor === "number") return valor;
    if (valor && typeof valor === "object" && "low" in (valor as Record<string, unknown>)) {
      const bruto = valor as { low: unknown; high?: unknown };
      const high = Number(bruto.high ?? 0);
      if (high !== 0) return Number.MAX_SAFE_INTEGER;
      return Number(bruto.low) >>> 0;
    }
    return 0;
  };

  #processar = async (evento: EventoWhatsapp): Promise<void> => {
    console.log("📥 [ChatbotWebhookController] Mensagem WhatsApp recebida, processando...");

    let resposta: string;

    if (evento.midiaMensagemCru) {
      let arquivo: { buffer: Buffer; mimetype: string; fileName: string };
      try {
        arquivo = await EvolutionApiService.getInstance().baixarMidiaBase64(evento.midiaMensagemCru);
      } catch (erro) {
        console.error("❌ [ChatbotWebhookController] Falha ao baixar mídia:", erro);
        await EvolutionApiService.getInstance().sendTextRapido(
          evento.numeroJid,
          "Não consegui baixar esse arquivo. Pode tentar enviar de novo?"
        );
        return;
      }
      ({ resposta } = await this.#chatbotService.enviarMensagemWhatsappComAnexo(
        evento.numeroJid,
        evento.texto,
        arquivo
      ));
    } else {
      ({ resposta } = await this.#chatbotService.enviarMensagemWhatsapp(evento.numeroJid, evento.texto));
    }

    if (!resposta || !resposta.trim()) return;

    await EvolutionApiService.getInstance().sendTextRapido(evento.numeroJid, resposta.trim());
    console.log("📤 [ChatbotWebhookController] Resposta enviada ao WhatsApp.");
  };
}
