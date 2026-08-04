# 📋 PLANO DE IMPLEMENTAÇÃO — Recomendação de Estudos por IA (Prova Agendada)

**Data:** 2026-08-03
**Status:** Spec-first — aguardando revisão do usuário antes de iniciar o código
**Spec de referência (decisões travadas):** `docs/SPEC_RECOMENDACAO_ESTUDOS_IA.md` — este documento não reabre nenhuma decisão do spec, só desenha o "como" e "em que ordem"
**Raciocínio comparativo (o "porquê"):** `docs/BAKEOFF_RECOMENDACAO_ESTUDOS_IA.md`
**Escopo:** Módulo **Matérias**, item "prova" (`ProvaAgendada`)

---

## 0. O que já existe (não duplicar)

| Peça | Já existe? | Onde |
|---|---|---|
| `ProvaAgendada.criarProva` / `.atualizarProva` | ✅ | `backend/services/provaagendada.service.ts:155` / `:356` — pontos de gatilho da geração/regeneração (item 20/21 do spec) |
| `ProvaAgendadaTurma.CategoriaGUID` / `ConteudoTurma.CategoriaGUID` | ✅ | `backend/database/migrations/2026-07-24-materias-modulo.sql` — sinal primário de contexto (item 4) |
| `Conteudo` (Texto/Cronometrado/PaginadoArquivo) | ✅ | `backend/entities/conteudo*.model.ts` |
| `getAuditoriaService().registrar(...)` | ✅ | `backend/services/auditoria.service.ts`, já usado em `provaagendada.service.ts` com `CategoriaAuditoriaId: 2` ("Operacional") |
| Scheduler (`node-cron`) | ✅ | `backend/services/{auditoria,notificacao,cleanup,tarefaacademicanota}.scheduler.ts`, registrados em `Server.ts` — mesmo padrão serve pro job de extração assíncrona de `MaterialDidatico` (Fase 3) |
| `R2StorageService` | ✅ | `backend/services/r2storage.service.ts` — reaproveitar pro upload de página de livro (Fase 3) |
| Catálogo de notificação (`notificacaotipo`, seed) | ✅ | `backend/database/migrations/2026-07-17-notificacoes.sql` — padrão `slug` + `NotificacaoTipoFuncao` a seguir pro tipo novo (Fase 3, revisão de `MaterialDidatico`) |
| Camada `backend/ai/` | ✅ (scaffold vazio) | `backend/ai/README.txt` já antecipa exatamente isto: *"Recomendação de conteúdo", "ContentRecommendationAgent", "AIProvider (OpenAI, etc.)"* — é aqui que a integração com Gemini/YouTube deve morar, não dentro de `services/` |
| `backend/external/` | ✅ (padrão) | `ResendEmailService.ts` mostra o padrão de wrapper de API externa do projeto — mesmo padrão pra um `YoutubeDataApiClient` |
| `sharp`, `axios`, `node-cron`, `multer` (deps) | ✅ | já em `package.json` — nenhuma reaproveitável directly pro LLM, mas confirma que dependência de infra (upload/cron) não precisa ser reinventada |
| SDK do Gemini (`@google/genai` ou `@google/generative-ai`) | ❌ | dependência nova, Fase 1 |
| Extração de texto de PDF/imagem (OCR) | ❌ | dependência nova, Fase 3 (`MaterialDidatico`) |
| `GOOGLE_API_KEY` real configurada | ❌ (só placeholder comentado) | `.env.example:46` — precisa de chave de projeto Google Cloud com Gemini API + YouTube Data API v3 habilitadas |

---

## 1. Ordem de execução — por que essa ordem

O spec já define 3 fases (§8 do spec). Este plano detalha cada uma por camada (migration → backend → frontend), na mesma ordem usada em `PLANO_IMPLEMENTACAO_MATERIAS.md`. A lógica de dependência:

- **Fase 1** não depende de nenhuma tabela nova de taxonomia — só migration da tabela de cache (`provaagendadarecomendacao`) e a integração Gemini/YouTube. É a fase que valida se a arquitetura de IA funciona de ponta a ponta com o menor escopo possível.
- **Fase 2** introduz `Assunto`/`MateriaGlobal` — só faz sentido depois que o pipeline de Fase 1 já roda de verdade, porque a classificação de assunto (item 3 do spec) é uma entrada nova pro mesmo pipeline, não um sistema paralelo.
- **Fase 3** (`MaterialDidatico` + `QuestaoBanco`) é a mais cara e as duas peças **podem rodar em paralelo entre si** (não dependem uma da outra), mas ambas dependem da Fase 2 estar no ar: `MaterialDidatico` alimenta `Assunto` via sumário de livro; `QuestaoBanco` depende só da taxonomia global (`MateriaGlobal`/`SubMateriaGlobal`), que nasce na Fase 2.

