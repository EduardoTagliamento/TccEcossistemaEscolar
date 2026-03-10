/**
 * 📧 Serviço de Envio de E-mail via Resend
 * 
 * Este serviço encapsula a integração com a API da Resend.
 * Docs: https://resend.com/docs/send-with-nodejs
 * 
 * @example
 * ```typescript
 * const emailService = ResendEmailService.getInstance();
 * 
 * await emailService.sendEmail({
 *   to: 'aluno@escola.com.br',
 *   subject: 'Bem-vindo ao Ecossistema Escolar',
 *   html: '<h1>Olá!</h1><p>Sua conta foi criada com sucesso.</p>'
 * });
 * ```
 */

import { Resend } from 'resend';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

interface ResendEmailResponse {
  id: string;
}

export class ResendEmailService {
  readonly #resend: Resend;
  readonly #defaultFrom: string;
  
  private static instance: ResendEmailService;

  private constructor() {
    // 🔐 Validação da chave de API
    const apiKey = process.env.RESEND_API_KEY || '';
    
    if (!apiKey) {
      console.error('❌ [ResendEmailService] RESEND_API_KEY não configurada no .env');
      throw new Error(
        'RESEND_API_KEY is required. Add it to your .env file.\n' +
        'Get your API key at: https://resend.com/api-keys'
      );
    }

    // ✅ Inicializa o cliente Resend
    this.#resend = new Resend(apiKey);

    // ✅ Log seguro (mascarado)
    const maskedKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
    console.log(`✅ [ResendEmailService] Inicializado com chave: ${maskedKey}`);

    // 📧 Configuração do remetente padrão
    this.#defaultFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  }

  /**
   * Obtém a instância única do serviço (Singleton)
   */
  public static getInstance(): ResendEmailService {
    if (!ResendEmailService.instance) {
      ResendEmailService.instance = new ResendEmailService();
    }
    return ResendEmailService.instance;
  }

  /**
   * Envia um e-mail via Resend
   * 
   * @param options - Opções de envio do e-mail
   * @returns Resposta da API com id do e-mail
   * @throws Error se o envio falhar
   */
  public async sendEmail(options: SendEmailOptions): Promise<ResendEmailResponse> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const from = options.from || this.#defaultFrom;

    try {
      console.log(`📧 [ResendEmailService] Enviando e-mail para: ${recipients.join(', ')}`);
      
      const { data, error } = await this.#resend.emails.send({
        from,
        to: recipients,
        subject: options.subject,
        html: options.html,
        ...(options.text && { text: options.text }),
        ...(options.replyTo && { reply_to: options.replyTo })
      });

      if (error) {
        console.error('❌ [ResendEmailService] Erro ao enviar e-mail:', error);
        throw new Error(`Falha ao enviar e-mail via Resend: ${error.message}`);
      }

      console.log(`✅ [ResendEmailService] E-mail enviado com sucesso. ID: ${data?.id}`);
      return { id: data?.id || '' };

    } catch (error: any) {
      console.error('❌ [ResendEmailService] Erro ao enviar e-mail:', {
        message: error.message
      });

      throw new Error(
        `Falha ao enviar e-mail via Resend: ${error.message}`
      );
    }
  }

  /**
   * Envia e-mail de boas-vindas para novo usuário
   */
  public async sendWelcomeEmail(userEmail: string, userName: string): Promise<ResendEmailResponse> {
    return this.sendEmail({
      to: userEmail,
      subject: 'Bem-vindo ao Ecossistema Escolar! 🎓',
      html: `
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
  ): Promise<ResendEmailResponse> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    return this.sendEmail({
      to: userEmail,
      subject: '🔐 Recuperação de Senha - Ecossistema Escolar',
      html: `
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
  ): Promise<ResendEmailResponse> {
    const dueDateFormatted = dueDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return this.sendEmail({
      to: userEmail,
      subject: `📚 Nova Atividade: ${activityTitle}`,
      html: `
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

  /**
   * Envia e-mail com código de verificação (6 dígitos numéricos)
   */
  public async sendVerificationEmail(
    userEmail: string,
    userName: string,
    verificationCode: string
  ): Promise<ResendEmailResponse> {
    return this.sendEmail({
      to: userEmail,
      subject: '🔐 Verificação de Email - Ecossistema Escolar',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5; margin: 0;">Ecossistema Escolar</h1>
          </div>
          
          <h2 style="color: #1F2937;">Olá, ${userName}! 👋</h2>
          
          <p style="color: #4B5563; font-size: 16px; line-height: 1.6;">
            Você solicitou a verificação do seu email. Use o código abaixo para confirmar:
          </p>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      border-radius: 12px; 
                      padding: 30px; 
                      text-align: center; 
                      margin: 30px 0;">
            <div style="background-color: white; 
                        border-radius: 8px; 
                        padding: 20px; 
                        display: inline-block;">
              <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px; font-weight: 500;">
                SEU CÓDIGO DE VERIFICAÇÃO
              </p>
              <p style="margin: 0; 
                        font-size: 42px; 
                        font-weight: bold; 
                        color: #4F46E5; 
                        letter-spacing: 8px; 
                        font-family: 'Courier New', monospace;">
                ${verificationCode}
              </p>
            </div>
          </div>
          
          <div style="background-color: #FEF3C7; 
                      border-left: 4px solid #F59E0B; 
                      padding: 16px; 
                      margin: 20px 0; 
                      border-radius: 4px;">
            <p style="margin: 0; color: #92400E; font-size: 14px;">
              ⏱️ <strong>Este código expira em 15 minutos.</strong>
            </p>
          </div>
          
          <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
            Não compartilhe este código com ninguém. Se você não solicitou esta verificação, 
            ignore este email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
          
          <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} Ecossistema Escolar. Todos os direitos reservados.
          </p>
        </div>
      `,
      text: `
        Olá, ${userName}!
        
        Você solicitou a verificação do seu email no Ecossistema Escolar.
        
        Seu código de verificação é: ${verificationCode}
        
        Este código expira em 15 minutos.
        
        Se você não solicitou esta verificação, ignore este email.
        
        ---
        Ecossistema Escolar
        © ${new Date().getFullYear()} Todos os direitos reservados.
      `
    });
  }
}

// Exporta a classe para uso com getInstance()
// Não exporta instância automática para garantir que dotenv seja carregado primeiro
export default ResendEmailService;
