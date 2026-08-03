# 📋 PLANO DE IMPLEMENTAÇÃO — Recomendação de Estudos por IA (Prova Agendada)

**Data:** 2026-08-03
**Status:** Bakeoff de soluções — nenhuma decisão de arquitetura travada ainda, aguardando escolha do usuário antes de iniciar o código
**Escopo:** Feature nova, dentro do módulo **Matérias**, associada ao item "prova" (`ProvaAgendada`)

---

## 0. Resumo executivo

O `PLANO_IMPLEMENTACAO_MATERIAS.md` já previu esta feature e deliberadamente a deixou de fora: *"Recomendação de estudo por IA — fica em stand-by"* (linha 57). Este documento retoma o assunto e propõe, para cada sub-problema, **múltiplas soluções concretas** com risco/custo comparados, em vez de travar uma decisão única.

A feature: quando um aluno abre uma prova agendada, o sistema sugere vídeos do YouTube sobre o assunto, um resumo de texto (quando há material postado), opcionalmente aponta a página exata de um livro didático cadastrado pela escola e — via um banco de questões universal do Bauá (§2.5/§3.5) — oferece um modal de exercícios de vestibular pra o aluno treinar o assunto identificado.

**Decisão de posicionamento já resolvida** (não é bakeoff): a feature vive dentro de **Matérias**, pendurada em `ProvaAgendada` — consistente com o módulo ser central e as demais telas navegarem pra dentro dele, nunca o contrário.

**Decisão de princípio já resolvida** (baseada na troca com o usuário): a IA **deve** consumir o conteúdo já postado (`Conteudo`) e o material da matéria como fonte primária, em vez de depender só do conhecimento genérico do LLM. Isso vale tanto para o resumo de texto quanto — de forma mais forte ainda — para a detecção de assunto e a referência de página de livro, onde "geração livre" é risco de alucinação e "busca em texto que a escola realmente forneceu" é verificável.

---

## 1. Estado atual do código (levantado antes de desenhar este spec)

| Peça | Já existe? | Onde / detalhe |
|---|---|---|
| `ProvaAgendada` | ✅ | `backend/entities/provaagendada.model.ts` — campos: `MateriaGUID`, `ProvaData`, `ProvaDescricao` (texto livre, até 1024 chars, opcional), `ProvaStatus` (`Agendada`\|`Realizada`\|`Cancelada`). **Não tem** campo de assunto/tópico estruturado. |
| `ProvaAgendadaTurma` | ✅ | N:N — uma prova pode valer pra várias turmas |
| `Anexo` + `relacaoanexosprova` | ✅ | `ProvaAgendada` já tem 1:N com `Anexo` — upload genérico já é possível, mas **sem nenhuma extração de texto** do que é anexado |
| `Conteudo` (3 variantes) | ✅ | `ConteudoTexto` (HTML sanitizado, até 200.000 chars), `ConteudoCronometrado` (vídeo/áudio), `ConteudoPaginadoArquivo` (PDF/PPTX/DOCX/imagens, paginação fica "a cargo do futuro visualizador" — citação do próprio código) |
| Extração de texto de PDF/imagem | ❌ | não existe nenhum pipeline de OCR/extração hoje |
| Conceito de "livro didático" / "página de livro" | ❌ | não existe em nenhuma tabela — ideia nova |
| Vocabulário de assunto/tópico (`Assunto`) | ❌ | não existe — `ProvaDescricao` é texto livre sem estrutura |
| Integração com LLM (OpenAI/Anthropic/Azure) | ❌ | `.env.example` tem só placeholders comentados: `OPENAI_API_KEY`, `AZURE_OPENAI_*` |
| Integração com YouTube Data API | ❌ | não configurada, mas `.env.example` já tem `GOOGLE_API_KEY` comentado (mesma família de chave do Google Cloud, reaproveitável pra YouTube Data API v3 — não precisa criar um placeholder novo) |
| Quem vê o módulo Matérias | — | Professor e Aluno; **Direção/Coordenação/Secretaria não acessam** (`PLANO_IMPLEMENTACAO_MATERIAS.md`, linha 36) — relevante pra §3.4, onde quem cadastraria o livro didático é Direção, fora da tela de Matérias |

---

## 2. Os quatro sub-problemas, cada um com opções (bakeoff)

### 2.1 Como a IA descobre o assunto da prova

| # | Opção | Como funciona | Risco | Custo |
|---|---|---|---|---|
| A | Só nome da Matéria | "Matemática" → recomendação genérica de matéria inteira | Recomendação pouco específica, quase inútil pra prova pontual | Nenhum |
| B | `ProvaDescricao` livre | LLM lê o texto que o professor digitou ao agendar a prova | Depende do professor escrever algo útil; hoje o campo é opcional | Baixo |
| C | `Conteudo` postado recente | Olha os conteúdos da mesma Matéria+Turma postados perto da data da prova | Só funciona se o professor organiza conteúdo por proximidade temporal com a prova | Médio (precisa de uma query de "conteúdo recente") |
| D | B + C combinados, LLM gera texto livre | Junta os dois sinais, LLM escreve um resumo de assunto em texto livre | Texto livre é inconsistente ("Trigonometria" vs "trigonometria" vs "Triângulos") — não dá pra usar como chave em nada depois | Médio |
| **E (recomendada)** | B + C + sumário do livro (§2.4) como evidência, mas a IA **classifica** contra uma lista fixa de `Assunto` já cadastrados pra Matéria, em vez de gerar texto novo | Sinal determinístico e reutilizável — vira FK, não texto solto | Médio-alto (exige a tabela `Assunto` existir, ver §3) |