Cada fase é commitável isoladamente e não quebra o sistema entre uma e outra — tudo aditivo (nenhuma coluna existente muda de tipo/é removida).

---

## 2. Fase 1 — Resumo + vídeo (fundação da IA)

**Entrega:** ao criar uma prova, o sistema gera e cacheia resumo (grounded em `Conteudo`) + vídeos do YouTube, usando só `ProvaDescricao` + `Conteudo` da categoria/proximidade temporal (item 4 do spec) — sem `Assunto`, `MaterialDidatico` nem `QuestaoBanco` ainda, que nesta fase ainda não existem.

### 2.1 Migration

Novo arquivo `backend/database/migrations/2026-08-XX-recomendacao-estudos-ia.sql`, só com a tabela de cache do §3 do spec:

```sql
CREATE TABLE provaagendadarecomendacao (
  ProvaAgendadaRecomendacaoGUID CHAR(36) PRIMARY KEY,
  ProvaAgendadaGUID CHAR(36) NOT NULL,
  VideosJson JSON NULL,
  ResumoTexto LONGTEXT NULL,
  FontesUsadas JSON NULL,
  ModeloUsado VARCHAR(100) NULL,
  StatusGeracao ENUM('Pendente','Concluida','Falhou') NOT NULL DEFAULT 'Pendente',
  ErroGeracao VARCHAR(500) NULL,
  GeradoEm DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recomendacao_prova (ProvaAgendadaGUID),
  FOREIGN KEY (ProvaAgendadaGUID) REFERENCES provaagendada(ProvaAgendadaGUID)
);
```

`StatusGeracao`/`ErroGeracao` não estão no schema original do spec — adição pontual pra suportar o guardrail "falha de API não bloqueia a prova" (item 22/§7): se o job assíncrono falhar, a linha existe com `StatusGeracao='Falhou'` e a tela sabe mostrar "recomendação indisponível" em vez de nada.

### 2.2 Configuração e SDK

- `.env.example`: descomentar/renomear `GOOGLE_API_KEY` com comentário indicando que a mesma chave cobre Gemini API + YouTube Data API v3.
- `package.json` (raiz, já que `backend/` não tem `package.json` próprio — confirmar durante implementação): adicionar `@google/genai` (SDK oficial atual do Gemini).
- Nenhum SDK novo pro YouTube — chamada HTTP direta via `axios` (já é dependência), mais simples que instalar `googleapis` inteiro só pra um endpoint (`search.list`).

### 2.3 Camada `backend/ai/` (novo módulo, dentro do scaffold já existente)

Seguindo o contrato que `backend/ai/README.txt` já define ("Chama APIs de IA, processa respostas, retorna insights ao Service" / "não responde HTTP diretamente, não acessa banco sem service"):

- `backend/ai/providers/geminiProvider.ts` — wrapper fino do SDK, dois métodos por tier: `gerarEstruturado(prompt, schema, tier: 'leve'|'cheio')` (usa `responseSchema` nativo do Gemini pra output estruturado) e `gerarTexto(prompt, tier)`. Tier resolve pro model id certo (ex. `gemini-2.5-flash` leve / `gemini-2.5-pro` cheio — confirmar nomes de model atuais no momento da implementação).
- `backend/ai/agents/resumoEstudoAgent.ts` — recebe o(s) `Conteudo` já coletado (texto puro, delimitado contra prompt injection — guardrail do §7), monta o prompt "resuma **só** o texto abaixo, cite a fonte, não invente" e chama `geminiProvider.gerarTexto(prompt, 'cheio')`.
- `backend/ai/agents/videoRecomendacaoAgent.ts` — recebe assunto/matéria, chama `geminiProvider.gerarEstruturado(...)` (tier leve) pra gerar 2-3 queries, delega busca real pro client do §2.4, opcionalmente reordena os resultados reais via outra chamada leve.

