# API Documentation - Usuário (User)

**Version:** 1.0.0  
**Base URL:** `/api/usuario`  
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Security](#security)
- [Endpoints](#endpoints)
  - [Usuario (User)](#usuario-user)
    - [Create User](#create-user)
    - [List Users](#list-users)
    - [Get User by CPF](#get-user-by-cpf)
    - [Update User](#update-user)
    - [Delete User](#delete-user)
- [Data Models](#data-models)
- [Business Rules](#business-rules)

---

## Overview

API REST para gerenciamento de usuários do Ecossistema Escolar. Esta API fornece endpoints para criar, listar, atualizar e deletar usuários com autenticação segura via hash de senhas (bcrypt).

**Tecnologias:**
- Node.js + Express + TypeScript
- MySQL (database)
- bcrypt (hash de senhas)
- Arquitetura MVC em camadas

**Key Features:**
- 🔐 Hash de senhas com bcrypt (salt rounds: 10)
- ✅ Validação de CPF, Email e Telefone
- 🛡️ Prepared statements (SQL injection prevention)
- 🔒 Senha NUNCA retornada nas respostas
- 📝 Validação de unicidade (CPF e Email)

---

## Response Format

Todas as respostas seguem o formato padronizado:

### Success Response
```json
{
  "success": true,
  "message": "Descrição da operação",
  "data": {
    "usuario": { /* dados do usuário */ }
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Descrição do erro",
  "details": {
    "message": "Detalhes específicos do erro"
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| `200` | OK - Requisição bem-sucedida |
| `201` | Created - Usuário criado com sucesso |
| `400` | Bad Request - Dados inválidos (CPF, Email, etc.) |
| `404` | Not Found - Usuário não encontrado |
| `409` | Conflict - CPF ou Email já cadastrado |
| `500` | Internal Server Error - Erro interno do servidor |

---

## Security

### Password Security

**⚠️ IMPORTANTE:** Todas as senhas são armazenadas com hash bcrypt (salt rounds: 10).

- **Na criação:** A senha em texto plano é enviada no body e automaticamente hasheada antes de salvar no banco
- **Na atualização:** Se uma nova senha for enviada, ela será hasheada antes de atualizar
- **Na consulta:** A senha NUNCA é retornada nas respostas (campo omitido no DTO)

### Data Validation

- **CPF:** Formato `XXX.XXX.XXX-XX` (14 caracteres)
- **Email:** Validação de formato via regex
- **Telefone:** Formato `(XX) XXXXX-XXXX` (15 caracteres)
- **Senha:** Mínimo 6 caracteres (antes do hash)

---

## Endpoints

### Usuario (User)

Base path: `/api/usuario`

---

#### Create User

Cria um novo usuário no sistema. A senha será automaticamente hasheada com bcrypt.

**Endpoint:** `POST /api/usuario`

**Request Body:**
```json
{
  "usuario": {
    "UsuarioCPF": "123.456.789-00",
    "UsuarioNome": "João Silva",
    "UsuarioEmail": "joao@email.com",
    "UsuarioSenha": "senha123",
    "UsuarioTelefone": "(11) 98765-4321",
    "UsuarioId": "user123"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `usuario` | object | ✅ Yes | Objeto contendo dados do usuário | Obrigatório |
| `usuario.UsuarioCPF` | string | ✅ Yes | CPF do usuário (chave primária) | Formato: `XXX.XXX.XXX-XX` (14 chars) |
| `usuario.UsuarioNome` | string | ✅ Yes | Nome completo do usuário | 3-100 caracteres |
| `usuario.UsuarioSenha` | string | ✅ Yes | Senha em texto plano | Mínimo 6 caracteres |
| `usuario.UsuarioEmail` | string | ❌ No | Email do usuário | Formato email válido, max 60 chars |
| `usuario.UsuarioTelefone` | string | ❌ No | Telefone do usuário | Formato: `(XX) XXXXX-XXXX` (15 chars) |
| `usuario.UsuarioId` | string | ❌ No | ID customizado do usuário | Max 45 caracteres |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Usuário cadastrado com sucesso",
  "data": {
    "usuario": {
      "UsuarioCPF": "123.456.789-00",
      "UsuarioNome": "João Silva",
      "UsuarioEmail": "joao@email.com",
      "UsuarioTelefone": "(11) 98765-4321",
      "UsuarioId": "user123"
    }
  }
}
```

> **🔒 Note:** O campo `UsuarioSenha` NUNCA é retornado nas respostas por questões de segurança.

**Error Responses:**

**400 Bad Request** - Dados inválidos
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "details": {
    "message": "O campo 'UsuarioCPF' é obrigatório!"
  }
}
```

**400 Bad Request** - CPF já cadastrado
```json
{
  "success": false,
  "message": "CPF já cadastrado",
  "details": {
    "message": "O CPF 123.456.789-00 já está cadastrado no sistema"
  }
}
```

**400 Bad Request** - Email já cadastrado
```json
{
  "success": false,
  "message": "Email já cadastrado",
  "details": {
    "message": "O email joao@email.com já está cadastrado no sistema"
  }
}
```

**400 Bad Request** - Formato de CPF inválido
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "details": {
    "message": "O campo 'UsuarioCPF' deve ter 14 caracteres (XXX.XXX.XXX-XX)."
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/usuario \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": {
      "UsuarioCPF": "123.456.789-00",
      "UsuarioNome": "João Silva",
      "UsuarioEmail": "joao@email.com",
      "UsuarioSenha": "senha123",
      "UsuarioTelefone": "(11) 98765-4321"
    }
  }'
```

---

#### List Users

Retorna lista de todos os usuários cadastrados. Suporta filtro por nome (busca parcial).

**Endpoint:** `GET /api/usuario`

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `nome` | string | ❌ No | Filtro parcial por nome do usuário | `?nome=João` |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Executado com sucesso",
  "data": {
    "usuarios": [
      {
        "UsuarioCPF": "123.456.789-00",
        "UsuarioNome": "João Silva",
        "UsuarioEmail": "joao@email.com",
        "UsuarioTelefone": "(11) 98765-4321",
        "UsuarioId": "user123"
      },
      {
        "UsuarioCPF": "987.654.321-00",
        "UsuarioNome": "Maria Santos",
        "UsuarioEmail": "maria@email.com",
        "UsuarioTelefone": "(21) 99876-5432",
        "UsuarioId": null
      }
    ]
  }
}
```

**Success Response (200 OK) - Empty:**
```json
{
  "success": true,
  "message": "Executado com sucesso",
  "data": {
    "usuarios": []
  }
}
```

**cURL Examples:**
```bash
# Listar todos os usuários
curl http://localhost:3000/api/usuario

# Filtrar por nome
curl http://localhost:3000/api/usuario?nome=João

# Filtrar por nome parcial
curl http://localhost:3000/api/usuario?nome=Sil
```

---

#### Get User by CPF

Retorna os detalhes de um usuário específico pelo seu CPF.

**Endpoint:** `GET /api/usuario/:UsuarioCPF`

**URL Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `UsuarioCPF` | string | ✅ Yes | CPF único do usuário | `XXX.XXX.XXX-XX` (14 caracteres) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Executado com sucesso",
  "data": {
    "usuario": {
      "UsuarioCPF": "123.456.789-00",
      "UsuarioNome": "João Silva",
      "UsuarioEmail": "joao@email.com",
      "UsuarioTelefone": "(11) 98765-4321",
      "UsuarioId": "user123"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - CPF inválido
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "details": {
    "message": "O CPF deve estar no formato XXX.XXX.XXX-XX"
  }
}
```

**404 Not Found** - Usuário não encontrado
```json
{
  "success": false,
  "message": "Usuário não encontrado",
  "details": {
    "message": "Não existe usuário com CPF 123.456.789-00"
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/usuario/123.456.789-00
```

---

#### Update User

Atualiza os dados de um usuário existente. Suporta atualização parcial. Se uma nova senha for enviada, ela será automaticamente hasheada.

**Endpoint:** `PUT /api/usuario/:UsuarioCPF`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `UsuarioCPF` | string | ✅ Yes | CPF único do usuário |

**Request Body:**
```json
{
  "usuario": {
    "UsuarioNome": "João Silva Atualizado",
    "UsuarioEmail": "joao.novo@email.com",
    "UsuarioSenha": "novaSenha456",
    "UsuarioTelefone": "(11) 91234-5678"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Notes |
|-------|------|----------|-------------|-------|
| `usuario` | object | ✅ Yes | Objeto com campos a atualizar | Obrigatório |
| `usuario.UsuarioNome` | string | ❌ No | Nome atualizado | 3-100 caracteres |
| `usuario.UsuarioEmail` | string | ❌ No | Email atualizado | Formato válido, max 60 chars |
| `usuario.UsuarioSenha` | string | ❌ No | Nova senha (texto plano) | Min 6 chars, será hasheada |
| `usuario.UsuarioTelefone` | string | ❌ No | Telefone atualizado | Formato: `(XX) XXXXX-XXXX` |
| `usuario.UsuarioId` | string | ❌ No | ID customizado atualizado | Max 45 caracteres |

> **Note:** Apenas os campos enviados serão atualizados. Campos omitidos manterão seus valores atuais.

> **🔐 Security Note:** Se `UsuarioSenha` for enviado, a senha será automaticamente hasheada antes de salvar.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Usuário atualizado com sucesso",
  "data": {
    "usuario": {
      "UsuarioCPF": "123.456.789-00",
      "UsuarioNome": "João Silva Atualizado",
      "UsuarioEmail": "joao.novo@email.com",
      "UsuarioTelefone": "(11) 91234-5678",
      "UsuarioId": "user123"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Dados inválidos
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "details": {
    "message": "O campo 'usuario' é obrigatório!"
  }
}
```

**400 Bad Request** - Email já em uso por outro usuário
```json
{
  "success": false,
  "message": "Email já cadastrado",
  "details": {
    "message": "O email joao.novo@email.com já está cadastrado no sistema"
  }
}
```

**404 Not Found** - Usuário não encontrado
```json
{
  "success": false,
  "message": "Usuário não encontrado",
  "details": {
    "message": "Não existe usuário com CPF 123.456.789-00"
  }
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/api/usuario/123.456.789-00 \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": {
      "UsuarioNome": "João Silva Atualizado",
      "UsuarioEmail": "joao.novo@email.com"
    }
  }'
```

---

#### Delete User

Remove um usuário do sistema permanentemente.

**Endpoint:** `DELETE /api/usuario/:UsuarioCPF`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `UsuarioCPF` | string | ✅ Yes | CPF único do usuário |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Usuário excluído com sucesso",
  "data": {
    "deleted": true
  }
}
```

**Error Responses:**

**400 Bad Request** - CPF inválido
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "details": {
    "message": "O CPF deve estar no formato XXX.XXX.XXX-XX"
  }
}
```

**404 Not Found** - Usuário não encontrado
```json
{
  "success": false,
  "message": "Usuário não encontrado",
  "details": {
    "message": "Não existe usuário com CPF 123.456.789-00"
  }
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/usuario/123.456.789-00
```

---

## Data Models

### Usuario (User)

Representa um usuário do sistema Ecossistema Escolar.

```typescript
interface UsuarioDTO {
  UsuarioCPF: string;            // CPF único (chave primária)
  UsuarioNome: string;           // Nome completo
  UsuarioEmail: string | null;   // Email (único)
  UsuarioTelefone: string | null; // Telefone
  UsuarioId: string | null;      // ID customizado
  // UsuarioSenha: NUNCA retornado por segurança
}
```

**Field Descriptions:**

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `UsuarioCPF` | string | CPF do usuário (chave primária) | Formato: `XXX.XXX.XXX-XX` (14 chars), UNIQUE |
| `UsuarioNome` | string | Nome completo do usuário | Min: 3 chars, Max: 100 chars, NOT NULL |
| `UsuarioEmail` | string \| null | Email do usuário | Formato email válido, Max: 60 chars, UNIQUE |
| `UsuarioTelefone` | string \| null | Telefone com DDD | Formato: `(XX) XXXXX-XXXX` (15 chars) |
| `UsuarioId` | string \| null | Identificador customizado | Max: 45 chars |
| `UsuarioSenha` | string (hash) | Hash bcrypt da senha | Max: 100 chars, NOT NULL (nunca retornado) |

**Database Schema:**
```sql
CREATE TABLE usuario (
  UsuarioCPF VARCHAR(14) PRIMARY KEY,
  UsuarioEmail VARCHAR(60) NULL UNIQUE,
  UsuarioId VARCHAR(45) NULL,
  UsuarioTelefone VARCHAR(15) NULL,
  UsuarioNome VARCHAR(100) NOT NULL,
  UsuarioSenha VARCHAR(100) NOT NULL
);
```

---

## Business Rules

### Usuario (User) - Business Logic

#### Validation Rules

1. **CPF (UsuarioCPF)**
   - ✅ Obrigatório na criação
   - ✅ Formato: `XXX.XXX.XXX-XX` (14 caracteres exatos)
   - ✅ Validação regex: `/^\d{3}\.\d{3}\.\d{3}-\d{2}$/`
   - ✅ Deve ser único no sistema
   - ❌ Não pode ser alterado após criação (chave primária)

2. **Nome (UsuarioNome)**
   - ✅ Obrigatório na criação
   - ✅ Mínimo 3 caracteres
   - ✅ Máximo 100 caracteres
   - ✅ Permite letras, números e espaços

3. **Senha (UsuarioSenha)**
   - ✅ Obrigatório na criação
   - ✅ Mínimo 6 caracteres (antes do hash)
   - ✅ Automaticamente hasheada com bcrypt (salt rounds: 10)
   - ✅ Hash armazenado tem máximo 100 caracteres
   - 🔒 **NUNCA retornada em respostas (omitida no DTO)**
   - ✅ Na atualização, se enviada, será re-hasheada

4. **Email (UsuarioEmail)**
   - ❌ Opcional
   - ✅ Se fornecido, deve ter formato válido (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
   - ✅ Máximo 60 caracteres
   - ✅ Deve ser único no sistema (se fornecido)
   - ✅ Pode ser `null`

5. **Telefone (UsuarioTelefone)**
   - ❌ Opcional
   - ✅ Se fornecido, formato: `(XX) XXXXX-XXXX` (15 caracteres)
   - ✅ Validação regex: `/^\(\d{2}\) \d{5}-\d{4}$/`
   - ✅ Máximo 15 caracteres
   - ✅ Pode ser `null`

6. **ID Customizado (UsuarioId)**
   - ❌ Opcional
   - ✅ Máximo 45 caracteres
   - ✅ Pode ser usado para integração com sistemas externos
   - ✅ Pode ser `null`

#### Security Rules

1. **Password Hashing**
   - ✅ Todas as senhas são hasheadas com bcrypt antes de salvar
   - ✅ Salt rounds: 10
   - ✅ Hash nunca é exposto nas APIs

2. **Uniqueness Validation**
   - ✅ CPF deve ser único (validado antes de criar)
   - ✅ Email deve ser único se fornecido (validado antes de criar/atualizar)
   - ✅ Retorna erro 400 se CPF ou Email já existir

3. **SQL Injection Prevention**
   - ✅ Todas as queries usam prepared statements
   - ✅ Parâmetros são sanitizados pelo MySQL driver

4. **Data Privacy**
   - 🔒 Campo `UsuarioSenha` omitido em todos os DTOs
   - ✅ Apenas dados necessários são expostos nas APIs

#### Update Rules

1. **Partial Updates Supported**
   - ✅ Apenas campos enviados são atualizados
   - ✅ Campos omitidos mantêm valores atuais
   - ✅ CPF não pode ser alterado (chave primária)

2. **Email Update Validation**
   - ✅ Se novo email for fornecido, valida unicidade
   - ✅ Permite atualizar mesmo se email já for do próprio usuário
   - ❌ Rejeita se email já pertencer a outro usuário

3. **Password Update**
   - ✅ Se nova senha for enviada, é re-hasheada
   - ✅ Senha antiga não é validada (sem autenticação nesta versão)
   - ✅ Se senha não for enviada, mantém hash atual

#### Query Rules

1. **List Filter**
   - ✅ Suporta filtro parcial por nome (`LIKE %nome%`)
   - ✅ Case-insensitive search
   - ✅ Resultados ordenados por nome (alfabético)
   - ✅ Senha nunca incluída nos resultados

2. **Find by CPF**
   - ✅ CPF deve estar no formato correto
   - ✅ Retorna 404 se não encontrado
   - ✅ Senha não incluída no resultado

---

## Example Workflows

### Workflow 1: Create New User

```bash
# 1. Create user
curl -X POST http://localhost:3000/api/usuario \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": {
      "UsuarioCPF": "111.222.333-44",
      "UsuarioNome": "Ana Paula",
      "UsuarioEmail": "ana@email.com",
      "UsuarioSenha": "senhaSegura123",
      "UsuarioTelefone": "(11) 98888-7777"
    }
  }'

# Response: 201 Created
# {
#   "success": true,
#   "message": "Usuário cadastrado com sucesso",
#   "data": {
#     "usuario": {
#       "UsuarioCPF": "111.222.333-44",
#       "UsuarioNome": "Ana Paula",
#       "UsuarioEmail": "ana@email.com",
#       "UsuarioTelefone": "(11) 98888-7777",
#       "UsuarioId": null
#     }
#   }
# }
```

### Workflow 2: Update User Data

```bash
# 1. Get current user data
curl http://localhost:3000/api/usuario/111.222.333-44

# 2. Update specific fields
curl -X PUT http://localhost:3000/api/usuario/111.222.333-44 \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": {
      "UsuarioNome": "Ana Paula Silva",
      "UsuarioTelefone": "(11) 91111-2222"
    }
  }'

# Response: 200 OK with updated data
```

### Workflow 3: Search Users by Name

```bash
# Search for users with "Ana" in name
curl http://localhost:3000/api/usuario?nome=Ana

# Response: List of matching users
```

### Workflow 4: Delete User

```bash
# Delete user by CPF
curl -X DELETE http://localhost:3000/api/usuario/111.222.333-44

# Response: 200 OK
# {
#   "success": true,
#   "message": "Usuário excluído com sucesso",
#   "data": {
#     "deleted": true
#   }
# }
```

---

## Postman Collection

### Import this JSON to test all endpoints:

```json
{
  "info": {
    "name": "Ecossistema Escolar - Usuario API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create User",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"usuario\": {\n    \"UsuarioCPF\": \"123.456.789-00\",\n    \"UsuarioNome\": \"João Silva\",\n    \"UsuarioEmail\": \"joao@email.com\",\n    \"UsuarioSenha\": \"senha123\",\n    \"UsuarioTelefone\": \"(11) 98765-4321\"\n  }\n}"
        },
        "url": {"raw": "http://localhost:3000/api/usuario"}
      }
    },
    {
      "name": "List Users",
      "request": {
        "method": "GET",
        "url": {"raw": "http://localhost:3000/api/usuario"}
      }
    },
    {
      "name": "Get User by CPF",
      "request": {
        "method": "GET",
        "url": {"raw": "http://localhost:3000/api/usuario/123.456.789-00"}
      }
    },
    {
      "name": "Update User",
      "request": {
        "method": "PUT",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"usuario\": {\n    \"UsuarioNome\": \"João Silva Updated\"\n  }\n}"
        },
        "url": {"raw": "http://localhost:3000/api/usuario/123.456.789-00"}
      }
    },
    {
      "name": "Delete User",
      "request": {
        "method": "DELETE",
        "url": {"raw": "http://localhost:3000/api/usuario/123.456.789-00"}
      }
    }
  ]
}
```

---

## Notes

- 🔐 **Security First:** Senhas são sempre hasheadas e nunca expostas
- ✅ **Validation:** CPF, Email e Telefone são validados rigorosamente
- 🛡️ **SQL Injection:** Todas as queries usam prepared statements
- 📝 **Uniqueness:** CPF e Email são únicos no sistema
- 🔄 **Partial Updates:** Suporta atualização de campos individuais
- 📊 **Filtering:** Busca por nome com `LIKE` parcial

---

**Last Updated:** March 4, 2026  
**Maintained by:** Eduardo Tagliamento