**Por que E e não D:** a pergunta do usuário sobre "um futuro módulo de recomendação de exercícios" só funciona se assunto for uma entidade referenciável (`AssuntoGUID`), não uma string gerada pela IA a cada chamada. Desenhar isso como classificação (escolher dentre uma lista) em vez de geração (inventar um rótulo) também reduz drasticamente o risco de inconsistência e de alucinação — a IA erra escolhendo o assunto errado da lista, mas não consegue inventar um assunto que não existe.

**Reforço de E, sugerido pelo usuário — seleção manual como primeira linha, IA como fallback restrito:** ao criar a prova, o professor pode ele mesmo escolher o(s) `Assunto`/`SubMateriaGlobal` numa listbox (§3.4a) pra **travar** o assunto manualmente — nesse caso a IA nem roda classificação nenhuma pra esse passo, o dado já nasce determinístico e sem custo de LLM. Só se o professor deixar o campo livre (preenche só `ProvaDescricao` em texto solto) é que a classificação por IA do §2.1-E entra em ação — e mesmo assim, restrita exatamente à mesma lista que apareceria na listbox, nunca escolhendo um rótulo fora dela.

**Refinamento da Opção C — categoria em vez de proximidade temporal, sugerido pelo usuário:** a Opção C original buscava `Conteudo` "postado perto da data da prova" — sinal frágil, depende de coincidência de datas. `ConteudoTurma.CategoriaGUID` e `ProvaAgendadaTurma.CategoriaGUID` **já existem no schema atual** (`backend/database/migrations/2026-07-24-materias-modulo.sql`, linhas 44-49) e apontam pra mesma `CategoriaConteudo` — quando o professor organiza prova e conteúdo na mesma categoria (ex.: "Trigonometria"), isso é um sinal estrutural deliberado, não uma coincidência de timing.

| Sinal | Confiabilidade | Cobertura |
|---|---|---|
| Proximidade temporal (Opção C original) | Fraca — depende de coincidência de datas | Sempre disponível, toda prova tem data |
| Mesma categoria (`CategoriaGUID`) | Forte — organização deliberada do professor | Só funciona se o professor usa categoria pra organizar prova+conteúdo juntos; campo é nullable nas duas tabelas |

**Recomendação: categoria como sinal primário, proximidade temporal como fallback.** Se `ProvaAgendadaTurma.CategoriaGUID` estiver preenchida, busca `Conteudo` da mesma categoria (via `ConteudoTurma.CategoriaGUID` igual); se não estiver, cai pro critério de proximidade temporal original — nunca fica sem nenhum sinal.

**Nuance nova, por causa do gatilho compartilhado entre turmas (§4):** `CategoriaGUID` vive em `ProvaAgendadaTurma` (por turma), não em `ProvaAgendada`. Como a recomendação é gerada uma vez pra prova inteira, turmas diferentes da mesma prova podem estar em categorias diferentes — a coleta de contexto deve unir (sem duplicar) o `Conteudo` de todas as categorias usadas por qualquer turma daquela prova, consistente com a decisão já travada de que a recomendação vale igual pra todas elas.

### 2.2 Recomendação de vídeos do YouTube

| # | Opção | Como funciona | Risco |
|---|---|---|---|
| A | LLM sugere vídeos "de memória" | Pede ao LLM títulos/URLs de vídeos sobre o assunto | **Alto** — LLMs alucinam URLs e títulos que não existem ou não correspondem ao vídeo real |
| B | YouTube Data API v3 pura | Busca direta por palavra-chave (nome do assunto/matéria) | Baixo risco de alucinação, mas resultado tão bom quanto a query — sem refinamento, pode trazer resultado genérico ou de baixa qualidade |
| **C (recomendada)** | Híbrido: LLM gera 2-3 queries de busca a partir do(s) `Assunto`(s) detectado(s) → API real do YouTube executa a busca → LLM opcionalmente reordena os resultados reais por relevância | O LLM nunca inventa um vídeo, só melhora a busca e a ordenação de resultados que realmente existem | Baixo (a "verdade" sempre vem da API, o LLM só orienta a busca) |

### 2.3 Resumo de texto

| # | Opção | Como funciona | Risco |
|---|---|---|---|
| A | LLM resume "do que sabe" sobre o assunto | Pede ao LLM um resumo genérico do tópico | Ungrounded — pode divergir do que o professor realmente ensinou/postou |
| **B (recomendada)** | LLM resume o `Conteudo` (texto/arquivo) que o professor efetivamente postou, com instrução de usar **só** o texto fornecido | Fiel ao que foi ensinado; exige que exista conteúdo extraível | Exige pipeline de extração de texto de PDF/imagem (não existe hoje) pra cobrir `ConteudoPaginadoArquivo` |

Confirmando o que o usuário já observou: com a Opção B, se o professor não postou nada de `Conteudo` pra aquela matéria/período, **o card de resumo simplesmente não aparece** — a feature não deve gerar um resumo genérico como fallback (isso reintroduziria o risco da Opção A pela porta dos fundos).

### 2.4 Referência de página de livro

