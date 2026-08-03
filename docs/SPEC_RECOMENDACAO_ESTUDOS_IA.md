# 📋 SPEC — Recomendação de Estudos por IA (Prova Agendada)

**Data:** 2026-08-03
**Status:** Spec final — decisões consolidadas do bakeoff, aguardando revisão do usuário; depois disso vira plano de implementação (faseado)
**Documento de origem (o "porquê" de cada escolha):** `docs/PLANO_IMPLEMENTACAO_RECOMENDACAO_ESTUDOS_IA.md`
**Escopo:** Módulo **Matérias**, item "prova" (`ProvaAgendada`)

---

## 0. Resumo executivo

Quando o professor cria uma prova agendada, o sistema gera — uma vez, compartilhado por todas as turmas daquela prova — uma recomendação de estudo com até quatro peças independentes: vídeo do YouTube, resumo de texto (grounded no que foi postado), referência de página de livro didático, e acesso a um banco universal de questões de vestibular pra prática. Nenhuma peça tem substituto forçado: o que a IA não consegue embasar de verdade, simplesmente não aparece.

Este documento consolida só as **decisões finais**. O raciocínio comparativo (opções descartadas, tabelas de trade-off) está em `PLANO_IMPLEMENTACAO_RECOMENDACAO_ESTUDOS_IA.md`.

---

## 1. Decisões já validadas

| # | Tema | Decisão |
|---|---|---|
| 1 | Posicionamento | Dentro do módulo **Matérias**, pendurado em `ProvaAgendada` |
| 2 | Fonte de verdade | A IA consome `Conteudo` já postado e material da matéria como fonte primária — nunca depende só do conhecimento genérico do LLM |
| 3 | Detecção de assunto | Seleção manual do professor (listbox) tem prioridade e pula a IA inteiramente; se não selecionado, IA classifica, mas só entre os `Assunto`/`SubMateriaGlobal` já cadastrados pra Matéria — nunca gera rótulo livre |
| 4 | Sinal de conteúdo relacionado | Mesma **categoria** (`CategoriaGUID`, já existe em `ProvaAgendadaTurma`/`ConteudoTurma`) como sinal primário; proximidade temporal como fallback quando não há categoria |
| 5 | Vídeo do YouTube | Híbrido: LLM gera queries de busca → YouTube Data API v3 real → LLM opcionalmente reordena. Nunca a IA inventa um vídeo |
| 6 | Resumo de texto | Grounded no `Conteudo`/`MaterialDidatico` realmente postado; sem material suficiente, o resumo não aparece |
| 7 | Página de livro | Só via `MaterialDidatico` cadastrado — busca determinística no texto já extraído, nunca a IA "adivinha" conteúdo de página |
| 8 | Um livro, várias matérias | `MaterialDidatico` não trava matéria no livro — cada capítulo (`MaterialDidaticoCapitulo`) tem sua própria `MateriaGUID`, cobrindo tanto livro de matéria única quanto livro geral |
| 9 | Mais de um livro por matéria | Suportado — professor escolhe explicitamente **qual** `MaterialDidatico` ao referenciar uma página, não só o número |
| 10 | Qualidade do texto extraído | Revisão humana obrigatória antes de um capítulo/página "valer" oficialmente |
| 11 | Banco de questões | Universal (todas as escolas), curado só pela plataforma; campos: enunciado, dificuldade, alternativas + correta, matéria/submatéria (via taxonomia global), vestibular de origem, vídeo de resolução |
| 12 | Consulta do banco de questões | Busca filtrada direta (dificuldade + vestibular), sem chamada de LLM |
| 13 | Auth da tela de cadastro do banco de questões | Conta de usuário normal com flag de admin de plataforma — **não** senha compartilhada solta |
| 14 | Taxonomia global | `MateriaGlobal`/`SubMateriaGlobal`, porque `Materia` é escopada por escola e o banco de questões precisa ser cross-escola |
| 15 | Mapeamento `Materia → MateriaGlobal` | Automático via similaridade de string; se confiança alta, confirma sem perguntar; se ambíguo, LLM leve desempata (retorna candidato + % de confiança) e mostra listbox pro professor/gestor confirmar |
| 16 | Novo `MateriaGlobal` sem match | Formalizado automaticamente com `Status='Pendente'` — não bloqueia o cadastro da escola, entra numa fila de revisão da plataforma |
| 17 | Redução da fila de pendentes | Tabela de aliases (`materiaglobalalias`) que aprende a cada resolução manual — não é auto-merge automático sem supervisão |
| 18 | Provedor de IA | **Google (Gemini)** — mesma chave/projeto cobre LLM + YouTube Data API, um segredo a menos |
| 19 | Segmentação de modelo | Mesmo provedor, tiers diferentes por tarefa: leve/rápido pra classificação e geração de query; "cheio" pra resumo grounded e sumário de livro |
| 20 | Gatilho de geração | Uma vez, na criação da `ProvaAgendada` — compartilhado por todas as turmas da mesma prova (nunca regenerado por turma) |
| 21 | Regeneração | Automática sempre que a prova ou seu contexto muda (edição, categoria, conteúdo vinculado, assunto travado) — ainda compartilhada entre turmas |
| 22 | Fallback geral | Nenhuma das 4 peças (vídeo/resumo/questão/página) tem substituto forçado — o que não for encontrado com confiança simplesmente não aparece |
| 23 | Faseamento | Fase 1 (resumo+vídeo) → Fase 2 (`Assunto`+`MateriaGlobal`) → Fase 3 (`MaterialDidatico`+`QuestaoBanco`) — ver §8 |
| 24 | Fora de escopo agora | Representante de turma complementando manualmente resumo/vídeo por turma (ideia futura, não desta spec) |

