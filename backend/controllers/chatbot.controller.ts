/**
 * 🎮 Controller do Chatbot
 *
 * Único endpoint v1: enviar uma mensagem e receber a resposta do
 * assistente. Sem AuthMiddleware — a identidade é resolvida DENTRO da
 * conversa (telefone), não por JWT (ver ChatbotService/assistenteAgent).
 */
import { Request, Response, NextFunction } from "express";
import ChatbotService from "../services/chatbot.service";
import ErrorResponse from "../utils/ErrorResponse";

export default class ChatbotController {
  #chatbotService: ChatbotService;

  constructor(chatbotService: ChatbotService) {
    console.log("⬆️  ChatbotController.constructor()");
    this.#chatbotService = chatbotService;
  }

  /**
   * POST /api/chatbot/mensagem
   * body: { sessionId?: string, mensagem: string }
   * Sem sessionId (primeira mensagem da conversa), o backend gera um novo
   * e devolve — o cliente reenvia esse mesmo sessionId nas próximas
   * mensagens da mesma conversa.
   */
  enviarMensagem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log("📥 [ChatbotController] POST /api/chatbot/mensagem");

      const { sessionId, mensagem } = req.body as { sessionId?: string; mensagem?: string };

      if (!mensagem || typeof mensagem !== "string") {
        throw new ErrorResponse(400, "Dados incompletos", {
          message: "O campo 'mensagem' é obrigatório.",
        });
      }

      const resultado = await this.#chatbotService.enviarMensagem(sessionId, mensagem);

      res.status(200).json({
        success: true,
        message: "Mensagem processada",
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  };
}
