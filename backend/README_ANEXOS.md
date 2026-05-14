# Sistema de Anexos - Fase 1 Implementada

## ✅ Arquivos Criados

### Entities
- `backend/entities/anexo.model.ts` - Interfaces TypeScript

### Middlewares
- `backend/middlewares/anexo-upload.middleware.ts` - Configuração Multer para uploads

### Repositories
- `backend/repositories/anexo.repository.ts` - DAO com queries SQL

### Services
- `backend/services/anexo.service.ts` - Regras de negócio

### Controllers
- `backend/controllers/anexo.controller.ts` - Endpoints REST

### Routes
- `routes/anexo.routes.ts` - Configuração de rotas Express

### Migrations
- `backend/database/migrations/003_calendario_anexos.sql` - Script SQL completo

## 🚀 Como Executar

### 1. Executar Migration no Banco de Dados

```bash
# Conectar ao MySQL
mysql -u root -p tccecossistemaescolar

# Executar migration
source backend/database/migrations/003_calendario_anexos.sql;

# Verificar tabelas criadas
SHOW TABLES LIKE '%anexo%';
```

**Ou usando Docker:**

```bash
docker exec -i tcc-mysql mysql -u root -p"senha" tccecossistemaescolar < backend/database/migrations/003_calendario_anexos.sql
```

### 2. Criar Diretório de Upload

```bash
# Windows (PowerShell)
New-Item -ItemType Directory -Force -Path uploads\anexos

# Linux/Mac
mkdir -p uploads/anexos
chmod 755 uploads/anexos
```

### 3. Instalar Dependência (se ainda não instalada)

```bash
npm install multer @types/multer
```

### 4. Iniciar Servidor

```bash
npm run dev
```

## 📋 Endpoints Disponíveis

### POST /api/anexo
Upload de arquivo

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Body (form-data):**
- `file`: arquivo (PDF, imagens, docs, etc.)
- `EscolaGUID`: UUID da escola

**Response:**
```json
{
  "success": true,
  "message": "Anexo enviado com sucesso",
  "data": {
    "anexo": {
      "AnexoGUID": "uuid-v4",
      "UsuarioCPF": "12345678901",
      "EscolaGUID": "escola-guid",
      "AnexoCaminho": "/uploads/anexos/uuid.pdf",
      "AnexoNomeOriginal": "trabalho.pdf",
      "AnexoTamanho": 1024000,
      "CreatedAt": "2026-05-14T10:00:00.000Z"
    }
  }
}
```

### GET /api/anexo/:guid
Buscar metadados do anexo

**Response:**
```json
{
  "success": true,
  "message": "Anexo encontrado",
  "data": {
    "anexo": { ... }
  }
}
```

### GET /api/anexo/:guid/download
Download do arquivo

**Response:** Arquivo binário

### DELETE /api/anexo/:guid
Excluir anexo (apenas dono ou admin)

**Response:**
```json
{
  "success": true,
  "message": "Anexo excluído com sucesso",
  "data": null
}
```

## 🧪 Testando com Postman

### 1. Upload de Arquivo

```
POST http://localhost:5000/api/anexo
Headers:
  Authorization: Bearer {seu-token}
Body (form-data):
  file: [selecionar arquivo]
  EscolaGUID: {guid-da-escola}
```

### 2. Buscar Anexo

```
GET http://localhost:5000/api/anexo/{guid}
Headers:
  Authorization: Bearer {seu-token}
```

### 3. Download

```
GET http://localhost:5000/api/anexo/{guid}/download
Headers:
  Authorization: Bearer {seu-token}
```

### 4. Deletar

```
DELETE http://localhost:5000/api/anexo/{guid}
Headers:
  Authorization: Bearer {seu-token}
```

## 🔒 Permissões

- **Upload:** Qualquer usuário autenticado
- **Visualizar:** Qualquer usuário autenticado (TODO: validar acesso)
- **Download:** Qualquer usuário autenticado (TODO: validar acesso)
- **Deletar:** Apenas o dono do arquivo OU admin da escola

## 📝 Tipos de Arquivo Permitidos

- PDF: `application/pdf`
- Imagens: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Word: `.doc`, `.docx`
- Excel: `.xls`, `.xlsx`
- Texto: `text/plain`
- ZIP: `application/zip`

**Tamanho máximo:** 50MB

## 🗂️ Estrutura de Armazenamento

```
uploads/
  anexos/
    ├── uuid-1.pdf
    ├── uuid-2.jpg
    ├── uuid-3.docx
    └── ...
```

**Observações:**
- Arquivos são renomeados com UUID v4 para evitar conflitos
- Nome original é preservado no banco de dados
- Caminho completo é salvo para servir via Express Static

## 🔗 Próximas Fases

✅ **Fase 1: Anexo** - IMPLEMENTADA

⏳ **Fase 2: Tarefa Acadêmica** - Próximo passo
- Criar entidade tarefaacademica
- Vincular anexos com `AnexoTipo` (descricao/entrega)
- Implementar permissões aluno/professor

⏳ **Fase 3-6:** Prova, Pendência, Evento, Calendário

## 🐛 Troubleshooting

### Erro: "Tipo de arquivo não permitido"
- Verifique se o MIME type está na lista permitida
- Use arquivos reais, não mocks

### Erro: "Arquivo físico não encontrado"
- Verifique se o diretório `uploads/anexos` existe
- Verifique permissões do diretório (chmod 755)

### Erro: "Escola não encontrada"
- Verifique se o EscolaGUID existe no banco
- Use um GUID válido de escola cadastrada

### Erro: "File too large"
- Tamanho máximo é 50MB
- Comprima o arquivo ou divida em partes

## 📚 Referências

- [PLANO_IMPLEMENTACAO_CALENDARIO_TAREFAS.md](../docs/PLANO_IMPLEMENTACAO_CALENDARIO_TAREFAS.md)
- [PLANEJAMENTO_TAREFAS_MATERIAS_PENDENCIAS.md](../docs/PLANEJAMENTO_TAREFAS_MATERIAS_PENDENCIAS.md)
