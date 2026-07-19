/**
 * 📧 Canal de Notificação - E-mail
 *
 * Encapsula o envio de notificações por e-mail via ResendEmailService
 * (já existente em backend/external/ResendEmailService.ts).
 */

import ResendEmailService from "../../external/ResendEmailService";
import Notificacao from "../../entities/notificacao.model";

export interface EnvioEmailResultado {
  id: string;
}

export default class NotificacaoEmailChannel {
  async enviar(
    destinatarioEmail: string,
    destinatarioNome: string,
    notificacao: Notificacao
  ): Promise<EnvioEmailResultado> {
    console.log("📧 NotificacaoEmailChannel.enviar()");

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const linkCompleto = notificacao.NotificacaoLink
      ? `${frontendUrl}${notificacao.NotificacaoLink}`
      : frontendUrl;

    const emailService = ResendEmailService.getInstance();
    const resultado = await emailService.sendEmail({
      to: destinatarioEmail,
      subject: notificacao.NotificacaoTitulo,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4F46E5; margin: 0 0 16px;">${notificacao.NotificacaoTitulo}</h2>
          <p style="color: #374151;">Olá, ${destinatarioNome}!</p>
          ${notificacao.NotificacaoConteudo ? `<p style="color: #4B5563; line-height: 1.6;">${notificacao.NotificacaoConteudo}</p>` : ""}
          <p style="margin-top: 24px;">
            <a href="${linkCompleto}"
               style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
              Ver no Ecossistema Escolar
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
          <p style="color: #9CA3AF; font-size: 12px;">
            Você recebeu este e-mail porque essa notificação está ativada nas suas preferências.
          </p>
        </div>
      `,
    });

    return { id: resultado.id };
  }
}
