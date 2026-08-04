# 📋 SPEC — Expansão de Escopo (Funcionalidades, Bibliotecas, Arquitetura)

**Data:** 2026-08-04
**Status:** Spec de propostas — nenhuma decisão travada, aguardando priorização do usuário
**Escopo:** As 11 sugestões levantadas na auditoria completa de 2026-08-04 (ver nota "Produto" em `docs/RELATORIO_BAUA_CODIGO_2.md`), detalhadas aqui uma a uma pra virarem specs de implementação individuais quando priorizadas

---

## 0. Resumo executivo

Este documento não é um plano de implementação — é um cardápio. Cada seção abaixo é autocontida: contexto no código atual, o que seria construído, e as decisões que faltam antes de qualquer linha de código. Quando o usuário escolher uma (ou algumas) pra levar adiante, ela vira um `docs/PLANO_IMPLEMENTACAO_<nome>.md` próprio, no mesmo padrão dos outros módulos.

Nada aqui foi implementado.

---

## 1. Novas funcionalidades

### 1.1 Sistema de frequência/chamada

**Contexto atual:** não existe nenhuma entidade de presença em aula no sistema. `Matricula` sabe quem está numa turma; `TarefaAcademica`/`ProvaAgendada` sabem o que foi atribuído; nada registra "o aluno X estava presente na aula Y no dia Z". Pra uma plataforma de gestão escolar completa (não só sala de aula digital), presença costuma ser um dos pilares básicos.

**Proposta de modelo:**

```sql
CREATE TABLE chamadaaula (
  ChamadaAulaGUID CHAR(36) PRIMARY KEY,
  MatProfTurGUID CHAR(36) NOT NULL,     -- mesmo âncora que TarefaAcademica usa (professor+matéria+turma)
  ChamadaData DATE NOT NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_chamada (MatProfTurGUID, ChamadaData),
  FOREIGN KEY (MatProfTurGUID) REFERENCES materiaxprofessorxturma(MatProfTurGUID)
);

CREATE TABLE chamadaaulapresenca (
  ChamadaAulaPresencaGUID CHAR(36) PRIMARY KEY,
  ChamadaAulaGUID CHAR(36) NOT NULL,
  MatriculaGUID VARCHAR(36) NOT NULL,
  Status ENUM('Presente','Falta','FaltaJustificada') NOT NULL DEFAULT 'Presente',
  Observacao VARCHAR(255) NULL,
  UNIQUE KEY uq_presenca (ChamadaAulaGUID, MatriculaGUID),
  FOREIGN KEY (ChamadaAulaGUID) REFERENCES chamadaaula(ChamadaAulaGUID),
  FOREIGN KEY (MatriculaGUID) REFERENCES matricula(MatriculaGUID)
);
```

**UX:** professor abre "Chamada" na tela da turma (módulo Matérias), marca presença/falta por aluno, uma vez por dia/aula. Aluno e Responsável (`FuncaoId=4`, já existe no sistema) veem o histórico.

**Perguntas em aberto:**
- Falta justificada aceita anexo (atestado)? Reaproveita `Anexo` já existente.
- Falta gera notificação automática pro Responsável (reaproveita `NotificacaoTipo`/scheduler já existentes)?
- Frequência mínima vira regra de negócio em algum lugar (ex.: bloqueio de acesso), ou é só registro informativo por enquanto?

---

### 1.2 Reforço automático a partir do `QuestaoBanco`

**Contexto atual:** a Recomendação de Estudos por IA já constrói toda a cadeia `Assunto → SubMateriaGlobal → QuestaoBanco` filtrável por dificuldade. `TarefaNota` existe (0-10). Isso é o próximo passo natural em cima de infraestrutura que já existe — sem tabela nova.

**Proposta:** quando `TarefaNota` de uma tarefa fica abaixo de um limiar (ex.: 6), a tela de resultado do aluno oferece "Praticar esse assunto" — mesma consulta filtrada que o modal de prática da prova já faz (`§3.6` do `SPEC_RECOMENDACAO_ESTUDOS_IA.md`), só que disparada por nota baixa em vez de por prova agendada, e com `Dificuldade='Facil'` sugerida por padrão (reforço, não desafio).

**Depende de:** a tarefa ter um `Assunto` associado — hoje `Assunto`/`provaagendadaassunto` só existem pro lado de `ProvaAgendada` (§3 do spec de IA); estender pra `TarefaAcademica` é o trabalho real aqui, não o banco de questões em si.

**Perguntas em aberto:**
- Limiar de "nota baixa" é fixo ou configurável por escola/professor?
- Nota de prova (`prova_nota`) ainda está fora de escopo (`PLANO_IMPLEMENTACAO_MATERIAS.md`) — esta proposta amplia o motivador só pra tarefa, ou espera a nota de prova entrar primeiro?

---

### 1.3 Dashboard analítico pra Direção/Coordenação