| # | Opção | Como funciona | Risco |
|---|---|---|---|
| 1 (descartada) | Professor digita "página 42" em texto livre, IA tenta adivinhar o conteúdo daquela página de um livro que nunca viu | **Altíssimo** — alucinação estrutural, não é um problema de prompt, é a IA inventando conteúdo de um livro específico sem ter acesso a ele | — |
| 2 | Professor anexa um scan/foto da página, pontualmente, por prova (via `Anexo`, que já existe) | Grounded (OCR só na página real) | Repetitivo — a mesma página, se referenciada em provas diferentes, é extraída de novo a cada vez; não fica reaproveitável entre professores da mesma escola |
| **3 (recomendada, nasceu da sugestão do usuário)** | Livro didático cadastrado **uma vez**, em nível de **Escola**, por Direção/Coordenação (fora da tela de Matérias, que Direção não acessa). Extração de texto por página feita no cadastro (mesmo pipeline do §2.3) e cacheada. Ao criar a prova, o professor referencia capítulo/página e o sistema **busca** o texto já extraído — busca determinística, não geração | Risco baixo: a IA nunca "adivinha" o conteúdo de uma página, só recupera texto que já foi extraído e fica sujeito a validação humana no cadastro | Alto custo inicial (nova entidade, novo fluxo de cadastro admin, pipeline de extração), mas reutilizável indefinidamente depois de pronto |

Sem livro cadastrado, a referência de página **não deve ser oferecida** como opção pro professor — melhor omitir a funcionalidade do que abrir a porta pra Opção 1 disfarçada.

### 2.5 Banco de questões de vestibular (treino do aluno) — especificado pelo usuário

Sub-problema novo, adicionado depois da primeira rodada do bakeoff: além de vídeo/resumo/página, a IA também deve poder abrir um **modal de exercícios** pro aluno praticar o assunto identificado, puxando de um banco de questões próprio do Bauá.

Características já definidas pelo usuário (não é bakeoff, é especificação):

- **Escopo universal, não por escola:** a mesma tabela de questões vale pra todas as escolas do Bauá — é um banco de vestibular curado pela plataforma, não conteúdo de uma escola específica.
- **Campos por questão:** enunciado, nível de dificuldade, alternativas (com a correta marcada), matéria, submatéria, e um vídeo do YouTube resolvendo o exercício (curado manualmente, não buscado pela IA).
- **Filtros no modal:** dificuldade e vestibular de origem (ex.: ENEM, FUVEST...).
- **População do banco:** só o criador do Bauá, via uma tela secreta protegida por senha — **não** passa pelo sistema de papéis (`EscolaXUsuarioXFuncao`) que o resto do app usa, porque isso é nível de plataforma, não de escola.
- **Acionamento:** a IA identifica matéria/submatéria da prova (§2.1) e busca questões correspondentes — é uma consulta filtrada simples nessa etapa, não precisa de outra chamada de LLM.

Como o banco é universal mas `Materia`/`Assunto` (§3.1) são escopados por Escola (`Materia.EscolaGUID` já existe no schema atual), isso força uma peça de modelo de dados nova — uma taxonomia global separada — detalhada em §3.4.

---

## 3. Peças novas de modelo de dados (nascidas das perguntas do usuário)

### 3.1 `Assunto` — vocabulário controlado por Matéria

Resolve §2.1-E e prepara o terreno pro banco de questões futuro (mencionado pelo usuário: "para depois buscar exercícios de trigonometria").

```sql
CREATE TABLE assunto (
  AssuntoGUID CHAR(36) PRIMARY KEY,
  MateriaGUID CHAR(36) NOT NULL,
  AssuntoPaiGUID CHAR(36) NULL,        -- hierarquia opcional: "Trigonometria" pai de "Lei dos Senos"
  Nome VARCHAR(150) NOT NULL,
  Origem ENUM('Manual','SumarioLivro','SugeridoIA') NOT NULL DEFAULT 'Manual',
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assunto_materia_nome (MateriaGUID, Nome),
  FOREIGN KEY (MateriaGUID) REFERENCES materia(MateriaGUID),
  FOREIGN KEY (AssuntoPaiGUID) REFERENCES assunto(AssuntoGUID)
);

-- N:N — uma prova pode cobrir mais de um assunto
CREATE TABLE provaagendadaassunto (
  ProvaAgendadaGUID CHAR(36) NOT NULL,
  AssuntoGUID CHAR(36) NOT NULL,
  PRIMARY KEY (ProvaAgendadaGUID, AssuntoGUID),
  FOREIGN KEY (ProvaAgendadaGUID) REFERENCES provaagendada(ProvaAgendadaGUID),
  FOREIGN KEY (AssuntoGUID) REFERENCES assunto(AssuntoGUID)
);
```

**Por que uma tabela separada e não um campo texto em `ProvaAgendada`:** é exatamente o ponto levantado pelo usuário — se `Assunto` for uma entidade com GUID próprio desde o início, a futura tabela de questões/exercícios referencia o mesmo `AssuntoGUID` por FK sem precisar re-tagear nada que já existe. Fazer isso como texto livre agora e migrar pra taxonomia depois é retrabalho evitável.

**Origem enum:** deixa rastreável se o assunto veio de cadastro manual do professor, do sumário de um livro (§3.2) ou de sugestão da IA — importante pra decidir, mais pra frente, se sugestões de IA precisam de aprovação humana antes de "valer" oficialmente.

### 3.2 `MaterialDidatico` — livro cadastrado em nível de Escola

Resolve §2.4-3 (referência de página) e §2.1 (sumário do livro como sinal de assunto).

