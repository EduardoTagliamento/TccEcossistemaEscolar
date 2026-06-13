/**
 * Helper: Envio de Emails
 * Descrição: Funções para enviar emails usando Resend
 * Uso: Notificações de novos usuários e credenciais de acesso
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@baua.com.br';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.baua.com.br';

export interface DadosEmailNovoUsuario {
  destinatario: string;
  nomeUsuario: string;
  nomeEscola: string;
  email: string;
  senha: string;
  funcao: string; // 'Aluno', 'Professor', etc
}

export interface DadosEmailUsuarioExistente {
  destinatario: string;
  nomeUsuario: string;
  nomeEscola: string;
  funcao: string;
}

/**
 * Envia email para novo usuário com credenciais de acesso
 */
export async function enviarEmailNovoUsuario(dados: DadosEmailNovoUsuario): Promise<boolean> {
  try {
    const htmlContent = gerarHtmlNovoUsuario(dados);

    await resend.emails.send({
      from: EMAIL_FROM,
      to: dados.destinatario,
      subject: `Bem-vindo(a) ao ${dados.nomeEscola} - Credenciais de Acesso`,
      html: htmlContent
    });

    console.log(`✅ Email enviado para novo usuário: ${dados.destinatario}`);
    return true;
  } catch (erro) {
    console.error('❌ Erro ao enviar email para novo usuário:', erro);
    return false;
  }
}

/**
 * Envia email para usuário já existente notificando nova vinculação
 */
export async function enviarEmailUsuarioExistente(dados: DadosEmailUsuarioExistente): Promise<boolean> {
  try {
    const htmlContent = gerarHtmlUsuarioExistente(dados);

    await resend.emails.send({
      from: EMAIL_FROM,
      to: dados.destinatario,
      subject: `${dados.nomeEscola} - Nova Vinculação`,
      html: htmlContent
    });

    console.log(`✅ Email enviado para usuário existente: ${dados.destinatario}`);
    return true;
  } catch (erro) {
    console.error('❌ Erro ao enviar email para usuário existente:', erro);
    return false;
  }
}

/**
 * Envia email genérico (utilitário)
 */
export async function enviarEmail(
  destinatario: string,
  assunto: string,
  htmlContent: string
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: destinatario,
      subject: assunto,
      html: htmlContent
    });

    console.log(`✅ Email enviado: ${destinatario}`);
    return true;
  } catch (erro) {
    console.error('❌ Erro ao enviar email:', erro);
    return false;
  }
}

// ============================================================
// Templates HTML
// ============================================================

function gerarHtmlNovoUsuario(dados: DadosEmailNovoUsuario): string {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bem-vindo(a)</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f4f6f9;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px;
        }
        .credentials {
          background: #f0f8ff;
          border-left: 4px solid #007bff;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .credentials p {
          margin: 10px 0;
          font-size: 16px;
        }
        .credentials strong {
          color: #007bff;
        }
        .button {
          display: inline-block;
          background: #007bff;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 8px;
          margin-top: 20px;
          font-weight: 600;
        }
        .button:hover {
          background: #0056b3;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        .warning {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin-top: 20px;
          border-radius: 8px;
          font-size: 14px;
          color: #856404;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 Bem-vindo(a) ao ${dados.nomeEscola}!</h1>
        </div>
        
        <div class="content">
          <p>Olá, <strong>${dados.nomeUsuario}</strong>!</p>
          
          <p>
            Você foi cadastrado(a) como <strong>${dados.funcao}</strong> no sistema 
            <strong>${dados.nomeEscola}</strong>.
          </p>
          
          <p>Suas credenciais de acesso foram geradas automaticamente:</p>
          
          <div class="credentials">
            <p><strong>📧 Email:</strong> ${dados.email}</p>
            <p><strong>🔑 Senha:</strong> ${dados.senha}</p>
          </div>
          
          <div class="warning">
            <strong>⚠️ Importante:</strong> Recomendamos que você altere sua senha 
            no primeiro acesso para garantir a segurança da sua conta.
          </div>
          
          <center>
            <a href="${FRONTEND_URL}/login" class="button">
              🚀 Acessar o Sistema
            </a>
          </center>
        </div>
        
        <div class="footer">
          <p>Este é um email automático. Por favor, não responda.</p>
          <p>&copy; ${new Date().getFullYear()} ${dados.nomeEscola}. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function gerarHtmlUsuarioExistente(dados: DadosEmailUsuarioExistente): string {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nova Vinculação</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f4f6f9;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px;
        }
        .info-box {
          background: #e8f5e9;
          border-left: 4px solid #28a745;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .button {
          display: inline-block;
          background: #28a745;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 8px;
          margin-top: 20px;
          font-weight: 600;
        }
        .button:hover {
          background: #1e7e34;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Nova Vinculação Realizada</h1>
        </div>
        
        <div class="content">
          <p>Olá, <strong>${dados.nomeUsuario}</strong>!</p>
          
          <p>
            Você foi vinculado(a) como <strong>${dados.funcao}</strong> na escola 
            <strong>${dados.nomeEscola}</strong>.
          </p>
          
          <div class="info-box">
            <p><strong>✨ Novidade:</strong></p>
            <p>
              Agora você tem acesso aos recursos e conteúdos desta escola. 
              Utilize suas credenciais de acesso habituais para entrar no sistema.
            </p>
          </div>
          
          <center>
            <a href="${FRONTEND_URL}/login" class="button">
              🚀 Acessar o Sistema
            </a>
          </center>
        </div>
        
        <div class="footer">
          <p>Este é um email automático. Por favor, não responda.</p>
          <p>&copy; ${new Date().getFullYear()} ${dados.nomeEscola}. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