### 2.4 `backend/external/` (client HTTP externo, mesmo padrão de `ResendEmailService.ts`)

- `backend/external/YoutubeDataApiClient.ts` — `buscarVideos(query: string, maxResults = 5): Promise<{titulo, url, canal, thumbnailUrl}[]>`, chamada direta a `GET https://www.googleapis.com/youtube/v3/search` via `axios`, usando `GOOGLE_API_KEY`. Nunca inventa resultado — se a API retornar vazio ou erro, propaga lista vazia pro chamador decidir (guardrail §7).

### 2.5 Service/orquestração (fica em `services/`, não em `ai/` — é quem acessa banco)

- `backend/services/provaagendadarecomendacao.service.ts`:
  - `gerarRecomendacao(ProvaAgendadaGUID)`: coleta contexto (união de `Conteudo` por categoria das `ProvaAgendadaTurma` daquela prova, fallback proximidade temporal — reaproveita/estende query já usada em `provaagendada.service.ts`), chama os dois agents do §2.3 em paralelo (`Promise.allSettled` — um falhar não derruba o outro, consistente com "cada peça independente"), grava em `provaagendadarecomendacao` via upsert (`ON DUPLICATE KEY UPDATE`, já que `ProvaAgendadaGUID` é `UNIQUE`).
  - Roda **assíncrono** (fire-and-forget, `void gerarRecomendacao(...)` a partir do hook do §2.6) — criar a prova não pode ficar esperando LLM+YouTube responderem; a tela do aluno lê `StatusGeracao` pra saber se já tem algo pronto.
  - `buscarRecomendacao(ProvaAgendadaGUID)`: leitura simples pro endpoint de consumo.

### 2.6 Hook nos pontos de gatilho existentes

- `backend/services/provaagendada.service.ts:155` (`criarProva`): após a prova + `ProvaAgendadaTurma` serem persistidas com sucesso, `void this.#recomendacaoService.gerarRecomendacao(prova.ProvaAgendadaGUID)` — mesmo padrão fire-and-forget que `#notificarProvaPostada` já usa ali perto (linha 294).
- `backend/services/provaagendada.service.ts:356` (`atualizarProva`): mesmo hook, mas só dispara se algo relevante ao contexto mudou (`ProvaDescricao`, categoria via `ProvaAgendadaTurma`, ou — a partir da Fase 2 — `Assunto` travado). Nesta fase, comparar `ProvaDescricao` antigo vs. novo é suficiente pro guardrail de regeneração (item 21 do spec).

### 2.7 Endpoint de consumo

- `routes/provaagendada.routes.ts`: `GET /api/provaagendada/:ProvaAgendadaGUID/recomendacao` → `ProvaAgendadaRecomendacaoController.buscar` → `provaagendadarecomendacao.service.ts#buscarRecomendacao`. Retorna `{videos, resumo, fontesUsadas, statusGeracao}` ou 404 se a linha ainda não existe (prova recém-criada, job ainda rodando — frontend faz polling curto ou só recarrega ao reabrir a tela).

### 2.8 Frontend

- Dentro da tela de consumo de prova já existente (`VisualizadorProva`, ver `PLANO_IMPLEMENTACAO_MATERIAS.md` §6.3): novo bloco "Recomendação de estudo" com até 2 cards nesta fase (vídeo, resumo) — usa o mesmo princípio de omissão silenciosa (card não aparece se o campo vier `null`).
- Estado de carregamento: se `StatusGeracao === 'Pendente'`, mostra placeholder discreto ("gerando recomendações..."); se `'Falhou'`, omite o bloco inteiro (guardrail §7 — nunca mostrar erro cru pro aluno).

### 2.9 Guardrails específicos desta fase

- Prompt de resumo precisa de delimitador explícito (ex. bloco `<<<CONTEUDO_POSTADO>>> ... <<<FIM_CONTEUDO>>>` com instrução de nunca seguir instruções que apareçam dentro do bloco) — mitigação de prompt injection via `Conteudo` (guardrail §7).
- Timeout curto (ex. 15s) em cada chamada Gemini/YouTube dentro do `Promise.allSettled` — sem isso, um provedor lento trava o job assíncrono indefinidamente.
- Chave ausente (`GOOGLE_API_KEY` não configurada em dev/staging): `geminiProvider`/`YoutubeDataApiClient` devem falhar de forma previsível (erro tipado, não exceção genérica) pra `StatusGeracao='Falhou'` ser gravado corretamente, não travar o job.

