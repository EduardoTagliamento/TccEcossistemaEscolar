# Planejamento: Registro de Auditoria

**Data:** 2026-07-20
**Status:** Spec aprovada (2026-07-20) — em implementação
**Escopo:** Novo módulo transversal de auditoria — registra, para cada escola, quem fez o quê (criação/edição/exclusão) em quais entidades e quando, com tela dedicada (visível a Direção/Coordenação/Secretaria) com filtros, e retenção diferenciada por sensibilidade da ação. Não guarda diff campo a campo (antes/depois), só o fato de que a ação ocorreu. Inclui também uma sub-feature relacionada mas estruturalmente separada: um campo de **"último acesso do usuário na escola"** (Seção 3.4) — não é um log de auditoria (não é imutável, não vai em `registroauditoria`), é um único timestamp por usuário+escola, sobrescrito a cada acesso.

---

## 0. Resumo executivo

**O que existe hoje:** nada. Confirmado em `docs/RELATORIO_BAUA_CODIGO.md` (linhas 188-191) — não há entidade, tabela, controller, service ou rota de auditoria no repositório. A única menção à palavra "auditoria" é um comentário genérico em `backend/Server.ts:229` ("Útil para logging e auditoria"), sobre um middleware de pré-roteamento que hoje só faz `console.log` de método/rota/timestamp — não persiste nada, não sabe qual usuário fez a ação nem qual entidade foi afetada. Também não existe hoje nenhum registro de "último acesso" do usuário — nem global, nem por escola (o único artefato correlato no schema é uma tabela `log_acesso` comentada como "OPCIONAL - FUTURO" em `backend/database/sql.txt:140-157`, nunca criada, e que seria um log completo por linha, não o campo único decidido nesta spec).

**O que existe e será reaproveitado como padrão de referência:** o projeto já tem um módulo transversal estruturalmente idêntico ao que Auditoria precisa — **Notificações** (`backend/services/notificacao.service.ts`). Notificação também é "disparada a partir de dentro de outros services, depois de uma operação de escrita já concluída, sem bloquear a resposta HTTP se falhar". O padrão de singleton leve (`getNotificacaoService()`, ver `backend/services/notificacao.service.ts:298-326`) evita reinjetar a dependência em todo `*.routes.ts` — Auditoria deve seguir exatamente esse padrão (`getAuditoriaService().registrar({...})`).

**Diferença estrutural chave em relação a Notificação:** Notificação é opt-in por tipo de evento (só os poucos `disparar()` já plugados em pontos específicos do código dispara notificações). Auditoria, pela decisão de negócio #1 (ver Seção 1), precisa cobrir **todo CRUD relevante do sistema** — ou seja, o hook `getAuditoriaService().registrar()` precisa ser adicionado ao final de praticamente todo método de escrita (`store`/`create`, `update`, `destroy`/`delete`) de todo `*.service.ts` do projeto, não só em alguns pontos escolhidos. Isso é o maior custo de implementação desta feature — não é a modelagem de dados (simples, sem diff), é a cobertura.

**Blocos de trabalho (ordem de dependência):**
1. Modelo de dados (`registroauditoria` + `categoriaauditoria` de sensibilidade/retenção) + migration
2. Backend `AuditoriaService` singleton (`registrar()`, fire-and-forget, espelhando `NotificacaoService.disparar()`) + `AuditoriaDAO`
3. Instrumentação: adicionar o hook `getAuditoriaService().registrar()` ao final de cada método de escrita dos services existentes (levantamento módulo a módulo — ver Seção 4)
4. Backend de consulta: `AuditoriaController` + rota `GET /api/auditoria` com filtros (por usuário, por tipo de ação, por entidade, por período) restrita a Direção/Coordenação/Secretaria
5. Job de retenção/expurgo diferenciado por categoria de sensibilidade (`node-cron`, mesmo padrão de `backend/services/notificacao.scheduler.ts` / `CleanupScheduler` citado nele)
6. Documentação Swagger-like (`docs/routes/auditoria-api.md` — Modo 2 do agente `docs`, só depois que os endpoints acima existirem de fato)
7. Frontend: item novo na nav-bar (Direção/Coordenação/Secretaria) + tela `/dashboard/[escolaGUID]/auditoria` com lista + filtros
8. Sub-feature separada — "último acesso do usuário na escola": tabela nova `usuarioxescolaacesso` (timestamp único por usuário+escola, fora de `registroauditoria`) + endpoint de registro (chamado no mount da `DashboardNavbar`) + exposição em endpoints de leitura já existentes (`GET /api/usuario/:cpf/escolas`, `GET /api/escolaxusuarioxfuncao`). Ver Seção 3.4. Distribuída pelas fases já existentes (1, 4, 7) em vez de ganhar uma fase isolada — ver nota na Seção 6.

---

## 1. Decisões de negócio já validadas