**Revisão importante, apontada pelo usuário:** a primeira versão deste desenho amarrava `MateriaGUID` direto no livro (`materialdidatico.MateriaGUID NOT NULL`), assumindo 1 livro = 1 matéria. Isso quebra em dois cenários reais: (a) uma escola pode ter **mais de um livro pra mesma matéria** (dois livros de Matemática, por exemplo) — o professor precisa dizer QUAL dos dois ao referenciar uma página, não só o número da página; (b) pode existir **um livro geral cobrindo mais de uma matéria** (ex.: um livro de "Ciências" com seções de Física, Química e Biologia) — nesse caso a matéria não é do livro inteiro, é de cada capítulo. Solução: tirar `MateriaGUID` do livro e colocar no **capítulo**.

```sql
CREATE TABLE materialdidatico (
  MaterialDidaticoGUID CHAR(36) PRIMARY KEY,
  EscolaGUID CHAR(36) NOT NULL,
  Titulo VARCHAR(255) NOT NULL,        -- sem MateriaGUID: um livro pode cobrir 1 ou várias matérias, ver capítulo abaixo
  CriadoPorCPF VARCHAR(14) NOT NULL,   -- Direção/Coordenação que cadastrou
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID),
  FOREIGN KEY (CriadoPorCPF) REFERENCES usuario(UsuarioCPF)
);

CREATE TABLE materialdidaticopagina (
  MaterialDidaticoPaginaGUID CHAR(36) PRIMARY KEY,
  MaterialDidaticoGUID CHAR(36) NOT NULL,
  NumeroPagina INT UNSIGNED NOT NULL,
  ArquivoUrl VARCHAR(500) NOT NULL,    -- scan/imagem da página, mesmo padrão de storage do resto do sistema
  TextoExtraido LONGTEXT NULL,         -- preenchido pelo pipeline de extração; NULL até processar
  ExtraidoEm DATETIME NULL,
  UNIQUE KEY uq_materialpagina (MaterialDidaticoGUID, NumeroPagina),
  FOREIGN KEY (MaterialDidaticoGUID) REFERENCES materialdidatico(MaterialDidaticoGUID)
);

-- Sumário: capítulo/faixa de página → matéria + assunto (gerado 1x, revisado por humano)
CREATE TABLE materialdidaticocapitulo (
  MaterialDidaticoCapituloGUID CHAR(36) PRIMARY KEY,
  MaterialDidaticoGUID CHAR(36) NOT NULL,
  MateriaGUID CHAR(36) NOT NULL,       -- cada capítulo pertence a UMA matéria da escola — é aqui que "cada matéria pega sua parte" acontece
  Titulo VARCHAR(255) NOT NULL,
  PaginaInicio INT UNSIGNED NOT NULL,
  PaginaFim INT UNSIGNED NOT NULL,
  AssuntoGUID CHAR(36) NULL,           -- vínculo com §3.1, pode ficar sem match
  FOREIGN KEY (MaterialDidaticoGUID) REFERENCES materialdidatico(MaterialDidaticoGUID),
  FOREIGN KEY (MateriaGUID) REFERENCES materia(MateriaGUID),
  FOREIGN KEY (AssuntoGUID) REFERENCES assunto(AssuntoGUID)
);
```

Com isso: um livro de matéria única simplesmente tem todos os capítulos com o mesmo `MateriaGUID`; um livro geral tem capítulos com `MateriaGUID` diferentes por seção — mesma tabela cobre os dois casos sem precisar de flag extra.

**Impacto na UX de referenciar página (§2.4-3):** como pode haver mais de um livro pra mesma matéria, o professor não escolhe só "capítulo/página" — primeiro escolhe **qual `MaterialDidatico`** (listado entre os livros que têm pelo menos um capítulo daquela `MateriaGUID`), depois o capítulo/página dentro dele. Sem isso, "página 42" seria ambíguo se a escola tiver dois livros cadastrados.

**Por que nível de Escola, não Matéria/Turma:** quem cadastra é Direção/Coordenação, que não acessa a tela de Matérias — é fluxo administrativo separado (mais perto de Gestão de Dados do que de Matérias), mesmo que o resultado (texto extraído) seja consumido de dentro de Matérias na hora de montar a prova.

**Por que cachear `TextoExtraido` por página em vez de extrair sob demanda:** extração (OCR ou parsing de PDF) é cara e lenta; cadastrando o livro uma vez, toda prova que referenciar aquele capítulo reaproveita o mesmo texto sem reprocessar.

### 3.3 Cache da recomendação gerada

```sql
CREATE TABLE provaagendadarecomendacao (
  ProvaAgendadaRecomendacaoGUID CHAR(36) PRIMARY KEY,
  ProvaAgendadaGUID CHAR(36) NOT NULL,
  VideosJson JSON NULL,                -- [{titulo, url, canal}], vindo da API real do YouTube
  ResumoTexto LONGTEXT NULL,           -- NULL se não havia Conteudo/MaterialDidatico suficiente (§2.3)
  FontesUsadas JSON NULL,              -- quais ConteudoGUID/MaterialDidaticoCapituloGUID alimentaram o resumo, pra rastreabilidade
  ModeloUsado VARCHAR(100) NULL,
  GeradoEm DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recomendacao_prova (ProvaAgendadaGUID),
  FOREIGN KEY (ProvaAgendadaGUID) REFERENCES provaagendada(ProvaAgendadaGUID)
);
```

