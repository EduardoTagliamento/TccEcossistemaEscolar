# Plano de Implementação — Chaves de API para Parceiros Externos

**Status:** 🟢 Implementado (infraestrutura completa) + parcialmente ligado aos recursos de leitura do v1. Ver seção 9.
**Não confundir com:** `docs/API_KEYS_GUIDE.md` (guia de como o *próprio* backend guarda chaves de serviços externos — OpenAI, Resend etc. — no `.env`; assunto completamente diferente).
**Contexto:** hoje a API do Bauá só tem um jeito de autenticar: login pessoal (`POST /api/auth/login`) que devolve um JWT preso a um `UsuarioGUID`. Não existe nenhum mecanismo para uma aplicação externa (um parceiro, uma integração, um script de terceiro) chamar a API sem ser através da sessão de uma pessoa.

---

## 1. Objetivo

Permitir que uma organização parceira (ex.: uma secretaria de educação, um sistema de gestão escolar terceiro) consuma partes da API do Bauá de forma programática, autenticando-se com uma **chave de API** emitida pela própria escola — sem precisar de login de uma pessoa real.

Diferença fundamental em relação ao JWT atual: uma chave representa **uma aplicação**, não uma pessoa. Ela não tem papel (`FuncaoId`) nem faz sentido carregar `UsuarioNome`/`UsuarioEmail` — precisa de um modelo de permissão próprio.

---

## 2. Decisões de design

Validadas com o usuário:

- **Escopo de recursos do v1**: `usuario`, `turma`, `matricula`, `tarefa`, `prova`, `aviso` — todos em modo leitura primeiro. Escrita via chave de API fica para v2.
- **Quem emite**: só Direção da escola (mais restrito que Aviso/Evento, que já liberam Coordenação/Secretaria — uma chave de API é mais sensível que um comunicado).
- **Auditoria**: chamadas autenticadas por chave entram na mesma trilha de auditoria que a Direção já vê, via coluna nova `ApiKeyGUIDAtor` (lado a lado com `UsuarioGUIDAtor`) — não fica em log técnico separado.
- **Limite de chaves ativas por escola**: nenhum no v1 — reavaliar só se virar problema real.

Propostas (ainda sem confirmação explícita, mas coerentes com o que já foi validado):

- **Escopo por escola, não global**: uma chave pertence a uma `EscolaGUID` só. Um parceiro que atende várias escolas precisaria de uma chave por escola (mais simples de revogar e auditar; evita uma chave vazar dados de escolas sem relação com o incidente).
- **Autenticação no mesmo header, sem rota nova de login**: continua `Authorization: Bearer <token>`. O middleware detecta o formato — três segmentos separados por `.` (JWT) vs. prefixo `baua_` (chave de API) — e direciona para o fluxo certo. Isso significa que documentação e exemplos de código do parceiro ficam idênticos aos que já existem, só trocando o valor do token.
- **Permissões por escopo explícito, não por papel emprestado**: cada chave carrega uma lista de escopos tipo `["usuario:leitura", "tarefa:leitura"]`, verificada nos endpoints — não herda o acesso amplo de um papel humano (Direção/Coordenação).
- **Segredo mostrado uma única vez**: como Stripe/GitHub — na criação, a resposta traz a chave completa (`baua_live_<32 chars aleatórios>`); depois disso só o prefixo visível (`baua_live_51H4f...`) fica disponível, para a escola reconhecer qual chave é qual sem conseguir reconstruí-la.
- **Revogação é soft-delete** (`ApiKeyStatus: 'Ativa' | 'Revogada'`), preservando o registro para auditoria — igual ao padrão já usado em `EscolaxUsuarioxFuncao.Status`.
- **Rate limit próprio por chave**, separado do limite de rotas humanas — impede que uma integração com bug (ou um parceiro mal comportado) consuma a cota de todo mundo.

---

## 3. Modelo de dados (proposto)

Segue o esqueleto padrão do projeto (`entities` → `repositories` → `services` → `controllers` → `routes`, registrados em `backend/Server.ts`).

Tabela nova: `apikey`

