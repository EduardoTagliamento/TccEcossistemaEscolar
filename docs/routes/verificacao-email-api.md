# 📧 API de Verificação de Email

**Versão:** 1.0.0  
**Base URL:** `/api/verificacao-email`  
**Autenticação:** Não requerida (usuário já autenticado no frontend)

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Endpoints](#endpoints)
- [Modelos de Dados](#modelos-de-dados)
- [Exemplos de Uso](#exemplos-de-uso)
- [Códigos de Erro](#códigos-de-erro)
- [Regras de Negócio](#regras-de-negócio)

---

## 🎯 Visão Geral

Esta API gerencia o processo de verificação de email dos usuários através do envio de códigos numéricos de 6 dígitos.

### **Características:**
- ✅ Código numérico de 6 dígitos (100000 - 999999)
- ✅ Expiração em 15 minutos
- ✅ Uso único por código
- ✅ Anti-spam: máximo 3 tentativas por hora
- ✅ Email mascarado nas respostas (privacidade)
- ✅ Templates HTML profissionais

---

## 🔌 Endpoints

### **1. Solicitar Código de Verificação**

Gera um código de 6 dígitos e envia por email para o usuário.

```http
POST /api/verificacao-email/solicitar/:UsuarioCPF
```

#### **Parâmetros de URL:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `UsuarioCPF` | string | Sim | CPF do usuário no formato XXX.XXX.XXX-XX |

#### **Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Código de verificação enviado para j***o@email.com",
  "data": null
}
```

#### **Regras:**
- Usuário deve existir no sistema
- Usuário deve ter email cadastrado
- Email não pode já estar verificado
- Máximo 3 tentativas por hora
- Códigos antigos são invalidados ao gerar novo

#### **Erros Possíveis:**
- `400` - Email já verificado
- `404` - Usuário não encontrado
- `429` - Muitas tentativas (excedeu 3 por hora)
- `500` - Erro ao enviar email

---

### **2. Validar Código de Verificação**

Valida o código enviado e marca o email do usuário como verificado.

```http
POST /api/verificacao-email/validar
```

#### **Body da Requisição:**
```json
{
  "verificacao": {
    "UsuarioCPF": "123.456.789-00",
    "VerificacaoCodigo": "123456"
  }
}
```

#### **Campos do Body:**
| Campo | Tipo | Obrigatório | Validação | Descrição |
|-------|------|-------------|-----------|-----------|
| `UsuarioCPF` | string | Sim | Formato XXX.XXX.XXX-XX | CPF do usuário |
| `VerificacaoCodigo` | string | Sim | Exatamente 6 dígitos numéricos | Código recebido por email |

#### **Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Email verificado com sucesso! ✅",
  "data": null
}
```

#### **Regras:**
- Código deve ser válido (não expirado, não usado)
- Correspondência exata entre CPF e código
- Código é marcado como usado após validação
- Campo `UsuarioEmailVerificado` é atualizado para TRUE

#### **Erros Possíveis:**
- `400` - Código inválido, expirado ou já usado
- `400` - Formato de CPF ou código inválido
- `404` - Usuário não encontrado

---

### **3. Reenviar Código de Verificação**

Reenvia um novo código de verificação (mesma lógica de solicitar).

```http
POST /api/verificacao-email/reenviar/:UsuarioCPF
```

#### **Parâmetros de URL:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `UsuarioCPF` | string | Sim | CPF do usuário no formato XXX.XXX.XXX-XX |

#### **Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Código de verificação enviado para j***o@email.com",
  "data": null
}
```

#### **Regras:**
- Mesmas regras do endpoint de solicitar
- Sujeito ao limite de 3 tentativas por hora
- Códigos antigos são invalidados

#### **Erros Possíveis:**
- `400` - Email já verificado
- `404` - Usuário não encontrado
- `429` - Muitas tentativas (excedeu 3 por hora)
- `500` - Erro ao enviar email

---

## 📦 Modelos de Dados

### **VerificacaoEmail (Entity)**

```typescript
{
  VerificacaoId: number | null;           // Auto increment
  UsuarioCPF: string;                     // "123.456.789-00"
  VerificacaoCodigo: string;              // "123456" (6 dígitos)
  VerificacaoExpiresAt: Date;             // 15 minutos após criação
  VerificacaoUsado: boolean;              // false por padrão
  VerificacaoCreatedAt: Date | null;      // CURRENT_TIMESTAMP
}
```

### **Validações:**
- **CPF:** Formato XXX.XXX.XXX-XX (14 caracteres)
- **Código:** Exatamente 6 dígitos numéricos (regex `/^\d{6}$/`)
- **ExpiresAt:** Deve ser data futura
- **VerificacaoUsado:** Boolean

---

## 💡 Exemplos de Uso

### **Exemplo 1: Solicitar Código**

**Requisição:**
```bash
curl -X POST http://localhost:3000/api/verificacao-email/solicitar/123.456.789-00 \
  -H "Content-Type: application/json"
```

**Resposta:**
```json
{
  "success": true,
  "message": "Código de verificação enviado para j***o@example.com",
  "data": null
}
```

**Email Recebido:**
```
Assunto: 🔐 Verificação de Email - Ecossistema Escolar

Olá, João Silva! 👋

Você solicitou a verificação do seu email. Use o código abaixo para confirmar:

┌─────────────────────────────────┐
│  SEU CÓDIGO DE VERIFICAÇÃO      │
│                                 │
│         1 2 3 4 5 6             │
└─────────────────────────────────┘

⏱️ Este código expira em 15 minutos.

Não compartilhe este código com ninguém. Se você não solicitou esta 
verificação, ignore este email.
```

---

### **Exemplo 2: Validar Código**

**Requisição:**
```bash
curl -X POST http://localhost:3000/api/verificacao-email/validar \
  -H "Content-Type: application/json" \
  -d '{
    "verificacao": {
      "UsuarioCPF": "123.456.789-00",
      "VerificacaoCodigo": "123456"
    }
  }'
```

**Resposta (Sucesso):**
```json
{
  "success": true,
  "message": "Email verificado com sucesso! ✅",
  "data": null
}
```

**Resposta (Código Inválido):**
```json
{
  "success": false,
  "message": "Código inválido",
  "error": {
    "message": "O código informado é inválido, já foi usado ou expirou."
  }
}
```

---

### **Exemplo 3: Reenviar Código**

**Requisição:**
```bash
curl -X POST http://localhost:3000/api/verificacao-email/reenviar/123.456.789-00 \
  -H "Content-Type: application/json"
```

**Resposta:**
```json
{
  "success": true,
  "message": "Código de verificação enviado para j***o@example.com",
  "data": null
}
```

---

### **Exemplo 4: Erro - Anti-Spam**

**Requisição (4ª tentativa em 1 hora):**
```bash
curl -X POST http://localhost:3000/api/verificacao-email/solicitar/123.456.789-00
```

**Resposta (429 Too Many Requests):**
```json
{
  "success": false,
  "message": "Muitas tentativas",
  "error": {
    "message": "Você excedeu o limite de 3 solicitações por hora. Tente novamente mais tarde."
  }
}
```

---

### **Exemplo 5: Erro - Código Expirado**

**Requisição (após 15 minutos):**
```bash
curl -X POST http://localhost:3000/api/verificacao-email/validar \
  -H "Content-Type: application/json" \
  -d '{
    "verificacao": {
      "UsuarioCPF": "123.456.789-00",
      "VerificacaoCodigo": "123456"
    }
  }'
```

**Resposta (400 Bad Request):**
```json
{
  "success": false,
  "message": "Código inválido",
  "error": {
    "message": "O código informado é inválido, já foi usado ou expirou."
  }
}
```

---

## ⚠️ Códigos de Erro

### **400 - Bad Request**

**Causas:**
- Formato de CPF inválido (não segue XXX.XXX.XXX-XX)
- Código não tem exatamente 6 dígitos numéricos
- Email já está verificado
- Código inválido, expirado ou já usado
- Campo obrigatório ausente

**Exemplo:**
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "error": {
    "message": "O código deve ter exatamente 6 dígitos."
  }
}
```

---

### **404 - Not Found**

**Causas:**
- Usuário com CPF informado não existe
- Usuário não tem email cadastrado

**Exemplo:**
```json
{
  "success": false,
  "message": "Usuário não encontrado",
  "error": {
    "message": "Não existe usuário com CPF 123.456.789-00"
  }
}
```

---

### **429 - Too Many Requests**

**Causa:**
- Excedeu limite de 3 solicitações por hora

**Exemplo:**
```json
{
  "success": false,
  "message": "Muitas tentativas",
  "error": {
    "message": "Você excedeu o limite de 3 solicitações por hora. Tente novamente mais tarde."
  }
}
```

---

### **500 - Internal Server Error**

**Causas:**
- Erro ao enviar email via Resend
- Erro de conexão com banco de dados
- Erro inesperado no servidor

**Exemplo:**
```json
{
  "success": false,
  "message": "Erro ao enviar email",
  "error": {
    "message": "Não foi possível enviar o código de verificação. Tente novamente mais tarde."
  }
}
```

---

## 📏 Regras de Negócio

### **1. Geração de Código**
- Código aleatório de 6 dígitos numéricos (100000 - 999999)
- Gerado via `Math.random()`
- Expira em 15 minutos (TIMESTAMP)
- Uso único (flag `VerificacaoUsado`)

### **2. Anti-Spam**
- Máximo 3 solicitações por CPF em 1 hora
- Contador baseado em `VerificacaoCreatedAt`
- Retorna erro 429 ao exceder limite
- Não conta códigos já usados

### **3. Validação de Código**
- Busca código válido: não expirado + não usado + correspondência CPF
- Ordem: VerificacaoCreatedAt DESC (mais recente primeiro)
- Marca código como usado imediatamente após validação
- Atualiza `UsuarioEmailVerificado = TRUE` no usuário

### **4. Invalidação de Códigos Antigos**
- Ao gerar novo código, todos os códigos não usados do CPF são invalidados
- Evita múltiplos códigos válidos simultaneamente
- Não afeta códigos já usados (histórico)

### **5. Limpeza Periódica**
- Método `deleteExpired()` remove:
  - Códigos expirados (VerificacaoExpiresAt < NOW())
  - Códigos antigos (VerificacaoCreatedAt < NOW() - 7 dias)
- Executado via cron job diariamente às 3h
- Não remove códigos ainda válidos

### **6. Privacidade**
- Email é mascarado nas respostas: `j***o@email.com`
- Primeiro e último caractere do local visíveis
- Domínio completo visível
- Código nunca é logado em console (segurança)

### **7. Pré-requisitos**
- Usuário deve existir no sistema
- Usuário deve ter email cadastrado
- Email não pode já estar verificado (evita spam)
- CPF deve estar no formato correto

---

## 🔧 Configuração

### **Variáveis de Ambiente (.env):**

```env
# Resend API
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@ecossistemaescolar.com
EMAIL_FROM_NAME=Ecossistema Escolar

# Frontend URL (para links)
FRONTEND_URL=http://localhost:5173

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=senha
DB_NAME=ecossistemaster
```

---

## 🧪 Testes

### **Cenários de Teste:**

1. ✅ Solicitar código para usuário válido
2. ✅ Validar código correto
3. ✅ Validar código incorreto
4. ✅ Validar código expirado (após 15 min)
5. ✅ Validar código já usado
6. ✅ Tentar 4 solicitações em 1 hora (anti-spam)
7. ✅ Solicitar para usuário sem email
8. ✅ Solicitar para email já verificado
9. ✅ Reenviar código
10. ✅ Validar formato de CPF inválido

### **Collection Postman:**

Importe a collection para testes automatizados:

```json
{
  "info": {
    "name": "Verificação Email API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Solicitar Código",
      "request": {
        "method": "POST",
        "header": [],
        "url": {
          "raw": "{{base_url}}/api/verificacao-email/solicitar/123.456.789-00",
          "host": ["{{base_url}}"],
          "path": ["api", "verificacao-email", "solicitar", "123.456.789-00"]
        }
      }
    },
    {
      "name": "Validar Código",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"verificacao\": {\n    \"UsuarioCPF\": \"123.456.789-00\",\n    \"VerificacaoCodigo\": \"123456\"\n  }\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/verificacao-email/validar",
          "host": ["{{base_url}}"],
          "path": ["api", "verificacao-email", "validar"]
        }
      }
    },
    {
      "name": "Reenviar Código",
      "request": {
        "method": "POST",
        "header": [],
        "url": {
          "raw": "{{base_url}}/api/verificacao-email/reenviar/123.456.789-00",
          "host": ["{{base_url}}"],
          "path": ["api", "verificacao-email", "reenviar", "123.456.789-00"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    }
  ]
}
```

---

## 📚 Referências

- **Planejamento Completo:** `docs/PLANEJAMENTO_VERIFICACAO_EMAIL_RESEND.md`
- **Entity:** `backend/entities/verificacao-email.model.ts`
- **Repository:** `backend/repositories/verificacao-email.repository.ts`
- **Service:** `backend/services/verificacao-email.service.ts`
- **Controller:** `backend/controllers/verificacao-email.controller.ts`
- **Middleware:** `backend/middlewares/verificacao-email.middleware.ts`
- **Routes:** `routes/verificacao-email.routes.ts`

---

**Última Atualização:** 09/03/2026  
**Versão da API:** 1.0.0  
**Autor:** GitHub Copilot / EcossistemaEscolar