Sem isso, cada aluno que abre a tela da prova dispararia uma chamada de LLM+YouTube nova — caro e lento. Gerar uma vez, no gatilho definido em §4, e cachear, com um botão "regenerar" manual pro professor quando o conteúdo mudar.

### 3.4 Taxonomia global (`MateriaGlobal`/`SubMateriaGlobal`) — ponte entre escola e banco universal

`Materia` (e por extensão `Assunto`, §3.1) é escopado por Escola (`Materia.EscolaGUID`). O banco de questões (§2.5) precisa ser o mesmo pra todas as escolas — não dá pra ele referenciar o `MateriaGUID` de uma escola específica. A solução é uma taxonomia separada, mantida pela plataforma (mesma tela secreta que popula `QuestaoBanco`, §3.5), e uma ponte opcional a partir do `Assunto` de cada escola:

```sql
CREATE TABLE materiaglobal (
  MateriaGlobalGUID CHAR(36) PRIMARY KEY,
  Nome VARCHAR(150) NOT NULL UNIQUE      -- ex.: "Matemática"
);

CREATE TABLE submateriaglobal (
  SubMateriaGlobalGUID CHAR(36) PRIMARY KEY,
  MateriaGlobalGUID CHAR(36) NOT NULL,
  Nome VARCHAR(150) NOT NULL,            -- ex.: "Trigonometria"
  UNIQUE KEY uq_submateriaglobal (MateriaGlobalGUID, Nome),
  FOREIGN KEY (MateriaGlobalGUID) REFERENCES materiaglobal(MateriaGlobalGUID)
);

-- Ponte: o Assunto de UMA escola aponta pra sua submatéria canônica global, quando existir match
ALTER TABLE assunto
  ADD COLUMN SubMateriaGlobalGUID CHAR(36) NULL,
  ADD FOREIGN KEY (SubMateriaGlobalGUID) REFERENCES submateriaglobal(SubMateriaGlobalGUID);
```

Com essa ponte, o caminho fica: `ProvaAgendada → Assunto (escola) → SubMateriaGlobal → QuestaoBanco`. Sem ela — se o `Assunto` detectado não tiver mapeamento pra nenhuma `SubMateriaGlobal` — o módulo de treino simplesmente não aparece (mesmo princípio de fallback do §2.5/§5).

**Quem preenche `Assunto.SubMateriaGlobalGUID`:** resolvido em parte pelo fluxo do §3.4a abaixo (sugerido pelo usuário) — o mapeamento nasce no nível de `Materia`, não precisa ser refeito assunto por assunto.

### 3.4a Mapeamento self-service `Materia → MateriaGlobal` (sugerido pelo usuário)

Em vez de alguém curar manualmente cada `Assunto` pra sua `SubMateriaGlobal` correspondente, o mapeamento acontece uma vez, no nível da `Materia` da escola, e as listboxes de assunto derivam dele automaticamente:

```sql
ALTER TABLE materiaglobal
  ADD COLUMN Status ENUM('Pendente','Confirmado') NOT NULL DEFAULT 'Confirmado';
  -- linhas cadastradas pela tela secreta (§3.5) nascem 'Confirmado';
  -- linhas formalizadas automaticamente pelo fluxo abaixo nascem 'Pendente' até revisão

ALTER TABLE materia
  ADD COLUMN MateriaGlobalGUID CHAR(36) NULL,
  ADD FOREIGN KEY (MateriaGlobalGUID) REFERENCES materiaglobal(MateriaGlobalGUID);
```

**Fluxo, como descrito pelo usuário:**

1. Ao criar/editar uma `Materia`, o sistema compara `Materia.Nome` contra `materiaglobal.Nome` (`LIKE`/similaridade — ex.: "Matemática" ↔ "Matemática", "Matematica" ↔ "Matemática").
2. Se achar candidato(s) plausível(is), oferece numa listbox pra confirmar qual bate.
3. Se não achar nenhum, a IA formaliza uma `MateriaGlobal` nova com `Status='Pendente'`, já vinculada à `Materia` da escola — **não bloqueia** o cadastro da escola esperando aprovação de ninguém.
4. Linhas `Pendente` já funcionam normalmente pra essa escola (listbox de assunto, §2.1) mas ficam numa fila de revisão na tela secreta (§3.5) pra quem mantém o banco consolidar nomes duplicados/parecidos entre escolas diferentes antes de autorar `QuestaoBanco` contra elas — sem essa fila, duas escolas poderiam formalizar "Ed. Física" e "Educação Física" como duas `MateriaGlobal` distintas e fragmentar o banco.
5. Com `Materia.MateriaGlobalGUID` setada, a tela de assunto (dentro de Matérias) passa a oferecer diretamente a listbox de `SubMateriaGlobal` daquela `MateriaGlobal` em vez de pedir texto livre — selecionar uma opção cria/associa o `Assunto` local já com `SubMateriaGlobalGUID` preenchido, sem passo de curadoria extra.

### 3.5 `QuestaoBanco`/`QuestaoBancoAlternativa` — banco de questões universal

Mesmo padrão relacional que `TarefaAcademicaQuestao`/`TarefaAcademicaAlternativa` já usam hoje (`backend/entities/tarefaacademica-questao.model.ts`, `tarefaacademica-alternativa.model.ts`) — nome diferente pra não colidir, já que é uma entidade conceitualmente separada (curadoria da plataforma, não autoria de professor por tarefa).

