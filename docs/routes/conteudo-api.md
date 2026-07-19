# API Documentation - Conteúdo de Aula (Conteudo)

**Version:** 1.0.0
**Base URL:** `/api/conteudo`
**Content-Type:** `multipart/form-data` (criação) / `application/json` (demais)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [Create Conteúdo](#create-conteúdo)
  - [List Conteúdos](#list-conteúdos)
  - [Get Conteúdo by ID](#get-conteúdo-by-id)
  - [Delete Conteúdo](#delete-conteúdo)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Error Codes](#error-codes)
- [Examples](#examples)
- [Integration with Other Entities](#integration-with-other-entities)
- [Notes](#notes)

---

## Overview

API para o professor publicar **material de aula** para uma ou mais turmas, em três formatos possíveis (`ConteudoTipo`):
- **`cronometrado`**: vídeo/áudio, enviado como arquivo (upload direto para Cloudflare R2) ou como link externo (YouTube etc.).
- **`texto`**: conteúdo em HTML rico (sanitizado no backend).
- **`paginado`**: uma coleção ordenada de arquivos (PDF/PPTX/DOCX ou imagens), cada um virando uma "página".

Um conteúdo pode ser publicado para **múltiplas turmas de uma vez**, com uma data de publicação compartilhada e, opcionalmente, uma data específica por turma (`DatasPorTurma`) — mesmo padrão de "prazo por matrícula" usado em [tarefaacademica-api.md](tarefaacademica-api.md).

**Permissões:**
- **Criar**: qualquer usuário autenticado que tenha alocação `Ativa` (`materiaxprofessorxturma`) na matéria informada, para **todas** as turmas selecionadas.
- **Excluir**: apenas o `UsuarioCPF` que criou o conteúdo.
- **Listar/Buscar**: qualquer usuário autenticado, sem restrição adicional (a rota não filtra por vínculo com a turma).

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

### Create Conteúdo

Cria um conteúdo de aula. Requisição `multipart/form-data`; campos JSON complexos (`TurmasGUID`, `DatasPorTurma`) vão como strings JSON dentro do form.

**Endpoint:** `POST /api/conteudo`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Fields:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `MateriaGUID` | string | ✅ Yes | UUID da matéria | UUID v4 |
| `ConteudoTitulo` | string | ✅ Yes | Título | Mínimo 2 caracteres |
| `ConteudoTipo` | string | ✅ Yes | Tipo de conteúdo | `cronometrado`, `texto` ou `paginado` |
| `ConteudoDescricao` | string | ❌ No | Descrição livre | Máx. 1024 caracteres (validado na entidade) |
| `TurmasGUID` | string (JSON) | ✅ Yes | Array JSON de UUIDs de turma | Ex.: `'["880e8400-...","990e8400-..."]'`; ao menos 1 turma |
| `ConteudoDataPublicacao` | string | ✅ Yes | Data/hora de publicação (compartilhada) | ISO 8601 válida |
| `DatasPorTurma` | string (JSON) | ❌ No | Objeto JSON `{ TurmaGUID: data }` com override por turma | Cada chave deve estar em `TurmasGUID` |
| `CategoriaGUID` | string | ❌ No | UUID de categoria pessoal do professor | Deve pertencer ao professor e à mesma matéria |
| `OrigemTipo` | string | ⚠️ Condicional | `upload` ou `link` | Obrigatório se `ConteudoTipo='cronometrado'` |
| `LinkUrl` | string | ⚠️ Condicional | URL do vídeo/áudio externo | Obrigatório se `OrigemTipo='link'` |
| `ConteudoHtml` | string | ⚠️ Condicional | HTML do conteúdo (sanitizado no backend) | Obrigatório se `ConteudoTipo='texto'` |
| `arquivo` | file | ⚠️ Condicional | Arquivo de vídeo/áudio | Obrigatório se `ConteudoTipo='cronometrado'` e `OrigemTipo='upload'`; máx. 150MB; MIME em `video/mp4`, `video/webm`, `video/quicktime`, `audio/mpeg`, `audio/mp3`, `audio/mp4`, `audio/wav`, `audio/x-wav` |
| `arquivos` | file[] | ⚠️ Condicional | Até 30 arquivos, em ordem | Obrigatório (≥1) se `ConteudoTipo='paginado'`; MIME em PDF/PPT(X)/DOC(X)/JPEG/PNG/WEBP/GIF |

**Success Response (201 Created) — exemplo `texto`:**
```json
{
  "success": true,
  "message": "Conteúdo criado com sucesso",
  "data": {
    "conteudo": {
      "ConteudoGUID": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "MateriaGUID": "660e8400-e29b-41d4-a716-446655440001",
      "UsuarioCPF": "12345678901",
      "CategoriaGUID": null,
      "ConteudoTitulo": "Resumo - Revolução Industrial",
      "ConteudoTipo": "texto",
      "ConteudoDescricao": null,
      "ConteudoDataPublicacao": "2026-07-20T08:00:00.000Z",
      "Turmas": [
        { "TurmaGUID": "880e8400-e29b-41d4-a716-446655440001", "ConteudoDataPublicacao": "2026-07-20T08:00:00.000Z" }
      ],
      "Texto": { "ConteudoHtml": "<p>Resumo sanitizado...</p>" },
      "CreatedAt": "2026-07-17T10:00:00.000Z",
      "UpdatedAt": "2026-07-17T10:00:00.000Z"
    }
  }
}
```

**Success Response (201 Created) — exemplo `cronometrado` (upload):**
```json
{
  "data": {
    "conteudo": {
      "ConteudoTipo": "cronometrado",
      "Cronometrado": {
        "OrigemTipo": "upload",
        "ArquivoUrl": "https://<bucket>.r2.dev/conteudo/7c9e6679-.../arquivo.mp4",
        "LinkUrl": null,
        "DuracaoSegundos": null,
        "ArquivoMimeType": "video/mp4"
      }
    }
  }
}
```

**Success Response (201 Created) — exemplo `paginado`:**
```json
{
  "data": {
    "conteudo": {
      "ConteudoTipo": "paginado",
      "Paginado": {
        "Arquivos": [
          { "Ordem": 1, "ArquivoUrl": "https://<bucket>.r2.dev/conteudo/7c9e6679-.../pagina-1.pdf", "ArquivoMimeType": "application/pdf" }
        ]
      }
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Campos obrigatórios/formato (middleware — `MateriaGUID`, `ConteudoTitulo`, `ConteudoTipo`, `TurmasGUID`, `ConteudoDataPublicacao`, `OrigemTipo` condicional, `ConteudoHtml` condicional)

**400 Bad Request** - `TurmasGUID`/`DatasPorTurma` não é JSON válido (controller)
```json
{ "success": false, "message": "TurmasGUID inválido", "details": { "message": "TurmasGUID deve ser um array JSON de UUIDs." } }
```

**400 Bad Request** - Nenhuma turma selecionada (service)
```json
{ "success": false, "message": "Nenhuma turma selecionada", "details": { "message": "É necessário selecionar pelo menos uma turma." } }
```

**400 Bad Request** - Categoria inválida (não existe, não é do professor, ou é de outra matéria)
```json
{ "success": false, "message": "Categoria inválida", "details": { "message": "A categoria informada não existe ou não pertence a você/esta matéria." } }
```

**400 Bad Request** - Regras específicas de tipo: `Arquivo obrigatório` (cronometrado/upload sem arquivo), `LinkUrl é obrigatório`/`LinkUrl inválido` (cronometrado/link), `Conteúdo de texto vazio` (texto sem HTML após sanitização), `Nenhum arquivo enviado` (paginado sem arquivos)

**400 Bad Request** - Arquivo grande demais / tipo de arquivo inválido (middleware de upload)
```json
{ "success": false, "message": "Arquivo muito grande", "details": { "message": "O arquivo não pode ser maior que 150MB" } }
```
```json
{ "success": false, "message": "Tipo de arquivo inválido", "details": { "message": "Tipo de arquivo \"application/zip\" não é permitido para o campo \"arquivos\".", "allowedTypes": ["application/pdf", "..."] } }
```

**401 Unauthorized**
```json
{ "success": false, "message": "Usuário não autenticado", "data": null }
```

**403 Forbidden** - Professor não leciona a matéria em alguma das turmas selecionadas
```json
{ "success": false, "message": "Sem permissão", "details": { "message": "Você não leciona esta matéria na turma 1º Ano A." } }
```

**404 Not Found** - Matéria ou turma não encontrada

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/conteudo \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "MateriaGUID=660e8400-e29b-41d4-a716-446655440001" \
  -F "ConteudoTitulo=Resumo - Revolução Industrial" \
  -F "ConteudoTipo=texto" \
  -F 'TurmasGUID=["880e8400-e29b-41d4-a716-446655440001"]' \
  -F "ConteudoDataPublicacao=2026-07-20T08:00:00.000Z" \
  -F "ConteudoHtml=<p>Resumo do conteúdo...</p>"
```

---

### List Conteúdos

**Endpoint:** `GET /api/conteudo`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `MateriaGUID` | string | ❌ No | Filtra por matéria |
| `UsuarioCPF` | string | ❌ No | Filtra por professor autor |
| `CategoriaGUID` | string | ❌ No | Filtra por categoria |
| `ConteudoTipo` | string | ❌ No | `cronometrado`, `texto` ou `paginado` |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Conteúdos listados com sucesso",
  "data": { "conteudos": [ /* mesmo formato do item de criação */ ], "total": 1 }
}
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/conteudo?MateriaGUID=660e8400-e29b-41d4-a716-446655440001&ConteudoTipo=texto" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Get Conteúdo by ID

**Endpoint:** `GET /api/conteudo/:guid`

**URL Parameters:**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `guid` | string | ✅ Yes | UUID do conteúdo | UUID v4 |

**Success Response (200 OK):** mesmo formato de item de `conteudos[]`, embrulhado em `data.conteudo`.

**Error Responses:**

**400 Bad Request** - GUID inválido
```json
{ "success": false, "message": "GUID inválido", "details": { "message": "O parâmetro GUID deve ser um UUID válido" } }
```

**404 Not Found**
```json
{ "success": false, "message": "Conteúdo não encontrado", "details": { "message": "Não existe conteúdo com id 7c9e6679-..." } }
```

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/conteudo/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Delete Conteúdo

Remove o conteúdo e suas atribuições de turma/subtabela (`ON DELETE CASCADE`) e, em segundo plano (sem bloquear a resposta), tenta remover os arquivos associados do Cloudflare R2.

**Endpoint:** `DELETE /api/conteudo/:guid`

**Success Response (200 OK):**
```json
{ "success": true, "message": "Conteúdo excluído com sucesso", "data": null }
```

**Error Responses:**

**403 Forbidden** - Não é o criador
```json
{ "success": false, "message": "Sem permissão", "details": { "message": "Você só pode excluir conteúdos que você mesmo criou." } }
```

**404 Not Found**
```json
{ "success": false, "message": "Conteúdo não encontrado" }
```

**cURL Example:**
```bash
curl -X DELETE https://api.example.com/api/conteudo/7c9e6679-7425-40de-944b-e07fc1f90ae7 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Data Models

### Conteudo (dados compartilhados)

```typescript
type ConteudoTipo = 'cronometrado' | 'texto' | 'paginado';

interface ConteudoDTO {
  ConteudoGUID: string;
  MateriaGUID: string;
  UsuarioCPF: string;               // professor autor
  CategoriaGUID: string | null;
  ConteudoTitulo: string;
  ConteudoTipo: ConteudoTipo;
  ConteudoDescricao: string | null;
  ConteudoDataPublicacao: string;   // ISO — data base compartilhada
  Turmas: { TurmaGUID: string; ConteudoDataPublicacao: string }[]; // data efetiva: override ?? base
  Cronometrado?: {
    OrigemTipo: 'upload' | 'link';
    ArquivoUrl: string | null;
    LinkUrl: string | null;
    DuracaoSegundos: number | null;
    ArquivoMimeType: string | null;
  };
  Texto?: { ConteudoHtml: string };
  Paginado?: { Arquivos: { Ordem: number; ArquivoUrl: string; ArquivoMimeType: string }[] };
  CreatedAt: string | null;
  UpdatedAt: string | null;
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
  CONSTRAINT `FK_CategoriaConteudo_Usuario` FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario` (`UsuarioCPF`) ON UPDATE CASCADE,
  CONSTRAINT `FK_CategoriaConteudo_Materia` FOREIGN KEY (`MateriaGUID`) REFERENCES `materia` (`MateriaGUID`) ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `conteudo` (
  `ConteudoGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `MateriaGUID` CHAR(36) NOT NULL,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `CategoriaGUID` CHAR(36) NULL,
  `ConteudoTitulo` VARCHAR(150) NOT NULL,
  `ConteudoTipo` ENUM('cronometrado','texto','paginado') NOT NULL,
  `ConteudoDescricao` VARCHAR(1024) NULL,
  `ConteudoDataPublicacao` DATETIME NOT NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `FK_Conteudo_Materia` FOREIGN KEY (`MateriaGUID`) REFERENCES `materia` (`MateriaGUID`) ON UPDATE CASCADE,
  CONSTRAINT `FK_Conteudo_Usuario` FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario` (`UsuarioCPF`) ON UPDATE CASCADE,
  CONSTRAINT `FK_Conteudo_Categoria` FOREIGN KEY (`CategoriaGUID`) REFERENCES `categoriaconteudo` (`CategoriaGUID`) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `conteudoturma` (
  `ConteudoTurmaGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `ConteudoGUID` CHAR(36) NOT NULL,
  `TurmaGUID` CHAR(36) NOT NULL,
  `ConteudoDataPublicacaoTurma` DATETIME NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_conteudoturma` (`ConteudoGUID`, `TurmaGUID`),
  CONSTRAINT `FK_ConteudoTurma_Conteudo` FOREIGN KEY (`ConteudoGUID`) REFERENCES `conteudo` (`ConteudoGUID`) ON DELETE CASCADE,
  CONSTRAINT `FK_ConteudoTurma_Turma` FOREIGN KEY (`TurmaGUID`) REFERENCES `turma` (`TurmaGUID`) ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `conteudocronometrado` (
  `ConteudoGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `OrigemTipo` ENUM('upload','link') NOT NULL,
  `ArquivoUrl` VARCHAR(500) NULL,
  `LinkUrl` VARCHAR(500) NULL,
  `DuracaoSegundos` INT NULL,
  `ArquivoMimeType` VARCHAR(100) NULL,
  CONSTRAINT `FK_ConteudoCronometrado_Conteudo` FOREIGN KEY (`ConteudoGUID`) REFERENCES `conteudo` (`ConteudoGUID`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `conteudotexto` (
  `ConteudoGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `ConteudoHtml` MEDIUMTEXT NOT NULL,
  CONSTRAINT `FK_ConteudoTexto_Conteudo` FOREIGN KEY (`ConteudoGUID`) REFERENCES `conteudo` (`ConteudoGUID`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `conteudopaginadoarquivo` (
  `ConteudoPaginadoArquivoGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `ConteudoGUID` CHAR(36) NOT NULL,
  `Ordem` INT NOT NULL,
  `ArquivoUrl` VARCHAR(500) NOT NULL,
  `ArquivoMimeType` VARCHAR(100) NOT NULL,
  CONSTRAINT `FK_ConteudoPaginadoArquivo_Conteudo` FOREIGN KEY (`ConteudoGUID`) REFERENCES `conteudo` (`ConteudoGUID`) ON DELETE CASCADE
);
```

Fonte: `backend/database/migrations/2026-07-15-add-conteudo.sql`.

---

## Business Rules

1. **Modelo "1 conteúdo → N turmas"**, análogo ao modelo normalizado de Tarefa Acadêmica: dados compartilhados em `conteudo`, atribuições em `conteudoturma`, cada uma com possível `ConteudoDataPublicacaoTurma` (override).
2. **Data base = menor data entre os overrides** — se `DatasPorTurma` for informado, `ConteudoDataPublicacao` da linha compartilhada vira o **menor** valor entre as datas por turma (mesma lógica de `TarefaAcademicaService.criarTarefa` — ver [tarefaacademica-api.md](tarefaacademica-api.md)).
3. **Professor precisa lecionar em TODAS as turmas selecionadas** — para cada `TurmaGUID` em `TurmasGUID`, verifica `materiaxprofessorxturma.findByMateriaTurmaProfessor(MateriaGUID, TurmaGUID, usuarioCPF)` com `AlocacaoStatus='Ativa'`; falha em qualquer uma bloqueia a criação inteira (403).
4. **Categoria deve ser do próprio professor e da mesma matéria** — se `CategoriaGUID` for informado e não bater com `UsuarioCPF`+`MateriaGUID`, 400 "Categoria inválida".
5. **Cada tipo tem sua própria subtabela e regra**:
   - `cronometrado`: exige `OrigemTipo`; se `upload`, exige arquivo no campo `arquivo` (enviado ao Cloudflare R2, chave `conteudo/{guid}/arquivo{ext}`); se `link`, exige `LinkUrl` válida (`new URL(...)`).
   - `texto`: exige `ConteudoHtml`, sanitizado no backend com `sanitize-html` (allowlist restrita de tags/atributos/estilos — ver `SANITIZE_HTML_OPTIONS` em `backend/services/conteudo.service.ts`); erro se ficar vazio após sanitização.
   - `paginado`: exige ao menos 1 arquivo no campo `arquivos` (até 30), cada um numerado por `Ordem` (1-based) e enviado ao R2 com chave `conteudo/{guid}/pagina-{n}{ext}`.
6. **Upload em memória, nunca disco local** — `conteudoUploadMiddleware` usa `multer.memoryStorage()`; os buffers vão direto para o Cloudflare R2 via `R2StorageService.upload`.
7. **Exclusão remove arquivos do R2 de forma assíncrona/best-effort** — a resposta HTTP não espera a remoção no R2 completar; falhas de remoção só geram `console.warn`, não afetam o `success` da resposta (`ConteudoService.excluirConteudo`).
8. **Exclusão restrita ao autor** — apenas `conteudo.UsuarioCPF === usuarioCPF` pode excluir; não há papel de admin com acesso a excluir conteúdo de outro professor.
9. **Leitura sem restrição de turma/matrícula** — `GET /` e `GET /:guid` não verificam se o usuário autenticado está matriculado/alocado nas turmas do conteúdo — ⚠️ A confirmar: possível lacuna de autorização (qualquer usuário autenticado pode ver qualquer conteúdo, inclusive de outra escola).

---

## Error Codes

| Status | Message | Cause |
|--------|---------|-------|
| 400 | `MateriaGUID`/`ConteudoTitulo`/`ConteudoTipo`/`TurmasGUID`/`ConteudoDataPublicacao` inválido | Falha de validação do middleware |
| 400 | `TurmasGUID inválido` / `DatasPorTurma inválido` | JSON malformado no form field |
| 400 | Nenhuma turma selecionada | `TurmasGUID` vazio após parse |
| 400 | Categoria inválida | `CategoriaGUID` de outro professor/matéria, ou inexistente |
| 400 | `OrigemTipo`/`LinkUrl`/`ConteudoHtml`/arquivo obrigatório (por tipo) | Regra condicional de `ConteudoTipo` não satisfeita |
| 400 | Tipo de arquivo inválido / Arquivo muito grande | Falha de validação do `multer` (MIME/tamanho) |
| 400 | GUID inválido | Parâmetro de rota mal formatado |
| 401 | Usuário não autenticado | Token ausente/inválido |
| 403 | Sem permissão | Professor sem alocação ativa em alguma turma selecionada, ou não é o autor (exclusão) |
| 404 | Matéria não encontrada / Turma não encontrada | Referência inexistente |
| 404 | Conteúdo não encontrado | GUID inexistente |

---

## Examples

### Cenário 1: Professor publica vídeo para duas turmas com datas diferentes
```bash
POST /api/conteudo (multipart/form-data)
MateriaGUID=660e8400-...
ConteudoTitulo=Aula 5 - Revolução Francesa
ConteudoTipo=cronometrado
OrigemTipo=link
LinkUrl=https://youtube.com/watch?v=abc123
TurmasGUID=["880e8400-...","990e8400-..."]
ConteudoDataPublicacao=2026-07-20T08:00:00.000Z
DatasPorTurma={"880e8400-...":"2026-07-20T08:00:00.000Z","990e8400-...":"2026-07-21T08:00:00.000Z"}
# Response 201
```

### Cenário 2: Professor sem alocação na turma tenta publicar (❌ Erro)
```bash
POST /api/conteudo
# TurmasGUID inclui uma turma onde o professor não leciona essa matéria

Response 403:
{ "success": false, "message": "Sem permissão", "details": { "message": "Você não leciona esta matéria na turma 2º Ano B." } }
```

---

## Integration with Other Entities

- **Conteudo → CategoriaConteudo**: categorização opcional pessoal — ver [categoriaconteudo-api.md](categoriaconteudo-api.md).
- **Conteudo → Materia / MaterialProfessorTurma**: exige alocação ativa do professor — ver [materia-api.md](materia-api.md) e [professor-api.md](professor-api.md).
- **Conteudo → Turma**: publicado para uma ou mais turmas via `conteudoturma` — ver [turma-api.md](turma-api.md).

---

## Notes

- Arquivos ficam hospedados no **Cloudflare R2**, não no disco local do servidor (diferente de [anexo-api.md](anexo-api.md) e [upload-api.md](upload-api.md), que usam `/uploads/`).
- `DuracaoSegundos` do conteúdo cronometrado existe no schema mas não é preenchido pelo fluxo de criação atual (`ConteudoCronometrado.DuracaoSegundos` fica `null`) — ⚠️ A confirmar se há processamento assíncrono posterior que o preenche.
- Datas retornadas em ISO 8601.
