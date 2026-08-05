# 🔑 API de Redefinição de Senha ("Esqueci minha senha")

**Versão:** 1.0.0
**Base URL:** `/api/redefinicao-senha`
**Autenticação:** Não requerida (fluxo público, usuário perdeu acesso à conta)

---

## 🎯 Visão geral

Fluxo de "esqueci minha senha" via e-mail: o usuário informa o e-mail da conta, recebe um link com token (válido por 1 hora, uso único) e define uma nova senha.

**Características:**
- Token aleatório de 32 bytes (64 caracteres hex) — não é um código curto digitável, é um link
- Expiração em 60 minutos, uso único
- Anti-spam: máximo 3 solicitações por hora por conta
- **Sem enumeração de usuários**: a resposta de `/solicitar` é sempre a mesma mensagem genérica, exista ou não conta com o e-mail informado — nunca dá pra descobrir por essa rota se um e-mail está cadastrado
- Redefinir com sucesso invalida qualquer outro link de redefinição pendente pra mesma conta
- Rate limit dedicado (`authRateLimitMiddleware`, 20 req/15min) em ambos os endpoints

---

## 🔌 Endpoints

### 1. Solicitar redefinição

```http
POST /api/redefinicao-senha/solicitar
```

**Body:**
```json
{ "email": "usuario@exemplo.com" }
```

**Resposta (200), sempre — exista ou não a conta:**
```json
{
  "success": true,
  "message": "Se existir uma conta com esse e-mail, enviamos um link de redefinição de senha.",
  "data": null
}
```

### 2. Redefinir senha

```http
POST /api/redefinicao-senha/redefinir
```

**Body:**
```json
{ "token": "<64 caracteres hex, vindo do link do e-mail>", "novaSenha": "novaSenha123" }
```

**Resposta de sucesso (200):**
```json
{ "success": true, "message": "Senha redefinida com sucesso!", "data": null }
```

**Erros possíveis:**
| Status | Motivo |
|---|---|
| 400 | Nova senha com menos de 6 caracteres |
| 400 | Token inválido, já usado ou expirado |

---

## Regras de negócio

- O link enviado por e-mail aponta pro frontend em `FRONTEND_URL/redefinir-senha?token=...`
- Token normalizado/validado via `backend/schemas/redefinicaoSenha.schema.ts` (regex `^[a-f0-9]{64}$`)
- Persistência: tabela `redefinicao_senha` (`backend/database/migrations/2026-08-04-redefinicao-senha.sql`), mesmo padrão de expiração/uso único de `verificacao_email`
- Falha ao enviar o e-mail (ex.: Resend fora do ar) não vira erro pro chamador — fica só logada no servidor, pra não abrir um oráculo de enumeração via diferença de resposta