| # | Pergunta | Decisão |
|---|---|---|
| 1 | O que é auditado? | **Todo CRUD relevante do sistema** — todas as operações de criação/edição/exclusão, não apenas um subconjunto de módulos escolhidos a dedo. Confirmado pelo usuário (`docs/RELATORIO_BAUA_CODIGO.md:321`). |
| 2 | Quem visualiza o registro de auditoria? | **Direção (FuncaoId=6), Coordenação (FuncaoId=1) e Secretaria (FuncaoId=2)** da escola. Post-it original do board dizia "principalmente Secretaria, também Coordenação/Direção" — o usuário confirmou as três funções com acesso igual (sem hierarquia adicional entre elas). |
| 3 | Existe retenção diferenciada por sensibilidade da ação? | **Sim**, com prazos finais confirmados (reduzidos da proposta inicial — o usuário considerou os prazos originais exagerados: "ciclo de uso" sem alteração de dados marcantes é de 1 ano/período letivo). Ver tabela de categorias e prazos logo abaixo. |
| 4 | O registro guarda o valor antigo e o novo campo a campo (diff)? | **Não.** O registro só precisa dizer que uma ação ocorreu — quem, o quê (tipo de ação + entidade afetada), quando, em qual escola. Não é um audit trail de "campo X mudou de A para B". Confirmado pelo usuário — isso simplifica o schema (uma tabela plana, sem tabela de diff genérica). |
| 5 | Há um item novo na navegação para acessar a tela? | **Sim** — ícone novo na nav-bar do dashboard, visível só a Secretaria/Direção/Coordenação, levando à tela de Registro de Auditoria. Parte do escopo desta feature (não é uma feature à parte). |
| 6 | O "último acesso do usuário na escola" guarda um histórico completo de acessos ou só o mais recente? | **Só o mais recente** — um único timestamp por usuário+escola, sobrescrito a cada acesso (não uma linha nova por login/requisição, e estruturalmente **fora** de `registroauditoria`, que é um log de fatos imutáveis). Confirmado pelo usuário — o objetivo é a escola conseguir ver se um usuário (ex. aluno/professor) está de fato usando o sistema, não reconstruir todo o histórico de logins. O mecanismo de *quando* atualizar esse campo (Seção 3.4) foi decidido pelo agente com base no código existente, não pelo usuário — ver pendência correspondente na Seção 7. |

### 1.1 Categorias de sensibilidade e prazos de retenção (decisão #3 — confirmado)

| `CategoriaAuditoriaId` | Nome | Retenção final | Exemplos de `EntidadeTipo` |
|---|---|---|---|
| 1 | `Trivial` | 90 dias | preferências de notificação, marcar pendência como feita, editar nome de grupo/turma |
| 2 | `Operacional` | 1 ano (365 dias) | criação/edição de evento, conteúdo, tarefa, prova, matéria, curso, horário |
| 3 | `DadosPessoais` | **2 anos (730 dias)** — reduzido de 5 anos na proposta original | criação/edição/exclusão de `usuario`, `matricula`, vínculo `escolaxusuarioxfuncao`, dados de responsável/aluno |
| 4 | `Financeiro` | **2 anos (730 dias)** — reduzido de 5 anos na proposta original | reservado para quando/se um módulo financeiro existir (não localizado no repositório hoje) |
| 5 | `SegurancaConta` | **1 ano (365 dias)** — reduzido de 2 anos na proposta original | troca de senha, verificação de e-mail, mudança de função/permissão de um usuário na escola |

> Justificativa do usuário para a redução: o "ciclo de uso" sem alteração de dados marcantes (matérias, turmas etc. permanecem as mesmas) é de aproximadamente 1 ano — um período letivo/acadêmico inteiro. Prazos maiores que isso, na visão do usuário, não agregavam valor de auditoria proporcional ao custo de retenção. Estes prazos alimentam o seed da migration (Seção 3.1) e a Fase 1/3 (Seção 6).

---

## 2. Estado atual do código (relevante para esta feature)

- **Nenhum código de auditoria existe hoje** — nem entidade, nem tabela, nem service. `backend/Server.ts:229` (comentário) e o middleware `setupPreRoutingMiddlewares` (linhas 238+) fazem só `console.log` de `method`/`path`/`timestamp` a cada requisição, sem persistência e sem saber qual `UsuarioCPF` ou `EscolaGUID` está por trás da ação (o middleware roda **antes** de `AuthMiddleware.authenticate`, então nem tem acesso a `req.user` de forma confiável) — não serve de base para o hook de auditoria, que precisa ser disparado depois da autenticação e depois da operação de escrita já ter sucesso, exatamently como o padrão de Notificação abaixo.
- **Padrão-ouro a replicar — módulo transversal "disparado no final de um método já existente", sem bloquear a resposta:** `backend/services/notificacao.service.ts`. Trecho relevante (linhas 298-326, comentário do próprio autor original):
  > "Notificação é uma dependência transversal — quase todo service de escrita (tarefa, prova, conteúdo, pendência, evento, convite, grupo, mensagem...) precisa dela só pra chamar `disparar()` no final de um método já existente. [...] Por isso, hooks devem importar `getNotificacaoService()` em vez de receber o service via construtor."
  Exemplo de uso real em `backend/services/pendencia.service.ts:140-148` — depois do `INSERT` (`pendenciaDAO.create`), chama `getNotificacaoService().disparar({...}).catch(...)` sem `await` bloqueante da resposta. **Auditoria deve seguir a mesma mecânica**: `getAuditoriaService().registrar({...})` chamado (sem bloquear a resposta HTTP, com `.catch()` silencioso/logado) ao final de cada `store`/`update`/`destroy` dos services de escrita do projeto.
- **Autenticação/ator da ação:** `AuthMiddleware.authenticate` (`backend/middlewares/auth.middleware.ts`) decodifica o JWT e popula `req.user = { UsuarioCPF, UsuarioEmail, UsuarioNome }` em todo endpoint autenticado. Todo controller já usa `req.user?.UsuarioCPF` como o "ator" da operação — é esse valor que deve ser passado ao `AuditoriaService.registrar()` como `UsuarioCPFAtor`, e não uma nova forma de capturar identidade.
- **Papel/permissão por função — padrão a replicar:** não existe um middleware genérico de "exigir FuncaoId X"; o padrão é o service (ou controller) consultar `EscolaxUsuarioxFuncaoDAO` diretamente. Já existem os métodos análogos:
  - `isCoordOuDirecaoEmEscola(usuarioCPF, escolaGUID)` — `FuncaoId IN (1, 6)` (`backend/repositories/escolaxusuarioxfuncao.repository.ts:338`)
  - `isProfessorOuDirecaoEmEscola(usuarioCPF, escolaGUID)` — `FuncaoId IN (3, 6)` (mesmo arquivo, linha 354, criado para o módulo Projetos)
  **Modelo a replicar para esta feature:** novo método `isCoordSecretariaOuDirecaoEmEscola(usuarioCPF, escolaGUID)` — `FuncaoId IN (1, 2, 6)` — usado pelo `GET /api/auditoria` para restringir a consulta a Coordenação/Secretaria/Direção.
