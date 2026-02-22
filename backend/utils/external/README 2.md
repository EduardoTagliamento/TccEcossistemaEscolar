# 🔐 EXEMPLO: Serviço OpenAI

Este é um exemplo de como usar chaves de API armazenadas no `.env`

## 1. Adicione a chave no .env

```env
# .env (NUNCA COMMITAR!)
OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678
```

## 2. Adicione o exemplo no .env.example

```env
# .env.example (COMMITAR!)
# OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 3. Crie o serviço

Veja o arquivo: `backend/utils/external/OpenAIService.example.ts`

## 4. Use no seu código

```typescript
import OpenAIService from './backend/utils/external/OpenAIService';

// Em um Service
class EstudoService {
  #openaiService: OpenAIService;

  constructor() {
    this.#openaiService = new OpenAIService();
  }

  async gerarPlanodeEstudos(aluno: Aluno) {
    const prompt = `Crie um plano de estudos para ${aluno.nome}...`;
    const resposta = await this.#openaiService.generateText(prompt);
    return resposta;
  }
}
```

## 5. Segurança

✅ **Chave fica no servidor** - Nunca exposta ao frontend  
✅ **Logs não mostram a chave** - Apenas se está configurada  
✅ **Git ignora o .env** - Nunca vai para o repositório  
✅ **Validação na inicialização** - Falha rápido se chave faltando
