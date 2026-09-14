# Planejamento: Projetos / Hackathon

**Data:** 2026-07-19
**Status:** Em implementação
**Escopo:** Novo módulo "Projetos" — professor ou direção cria um projeto (ideia + mecânica de pontuação) direcionado a um público (turmas específicas ou a escola inteira); alunos elegíveis criam grupos com uma proposta própria, grupo pode ser aberto (entrada livre) ou fechado (só por convite do líder); ao contrário de Tarefa Compartilhada, os grupos de projeto podem reunir alunos de turmas diferentes.

---

## 0. Resumo executivo

**O que existe hoje:** nada. Confirmado em `docs/RELATORIO_BAUA_CODIGO.md` (seção 13) — nenhuma entidade, tabela, rota, controller ou tela com "projeto"/"hackathon" no repositório.

**O que existe e será reaproveitado como padrão de referência:** o módulo de **Tarefa Compartilhada** (`grupotarefa` + `convitegrupotarefa` + `historicogrupotarefa`) resolve um problema estruturalmente parecido — alunos organizados em grupos dentro de uma atividade maior, com líder, convite/solicitação de entrada, expulsão, transferência de liderança e histórico. Ver `backend/services/grupotarefa.service.ts`, `backend/repositories/grupotarefa.repository.ts`, `docs/routes/grupotarefa-api.md`, `docs/routes/convitegrupotarefa-api.md`.

**Diferença estrutural chave (não é um copy-paste de Tarefa Compartilhada):**
| | Tarefa Compartilhada | Projetos |
|---|---|---|
| Escopo do grupo | 1 turma só (`GrupoTarefa.TurmaGUID`) | Turmas diferentes da mesma escola (`GrupoProjeto` não tem `TurmaGUID` único) |
| Criação de grupo | Automática pelo backend, 1 grupo por aluno ao postar a tarefa | Manual — aluno cria o próprio grupo com uma "proposta" quando decide participar |
| Quem cria a atividade-mãe | Professor (via matéria+turma) | Professor **ou Direção** (confirmado pelo usuário nesta sessão — ver Seção 1) |
| Visibilidade do grupo | N/A (todo aluno começa em um grupo, junta-se a outros por convite/solicitação) | Explícita: `Aberto` (entra direto) ou `Fechado` (só por convite) — post-it original do board |

**Blocos de trabalho (ordem de dependência):**
1. Modelo de dados (`projeto`, `projetoturma`, `grupoprojeto`, `usuarioxgrupoprojeto`, `convitegrupoprojeto`, `historicogrupoprojeto`) + migration
2. Backend `Projeto` (CRUD da atividade-mãe, restrito a Professor/Direção)
3. Backend `GrupoProjeto` (criar/listar/editar grupo, entrar/sair, expulsar, transferir liderança)
4. Backend `ConviteGrupoProjeto` (convite líder→aluno e solicitação aluno→grupo, só relevante para grupos `Fechado`)
5. Notificações (novos slugs no catálogo)
6. Documentação Swagger-like (`docs/routes/projeto-api.md`, `grupoprojeto-api.md`, `convitegrupoprojeto-api.md`)
7. Frontend (páginas de listagem/criação de projeto, tela de grupos, entrada/convite) — sem mockup de design disponível (confirmado na seção 13 do relatório: "não existem ainda exemplos/wireframes de referência"), então segue os componentes/CSS Modules já usados em `crud-tarefa` e `tarefas` como base de padrão visual, não o MCP `claude-design`.

---

## 1. Decisões de negócio já validadas

