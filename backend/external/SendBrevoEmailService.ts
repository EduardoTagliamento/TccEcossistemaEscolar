/**
 * 📧 Serviço de Envio de E-mail via Brevo (SendinBlue)
 * 
 * Este serviço encapsula a integração com a API transacional da Brevo.
 * 
 * @example
 * ```typescript
 * const emailService = SendBrevoEmailService.getInstance();
 * 
 * await emailService.sendEmail({
 *   to: 'aluno@escola.com.br',
 *   subject: 'Bem-vindo ao Ecossistema Escolar',
 *   htmlContent: '<h1>Olá!</h1><p>Sua conta foi criada com sucesso.</p>'
 * });
 * ```
 */

import axios from 'axios';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface EmailSender {
  email: string;
  name: string;
}

interface SendEmailOptions {
  to: string | EmailRecipient | EmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  sender?: EmailSender;
  replyTo?: EmailRecipient;
}

interface BrevoEmailResponse {
  messageId: string;
}

export class SendBrevoEmailService {
  readonly #apiKey: string;
  readonly #apiUrl = 'https://api.brevo.com/v3/smtp/email';
  readonly #defaultSender: EmailSender;
  
  private static instance: SendBrevoEmailService;

  private constructor() {
    // 🔐 Validação da chave de API
    this.#apiKey = process.env.BREVO_API_KEY || '';
    
    if (!this.#apiKey) {
      console.error('❌ [SendBrevoEmailService] BREVO_API_KEY não configurada no .env');
      throw new Error(
        'BREVO_API_KEY is required. Add it to your .env file.\n' +
        'Get your API key at: https://app.brevo.com/settings/keys/api'
      );
    }

    // ✅ Log seguro (mascarado)
    const maskedKey = this.#apiKey.substring(0, 8) + '...' + this.#apiKey.substring(this.#apiKey.length - 4);
    console.log(`✅ [SendBrevoEmailService] Inicializado com chave: ${maskedKey}`);

    // 📧 Configuração do remetente padrão
    this.#defaultSender = {
      name: process.env.EMAIL_FROM_NAME || 'Ecossistema Escolar',
      email: process.env.EMAIL_FROM || 'noreply@ecossistemaescolar.com'
    };
  }

  /**
   * Obtém a instância única do serviço (Singleton)
   */
  public static getInstance(): SendBrevoEmailService {
    if (!SendBrevoEmailService.instance) {
      SendBrevoEmailService.instance = new SendBrevoEmailService();
    }
    return SendBrevoEmailService.instance;
  }

  /**
   * Normaliza destinatários para o formato esperado pela API
   */
  #normalizeRecipients(to: string | EmailRecipient | EmailRecipient[]): EmailRecipient[] {
    if (typeof to === 'string') {
      return [{ email: to }];
    }
    
    if (Array.isArray(to)) {
      return to;
    }
    
    return [to];
  }

  /**
   * Envia um e-mail transacional via Brevo
   * 
   * @param options - Opções de envio do e-mail
   * @returns Resposta da API com messageId
   * @throws Error se o envio falhar
   */
  public async sendEmail(options: SendEmailOptions): Promise<BrevoEmailResponse> {
    const recipients = this.#normalizeRecipients(options.to);
    const sender = options.sender || this.#defaultSender;

    const payload = {
      sender,
      to: recipients,
      subject: options.subject,
      htmlContent: options.htmlContent,
      ...(options.textContent && { textContent: options.textContent }),
      ...(options.replyTo && { replyTo: options.replyTo })
    };

    try {
      console.log(`📧 [SendBrevoEmailService] Enviando e-mail para: ${recipients.map(r => r.email).join(', ')}`);
      
      const response = await axios.post<BrevoEmailResponse>(
        this.#apiUrl,
        payload,
        {
          headers: {
            'api-key': this.#apiKey,
            'Content-Type': 'application/json',
            'accept': 'application/json'
          }
        }
      );

      console.log(`✅ [SendBrevoEmailService] E-mail enviado com sucesso. MessageId: ${response.data.messageId}`);
      return response.data;

    } catch (error: any) {
      console.error('❌ [SendBrevoEmailService] Erro ao enviar e-mail:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      throw new Error(
        `Falha ao enviar e-mail via Brevo: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Envia e-mail de boas-vindas para novo usuário
   */
  public async sendWelcomeEmail(userEmail: string, userName: string): Promise<BrevoEmailResponse> {
    return this.sendEmail({
      to: { email: userEmail, name: userName },
      subject: 'Bem-vindo ao Ecossistema Escolar! 🎓',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Bem-vindo, ${userName}! 🎉</h1>
          <p>Sua conta foi criada com sucesso no <strong>Ecossistema Escolar</strong>.</p>
          <p>Agora você pode acessar todos os recursos da plataforma educacional.</p>
          <br>
          <p style="color: #666; font-size: 12px;">
            Se você não criou esta conta, entre em contato conosco imediatamente.
          </p>
        </div>
      `
    });
  }

  /**
   * Envia e-mail de recuperação de senha
   */
  public async sendPasswordResetEmail(
    userEmail: string, 
    userName: string, 
    resetToken: string
  ): Promise<BrevoEmailResponse> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    return this.sendEmail({
      to: { email: userEmail, name: userName },
      subject: '🔐 Recuperação de Senha - Ecossistema Escolar',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Recuperação de Senha</h1>
          <p>Olá, ${userName}!</p>
          <p>Recebemos uma solicitação para redefinir sua senha.</p>
          <p>
            <a href="${resetUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
              Redefinir Senha
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            Este link expira em 1 hora.
          </p>
          <p style="color: #666; font-size: 12px;">
            Se você não solicitou esta recuperação, ignore este e-mail.
          </p>
        </div>
      `
    });
  }

  /**
   * Envia notificação de nova atividade atribuída
   */
  public async sendActivityNotification(
    userEmail: string,
    userName: string,
    activityTitle: string,
    dueDate: Date
  ): Promise<BrevoEmailResponse> {
    const dueDateFormatted = dueDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return this.sendEmail({
      to: { email: userEmail, name: userName },
      subject: `📚 Nova Atividade: ${activityTitle}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Nova Atividade Atribuída 📝</h1>
          <p>Olá, ${userName}!</p>
          <p>Você recebeu uma nova atividade:</p>
          <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h2 style="margin: 0 0 8px 0; color: #1F2937;">${activityTitle}</h2>
            <p style="margin: 0; color: #6B7280;">
              📅 Data de entrega: <strong>${dueDateFormatted}</strong>
            </p>
          </div>
          <p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/atividades" 
               style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
              Ver Atividade
            </a>
          </p>
        </div>
      `
    });
  }
}

// Exporta instância singleton
export default SendBrevoEmailService.getInstance();