---

## 2. Estado atual do código (relevante)

| Peça | Já existe? | Onde |
|---|---|---|
| `ProvaAgendada` (`MateriaGUID`, `ProvaData`, `ProvaDescricao`, `ProvaStatus`) | ✅ | `backend/entities/provaagendada.model.ts` |
| `ProvaAgendadaTurma.CategoriaGUID` / `ConteudoTurma.CategoriaGUID` | ✅ | `backend/database/migrations/2026-07-24-materias-modulo.sql`, linhas 44-49 — já apontam pra mesma `CategoriaConteudo`, base do sinal do item 4 da tabela acima |
| `Conteudo` (Texto/Cronometrado/PaginadoArquivo) | ✅ | `backend/entities/conteudo*.model.ts` |
| `Materia.EscolaGUID` (escopo por escola) | ✅ | `backend/entities/materia.model.ts` — motivo direto da necessidade de taxonomia global (item 14) |
| `TarefaAcademicaQuestao`/`TarefaAcademicaAlternativa` (padrão relacional de referência) | ✅ | `backend/entities/tarefaacademica-questao.model.ts`, `tarefaacademica-alternativa.model.ts` — `QuestaoBanco` espelha o mesmo padrão de campos |
| Extração de texto de PDF/imagem | ❌ | não existe nenhum pipeline hoje |
| Vocabulário de assunto/tópico | ❌ | `ProvaDescricao` é texto livre, sem estrutura |
| Integração com LLM/YouTube Data API | ❌ | `.env.example` já antecipa `GOOGLE_API_KEY` (comentado) — reaproveitável pro item 18 |
| Conceito de "livro didático"/página | ❌ | ideia nova, zero suporte hoje |
| Admin de plataforma (fora do sistema de papéis por escola) | ❌ | `EscolaXUsuarioXFuncao` é sempre escopado por `EscolaGUID`; a flag do item 13 é um conceito novo, fora desse sistema |

---

## 3. Modelo de dados final