```sql
CREATE TABLE vestibular (
  VestibularGUID CHAR(36) PRIMARY KEY,
  Nome VARCHAR(100) NOT NULL UNIQUE      -- ex.: "ENEM", "FUVEST" — tabela pra filtro não virar texto livre fragmentado
);

CREATE TABLE questaobanco (
  QuestaoBancoGUID CHAR(36) PRIMARY KEY,
  MateriaGlobalGUID CHAR(36) NOT NULL,
  SubMateriaGlobalGUID CHAR(36) NOT NULL,
  VestibularGUID CHAR(36) NOT NULL,
  Dificuldade ENUM('Facil','Media','Dificil') NOT NULL,
  Enunciado TEXT NOT NULL,
  VideoResolucaoUrl VARCHAR(500) NULL,   -- curado manualmente, a IA não busca isso
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MateriaGlobalGUID) REFERENCES materiaglobal(MateriaGlobalGUID),
  FOREIGN KEY (SubMateriaGlobalGUID) REFERENCES submateriaglobal(SubMateriaGlobalGUID),
  FOREIGN KEY (VestibularGUID) REFERENCES vestibular(VestibularGUID)
);

CREATE TABLE questaobancoalternativa (
  AlternativaGUID CHAR(36) PRIMARY KEY,
  QuestaoBancoGUID CHAR(36) NOT NULL,
  AlternativaTexto VARCHAR(1000) NOT NULL,
  AlternativaCorreta BOOLEAN NOT NULL DEFAULT FALSE,
  AlternativaOrdem TINYINT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (QuestaoBancoGUID) REFERENCES questaobanco(QuestaoBancoGUID)
);
```

**Acesso de escrita (tela secreta):** não passa pelo `EscolaXUsuarioXFuncao` porque não é papel de escola nenhuma — é nível de plataforma. Duas formas de implementar, ambas viáveis, trade-off de segurança vs. simplicidade:

| Opção | Como funciona | Trade-off |
|---|---|---|
| **A — senha compartilhada** (como o usuário descreveu: "tela secreta que pede senha") | Rota protegida por uma senha única guardada em variável de ambiente, sem vínculo com `usuario`/login | Simples de implementar; sem trilha de auditoria de quem fez o quê, sem rotação por pessoa, sem bloqueio por tentativa |
| B — flag em `usuario` existente | Um campo tipo `UsuarioIsPlataformaAdmin` numa conta normal, login normal + essa tela extra liberada só pra ela | Mais seguro e auditável (fica registrado qual `UsuarioCPF` cadastrou cada questão), mas é mais estrutura do que o usuário pediu |

A opção descrita pelo usuário é A; deixo B registrada como alternativa mais robusta, mas a decisão é do usuário (§6).

### 3.6 Modal de prática — consumo pelo aluno

Sem chamada de LLM nesta etapa — é busca filtrada direta assim que `Assunto` (ou `SubMateriaGlobal` mapeada) já foi identificado (§2.1/§3.4):

```
SELECT * FROM questaobanco
WHERE SubMateriaGlobalGUID = :subMateriaGlobalGUID
  [AND Dificuldade = :filtroDificuldade]
  [AND VestibularGUID = :filtroVestibular]
```

Se não houver `SubMateriaGlobal` mapeada, ou não houver nenhuma `QuestaoBanco` pra ela, o botão "Praticar"/modal simplesmente não aparece — mesmo princípio de fallback silencioso do restante da feature (§5).

### 3.7 Bakeoff de provedores de IA — qual LLM usar, e se vale segmentar por tarefa

Pedido explícito do usuário: comparar provedores e avaliar se compensa usar mais de uma IA, cada uma numa etapa diferente do pipeline (§4).

**Provedores candidatos:**

| Provedor | A favor | Contra |
|---|---|---|
| **Google (Gemini)** | `.env.example` já antecipa `GOOGLE_API_KEY` — e essa MESMA chave (mesmo projeto Google Cloud) já cobre a YouTube Data API v3 (§2.2), reduzindo de 2 segredos pra 1 só; suporta output estruturado (`responseSchema`) nativo; janelas de contexto grandes | Nenhuma integração de IA existe hoje no projeto, então "menos usado aqui até agora" não pesa como contra de verdade |
| **OpenAI (GPT)** | Ecossistema maduro, JSON mode/structured outputs bem documentado, `.env.example` já tem placeholder | Chave e billing 100% separados do que já cobre o YouTube — mais um segredo pra gerenciar |
| **Azure OpenAI** | Mesmo modelo da OpenAI, com controles de compliance/enterprise | Overhead de provisionamento de recurso Azure sem benefício claro pro porte atual do projeto — overkill |
| **Anthropic (Claude)** | Forte em seguir instrução (relevante pro grounding do resumo, §2.3) | Nenhum placeholder existe hoje em `.env.example` — precisaria criar a convenção do zero |

**Recomendação: Google (Gemini).** O fator decisivo não é qualidade de modelo — os quatro são competitivos hoje pra essas tarefas — é operacional: Gemini significa **uma única chave/projeto Google Cloud cobrindo LLM + YouTube Data API**, um segredo a menos pra gerenciar num projeto que já vai lidar com chave de LLM, chave de YouTube e credenciais de storage (R2) separadamente.

**Segmentação por tarefa — vale usar mais de uma IA?** Não compensa trocar de PROVEDOR por tarefa (soma complexidade de SDK/billing sem necessidade) — mas vale usar **tiers diferentes do mesmo provedor** conforme a exigência de cada etapa:

