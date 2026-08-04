# Ecossistema Escolar (Bauá)

**TCC — Trabalho de Conclusão de Curso**
**Autor:** Eduardo Tagliamento
**Licença:** MIT

---

## 📖 Sobre o Projeto

O **Ecossistema Escolar** (nome de produto: **Bauá**) é uma plataforma educacional completa, inspirada no Google Classroom, potencializada com Inteligência Artificial. Gestão de turmas, matérias, tarefas, provas, comunicação em tempo real, calendário/notificações, projetos, auditoria e recomendação de estudos por IA — atendendo alunos, professores, secretaria/coordenação e direção de escola.

Este README reflete o estado real do código, não um roadmap aspiracional. Para o detalhamento vivo do que ainda falta, ver [`docs/RELATORIO_BAUA_CODIGO_2.md`](docs/RELATORIO_BAUA_CODIGO_2.md).

---

## 🏗️ Arquitetura e Stack

Monorepo único (`package.json` na raiz cobre o backend; `frontend/package.json` cobre o front). Em produção, o Express da raiz **é o próprio servidor** — ele registra as rotas `/api/*` e, para qualquer outra rota, delega pro handler do Next.js (custom server, ver `backend/Server.ts`), então backend e frontend sobem juntos, não como dois serviços separados.

### Backend
- **Runtime:** Node.js + TypeScript 5.x, executado via `tsx` em dev
- **Framework HTTP:** Express 4.x, servidor customizado (`backend/Server.ts`) que também hospeda o Next.js
- **Banco de dados:** MySQL 8 via `mysql2` (Railway em produção — ver `docs/RAILWAY_MYSQL_CONNECTION.md`)
- **Validação:** Zod 4 (`backend/schemas/` + `backend/utils/zodValidate.ts`) — migração de validação manual pra Zod concluída na maior parte dos módulos, ver `docs/PLANO_MIGRACAO_TAREFAS_ZOD_REACT_QUERY.md`
- **Autenticação:** JWT (`jsonwebtoken`, `backend/middlewares/auth.middleware.ts`, `routes/auth.routes.ts`)
- **Tempo real:** WebSocket via `socket.io` (`backend/websocket/SocketServer.ts`) — chat, toasts de notificação
- **Upload/armazenamento:** `multer` + `@aws-sdk/client-s3` (compatível R2) + `sharp` (processamento de imagem)
- **E-mail transacional:** `resend` (principal) + Brevo (alternativa)
- **Agendamento:** `node-cron` (`backend/services/*.scheduler.ts` — auditoria, notificação, limpeza, nota automática de tarefa)
- **IA:** `@google/genai` (Gemini) — `backend/ai/` (providers + agents), ver `docs/SPEC_RECOMENDACAO_ESTUDOS_IA.md`
- **Padrão arquitetural:** MVC em camadas — `Controller → Service → Repository → Entity`, com `Middleware` (Zod) na entrada e `Guard` pra autorização

### Frontend
- **Framework:** Next.js 14 (App Router), React 18, TypeScript
- **Data fetching/cache:** TanStack Query (`@tanstack/react-query`) — hooks por domínio em `frontend/lib/<dominio>/`
- **Formulários:** `react-hook-form` + `@hookform/resolvers` (Zod) nas telas mais complexas
- **Estilo:** CSS Modules + design system em `frontend/styles/globals.css` (CSS variables — tema claro/escuro por escola)
- **Real-time:** `socket.io-client` (`frontend/lib/socket/`, `frontend/lib/chat/`)

### Mobile / Desktop
Não implementado. Não faz parte do escopo atual do TCC.

---

## 📦 O que está implementado

Inventário direto de `backend/routes/*.routes.ts` (todas registradas em `backend/Server.ts`) e `frontend/app/`:

| Módulo | Backend (`/api/...`) | Frontend |
|---|---|---|
| Escola (CRUD, cor/logo, configuração) | ✅ `escola`, `escola-configuracao` | ✅ `criar-escola`, `dashboard/[escolaGUID]/configuracoes` |
| Usuário + papéis por escola | ✅ `usuario`, `escolaxusuarioxfuncao` | ✅ `login`, `cadastro`, `selecionar-escola`, `verificar-email`, `perfil` |
| Autenticação JWT + verificação de e-mail | ✅ `auth`, `verificacao-email` | ✅ |
| Matéria / Curso / Turma / Matrícula | ✅ `materia`, `curso`, `turma`, `matricula`, `professor` | ✅ `gestao-dados/{materias,cursos,turmas,alunos,professores,coordenacao,secretaria}` |
| Grade horária / horário de turma | ✅ `grade-horaria`, `turma` (horário) | ✅ `configuracoes` (cronograma) |
| **Matérias (sala de aula)** — categorias, conteúdo, tarefa, prova, progresso | ✅ `categoria-conteudo`, `conteudo`, `tarefa`, `prova` | ✅ `materias/[materiaGUID]/turmas`, `crud-tarefa`, `crud-provaagendada`, `crud-conteudo`, `tarefas` |
| Grupos de tarefa/projeto + convites | ✅ `grupotarefa`, `convitegrupotarefa`, `projeto`, `grupoprojeto`, `convitegrupoprojeto` | ✅ `crud-projeto`, `projetos` |
| Anexos / upload genérico | ✅ `anexo`, `upload` | ✅ (integrado nas telas de tarefa/conteúdo/prova) |
| Calendário / Eventos / Anotações / Pendências | ✅ `calendario`, `evento`, `anotacao`, `pendencia` | ✅ `calendario`, `cadastro-evento`, `cadastro-pendencia`, `pendencias` |
| Chat (conversa individual/grupo, WebSocket) | ✅ `conversa` | ✅ `chat` |
| Notificações (feed + toast em tempo real) | ✅ `notificacao` | ✅ `notificacoes` |
| Auditoria (log de ações, paginação configurável) | ✅ `auditoria` | ✅ `auditoria` |
| **Recomendação de Estudos por IA** — assunto, taxonomia global, material didático, banco de questões | ✅ `assunto`, `materiaglobal`, `materialdidatico`, `questaobanco` (backend completo, ver `docs/SPEC_RECOMENDACAO_ESTUDOS_IA.md`) | 🔜 parcial — professor já trava assunto manualmente ao criar prova (`ProvaAgendadaForm.tsx`) e `admin-plataforma` já cadastra banco de questões; **falta a tela do aluno pra ver a recomendação já gerada** (vídeo/resumo/página/questões) |