```sql
-- ============ Taxonomia local (por escola) ============
CREATE TABLE assunto (
  AssuntoGUID CHAR(36) PRIMARY KEY,
  MateriaGUID CHAR(36) NOT NULL,
  AssuntoPaiGUID CHAR(36) NULL,
  Nome VARCHAR(150) NOT NULL,
  SubMateriaGlobalGUID CHAR(36) NULL,     -- ponte pra taxonomia global, ver abaixo
  Origem ENUM('Manual','SumarioLivro','SugeridoIA') NOT NULL DEFAULT 'Manual',
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assunto_materia_nome (MateriaGUID, Nome),
  FOREIGN KEY (MateriaGUID) REFERENCES materia(MateriaGUID),
  FOREIGN KEY (AssuntoPaiGUID) REFERENCES assunto(AssuntoGUID),
  FOREIGN KEY (SubMateriaGlobalGUID) REFERENCES submateriaglobal(SubMateriaGlobalGUID)
);

CREATE TABLE provaagendadaassunto (
  ProvaAgendadaGUID CHAR(36) NOT NULL,
  AssuntoGUID CHAR(36) NOT NULL,
  PRIMARY KEY (ProvaAgendadaGUID, AssuntoGUID),
  FOREIGN KEY (ProvaAgendadaGUID) REFERENCES provaagendada(ProvaAgendadaGUID),
  FOREIGN KEY (AssuntoGUID) REFERENCES assunto(AssuntoGUID)
);

-- ============ Taxonomia global (cross-escola) ============
CREATE TABLE materiaglobal (
  MateriaGlobalGUID CHAR(36) PRIMARY KEY,
  Nome VARCHAR(150) NOT NULL UNIQUE,
  Status ENUM('Pendente','Confirmado') NOT NULL DEFAULT 'Confirmado'
);

CREATE TABLE submateriaglobal (
  SubMateriaGlobalGUID CHAR(36) PRIMARY KEY,
  MateriaGlobalGUID CHAR(36) NOT NULL,
  Nome VARCHAR(150) NOT NULL,
  UNIQUE KEY uq_submateriaglobal (MateriaGlobalGUID, Nome),
  FOREIGN KEY (MateriaGlobalGUID) REFERENCES materiaglobal(MateriaGlobalGUID)
);

CREATE TABLE materiaglobalalias (
  MateriaGlobalAliasGUID CHAR(36) PRIMARY KEY,
  MateriaGlobalGUID CHAR(36) NOT NULL,
  NomeAlias VARCHAR(150) NOT NULL,
  UNIQUE KEY uq_alias (NomeAlias),
  FOREIGN KEY (MateriaGlobalGUID) REFERENCES materiaglobal(MateriaGlobalGUID)
);

ALTER TABLE materia
  ADD COLUMN MateriaGlobalGUID CHAR(36) NULL,
  ADD FOREIGN KEY (MateriaGlobalGUID) REFERENCES materiaglobal(MateriaGlobalGUID);

-- ============ Material didático (livro, nível de Escola) ============
CREATE TABLE materialdidatico (
  MaterialDidaticoGUID CHAR(36) PRIMARY KEY,
  EscolaGUID CHAR(36) NOT NULL,
  Titulo VARCHAR(255) NOT NULL,
  CriadoPorCPF VARCHAR(14) NOT NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID),
  FOREIGN KEY (CriadoPorCPF) REFERENCES usuario(UsuarioCPF)
);

CREATE TABLE materialdidaticopagina (
  MaterialDidaticoPaginaGUID CHAR(36) PRIMARY KEY,
  MaterialDidaticoGUID CHAR(36) NOT NULL,
  NumeroPagina INT UNSIGNED NOT NULL,
  ArquivoUrl VARCHAR(500) NOT NULL,
  TextoExtraido LONGTEXT NULL,
  RevisadoPorCPF VARCHAR(14) NULL,        -- NULL até revisão humana (item 10) confirmar o texto
  RevisadoEm DATETIME NULL,
  ExtraidoEm DATETIME NULL,
  UNIQUE KEY uq_materialpagina (MaterialDidaticoGUID, NumeroPagina),
  FOREIGN KEY (MaterialDidaticoGUID) REFERENCES materialdidatico(MaterialDidaticoGUID),
  FOREIGN KEY (RevisadoPorCPF) REFERENCES usuario(UsuarioCPF)
);

CREATE TABLE materialdidaticocapitulo (
  MaterialDidaticoCapituloGUID CHAR(36) PRIMARY KEY,
  MaterialDidaticoGUID CHAR(36) NOT NULL,
  MateriaGUID CHAR(36) NOT NULL,          -- por capítulo, não pelo livro (item 8)
  Titulo VARCHAR(255) NOT NULL,
  PaginaInicio INT UNSIGNED NOT NULL,
  PaginaFim INT UNSIGNED NOT NULL,
  AssuntoGUID CHAR(36) NULL,
  FOREIGN KEY (MaterialDidaticoGUID) REFERENCES materialdidatico(MaterialDidaticoGUID),
  FOREIGN KEY (MateriaGUID) REFERENCES materia(MateriaGUID),
  FOREIGN KEY (AssuntoGUID) REFERENCES assunto(AssuntoGUID)
);

-- ============ Banco de questões universal ============
CREATE TABLE vestibular (
  VestibularGUID CHAR(36) PRIMARY KEY,
  Nome VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE questaobanco (
  QuestaoBancoGUID CHAR(36) PRIMARY KEY,
  MateriaGlobalGUID CHAR(36) NOT NULL,
  SubMateriaGlobalGUID CHAR(36) NOT NULL,
  VestibularGUID CHAR(36) NOT NULL,
  Dificuldade ENUM('Facil','Media','Dificil') NOT NULL,
  Enunciado TEXT NOT NULL,
  VideoResolucaoUrl VARCHAR(500) NULL,
  CriadoPorCPF VARCHAR(14) NOT NULL,      -- admin de plataforma (item 13)
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MateriaGlobalGUID) REFERENCES materiaglobal(MateriaGlobalGUID),
  FOREIGN KEY (SubMateriaGlobalGUID) REFERENCES submateriaglobal(SubMateriaGlobalGUID),
  FOREIGN KEY (VestibularGUID) REFERENCES vestibular(VestibularGUID),
  FOREIGN KEY (CriadoPorCPF) REFERENCES usuario(UsuarioCPF)
);

CREATE TABLE questaobancoalternativa (
  AlternativaGUID CHAR(36) PRIMARY KEY,
  QuestaoBancoGUID CHAR(36) NOT NULL,
  AlternativaTexto VARCHAR(1000) NOT NULL,
  AlternativaCorreta BOOLEAN NOT NULL DEFAULT FALSE,
  AlternativaOrdem TINYINT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (QuestaoBancoGUID) REFERENCES questaobanco(QuestaoBancoGUID)
);

-- Flag de admin de plataforma (item 13) — fora do sistema EscolaXUsuarioXFuncao
ALTER TABLE usuario
  ADD COLUMN UsuarioIsPlataformaAdmin BOOLEAN NOT NULL DEFAULT FALSE;

-- ============ Cache da recomendação gerada ============
CREATE TABLE provaagendadarecomendacao (
  ProvaAgendadaRecomendacaoGUID CHAR(36) PRIMARY KEY,
  ProvaAgendadaGUID CHAR(36) NOT NULL,
  VideosJson JSON NULL,
  ResumoTexto LONGTEXT NULL,
  FontesUsadas JSON NULL,
  ModeloUsado VARCHAR(100) NULL,
  GeradoEm DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recomendacao_prova (ProvaAgendadaGUID),
  FOREIGN KEY (ProvaAgendadaGUID) REFERENCES provaagendada(ProvaAgendadaGUID)
);
```