| Etapa (§4) | Exigência | Tier recomendado |
|---|---|---|
| Classificação de assunto (passo 3) | Escolher 1 item de uma lista curta, output estruturado | Leve/rápido (ex.: tier "Flash") — tarefa fechada, não exige raciocínio pesado |
| Geração de queries de busca do YouTube (passo 4) | Gerar 2-3 strings curtas a partir do assunto | Leve/rápido — mesma categoria da anterior |
| Resumo grounded (passo 5) | Ler texto potencialmente longo (até 200.000 chars de `ConteudoTexto`, ou capítulo extraído de livro) e resumir sem extrapolar | "Cheio"/mais capaz — fidelidade importa mais que velocidade aqui |
| Sumário do livro (§3.2, cadastro do `MaterialDidatico`) | Rodado 1x por livro, estrutura capítulo→página→assunto | "Cheio" — infrequente, vale gastar mais por chamada já que alimenta dado reutilizado por muito tempo |
| Match `Materia → MateriaGlobal` (§3.4a) | Comparar nomes curtos | Pode nem precisar de LLM — ver abaixo |

**Match `Materia → MateriaGlobal` sem gastar LLM à toa:** o usuário sugeriu perguntar a % de confiança do match pra IA. Comparar dois nomes curtos ("Educação Física" vs "Ed. Física") é um problema clássico de **similaridade de string** (Levenshtein/trigram) — determinístico, instantâneo, sem custo de API. Recomendação em duas camadas: (1) roda similaridade de string entre `Materia.Nome` e todo `materiaglobal.Nome` + aliases (abaixo); se o melhor score bater um limiar alto (ex.: ≥ 0.85), confirma automático, sem listbox nem LLM; (2) só se o score ficar numa faixa ambígua entra uma chamada de LLM (tier leve) pra desempatar e devolver candidato + % de confiança — junto com a listbox de fallback pro professor confirmar. Isso resolve a pergunta 6 do §6 (auto-confirma quando o match é bom, listbox quando não é) sem gastar LLM no caso comum.

**Lista de aliases — resolve a incerteza da pergunta 6b:** em vez de uma lista estática mantida manualmente, a tabela **aprende sozinha** a cada resolução manual da fila `Pendente` (§3.4a):

```sql
CREATE TABLE materiaglobalalias (
  MateriaGlobalAliasGUID CHAR(36) PRIMARY KEY,
  MateriaGlobalGUID CHAR(36) NOT NULL,
  NomeAlias VARCHAR(150) NOT NULL,
  FOREIGN KEY (MateriaGlobalGUID) REFERENCES materiaglobal(MateriaGlobalGUID),
  UNIQUE KEY uq_alias (NomeAlias)
);
```

Toda vez que alguém mescla manualmente um item `Pendente` numa `MateriaGlobal` já existente (em vez de deixar virar uma nova), o nome original tentado vira uma linha em `materiaglobalalias`. A lista de variações conhecidas cresce organicamente a partir de decisões humanas reais — sem manutenção manual de lista estática, e cobre sinônimos que a similaridade de string sozinha não pegaria (ex.: "Língua Portuguesa" vs "Português").

## Ideias futuras (fora de escopo desta spec)

- **Representante de turma complementando manualmente resumo/vídeo da prova:** sugerido pelo usuário — no futuro, o representante de turma (mesmo papel que já customiza capa/cor de turma, `PLANO_IMPLEMENTACAO_MATERIAS.md`) poderia adicionar resumos e vídeos pra uma prova específica, num esquema parecido com o de `CategoriaConteudo`: a prova é criada em massa (1 registro compartilhado por N turmas, §4.1), mas a complementação manual teria particularidades por turma — cada turma com seu próprio complemento em cima da recomendação gerada por IA, sem afetar as outras turmas da mesma prova. Não faz parte desta spec; registrado só pra não se perder.

---

## 4. Pipeline de execução (visão de alto nível, já refletindo as opções recomendadas: E / C / B / 3, e o gatilho confirmado pelo usuário)

1. **Gatilho — confirmado pelo usuário, travado:** dispara **na criação da `ProvaAgendada`** pelo professor, uma única vez. Como uma prova é 1 registro compartilhado por N turmas via `ProvaAgendadaTurma`, a recomendação gerada (vídeo/resumo/questões) vale pra todas as turmas daquela prova — não se regenera por turma, exatamente pra evitar gasto repetido de LLM/API que o usuário sinalizou como preocupação.
2. **Coleta de contexto:** `Materia` + `ProvaDescricao` + `Conteudo` da(s) mesma(s) categoria(s) da prova (união entre as turmas, ver refinamento de §2.1) — com fallback pra proximidade temporal se nenhuma turma da prova usa categoria — + capítulos de `MaterialDidatico` referenciados manualmente pelo professor, se houver.
3. **Classificação de assunto:** se o professor já travou o(s) `Assunto` manualmente na listbox (§2.1/§3.4a) ao criar a prova, esse passo **nem roda** — usa direto o que foi selecionado, sem chamada de LLM. Só se o campo ficou solto é que o LLM classifica, e mesmo assim restrito à mesma lista de `Assunto`/`SubMateriaGlobal` daquela Matéria — nunca inventa um assunto novo; pode retornar "nenhum aplicável".
4. **Busca de vídeo:** LLM gera 2-3 queries a partir do(s) `Assunto` → YouTube Data API v3 real → LLM opcionalmente reordena os resultados reais.
5. **Resumo:** só roda se houver `Conteudo`/capítulo de `MaterialDidatico` disponível; prompt restringe o LLM a usar **só** o texto fornecido, com citação da fonte.
6. **Banco de questões:** se `Assunto.SubMateriaGlobalGUID` estiver mapeada, busca (sem LLM) as `QuestaoBanco` correspondentes — só pra saber se há alguma disponível; os filtros de dificuldade/vestibular ficam pro aluno escolher na hora de abrir o modal, não são decididos na geração.
7. **Persistência:** grava em `provaagendadarecomendacao`; tela do aluno lê o cache, nunca gera na hora. Cada peça (vídeo/resumo/questões/página) é independente — se uma faltar, as outras aparecem normalmente.