**Landing page** (`frontend/app/page.tsx`) e páginas institucionais (`login`, `cadastro`, `saiba-mais`) também implementadas.

---

## 🚀 Como Executar

Veja o guia completo em [EXECUTAR.md](EXECUTAR.md) ou o início rápido em [QUICKSTART.md](QUICKSTART.md).

```bash
# 1. Instalar dependências (raiz + frontend)
npm install
cd frontend && npm install && cd ..

# 2. Banco de dados: ver backend/database/migrations/ (schema é construído
#    incrementalmente por migrations, não por um único dump — ver docs/RAILWAY_MYSQL_CONNECTION.md
#    pra conexão com o MySQL de referência do projeto)

# 3. Configurar variáveis de ambiente
cp .env.example .env
# edite o .env: credenciais MySQL, JWT_SECRET, RESEND_API_KEY, GOOGLE_API_KEY (Gemini + YouTube), R2/S3, etc.

# 4. Iniciar servidor (dev — backend + frontend juntos)
npm run dev
```

Acesse: `http://localhost:3000`

---

## 📂 Estrutura de Diretórios

```
TccEcossistemaEscolar/
├── app.ts                        # Entry point do servidor
├── routes/                       # Definição de rotas Express (uma por domínio)
├── backend/
│   ├── Server.ts                 # Servidor Express + host do Next.js (custom server)
│   ├── controllers/              # Camada HTTP (req/res)
│   ├── services/                 # Regras de negócio
│   ├── repositories/             # Acesso ao banco (DAOs)
│   ├── entities/                 # Modelos de domínio com validação
│   ├── schemas/                  # Schemas Zod (validação declarativa)
│   ├── middlewares/               # zodValidate + regras de request específicas
│   ├── guards/                   # Autorização (papel de escola, admin de plataforma)
│   ├── database/
│   │   ├── migrations/           # Histórico incremental do schema (SQL/TS)
│   │   └── sql.txt               # Snapshot de referência do schema
│   ├── ai/                       # Providers + agents de IA (Gemini) — recomendação de estudos
│   ├── websocket/                # SocketServer (chat, notificação em tempo real)
│   ├── external/                 # Clients de API externa (e-mail, storage, YouTube)
│   └── utils/                    # Utilitários gerais (zodValidate, timezone, etc.)
├── frontend/
│   ├── app/                      # Next.js App Router — páginas por rota
│   │   └── dashboard/[escolaGUID]/  # Área autenticada, escopada por escola
│   ├── lib/<dominio>/            # Hooks TanStack Query + API client, por domínio
│   ├── components/               # Componentes reutilizáveis
│   └── styles/globals.css        # Design system (CSS variables, tema claro/escuro)
└── docs/                         # Specs de implementação, bakeoffs, relatórios de auditoria
```

---

## 📚 Documentação

- [`docs/RELATORIO_BAUA_CODIGO_2.md`](docs/RELATORIO_BAUA_CODIGO_2.md) — **lista viva do que falta implementar**, mantida atualizada
- [`docs/PLANO_MIGRACAO_TAREFAS_ZOD_REACT_QUERY.md`](docs/PLANO_MIGRACAO_TAREFAS_ZOD_REACT_QUERY.md) — migração de validação (Zod) e data-fetching (TanStack Query)
- [`docs/SPEC_RECOMENDACAO_ESTUDOS_IA.md`](docs/SPEC_RECOMENDACAO_ESTUDOS_IA.md) + [`docs/PLANO_IMPLEMENTACAO_RECOMENDACAO_ESTUDOS_IA.md`](docs/PLANO_IMPLEMENTACAO_RECOMENDACAO_ESTUDOS_IA.md) — spec e plano faseado da IA de recomendação de estudos
- [`docs/PLANO_IMPLEMENTACAO_MATERIAS.md`](docs/PLANO_IMPLEMENTACAO_MATERIAS.md) — módulo central de sala de aula
- [`docs/API_KEYS_GUIDE.md`](docs/API_KEYS_GUIDE.md) — guia de gerenciamento de chaves de API
- [`docs/RAILWAY_MYSQL_CONNECTION.md`](docs/RAILWAY_MYSQL_CONNECTION.md) — conexão com o banco de referência
- [`EXECUTAR.md`](EXECUTAR.md) — guia detalhado de execução e resolução de problemas
- Demais planos de implementação por módulo (chat, notificações, grade horária, projetos, tarefa compartilhada etc.) estão em `docs/PLANO_IMPLEMENTACAO_*.md`
