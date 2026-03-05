# API Documentation - Escola x Usuario x Funcao

**Version:** 1.0.0  
**Base URL:** `/api/escolaxusuarioxfuncao`  
**Content-Type:** `application/json`

---

## Overview

API REST para gerenciamento de vinculos entre Escola, Usuario e Funcao (relacao N:N:N).

- 1 usuario pode ter multiplas funcoes em multiplas escolas.
- 1 escola pode ter multiplos usuarios com multiplas funcoes.
- 1 funcao pode ser atribuida a varios usuarios em varias escolas.

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Descricao da operacao",
  "data": {
    "escolaxusuarioxfuncao": {
      "EscolaxUsuarioxFuncaoId": 1,
      "UsuarioCPF": "123.456.789-00",
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "FuncaoId": 3,
      "FuncaoNome": "Professor"
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Descricao do erro",
  "details": {
    "message": "Detalhes especificos do erro"
  }
}
```

---

## Endpoints

### POST `/api/escolaxusuarioxfuncao`

Cria um novo vinculo entre Usuario, Escola e Funcao.

**Body:**
```json
{
  "escolaxusuarioxfuncao": {
    "UsuarioCPF": "123.456.789-00",
    "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
    "FuncaoId": 3
  }
}
```

**Regras:**
- `UsuarioCPF` deve existir em `usuario`.
- `EscolaGUID` deve existir em `escola`.
- `FuncaoId` deve existir em `funcao`.
- A combinacao `UsuarioCPF + EscolaGUID + FuncaoId` deve ser unica.

### GET `/api/escolaxusuarioxfuncao`

Lista vinculos. Suporta filtros opcionais por query string:

- `UsuarioCPF`
- `EscolaGUID`
- `FuncaoId`

Exemplo:

`GET /api/escolaxusuarioxfuncao?UsuarioCPF=123.456.789-00&FuncaoId=3`

### GET `/api/escolaxusuarioxfuncao/:EscolaxUsuarioxFuncaoId`

Busca vinculo por ID.

### PUT `/api/escolaxusuarioxfuncao/:EscolaxUsuarioxFuncaoId`

Atualiza um vinculo existente.

**Body:**
```json
{
  "escolaxusuarioxfuncao": {
    "FuncaoId": 2
  }
}
```

Pode atualizar `UsuarioCPF`, `EscolaGUID` e/ou `FuncaoId`.

### DELETE `/api/escolaxusuarioxfuncao/:EscolaxUsuarioxFuncaoId`

Remove vinculo por ID.

---

## Status Codes

- `200` Operacao executada com sucesso
- `201` Vinculo criado com sucesso
- `400` Erro de validacao de dados
- `404` Usuario, escola, funcao ou vinculo nao encontrado
- `409` Vinculo duplicado (tripla ja cadastrada)
- `500` Erro interno

---

## cURL Examples

### Criar vinculo
```bash
curl -X POST http://localhost:3000/api/escolaxusuarioxfuncao \
  -H "Content-Type: application/json" \
  -d '{
    "escolaxusuarioxfuncao": {
      "UsuarioCPF": "123.456.789-00",
      "EscolaGUID": "550e8400-e29b-41d4-a716-446655440000",
      "FuncaoId": 3
    }
  }'
```

### Listar vinculos por escola
```bash
curl "http://localhost:3000/api/escolaxusuarioxfuncao?EscolaGUID=550e8400-e29b-41d4-a716-446655440000"
```
