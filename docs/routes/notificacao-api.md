# API Documentation - Notificações

**Version:** 1.0.0
**Base URL:** `/api/notificacao`
**Content-Type:** `application/json`

Spec de implementação completa: [`docs/PLANO_IMPLEMENTACAO_NOTIFICACOES.md`](../PLANO_IMPLEMENTACAO_NOTIFICACOES.md).

---

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Endpoints](#endpoints)
  - [List Notificações](#list-notificações)
  - [Contar Não Lidas](#contar-não-lidas)
  - [Marcar Como Lida](#marcar-como-lida)
  - [Marcar Todas Como Lidas](#marcar-todas-como-lidas)
  - [List Tipos (Catálogo)](#list-tipos-catálogo)
  - [List Preferências](#list-preferências)
  - [Update Preferência](#update-preferência)
- [Data Models](#data-models)
- [Business Rules](#business-rules)
- [Real-time (WebSocket)](#real-time-websocket)
- [Error Codes](#error-codes)
- [Notes](#notes)

---

## Overview

Sistema central de notificações do Ecossistema Escolar. Cada notificação pertence a um `NotificacaoTipo` do catálogo (ex.: `tarefa_postada`, `pendencia_criada`, `tarefa_prazo_amanha`), dividido em duas categorias:

- **Aviso** — disparado por uma ação de outro usuário (professor postou tarefa, pendência criada, etc.).
- **Lembrete** — disparado por um job diário (cron), ex.: tarefa que vence amanhã.

Toda notificação sempre aparece no feed in-app (`GET /api/notificacao`), independente de canal. Além disso, o usuário escolhe — por tipo — se também quer receber por **e-mail** (via Resend) e/ou **WhatsApp** (canal com a interface pronta, mas ainda sem provedor real conectado — Evolution API é trabalho futuro).

**Conceito:**
- `NotificacaoTipo` — catálogo estático (seed via migration), com o texto padrão, categoria e os valores padrão de e-mail/whatsapp.
- `Notificacao` — uma linha por destinatário por evento; é o que a rota `GET /api/notificacao` retorna.
- `UsuarioNotificacaoPreferencia` — override esparso: só existe linha quando o usuário muda o padrão do catálogo para um tipo específico. Preferência é **global por usuário**, não por escola.
- `NotificacaoEnvio` (não exposto via API — auditoria interna) — status de entrega por canal, com chave única `(NotificacaoGUID, Canal)` pra evitar reenvio duplicado.

**Permissões:**
- Todas as rotas exigem autenticação; cada usuário só enxerga/gerencia suas próprias notificações e preferências (não há parâmetro de usuário — tudo é resolvido a partir do JWT).

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
  "details": { /* detalhes adicionais, opcional */ }
}
```

---

## Endpoints

### List Notificações

Lista as notificações do usuário logado, mais recentes primeiro.

**Endpoint:** `GET /api/notificacao`

**Query params (opcionais):**
| Campo | Tipo | Descrição |
|---|---|---|
| `lida` | boolean | `true`/`false` — filtra por lida ou não lida |
| `limit` | number | Paginação |
| `offset` | number | Paginação |

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Notificações listadas com sucesso",
  "data": {
    "notificacoes": [
      {
        "NotificacaoGUID": "uuid",
        "NotificacaoTipoId": 3,
        "UsuarioCPF": "12345678900",
        "EscolaGUID": "uuid",
        "NotificacaoTitulo": "Nova tarefa: Trabalho de Geografia",
        "NotificacaoConteudo": "Entrega até sexta-feira",
        "NotificacaoEntidadeTipo": "tarefa",
        "NotificacaoEntidadeGUID": "uuid",
        "NotificacaoLink": "/dashboard/uuid/tarefas/uuid",
        "NotificacaoLida": false,
        "NotificacaoLidaData": null,
        "NotificacaoCreatedAt": "2026-07-17T10:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

---

### Contar Não Lidas

Total de notificações não lidas — usado no badge do sino.

**Endpoint:** `GET /api/notificacao/contador`

**Success Response:** `200 OK`
```json
{ "success": true, "message": "Total de notificações não lidas", "data": { "total": 4 } }
```

---

### Marcar Como Lida

**Endpoint:** `PATCH /api/notificacao/:NotificacaoGUID/lida`

Marca uma notificação específica como lida. Só afeta notificações do próprio usuário (filtro por `UsuarioCPF` do JWT).

**Success Response:** `200 OK` — retorna a notificação atualizada em `data.notificacao`.

---

### Marcar Todas Como Lidas

**Endpoint:** `PATCH /api/notificacao/lidas`

**Success Response:** `200 OK`
```json
{ "success": true, "message": "Notificações marcadas como lidas", "data": { "total": 4 } }
```
`total` é a quantidade de linhas afetadas.

---

### List Tipos (Catálogo)

Lista o catálogo completo de tipos de notificação — usado para montar a tela de preferências no frontend.

**Endpoint:** `GET /api/notificacao/tipos`

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Catálogo de tipos de notificação",
  "data": {
    "tipos": [
      {
        "NotificacaoTipoId": 3,
        "NotificacaoTipoSlug": "tarefa_postada",
        "NotificacaoTipoDescricao": "Professor postou uma tarefa",
        "NotificacaoTipoCategoria": "Aviso",
        "NotificacaoTipoEmailPadrao": true,
        "NotificacaoTipoWhatsappPadrao": true,
        "NotificacaoTipoAtivo": true,
        "FuncaoIds": [5]
      }
    ]
  }
}
```
`FuncaoIds` indica quais papéis (`funcao.FuncaoId`) veem esse tipo (1=Coordenação, 2=Secretaria, 3=Professor, 4=Responsável, 5=Aluno, 6=Direção).

---

### List Preferências

Preferências **efetivas** do usuário logado: para cada tipo do catálogo, o valor vigente — override do usuário se existir, senão o padrão do catálogo.

**Endpoint:** `GET /api/notificacao/preferencias`

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Preferências de notificação do usuário",
  "data": {
    "preferencias": [
      {
        "NotificacaoTipoId": 3,
        "NotificacaoTipoSlug": "tarefa_postada",
        "NotificacaoTipoDescricao": "Professor postou uma tarefa",
        "NotificacaoTipoCategoria": "Aviso",
        "PreferenciaEmailAtivo": true,
        "PreferenciaWhatsappAtivo": true,
        "Origem": "padrao"
      }
    ]
  }
}
```
`Origem: "padrao"` = ainda não foi customizado pelo usuário; `"usuario"` = existe override salvo.

---

### Update Preferência

Ativa/desativa e-mail e/ou WhatsApp para um tipo específico. Faz upsert em `usuarionotificacaopreferencia`.

**Endpoint:** `PUT /api/notificacao/preferencias/:NotificacaoTipoId`

**Request Body:**
```json
{
  "PreferenciaEmailAtivo": true,
  "PreferenciaWhatsappAtivo": false
}
```
Ambos os campos são obrigatórios e devem ser booleanos.

**Success Response:** `200 OK` — retorna a preferência salva em `data.preferencia`.

**Error Responses:**
- `400` — `NotificacaoTipoId` inválido, ou campos ausentes/não-booleanos
- `404` — tipo de notificação inexistente

---

## Data Models

### Notificacao (feed)
| Campo | Tipo | Descrição |
|---|---|---|
| NotificacaoGUID | string (UUID) | PK |
| NotificacaoTipoId | number | FK → notificacaotipo |
| UsuarioCPF | string | Destinatário |
| EscolaGUID | string (UUID) | Escola de contexto |
| NotificacaoTitulo | string | Até 150 caracteres |
| NotificacaoConteudo | string \| null | Até 500 caracteres |
| NotificacaoEntidadeTipo | string \| null | Referência polimórfica (ex: `"tarefa"`) |
| NotificacaoEntidadeGUID | string \| null | GUID da entidade referenciada, sem FK de banco |
| NotificacaoLink | string \| null | Deep link relativo pro frontend |
| NotificacaoLida | boolean | |
| NotificacaoLidaData | string (ISO) \| null | |
| NotificacaoCreatedAt | string (ISO) | |

### NotificacaoTipo (catálogo)
Ver seção [List Tipos](#list-tipos-catálogo) acima — 20 tipos seedados via migration, cobrindo Aluno/Professor/Coordenação/Secretaria/Direção. Lista completa e critério de cada tipo em `docs/PLANO_IMPLEMENTACAO_NOTIFICACOES.md`, seção 2.6.

---

## Business Rules

1. Uma notificação é sempre criada no feed in-app, independentemente das preferências de canal (canal é só sobre e-mail/whatsapp).
2. Preferência é resolvida como: override do usuário (`usuarionotificacaopreferencia`), senão o padrão do catálogo (`NotificacaoTipoEmailPadrao`/`WhatsappPadrao`).
3. Preferência é **global por usuário** — não varia por escola.
4. E-mail e WhatsApp são despachados em segundo plano (fire-and-forget); uma falha de envio nunca derruba a ação que originou a notificação (ex.: professor postar tarefa nunca falha por causa de um envio de e-mail com erro).
5. WhatsApp hoje é um canal "stub": loga a intenção de envio mas não tenta enviar de verdade (sem Evolution API ainda) e **não** grava linha de auditoria de envio para esse canal.
6. Idempotência de lembretes (cron): o mesmo tipo+entidade nunca gera uma segunda notificação pro mesmo usuário no mesmo dia, mesmo se o job rodar mais de uma vez.

---

## Real-time (WebSocket)

Toda notificação criada é emitida via Socket.io no evento `notificacao:nova`, na room pessoal `usuario:{UsuarioCPF}` (o socket entra nessa room automaticamente ao conectar, autenticado pelo mesmo JWT do REST). Payload = o mesmo formato de `Notificacao` listado acima.

---

## Error Codes

| Status | Descrição |
|---|---|
| 400 | Parâmetro inválido (ex.: `NotificacaoTipoId` não numérico, campos de preferência ausentes) |
| 401 | Não autenticado |
| 500 | Erro interno |

---

## Notes

- Rotas registradas em `backend/Server.ts` sob `/api/notificacao`, implementadas em `routes/notificacao.routes.ts` → `backend/controllers/notificacao.controller.ts` → `backend/services/notificacao.service.ts`.
- Ao contrário da maioria dos módulos do projeto (que fazem injeção de dependência manual por `*.routes.ts`), o disparo de notificações a partir de outros services (tarefa, prova, conteúdo, pendência, evento, convite de grupo, mensagens, etc.) usa um singleton leve — `getNotificacaoService()`, exportado de `backend/services/notificacao.service.ts` — pra evitar replicar a mesma injeção em ~10 services e suas respectivas routes factories. Ver comentário no próprio arquivo para o racional.
- Lembretes (`*_prazo_amanha`) rodam via `backend/services/notificacao.scheduler.ts` (node-cron, mesma biblioteca do `CleanupScheduler`), diariamente entre 07:00–07:15 (horário de Brasília).
- Gap conhecido: `mensagem_individual` ainda não dispara notificação — `conversa_individual` não carrega `EscolaGUID` nem um vínculo de escola resolvível, campo obrigatório em `Notificacao`. Fica documentado como dívida técnica (ver `docs/PLANO_IMPLEMENTACAO_NOTIFICACOES.md`, seção 2.6).
