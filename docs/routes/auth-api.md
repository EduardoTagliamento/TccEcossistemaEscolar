# 🔐 API de Autenticação - Ecossistema Escolar

## 📋 Visão Geral

API RESTful para autenticação de usuários com suporte a login via CPF, email ou telefone. Utiliza tokens JWT para gerenciamento de sessões stateless.

### Recursos Principais

- ✅ Login com auto-detecção de identificador (CPF/email/telefone)
- ✅ Autenticação via JWT (JSON Web Token)
- ✅ Validação de credenciais com bcrypt
- ✅ Tokens com validade de 24 horas
- ✅ Endpoint de validação de token (/me)
- ✅ Logout (stateless - remoção de token no cliente)
- ✅ Middleware de proteção de rotas
- ✅ Verificação de status do usuário (Ativo/Inativo/Bloqueado)

---

## 🛣️ Endpoints

### 1. POST /api/auth/login

Realiza o login do usuário com CPF, email ou telefone.

**Acesso:** Público (não requer autenticação)

**Body (JSON):**
```json
{
  "identifier": "123.456.789-00",
  "senha": "minhaSenha123"
}
```

**Campos:**
- `identifier` (string, obrigatório): CPF, email ou telefone do usuário
  - CPF: Formato com ou sem máscara (XXX.XXX.XXX-XX ou 11 dígitos)
  - Email: qualquer@exemplo.com
  - Telefone: (XX) XXXXX-XXXX ou 11 dígitos
- `senha` (string, obrigatório): Senha do usuário (mínimo 6 caracteres)

**Resposta de Sucesso (200 OK):**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "UsuarioCPF": "123.456.789-00",
      "UsuarioNome": "João Silva",
      "UsuarioEmail": "joao@exemplo.com",
      "UsuarioEmailVerificado": true,
      "UsuarioTelefone": "(11) 98765-4321"
    }
  }
}
```

**Erro - Credenciais Inválidas (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Credenciais inválidas",
  "details": {
    "message": "CPF, email, telefone ou senha incorretos"
  }
}
```

**Erro - Usuário Bloqueado (403 Forbidden):**
```json
{
  "success": false,
  "message": "Usuário bloqueado",
  "details": {
    "message": "Sua conta foi bloqueada. Entre em contato com o suporte."
  }
}
```

**Erro - Dados Incompletos (400 Bad Request):**
```json
{
  "success": false,
  "message": "Dados incompletos",
  "details": {
    "message": "CPF/email/telefone e senha são obrigatórios"
  }
}
```

**Exemplo de Requisição (cURL):**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "123.456.789-00",
    "senha": "minhaSenha123"
  }'
```

**Exemplo de Requisição (JavaScript/Fetch):**
```javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    identifier: '123.456.789-00',
    senha: 'minhaSenha123',
  }),
});

const data = await response.json();
console.log(data.data.token); // JWT token
```

---

### 2. GET /api/auth/me

Retorna os dados do usuário autenticado. Valida o token e busca informações atualizadas no banco.

**Acesso:** Privado (requer token JWT)

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resposta de Sucesso (200 OK):**
```json
{
  "success": true,
  "message": "Usuário autenticado",
  "data": {
    "user": {
      "UsuarioCPF": "123.456.789-00",
      "UsuarioNome": "João Silva",
      "UsuarioEmail": "joao@exemplo.com",
      "UsuarioEmailVerificado": true,
      "UsuarioTelefone": "(11) 98765-4321"
    }
  }
}
```

**Erro - Token Não Fornecido (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Token não fornecido",
  "details": {
    "message": "Você precisa estar autenticado para acessar este recurso"
  }
}
```

**Erro - Token Inválido (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Token inválido",
  "details": {
    "message": "Token expirado"
  }
}
```

**Erro - Usuário Bloqueado (403 Forbidden):**
```json
{
  "success": false,
  "message": "Usuário inativo ou bloqueado",
  "details": {
    "message": "Sua conta não está mais ativa"
  }
}
```

**Exemplo de Requisição (cURL):**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Exemplo de Requisição (JavaScript/Fetch):**
```javascript
const token = localStorage.getItem('token');