- **`funcao` (papéis):** `1=Coordenacao, 2=Secretaria, 3=Professor, 4=Responsavel, 5=Aluno, 6=Direcao` (`backend/database/sql.txt:84-102`, sem acento nos valores de `FuncaoNome`).
- **UUID:** todo GUID do projeto é UUID v4, validado via regex `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` (ver, por exemplo, `GrupoTarefaEntity.validar()`).
- **Resposta padrão da API:** `{ success, message, data }` em sucesso, `{ success: false, message, details? }` em erro, lançado via `ErrorResponse(statusCode, message, details?)` (`backend/utils/ErrorResponse.ts`).
- **Jobs agendados / retenção:** já existe infraestrutura de `node-cron` no projeto (`backend/services/notificacao.scheduler.ts`, que também cita um `CleanupScheduler` como padrão análogo já usado no projeto). O job de expurgo por retenção diferenciada (Seção 4, regra 6) deve seguir a mesma estrutura de classe (`start()`/`stop()`/`#schedule()` com `node-cron`).
- **Nav-bar real:** `frontend/app/dashboard/[escolaGUID]/_components/DashboardNavbar.tsx`. O filtro de item de menu por papel usa o array numérico `funcoesEscola` (`FuncaoId[]`, vindo de `GET /api/usuario/:cpf/escolas` filtrado por `Status === 'Ativo'`), nunca comparação por string. Padrão existente (linhas 365-385):
  ```ts
  const isCoordenacaoOuDirecao = funcoesEscola.includes(1) || funcoesEscola.includes(6);
  const modulosNav = [
    { key: 'dashboard', ... },
    ...(isCoordenacaoOuDirecao ? [{ key: 'gestao-dados', href: ..., label: ..., icon: ... }] : []),
    ...
  ];
  ```
  Para este item novo, o padrão a seguir é `const podeVerAuditoria = funcoesEscola.includes(1) || funcoesEscola.includes(2) || funcoesEscola.includes(6);`.
- **Investigação específica para "último acesso do usuário na escola" (Seção 3.4):**
  - `escolaxusuarioxfuncao` (`backend/database/sql.txt:105-138`) — PK é o surrogate `EscolaxUsuarioxFuncaoId` (INT AUTO_INCREMENT), e a chave única real é `(UsuarioCPF, EscolaGUID, FuncaoId)`, **não** `(UsuarioCPF, EscolaGUID)`. Ou seja, o schema permite (mesmo que raro na prática) um mesmo usuário ter mais de uma `FuncaoId` na mesma escola (ex.: Direção também cadastrada como Professor). Isso significa que gravar "último acesso" diretamente nessa tabela exigiria decidir em qual das N linhas gravar, ou fazer `UPDATE` em todas as linhas daquele `(UsuarioCPF, EscolaGUID)` a cada acesso — desnormalizado e frágil. Ver decisão de design na Seção 3.4.
  - `AuthMiddleware.authenticate` (`backend/middlewares/auth.middleware.ts:29-81`) decodifica o JWT e popula **só** `req.user = { UsuarioCPF, UsuarioEmail, UsuarioNome }` — **não** resolve `EscolaGUID`, porque o token não carrega esse dado (um usuário pode pertencer a várias escolas). Cada rota resolve `EscolaGUID` de um jeito diferente (query string, `:params` da URL, ou corpo da requisição, dependendo do endpoint) — não há hoje um middleware genérico pós-autenticação que normalize "qual escola está no contexto desta requisição". Isso inviabiliza, sem uma refatoração maior, atualizar o "último acesso" a cada requisição autenticada de forma genérica (Seção 3.4 detalha a alternativa escolhida).
  - `GET /api/usuario/:cpf/escolas` (`backend/controllers/escolaxusuarioxfuncao.controller.ts:107-131`, `EscolaxUsuarioxFuncaoService.findEscolasByUsuario`) já é chamado **uma vez por mount** do componente `DashboardNavbar` (`frontend/app/dashboard/[escolaGUID]/_components/DashboardNavbar.tsx:295-302`) para popular `funcoesEscola` — e o layout que monta essa navbar (`frontend/app/dashboard/[escolaGUID]/layout.tsx`) persiste entre navegações client-side dentro do mesmo `[escolaGUID]` no App Router do Next.js, remontando só em refresh de página, entrada inicial na área daquela escola, ou troca de escola. Esse é hoje o ponto de menor custo/maior fidelidade para disparar "usuário acessou esta escola".
  - **Telas de gestão de usuários por escola já existem:** `frontend/app/dashboard/[escolaGUID]/gestao-dados/alunos/page.tsx` (usa `frontend/lib/api/aluno.api.ts`, que lista alunos via `GET /api/matricula?...` + `GET /api/usuario/:cpf`) e `frontend/app/dashboard/[escolaGUID]/gestao-dados/professores/page.tsx` (usa `frontend/lib/api/professor.api.ts`, que lista professores via `GET /api/professor?...`). Nenhuma dessas rotas de listagem faz join com dados de "último acesso" hoje (o dado nem existe). Também existe o endpoint genérico `GET /api/escolaxusuarioxfuncao?EscolaGUID=` (`index`, Seção 2 acima) que lista todos os vínculos de uma escola independente de papel.
  - **Padrão de upsert já usado no projeto:** o seed de `funcao` usa `INSERT ... ON DUPLICATE KEY UPDATE` (`backend/database/sql.txt:91-102`) — mesma técnica proposta para gravar o "último acesso" (Seção 3.4).