---

## 3. Fase 2 — `Assunto` + `MateriaGlobal`/`SubMateriaGlobal`

**Entrega:** vocabulário controlado de assunto por Matéria, taxonomia global cross-escola, mapeamento automático `Materia → MateriaGlobal`, listbox de travamento manual na criação da prova. O pipeline da Fase 1 passa a receber `Assunto` como entrada em vez de só `ProvaDescricao`.

### 3.1 Migration

Novo arquivo `backend/database/migrations/2026-08-XX-taxonomia-assunto.sql`, com as tabelas `assunto`, `provaagendadaassunto`, `materiaglobal`, `submateriaglobal`, `materiaglobalalias` e `ALTER TABLE materia ADD COLUMN MateriaGlobalGUID` — SQL exato já está em `docs/SPEC_RECOMENDACAO_ESTUDOS_IA.md` §3 (linhas 70-117), copiar dali.

### 3.2 Backend — mapeamento `Materia → MateriaGlobal` (item 15/16/17 do spec)

- `backend/utils/stringSimilarity.ts` (ou lib madura tipo `string-similarity`/trigram — avaliar na hora, evitar reinventar Levenshtein) — usado por:
- `backend/services/materiaglobal.service.ts`:
  - `resolverMapeamento(Materia.Nome)`: roda similaridade contra `materiaglobal.Nome` + `materiaglobalalias.NomeAlias`; score ≥ limiar (ex. 0.85) → confirma automático; score numa faixa ambígua → chama `geminiProvider.gerarEstruturado` (tier leve) pra desempatar, retorna candidato(s) + confiança pro frontend mostrar listbox; nenhum candidato → cria `MateriaGlobal` novo com `Status='Pendente'`, sem bloquear o cadastro (item 16).
  - Hook: `materia.service.ts`, no create/update de `Materia`, chama `resolverMapeamento` e persiste `Materia.MateriaGlobalGUID`.
  - `confirmarMapeamentoManual(MateriaGUID, MateriaGlobalGUID escolhida)`: usado quando o gestor resolve a listbox ambígua; se a escolha for um `MateriaGlobal` diferente do sugerido, grava o nome tentado como novo alias em `materiaglobalalias` (item 17 — é aqui que a lista "aprende").

### 3.3 Backend — `Assunto` e listbox na prova

- Módulo novo `assunto` (entity/repository/service/controller/routes, mesmo padrão de `categoriaconteudo`): CRUD escopado por `Materia`, populando a listbox a partir de `SubMateriaGlobal` da `MateriaGlobal` mapeada quando existir (§6 do spec).
- `provaagendada.service.ts#criarProva`/`atualizarProva`: aceitar `AssuntoGUIDs?: string[]` opcional no payload, persistindo em `provaagendadaassunto`.
- `backend/ai/agents/classificacaoAssuntoAgent.ts`: só roda se `AssuntoGUIDs` não foi enviado manualmente (item 3 do spec) — classifica restrito à lista de `Assunto` daquela Matéria via `gerarEstruturado` (tier leve), pode retornar "nenhum aplicável" (schema deve permitir `null`, nunca um rótulo fora da lista fornecida no prompt).

### 3.4 Ajuste no pipeline da Fase 1

- `provaagendadarecomendacao.service.ts#gerarRecomendacao`: passo novo antes da coleta de contexto — resolve `Assunto` (manual ou via `classificacaoAssuntoAgent`), usa o(s) `Assunto.Nome` como entrada pro `videoRecomendacaoAgent` (query mais específica que só `ProvaDescricao`) e registra `AssuntoGUID` usado em `FontesUsadas`.
- `atualizarProva`: gatilho de regeneração (§2.6) passa a considerar também mudança em `AssuntoGUIDs` travado manualmente, além de `ProvaDescricao`/categoria.

### 3.5 Frontend

- Tela de cadastro/edição de `Materia` (Gestão de Dados): resultado do mapeamento (`MateriaGlobal` confirmado ou listbox de candidatos ambíguos) exibido no mesmo formulário — sem tela nova.
- Criação de prova (`ProvaAgendadaForm` ou equivalente dentro do módulo Matérias): listbox multi-select de `Assunto` (opcional) antes de salvar.

---