const response = await fetch('http://localhost:3000/api/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();
console.log(data.data.user); // Dados do usuário
```

---

### 3. POST /api/auth/logout

Realiza o logout do usuário. Com JWT stateless, o logout é feito no client-side removendo o token.

**Acesso:** Privado (requer token JWT)

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resposta de Sucesso (200 OK):**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso",
  "data": {
    "info": "Token removido. Por favor, remova o token do armazenamento local."
  }
}
```

**Erro - Token Não Fornecido (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Token não fornecido",
  "details": {
    "message": "Você precisa estar autenticado para acessar este recurso"
  }
}
```

**Exemplo de Requisição (JavaScript/Fetch):**
```javascript
const token = localStorage.getItem('token');

const response = await fetch('http://localhost:3000/api/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();
if (data.success) {
  localStorage.removeItem('token'); // Remove token
  window.location.href = '/login'; // Redireciona para login
}
```

---

### 4. POST /api/auth/refresh

Atualiza o token do usuário (futuro - não implementado ainda).

**Acesso:** Privado (requer token JWT)

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resposta (501 Not Implemented):**
```json
{
  "success": false,
  "message": "Não implementado",
  "details": {
    "message": "Funcionalidade de refresh token ainda não implementada"
  }
}
```

---

## 🔒 Autenticação JWT

### Como Funciona

1. **Login**: Usuário envia credenciais (identifier + senha)
2. **Validação**: Sistema verifica se usuário existe e senha está correta
3. **Token Geração**: Sistema cria JWT com dados do usuário
4. **Cliente Armazena**: Frontend guarda token no localStorage/sessionStorage
5. **Requisições Protegidas**: Cliente envia token no header `Authorization: Bearer {token}`
6. **Validação**: Middleware verifica token antes de processar requisição

### Estrutura do Token JWT

**Payload:**
```json
{
  "UsuarioCPF": "123.456.789-00",
  "UsuarioEmail": "joao@exemplo.com",
  "UsuarioNome": "João Silva",
  "iat": 1710000000,
  "exp": 1710086400
}
```

**Campos:**
- `UsuarioCPF`: CPF do usuário (identificador único)
- `UsuarioEmail`: Email do usuário
- `UsuarioNome`: Nome completo
- `iat` (Issued At): Timestamp de criação do token
- `exp` (Expiration): Timestamp de expiração (24h após criação)

### Usando Token em Requisições

**Header Format:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc3VhcmlvQ1BGIjoiMTIzLjQ1Ni43ODktMDAiLCJVc3VhcmlvRW1haWwiOiJqb2FvQGV4ZW1wbG8uY29tIiwiVXN1YXJpb05vbWUiOiJKb8OjbyBTaWx2YSIsImlhdCI6MTcxMDAwMDAwMCwiZXhwIjoxNzEwMDg2NDAwfQ.signature
```

**Exemplo (Axios):**
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Usar API
const response = await api.get('/auth/me');
```

---

## 🚀 Fluxo de Autenticação (Frontend)

### 1. Login
```javascript
async function login(identifier, senha) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, senha }),
  });

  const data = await response.json();

  if (data.success) {
    // Salvar token
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    
    // Redirecionar
    window.location.href = '/dashboard';
  } else {
    alert(data.details.message);
  }
}
```

### 2. Verificar Autenticação (ao carregar página)
```javascript
async function checkAuth() {
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.href = '/login';
    return null;
  }

  try {
    const response = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();

    if (data.success) {
      return data.data.user;
    } else {
      // Token inválido ou expirado
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return null;
    }
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    window.location.href = '/login';
    return null;
  }
}
```

### 3. Logout
```javascript
async function logout() {
  const token = localStorage.getItem('token');

  if (token) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}