| Campo | Tipo | Observação |
|---|---|---|
| `ApiKeyGUID` | CHAR(36) PK | |
| `EscolaGUID` | CHAR(36) FK | escola dona da chave |
| `ApiKeyNome` | VARCHAR(100) | rótulo livre, ex. "Integração Secretaria Digital" |
| `ApiKeyPrefixo` | VARCHAR(16) | parte visível pra sempre (`baua_live_51H4f...`), só pra identificação na UI |
| `ApiKeyHashSecreto` | CHAR(64) UNIQUE | SHA-256 do segredo completo — nunca guardamos o valor em texto puro |
| `ApiKeyEscopos` | JSON | array de strings, ex. `["usuario:leitura","tarefa:leitura"]` |
| `ApiKeyStatus` | ENUM('Ativa','Revogada') | default `Ativa` |
| `ApiKeyCriadoPorGUID` | CHAR(36) FK → Usuario | quem emitiu (sempre uma Direção) |
| `ApiKeyUltimoUsoEm` | TIMESTAMP NULL | atualizado a cada chamada autenticada (permite a escola ver chave "morta") |
| `ApiKeyCreatedAt` / `ApiKeyUpdatedAt` | TIMESTAMP | padrão do projeto |

Por que hash SHA-256 e não bcrypt (como senha de usuário): o middleware precisa achar a chave por **lookup exato indexado** a cada requisição (potencialmente centenas por minuto vindas de uma integração), não por comparação lenta proposital contra tentativas de força bruta — o segredo já tem entropia alta o suficiente (32 caracteres aleatórios) para não precisar do custo computacional do bcrypt.

---

## 4. Fluxo proposto

**Emissão:**
1. Direção acessa uma tela nova (ex. `/dashboard/[escolaGUID]/gestao-dados/api-keys`), escolhe nome e escopos, confirma.
2. `POST /api/api-key` gera o segredo (`crypto.randomBytes`), calcula o hash, grava a linha, e devolve **o valor completo da chave uma única vez** na resposta.
3. A tela deixa claro que aquele valor não vai aparecer de novo — precisa ser copiado/guardado pelo parceiro nesse momento.

**Uso pelo parceiro:**
1. Parceiro chama qualquer endpoint liberado no seu escopo com `Authorization: Bearer baua_live_...`.
2. `AuthMiddleware` (ou um novo `ApiKeyMiddleware` acoplado a ele) detecta o prefixo, calcula o hash do valor recebido, busca por `ApiKeyHashSecreto`, confere `ApiKeyStatus='Ativa'`.
3. Requisição segue com `req.apiKey = { ApiKeyGUID, EscolaGUID, Escopos }` no lugar de `req.user` — os controllers que hoje leem `req.user.UsuarioGUID` para regra de negócio (ex. anotação pessoal, chat) precisam recusar chamadas de API key (essas rotas não fazem sentido para uma aplicação, só para uma pessoa).
4. Um middleware de escopo, parecido com o `plataformaAdminGuard` que já existe, barra com 403 se o escopo necessário da rota não estiver na lista da chave.

**Gestão:**
- `GET /api/api-key` — lista as chaves da escola (sem o segredo, só prefixo + metadados).
- `DELETE /api/api-key/:guid` — revoga (soft delete).

---

## 5. Segurança e limites

- Rate limit dedicado por `ApiKeyGUID` (reaproveitando o padrão de `backend/middlewares/rate-limit.middleware.ts`, cabeçalhos `RateLimit-*` já usados no resto da API), separado do limite de rotas humanas.
- Toda chamada autenticada por chave grava em auditoria via `AuditoriaService.registrar` — o serviço passa a aceitar `ApiKeyGUIDAtor` como alternativa a `UsuarioGUIDAtor` (coluna nova, nunca os dois preenchidos ao mesmo tempo), aparecendo na mesma trilha que a Direção já consulta hoje.
- Nunca logar o segredo completo, nem no `console.log` nem em mensagem de erro — só o prefixo, seguindo a mesma prática que `docs/API_KEYS_GUIDE.md` já recomenda pras chaves de serviço.
- Rotação: emitir uma chave nova e revogar a antiga é o único fluxo — não existe "trocar o segredo mantendo o mesmo `ApiKeyGUID`".

---

## 6. Fora do escopo (v1)

- Escrita via chave de API (v1 só libera escopos de leitura — endpoints de escrita ficam para uma v2, depois de validar o modelo de escopo em produção).
- Chave multi-escola (uma chave por escola só).
- Rotação automática/expiração programada (`ApiKeyExpiraEm`) — pode entrar depois se surgir demanda.
- UI de analytics de uso por chave (além do `ApiKeyUltimoUsoEm`).
- Documentar isso na página de docs da API (`API Bauá - Documentação.dc.html`) — feito só depois que o design estiver aprovado e (idealmente) implementado, pra não documentar algo que ainda pode mudar de forma.

---

## 7. Arquivos a criar (quando aprovado)