---

## 4. Arquitetura de IA

- **Provedor:** Google (Gemini) — mesma chave/projeto Google Cloud cobre o LLM e a YouTube Data API v3, reduzindo o número de segredos a gerenciar.
- **Tiering por tarefa** (mesmo provedor, modelos diferentes):
  - Leve/rápido: classificação de assunto (quando a IA precisa rodar, item 3), geração de queries de busca do YouTube, desempate de match `Materia→MateriaGlobal` quando ambíguo.
  - "Cheio"/mais capaz: resumo grounded (item 6), sumário de livro no cadastro de `MaterialDidatico` (rodado 1x por livro, não por prova).
- **Match `Materia → MateriaGlobal`** não usa LLM no caso comum: roda similaridade de string primeiro (contra `materiaglobal.Nome` + `materiaglobalalias.NomeAlias`); LLM leve só entra se o resultado for ambíguo, retornando candidato + % de confiança.

---

## 5. Pipeline de execução

1. **Gatilho:** criação da `ProvaAgendada` (item 20). Uma prova = um registro de recomendação (`provaagendadarecomendacao`), compartilhado por todas as `ProvaAgendadaTurma` daquela prova.
2. **Assunto:** se o professor travou `Assunto`(s) manualmente (listbox, item 3), usa direto — sem chamada de IA. Senão, LLM (tier leve) classifica restrito à lista de `Assunto`/`SubMateriaGlobal` da Matéria; pode retornar "nenhum aplicável".
3. **Coleta de contexto:** `Conteudo` da(s) categoria(s) da(s) `ProvaAgendadaTurma` (união entre turmas da mesma prova) — fallback pra proximidade temporal se nenhuma turma usa categoria — + capítulos de `MaterialDidatico` referenciados manualmente, se houver.
4. **Vídeo:** LLM (tier leve) gera 2-3 queries a partir do(s) `Assunto` → YouTube Data API v3 real → LLM opcionalmente reordena os resultados reais.
5. **Resumo:** só roda se houver `Conteudo`/capítulo de `MaterialDidatico` disponível (com `RevisadoPorCPF` preenchido, ver item 10); LLM (tier "cheio") resume só o texto fornecido, cita a fonte.
6. **Banco de questões:** se `Assunto.SubMateriaGlobalGUID` estiver mapeada, verifica se há `QuestaoBanco` correspondente — sem LLM; os filtros de dificuldade/vestibular ficam pro aluno escolher na hora de abrir o modal (§3.6 do doc de origem).
7. **Persistência:** grava/atualiza `provaagendadarecomendacao`. Cada peça é independente — se uma faltar, as outras aparecem normalmente (item 22).
8. **Regeneração:** repete o pipeline inteiro automaticamente sempre que a prova, sua categoria, o conteúdo vinculado, ou o assunto travado mudarem (item 21) — ainda uma vez por prova, não por turma.

