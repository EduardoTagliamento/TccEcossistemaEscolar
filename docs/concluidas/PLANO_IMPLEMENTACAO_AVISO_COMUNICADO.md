# Plano de Implementação — Aviso (Comunicado)

**Status:** ✅ Implementado (backend + frontend completos). Ver seção 6 para a lista de arquivos.
**Referência de API:** [`docs/routes/aviso-api.md`](routes/aviso-api.md) — este documento cobre o *porquê* das decisões; a referência completa de endpoints/schema/erros está lá.
**Não confundir com:** `docs/PLANO_IMPLEMENTACAO_AVISOS_TAREFAS_EVENTOS.md` (doc histórico que usa "avisos" como termo genérico pra Evento/Tarefa/Prova/Pendência — nada a ver com esta entidade nova).

---

## 1. Objetivo

Direção, Coordenação e Secretaria precisavam de um jeito de mandar comunicados institucionais — diferente de Tarefa/Prova (acadêmico) e de Evento (tem data). `Aviso`:

- não tem data própria, só existe uma vez, sem prazo/expiração;
- pode ter anexo opcional;
- na primeira vez que o destinatário loga depois de um aviso novo, ele aparece em **destaque grande na home** — clicar leva pra uma página dedicada de leitura, que marca a visualização e faz o destaque sumir nas próximas visitas;
- soma ao sistema de notificação já existente (sino, toast, e-mail/whatsapp).

---

## 2. Decisões de escopo

Validadas com o usuário antes da implementação:

- **Público-alvo**: quem cria escolhe entre "escola inteira" ou "turmas específicas" — mesmo padrão já usado em Tarefa/Prova (`AvisoAbrangencia: 'Escola' | 'Turmas'`, tabela `avisoxturma`).
- **Banner da home**: some depois da 1ª visualização do usuário (mas o aviso continua acessível pela lista/histórico); mostra só o mais recente não visto, não empilha vários.
- **Quem pode enviar**: Direção, Coordenação e Secretaria (`FuncaoId` 6, 1, 2) — reaproveita `EscolaxUsuarioxFuncaoDAO.isCoordSecretariaOuDirecaoEmEscola`, que já existia pronto pro caso exato.

Tomadas sem consulta explícita (documentadas aqui pra rastreabilidade):

- **Sem edição em v1** — só criar e excluir. Editar exigiria decidir se reabre a visualização de quem já viu; adiado até haver demanda real.
- **Turma-scoped alcança só alunos matriculados** — mesmo critério de alcance que Tarefa/Prova/Conteúdo já usam (não professor/responsável da turma).
- **Exclusão: autor ou Direção** — evita que uma Secretaria não consiga corrigir um erro de outra, mas sem abrir pra qualquer Coordenação/Secretaria excluir o aviso de outra pessoa.

---

## 3. Modelo de dados

Segue o esqueleto padrão do projeto (`entities` → `repositories` → `services` → `controllers` → `routes`, registrados em `backend/Server.ts`), usando `Anotacao` como template mais próximo (módulo simples, sem grupo/permissão em camadas).

4 tabelas novas — schema completo em [`aviso-api.md`](routes/aviso-api.md#database-schema) e na migration:

| Tabela | Papel |
|---|---|
| `aviso` | registro principal (título, conteúdo, abrangência, autor) |
| `avisoxturma` | turmas-alvo, só quando `AvisoAbrangencia='Turmas'` |
| `relacaoanexosaviso` | vínculo de anexo — 4º "braço" do padrão já usado por `relacaoanexostarefa`/`relacaoanexospendencia`/`relacaoanexosevento`, sem tabela pivot unificada (decisão de arquitetura pré-existente do projeto, não desta feature) |
| `avisoxusuario` | rastreio de "visto" — clone direto de `provaagendadavisualizacao` (`INSERT IGNORE` + `UNIQUE(AvisoGUID, UsuarioCPF)`) |

Migration: `backend/database/migrations/2026-08-09-aviso.sql` — precisa ser aplicada manualmente no MySQL (sem acesso de escrita em produção pelo assistente).

---

## 4. Fluxo

1. Direção/Coordenação/Secretaria abre `/dashboard/[escolaGUID]/gestao-dados/avisos`, preenche título/conteúdo/abrangência (+ turmas, se `Turmas`) e anexa um arquivo já enviado via `POST /api/anexo` (mesmo padrão de `TarefaAcademicaService.enviarAnexoEntrega`).
2. `POST /api/aviso` valida permissão, cria o registro, vincula turmas/anexo, e dispara `NotificacaoService.disparar({tipoSlug: 'aviso_publicado', ...})` pros destinatários resolvidos (escola inteira via `findUsuariosAtivosByEscolaEFuncoes`, ou turma via `MatriculaDAO.findByTurma`) — fora do caminho crítico (`.catch()`, não bloqueia a resposta).
3. Cada destinatário recebe a notificação no sino/toast normalmente (categoria `Aviso`, já reconhecida pelo widget "Avisos gerais" da home).
4. Na próxima visita à home, `GET /api/aviso/nao-visualizado` retorna esse aviso → banner grande aparece.
5. Ao clicar (ou entrar via notificação), `GET /api/aviso/:guid` devolve o conteúdo completo **e** grava `avisoxusuario` — próxima visita à home não traz mais esse aviso em destaque.

---

## 5. Fora do escopo (não implementado)

- Edição de aviso já publicado.
- Agendamento (publicar "no futuro") ou expiração automática.
- Confirmação de leitura visível pra quem enviou (quantos já viram) — a tabela `avisoxusuario` já tem o dado, mas não há UI pra isso hoje.
- Push notification fora do navegador (usa só o canal in-app/e-mail/whatsapp já existentes do módulo de Notificação).

---

## 6. Arquivos

**Backend:**
- `backend/database/migrations/2026-08-09-aviso.sql`
- `backend/entities/aviso.model.ts`
- `backend/repositories/aviso.repository.ts` (+ métodos novos em `relacaoanexos.repository.ts`)
- `backend/services/aviso.service.ts`
- `backend/schemas/aviso.schema.ts`
- `backend/middlewares/aviso.middleware.ts`
- `backend/controllers/aviso.controller.ts`
- `routes/aviso.routes.ts` (registrado em `backend/Server.ts` como `/api/aviso`)

**Frontend:**
- `frontend/lib/api/aviso.api.ts`, `frontend/lib/aviso/` (hooks React Query)
- `frontend/app/dashboard/[escolaGUID]/gestao-dados/avisos/page.tsx` (+ `page.module.css`) — criação/gestão
- `frontend/app/dashboard/[escolaGUID]/gestao-dados/page.tsx` — card novo, role-gated
- `frontend/app/dashboard/[escolaGUID]/avisos/[avisoGUID]/page.tsx` (+ `page.module.css`) — leitura
- `frontend/app/dashboard/[escolaGUID]/page.tsx` (+ `page.module.css`) — banner de destaque na home