## 4. Fase 3 — `MaterialDidatico` + `QuestaoBanco` (paralelas entre si)

**Entrega:** referência de página de livro didático (grounded, revisão humana obrigatória) e banco universal de questões de vestibular com tela de admin de plataforma. As duas trilhas abaixo não têm dependência uma da outra — podem ser implementadas em qualquer ordem ou em paralelo.

### 4.1 Migration (única, cobre as duas trilhas)

Novo arquivo `backend/database/migrations/2026-08-XX-material-didatico-questao-banco.sql`, com `materialdidatico`, `materialdidaticopagina`, `materialdidaticocapitulo`, `vestibular`, `questaobanco`, `questaobancoalternativa`, `ALTER TABLE usuario ADD COLUMN UsuarioIsPlataformaAdmin` — SQL exato em `docs/SPEC_RECOMENDACAO_ESTUDOS_IA.md` §3 (linhas 119-190).

### 4.2 Trilha A — `MaterialDidatico`

- Dependência nova: lib de OCR/extração de PDF (avaliar na hora — ex. `pdf-parse` pra PDF nativo, e um OCR real tipo Google Cloud Vision ou Tesseract pra scan/imagem; como o provedor de IA já é Google, **Gemini com input multimodal** — mandar a imagem/PDF direto pro modelo e pedir transcrição — pode substituir OCR dedicado e evitar mais uma dependência/chave; decidir isso é um ponto em aberto a resolver no início desta fase, não travado no spec).
- Upload: reaproveita `R2StorageService` (padrão já usado em `conteudo-upload.middleware.ts`) — novo middleware `materialdidatico-upload.middleware.ts`, escopado a Direção/Coordenação (não Professor — módulo Matérias não é acessado por esses papéis, é fluxo de Gestão de Dados, igual observado em `PLANO_IMPLEMENTACAO_MATERIAS.md` §0).
- `backend/services/materialdidatico.service.ts`: cadastro do livro → upload de páginas → job assíncrono de extração (reaproveita padrão de scheduler/fire-and-forget da Fase 1) grava `TextoExtraido`, `ExtraidoEm` → fila de revisão humana (`RevisadoPorCPF IS NULL`) antes do capítulo "valer" (item 10 do spec).
- `backend/ai/agents/sumarioLivroAgent.ts`: roda 1x por livro (não por prova), tier "cheio", sugere `materialdidaticocapitulo` (título, faixa de página, `AssuntoGUID` quando mapeável) a partir do texto extraído — sempre como sugestão revisável, nunca grava direto sem confirmação humana, mesmo guardrail do item 10.
- Endpoint de referência na criação da prova: professor escolhe **qual** `MaterialDidatico` (entre os que têm capítulo daquela `MateriaGUID`), depois capítulo/página — nunca texto livre (guardrail §7, opção 1 do bakeoff banida por design).
- `provaagendadarecomendacao.service.ts`: novo passo "página de livro" — busca determinística em `TextoExtraido` já revisado, sem chamada de LLM pra "adivinhar" conteúdo.

### 4.3 Trilha B — `QuestaoBanco`

- `UsuarioIsPlataformaAdmin`: novo guard `backend/guards/plataformaAdmin.guard.ts` (mesmo padrão dos guards de papel por escola já existentes, mas checando a flag direto em `usuario`, fora de `EscolaXUsuarioXFuncao` — item 13 do spec).
- Módulo `questaobanco` (entity/repository/service/controller/routes) — mesmo padrão relacional de `tarefaacademica-questao.model.ts`/`tarefaacademica-alternativa.model.ts` já citado no bakeoff, CRUD completo pra `vestibular`/`questaobanco`/`questaobancoalternativa`, todas as rotas atrás do guard novo.
- Endpoint de consulta pro aluno: `GET /api/questaobanco?SubMateriaGlobalGUID=&Dificuldade=&VestibularGUID=` — busca filtrada direta, sem LLM (item 12 do spec).
- `provaagendadarecomendacao.service.ts`: passo "banco de questões" — se `Assunto.SubMateriaGlobalGUID` mapeada, só verifica se existe `QuestaoBanco` correspondente (pra decidir se o card "Praticar" aparece); filtros de dificuldade/vestibular ficam no modal do aluno, não na geração.

### 4.4 Frontend

