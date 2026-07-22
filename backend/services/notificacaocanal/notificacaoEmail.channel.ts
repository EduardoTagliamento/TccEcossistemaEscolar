/**
 * 📧 Canal de Notificação - E-mail
 *
 * Encapsula o envio de notificações por e-mail via ResendEmailService
 * (já existente em backend/external/ResendEmailService.ts).
 *
 * Layout em tabelas (não `<div>`) propositalmente — é o padrão que sobrevive
 * a clientes de e-mail mais rígidos (Outlook desktop via Word engine), que
 * ignoram boa parte de CSS moderno fora de `<table>`/`<td>`.
 */

import ResendEmailService from "../../external/ResendEmailService";
import Notificacao from "../../entities/notificacao.model";

export interface EnvioEmailResultado {
  id: string;
}

/**
 * Título/conteúdo/nome vêm de dados criados por usuários (título da tarefa,
 * conteúdo do evento, nome do usuário) — escapar antes de interpolar no HTML
 * evita que alguém injete markup/links via esses campos.
 */
function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
    const linkPreferencias = `${frontendUrl}/dashboard/${notificacao.EscolaGUID}/notificacoes/configuracoes`;
    const logoUrl = `${frontendUrl}/assets/baua_fundo.png`;
    const ano = new Date().getFullYear();

    const titulo = escaparHtml(notificacao.NotificacaoTitulo);
    const nome = escaparHtml(destinatarioNome);
    const conteudo = notificacao.NotificacaoConteudo ? escaparHtml(notificacao.NotificacaoConteudo) : null;
    const preview = (notificacao.NotificacaoConteudo || notificacao.NotificacaoTitulo).slice(0, 120);

    const emailService = ResendEmailService.getInstance();
    const resultado = await emailService.sendEmail({
      to: destinatarioEmail,
      subject: notificacao.NotificacaoTitulo,
      html: `
<!doctype html>
<html lang="pt-BR">
  <body style="margin:0; padding:0; background-color:#F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escaparHtml(preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#FFFFFF; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">

            <!-- Header -->
            <tr>
              <td style="padding: 24px 32px 20px; text-align:center; border-bottom: 3px solid #1cc47b;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="vertical-align:middle; padding-right:8px;">
                      <img src="${logoUrl}" alt="" width="26" height="26" style="display:block;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <span style="font-size:22px; font-weight:700; color:#148F5A; font-family: Georgia, 'Times New Roman', serif;">bauá</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 32px;">
                <h1 style="margin:0 0 16px; font-size:20px; line-height:1.3; color:#111827;">${titulo}</h1>
                <p style="margin:0 0 16px; font-size:15px; color:#374151;">Olá, ${nome}!</p>
                ${conteudo ? `<p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#4B5563;">${conteudo}</p>` : ""}
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px; background-color:#1cc47b;">
                      <a href="${linkCompleto}"
                         style="display:inline-block; padding:12px 28px; font-size:15px; font-weight:600; color:#FFFFFF; text-decoration:none; border-radius:8px;">
                        Ver no Ecossistema Escolar
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 20px 32px; background-color:#F9FAFB; border-top:1px solid #E5E7EB;">
                <p style="margin:0 0 8px; font-size:12px; color:#9CA3AF; line-height:1.5;">
                  Você recebeu este e-mail porque essa notificação está ativada nas suas
                  <a href="${linkPreferencias}" style="color:#148F5A; text-decoration:underline;">preferências de notificação</a>.
                </p>
                <p style="margin:0; font-size:12px; color:#9CA3AF;">
                  © ${ano} Ecossistema Escolar (Bauá)
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
      `,
    });

    return { id: resultado.id };
  }
}
