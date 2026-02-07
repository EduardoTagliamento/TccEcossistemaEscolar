# API Documentation - Ecossistema Escolar

**Version:** 1.0.0  
**Base URL:** `/api`  
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Escola (School)](#escola-school)
    - [Create School](#create-school)
    - [List Schools](#list-schools)
    - [Get School by ID](#get-school-by-id)
    - [Update School](#update-school)
    - [Delete School](#delete-school)
- [Data Models](#data-models)
- [Business Rules](#business-rules)

---

## Overview

Ecossistema Escolar é uma plataforma educacional inspirada no Google Classroom com recursos avançados de IA. Esta API REST fornece endpoints para gerenciamento de escolas, turmas, alunos e professores.

**Tecnologias:**
- Node.js + Express + TypeScript
- MySQL (database)
- Arquitetura MVC em camadas

---

## Response Format

Todas as respostas seguem o formato padronizado:

### Success Response
```json
{
  "success": true,
  "message": "Descrição da operação",
  "data": {
    // Dados retornados
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
| `201` | Created - Recurso criado com sucesso |
| `204` | No Content - Recurso deletado (sem corpo de resposta) |
| `400` | Bad Request - Dados inválidos na requisição |
| `404` | Not Found - Recurso não encontrado |
| `409` | Conflict - Conflito de dados (ex: duplicidade) |
| `500` | Internal Server Error - Erro interno do servidor |

---

## Endpoints

### Escola (School)

Base path: `/api/escola`

---

#### Create School

Cria uma nova escola no sistema.

**Endpoint:** `POST /api/escola`

**Request Body:**
```json
{
  "escola": {
    "EscolaNome": "Escola Estadual ABC",
    "EscolaCorPriEs": "1E3A8A",
    "EscolaCorPriCl": "FFFFFF",
    "EscolaCorSecEs": "FFA500",
    "EscolaCorSecCl": "000000",
    "EscolaIcone": "iVBORw0KGgoAAAANSUhEUgAAAAUA..."
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `escola` | object | ✅ Yes | Objeto contendo dados da escola | Obrigatório |
| `escola.EscolaNome` | string | ✅ Yes | Nome da escola | 3-100 caracteres |
| `escola.EscolaCorPriEs` | string | ❌ No | Cor primária escura (hex) | 6 caracteres hexadecimais |
| `escola.EscolaCorPriCl` | string | ❌ No | Cor primária clara (hex) | 6 caracteres hexadecimais |
| `escola.EscolaCorSecEs` | string | ❌ No | Cor secundária escura (hex) | 6 caracteres hexadecimais |
| `escola.EscolaCorSecCl` | string | ❌ No | Cor secundária clara (hex) | 6 caracteres hexadecimais |
| `escola.EscolaIcone` | string | ❌ No | Ícone da escola em Base64 | String Base64 válida |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Cadastro realizado com sucesso",
  "data": {
    "escola": {
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "EscolaNome": "Escola Estadual ABC",
      "EscolaCorPriEs": "1E3A8A",
      "EscolaCorPriCl": "FFFFFF",
      "EscolaCorSecEs": "FFA500",
      "EscolaCorSecCl": "000000",
      "EscolaIcone": "iVBORw0KGgoAAAANSUhEUgAAAAUA..."
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
    "message": "O campo 'EscolaNome' é obrigatório!"
  }
}
```

**400 Bad Request** - Escola duplicada
```json
{
  "success": false,
  "message": "Escola já existe",
  "details": {
    "message": "A escola Escola Estadual ABC já está cadastrada"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/escola \
  -H "Content-Type: application/json" \
  -d '{
    "escola": {
      "EscolaNome": "Escola Estadual ABC",
      "EscolaCorPriEs": "1E3A8A",
      "EscolaCorPriCl": "FFFFFF"
    }
  }'
```

---

#### List Schools

Retorna lista de todas as escolas cadastradas. Suporta filtro por nome.

**Endpoint:** `GET /api/escola`

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `nome` | string | ❌ No | Filtro parcial por nome da escola | `?nome=ABC` |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Executado com sucesso",
  "data": {
    "escolas": [
      {
        "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
        "EscolaNome": "Escola Estadual ABC",
        "EscolaCorPriEs": "1E3A8A",
        "EscolaCorPriCl": "FFFFFF",
        "EscolaCorSecEs": "FFA500",
        "EscolaCorSecCl": "000000",
        "EscolaIcone": "iVBORw0KGgoAAAANSUhEUgAAAAUA..."
      },
      {
        "EscolaGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "EscolaNome": "Colégio XYZ",
        "EscolaCorPriEs": "FF0000",
        "EscolaCorPriCl": "FFFFFF",
        "EscolaCorSecEs": null,
        "EscolaCorSecCl": null,
        "EscolaIcone": null
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
    "escolas": []
  }
}
```

**cURL Examples:**
```bash
# Listar todas as escolas
curl http://localhost:3000/api/escola

# Filtrar por nome
curl http://localhost:3000/api/escola?nome=ABC
```

---

#### Get School by ID

Retorna os detalhes de uma escola específica pelo seu GUID.

**Endpoint:** `GET /api/escola/:EscolaGUID`

**URL Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `EscolaGUID` | string | ✅ Yes | GUID único da escola | UUID v4 (36 caracteres) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Executado com sucesso",
  "data": {
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "EscolaNome": "Escola Estadual ABC",
    "EscolaCorPriEs": "1E3A8A",
    "EscolaCorPriCl": "FFFFFF",
    "EscolaCorSecEs": "FFA500",
    "EscolaCorSecCl": "000000",
    "EscolaIcone": "iVBORw0KGgoAAAANSUhEUgAAAAUA..."
  }
}
```

**Error Responses:**

**400 Bad Request** - GUID inválido
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "details": {
    "message": "O parâmetro 'EscolaGUID' é obrigatório!"
  }
}
```

**404 Not Found** - Escola não encontrada
```json
{
  "success": false,
  "message": "Escola não encontrada",
  "details": {
    "message": "Não existe escola com id 550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/escola/550e8400-e29b-41d4-a716-446655440000
```

---

#### Update School

Atualiza os dados de uma escola existente. Suporta atualização parcial.

**Endpoint:** `PUT /api/escola/:EscolaGUID`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EscolaGUID` | string | ✅ Yes | GUID único da escola |

**Request Body:**
```json
{
  "escola": {
    "EscolaNome": "Escola Estadual ABC - Atualizada",
    "EscolaCorPriEs": "0000FF",
    "EscolaIcone": null
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Notes |
|-------|------|----------|-------------|-------|
| `escola` | object | ✅ Yes | Objeto com campos a atualizar | Obrigatório |
| `escola.EscolaNome` | string | ❌ No | Nome atualizado | 3-100 caracteres |
| `escola.EscolaCorPriEs` | string | ❌ No | Cor primária escura | 6 hex chars |
| `escola.EscolaCorPriCl` | string | ❌ No | Cor primária clara | 6 hex chars |
| `escola.EscolaCorSecEs` | string | ❌ No | Cor secundária escura | 6 hex chars |
| `escola.EscolaCorSecCl` | string | ❌ No | Cor secundária clara | 6 hex chars |
| `escola.EscolaIcone` | string \| null | ❌ No | Ícone em Base64 ou `null` para remover | Base64 ou null |

> **Note:** Apenas os campos enviados serão atualizados. Campos omitidos manterão seus valores atuais.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Atualizado com sucesso",
  "data": {
    "escola": {
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "EscolaNome": "Escola Estadual ABC - Atualizada",
      "EscolaCorPriEs": "0000FF",
      "EscolaCorPriCl": "FFFFFF",
      "EscolaCorSecEs": "FFA500",
      "EscolaCorSecCl": "000000",
      "EscolaIcone": null
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
    "message": "O campo 'escola' é obrigatório!"
  }
}
```

**404 Not Found** - Escola não encontrada
```json
{
  "success": false,
  "message": "Escola não encontrada",
  "details": {
    "message": "Não existe escola com id 550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/api/escola/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "escola": {
      "EscolaNome": "Escola Estadual ABC - Atualizada",
      "EscolaCorPriEs": "0000FF"
    }
  }'
```

---

#### Delete School

Remove uma escola do sistema permanentemente.

**Endpoint:** `DELETE /api/escola/:EscolaGUID`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `EscolaGUID` | string | ✅ Yes | GUID único da escola |

**Success Response (204 No Content):**
```json
{
  "success": true,
  "message": "Excluído com sucesso"
}
```

**Error Responses:**

**400 Bad Request** - GUID inválido
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "details": {
    "message": "O parâmetro 'EscolaGUID' é obrigatório!"
  }
}
```

**404 Not Found** - Escola não encontrada
```json
{
  "success": false,
  "message": "Escola não encontrada",
  "error": {
    "message": "Não existe escola com id 550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/escola/550e8400-e29b-41d4-a716-446655440000
```

---

## Data Models

### Escola (School)

Representa uma instituição de ensino no sistema.

```typescript
interface EscolaDTO {
  EscolaGUID: string;           // UUID v4, único identificador
  EscolaNome: string | null;    // Nome da escola (3-100 chars)
  EscolaCorPriEs: string | null; // Cor primária escura (hex 6 chars)
  EscolaCorPriCl: string | null; // Cor primária clara (hex 6 chars)
  EscolaCorSecEs: string | null; // Cor secundária escura (hex 6 chars)
  EscolaCorSecCl: string | null; // Cor secundária clara (hex 6 chars)
  EscolaIcone: string | null;    // Ícone em Base64 ou null
}
```

**Field Descriptions:**

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `EscolaGUID` | string | Identificador único universal | UUID v4 (36 caracteres) |
| `EscolaNome` | string \| null | Nome completo da escola | Min: 3 chars, Max: 100 chars |
| `EscolaCorPriEs` | string \| null | Cor primária escura (tema) | Formato: `RRGGBB` (hex) |
| `EscolaCorPriCl` | string \| null | Cor primária clara (tema) | Formato: `RRGGBB` (hex) |
| `EscolaCorSecEs` | string \| null | Cor secundária escura (tema) | Formato: `RRGGBB` (hex) |
| `EscolaCorSecCl` | string \| null | Cor secundária clara (tema) | Formato: `RRGGBB` (hex) |
| `EscolaIcone` | string \| null | Logotipo/ícone da escola | Base64 encoded image (PNG/JPG) |

**Database Schema:**
```sql
CREATE TABLE escola (
  EscolaGUID CHAR(36) PRIMARY KEY,
  EscolaNome VARCHAR(100) NOT NULL UNIQUE,
  EscolaCorPriEs CHAR(6) NULL,
  EscolaCorPriCl CHAR(6) NULL,
  EscolaCorSecEs CHAR(6) NULL,
  EscolaCorSecCl CHAR(6) NULL,
  EscolaIcone LONGBLOB NULL
);
```

---

## Business Rules

### Escola (School) - Business Logic

#### Validation Rules

1. **Nome da Escola (EscolaNome)**
   - ✅ Obrigatório na criação
   - ✅ Deve ter entre 3 e 100 caracteres
   - ✅ Deve ser único no sistema (não pode haver duplicatas)
   - ✅ Espaços em branco no início/fim são removidos automaticamente

2. **GUID**
   - ✅ Gerado automaticamente (UUID v4) se não fornecido
   - ✅ Deve ter exatamente 36 caracteres
   - ✅ Formato: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`

3. **Cores (EscolaCorPriEs, EscolaCorPriCl, EscolaCorSecEs, EscolaCorSecCl)**
   - ✅ Opcionais (podem ser `null`)
   - ✅ Quando fornecidas, devem ser hexadecimais de 6 caracteres
   - ✅ Aceita maiúsculas e minúsculas (ex: `1E3A8A` ou `1e3a8a`)
   - ✅ Não inclui o símbolo `#` no valor
   - ❌ Cores inválidas: `#FF0000`, `FFF`, `12345`, `ZZZZZZ`

4. **Ícone (EscolaIcone)**
   - ✅ Opcional (pode ser `null`)
   - ✅ Quando fornecido, deve ser uma string Base64 válida
   - ✅ Armazenado como `LONGBLOB` no banco de dados
   - ✅ Na resposta, sempre retorna como Base64 ou `null`
   - ✅ Aceita imagens em formatos comuns (PNG, JPG, GIF, etc.)

#### Create Operation Rules

- ✅ `EscolaNome` é obrigatório
- ✅ Verifica duplicidade de nome antes de criar
- ✅ Gera `EscolaGUID` automaticamente se não fornecido
- ✅ Converte ícone de Base64 para Buffer antes de salvar
- ❌ Falha se já existir escola com mesmo nome

#### Update Operation Rules

- ✅ Suporta atualização parcial (apenas campos fornecidos)
- ✅ Campos omitidos mantêm valores existentes
- ✅ `EscolaIcone = null` ou `""` remove o ícone
- ✅ Validações aplicadas apenas aos campos enviados
- ❌ Falha se `EscolaGUID` não existir

#### Delete Operation Rules

- ✅ Remoção permanente do banco de dados
- ✅ Retorna `true` se deletado com sucesso
- ✅ Retorna `false` se escola não encontrada
- ⚠️ **Sem soft delete** (remoção definitiva)

#### Search Rules

- ✅ Busca por nome usa `LIKE %nome%` (busca parcial)
- ✅ Case-insensitive na busca por nome
- ✅ Retorna array vazio se nenhuma escola encontrada
- ✅ Busca sem filtro retorna todas as escolas

#### Data Integrity

- ✅ `EscolaNome` possui índice UNIQUE no banco
- ✅ Validações em múltiplas camadas:
  - **Middleware:** Valida estrutura da requisição
  - **Entity:** Valida tipos e formatos de dados
  - **Service:** Valida regras de negócio (duplicidade, existência)
- ✅ Queries parametrizadas previnem SQL Injection
- ✅ Conversão automática Buffer ↔ Base64

---

## Implementation Details

### Architecture Layers

```
Controllers → Services → Repositories → Database
     ↓           ↓            ↓
Middlewares   Business     Entities
              Logic
```

**Responsabilidades:**
- **Middleware:** Validação de estrutura de requisição
- **Controller:** HTTP handling (entrada/saída)
- **Service:** Regras de negócio e orquestração
- **Repository (DAO):** Acesso ao banco de dados
- **Entity:** Validação de domínio e encapsulamento

### Error Handling Strategy

1. **Validation Errors (400):** Middleware detecta estrutura inválida
2. **Business Logic Errors (400/409):** Service valida regras de negócio
3. **Not Found Errors (404):** Service verifica existência de recursos
4. **Domain Errors:** Entity valida integridade dos dados
5. **All errors:** Propagam via `next(error)` para middleware global

### Security Measures

- ✅ Queries SQL parametrizadas (proteção contra SQL Injection)
- ✅ Validação em múltiplas camadas
- ✅ Sanitização de entrada (trim, type checking)
- ✅ GUIDs imprevisíveis (UUID v4)
- ✅ Campos privados nas entidades (encapsulamento)

---

## Examples

### Complete CRUD Workflow

```bash
# 1. Criar escola
curl -X POST http://localhost:3000/api/escola \
  -H "Content-Type: application/json" \
  -d '{
    "escola": {
      "EscolaNome": "Instituto Tecnológico",
      "EscolaCorPriEs": "1E3A8A",
      "EscolaCorPriCl": "FFFFFF"
    }
  }'

# Response: {"success": true, "data": {"escola": {"EscolaGUID": "abc-123...", ...}}}

# 2. Listar todas
curl http://localhost:3000/api/escola

# 3. Buscar por ID
curl http://localhost:3000/api/escola/abc-123-def-456

# 4. Atualizar
curl -X PUT http://localhost:3000/api/escola/abc-123-def-456 \
  -H "Content-Type: application/json" \
  -d '{"escola": {"EscolaCorPriEs": "FF0000"}}'

# 5. Deletar
curl -X DELETE http://localhost:3000/api/escola/abc-123-def-456
```

### Color Theme Example

```json
{
  "escola": {
    "EscolaNome": "Escola Colorida",
    "EscolaCorPriEs": "1E3A8A",  // Azul escuro (primário)
    "EscolaCorPriCl": "93C5FD",  // Azul claro (primário)
    "EscolaCorSecEs": "FB923C",  // Laranja escuro (secundário)
    "EscolaCorSecCl": "FDBA74"   // Laranja claro (secundário)
  }
}
```

### Image Upload Example

```javascript
// Frontend: Converter imagem para Base64
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const reader = new FileReader();

reader.onloadend = async () => {
  const base64 = reader.result.split(',')[1]; // Remove "data:image/png;base64,"
  
  const response = await fetch('http://localhost:3000/api/escola', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      escola: {
        EscolaNome: "Minha Escola",
        EscolaIcone: base64
      }
    })
  });
  
  const data = await response.json();
  console.log(data);
};

reader.readAsDataURL(file);
```

---

## Changelog

### Version 1.0.0 (Current)

**Features:**
- ✅ CRUD completo de Escola
- ✅ Busca com filtro por nome
- ✅ Upload de ícones em Base64
- ✅ Sistema de cores personalizáveis
- ✅ Validação em múltiplas camadas
- ✅ Tratamento de erros estruturado

**Planned:**
- 🔜 Autenticação JWT
- 🔜 Paginação na listagem
- 🔜 Ordenação customizável
- 🔜 Soft delete com histórico
- 🔜 Auditoria de mudanças
- 🔜 Rate limiting

---

## Support & Contact

**Repository:** [EduardoTagliamento/TccEcossistemaEscolar](https://github.com/EduardoTagliamento/TccEcossistemaEscolar)  
**Project Type:** TCC (Undergraduate Thesis)  
**License:** MIT

For bugs and feature requests, please open an issue on GitHub.
