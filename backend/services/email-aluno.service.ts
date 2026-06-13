import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Service para envio de emails relacionados a alunos
 */

interface DadosEmailNovoAluno {
  para: string;
  nomeAluno: string;
  nomeEscola: string;
  cpf: string;
  senhaTemporaria: string;
  linkLogin: string;
}

interface DadosEmailAlunoExistente {
  para: string;
  nomeAluno: string;
  nomeEscola: string;
  nomeTurma: string;
}

export class EmailAlunoService {
  /**
   * Enviar email de boas-vindas para novo aluno
   */
  static async enviarEmailNovoAluno(dados: DadosEmailNovoAluno): Promise<void> {
    try {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background-color: #4CAF50; color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px 20px; line-height: 1.6; color: #333; }
    .credentials { background-color: #f9f9f9; border-left: 4px solid #4CAF50; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .credentials h3 { margin-top: 0; color: #4CAF50; }
    .credentials p { margin: 10px 0; font-size: 16px; }
    .credentials strong { color: #333; }
    .button { display: inline-block; padding: 14px 28px; background-color: #4CAF50; color: white !important; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
    .button:hover { background-color: #45a049; }
    .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .warning p { margin: 0; color: #856404; }
    .footer { background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 Bem-vindo ao Ecossistema Escolar</h1>
    </div>
    <div class="content">
      <h2>Olá, ${dados.nomeAluno}!</h2>
      
      <p>Sua conta de aluno foi criada com sucesso na escola <strong>${dados.nomeEscola}</strong>.</p>
      
      <p>Agora você pode acessar o sistema para visualizar suas tarefas, provas, notas e muito mais!</p>
      
      <div class="credentials">
        <h3>📋 Suas credenciais de acesso:</h3>
        <p><strong>CPF:</strong> ${dados.cpf}</p>
        <p><strong>Senha temporária:</strong> ${dados.senhaTemporaria}</p>
      </div>
      
      <div class="warning">
        <p>⚠️ <strong>Importante:</strong> Por segurança, altere sua senha no primeiro acesso através do menu "Meu Perfil".</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${dados.linkLogin}" class="button">Fazer Login Agora</a>
      </div>
      
      <p style="margin-top: 30px;">Se você tiver dúvidas ou problemas para acessar, entre em contato com a secretaria da escola.</p>
    </div>
    <div class="footer">
      <p>Este é um email automático, por favor não responda.</p>
      <p>© ${new Date().getFullYear()} Ecossistema Escolar - Todos os direitos reservados</p>
    </div>
  </div>
</body>
</html>
      `;

      await resend.emails.send({
        from: 'Ecossistema Escolar <noreply@ecossistemaescolar.com>',
        to: dados.para,
        subject: 'Bem-vindo ao Ecossistema Escolar - Suas credenciais de acesso',
        html
      });

      console.log(`✅ Email enviado para ${dados.para}`);
    } catch (erro: any) {
      console.error(`❌ Erro ao enviar email para ${dados.para}:`, erro.message);
      // Não lançar erro - continuar processo mesmo se email falhar
    }
  }

  /**
   * Enviar email para aluno já existente (nova matrícula)
   */
  static async enviarEmailAlunoExistente(dados: DadosEmailAlunoExistente): Promise<void> {
    try {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background-color: #2196F3; color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px 20px; line-height: 1.6; color: #333; }
    .info-box { background-color: #e3f2fd; border-left: 4px solid #2196F3; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .info-box h3 { margin-top: 0; color: #2196F3; }
    .button { display: inline-block; padding: 14px 28px; background-color: #2196F3; color: white !important; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
    .button:hover { background-color: #1976D2; }
    .footer { background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 Nova Turma - Ecossistema Escolar</h1>
    </div>
    <div class="content">
      <h2>Olá, ${dados.nomeAluno}!</h2>
      
      <p>Você foi matriculado em uma nova turma na escola <strong>${dados.nomeEscola}</strong>.</p>
      
      <div class="info-box">
        <h3>📚 Informações da matrícula:</h3>
        <p><strong>Turma:</strong> ${dados.nomeTurma}</p>
        <p><strong>Escola:</strong> ${dados.nomeEscola}</p>
      </div>
      
      <p>Use suas credenciais existentes para fazer login e acessar as informações da nova turma.</p>
      
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">Acessar Sistema</a>
      </div>
    </div>
    <div class="footer">
      <p>Este é um email automático, por favor não responda.</p>
      <p>© ${new Date().getFullYear()} Ecossistema Escolar - Todos os direitos reservados</p>
    </div>
  </div>
</body>
</html>
      `;

      await resend.emails.send({
        from: 'Ecossistema Escolar <noreply@ecossistemaescolar.com>',
        to: dados.para,
        subject: 'Nova matrícula - Ecossistema Escolar',
        html
      });

      console.log(`✅ Email enviado para ${dados.para}`);
    } catch (erro: any) {
      console.error(`❌ Erro ao enviar email para ${dados.para}:`, erro.message);
    }
  }

  /**
   * Enviar múltiplos emails em lote (com delay para evitar rate limiting)
   */
  static async enviarEmailsEmLote(
    emails: Array<{ tipo: 'novo' | 'existente'; dados: DadosEmailNovoAluno | DadosEmailAlunoExistente }>
  ): Promise<void> {
    console.log(`📧 Enviando ${emails.length} emails...`);

    for (const email of emails) {
      if (email.tipo === 'novo') {
        await this.enviarEmailNovoAluno(email.dados as DadosEmailNovoAluno);
      } else {
        await this.enviarEmailAlunoExistente(email.dados as DadosEmailAlunoExistente);
      }

      // Delay de 200ms entre emails para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`✅ Processamento de emails concluído`);
  }
}