**Backend:**
- `backend/database/migrations/<data>-apikey.sql`
- `backend/entities/apikey.model.ts`
- `backend/repositories/apikey.repository.ts`
- `backend/services/apikey.service.ts`
- `backend/schemas/apikey.schema.ts`
- `backend/middlewares/apikey.middleware.ts` (detecção de prefixo + validação de escopo)
- `backend/controllers/apikey.controller.ts`
- `routes/apikey.routes.ts` (registrar em `backend/Server.ts` como `/api/api-key`)
- Ajuste em `backend/middlewares/auth.middleware.ts` para delegar ao novo middleware quando o token não for um JWT

**Frontend:**
- `frontend/lib/api/apikey.api.ts`
- `frontend/app/dashboard/[escolaGUID]/gestao-dados/api-keys/page.tsx` (+ `page.module.css`) — emissão, listagem, revogação
- Card novo em `frontend/app/dashboard/[escolaGUID]/gestao-dados/page.tsx`, restrito a Direção

Todos os itens acima estão implementados e compilam limpo (`tsc --noEmit`, backend e frontend). A migration (`backend/database/migrations/2026-09-13-apikey.sql`) ainda precisa ser aplicada manualmente no MySQL — sem acesso de escrita em produção pelo assistente.

---

## 9. Status por recurso (escopo de leitura do v1)

Ligar um recurso ao mecanismo de chave de API tem duas partes: (1) o gate de escopo na rota (`ApiKeyAuthMiddleware.exigirEscopo(...)`), e (2) o controller forçar a `EscolaGUID` da própria chave, ignorando o que o chamador pediu — pra uma chave da Escola A nunca conseguir ler dado da Escola B. A segunda parte só é simples quando o recurso já é filtrável por `EscolaGUID` sem precisar de um `UsuarioGUID` humano — nem todo recurso do v1 está nesse formato.

| Recurso | `GET /` (listar) | `GET /:guid` (buscar um) | Observação |
|---|---|---|---|
| `turma` | ✅ Ligado | ✅ Ligado | Referência original — nenhuma lógica extra, o controller nunca dependeu de `UsuarioGUID`. |
| `matricula` | ✅ Ligado | ✅ Ligado | `MatriculaService.obterEscolaGUID` resolve `EscolaGUID` por registro (via `TurmaGUID -> turma`, ou `GrupoEletivoGUID -> grupoeletivo` na matrícula-sombra) reaproveitando `#turmaDAO` já injetado — sem SQL novo no repository. |
| `tarefa` | ✅ Ligado | ✅ Ligado | `TarefaAcademicaService.obterEscolaGUID` resolve via `matXprofXturxescGUID -> alocação -> turma/grupo eletivo`, reaproveitando os resolvers privados que já existiam (`#resolverEscolaGUIDPorMatricula` etc.) e o `#alocacaoDAO` já injetado. |
| `aviso` | ✅ Ligado | ⏸️ Não se aplica | `index()` usa `AvisoService.listarAvisosViaApiKey`, que pula a checagem de papel humano (Coordenação/Secretaria/Direção) — a autorização da chave já vem do escopo concedido na emissão. `show()` não foi ligado de propósito: marca visualização (`avisoxusuario`) como efeito colateral, o que não faz sentido pra uma chamada de máquina. |
| `prova` | ✅ Ligado | ✅ Ligado | `ProvaAgendadaDAO` ganhou filtro por `EscolaGUID` em `findAll` (via `EXISTS` na tabela pivô `provaagendada_turma -> turma`, sem duplicar linha) e um método novo `pertenceAEscola` pro guard de `show()` — nenhum dos dois existia antes. |
| `usuario` | ✅ Ligado (com cautela) | ✅ Ligado (com cautela) | O recurso exigiu autenticação NOVA: `GET /api/usuario` e `GET /api/usuario/:UsuarioGUID` eram rotas 100% públicas (sem qualquer middleware de auth) — pra não quebrar quem já chama sem token, usei uma variante *leniente* (`AuthMiddleware.optionalAuth` estendido + `ApiKeyAuthMiddleware.authenticateOpcional`/`exigirEscopoSeChave`): sem token ou chave inválida, comportamento idêntico ao de sempre (aberto, filtro só por nome); com uma chave válida e escopo `usuario:leitura`, a listagem/busca fica restrita a quem tem vínculo ATIVO na escola da chave (`UsuarioDAO.findAllByEscola`/`pertenceAEscola`, novos, via join com `escolaxusuarioxfuncao`). Humano continua exatamente como estava — nenhuma nova restrição pra quem já usava a rota. |

**Resumo:** os 6 recursos do v1 respondem a chave de API. Único recurso sem `show()` é `aviso`, por decisão deliberada (efeito colateral de "marcar como visto" não faz sentido pra uma integração). Tudo compila limpo (`tsc --noEmit`, backend e frontend) — falta só rodar a migration em produção e testar de ponta a ponta com uma chave real.