| # | Pergunta | Decisão |
|---|---|---|
| 1 | Quem pode criar um projeto? | **Professor (FuncaoId=3) ou Direção (FuncaoId=6)** da escola — confirmado pelo usuário nesta sessão. (O board original dizia "só professores", o usuário estendeu explicitamente para incluir Direção.) |
| 2 | Quem participa de projetos? | Apenas Alunos (FuncaoId=5) matriculados em turma elegível — conforme post-it do board ("só professores/criadores e alunos"). |
| 3 | Grupos cruzam turmas? | Sim — "entre turmas diferentes da escola", diferente de Tarefa Compartilhada (confirmado pelo usuário: "projetos funcionam de forma semelhante com a tarefa compartilhada, só que entre turmas diferentes da escola"). |
| 4 | Grupo pode ser aberto ou fechado? | Sim, mecânica dupla conforme post-it original: "grupo pode ser aberto ao público ou fechado por convite". |
| 5 | Professor/Direção (criador do projeto) pode adicionar/remover integrantes de grupos já formados por alunos? | **Sim** — confirmado pelo usuário. O criador do projeto tem a mesma autoridade que o líder aluno para adicionar (endpoint dedicado, sem passar por convite) e remover membros de qualquer `GrupoProjeto` do seu projeto. |
| 6 | Grupo `Fechado` aceita solicitação de aluno (pedido de entrada aprovado pelo líder), além de convite do líder? | **Sim**, os dois fluxos existem (`ConviteTipo='Convite'` e `'Solicitacao'`), espelhando `convitegrupotarefa` — confirmado pelo usuário. |
| 7 | Quem atribui a pontuação final de um grupo? | **Só o `UsuarioCPFCriador` do projeto** — confirmado pelo usuário. |
| 8 | Mecânica de pontuação é texto livre ou estruturada (critérios com peso, múltiplos avaliadores)? | **Texto livre (`ProjetoMecanicaPontuacao`) + nota numérica manual lançada depois (`GrupoProjetoPontuacao`)** para a v1 — confirmado pelo usuário. Estrutura mais rica (critérios, múltiplos avaliadores) fica para uma fase futura. |

---

## 2. Estado atual do código (relevante para esta feature)

- **Autenticação/autorização por papel:** não há um middleware genérico de "exigir FuncaoId X" reaproveitável diretamente; o padrão existente é o service consultar `EscolaxUsuarioxFuncaoDAO` diretamente. Já existe `EscolaxUsuarioxFuncaoDAO.isCoordOuDirecaoEmEscola(usuarioCPF, escolaGUID)` (`backend/repositories/escolaxusuarioxfuncao.repository.ts:338`, filtra `FuncaoId IN (1,6)` e `Status='Ativo'`) — **modelo a replicar** para um novo método `isProfessorOuDirecaoEmEscola` (`FuncaoId IN (3,6)`).
- **Fan-out por função:** `EscolaxUsuarioxFuncaoDAO.findUsuariosAtivosByEscolaEFuncoes(EscolaGUID, FuncaoIds)` (linha 354) já resolve "todos os alunos ativos da escola" — reaproveitável para o caso `ProjetoPublicoAlvo='Escola'`.
- **Grupos com líder/convite/histórico:** padrão-ouro completo em `grupotarefa` + `convitegrupotarefa` + `historicogrupotarefa` (DAO → Service → Controller → Middleware → Routes, injeção de dependência manual na factory de rotas). A camada de `GrupoProjeto` deve seguir a mesma estrutura de arquivos e a mesma assinatura de métodos onde fizer sentido (expulsar, transferir liderança, atualizar nome).
- **UUID:** todo GUID no projeto é UUID v4, validado via regex `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` (ver `GrupoTarefaEntity.validar()`).
- **Notificações:** catálogo estático em `notificacaotipo` + fan-out por `notificacaotipofuncao`, disparo via `getNotificacaoService().disparar({...})` (ver `backend/services/tarefaacademica.service.ts:249`, `backend/services/grupotarefa.service.ts:259`). Novos tipos exigem `INSERT` no seed (ver `backend/database/migrations/2026-07-17-notificacoes.sql`).
- **Resposta padrão da API:** `{ success, message, data }` em sucesso, `{ success: false, message, details? }` em erro, lançado via `ErrorResponse(statusCode, message, details?)`.
- **Chat de grupo:** `ConversaGrupoService` já cria/gerencia conversa por `GrupoTarefaGUID` (`criarConversaParaGrupoTarefa`, `removerMembroGrupoTarefa`, `transferirLiderGrupoTarefa`). Reaproveitar para `GrupoProjeto` é possível mas está marcado como pendência em aberto (Seção 7) — a classe atual é fortemente acoplada a `GrupoTarefa` no nome dos métodos.
- **`funcao` (papéis):** `1=Coordenacao, 2=Secretaria, 3=Professor, 4=Responsavel, 5=Aluno, 6=Direcao` (`backend/database/sql.txt:94-100`).

---

## 3. Modelo de dados novo/alterado

### 3.1 `projeto` — a atividade-mãe criada por Professor/Direção

