# 🔌 Serviços Externos - Ecossistema Escolar

Este diretório contém implementações de serviços de terceiros utilizados pelo projeto.

## 📋 Serviços Implementados

### 📧 ResendEmailService
**Arquivo:** `ResendEmailService.ts`

Serviço de envio de e-mails transacionais via [Resend](https://resend.com/).

**Recursos:**
- ✅ E-mail simples (personalizado)
- ✅ E-mail de boas-vindas
- ✅ E-mail de recuperação de senha
- ✅ Notificação de atividade atribuída

**Configuração:**
```env
RESEND_API_KEY=re_... # Obtenha em: https://resend.com/api-keys
EMAIL_FROM=onboarding@resend.dev
TEST_EMAIL_TO=bauaecossistemaescolar@gmail.com
FRONTEND_URL=http://localhost:3000
```

**Uso:**
```typescript
import ResendEmailService from './backend/external/ResendEmailService.js';

const emailService = ResendEmailService.getInstance();

// E-mail simples
await emailService.sendEmail({
  to: 'aluno@escola.com',
  subject: 'Bem-vindo!',
  html: '<h1>Olá!</h1>'
});

// E-mail de boas-vindas
await emailService.sendWelcomeEmail('aluno@escola.com', 'João Silva');

// Recuperação de senha
await emailService.sendPasswordResetEmail('aluno@escola.com', 'João Silva', 'token123');

// Notificação de atividade
await emailService.sendActivityNotification(
  'aluno@escola.com',
  'João Silva',
  'Trabalho de Matemática',
  new Date('2026-02-25')
);
```

**Testes:**
```bash
# Teste completo do serviço (usa ResendEmailService)
npx tsx backend/external/testResendEmail.ts

# Teste simples da API (usa SDK direto)
npx tsx backend/utils/external/testResendEmail.ts
```

---

### 🤖 OpenAIService (Exemplo)
**Arquivo:** `OpenAIService.example.ts`

Exemplo de integração com OpenAI para recursos de IA.

**Configuração:**
```env
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-... # Opcional
```

---

## 🔐 Segurança

**IMPORTANTE:**
- ✅ Todas as chaves de API devem estar no `.env` (nunca no código)
- ✅ O `.env` está no `.gitignore` (nunca será commitado)
- ✅ Use `.env.example` como template para configuração
- ✅ Chaves são validadas no construtor de cada serviço
- ✅ Logs mascaram dados sensíveis (`sk-abc...xyz` ao invés de chave completa)

## 📚 Padrões de Implementação

Ao criar novos serviços externos, siga este padrão:

```typescript
export class MinhaAPIService {
  readonly #apiKey: string;
  private static instance: MinhaAPIService;

  private constructor() {
    // Validação da chave
    this.#apiKey = process.env.MINHA_API_KEY || '';
    if (!this.#apiKey) {
      throw new Error('MINHA_API_KEY is required');
    }
    
    // Log seguro
    const masked = this.#apiKey.substring(0, 8) + '...';
    console.log(`✅ [MinhaAPIService] Inicializado: ${masked}`);
  }

  public static getInstance(): MinhaAPIService {
    if (!MinhaAPIService.instance) {
      MinhaAPIService.instance = new MinhaAPIService();
    }
    return MinhaAPIService.instance;
  }

  // Métodos públicos aqui...
}

export default MinhaAPIService.getInstance();
```

## 📖 Documentação Adicional

Consulte [../docs/API_KEYS_GUIDE.md](../../docs/API_KEYS_GUIDE.md) para guia completo sobre gerenciamento de chaves de API.

## 🧪 Scripts de Teste

Cada serviço deve ter um script de teste correspondente:

```bash
# Teste de e-mail (completo)
npx tsx backend/external/testResendEmail.ts

# Teste de e-mail (simples - API direta)
npx tsx backend/utils/external/testResendEmail.ts

# Teste de OpenAI (quando implementado)
npx tsx backend/external/testOpenAI.ts
```

---

**Última atualização:** Fevereiro 2026