---

## 5. Riscos e guardrails

- **Regra geral de fallback, confirmada pelo usuário:** nenhuma peça (vídeo, resumo, questão, página de livro) tem substituto forçado. Se a IA não encontra vídeo real, não tem material suficiente pra resumir, ou não há questão disponível pro assunto, **aquela peça simplesmente não aparece** — sem gerar algo genérico/inventado como fallback.
- **Alucinação de página de livro:** banida por design — a Opção 1 (§2.4) fica documentada aqui só pra registrar por que foi descartada; a implementação real nunca deixa o LLM gerar conteúdo de página sem texto extraído de verdade por trás.
- **Alucinação de vídeo/questão:** vídeos de YouTube sempre vêm da API real (§2.2-C), nunca gerados pelo LLM; questões sempre vêm de `QuestaoBanco` curado manualmente (§2.5/§3.5), a IA só filtra, nunca inventa enunciado ou alternativa.
- **Prompt injection via conteúdo postado:** texto de `Conteudo`/`MaterialDidatico` vira parte do prompt do resumo — precisa de delimitação clara no prompt (mesma cautela que `ConteudoTexto` já tem contra XSS, aqui é sanitização de prompt, não de HTML).
- **Falha graciosa:** se a chave de LLM ou do YouTube não estiver configurada, ou a chamada falhar, a tela mostra "recomendação indisponível" — a prova em si (`ProvaAgendada`) continua funcionando normalmente; a feature é aditiva, nunca bloqueante.
- **Custo:** gatilho único por prova (§4.1) + cache em `provaagendadarecomendacao` evita qualquer reprocessamento por turma ou por carregamento de tela; extração de página de livro roda uma vez no cadastro, não por prova.
- **Qualidade do OCR/extração:** `TextoExtraido` pode sair errado (letra ruim, PDF escaneado torto); recomenda-se um passo de revisão humana antes do capítulo/página "valer" oficialmente — decisão de fluxo em aberto, ver §6.
- **Tela secreta do banco de questões:** se implementada como senha compartilhada (§3.5, Opção A), é uma superfície de ataque nova fora do sistema de auth existente — recomenda-se pelo menos rate-limiting na rota e a senha nunca em código-fonte (só variável de ambiente).

---

## 6. Perguntas em aberto pro usuário — ✅ todas respondidas

Todas as 7 perguntas foram decididas pelo usuário. As decisões finais (não o raciocínio do bakeoff) estão consolidadas em **`docs/SPEC_RECOMENDACAO_ESTUDOS_IA.md`** — este documento continua sendo a referência do *porquê* de cada escolha (comparações, opções descartadas, análises), mas a partir daqui qualquer implementação deve seguir o spec final, não este bakeoff.

| # | Pergunta | Decisão |
|---|---|---|
| 1 | Provedor de LLM | Ver bakeoff de provedores em §3.7 — vencedor: **Google (Gemini)**, com tiering por tarefa. Decisão final registrada no spec novo. |
| 2 | `Assunto` começa vazio ou manual desde o início? | Resolvido via §3.4a — nasce do mapeamento `Materia→MateriaGlobal`, não depende só de `MaterialDidatico` existir |
| 3 | `MaterialDidatico`: revisão humana antes de publicar? | **Sim, revisão humana obrigatória** antes do capítulo/página "valer" oficialmente |
| 4 | Regeneração automática em edição da prova? | **Sim, automática** — sempre que a prova (ou seu contexto: categoria, conteúdo vinculado, assunto travado) muda, regenera; continua compartilhada entre turmas (§4.1) |
| 5 | Auth da tela secreta do banco de questões | **Conta de usuário com flag de admin de plataforma** (§3.5-B) — não senha compartilhada |
| 6 | Confirmação do mapeamento `Materia→MateriaGlobal`: sempre visível ou automática? | **Híbrido, resolvido em §3.7:** auto-confirma se o match for de alta confiança; listbox manual só quando o match for ambíguo |
| 6b | Fila `Pendente`: revisão manual ou auto-merge? | **Tabela de aliases que aprende com cada resolução manual** (§3.7) — reduz a fila com o tempo sem exigir auto-merge automático sem supervisão |
| 7 | Fasear a implementação? | **Sim** — Fase 1 (resumo+vídeo sem `Assunto`/`MaterialDidatico`/`QuestaoBanco`) → Fase 2 (`Assunto`+`MateriaGlobal`) → Fase 3 (`MaterialDidatico`+`QuestaoBanco`) |

**Próximo passo:** revisão do `docs/SPEC_RECOMENDACAO_ESTUDOS_IA.md` pelo usuário; depois disso, um plano de implementação de verdade (faseado, por sprint/PR) é escrito a partir dele.
