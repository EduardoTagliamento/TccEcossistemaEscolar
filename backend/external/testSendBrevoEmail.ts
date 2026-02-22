/**
 * 🧪 Script de Teste - SendBrevoEmailService
 * 
 * Este script testa o envio de e-mails via Brevo.
 * 
 * Como usar:
 * 1. Certifique-se de que BREVO_API_KEY está configurada no .env
 * 2. Execute: npm run dev testSendBrevoEmail.ts
 *    ou: tsx backend/external/testSendBrevoEmail.ts
 */

import 'dotenv/config';
import { SendBrevoEmailService } from './SendBrevoEmailService.js';

async function testEmailService() {
  console.log('🧪 Iniciando testes do SendBrevoEmailService...\n');

  try {
    const emailService = SendBrevoEmailService.getInstance();
    
    // 📧 Teste 1: E-mail simples
    console.log('📧 Teste 1: Enviando e-mail simples...');
    const result1 = await emailService.sendEmail({
      to: 'ti.eduardotagliamento@gmail.com', // Substitua pelo seu e-mail de teste
      subject: '🧪 Teste - E-mail Simples',
      htmlContent: '<h1>Teste de E-mail</h1><p>Este é um e-mail de teste do Ecossistema Escolar.</p>'
    });
    console.log('✅ E-mail enviado! MessageId:', result1.messageId);
    console.log('');

    // 📧 Teste 2: E-mail de boas-vindas
    console.log('📧 Teste 2: Enviando e-mail de boas-vindas...');
    const result2 = await emailService.sendWelcomeEmail(
      'ti.eduardotagliamento@gmail.com', // Substitua pelo seu e-mail de teste
      'Eduardo Tagliamento'
    );
    console.log('✅ E-mail de boas-vindas enviado! MessageId:', result2.messageId);
    console.log('');

    // 📧 Teste 3: E-mail de recuperação de senha
    console.log('📧 Teste 3: Enviando e-mail de recuperação de senha...');
    const result3 = await emailService.sendPasswordResetEmail(
      'ti.eduardotagliamento@gmail.com', // Substitua pelo seu e-mail de teste
      'Eduardo Tagliamento',
      'token-exemplo-abc123def456' // Token de exemplo
    );
    console.log('✅ E-mail de recuperação enviado! MessageId:', result3.messageId);
    console.log('');

    // 📧 Teste 4: E-mail de notificação de atividade
    console.log('📧 Teste 4: Enviando notificação de atividade...');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Vencimento em 7 dias
    
    const result4 = await emailService.sendActivityNotification(
      'ti.eduardotagliamento@gmail.com', // Substitua pelo seu e-mail de teste
      'Eduardo Tagliamento',
      'Trabalho de Matemática - Funções Quadráticas',
      dueDate
    );
    console.log('✅ Notificação de atividade enviada! MessageId:', result4.messageId);
    console.log('');

    console.log('✅ Todos os testes concluídos com sucesso! 🎉');
    
  } catch (error: any) {
    console.error('❌ Erro durante os testes:', error.message);
    
    if (!process.env.BREVO_API_KEY) {
      console.error('\n💡 Dica: Adicione sua chave de API no arquivo .env:');
      console.error('   BREVO_API_KEY=xkey...\n');
      console.error('   Obtenha sua chave em: https://app.brevo.com/settings/keys/api');
    }
    
    process.exit(1);
  }
}

// Executa os testes
testEmailService();