```

---

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

```env
# JWT Configuration
JWT_SECRET=sua_chave_secreta_super_segura_aqui_mude_em_producao
JWT_EXPIRES_IN=24h

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=tccecossistemaescolar
DB_PORT=3306
```

⚠️ **IMPORTANTE:** Mude `JWT_SECRET` em produção para uma chave forte e aleatória.

**Gerar chave segura (Node.js):**
```javascript
require('crypto').randomBytes(64).toString('hex');
```

---

## 🧪 Testando a API

### Postman Collection

```json
{
  "info": {
    "name": "Ecossistema Escolar - Auth API",
    "description": "Coleção de testes para API de autenticação"
  },
  "item": [
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/auth/login",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"identifier\": \"123.456.789-00\",\n  \"senha\": \"minhaSenha123\"\n}"
        }
      }
    },
    {
      "name": "Me (Validar Token)",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/api/auth/me",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ]
      }
    },
    {
      "name": "Logout",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/auth/logout",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ]
      }
    }
  ]
}
```

### Cenários de Teste

1. **Login com CPF (sucesso)**
   - `POST /api/auth/login` com `{ "identifier": "123.456.789-00", "senha": "senha123" }`
   - Espera: 200 OK + token JWT

2. **Login com Email (sucesso)**
   - `POST /api/auth/login` com `{ "identifier": "joao@exemplo.com", "senha": "senha123" }`
   - Espera: 200 OK + token JWT

3. **Login com Telefone (sucesso)**
   - `POST /api/auth/login` com `{ "identifier": "(11) 98765-4321", "senha": "senha123" }`
   - Espera: 200 OK + token JWT

4. **Login com senha errada (erro)**
   - `POST /api/auth/login` com senha incorreta
   - Espera: 401 Unauthorized

5. **Login com usuário inexistente (erro)**
   - `POST /api/auth/login` com identifier não cadastrado
   - Espera: 401 Unauthorized

6. **Validar token (sucesso)**
   - `GET /api/auth/me` com header `Authorization: Bearer {token-válido}`
   - Espera: 200 OK + dados do usuário

7. **Validar token expirado (erro)**
   - `GET /api/auth/me` com token expirado
   - Espera: 401 Unauthorized

8. **Validar token inválido (erro)**
   - `GET /api/auth/me` com token malformado
   - Espera: 401 Unauthorized

9. **Logout (sucesso)**
   - `POST /api/auth/logout` com token válido
   - Espera: 200 OK

10. **Login com usuário bloqueado (erro)**
    - `POST /api/auth/login` com usuário com status Bloqueado
    - Espera: 403 Forbidden

---

## 📊 Códigos de Status HTTP

| Código | Significado | Quando Ocorre |
|--------|-------------|---------------|
| 200 | OK | Requisição bem-sucedida |
| 400 | Bad Request | Dados incompletos ou inválidos |
| 401 | Unauthorized | Credenciais inválidas ou token expirado/inválido |
| 403 | Forbidden | Usuário bloqueado ou inativo |
| 500 | Internal Server Error | Erro no servidor |
| 501 | Not Implemented | Funcionalidade ainda não implementada (refresh) |

---

## 🔐 Segurança

### Boas Práticas Implementadas

1. ✅ **Hashing de Senhas**: bcrypt com salt rounds
2. ✅ **JWT Stateless**: Tokens auto-contidos sem state no servidor
3. ✅ **Expiração de Token**: 24 horas de validade
4. ✅ **Validação de Status**: Verifica se usuário está ativo antes de autenticar
5. ✅ **Mensagens Genéricas**: Não revela se email/CPF existe (previne enumeração)
6. ✅ **HTTPS Recomendado**: Use HTTPS em produção para proteger tokens
7. ✅ **CORS Configurado**: Apenas origens permitidas podem acessar API

### Recomendações Adicionais

- 🔹 Use HTTPS em produção
- 🔹 Implemente rate limiting (ex: 5 tentativas de login por minuto)
- 🔹 Adicione logging para tentativas de login falhas
- 🔹 Considere implementar refresh tokens para sessões longas
- 🔹 Adicione verificação de 2FA (autenticação de dois fatores)
- 🔹 Implemente blacklist de tokens revogados

---

## 📚 Dependências

- **jsonwebtoken**: ^9.0.2 (geração e validação de tokens JWT)
- **bcrypt**: ^6.0.0 (hashing de senhas)
- **express**: ^4.19.2 (framework web)
- **mysql2**: ^3.11.5 (conexão com banco de dados)

---

## 🐛 Troubleshooting

### Erro: "Token expirado"
**Solução**: Faça login novamente para obter novo token.

### Erro: "Token inválido"
**Solução**: Verifique se o token está sendo enviado corretamente no header `Authorization: Bearer {token}`.

### Erro: "Credenciais inválidas"
**Possíveis causas:**
- Senha incorreta
- Usuário não existe
- CPF/email/telefone digitado errado

### Erro: "Usuário bloqueado"
**Solução**: Entre em contato com o suporte da plataforma.

---

## 📝 Changelog

- **v1.0.0** (2025-01-XX): Implementação inicial da API de autenticação
  - ✅ Login com CPF/email/telefone
  - ✅ Endpoint /me para validação de token
  - ✅ Logout stateless
  - ✅ Middleware de autenticação
  - ✅ Auto-detecção de tipo de identificador

---

## 📧 Suporte

Para dúvidas ou problemas com a API, entre em contato:
- Email: suporte@baua.com.br
- Documentação Completa: `/docs`

---

**Última atualização**: Janeiro 2025  
**Versão da API**: 1.0.0