**Contexto atual:** dado estruturado já existe em abundância e não é aproveitado pra visão agregada: `RegistroAuditoria` (toda ação relevante), `ConteudoProgresso` (consumo de conteúdo), `TarefaNota`, `EscolaxUsuarioxFuncao.registrarAcesso` (login/acesso por escola). Não existe hoje nenhuma tela de "visão geral" pra quem gerencia a escola.

**Proposta:** nova tela em `gestao-dados` (ou uma seção nova) com métricas agregadas — não precisa de tabela nova, só de queries de agregação novas nos repositories existentes:
- Taxa de conclusão de tarefa por turma/matéria (`TarefaAcademicaMatricula`)
- Engajamento: acessos por período (`registrarAcesso` já grava isso, só não é lido em agregado hoje)
- Distribuição de notas por turma (média, mediana, histograma simples)

**Perguntas em aberto:**
- Quais métricas entram na v1 — as 3 acima, ou um subconjunto menor pra validar o formato da tela primeiro?
- Granularidade: por turma é o nível óbvio, mas por matéria/por professor também fazem sentido — qual primeiro?

---

### 1.4 Rastreamento de custo/uso de IA

**Contexto atual:** `backend/ai/providers/geminiProvider.ts` já existe e funciona (tiering leve/cheio), mas não registra nada sobre o que cada chamada custou — sem tabela, sem log de uso. Com o logging estruturado (`winston`) já no lugar, isso fica barato de adicionar.

**Proposta:**

```sql
CREATE TABLE iarequestlog (
  IARequestLogGUID CHAR(36) PRIMARY KEY,
  ProvaAgendadaGUID CHAR(36) NULL,      -- de onde veio a chamada, quando aplicável
  Tarefa VARCHAR(50) NOT NULL,          -- 'classificacao_assunto' | 'video_recomendacao' | 'resumo' | 'sumario_livro'
  Tier ENUM('leve','cheio') NOT NULL,
  TokensEntrada INT NULL,
  TokensSaida INT NULL,
  CustoEstimadoUSD DECIMAL(10,6) NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ProvaAgendadaGUID) REFERENCES provaagendada(ProvaAgendadaGUID)
);
```

O SDK do Gemini (`@google/genai`) devolve contagem de tokens em `response.usageMetadata` — `geminiProvider.ts` precisa só repassar isso pro chamador em vez de descartar, e o orquestrador (`provaagendadarecomendacao.service.ts`) grava uma linha por chamada.

**UX:** tela simples dentro de `admin-plataforma` — total de chamadas e custo estimado por período/tier.

**Perguntas em aberto:**
- Calcular custo real (preço por token do Gemini, que muda por modelo/tier — precisa de uma tabela de preço mantida à mão) ou só contar volume de chamadas por enquanto (mais simples, menos preciso)?

---

### 1.5 Exportação/exclusão de dados (LGPD)

**Contexto atual:** plataforma com dado de menor de idade (aluno) e nenhuma rota de "exportar meus dados" ou "excluir minha conta". Isso é tanto boa prática quanto obrigação legal (LGPD — portabilidade e eliminação de dados, art. 18).

**Proposta:**
- `GET /api/usuario/:UsuarioCPF/exportar-dados` — autenticado, só o próprio usuário (ou responsável, se o alvo for menor) — devolve um JSON com tudo vinculado ao CPF: matrículas, notas, mensagens enviadas, anotações, etc.
- `DELETE /api/usuario/:UsuarioCPF/dados-lgpd` — **anonimização, não exclusão física** (apagar a linha quebraria FK de notas/mensagens/histórico de outros usuários que referenciam esse CPF) — troca nome/email/telefone por placeholders, mantém o CPF como chave (exigido por outras tabelas) mas o registro vira "conta removida".

**Perguntas em aberto:**
- Quem pode solicitar em nome de um menor — o próprio Responsável vinculado, ou precisa de fluxo de aprovação da escola?
- Prazo de atendimento (LGPD não define prazo fixo pra portabilidade, mas convém ter um SLA interno).
- Isso é uma automação self-service, ou primeiro vira um processo manual (Direção aciona) até validar o fluxo?

---

## 2. Bibliotecas

### 2.1 `helmet` — headers de segurança HTTP

**Gap real, não destacado na auditoria de segurança anterior:** não há nenhum middleware configurando `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security` etc. `app.use(helmet())` em `backend/Server.ts` resolve a maior parte de imediato.

**Cuidado:** o servidor hospeda o próprio Next.js (`setupUnifiedFrontend`) — o CSP padrão do helmet pode bloquear scripts/estilos inline que o Next injeta; precisa de uma configuração de CSP permissiva o bastante pro Next funcionar, não o preset "strict" direto.

---

### 2.2 `vitest` — testes automatizados

Resolve o "zero testes no projeto inteiro" já documentado. Escolha por `vitest` em vez de Jest: roda nativo com TS/ESM sem configuração extra, combina com o `tsx` que o projeto já usa pra dev.

**Por onde começar (maior valor por esforço):** services de regra de negócio pura, sem I/O pesado de mockar — `RedefinicaoSenhaService` (lógica de token/expiração), `TarefaAcademicaService.avaliarQuestaoDiscursiva` (bounds de nota), `CategoriaConteudoService` (permissão de turma, já teve bug real aqui em 2026-07-27). Repositories (que tocam MySQL direto) exigem mock de banco — deixar pra depois.