```sql
CREATE TABLE `projeto` (
  `ProjetoGUID` CHAR(36) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `UsuarioCPFCriador` VARCHAR(14) NOT NULL,
  `ProjetoTitulo` VARCHAR(128) NOT NULL,
  `ProjetoDescricao` VARCHAR(2048) NOT NULL COMMENT 'A ideia do projeto, definida pelo criador',
  `ProjetoMecanicaPontuacao` VARCHAR(1024) NULL COMMENT 'Texto livre descrevendo como o projeto será pontuado/avaliado',
  `ProjetoPublicoAlvo` ENUM('Escola','Turmas') NOT NULL DEFAULT 'Turmas',
  `ProjetoGrupoMinPessoas` INT NOT NULL DEFAULT 1,
  `ProjetoGrupoMaxPessoas` INT NOT NULL,
  `ProjetoInscricaoPrazoData` DATETIME NOT NULL COMMENT 'Prazo para criar/entrar em grupos',
  `ProjetoEntregaPrazoData` DATETIME NULL COMMENT 'Prazo final do projeto em si (pode ser posterior ao prazo de inscrição)',
  `ProjetoStatus` ENUM('Aberto','Encerrado') NOT NULL DEFAULT 'Aberto',
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ProjetoGUID`),
  INDEX `idx_projeto_escola` (`EscolaGUID`),
  INDEX `idx_projeto_criador` (`UsuarioCPFCriador`),
  CONSTRAINT `CHK_ProjetoGrupoMinPessoas` CHECK (`ProjetoGrupoMinPessoas` >= 1),
  CONSTRAINT `CHK_ProjetoGrupoMaxPessoas` CHECK (`ProjetoGrupoMaxPessoas` >= `ProjetoGrupoMinPessoas`),
  CONSTRAINT `FK_Projeto_Escola` FOREIGN KEY (`EscolaGUID`) REFERENCES `escola` (`EscolaGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_Projeto_Criador` FOREIGN KEY (`UsuarioCPFCriador`) REFERENCES `usuario` (`UsuarioCPF`) ON UPDATE CASCADE ON DELETE RESTRICT
);
```

### 3.2 `projetoturma` — turmas elegíveis (só populada quando `ProjetoPublicoAlvo='Turmas'`)

```sql
CREATE TABLE `projetoturma` (
  `ProjetoGUID` CHAR(36) NOT NULL,
  `TurmaGUID` CHAR(36) NOT NULL,
  PRIMARY KEY (`ProjetoGUID`, `TurmaGUID`),
  CONSTRAINT `FK_ProjetoTurma_Projeto` FOREIGN KEY (`ProjetoGUID`) REFERENCES `projeto` (`ProjetoGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_ProjetoTurma_Turma` FOREIGN KEY (`TurmaGUID`) REFERENCES `turma` (`TurmaGUID`) ON UPDATE CASCADE ON DELETE CASCADE
);
```

### 3.3 `grupoprojeto` — grupo criado por um aluno, cruza turmas

```sql
CREATE TABLE `grupoprojeto` (
  `GrupoProjetoGUID` CHAR(36) NOT NULL,
  `ProjetoGUID` CHAR(36) NOT NULL,
  `UsuarioCPFLider` VARCHAR(14) NOT NULL,
  `GrupoProjetoNome` VARCHAR(128) NULL,
  `GrupoProjetoProposta` VARCHAR(2048) NOT NULL COMMENT 'Proposta do grupo para o projeto, escrita pelo líder na criação',
  `GrupoProjetoVisibilidade` ENUM('Aberto','Fechado') NOT NULL DEFAULT 'Fechado',
  `GrupoProjetoPontuacao` DECIMAL(6,2) NULL COMMENT 'Preenchido pelo criador do projeto ao avaliar',
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`GrupoProjetoGUID`),
  INDEX `idx_grupoprojeto_projeto` (`ProjetoGUID`),
  INDEX `idx_grupoprojeto_lider` (`UsuarioCPFLider`),
  CONSTRAINT `FK_GrupoProjeto_Projeto` FOREIGN KEY (`ProjetoGUID`) REFERENCES `projeto` (`ProjetoGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_GrupoProjeto_Lider` FOREIGN KEY (`UsuarioCPFLider`) REFERENCES `usuario` (`UsuarioCPF`) ON UPDATE CASCADE ON DELETE RESTRICT
);
```

> Nota: sem `TurmaGUID` de propósito — diferente de `grupotarefa`, este grupo pode reunir alunos de turmas diferentes (ver Seção 0). A elegibilidade de cada membro é validada individualmente contra `projetoturma` (ou contra qualquer turma da escola, se `ProjetoPublicoAlvo='Escola'`) no momento da entrada, não travada estruturalmente por FK.

### 3.4 `usuarioxgrupoprojeto` — membros não-líderes

```sql
CREATE TABLE `usuarioxgrupoprojeto` (
  `GrupoProjetoGUID` CHAR(36) NOT NULL,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `DataEntrada` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`GrupoProjetoGUID`, `UsuarioCPF`),
  CONSTRAINT `FK_UXGP_Grupo` FOREIGN KEY (`GrupoProjetoGUID`) REFERENCES `grupoprojeto` (`GrupoProjetoGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_UXGP_Usuario` FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario` (`UsuarioCPF`) ON UPDATE CASCADE ON DELETE CASCADE
);
```

### 3.5 `convitegrupoprojeto` — convite (líder→aluno) e solicitação (aluno→grupo), espelha `convitegrupotarefa`

```sql
CREATE TABLE `convitegrupoprojeto` (
  `ConviteGUID` CHAR(36) NOT NULL,
  `GrupoProjetoGUID` CHAR(36) NOT NULL,
  `UsuarioCPFConvidado` VARCHAR(14) NOT NULL,
  `ConviteTipo` ENUM('Convite','Solicitacao') NOT NULL,
  `ConviteStatus` ENUM('Pendente','Aceito','Recusado') NOT NULL DEFAULT 'Pendente',
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ConviteGUID`),
  INDEX `idx_convitegp_grupo` (`GrupoProjetoGUID`),
  INDEX `idx_convitegp_convidado` (`UsuarioCPFConvidado`),
  CONSTRAINT `FK_ConviteGP_Grupo` FOREIGN KEY (`GrupoProjetoGUID`) REFERENCES `grupoprojeto` (`GrupoProjetoGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_ConviteGP_Usuario` FOREIGN KEY (`UsuarioCPFConvidado`) REFERENCES `usuario` (`UsuarioCPF`) ON UPDATE CASCADE ON DELETE CASCADE
);
```

> Sem `Expirado` no enum (diferente de `convitegrupotarefa`) — não há rotina de expiração automática no padrão original tampouco; omitido aqui para não herdar um estado morto. Se a Seção 7 confirmar necessidade, adicionar depois.

### 3.6 `historicogrupoprojeto` — auditoria, espelha `historicogrupotarefa`

```sql
CREATE TABLE `historicogrupoprojeto` (
  `HistoricoGUID` CHAR(36) NOT NULL,
  `GrupoProjetoGUID` CHAR(36) NOT NULL,
  `HistoricoTipo` ENUM('Entrada','Saida','Expulsao','TransferenciaLider','MudancaVisibilidade','PontuacaoAtribuida') NOT NULL,
  `UsuarioCPFAtor` VARCHAR(14) NOT NULL,
  `UsuarioCPFAlvo` VARCHAR(14) NULL,
  `HistoricoDetalhes` JSON NULL,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`HistoricoGUID`),
  INDEX `idx_historicogp_grupo` (`GrupoProjetoGUID`),
  CONSTRAINT `FK_HistoricoGP_Grupo` FOREIGN KEY (`GrupoProjetoGUID`) REFERENCES `grupoprojeto` (`GrupoProjetoGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `FK_HistoricoGP_Ator` FOREIGN KEY (`UsuarioCPFAtor`) REFERENCES `usuario` (`UsuarioCPF`) ON UPDATE CASCADE ON DELETE RESTRICT
);
```

### 3.7 Interfaces TypeScript (rascunho, `backend/entities/projeto.model.ts` e `backend/entities/grupoprojeto.model.ts`)

```typescript
export interface Projeto {
  ProjetoGUID: string;
  EscolaGUID: string;
  UsuarioCPFCriador: string;
  ProjetoTitulo: string;
  ProjetoDescricao: string;
  ProjetoMecanicaPontuacao: string | null;
  ProjetoPublicoAlvo: 'Escola' | 'Turmas';
  ProjetoGrupoMinPessoas: number;
  ProjetoGrupoMaxPessoas: number;
  ProjetoInscricaoPrazoData: Date;
  ProjetoEntregaPrazoData: Date | null;
  ProjetoStatus: 'Aberto' | 'Encerrado';
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ProjetoCreateDTO {
  EscolaGUID: string;
  ProjetoTitulo: string;
  ProjetoDescricao: string;
  ProjetoMecanicaPontuacao?: string;
  ProjetoPublicoAlvo: 'Escola' | 'Turmas';
  TurmasGUID?: string[];           // obrigatório se ProjetoPublicoAlvo === 'Turmas'
  ProjetoGrupoMinPessoas: number;
  ProjetoGrupoMaxPessoas: number;
  ProjetoInscricaoPrazoData: string;
  ProjetoEntregaPrazoData?: string;
}

export type GrupoProjetoVisibilidade = 'Aberto' | 'Fechado';

export interface GrupoProjeto {
  GrupoProjetoGUID: string;
  ProjetoGUID: string;
  UsuarioCPFLider: string;
  GrupoProjetoNome: string | null;
  GrupoProjetoProposta: string;
  GrupoProjetoVisibilidade: GrupoProjetoVisibilidade;
  GrupoProjetoPontuacao: number | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface GrupoProjetoCreateDTO {
  ProjetoGUID: string;
  GrupoProjetoNome?: string;
  GrupoProjetoProposta: string;
  GrupoProjetoVisibilidade: GrupoProjetoVisibilidade;
}
```

---

## 4. Regras de negócio / fluxo

1. **Criação do projeto** — só Professor ou Direção da escola (`EscolaxUsuarioxFuncaoDAO.isProfessorOuDirecaoEmEscola`, novo método espelhando `isCoordOuDirecaoEmEscola`). Se `ProjetoPublicoAlvo='Turmas'`, `TurmasGUID` é obrigatório e cada turma deve pertencer à mesma `EscolaGUID` (mesma validação que `TarefaAcademicaService` já faz para matrículas). Se `ProjetoPublicoAlvo='Escola'`, nenhuma linha em `projetoturma` é criada — elegibilidade é "qualquer aluno ativo da escola".
2. **Nenhum grupo é criado automaticamente** — diferente de Tarefa Compartilhada. Um aluno elegível cria seu próprio grupo (líder = criador) quando quiser participar, com uma `GrupoProjetoProposta` obrigatória e uma `GrupoProjetoVisibilidade` explícita.
3. **Elegibilidade de membro** — ao criar grupo ou entrar/aceitar convite, validar que o `UsuarioCPF` é Aluno ativo e está matriculado em turma elegível do projeto (turma em `projetoturma`, ou qualquer turma da `EscolaGUID` se `ProjetoPublicoAlvo='Escola'`). Um mesmo aluno só pode ter uma participação ativa (líder ou membro) por projeto — bloquear segunda entrada.
4. **Grupo `Aberto`** — qualquer aluno elegível entra diretamente (endpoint próprio, sem passar por `convitegrupoprojeto`), respeitando `ProjetoGrupoMaxPessoas`.
5. **Grupo `Fechado`** — entrada via convite do líder (`ConviteTipo='Convite'`) aceito pelo convidado, **ou** via solicitação do aluno (`ConviteTipo='Solicitacao'`) aprovada pelo líder — os dois fluxos coexistem, espelhando `convitegrupotarefa`/`convitegrupoprojeto`.
6. **Limite de vagas** — `TotalMembros < ProjetoGrupoMaxPessoas` deve ser validado na entrada direta (grupo aberto), na aceitação de convite/solicitação (grupo fechado) **e** na adição direta pelo criador do projeto (regra 7) — diferente do TODO não implementado em `ConviteGrupoTarefaService.enviarConvite` (ver `docs/routes/convitegrupotarefa-api.md`, regra 6), aqui a validação **deve** ser aplicada desde o início, sem exceção.
7. **Gestão de membros por líder E por criador do projeto** — o líder aluno gerencia seu próprio grupo (nome, proposta, visibilidade, expulsar, transferir liderança). O `UsuarioCPFCriador` do `Projeto` (Professor/Direção) tem autoridade adicional sobre **qualquer** grupo do seu projeto: pode adicionar um aluno elegível diretamente (sem convite/solicitação, mesmo em grupo `Fechado`) e pode expulsar qualquer membro (inclusive o líder — nesse caso, ver regra 7a). Toda ação do criador do projeto é registrada em `historicogrupoprojeto` com `UsuarioCPFAtor` = CPF do professor/direção, para diferenciar de ação do próprio líder.
   - 7a. **Se o criador do projeto expulsar o líder**, a liderança passa automaticamemte para o membro mais antigo (`DataEntrada` mais antiga) do grupo; se não houver outro membro, o grupo é dissolvido (grupo sem líder não pode existir). Caso não haja mais ninguém, o grupo (e seus registros em `usuarioxgrupoprojeto`/`convitegrupoprojeto`) é removido.
8. **Expulsão / transferência de liderança / saída (líder)** — mesma mecânica de `GrupoTarefaService`: líder expulsa; líder transfere liderança para membro existente; ao ser expulso ou sair, o aluno simplesmente perde o vínculo — **não** ganha um grupo novo automaticamente, porque aqui grupos não são automáticos.
9. **Encerramento do projeto** — ao passar de `ProjetoInscricaoPrazoData`, novos grupos/entradas não são mais permitidos (validado no service, não precisa de job agendado). `ProjetoStatus='Encerrado'` é setado manualmente pelo criador (Professor/Direção).
10. **Pontuação** — `GrupoProjetoPontuacao` só pode ser definida/alterada pelo `UsuarioCPFCriador` do `Projeto` (não por qualquer professor da escola).

---

## 5. API — novos endpoints (esboço)

### `projeto`
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/projeto` | Criar projeto (Professor/Direção) |
| GET | `/api/projeto?EscolaGUID=` | Listar projetos visíveis ao usuário autenticado na escola |
| GET | `/api/projeto/:projetoGUID` | Detalhe do projeto |
| PATCH | `/api/projeto/:projetoGUID` | Atualizar projeto (só criador) |
| PATCH | `/api/projeto/:projetoGUID/encerrar` | Encerrar projeto (só criador) |
| DELETE | `/api/projeto/:projetoGUID` | Excluir projeto (só criador, sem grupos formados — a confirmar) |

### `grupoprojeto`
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/grupoprojeto` | Aluno cria grupo (líder = ele mesmo) |
| GET | `/api/grupoprojeto/projeto/:projetoGUID` | Listar grupos de um projeto |
| GET | `/api/grupoprojeto/:grupoGUID` | Detalhe do grupo com membros |
| PATCH | `/api/grupoprojeto/:grupoGUID` | Atualizar nome/proposta/visibilidade (só líder) |
| PATCH | `/api/grupoprojeto/:grupoGUID/pontuacao` | Atribuir pontuação (só criador do projeto) |
| POST | `/api/grupoprojeto/:grupoGUID/entrar` | Entrar diretamente (só se `Aberto`) |
| DELETE | `/api/grupoprojeto/:grupoGUID/sair` | Sair do próprio grupo |
| DELETE | `/api/grupoprojeto/:grupoGUID/membros/:cpf` | Expulsar membro (líder do grupo **ou** criador do projeto) |
| PATCH | `/api/grupoprojeto/:grupoGUID/transferir-lider` | Transferir liderança (só líder) |
| POST | `/api/grupoprojeto/:grupoGUID/membros` | Adicionar aluno elegível diretamente ao grupo, sem convite (só criador do projeto) |

### `convitegrupoprojeto`
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/convitegrupoprojeto/:grupoGUID/convites` | Líder convida aluno (só grupo `Fechado`) |
| POST | `/api/convitegrupoprojeto/:grupoGUID/solicitacoes` | Aluno solicita entrada — ver Seção 7 se aplicável a `Fechado` |
| GET | `/api/convitegrupoprojeto/pendentes` | Listar convites/solicitações pendentes do usuário |
| PATCH | `/api/convitegrupoprojeto/:conviteGUID/aceitar` | Aceitar |
| PATCH | `/api/convitegrupoprojeto/:conviteGUID/recusar` | Recusar |

---

## 6. Fases de implementação sugeridas

1. **Migration** — criar as 6 tabelas da Seção 3 + seed dos novos `notificacaotipo` (`projeto_criado`, `convite_grupo_projeto`, `solicitacao_grupo_projeto`, `removido_grupo_projeto`, `projeto_pontuacao_atribuida`).
2. **Backend `Projeto`** — entity, DAO, service (com `isProfessorOuDirecaoEmEscola` novo em `EscolaxUsuarioxFuncaoDAO`), controller, middleware, routes. Testável isoladamente (criar/listar/editar/encerrar projeto, sem grupos ainda).
3. **Backend `GrupoProjeto`** — entity, DAO, service (criação manual pelo aluno, entrada direta se aberto, expulsão, transferência de liderança, pontuação), controller, middleware, routes.
4. **Backend `ConviteGrupoProjeto`** — espelha `ConviteGrupoTarefaService`, com a validação de limite de vagas já corrigida (Seção 4, regra 6).
5. **Notificações** — disparo de `projeto_criado` (fan-out para alunos elegíveis via `findUsuariosAtivosByEscolaEFuncoes` ou lista de matrículas das turmas-alvo), `convite_grupo_projeto`, `removido_grupo_projeto`.
6. **Documentação Swagger-like** — `docs/routes/projeto-api.md`, `grupoprojeto-api.md`, `convitegrupoprojeto-api.md` + atualizar `docs/routes/README.md` (Modo 2 do agente `docs`).
7. **Frontend** — listagem de projetos (`/dashboard/[escolaGUID]/projetos`), criação (`/dashboard/[escolaGUID]/crud-projeto`, restrita a Professor/Direção), detalhe do projeto com lista de grupos e ação de criar/entrar em grupo, tela de grupo (membros, convites, pontuação se aplicável). Sem mockup — reaproveitar padrões visuais de `crud-tarefa`/`tarefas` (CSS Modules + CSS Variables do tema).

---

## 7. Pontos ainda em aberto (assunções que adotei — revisar antes de codar)

As perguntas de maior impacto no modelo de dados/permissões (mecânica de pontuação, gestão de membros pelo professor, fluxo de grupo fechado, quem pontua) já foram confirmadas com o usuário — ver Seção 1, decisões #5–#8. Os pontos abaixo seguem em aberto porque têm impacto menor/isolado; adotei um default razoável em cada um para não travar a implementação, mas seguem marcados para revisão:

1. **Um aluno pode participar de múltiplos projetos e múltiplos grupos ao mesmo tempo?** — assumi que sim para projetos diferentes, mas **não** para o mesmo projeto (só 1 grupo por aluno por projeto, igual à trava de Tarefa Compartilhada). Confirmar se está correto.
2. **Encerramento automático por prazo** — assumi que `ProjetoInscricaoPrazoData` vencida só bloqueia novas entradas/grupos no momento da ação (validação síncrona no service), sem job agendado que troque `ProjetoStatus` automaticamente. Existe `backend/services/notificacao.scheduler.ts` já rodando jobs agendados no projeto (lembretes de prazo) — se quiser um job de "encerrar projetos vencidos automaticamente" ou lembretes de prazo de inscrição, é uma decisão à parte, fora do escopo da v1.
3. **Exclusão de projeto com grupos já formados** — o endpoint `DELETE /api/projeto/:projetoGUID` da Seção 5 está listado como "a confirmar": bloquear exclusão se já existir `GrupoProjeto`, ou permitir com `ON DELETE CASCADE` apagando tudo? Nenhum outro módulo do sistema tem exclusão física de uma entidade "mãe" com filhos tão profundos — **decidi não implementar `DELETE` físico na v1**, só `PATCH .../encerrar`. Revisar se isso é aceitável.
4. **Chat de grupo** — `ConversaGrupoService` existente é acoplado a `GrupoTarefa` no nome dos métodos (`criarConversaParaGrupoTarefa` etc.). **Não incluí integração de chat na v1** deste módulo — confirmar se "Projetos" precisa de conversa de grupo desde o lançamento ou se é uma fase 2 (nesse caso, o service precisaria ser generalizado para aceitar qualquer "grupo" com GUID+membros, não só `GrupoTarefa`).
5. **Nome das rotas/tabelas** — segui a convenção `<recurso>` em minúsculo sem underscore para tabelas (`projeto`, `grupoprojeto`) espelhando `grupotarefa`/`convitegrupotarefa`; e PascalCase para campos, consistente com o restante do schema.
