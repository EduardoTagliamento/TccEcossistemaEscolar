# API Documentation - Anexo (Attachment)

**Version:** 1.0.0  
**Base URL:** `/api/anexo`  
**Content-Type:** `multipart/form-data` (upload) | `application/json` (outros)  
**Authentication:** Required (JWT Bearer Token)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Anexo (Attachment)](#anexo-attachment)
    - [Upload Attachment](#upload-attachment)
    - [List Attachments](#list-attachments)
    - [Get Attachment Metadata](#get-attachment-metadata)
    - [Download Attachment](#download-attachment)
    - [Delete Attachment](#delete-attachment)
- [Data Models](#data-models)
- [Business Rules](#business-rules)

---

## Overview

API REST para gerenciamento de anexos (arquivos) do Ecossistema Escolar. Esta API fornece endpoints para upload, listagem, download e exclusão de arquivos vinculados a usuários e escolas.

**Tecnologias:**
- Node.js + Express + TypeScript
- MySQL (database)
- Multer (upload de arquivos)
- Arquitetura MVC em camadas

**Key Features:**
- 📁 Upload de arquivos (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, ZIP)
- 🔒 Autenticação JWT obrigatória
- 📊 Filtros por usuário, escola e período
- 💾 Armazenamento em `/uploads/anexos/`
- ⚡ Validação de tamanho máximo (5MB)
- 🗑️ Exclusão física e lógica de arquivos

---

## Response Format

Todas as respostas seguem o formato padronizado:

### Success Response
```json
{
  "success": true,
  "message": "Descrição da operação",
  "data": {
    "anexo": { /* dados do anexo */ }
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Descrição do erro",
  "error": {
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
| `201` | Created - Anexo criado com sucesso |
| `400` | Bad Request - Arquivo não enviado ou inválido |
| `401` | Unauthorized - Token JWT ausente ou inválido |
| `403` | Forbidden - Sem permissão para acessar o recurso |
| `404` | Not Found - Anexo não encontrado |
| `500` | Internal Server Error - Erro interno do servidor |

---

## Authentication

**Todas as rotas requerem autenticação JWT via header:**

```http
Authorization: Bearer <seu_token_jwt>
```

**Como obter o token:**
1. Faça login em `POST /api/auth/login`
2. Use o token retornado no campo `data.token`
3. Inclua o token no header `Authorization` de todas as requisições

**Exemplo:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://localhost:3000/api/anexo
```

---

## Endpoints

### Anexo (Attachment)

Base path: `/api/anexo`

---

#### Upload Attachment

Faz upload de um arquivo e cria um registro de anexo no sistema.

**Endpoint:** `POST /api/anexo`

**Content-Type:** `multipart/form-data`

**Authentication:** Required

**Request Body (Form Data):**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `file` | file | ✅ Yes | Arquivo a ser enviado | Max 5MB, tipos permitidos |
| `EscolaGUID` | string | ✅ Yes | GUID da escola vinculada | UUID v4 (36 caracteres) |

**Tipos de arquivo permitidos:**
- Documentos: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`
- Imagens: `.jpg`, `.jpeg`, `.png`
- Compactados: `.zip`

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Anexo enviado com sucesso",
  "data": {
    "anexo": {
      "AnexoGUID": "550e8400-e29b-41d4-a716-446655440000",
      "UsuarioCPF": "123.456.789-00",
      "EscolaGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "AnexoCaminho": "/uploads/anexos/550e8400-e29b-41d4-a716-446655440000.pdf",
      "AnexoNomeOriginal": "trabalho.pdf",
      "AnexoTamanho": 1024000,
      "AnexoTipo": "aluno",
      "AnexoCreatedAt": "2026-05-17T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Arquivo não enviado
```json
{
  "success": false,
  "message": "Nenhum arquivo foi enviado",
  "error": {
    "message": "O campo 'file' é obrigatório"
  }
}
```

**400 Bad Request** - Arquivo muito grande
```json
{
  "success": false,
  "message": "Arquivo muito grande",
  "error": {
    "message": "O tamanho máximo permitido é 5MB"
  }
}
```

**400 Bad Request** - Tipo de arquivo não permitido
```json
{
  "success": false,
  "message": "Tipo de arquivo não permitido",
  "error": {
    "message": "Apenas arquivos PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, ZIP são permitidos"
  }
}
```

**401 Unauthorized** - Token não fornecido
```json
{
  "success": false,
  "message": "Token não fornecido",
  "error": {
    "message": "É necessário estar autenticado para acessar este recurso"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/anexo \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@/caminho/para/arquivo.pdf" \
  -F "EscolaGUID=6ba7b810-9dad-11d1-80b4-00c04fd430c8"
```

---

#### List Attachments

Retorna lista de anexos com filtros opcionais por usuário, escola ou período.

**Endpoint:** `GET /api/anexo`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `UsuarioCPF` | string | ❌ No | Filtro por CPF do usuário | `?UsuarioCPF=123.456.789-00` |
| `EscolaGUID` | string | ❌ No | Filtro por GUID da escola | `?EscolaGUID=6ba7b810-9dad-11d1...` |
| `DataInicio` | string | ❌ No | Filtro de data inicial (ISO 8601) | `?DataInicio=2026-01-01` |
| `DataFim` | string | ❌ No | Filtro de data final (ISO 8601) | `?DataFim=2026-12-31` |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Executado com sucesso",
  "data": {
    "anexos": [
      {
        "AnexoGUID": "550e8400-e29b-41d4-a716-446655440000",
        "UsuarioCPF": "123.456.789-00",
        "EscolaGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "AnexoCaminho": "/uploads/anexos/550e8400-e29b-41d4-a716-446655440000.pdf",
        "AnexoNomeOriginal": "trabalho.pdf",
        "AnexoTamanho": 1024000,
        "AnexoTipo": "aluno",
        "AnexoCreatedAt": "2026-05-17T10:30:00.000Z"
      },
      {
        "AnexoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "UsuarioCPF": "987.654.321-00",
        "EscolaGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "AnexoCaminho": "/uploads/anexos/7c9e6679-7425-40de-944b-e07fc1f90ae7.docx",
        "AnexoNomeOriginal": "relatorio.docx",
        "AnexoTamanho": 512000,
        "AnexoTipo": "professor",
        "AnexoCreatedAt": "2026-05-17T11:00:00.000Z"
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
    "anexos": []
  }
}
```

**cURL Examples:**
```bash
# Listar todos os anexos
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/anexo

# Filtrar por usuário
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/anexo?UsuarioCPF=123.456.789-00"

# Filtrar por escola e período
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/anexo?EscolaGUID=6ba7b810-9dad-11d1-80b4-00c04fd430c8&DataInicio=2026-01-01&DataFim=2026-12-31"
```

---

#### Get Attachment Metadata

Retorna os metadados de um anexo específico (sem baixar o arquivo).

**Endpoint:** `GET /api/anexo/:AnexoGUID`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `AnexoGUID` | string | ✅ Yes | GUID único do anexo | UUID v4 (36 caracteres) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Anexo encontrado",
  "data": {
    "anexo": {
      "AnexoGUID": "550e8400-e29b-41d4-a716-446655440000",
      "UsuarioCPF": "123.456.789-00",
      "EscolaGUID": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "AnexoCaminho": "/uploads/anexos/550e8400-e29b-41d4-a716-446655440000.pdf",
      "AnexoNomeOriginal": "trabalho.pdf",
      "AnexoTamanho": 1024000,
      "AnexoTipo": "aluno",
      "AnexoCreatedAt": "2026-05-17T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - GUID inválido
```json
{
  "success": false,
  "message": "Erro na validação de dados",
  "error": {
    "message": "O parâmetro 'AnexoGUID' é obrigatório!"
  }
}
```

**404 Not Found** - Anexo não encontrado
```json
{
  "success": false,
  "message": "Anexo não encontrado",
  "error": {
    "message": "Não existe anexo com id 550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**cURL Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/anexo/550e8400-e29b-41d4-a716-446655440000
```

---

#### Download Attachment

Faz o download do arquivo físico do anexo.

**Endpoint:** `GET /api/anexo/:AnexoGUID/download`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `AnexoGUID` | string | ✅ Yes | GUID único do anexo | UUID v4 (36 caracteres) |

**Success Response (200 OK):**

O arquivo será enviado como **download** com o nome original e o tipo MIME apropriado.

**Headers da Resposta:**
```http
Content-Disposition: attachment; filename="trabalho.pdf"
Content-Type: application/pdf
Content-Length: 1024000
```

**Error Responses:**

**404 Not Found** - Anexo não encontrado
```json
{
  "success": false,
  "message": "Anexo não encontrado",
  "error": {
    "message": "Não existe anexo com id 550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**404 Not Found** - Arquivo físico não existe
```json
{
  "success": false,
  "message": "Arquivo não encontrado no sistema de arquivos",
  "error": {
    "message": "O arquivo físico foi removido ou corrompido"
  }
}
```

**cURL Example:**
```bash
# Download direto
curl -H "Authorization: Bearer <token>" \
  -o trabalho.pdf \
  http://localhost:3000/api/anexo/550e8400-e29b-41d4-a716-446655440000/download
```

**Browser Example:**
```
http://localhost:3000/api/anexo/550e8400-e29b-41d4-a716-446655440000/download
```

---

#### Delete Attachment

Exclui um anexo do sistema (banco de dados e arquivo físico).

**Endpoint:** `DELETE /api/anexo/:AnexoGUID`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `AnexoGUID` | string | ✅ Yes | GUID único do anexo | UUID v4 (36 caracteres) |

**Authorization Rules:**
- ✅ O usuário pode excluir seus próprios anexos
- ✅ Usuários com função "Coordenação" ou "Secretaria" podem excluir qualquer anexo da escola
- ❌ Usuários não podem excluir anexos de outros sem permissão

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Anexo excluído com sucesso",
  "data": null
}
```

**Error Responses:**

**404 Not Found** - Anexo não encontrado
```json
{
  "success": false,
  "message": "Anexo não encontrado",
  "error": {
    "message": "Não existe anexo com id 550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão para excluir este anexo",
  "error": {
    "message": "Você não tem autorização para excluir anexos de outros usuários"
  }
}
```

**cURL Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/anexo/550e8400-e29b-41d4-a716-446655440000
```

---

## Data Models

### Anexo (Attachment)

| Field | Type | Description |
|-------|------|-------------|
| `AnexoGUID` | string | UUID v4 único do anexo (PK) |
| `UsuarioCPF` | string | CPF do usuário que fez o upload (FK) |
| `EscolaGUID` | string | GUID da escola vinculada (FK) |
| `AnexoCaminho` | string | Caminho do arquivo no servidor |
| `AnexoNomeOriginal` | string | Nome original do arquivo enviado |
| `AnexoTamanho` | number | Tamanho do arquivo em bytes |
| `AnexoTipo` | enum | Tipo: `professor`, `aluno`, `admin` |
| `AnexoCreatedAt` | datetime | Data/hora de criação (UTC) |

---

## Business Rules

### Upload Rules

1. **Tamanho Máximo:** 5MB por arquivo
2. **Tipos Permitidos:**
   - Documentos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
   - Imagens: JPG, JPEG, PNG
   - Compactados: ZIP
3. **Nomenclatura:** Arquivos são salvos com UUID + extensão original
4. **Localização:** `/uploads/anexos/` no servidor
5. **Usuário Autenticado:** O CPF do usuário logado é automaticamente vinculado ao anexo

### Tipo de Anexo (AnexoTipo)

Determinado automaticamente baseado na função do usuário na escola:
- **`professor`**: Usuários com função "Professor"
- **`aluno`**: Usuários com função "Aluno"
- **`admin`**: Usuários com funções "Coordenação", "Secretaria" ou "Direção"

### Authorization

| Ação | Permissão |
|------|-----------|
| Upload | ✅ Qualquer usuário autenticado |
| List | ✅ Qualquer usuário autenticado (vê seus anexos + anexos da escola) |
| View/Download | ✅ Proprietário do anexo + admin da escola |
| Delete | ✅ Proprietário do anexo + admin da escola |

### Storage Management

- **Exclusão:** Remove o registro do banco E o arquivo físico
- **Backup:** Recomendado fazer backup periódico de `/uploads/anexos/`
- **Limpeza:** Arquivos órfãos devem ser removidos via script de manutenção

---

## Examples

### Complete Upload Flow

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"cpf":"123.456.789-00","senha":"senha123"}' \
  | jq -r '.data.token')

# 2. Upload anexo
ANEXO_ID=$(curl -X POST http://localhost:3000/api/anexo \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@trabalho.pdf" \
  -F "EscolaGUID=6ba7b810-9dad-11d1-80b4-00c04fd430c8" \
  | jq -r '.data.anexo.AnexoGUID')

# 3. Ver metadados
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/anexo/$ANEXO_ID

# 4. Download
curl -H "Authorization: Bearer $TOKEN" \
  -o arquivo_baixado.pdf \
  http://localhost:3000/api/anexo/$ANEXO_ID/download

# 5. Excluir
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/anexo/$ANEXO_ID
```

---

**Última atualização:** 17/05/2026  
**Versão da API:** 1.0.0  
**Autor:** Eduardo Tagliamento
