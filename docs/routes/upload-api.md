# API Documentation - Upload (File Upload)

**Version:** 1.0.0  
**Base URL:** `/api/upload`  
**Content-Type:** `multipart/form-data`  
**Authentication:** Required (JWT Bearer Token)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Upload (File Upload)](#upload-file-upload)
    - [Upload School Logo](#upload-school-logo)
    - [Delete School Logo](#delete-school-logo)
- [Data Models](#data-models)
- [Business Rules](#business-rules)

---

## Overview

API REST para gerenciamento de upload de arquivos do Ecossistema Escolar. Esta API fornece endpoints para upload e remoção de logos de escolas.

**Tecnologias:**
- Node.js + Express + TypeScript
- MySQL (database)
- Multer (upload de arquivos)
- Arquitetura MVC em camadas

**Key Features:**
- 📁 Upload de logos de escola (PNG, JPG, JPEG)
- 🔒 Autenticação JWT obrigatória
- 💾 Armazenamento em `/uploads/logos/`
- ⚡ Validação de tamanho máximo (1MB)
- 🗑️ Remoção automática de logo antigo ao fazer novo upload
- 🔄 Atualização do registro no banco de dados

---

## Response Format

Todas as respostas seguem o formato padronizado:

### Success Response
```json
{
  "success": true,
  "message": "Descrição da operação",
  "data": {
    "logo": { /* dados do logo */ }
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
| `200` | OK - Upload/remoção bem-sucedida |
| `400` | Bad Request - Arquivo não enviado ou inválido |
| `401` | Unauthorized - Token JWT ausente ou inválido |
| `403` | Forbidden - Sem permissão para acessar o recurso |
| `404` | Not Found - Escola não encontrada |
| `413` | Payload Too Large - Arquivo maior que 1MB |
| `415` | Unsupported Media Type - Tipo de arquivo não permitido |
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
  http://localhost:3000/api/upload/logo/550e8400-e29b-41d4-a716-446655440000
```

---

## Endpoints

### Upload (File Upload)

Base path: `/api/upload`

---

#### Upload School Logo

Faz upload de uma logo para uma escola específica. Se a escola já tiver um logo, o arquivo antigo será removido automaticamente.

**Endpoint:** `POST /api/upload/logo/:EscolaGUID`

**Content-Type:** `multipart/form-data`

**Authentication:** Required

**Authorization:** Coordenação, Secretaria ou Direção da escola

**URL Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `EscolaGUID` | string | ✅ Yes | GUID da escola | UUID v4 (36 caracteres) |

**Request Body (Form Data):**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `logo` | file | ✅ Yes | Arquivo de imagem da logo | Max 1MB, PNG/JPG/JPEG |

**Tipos de arquivo permitidos:**
- Imagens: `.png`, `.jpg`, `.jpeg`

**Tamanho máximo:** 1MB (1.048.576 bytes)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logo enviado com sucesso",
  "data": {
    "logo": {
      "fileName": "1710098476-a8c3f2-escola-exemplo.png",
      "filePath": "/app/uploads/logos/1710098476-a8c3f2-escola-exemplo.png",
      "fileUrl": "/uploads/logos/1710098476-a8c3f2-escola-exemplo.png",
      "fileSize": 524288,
      "mimeType": "image/png"
    }
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `fileName` | string | Nome do arquivo salvo no servidor (timestamp + hash + nome original) |
| `filePath` | string | Caminho absoluto do arquivo no servidor |
| `fileUrl` | string | URL relativa para acessar o arquivo |
| `fileSize` | number | Tamanho do arquivo em bytes |
| `mimeType` | string | Tipo MIME do arquivo |

**Error Responses:**

**400 Bad Request** - Arquivo não enviado
```json
{
  "success": false,
  "message": "Arquivo não enviado",
  "error": {
    "message": "Nenhum arquivo foi enviado na requisição"
  }
}
```

**404 Not Found** - Escola não encontrada
```json
{
  "success": false,
  "message": "Escola não encontrada",
  "error": {
    "message": "Escola com GUID 550e8400-e29b-41d4-a716-446655440000 não existe"
  }
}
```

**413 Payload Too Large** - Arquivo muito grande
```json
{
  "success": false,
  "message": "Arquivo muito grande",
  "error": {
    "message": "O tamanho máximo permitido é 1MB (1.048.576 bytes)"
  }
}
```

**415 Unsupported Media Type** - Tipo de arquivo não permitido
```json
{
  "success": false,
  "message": "Tipo de arquivo não permitido",
  "error": {
    "message": "Apenas arquivos PNG, JPG e JPEG são permitidos"
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

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão",
  "error": {
    "message": "Apenas coordenação, secretaria ou direção podem fazer upload de logo"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/upload/logo/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <token>" \
  -F "logo=@/caminho/para/logo.png"
```

**JavaScript Example (FormData):**
```javascript
const formData = new FormData();
formData.append('logo', fileInput.files[0]);

fetch('http://localhost:3000/api/upload/logo/550e8400-e29b-41d4-a716-446655440000', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

---

#### Delete School Logo

Remove a logo de uma escola específica. O arquivo físico será deletado do servidor e o campo `EscolaLogo` no banco será definido como `NULL`.

**Endpoint:** `DELETE /api/upload/logo/:EscolaGUID`

**Authentication:** Required

**Authorization:** Coordenação, Secretaria ou Direção da escola

**URL Parameters:**

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `EscolaGUID` | string | ✅ Yes | GUID da escola | UUID v4 (36 caracteres) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logo removido com sucesso",
  "data": {
    "removed": true
  }
}
```

**Success Response (200 OK) - Escola sem logo:**
```json
{
  "success": true,
  "message": "Logo removido com sucesso",
  "data": {
    "removed": false
  }
}
```

> **💡 Nota:** Se a escola não tinha logo, `removed` será `false` mas a operação é considerada bem-sucedida.

**Error Responses:**

**404 Not Found** - Escola não encontrada
```json
{
  "success": false,
  "message": "Escola não encontrada",
  "error": {
    "message": "Escola com GUID 550e8400-e29b-41d4-a716-446655440000 não existe"
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

**403 Forbidden** - Sem permissão
```json
{
  "success": false,
  "message": "Sem permissão",
  "error": {
    "message": "Apenas coordenação, secretaria ou direção podem remover logo"
  }
}
```

**cURL Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/upload/logo/550e8400-e29b-41d4-a716-446655440000
```

---

## Data Models

### Upload Response

| Field | Type | Description |
|-------|------|-------------|
| `fileName` | string | Nome do arquivo no servidor (timestamp-hash-original.ext) |
| `filePath` | string | Caminho absoluto do arquivo |
| `fileUrl` | string | URL relativa para acessar via HTTP |
| `fileSize` | number | Tamanho em bytes |
| `mimeType` | string | Tipo MIME (image/png, image/jpeg) |

### Escola (School) - Logo Field

O campo `EscolaLogo` na tabela `escola`:

| Field | Type | Description |
|-------|------|-------------|
| `EscolaLogo` | string | Nome do arquivo da logo (nullable) |

---

## Business Rules

### Upload Rules

1. **Tamanho Máximo:** 1MB (1.048.576 bytes) por arquivo
2. **Tipos Permitidos:** PNG, JPG, JPEG
3. **Nomenclatura:** 
   - Formato: `{timestamp}-{hash}-{nome_original}.{ext}`
   - Exemplo: `1710098476-a8c3f2-escola-exemplo.png`
4. **Localização:** `/uploads/logos/` no servidor
5. **Substituição Automática:** 
   - Se a escola já tem logo, o arquivo antigo é **deletado** antes de salvar o novo
   - Garante que não há logos órfãos no servidor
6. **Validação de Escola:**
   - Escola deve existir antes do upload
   - Se não existir, o arquivo enviado é **deletado** imediatamente

### Delete Rules

1. **Efeitos:**
   - Remove arquivo físico de `/uploads/logos/`
   - Define `EscolaLogo` como `NULL` no banco
2. **Idempotência:**
   - Deletar logo de escola sem logo retorna sucesso (`removed: false`)
3. **Escola Inexistente:**
   - Retorna erro 404

### Authorization

| Ação | Permissão |
|------|-----------|
| Upload Logo | ✅ Coordenação, Secretaria, Direção |
| Delete Logo | ✅ Coordenação, Secretaria, Direção |
| View Logo | ✅ Público (via URL estática `/uploads/logos/`) |

### Storage Management

- **Diretório:** `/uploads/logos/` na raiz do projeto
- **Backup:** Recomendado fazer backup periódico da pasta
- **Limpeza:** Não há logos órfãos - substituição e deleção são gerenciadas
- **Permissões:** Pasta deve ter permissões de escrita (chmod 755 ou 777)

### File Naming Convention

O Multer gera nomes únicos no formato:
```
{timestamp}-{random_hash}-{original_filename}
```

Exemplo:
```
1710098476-a8c3f2-logo-escola-abc.png
```

Isso garante:
- ✅ Unicidade (timestamp + hash)
- ✅ Rastreabilidade (nome original preservado)
- ✅ Sem conflitos de nome

---

## Examples

### Complete Upload Workflow

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"cpf":"123.456.789-00","senha":"senha123"}' \
  | jq -r '.data.token')

# 2. Criar escola
ESCOLA_ID=$(curl -X POST http://localhost:3000/api/escola \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "escola": {
      "EscolaNome": "Colégio Exemplo",
      "EscolaCorPriEs": "1E3A8A",
      "EscolaCorPriCl": "FFFFFF"
    }
  }' | jq -r '.data.escola.EscolaGUID')

# 3. Upload logo
curl -X POST http://localhost:3000/api/upload/logo/$ESCOLA_ID \
  -H "Authorization: Bearer $TOKEN" \
  -F "logo=@logo.png"

# 4. Verificar escola com logo
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/escola/$ESCOLA_ID

# 5. Atualizar logo (substitui o anterior)
curl -X POST http://localhost:3000/api/upload/logo/$ESCOLA_ID \
  -H "Authorization: Bearer $TOKEN" \
  -F "logo=@nova-logo.png"

# 6. Remover logo
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/upload/logo/$ESCOLA_ID
```

### Frontend Integration (React)

```jsx
import { useState } from 'react';

function LogoUpload({ escolaGUID, token }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    
    if (!file) return;

    // Validar tamanho
    if (file.size > 1048576) {
      alert('Arquivo muito grande! Máximo 1MB');
      return;
    }

    // Validar tipo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Tipo não permitido! Use PNG ou JPG');
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await fetch(
        `http://localhost:3000/api/upload/logo/${escolaGUID}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      const data = await response.json();

      if (data.success) {
        console.log('Logo enviado:', data.data.logo);
        alert('Logo enviado com sucesso!');
      } else {
        alert(`Erro: ${data.message}`);
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja remover o logo?')) return;

    try {
      const response = await fetch(
        `http://localhost:3000/api/upload/logo/${escolaGUID}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        alert('Logo removido com sucesso!');
      } else {
        alert(`Erro: ${data.message}`);
      }
    } catch (error) {
      console.error('Erro ao remover:', error);
      alert('Erro ao remover logo');
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleUpload}
        disabled={uploading}
      />
      <button onClick={handleDelete}>Remover Logo</button>
      {uploading && <p>Enviando...</p>}
    </div>
  );
}
```

---

## Technical Notes

### Multer Configuration

O middleware de upload usa Multer com as seguintes configurações:

```typescript
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/logos/');
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const hash = Math.random().toString(36).substring(7);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${timestamp}-${hash}-${name}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1048576 } // 1MB
});
```

### Serving Static Files

Configure o Express para servir arquivos estáticos:

```typescript
import express from 'express';

app.use('/uploads', express.static('uploads'));
```

Agora as logos podem ser acessadas via:
```
http://localhost:3000/uploads/logos/1710098476-a8c3f2-logo.png
```

---

## Troubleshooting

### Erro: "ENOENT: no such file or directory"

**Causa:** Pasta `/uploads/logos/` não existe

**Solução:**
```bash
mkdir -p uploads/logos
chmod 755 uploads/logos
```

### Erro: "413 Payload Too Large"

**Causa:** Arquivo maior que 1MB

**Solução:** Reduzir tamanho da imagem antes do upload

### Erro: "EACCES: permission denied"

**Causa:** Sem permissão de escrita na pasta

**Solução:**
```bash
chmod 777 uploads/logos  # Linux/Mac
# Windows: Dar permissão de escrita via propriedades da pasta
```

### Logo não aparece após upload

**Causa:** Arquivos estáticos não configurados

**Solução:** Adicionar middleware no servidor:
```typescript
app.use('/uploads', express.static('uploads'));
```

---

**Última atualização:** 17/05/2026  
**Versão da API:** 1.0.0  
**Autor:** Eduardo Tagliamento