---

## 3. Modelo de dados novo/alterado

Schema plano, sem diff antes/depois (decisão #4) — cada linha é um fato "ação X ocorreu, feita por Y, sobre a entidade Z, na escola W, na categoria de sensibilidade C".

### 3.1 `categoriaauditoria` — catálogo estático de categorias de sensibilidade e retenção

```sql
CREATE TABLE `categoriaauditoria` (
  `CategoriaAuditoriaId` TINYINT UNSIGNED NOT NULL,
  `CategoriaAuditoriaNome` VARCHAR(40) NOT NULL COMMENT 'Ex.: Trivial, Operacional, DadosPessoais, Financeiro, SegurancaConta',
  `CategoriaAuditoriaRetencaoDias` INT NOT NULL COMMENT 'Prazo de retenção em dias antes do expurgo pelo job de limpeza',
  `CategoriaAuditoriaDescricao` VARCHAR(255) NULL,
  PRIMARY KEY (`CategoriaAuditoriaId`)
);
```

> Catálogo pequeno e estático (seed via migration, análogo a `funcao` e `notificacaotipo`), não uma tabela editável pelo usuário na v1. Categorias e prazos finais confirmados na Seção 1.1.

Seed proposto (`ON DUPLICATE KEY UPDATE`, mesmo padrão do seed de `funcao`):

```sql
INSERT INTO `categoriaauditoria`
  (`CategoriaAuditoriaId`, `CategoriaAuditoriaNome`, `CategoriaAuditoriaRetencaoDias`, `CategoriaAuditoriaDescricao`)
VALUES
  (1, 'Trivial', 90, 'Ações de baixo impacto: preferências, marcar pendência como feita, editar nome de grupo/turma'),
  (2, 'Operacional', 365, 'Rotina acadêmica: eventos, conteúdo, tarefas, provas, matérias, cursos, horários'),
  (3, 'DadosPessoais', 730, 'Criação/edição/exclusão de usuário, matrícula, vínculo escola-usuário-função, dados de responsável/aluno'),
  (4, 'Financeiro', 730, 'Reservado para módulo financeiro (não implementado hoje)'),
  (5, 'SegurancaConta', 365, 'Troca de senha, verificação de e-mail, mudança de função/permissão de um usuário na escola')
ON DUPLICATE KEY UPDATE
  `CategoriaAuditoriaNome` = VALUES(`CategoriaAuditoriaNome`),
  `CategoriaAuditoriaRetencaoDias` = VALUES(`CategoriaAuditoriaRetencaoDias`),
  `CategoriaAuditoriaDescricao` = VALUES(`CategoriaAuditoriaDescricao`);
```

### 3.2 `registroauditoria` — a tabela de fatos

```sql
CREATE TABLE `registroauditoria` (
  `RegistroAuditoriaGUID` CHAR(36) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `UsuarioCPFAtor` VARCHAR(14) NOT NULL COMMENT 'Quem executou a ação (req.user.UsuarioCPF no momento da chamada)',
  `AcaoTipo` ENUM('Create','Update','Delete') NOT NULL,
  `EntidadeTipo` VARCHAR(60) NOT NULL COMMENT 'Nome lógico do recurso afetado, ex.: matricula, pendencia, evento, turma',
  `EntidadeGUID` VARCHAR(36) NOT NULL COMMENT 'PK do registro afetado (GUID na maioria das entidades do projeto)',
  `EntidadeDescricao` VARCHAR(255) NULL COMMENT 'Rótulo legível opcional para exibição na tela (ex. título/nome do registro afetado no momento da ação)',
  `CategoriaAuditoriaId` TINYINT UNSIGNED NOT NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Momento em que a ação ocorreu',
  PRIMARY KEY (`RegistroAuditoriaGUID`),
  INDEX `idx_registroauditoria_escola` (`EscolaGUID`),
  INDEX `idx_registroauditoria_ator` (`UsuarioCPFAtor`),
  INDEX `idx_registroauditoria_entidade` (`EntidadeTipo`, `EntidadeGUID`),
  INDEX `idx_registroauditoria_data` (`CreatedAt`),
  INDEX `idx_registroauditoria_categoria` (`CategoriaAuditoriaId`),
  CONSTRAINT `FK_RegistroAuditoria_Escola` FOREIGN KEY (`EscolaGUID`) REFERENCES `escola` (`EscolaGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_RegistroAuditoria_Ator` FOREIGN KEY (`UsuarioCPFAtor`) REFERENCES `usuario` (`UsuarioCPF`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `FK_RegistroAuditoria_Categoria` FOREIGN KEY (`CategoriaAuditoriaId`) REFERENCES `categoriaauditoria` (`CategoriaAuditoriaId`) ON UPDATE CASCADE ON DELETE RESTRICT
);
```

> **Sem FK física em `EntidadeGUID`** — de propósito, espelhando o padrão de `historicogrupotarefa`/`historicogrupoprojeto` (`HistoricoDetalhes JSON` genérico), já que `registroauditoria` referencia dezenas de tabelas diferentes (`matricula`, `pendencia`, `evento`, `turma`, `usuario`, etc.) e não faz sentido modelar uma FK polimórfica no MySQL. Consequência aceita: se o registro afetado for excluído fisicamente depois, `EntidadeGUID` fica "órfão" no log — isso é esperado e correto para um log de auditoria (o log não deve ser apagado em cascata quando o dado original some).
> **`ON DELETE RESTRICT` em `UsuarioCPFAtor`** — segue o mesmo padrão de `FK_Projeto_Criador`/`FK_HistoricoGP_Ator` (não permitir excluir fisicamente um usuário que já tem histórico de ações; a exclusão de usuário no sistema hoje é lógica via `Status`, não física — a confirmar se `usuario` tem exclusão física em algum fluxo, não localizada nesta sessão).

### 3.3 Interface TypeScript (rascunho, `backend/entities/registroauditoria.model.ts`)

```typescript
export type AcaoAuditoriaTipo = 'Create' | 'Update' | 'Delete';

export interface RegistroAuditoria {
  RegistroAuditoriaGUID: string;
  EscolaGUID: string;
  UsuarioCPFAtor: string;
  AcaoTipo: AcaoAuditoriaTipo;
  EntidadeTipo: string;
  EntidadeGUID: string;
  EntidadeDescricao: string | null;
  CategoriaAuditoriaId: number;
  CreatedAt: Date;
}

export interface RegistroAuditoriaCreateDTO {
  EscolaGUID: string;
  UsuarioCPFAtor: string;
  AcaoTipo: AcaoAuditoriaTipo;
  EntidadeTipo: string;
  EntidadeGUID: string;
  EntidadeDescricao?: string;
  CategoriaAuditoriaId: number;
}
```

### 3.4 Último acesso do usuário na escola — estrutura separada (fora de `registroauditoria`)

> **Isto não é um registro de auditoria.** É um valor mutável (sobrescrito a cada acesso), não um fato imutável — por isso não vive na tabela `registroauditoria`/`categoriaauditoria` da Seção 3.1-3.3, mesmo sendo parte do mesmo documento de planejamento por afinidade temática (decisão de negócio confirmada pelo usuário, Seção 1, item 6).

**Onde armazenar — tabela nova dedicada, não uma coluna em `escolaxusuarioxfuncao`.** Como visto na Seção 2, `escolaxusuarioxfuncao` tem granularidade `(UsuarioCPF, EscolaGUID, FuncaoId)`, não `(UsuarioCPF, EscolaGUID)` — o schema permite (mesmo que raro) mais de uma função do mesmo usuário na mesma escola. Como "último acesso" é conceitualmente por usuário+escola (não por função), gravar ali exigiria ou escolher uma linha "canônica" arbitrária, ou fazer `UPDATE` replicado em N linhas a cada acesso. Para evitar essa ambiguidade, a decisão de design (do agente, baseada no código, não uma decisão de negócio do usuário) é uma tabela nova de grão único:

```sql
CREATE TABLE `usuarioxescolaacesso` (
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `UltimoAcessoEm` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`UsuarioCPF`, `EscolaGUID`),
  CONSTRAINT `FK_UsuarioEscolaAcesso_Usuario` FOREIGN KEY (`UsuarioCPF`)
    REFERENCES `usuario` (`UsuarioCPF`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `FK_UsuarioEscolaAcesso_Escola` FOREIGN KEY (`EscolaGUID`)
    REFERENCES `escola` (`EscolaGUID`) ON UPDATE CASCADE ON DELETE RESTRICT
);
```

> Nome segue a convenção de tabela de junção do projeto (`x` entre entidades, ex. `escolaxusuarioxfuncao`, `usuarioxgrupoprojeto`). PK composta `(UsuarioCPF, EscolaGUID)` — uma linha por par usuário+escola, sem FK para `escolaxusuarioxfuncao` (grãos diferentes, ver acima). FKs `RESTRICT` espelham o padrão de `FK_EUF_Usuario`/`FK_EUF_Escola`.

**Quando atualizar — gatilho no frontend, não em todo request autenticado.** Como `AuthMiddleware.authenticate` não resolve `EscolaGUID` (Seção 2) e cada rota traz esse dado de forma diferente, instrumentar "toda requisição autenticada com contexto de escola" exigiria uma refatoração de middleware maior, fora do escopo desta feature. A alternativa escolhida — mais barata e ainda razoavelmente fiel a "uso real" — é reaproveitar o ponto que já existe no frontend: o efeito em `DashboardNavbar` (`frontend/app/dashboard/[escolaGUID]/_components/DashboardNavbar.tsx:295`) que já chama `GET /api/usuario/:cpf/escolas` uma vez por "entrada" na área daquela escola (o layout persiste entre navegações client-side dentro do mesmo `[escolaGUID]`, então o efeito não dispara a cada troca de página do dashboard, só em refresh/entrada inicial/troca de escola — já é uma frequência baixa por natureza).

Novo endpoint dedicado (Seção 5): `POST /api/usuario/:cpf/escolas/:escolaGUID/acesso`, chamado fire-and-forget pelo frontend logo após a chamada já existente a `GET /api/usuario/:cpf/escolas`, sem bloquear a renderização da navbar. Restrito a `req.user.UsuarioCPF === params.cpf` (só o próprio usuário atualiza seu próprio "último acesso" — `403` caso contrário), para impedir que um usuário force a atualização do registro de outro.

Upsert (mesma técnica do seed de `funcao`, Seção 3.1):

```sql
INSERT INTO `usuarioxescolaacesso` (`UsuarioCPF`, `EscolaGUID`, `UltimoAcessoEm`)
VALUES (?, ?, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  `UltimoAcessoEm` = IF(`UltimoAcessoEm` < NOW() - INTERVAL 1 HOUR, VALUES(`UltimoAcessoEm`), `UltimoAcessoEm`);
```

> O `IF` dentro do `ON DUPLICATE KEY UPDATE` é o throttle ("só atualiza se já passou N minutos desde o último update"), evitando um `UPDATE` a cada refresh de página sem precisar de um `SELECT` prévio. **Confirmado pelo usuário: 1 hora** (ajustado da proposta inicial de 15 minutos — o objetivo é saber se o usuário está ativo, não granularidade fina por minuto).

**Onde isso é exposto:**
- `GET /api/usuario/:cpf/escolas` (existente, `EscolaxUsuarioxFuncaoService.findEscolasByUsuario`) passa a incluir `UltimoAcessoEm` por escola no retorno — uso secundário (o próprio usuário vendo seu último acesso a cada escola).
- `GET /api/escolaxusuarioxfuncao?EscolaGUID=` (existente, `index`) passa a incluir `UltimoAcessoEm` por vínculo, via `LEFT JOIN` com `usuarioxescolaacesso` — este é o uso primário do requisito do usuário: a escola (Coordenação/Secretaria/Direção) consultando quem está de fato usando o sistema.
- As telas dedicadas `gestao-dados/alunos` e `gestao-dados/professores` (Seção 2) hoje listam usuários via `GET /api/matricula` e `GET /api/professor` respectivamente, não via `GET /api/escolaxusuarioxfuncao` — estender essas duas rotas para também trazerem `UltimoAcessoEm` (via join análogo) é trabalho de implementação adicional, não coberto em detalhe nesta spec — ver pendência na Seção 7.

---

## 4. Regras de negócio / fluxo

1. **Captura da ação — hook explícito, não middleware genérico.** Assim como Notificação, o registro é disparado por uma chamada explícita a `getAuditoriaService().registrar({...})` no final de cada método de escrita (`store`/`create`, `update`, `destroy`/`delete`) de cada `*.service.ts` já existente, **depois** que a operação no banco teve sucesso, sem bloquear a resposta HTTP (`.catch()` silencioso/logado, igual `pendencia.service.ts:140-148`). Um middleware de pré-roteamento genérico (como o já existente em `Server.ts`) **não** é usado como mecanismo de captura, porque: (a) roda antes da autenticação/antes de resolver qual entidade foi afetada; (b) não sabe se a operação teve sucesso (rodaria mesmo em erro 400/500); (c) não tem acesso ao GUID gerado/afetado nem à categoria de sensibilidade daquela ação específica.
2. **Cobertura ("todo CRUD relevante", decisão #1)** — instrumentar os métodos de escrita de todos os services de módulos com dado relevante da escola: `matricula`, `turma`, `usuario` (vínculo/função na escola), `pendencia`, `evento`, `conteudo`, `tarefaacademica`, `provaagendada`, `anotacao`, `grupotarefa`/`convitegrupotarefa`, `projeto`/`grupoprojeto`/`convitegrupoprojeto`, `materia`, `curso`, `horarioturma`, `gradehoraria`, `escolaconfiguracao`, entre outros que existirem no momento da implementação (levantamento definitivo é tarefa da Fase 3, Seção 6, porque a lista de services muda entre sessões). Ações **de leitura** (`index`/`show`/`GET`) não são auditadas — só escrita, conforme decisão #1 ("CRUD" aqui é interpretado como Create/Update/Delete; o R de "Read" não gera registro, senão o volume de dados seria proibitivo e sem valor de auditoria).
3. **`EntidadeTipo`** é o nome lógico do recurso (ex.: `matricula`, `pendencia`, `turma`), usado depois como filtro na tela (decisão #5 do post-it original, "sistema de filtro"). Deve ser uma string estável (constante), não derivada dinamicamente do nome da classe/tabela, para não quebrar filtros salvos se o código for refatorado.
4. **`EntidadeDescricao`** é opcional e existe só para melhorar a legibilidade da tela (ex. "Matrícula de João Silva na Turma 9ºA" em vez de só um GUID) — cada chamada de `registrar()` decide se popula esse campo; sua ausência não invalida o registro.
5. **Categoria de sensibilidade** é decidida no momento da chamada, pelo próprio service que dispara o registro (cada service "sabe" que tipo de dado está manipulando) — passada como `CategoriaAuditoriaId` no DTO. Ver categorias finais na Seção 1.1.
6. **Falha no registro de auditoria nunca derruba a operação de negócio** — mesma garantia de `NotificacaoService.disparar()` (comentário em `notificacao.service.ts:9`: "disparar() nunca lança erro: uma falha aqui [...] não pode derrubar a operação principal"). `AuditoriaService.registrar()` segue a mesma garantia: erro de banco/conexão no registro de auditoria é logado (`console.error`) e engolido, nunca propagado ao controller/response.
7. **Visualização restrita** — `GET /api/auditoria` exige que o usuário autenticado seja Coordenação, Secretaria ou Direção ativa na `EscolaGUID` consultada (`EscolaxUsuarioxFuncaoDAO.isCoordSecretariaOuDirecaoEmEscola`, novo método — Seção 2). Qualquer outro papel recebe `403`.
8. **Filtros da consulta** (post-it "sistema de filtro"): por `UsuarioCPFAtor` (ver ações de um usuário específico, atendendo literalmente o post-it "ver ações por usuário da escola"), por `AcaoTipo`, por `EntidadeTipo`, por intervalo de datas (`CreatedAt`), e por `CategoriaAuditoriaId`. Todos os filtros são opcionais e combináveis (AND), com paginação (`limit`/`offset`, mesmo padrão de `PendenciaFilters`).
9. **Retenção diferenciada (decisão #3)** — um job agendado (`node-cron`, mesmo padrão de `NotificacaoScheduler`) roda periodicamente (proposta: diariamente, madrugada) e exclui fisicamente (`DELETE`) registros cujo `CreatedAt` seja mais antigo que `CategoriaAuditoriaRetencaoDias` da sua própria categoria — ou seja, o expurgo não é um prazo único para toda a tabela, é calculado registro a registro contra a retenção da sua `CategoriaAuditoriaId`. Sem soft delete aqui — dado que já passou do prazo de retenção decidido pelo negócio deve ser removido de fato, não só marcado.
10. **Sem edição/exclusão manual pelo usuário** — o registro de auditoria não tem endpoint de `PATCH`/`DELETE` acessível via API para o usuário final (nem Direção); a única forma de um registro sumir é o expurgo automático por retenção (regra 9). Isso preserva a integridade do log — se Direção/Coordenação/Secretaria pudessem apagar registros manualmente, o "registro de auditoria" deixaria de servir como auditoria confiável.

---

## 5. API — novos endpoints (esboço)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/auditoria?EscolaGUID=&UsuarioCPFAtor=&AcaoTipo=&EntidadeTipo=&CategoriaAuditoriaId=&dataInicio=&dataFim=&limit=&offset=` | Listar registros de auditoria da escola, com filtros combináveis (restrito a Coordenação/Secretaria/Direção) |
| GET | `/api/auditoria/:registroAuditoriaGUID` | Detalhe de um registro específico (mesma restrição de papel) |
| GET | `/api/auditoria/categorias` | Listar o catálogo `categoriaauditoria` (nome + prazo de retenção), para popular filtro/legenda na tela |

> Não há `POST`/`PATCH`/`DELETE` expostos por rota HTTP — a criação de registro acontece só internamente via `AuditoriaService.registrar()`, chamada pelos outros services (regra 1 da Seção 4), nunca por um client HTTP direto.

### 5.1 "Último acesso do usuário na escola" (Seção 3.4) — endpoint novo + extensão de endpoints existentes

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/usuario/:cpf/escolas/:escolaGUID/acesso` | Registra/atualiza (upsert com throttle) o "último acesso" do usuário autenticado naquela escola. Exige `req.user.UsuarioCPF === :cpf` (`403` caso contrário). Chamado pelo frontend no mount de `DashboardNavbar`. |

> `GET /api/usuario/:cpf/escolas` e `GET /api/escolaxusuarioxfuncao?EscolaGUID=` (ambos já existentes) são **estendidos** para incluir `UltimoAcessoEm` no payload de resposta — não são rotas novas, só o `service`/DAO por trás delas passa a fazer `LEFT JOIN` com `usuarioxescolaacesso`.

---

## 6. Fases de implementação sugeridas

> A sub-feature "último acesso do usuário na escola" (Seção 3.4) foi distribuída pelas fases já existentes abaixo (1, 4, 7) em vez de ganhar uma fase isolada — ela é pequena o bastante para não justificar uma fase própria, e naturalmente acompanha o mesmo ciclo migration → backend → frontend das fases já planejadas, sem dependência cruzada forte que exija sequenciamento separado do restante da spec.

1. **Migration** — criar `categoriaauditoria` (com seed final da Seção 3.1/1.1), `registroauditoria` (Seção 3) e `usuarioxescolaacesso` (Seção 3.4).
2. **Backend núcleo** — `RegistroAuditoriaEntity` (`.model.ts`), `AuditoriaDAO` (`create`, `findAll` com filtros, `findById`, `deleteExpiradosPorCategoria`), `AuditoriaService` com singleton `getAuditoriaService()` espelhando `getNotificacaoService()` (método principal: `registrar(dto: RegistroAuditoriaCreateDTO): Promise<void>`, fire-and-forget, nunca lança).
3. **Instrumentação (o bloco de maior esforço)** — levantar, module a módulo, todos os `*.service.ts` com métodos de escrita e adicionar a chamada `getAuditoriaService().registrar({...}).catch(...)` ao final de cada `store`/`update`/`destroy` bem-sucedido, escolhendo `EntidadeTipo` e `CategoriaAuditoriaId` apropriados por módulo (usar a tabela da Seção 1.1 como guia). Recomenda-se fazer isso em lotes por domínio (ex.: primeiro Matrícula/Turma/Usuário, depois Conteúdo Acadêmico, depois Grupos/Projetos) e não em um único PR gigante, para permitir revisão incremental.
4. **Backend de consulta** — novo método `isCoordSecretariaOuDirecaoEmEscola` em `EscolaxUsuarioxFuncaoDAO`; `AuditoriaController` + `auditoria.middleware.ts` (validação de query params) + `routes/auditoria.routes.ts` com os 3 endpoints da Seção 5. Nesta mesma fase: `POST /api/usuario/:cpf/escolas/:escolaGUID/acesso` (Seção 5.1) + extensão de `GET /api/usuario/:cpf/escolas` e `GET /api/escolaxusuarioxfuncao` para incluir `UltimoAcessoEm`.
5. **Job de retenção** — `AuditoriaScheduler` (`node-cron`, mesma estrutura de `NotificacaoScheduler`: `start()`/`stop()`/`#schedule()`), rodando diariamente e chamando `AuditoriaDAO.deleteExpiradosPorCategoria()` para cada `CategoriaAuditoriaId` do catálogo.
6. **Documentação Swagger-like** — `docs/routes/auditoria-api.md` + atualizar `docs/routes/README.md` (Modo 2 do agente `docs`), só depois que os endpoints da Fase 4 estiverem implementados e testados.
7. **Frontend** — item novo em `modulosNav` na `DashboardNavbar.tsx` (`podeVerAuditoria`, Seção 2), ícone a definir (sugestão: `shield`/`file-text`/`activity`, verificar biblioteca de ícones já usada no projeto); tela `/dashboard/[escolaGUID]/auditoria/page.tsx` com lista paginada + painel de filtros (usuário, tipo de ação, entidade, categoria, período) — sem mockup de design conhecido para esta tela (a confirmar/checar design system, mesma ressalva já registrada em `docs/PLANO_IMPLEMENTACAO_PROJETOS.md` para o módulo de Projetos). Nesta mesma fase: disparo fire-and-forget de `POST /api/usuario/:cpf/escolas/:escolaGUID/acesso` no efeito de mount da `DashboardNavbar` (logo após a chamada já existente a `GET /api/usuario/:cpf/escolas`), e exibição de `UltimoAcessoEm` como coluna extra nas telas `gestao-dados/alunos`, `gestao-dados/professores` (e demais telas de listagem de usuário por escola que existirem) — requer estender `GET /api/matricula` e `GET /api/professor` para trazer o campo (Seção 3.4), trabalho não detalhado nesta spec.

---

## 7. Pontos ainda em aberto (assunções que adotei — revisar antes de codar)

As decisões de maior impacto (o que auditar, quem vê, ausência de diff, existência de retenção diferenciada e seus prazos finais, formato do "último acesso" como campo único) já foram confirmadas com o usuário — ver Seção 1. Os pontos abaixo são genuinamente em aberto e precisam de validação antes da implementação começar:

1. **Exclusão física de usuário existe hoje?** Assumi `ON DELETE RESTRICT` em `UsuarioCPFAtor` (Seção 3.2) e nas FKs de `usuarioxescolaacesso` (Seção 3.4), pelo mesmo padrão de outras FKs para `usuario` no projeto (ex. `FK_Projeto_Criador`) — não localizei, nesta sessão, um fluxo de exclusão física de `usuario` (o padrão observado em outras tabelas é status/soft delete). Se existir algum fluxo de exclusão física de usuário fora do escopo revisado, `RESTRICT` bloquearia essa exclusão para qualquer usuário com histórico de auditoria/acesso — o que é provavelmente o comportamento desejado (preservar o log), mas vale confirmar.
2. **Granularidade de `EntidadeTipo` para tabelas de junção/histórico já existentes** (ex.: `usuarioxgrupoprojeto`, `convitegrupotarefa`) — assumi que ações sobre essas tabelas N:N são auditadas com `EntidadeTipo` = o nome da tabela de junção em si (ex. `usuarioxgrupoprojeto`), não do "grupo pai". A confirmar se o filtro por entidade deveria, em vez disso, agrupar essas ações sob o tipo da entidade "pai" (ex. tratar entrada/saída de grupo como `EntidadeTipo='grupoprojeto'`) para ficar mais legível na tela de filtro.
3. **Escopo da instrumentação (Fase 3, Seção 6) — cobertura "100% de todo service de escrita" é um esforço grande e pode crescer o número de módulos entre a validação desta spec e o início da implementação.** Proposto fazer em lotes por domínio revisáveis separadamente, mas o critério de "pronto" (todos os módulos cobertos vs. os módulos que existiam no momento X) precisa de acordo — sugiro tratar como "todos os services de escrita existentes no repositório no início da Fase 3", aceitando que módulos novos criados depois (ex.: Matérias, ainda não implementado conforme `docs/RELATORIO_BAUA_CODIGO.md`) precisarão instrumentar seu próprio hook de auditoria como parte do próprio PR daquele módulo, não retroativamente aqui.
4. **Ícone da nav-bar** — não escolhi um ícone específico da biblioteca de ícones do projeto (`Icon name={...}` em `DashboardNavbar.tsx`); marcado como "a definir" na Fase 7 (Seção 6), depende de checar o conjunto de ícones disponível no componente `Icon` no momento da implementação frontend.
5. **Ordenação padrão e limite de paginação da listagem** (`GET /api/auditoria`) — assumi ordenação por `CreatedAt DESC` (mais recente primeiro, padrão natural de um log) e reaproveitei a convenção de `limit`/`offset` já usada em `PendenciaFilters`, sem limite máximo de `limit` definido — a confirmar se deve haver um teto (ex. 100) para evitar consulta sem paginação em escolas com muito volume de registros.
6. ~~Mecanismo de atualização do "último acesso"~~ — **confirmado pelo usuário**: gatilho no mount de `DashboardNavbar` (Seção 3.4), não instrumentação de toda requisição autenticada.
7. ~~Throttle do upsert de "último acesso"~~ — **confirmado pelo usuário: 1 hora** (Seção 3.4).
8. **Extensão de `GET /api/matricula` e `GET /api/professor` para incluir `UltimoAcessoEm`** (Seção 3.4/6, Fase 7) — não detalhei o `JOIN`/alteração de DTO desses dois endpoints nesta spec (são módulos fora do escopo direto de Auditoria); fica como trabalho de implementação a ser resolvido quando a Fase 7 começar, junto com decidir se todas as telas de "gestão de usuários da escola" existentes (`gestao-dados/alunos`, `/professores`) devem mostrar a coluna, ou só uma tela consolidada nova.
9. **Multi-função do mesmo usuário na mesma escola (Seção 3.4)** — o schema de `escolaxusuarioxfuncao` permite isso em teoria (`UNIQUE (UsuarioCPF, EscolaGUID, FuncaoId)`), mas não localizei, nesta sessão, um fluxo do produto que efetivamente atribua duas funções ao mesmo usuário na mesma escola. Se isso nunca acontece na prática, a tabela `usuarioxescolaacesso` ainda é a escolha mais segura (não depende dessa suposição), mas vale confirmar se o caso é realmente possível/relevante para não superdimensionar o design.
