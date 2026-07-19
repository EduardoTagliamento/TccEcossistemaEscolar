# API Documentation - Categoria de Conteúdo (CategoriaConteudo)

**Version:** 1.0.0
**Base URL:** `/api/categoria-conteudo`
**Content-Type:** `application/json`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Create Categoria](#create-categoria)
  - [List Categorias](#list-categorias)
  - [Update Categoria](#update-categoria)
  - [Delete Categoria](#delete-categoria)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)
- [Examples](#examples)
- [Integration with Other Entities](#integration-with-other-entities)
- [Notes](#notes)

---

## Overview

API para gerenciar **categorias pessoais de organização de conteúdo de aula** (ver [conteudo-api.md](conteudo-api.md)). Cada categoria pertence a um único professor (`UsuarioCPF`) e a uma matéria (`MateriaGUID`) — não é compartilhada entre professores nem entre matérias, funcionando como uma pasta pessoal ("Provas antigas", "Vídeos de revisão" etc.).

**Permissões:**
- Qualquer usuário autenticado pode criar categorias (a validação de que a matéria existe é feita, mas não há checagem de que o usuário é professor dessa matéria — ver Business Rules).
- Editar/excluir é restrito ao criador da categoria (`UsuarioCPF` da categoria === usuário autenticado).
- Listagem não tem restrição de dono — aceita filtros opcionais `MateriaGUID`/`UsuarioCPF`.

---

## Authentication

Todas as rotas requerem autenticação JWT.

**Header obrigatório:**
```
Authorization: Bearer <token>
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Descrição da operação",
  "data": { /* dados */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Descrição do erro",
  "details": { /* opcional */ }
}
```

---

## Endpoints

### Create Categoria

**Endpoint:** `POST /api/categoria-conteudo`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "categoria": {
    "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
    "CategoriaNome": "Provas Antigas"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `categoria` | object | ✅ Yes | Objeto contendo os dados da categoria | Obrigatório |
| `categoria.MateriaGUID` | string | ✅ Yes | UUID da matéria | UUID v4 válido; matéria deve existir |
| `categoria.CategoriaNome` | string | ✅ Yes | Nome da categoria | 2-100 caracteres |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Categoria criada com sucesso",
  "data": {
    "categoria": {
      "CategoriaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "UsuarioCPF": "12345678901",
      "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
      "CategoriaNome": "Provas Antigas",
      "CreatedAt": "2026-07-17T10:00:00.000Z",
      "UpdatedAt": "2026-07-17T10:00:00.000Z"
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - `categoria` ausente
```json
{ "success": false, "message": "Dados inválidos", "details": { "message": "O campo 'categoria' é obrigatório" } }
```

**400 Bad Request** - `MateriaGUID` ausente/inválido
```json
{ "success": false, "message": "MateriaGUID inválido", "details": { "message": "MateriaGUID é obrigatório e deve ser um UUID válido" } }
```

**400 Bad Request** - `CategoriaNome` fora de 2-100 caracteres
```json
{ "success": false, "message": "CategoriaNome inválido", "details": { "message": "CategoriaNome deve ter entre 2 e 100 caracteres" } }
```

**401 Unauthorized**
```json
{ "success": false, "message": "Usuário não autenticado", "data": null }
```

**404 Not Found** - Matéria não encontrada
```json
{ "success": false, "message": "Matéria não encontrada", "details": { "message": "Não existe matéria com id 660e8400-e29b-41d4-a716-446655440001" } }
```

**409 Conflict** - Nome duplicado para o mesmo professor+matéria
```json
{ "success": false, "message": "Categoria já existe", "details": { "message": "Você já tem uma categoria chamada \"Provas Antigas\" nesta matéria." } }
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/categoria-conteudo \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "categoria": { "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001", "CategoriaNome": "Provas Antigas" } }'
```

---

### List Categorias

**Endpoint:** `GET /api/categoria-conteudo`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MateriaGUID` | string | ❌ No | Filtra por matéria |
| `UsuarioCPF` | string | ❌ No | Filtra por professor |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Categorias listadas com sucesso",
  "data": {
    "categorias": [
      {
        "CategoriaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "UsuarioCPF": "12345678901",
        "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
        "CategoriaNome": "Provas Antigas",
        "CreatedAt": "2026-07-17T10:00:00.000Z",
        "UpdatedAt": "2026-07-17T10:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/categoria-conteudo?MateriaGUID=660e8400-e29b-41d4-a716-446655440001&UsuarioCPF=12345678901" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Update Categoria

**Endpoint:** `PUT /api/categoria-conteudo/:guid`

**URL Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `guid` | string | ✅ Yes | UUID da categoria | UUID v4 |

**Request Body:**
```json
{ "categoria": { "CategoriaNome": "Provas 2026" } }
```

**Request Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `categoria.CategoriaNome` | string | ✅ Yes | Novo nome | 2-100 caracteres |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Categoria atualizada com sucesso",
  "data": { "categoria": { "CategoriaGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "CategoriaNome": "Provas 2026" } }
}
```

**Error Responses:**

**400 Bad Request** - `CategoriaNome` ausente/fora do tamanho
```json
{ "success": false, "message": "CategoriaNome inválido", "details": { "message": "CategoriaNome deve ter entre 2 e 100 caracteres" } }
```

**403 Forbidden** - Não é o dono
```json
{ "success": false, "message": "Sem permissão", "details": { "message": "Você só pode editar suas próprias categorias." } }
```

**404 Not Found**
```json
{ "success": false, "message": "Categoria não encontrada", "details": { "message": "Não existe categoria com id 7c9e6679-..." } }
```

**409 Conflict** - Novo nome já usado em outra categoria do mesmo professor+matéria
```json
{ "success": false, "message": "Categoria já existe" }
```

**cURL Example:**
```bash
curl -X PUT https://api.example.com/api/categoria-conteudo/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{ "categoria": { "CategoriaNome": "Provas 2026" } }'
```

---

### Delete Categoria

**Endpoint:** `DELETE /api/categoria-conteudo/:guid`

**Success Response (200 OK):**
```json
{ "success": true, "message": "Categoria excluída com sucesso", "data": null }
```

**Error Responses:**

**403 Forbidden** - Não é o dono
```json
{ "success": false, "message": "Sem permissão", "details": { "message": "Você só pode excluir suas próprias categorias." } }
```

**404 Not Found**
```json
{ "success": false, "message": "Categoria não encontrada" }
```

**cURL Example:**
```bash
curl -X DELETE https://api.example.com/api/categoria-conteudo/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Data Models

### CategoriaConteudo Entity

```typescript
interface CategoriaConteudoDTO {
  CategoriaGUID: string;   // UUID v4
  UsuarioCPF: string;      // dono (professor que criou)
  MateriaGUID: string;     // FK para materia
  CategoriaNome: string;   // 2-100 caracteres
  CreatedAt: string;       // ISO 8601
  UpdatedAt: string;       // ISO 8601
}
```

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS `categoriaconteudo` (
  `CategoriaGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `MateriaGUID` CHAR(36) NOT NULL,
  `CategoriaNome` VARCHAR(100) NOT NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_categoriaconteudo` (`UsuarioCPF`, `MateriaGUID`, `CategoriaNome`),
  CONSTRAINT `FK_CategoriaConteudo_Usuario` FOREIGN KEY (`UsuarioCPF`)
    REFERENCES `usuario` (`UsuarioCPF`) ON UPDATE CASCADE,
  CONSTRAINT `FK_CategoriaConteudo_Materia` FOREIGN KEY (`MateriaGUID`)
    REFERENCES `materia` (`MateriaGUID`) ON UPDATE CASCADE
);
```

Fonte: `backend/database/migrations/2026-07-15-add-conteudo.sql`.

---

## Business Rules

1. **Categoria é pessoal por matéria** — `UNIQUE KEY (UsuarioCPF, MateriaGUID, CategoriaNome)` garante que o mesmo professor não tenha duas categorias com o mesmo nome na mesma matéria; nomes iguais são permitidos entre professores diferentes ou matérias diferentes.
2. **Criação não valida vínculo de professor com a matéria** — `criarCategoria` só checa que a `Materia` existe (`MateriaDAO.findById`); não valida `materiaxprofessorxturma` — ⚠️ A confirmar: possível lacuna, diferente de [conteudo-api.md](conteudo-api.md), que exige alocação ativa do professor na matéria+turma.
3. **Editar/excluir exclusivo do criador** — `categoria.UsuarioCPF !== usuarioCPF` gera 403 em ambos os endpoints.
4. **Excluir categoria não exclui conteúdos** — `conteudo.CategoriaGUID` tem `ON DELETE SET NULL`, então conteúdos anteriormente categorizados ficam sem categoria (`CategoriaGUID=null`) ao invés de serem removidos.

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | Dados inválidos | `categoria` ausente no body |
| 400 | MateriaGUID inválido | Ausente ou não é UUID v4 |
| 400 | CategoriaNome inválido | Ausente ou fora de 2-100 caracteres |
| 401 | Usuário não autenticado | Token ausente/inválido |
| 403 | Sem permissão | Update/Delete por quem não é o criador |
| 404 | Matéria não encontrada | `MateriaGUID` inexistente na criação |
| 404 | Categoria não encontrada | GUID inexistente |
| 409 | Categoria já existe | Nome duplicado para o mesmo professor+matéria |

---

## Examples

### Cenário 1: Professor organiza conteúdo em categorias
```bash
POST /api/categoria-conteudo
{ "categoria": { "MateriaGUID": "660e8400-...", "CategoriaNome": "Provas Antigas" } }
# Response 201
```

### Cenário 2: Tentar criar categoria duplicada (❌ Erro)
```bash
POST /api/categoria-conteudo
{ "categoria": { "MateriaGUID": "660e8400-...", "CategoriaNome": "Provas Antigas" } }
# mesmo professor, mesma matéria, mesmo nome

Response 409:
{ "success": false, "message": "Categoria já existe" }
```

---

## Integration with Other Entities

- **CategoriaConteudo → Conteudo**: categoria usada para organizar conteúdos de aula (`Conteudo.CategoriaGUID`) — ver [conteudo-api.md](conteudo-api.md).
- **CategoriaConteudo → Materia**: cada categoria pertence a uma matéria — ver [materia-api.md](materia-api.md).

---

## Notes

- Datas retornadas em ISO 8601.
- `CategoriaGUID` gerado no backend (uuid v4).