---

### 2.3 `@sentry/node` — error tracking

Com `backend/utils/logger.ts` (winston) já no lugar, o Sentry se conecta como mais um transport — a integração `@sentry/node` tem suporte nativo a winston, então isso não exige reescrever nada do que já foi montado, só adicionar o transport e a `SENTRY_DSN` no `.env`.

---

### 2.4 `zod-to-openapi` — documentação de API gerada

Resolve de vez o gap recorrente de "`docs/routes/*.md` fica desatualizado" (já aconteceu com a feature de IA nesta auditoria) — gera Swagger/OpenAPI a partir dos schemas Zod que já existem em `backend/schemas/`, então a doc nunca fica velha porque é derivada do código, não escrita à mão.

**Pré-requisito:** só cobre rotas que já usam Zod — a feature de Recomendação de Estudos por IA (`assunto`/`materiaglobal`/`materialdidatico`/`questaobanco`) ainda não tem schema Zod (gap já documentado em `RELATORIO_BAUA_CODIGO_2.md`); migrar isso primeiro é o que desbloqueia essa lib cobrir 100% da API.

---

## 3. Lógica / arquitetura

### 3.1 Migration runner

**Contexto atual:** migrations em `backend/database/migrations/` são arquivos soltos (`.sql`/`.ts`), aplicados manualmente, sem rastreio de quais já rodaram em qual ambiente. Isso já gerou risco real nesta sessão — mais de uma vez precisei lembrar que uma migration nova (`2026-08-04-redefinicao-senha.sql`) ainda não tinha sido aplicada no banco de verdade.

**Opções:**

| Opção | Prós | Contras |
|---|---|---|
| Script caseiro (tabela `schema_migrations` + script que aplica só o que falta, em ordem) | Zero dependência nova, controle total, pouco código | Precisa manter esse script |
| Lib madura (`umzug`, `db-migrate`) | Testado, com rollback, mais recursos | Mais uma dependência, aprendizado da API da lib |

**Recomendação:** script caseiro — o volume de migrations e a complexidade do projeto não parecem justificar uma lib inteira só pra isso.

---

### 3.2 Fila de jobs pra chamadas de IA

**Contexto atual:** a geração de recomendação roda fire-and-forget dentro do próprio request de criar/editar prova (`ProvaAgendadaService.criarProva`/`.atualizarProva` chamam `gerarRecomendacao(...)` sem aguardar). Funciona, mas sem retry automático e sem visibilidade de falha persistente (se a chamada pro Gemini falhar, o log registra e pronto — ninguém tenta de novo).

**Opções:**

| Opção | Prós | Contras |
|---|---|---|
| BullMQ + Redis | Robusto, retry/backoff configurável, dashboard de fila pronto | Redis é infraestrutura nova — nada no projeto usa hoje |
| Tabela de jobs pendentes processada pelo `node-cron` já existente | Zero infraestrutura nova, reaproveita o padrão de scheduler já usado em 4 lugares (`auditoria`, `notificacao`, `cleanup`, `tarefaacademicanota`) | Menos robusto que uma fila de verdade (sem prioridade, sem lock distribuído — mas o projeto roda 1 instância, não é um problema real hoje) |

**Recomendação:** começar pela tabela+cron, mesmo padrão já validado no projeto — introduzir Redis só se o volume de chamadas de IA algum dia justificar.

---

## 4. Priorização sugerida (esforço × valor)

| # | Item | Esforço | Valor imediato |
|---|---|---|---|
| 2.1 (`helmet`) | Muito baixo | Alto (segurança) |
| 2.3 (`Sentry`) | Baixo | Alto (observabilidade) |
| 1.4 (custo de IA) | Baixo | Médio-alto (governança de gasto) |
| 3.1 (migration runner) | Baixo | Médio-alto (evita erro operacional já visto) |
| 1.2 (reforço automático) | Médio | Alto (usa infra já pronta) |
| 2.2 (`vitest`) | Médio (contínuo) | Alto, mas paga aos poucos |
| 1.3 (dashboard analítico) | Médio-alto | Alto |
| 3.2 (fila de jobs) | Médio | Médio |
| 2.4 (`zod-to-openapi`) | Médio (depende de 1.5 do outro doc — Zod na feature de IA) | Médio |
| 1.1 (frequência/chamada) | Alto (módulo novo) | Alto, mas é feature nova de verdade, não incremento |
| 1.5 (LGPD) | Médio-alto (decisões legais/processo, não só código) | Alto, mas não urgente pra demonstração de TCC |

---

## 5. Próximo passo

Nenhuma decisão travada. Quando o usuário escolher um ou mais itens pra levar adiante, cada um vira seu próprio `docs/PLANO_IMPLEMENTACAO_<nome>.md`, seguindo o mesmo padrão faseado usado em `PLANO_IMPLEMENTACAO_RECOMENDACAO_ESTUDOS_IA.md`.