- Tela de admin de plataforma nova (fora da navbar padrão — rota protegida por `UsuarioIsPlataformaAdmin`, ex. `/admin-plataforma/...`): CRUD de `QuestaoBanco`/alternativas/`Vestibular`, fila de revisão de `MateriaGlobal.Status='Pendente'` (mesclar → vira alias / confirmar como novo — item 17), revisão de `TextoExtraido` antes de liberar capítulo.
- Tela de aluno: até 4 cards agora (vídeo, resumo, página de livro, banco de questões); botão "Praticar" abre modal com `QuestaoBanco` filtrável.
- Cadastro de prova (professor): fluxo de 2 passos pra referenciar página — primeiro `MaterialDidatico`, depois capítulo/página dentro dele (§6 do spec).

---

## 5. Auditoria e notificações (transversal às 3 fases)

- **Auditoria** (`CategoriaAuditoriaId: 2`, mesmo padrão de `provaagendada.service.ts`): registrar geração/regeneração de recomendação (ator = sistema, sem `UsuarioCPFAtor` — seguir a mesma ressalva já documentada em `PLANO_IMPLEMENTACAO_MATERIAS.md` §8.2 sobre ações automáticas sem ator humano), confirmação/rejeição de mapeamento `Materia→MateriaGlobal`, CRUD de `QuestaoBanco` (ator = admin de plataforma), revisão de `MaterialDidatico` (ator = quem revisou).
- **Notificação:** avaliar na Fase 1 se vale um tipo novo no catálogo (ex. `recomendacao_disponivel`, seguindo o padrão `slug` de `2026-07-17-notificacoes.sql`) pro aluno saber que a recomendação da prova ficou pronta — ou se o card "gerando..." (§2.8) já é suficiente sem notificação separada. Não travado no spec; decidir no início da Fase 1.

---

## 6. Ordem de commits sugerida por fase

1. **Fase 1:** migration → `backend/ai/providers/geminiProvider.ts` + `backend/external/YoutubeDataApiClient.ts` (infra) → agents → `provaagendadarecomendacao.service.ts` + hook em `criarProva`/`atualizarProva` → endpoint de consumo → frontend (cards no visualizador de prova).
2. **Fase 2:** migration → similaridade de string + `materiaglobal.service.ts` → hook em `materia.service.ts` → módulo `assunto` → ajuste no pipeline da Fase 1 → frontend (listbox de assunto + tela de mapeamento).
3. **Fase 3 (A e B em paralelo):**
   - A: migration (compartilhada com B) → upload + extração de `MaterialDidatico` → fila de revisão → `sumarioLivroAgent` → ajuste no pipeline → frontend de referência de página.
   - B: guard de admin → módulo `questaobanco` → endpoint de consulta → ajuste no pipeline → tela de admin de plataforma → modal de prática no frontend do aluno.

Cada item da lista acima é, na prática, um PR isolado e testável — nenhum deixa o sistema quebrado se a fase parar no meio (mesmo princípio de `PLANO_IMPLEMENTACAO_MATERIAS.md` §9).

---

## 7. Pontos em aberto a resolver no início de cada fase (não travados no spec)

| # | Fase | Ponto | Por que não travar agora |
|---|---|---|---|
| 1 | 1 | Nome exato do SDK/model do Gemini (`@google/genai` vs. `@google/generative-ai`, model ids de tier leve/cheio) | SDKs e nomes de model mudam; travar agora arrisca já nascer desatualizado — resolver ao iniciar a Fase 1 |
| 2 | 1 | Se vale notificação nova (`recomendacao_disponivel`) ou só o estado de carregamento no card resolve | Decisão de UX pequena, não estrutural — ver §5 |
| 3 | 3-A | OCR dedicado vs. Gemini multimodal pra extração de texto de página | Impacta uma dependência nova (ou não) — vale comparar custo/qualidade quando a Fase 3 começar, com o Gemini já validado em produção pelas Fases 1/2 |
| 4 | 3-A | Formato exato da fila de revisão humana (tela dedicada vs. aba dentro do cadastro do livro) | Detalhe de UX, resolver com referência visual na hora |

---

## 8. Fora de escopo (herdado do spec, §9)

- Representante de turma complementando manualmente resumo/vídeo por turma — ideia futura registrada no bakeoff, não desenhada aqui.
- Qualquer decisão não coberta pelo spec final continua em aberto e deve ser resolvida antes da fase correspondente começar (mesma regra do spec §9).
