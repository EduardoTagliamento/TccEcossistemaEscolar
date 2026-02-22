# 🔐 Guia de Gerenciamento de Chaves de API

## 📋 Visão Geral

Este guia explica como gerenciar chaves de API e segredos de forma segura no projeto Ecossistema Escolar.

## 🎯 Arquivos Importantes

### 1. `.env` (NUNCA COMMITAR!)
- **Propósito:** Contém suas chaves de API REAIS
- **Segurança:** Está no `.gitignore` - NÃO vai para o GitHub
- **Uso:** Desenvolvimento local e produção

### 2. `.env.example` (COMMITAR!)
- **Propósito:** Template com exemplos de variáveis necessárias
- **Segurança:** Não contém valores reais, apenas placeholders
- **Uso:** Documentação e onboarding de novos desenvolvedores

### 3. `.gitignore`
- **Propósito:** Lista arquivos que o Git deve ignorar
- **Conteúdo:** `.env` está listado aqui

## 🚀 Setup Inicial

### 1. Criar seu arquivo `.env` local
```bash
# Copiar o template
cp .env.example .env

# Ou no Windows PowerShell
Copy-Item .env.example .env
```

### 2. Adicionar suas chaves reais no `.env`
Edite o arquivo `.env` e substitua os valores de exemplo:

```env
# ❌ ERRADO (não use valores de exemplo)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ✅ CORRETO (use sua chave real)
OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234
```

## 🔑 Como Usar as Chaves no Código

### Acessando Variáveis de Ambiente

```typescript
// ✅ CORRETO - Acessar via process.env
const openaiKey = process.env.OPENAI_API_KEY;
const googleKey = process.env.GOOGLE_API_KEY;

// Exemplo completo com validação
import dotenv from 'dotenv';

dotenv.config();

class OpenAIService {
  #apiKey: string;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    
    if (!key) {
      throw new Error('OPENAI_API_KEY não configurada no .env');
    }
    
    this.#apiKey = key;
  }

  async generateText(prompt: string) {
    // Usar this.#apiKey nas requisições
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.#apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    return response.json();
  }
}
```

## 📁 Estrutura Sugerida para Serviços Externos

```
backend/
├── external/
│   ├── openai/
│   │   ├── OpenAIService.ts
│   │   └── types.ts
│   ├── google/
│   │   ├── GoogleClassroomService.ts
│   │   └── types.ts
│   ├── resend/
│   │   ├── ResendEmailService.ts
│   │   └── templates.ts
│   └── aws/
│       ├── S3Service.ts
│       └── types.ts
```

### Exemplo de Serviço Externo

