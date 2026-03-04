/**
 * 🧪 Script de Teste Completo - ResendEmailService
 * 
 * Este script testa todos os métodos do ResendEmailService.
 * 
 * Como usar:
 * 1. Configure RESEND_API_KEY no .env
 * 2. Execute: npx tsx backend/external/testResendEmail.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { ResendEmailService } from './ResendEmailService.js';

// Carrega variáveis do .env na raiz do projeto
config({ path: resolve(process.cwd(), '.env') });

// Função auxiliar para aguardar (evitar rate limit)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testEmailService() {
  console.log('🧪 Iniciando testes completos do ResendEmailService...\n');

  try {
    const emailService = ResendEmailService.getInstance();
    const testEmail = "ti.eduardotagliamento@gmail.com";

    if (!testEmail) {
      console.error('❌ TEST_EMAIL_TO não configurada no .env');
      process.exit(1);
    }
    
    // 📧 Teste 1: E-mail simples
    console.log('📧 Teste 1: Enviando e-mail simples...');
    const result1 = await emailService.sendEmail({
      to: testEmail,
      subject: '🧪 Teste - E-mail Simples',
      html: '<h1>Teste de E-mail</h1><p>Este é um e-mail de teste do Ecossistema Escolar via Resend.</p>'
    });
    console.log('✅ E-mail enviado! ID:', result1.id);
    console.log('');

    // Aguarda 1 segundo para evitar rate limit (2 req/s no plano gratuito)
    await sleep(1000);

    // 📧 Teste 2: E-mail de boas-vindas
    console.log('📧 Teste 2: Enviando e-mail de boas-vindas...');
    const result2 = await emailService.sendWelcomeEmail(
      testEmail,
      'Eduardo Tagliamento'
    );
    console.log('✅ E-mail de boas-vindas enviado! ID:', result2.id);
    console.log('');

    // Aguarda 1 segundo para evitar rate limit
    await sleep(1000);

    // 📧 Teste 3: E-mail de recuperação de senha
    console.log('📧 Teste 3: Enviando e-mail de recuperação de senha...');
    const result3 = await emailService.sendPasswordResetEmail(
      testEmail,
      'Eduardo Tagliamento',
      'token-exemplo-abc123def456'
    );
    console.log('✅ E-mail de recuperação enviado! ID:', result3.id);
    console.log('');

    // Aguarda 1 segundo para evitar rate limit
    await sleep(1000);

    // 📧 Teste 4: E-mail de notificação de atividade
    console.log('📧 Teste 4: Enviando notificação de atividade...');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Vencimento em 7 dias
    
    const result4 = await emailService.sendActivityNotification(
      testEmail,
      'Eduardo Tagliamento',
      'Trabalho de Matemática - Funções Quadráticas',
      dueDate
    );
    console.log('✅ Notificação de atividade enviada! ID:', result4.id);
    console.log('');

    console.log('✅ Todos os testes concluídos com sucesso! 🎉');
    
  } catch (error: any) {
    console.error('❌ Erro durante os testes:', error.message);
    
    if (!process.env.RESEND_API_KEY) {
      console.error('\n💡 Dica: Adicione sua chave de API no arquivo .env:');
      console.error('   RESEND_API_KEY=re_...\n');
      console.error('   Obtenha sua chave em: https://resend.com/api-keys');
    }
    
    process.exit(1);
  }
}

// Executa os testes
testEmailService();