---

## 6. Fluxos de UX

- **Cadastro/edição de Matéria (escola):** sistema sugere `MateriaGlobal` via similaridade de string (+ aliases); confiança alta confirma sozinho, confiança ambígua mostra listbox de candidatos pro gestor escolher — ou formaliza um `MateriaGlobal` novo com `Status='Pendente'` se nada bater.
- **Criação de prova (professor):** listbox de `Assunto` (populada a partir da `SubMateriaGlobal` da `MateriaGlobal` mapeada, quando existir) pra travar manualmente; opcionalmente referencia página de livro — primeiro escolhe **qual** `MaterialDidatico` (entre os que têm capítulo daquela Matéria), depois capítulo/página dentro dele.
- **Tela do aluno:** até 4 cards independentes (vídeo, resumo, página de livro, banco de questões) — só aparece o que a IA encontrou com confiança; botão "Praticar" abre modal com `QuestaoBanco` filtrável por dificuldade/vestibular.
- **Tela de admin de plataforma** (`UsuarioIsPlataformaAdmin`, item 13): CRUD de `QuestaoBanco`/alternativas, fila de revisão de `MateriaGlobal` com `Status='Pendente'` (mesclar em existente → vira alias, ou confirmar como novo), revisão do `TextoExtraido` de `MaterialDidatico` antes de liberar o capítulo.

---

## 7. Guardrails

- Nenhuma peça tem substituto forçado (item 22) — omissão silenciosa, nunca conteúdo genérico como fallback.
- Vídeo sempre vem da API real do YouTube; questão sempre vem de `QuestaoBanco` curado manualmente — a IA nunca inventa nenhum dos dois, só filtra/ordena.
- Página de livro é sempre busca determinística em `TextoExtraido` já revisado por humano — nunca geração livre sobre conteúdo de página.
- Texto de `Conteudo`/`MaterialDidatico` que vira prompt precisa de delimitação clara contra prompt injection.
- Falha de API (LLM ou YouTube) não bloqueia a prova em si — feature é aditiva.
- `UsuarioIsPlataformaAdmin` é uma superfície de auth nova, fora do `EscolaXUsuarioXFuncao` — precisa dos mesmos cuidados de qualquer rota administrativa sensível (rate limit, auditoria).

---

## 8. Fases de implementação

| Fase | Entrega | Depende de |
|---|---|---|
| **1** | Resumo (item 6) + vídeo (item 5), usando só `ProvaDescricao` + `Conteudo` da categoria/proximidade temporal (item 4). Sem `Assunto`, `MaterialDidatico` nem `QuestaoBanco` ainda | Integração com Gemini + YouTube Data API |
| **2** | `Assunto`, `MateriaGlobal`/`SubMateriaGlobal`, mapeamento automático (§4), listbox de travamento manual na prova | Fase 1 rodando |
| **3** | `MaterialDidatico` (cadastro de livro, extração, revisão humana, referência de página) e/ou `QuestaoBanco` (banco de questões + tela de admin) — as duas peças mais caras, podem ser paralelas entre si | Fase 2 (pra `MaterialDidatico` alimentar `Assunto` via sumário; `QuestaoBanco` só depende da taxonomia global) |

---

## 9. Fora de escopo desta spec

- Representante de turma complementando manualmente resumo/vídeo por turma (item 24) — ideia futura registrada, não desenhada aqui.
- Qualquer decisão não listada em §1 continua em aberto e deve ser resolvida antes de a fase correspondente começar.