```typescript
// backend/external/openai/OpenAIService.ts
import ErrorResponse from '../../utils/ErrorResponse.js';

export default class OpenAIService {
  #apiKey: string;
  #baseUrl: string;

  constructor() {
    console.log("⬆️  OpenAIService.constructor()");
    
    // Validar variáveis obrigatórias
    if (!process.env.OPENAI_API_KEY) {
      throw new ErrorResponse(
        500,
        'Configuração inválida',
        { message: 'OPENAI_API_KEY não está configurada no .env' }
      );
    }

    this.#apiKey = process.env.OPENAI_API_KEY;
    this.#baseUrl = 'https://api.openai.com/v1';
  }

  async createChatCompletion(messages: any[]) {
    console.log("🟣 OpenAIService.createChatCompletion()");
    
    try {
      const response = await fetch(`${this.#baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.#apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4',
          messages,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new ErrorResponse(
          response.status,
          'Erro na API da OpenAI',
          error
        );
      }

      return response.json();
    } catch (error: any) {
      console.error("🔴 Erro ao chamar OpenAI:", error);
      throw error;
    }
  }
}
```

## 🛡️ Boas Práticas de Segurança

### ✅ FAÇA

1. **Sempre use `.env` para chaves sensíveis**
   ```typescript
   const apiKey = process.env.OPENAI_API_KEY;
   ```

2. **Valide variáveis obrigatórias na inicialização**
   ```typescript
   if (!process.env.REQUIRED_KEY) {
     throw new Error('REQUIRED_KEY não configurada');
   }
   ```

3. **Use valores padrão quando apropriado**
   ```typescript
   const maxFileSize = process.env.MAX_FILE_SIZE || '10mb';
   ```

4. **Documente todas as variáveis no `.env.example`**

5. **Rotacione chaves regularmente**

6. **Use chaves diferentes para dev/staging/production**

### ❌ NÃO FAÇA

1. **NUNCA hardcode chaves no código**
   ```typescript
   // ❌ ERRADO
   const apiKey = 'sk-proj-abc123def456...';
   ```

2. **NUNCA commite o `.env`**
   ```bash
   # Verificar se .env está sendo ignorado
   git status  # .env NÃO deve aparecer
   ```

3. **NUNCA compartilhe chaves em chat/email**
   - Use ferramentas como 1Password, LastPass, ou AWS Secrets Manager

4. **NUNCA exponha chaves no frontend**
   ```typescript
   // ❌ ERRADO - chave exposta no HTML
   <script>
     const apiKey = '${process.env.GOOGLE_API_KEY}';
   </script>
   ```

5. **NUNCA logue chaves nos console.log**
   ```typescript
   // ❌ ERRADO
   console.log('API Key:', process.env.SECRET_KEY);
   
   // ✅ CORRETO
   console.log('API Key configurada:', !!process.env.SECRET_KEY);
   ```

## 🔄 Fluxo de Trabalho em Equipe

### Para Novos Desenvolvedores

1. Clone o repositório
2. Copie `.env.example` para `.env`
3. Peça ao líder do projeto as chaves de desenvolvimento
4. Configure seu `.env` local
5. Nunca commite o `.env`

### Para Líder do Projeto

1. Mantenha `.env.example` atualizado
2. Forneça chaves de desenvolvimento via canal seguro (1Password, etc.)
3. Use chaves diferentes para cada ambiente
4. Documente quais chaves são obrigatórias

## 🌍 Ambientes (Dev, Staging, Prod)

### Desenvolvimento (.env)
```env
NODE_ENV=development
OPENAI_API_KEY=sk-proj-dev-xxxxxxxx  # Chave de teste
```

### Staging (.env.staging)
```env
NODE_ENV=staging
OPENAI_API_KEY=sk-proj-staging-xxxxxxxx
```

### Produção (.env.production)
```env
NODE_ENV=production
OPENAI_API_KEY=sk-proj-prod-xxxxxxxx  # Chave com limites mais altos
```

## 📊 Validação de Variáveis

Crie um validador em `backend/utils/validateEnv.ts`:

```typescript
export function validateEnvironment() {
  const required = [
    'DB_HOST',
    'DB_USER',
    'DB_NAME',
  ];

  const optional = [
    'OPENAI_API_KEY',
    'GOOGLE_API_KEY',
    'RESEND_API_KEY'
  ];

  const missing: string[] = [];

  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    console.error('❌ Variáveis obrigatórias não configuradas:');
    missing.forEach(v => console.error(`   - ${v}`));
    throw new Error('Configuração incompleta');
  }

  // Avisar sobre opcionais não configuradas
  const missingOptional = optional.filter(v => !process.env[v]);
  if (missingOptional.length > 0) {
    console.warn('⚠️  Variáveis opcionais não configuradas:');
    missingOptional.forEach(v => console.warn(`   - ${v}`));
  }
}
```

Use no `app.ts`:
```typescript
import { validateEnvironment } from './backend/utils/validateEnv';

validateEnvironment();
```

## 🚨 O que Fazer se Expor uma Chave

1. **Revogue IMEDIATAMENTE** a chave exposta
2. Gere uma nova chave
3. Atualize o `.env` local e em produção
4. Se foi commitado:
   ```bash
   # Remover do histórico do Git (cuidado!)
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```
5. Notifique a equipe

## 📚 Recursos Úteis

- [dotenv Documentation](https://www.npmjs.com/package/dotenv)
- [12 Factor App - Config](https://12factor.net/config)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_CheatSheet.html)

## 🆘 Precisa de Ajuda?

- Consulte a documentação oficial de cada serviço
- Verifique se o `.env` está no `.gitignore`
- Use `git status` para confirmar que `.env` não aparece
- Em produção, considere usar AWS Secrets Manager ou Azure Key Vault

---

**Lembre-se:** Segurança é responsabilidade de todos! 🔐
