# Personalização de grupo + permissões granulares delegáveis + submissão de projeto

**Status:** em andamento (retomar pela seção "Progresso" no fim deste doc)

## Contexto

O usuário pediu, no chat de turma, a mesma feature de "trocar capa/cor" que já foi construída pra turma (`turma.TurmaImagemUrl`/`TurmaCorFundo`) — mas agora pro grupo de conversa em si (nome, cor, foto), e foi além: quer que o Representante/Líder consiga **delegar permissões individuais** pra membros específicos do grupo, em vez de tudo ser um binário "tem o papel ou não tem". Deu dois exemplos concretos que viraram requisito, não só ilustração: no chat, poder tirar a habilidade de excluir mensagens de alguém mas ainda deixar essa pessoa personalizar o grupo; no grupo de tarefa/projeto, uma configuração de tipo "esse cara pode postar/submeter o projeto".

Investigação confirmou: (1) hoje não existe nenhum sistema de permissão granular no projeto — todo controle de acesso é um enum de papel único (`MembroFuncao`, `FuncaoId`); (2) `grupoprojeto` não tem entrega/submissão nenhuma implementada — só existe um prazo (`ProjetoEntregaPrazoData`); (3) `conversa_grupo` não tem coluna de cor/foto, e renomear o grupo hoje só acontece automaticamente (sincronizado do nome da turma), nunca por ação manual do usuário.

Perguntado ao usuário e confirmado:
- Quem edita nome/cor/foto do grupo de chat: Representante/Vice-Representante (Turma), Líder (Tarefa), Coordenação/Direção — mesmo padrão já usado na capa da turma.
- Cor **e** foto de verdade (upload), não só cor.
- Capacidades delegáveis no chat: **excluir mensagens de outros** e **personalizar o grupo**.
- Capacidades delegáveis em grupo de tarefa/projeto: **expulsar membros** e **atualizar dados do grupo** (nome/proposta). **Transferir liderança fica de fora** (ato único do próprio líder, não uma permissão de gestão do dia a dia).
- Nova feature pedida: **submissão de projeto** (não existe hoje) — vira uma terceira capacidade delegável só do domínio Projeto: "pode submeter o projeto".
- Armazenamento dos toggles: **uma coluna JSON única** por linha de membro (não uma coluna booleana por capacidade), mesmo sendo o primeiro uso desse padrão no projeto — decisão explícita do usuário.

**Achado inicial, revertido em 2026-08-21**: na primeira investigação, `conversa_grupo.ConversaGrupoTipo` só tinha `'Turma'` e `'Tarefa'` (enum no banco: `ENUM('Turma','Tarefa')`, `backend/database/sql.txt:320`) e o próprio `grupoprojeto.service.ts` documenta em comentário a decisão deliberada da v1: "diferente de GrupoTarefaService, este service NÃO integra com ConversaGrupoService — chat de grupo foi deliberadamente deixado fora do escopo da v1 (ver docs/PLANO_IMPLEMENTACAO_PROJETOS.md, Seção 7 ponto 4)". Com base nisso, a primeira versão deste plano concluiu que Projeto não ganharia personalização de chat.

**Decisão do usuário (2026-08-21): reverter isso — grupo de Projeto PASSA A TER chat associado**, igual Turma e Tarefa. Personalização (nome/cor/foto) e as permissões granulares de chat (`PodeExcluirMensagens`, `PodePersonalizarGrupo`) também se aplicam a grupos de Projeto. **Esta mudança ainda não foi iniciada** — só a documentação foi atualizada até aqui; ver checklist de implementação na seção 1b e o item "#29" em Progresso.

Este projeto **não tem banco de dev/staging** — toda migration roda direto contra produção (`.env` aponta pro Railway). Por isso a migration é estritamente aditiva (colunas nullable, tabela nova) e usa o padrão idempotente já estabelecido (guards de "coluna já existe").

---

## 1. Migration — `backend/database/migrations/2026-08-21-permissoes-granulares-grupos.ts`

```sql
-- conversa_grupo: personalização
ALTER TABLE conversa_grupo
  ADD COLUMN ConversaGrupoCorFundo VARCHAR(7) NULL AFTER ConversaGrupoRefGUID,
  ADD COLUMN ConversaGrupoImagemUrl VARCHAR(500) NULL AFTER ConversaGrupoCorFundo;

-- conversa_grupo_membro: permissões granulares (chat)
ALTER TABLE conversa_grupo_membro
  ADD COLUMN MembroPermissoes JSON NULL AFTER MembroStatus;

-- usuarioxgrupoprojeto / usuarioxgrupotarefa: permissões granulares (acadêmico)
ALTER TABLE usuarioxgrupoprojeto ADD COLUMN MembroPermissoes JSON NULL AFTER UsuarioGUID;
ALTER TABLE usuarioxgrupotarefa ADD COLUMN MembroPermissoes JSON NULL AFTER UsuarioGUID;

-- grupoprojeto: rastreio de submissão
ALTER TABLE grupoprojeto
  ADD COLUMN GrupoProjetoSubmetidoEm DATETIME NULL AFTER GrupoProjetoPontuacao,
  ADD COLUMN GrupoProjetoSubmetidoPorGUID CHAR(36) NULL AFTER GrupoProjetoSubmetidoEm;

-- historicogrupoprojeto: só ADICIONA 'Submissao' ao enum existente
ALTER TABLE historicogrupoprojeto
  MODIFY HistoricoTipo ENUM('Entrada','Saida','Expulsao','TransferenciaLider','MudancaVisibilidade','PontuacaoAtribuida','Submissao') NOT NULL;

-- nova tabela pivot, mesmo padrão de relacaoanexostarefa/relacaoanexospendencia/...
CREATE TABLE IF NOT EXISTS relacaoanexosgrupoprojeto (
  RelacaoAnexoGrupoProjetoGUID CHAR(36) NOT NULL,
  AnexoGUID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  GrupoProjetoGUID CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (RelacaoAnexoGrupoProjetoGUID),
  INDEX idx_relacao_grupoprojeto (GrupoProjetoGUID),
  INDEX idx_relacao_anexo_gp (AnexoGUID),
  CONSTRAINT FK_RelacaoAnexoGrupoProjeto_Anexo FOREIGN KEY (AnexoGUID) REFERENCES anexo(AnexoGUID) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT FK_RelacaoAnexoGrupoProjeto_Grupo FOREIGN KEY (GrupoProjetoGUID) REFERENCES grupoprojeto(GrupoProjetoGUID) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

`AnexoGUID`/`GrupoProjetoGUID` na tabela nova usam `utf8mb4_0900_ai_ci` (não `utf8mb4_unicode_ci` como o resto do projeto) porque é a collation real de `anexo.AnexoGUID`/`grupoprojeto.GrupoProjetoGUID` — verificado via `information_schema.COLUMNS` antes de rodar, pra evitar erro de FK por collation incompatível (bug já visto antes nesta sessão em outras tabelas).

`GrupoProjetoSubmetidoPorGUID` fica sem FK — mesmo padrão de `HistoricoGrupoProjeto.UsuarioGUIDAtor`.

**Executada e verificada em produção** (read-only antes: 0 colunas/tabela; depois: todas presentes, `IS_NULLABLE='YES'`, `SHOW CREATE TABLE` confirma as FKs).

---

## 1b. Grupo de Projeto ganha chat associado — **NÃO INICIADO**

Reversão de escopo (ver Contexto acima). Precisa de uma segunda migration aditiva (enum `ALTER ... MODIFY`, mesmo padrão já usado nesta feature pra adicionar `'Submissao'` a `historicogrupoprojeto.HistoricoTipo`) + integração de serviço, mirando exatamente o que já existe pra `GrupoTarefaService`/`ConversaGrupoService.criarConversaParaGrupoTarefa`.

**Migration nova** (`backend/database/migrations/2026-08-XX-chat-grupoprojeto.ts`):
```sql
ALTER TABLE conversa_grupo
  MODIFY ConversaGrupoTipo ENUM('Turma','Tarefa','Projeto') NOT NULL;
```
Puramente aditiva ao enum — nenhuma linha existente usa `'Projeto'`, então não há risco de dado órfão.

**Entity**: `backend/entities/conversa-grupo.model.ts` — trocar o tipo `'Turma' | 'Tarefa'` (getter, setter, validação) por `'Turma' | 'Tarefa' | 'Projeto'` (linhas 4, 15, 36, 38 na versão atual).

**`backend/utils/helpers/permissao-granular.helper.ts`**: `resolverPermissaoChat` recebe hoje `grupoTipo: 'Turma' | 'Tarefa'` — estender pra `'Turma' | 'Tarefa' | 'Projeto'`. Definir o default por papel pra Projeto: mais natural é espelhar Tarefa (`membroFuncao === 'Lider'`), já que Projeto também usa o modelo de líder único fora da tabela pivot acadêmica — mas aqui a pivot é a de **chat** (`conversa_grupo_membro`), não `usuarioxgrupoprojeto`, então precisa confirmar como o líder é registrado nessa tabela quando o grupo de chat de Projeto for criado (ver próximo parágrafo).

**`backend/services/conversa-grupo.service.ts`**: novos métodos espelhando os de Tarefa (`criarConversaParaGrupoTarefa`, `adicionarMembroGrupoTarefa`, `removerMembroGrupoTarefa`, `transferirLiderGrupoTarefa`):
- `criarConversaParaGrupoProjeto(grupoProjetoGUID, nome, liderGUID)` — cria a conversa com `ConversaGrupoTipo='Projeto'`, adiciona o líder como membro com `MembroFuncao='Lider'`.
- `adicionarMembroGrupoProjeto` / `removerMembroGrupoProjeto`.
- `transferirLiderGrupoProjeto` (sincroniza o papel no chat quando `GrupoProjetoService.transferirLideranca` roda — essa ação de negócio continua líder-only e não delegável, só o *espelhamento* no chat muda).

**`backend/services/grupoprojeto.service.ts`**: hoje **deliberadamente não** injeta `ConversaGrupoService` (comentário nas linhas 18-26 explica o motivo antigo — remover/atualizar esse comentário). Precisa:
- Novo parâmetro opcional `conversaGrupoService?: ConversaGrupoService` no constructor (mesmo padrão opcional usado em `GrupoTarefaService`, pra não quebrar quem instancia sem esse argumento).
- `criarGrupo()` → chamar `criarConversaParaGrupoProjeto(...)` após criar o grupo.
- `entrarGrupo()`/`adicionarMembro()` → chamar `adicionarMembroGrupoProjeto(...)`.
- `sairGrupo()`/`expulsarMembro()` → chamar `removerMembroGrupoProjeto(...)`.
- `transferirLideranca()` → chamar `transferirLiderGrupoProjeto(...)`.
- `routes/grupoprojeto.routes.ts` precisa instanciar e injetar `ConversaGrupoService` (mesmo padrão de `routes/grupotarefa.routes.ts`, que já monta `conversaGrupoService` e passa pro service).

**`backend/services/conversa-permissao.service.ts`**: `#resolverEscolaGUID` hoje resolve `EscolaGUID` só pra Turma (via `turmaDAO`) e Tarefa (join já existente pra `#notificarPromocao`) — precisa de um terceiro branch pra Projeto (`grupoprojeto → projeto → EscolaGUID`), usado tanto pelo fallback de Coordenação/Direção quanto por qualquer notificação futura.

**Migração de dados existentes**: grupos de Projeto já criados antes desta feature **não têm** `conversa_grupo` — não dá pra popular retroativamente sem decisão de produto (criar chat vazio pra grupos antigos? só a partir de agora?). Isso precisa ser decidido antes de implementar — não assumir.

**Frontend**: a página de grupo de projeto (`frontend/app/dashboard/[escolaGUID]/projetos/[projetoGUID]/grupos/[grupoGUID]/page.tsx`) **não tem UI de chat hoje** (nunca teve, por ser fora do escopo v1) — precisa da UI de mensagens em si (lista, input, etc.), não só o botão de personalização/permissões que as outras páginas (Turma/Tarefa) já reusam. Verificar se dá pra reaproveitar o componente de chat existente (usado em Turma/Tarefa) generalizando por `ConversaGUID`, em vez de duplicar.

---

## 2. Entities & repositories

Padrão: campo privado + getter + setter permissivo (`null` ok; senão valida tipo/formato) + incluído no `toJSON()`/mapper; parse defensivo de JSON no mapper de linha.

- `backend/entities/conversa-grupo.model.ts` — `#ConversaGrupoCorFundo`, `#ConversaGrupoImagemUrl`.
- `backend/entities/conversa-grupo-membro.model.ts` — `#MembroPermissoes: Record<string, boolean> | null`.
- `backend/entities/usuarioxgrupoprojeto.model.ts` — `MembroPermissoes` na interface.
- `backend/entities/usuarioxgrupotarefa.model.ts` — `MembroPermissoes` na interface + classe entity.
- `backend/entities/grupoprojeto.model.ts` — `GrupoProjetoSubmetidoEm`, `GrupoProjetoSubmetidoPorGUID`.

Repositórios:
- `backend/repositories/conversa-grupo.repository.ts` — `atualizarPersonalizacao(...)`, `findMembro(...)`, `atualizarPermissaoMembro(...)` (merge-then-write).
- `backend/repositories/usuarioxgrupoprojeto.repository.ts` — `atualizarPermissoes(grupoGUID, usuarioGUID, patch)`.
- `backend/repositories/usuarioxgrupotarefa.repository.ts` — `findByGrupoAndUsuario(...)` (novo) + `atualizarPermissoes(...)`.
- `backend/repositories/grupoprojeto.repository.ts` — `update()` estendido com os 2 campos de submissão.
- `backend/repositories/relacaoanexos.repository.ts` — `vincularAnexoGrupoProjeto`, `findAnexosByGrupoProjeto`, branch novo em `delete()`.

Tudo **concluído** (tsc limpo).

---

## 3. Helper de resolução de permissão — `backend/utils/helpers/permissao-granular.helper.ts`

```ts
export type MapaPermissoes = Record<string, boolean> | null | undefined;

export function resolverComOverride(mapa: MapaPermissoes, chave: string, valorDefault: boolean): boolean {
  const explicito = mapa ? mapa[chave] : undefined;
  return typeof explicito === 'boolean' ? explicito : valorDefault;
}

// GrupoProjeto/GrupoTarefa: líder vive fora da tabela pivot — líder sempre pode;
// membro comum só se explicitamente marcado true no JSON.
export function resolverPermissaoGrupoComLiderUnico(
  usuarioGUID: string, liderGUID: string, membroPermissoes: MapaPermissoes, capacidade: string
): boolean {
  if (usuarioGUID === liderGUID) return true;
  return resolverComOverride(membroPermissoes, capacidade, false);
}

// Chat (Turma/Tarefa): default por papel é assimétrico — preservado como default;
// JSON estende a capacidade a qualquer membro.
export function resolverPermissaoChat(
  membroFuncao: 'Membro' | 'Lider' | 'Representante' | 'Vice-Representante' | null,
  membroPermissoes: MapaPermissoes,
  grupoTipo: 'Turma' | 'Tarefa',
  capacidade: 'PodeExcluirMensagens' | 'PodePersonalizarGrupo'
): boolean {
  const defaultPorPapel = grupoTipo === 'Tarefa'
    ? membroFuncao === 'Lider'
    : (membroFuncao === 'Representante' || membroFuncao === 'Vice-Representante');
  return resolverComOverride(membroPermissoes, capacidade, defaultPorPapel);
}
```

### Call sites refatorados

| Arquivo | Check antes | Novo check |
|---|---|---|
| `mensagem.service.ts#deletarMensagem` | role hardcoded | `resolverPermissaoChat(..., 'PodeExcluirMensagens')` |
| `mensagem.service.ts` fixar/desafixar | role hardcoded | **sem mudança** (não pedido como delegável) |
| `grupoprojeto.service.ts#atualizarGrupo` | `UsuarioGUIDLider !== usuarioGUID` | `resolverPermissaoGrupoComLiderUnico(..., 'PodeAtualizarGrupo')` |
| `grupoprojeto.service.ts#expulsarMembro` (membro comum) | `!ehLider && !ehCriadorDoProjeto` | + OR `resolverPermissaoGrupoComLiderUnico(..., 'PodeExpulsarMembros')` — expulsar o próprio líder continua exclusivo do criador do projeto |
| `grupoprojeto.service.ts#transferirLideranca` | líder-only | **sem mudança** (excluído da delegação) |
| `grupotarefa.service.ts#atualizarNomeGrupo` | líder-only | `resolverPermissaoGrupoComLiderUnico(..., 'PodeAtualizarGrupo')` |
| `grupotarefa.service.ts#expulsarMembro` | líder-only | `resolverPermissaoGrupoComLiderUnico(..., 'PodeExpulsarMembros')` |
| `grupotarefa.service.ts#transferirLideranca` | líder-only | **sem mudança** |

Tudo **concluído** (tsc limpo).

---

## 4. Endpoints

### 4a. Personalização do grupo de chat (Turma e Tarefa) — **concluído**
- `PUT /api/conversa/:guid/personalizacao` — multipart (`uploadCapaMiddleware.single("imagem")` + `handleMulterError`), body `nome?`, `cor?`.
- `ConversaController.atualizarPersonalizacao` → `ConversaPermissaoService.atualizarPersonalizacao(...)`.
- Gate: `#assertPermissaoPersonalizarGrupo` — `resolverPermissaoChat(..., 'PodePersonalizarGrupo')`, fallback Coordenação/Direção via `escolaFuncaoDAO.isCoordOuDirecaoEmEscola` (resolvendo `EscolaGUID` pra Turma e Tarefa através de `#resolverEscolaGUID`, compartilhado com `#notificarPromocao`).
- Upload: mesmo bloco de `turma.service.ts#atualizarCapa` (R2 + `extrairCorDominante` fallback).
- Emite `SocketServer.emit(conversaGUID, 'grupo_personalizado', {...})`.

~~Grupo de Projeto não tem chat — nada a construir aqui pra Projeto.~~ **(revertido — ver seção 1b)**. Uma vez que Projeto ganhe `conversa_grupo`, os endpoints 4a/4b já servem Projeto de graça (são genéricos por `ConversaGUID`, não fazem `if` por tipo) — só falta a UI de chat em si na página de grupo de projeto (ver seção 1b, "Frontend").

### 4b. Conceder permissão a um membro do chat — **concluído**
- `PATCH /api/conversa/:guid/permissao/membro/:usuarioGUID`.
- Gate: reusa `#assertRepresentanteOuLider` (mais estrito que o de personalização — membro delegado nunca concede pra outro).

### 4c. Conceder permissão a um membro do grupoprojeto — **concluído**
- `PATCH /api/grupoprojeto/:grupoGUID/membros/:membroGUID/permissoes` — só o líder concede.

### 4d. Conceder permissão a um membro do grupotarefa — **concluído**
- `PATCH /api/grupotarefa/:grupoGUID/membros/:membroGUID/permissoes` — mesma forma de 4c, sem `PodeSubmeterProjeto`.

### 4e. Submissão de projeto (feature nova) — **pendente**
Mecânica mínima, espelhando `TarefaAcademicaService.enviarAnexoEntrega`: entrega = um ou mais `anexo` já enviados, vinculados via `relacaoanexosgrupoprojeto`; "submetido" = `GrupoProjetoSubmetidoEm IS NOT NULL`.

- `POST /api/grupoprojeto/:grupoGUID/submissao/anexo` — body `{ AnexoGUID }`. Service `vincularAnexoSubmissao`:
  1. Gate: `resolverPermissaoGrupoComLiderUnico(..., 'PodeSubmeterProjeto')`.
  2. Valida dono do anexo (`anexo.UsuarioGUID !== atorGUID` → 403).
  3. Bloqueia se já submetido.
  4. `relacaoAnexosDAO.vincularAnexoGrupoProjeto(...)`.
- `POST /api/grupoprojeto/:grupoGUID/submeter` — sem body. Service `submeterProjeto`:
  1. Mesmo gate de permissão.
  2. `projeto.ProjetoStatus === 'Encerrado'` → 400.
  3. `projeto.ProjetoEntregaPrazoData` no passado → 400.
  4. Exige ao menos 1 anexo vinculado → senão 400.
  5. `grupoProjetoDAO.update(grupoGUID, { GrupoProjetoSubmetidoEm: new Date(), GrupoProjetoSubmetidoPorGUID: atorGUID })`.
  6. `historicoService.registrar({ HistoricoTipo: 'Submissao', ... })`.
  7. Notifica o criador do projeto (padrão de `#notificarRemovidoGrupo`), com `link` pro grupo.
- Middleware: `validateVincularAnexoBody` em `grupoprojeto.middleware.ts`.
- **Fora do escopo desta rodada**: endpoint de "desfazer submissão".

---

## 5. Frontend — **pendente**

### 5a. `GerenciarGrupoModal.tsx`
- Seção "Personalizar grupo" (nome + cor + upload de foto), visível via `MinhasPermissoes` no `GET /api/conversa/:guid`.
- UI "Permissões do membro" — 2 checkboxes (`PodeExcluirMensagens`, `PodePersonalizarGrupo`), visível só quando `souRepresentante || souLiderTarefa`.

### 5b. Páginas de grupo de projeto/tarefa
- `frontend/app/dashboard/[escolaGUID]/projetos/[projetoGUID]/grupos/[grupoGUID]/page.tsx` — 3 checkboxes (expulsar/atualizar/submeter) só quando `souLider`; painel "Submeter projeto" (upload via `/api/anexo` → `.../submissao/anexo` → `.../submeter`), escondido/desabilitado quando já submetido.
- `frontend/app/dashboard/[escolaGUID]/tarefas/[tarefaGUID]/page.tsx` — 2 checkboxes (expulsar/atualizar), sem submissão.

### 5c. API clients
- `frontend/lib/api/conversa.api.ts` — `atualizarPersonalizacaoGrupo`, `atualizarPermissaoMembro`.
- `frontend/lib/api/grupoprojeto.api.ts` — `atualizarPermissaoMembro`, `vincularAnexoSubmissao`, `submeterProjeto`.
- `frontend/lib/api/grupotarefa.api.ts` — `atualizarPermissaoMembro`.

---

## 6. Verificação (produção, sem banco de dev) — **pendente**

Sequência manual ponta a ponta (produção, turma/projeto real ou de teste):
1. Como Representante: trocar nome/cor/foto do grupo, confirmar refletido em `GET /api/conversa/:guid`. Conceder `PodeExcluirMensagens: true` a um Membro comum.
2. Como esse Membro: confirmar que consegue apagar mensagem de outra pessoa (antes 403); confirmar 403 ao tentar `PATCH .../permissao/membro/:x`.
3. Como Membro diferente sem a concessão: confirmar 403 continua valendo.
4. Revogar (`false` explícito) e confirmar bloqueio de novo.
5. Repetir o roteiro pra `grupoprojeto`: delegar `PodeAtualizarGrupo`, confirmar `PATCH /api/grupoprojeto/:grupoGUID` funciona pro delegado e 403 pro não-delegado; confirmar `transferir-lider` continua 403 pra todos exceto o líder mesmo com as 3 flags true.
6. Fluxo de submissão: enviar anexo de teste, vincular, `.../submeter` popula `GrupoProjetoSubmetidoEm` e notifica o criador (com link certo). Testar com prazo no passado / projeto encerrado → 400.
7. `npx tsc --noEmit -p .` (backend) e `cd frontend && npx tsc --noEmit -p .` — 0 erros.

---

## Arquivos críticos

- `backend/database/migrations/2026-08-21-permissoes-granulares-grupos.ts`
- `backend/database/migrations/2026-08-XX-chat-grupoprojeto.ts` (novo, seção 1b — não iniciado)
- `backend/utils/helpers/permissao-granular.helper.ts`
- `backend/services/conversa-permissao.service.ts`, `mensagem.service.ts`, `grupoprojeto.service.ts`, `grupotarefa.service.ts`, `conversa-grupo.service.ts`
- `backend/entities/conversa-grupo.model.ts`
- `backend/repositories/conversa-grupo.repository.ts`, `usuarioxgrupoprojeto.repository.ts`, `usuarioxgrupotarefa.repository.ts`, `relacaoanexos.repository.ts`
- `routes/conversa.routes.ts`, `routes/grupoprojeto.routes.ts`, `routes/grupotarefa.routes.ts`
- `frontend/app/dashboard/[escolaGUID]/chat/GerenciarGrupoModal.tsx`
- `frontend/app/dashboard/[escolaGUID]/projetos/[projetoGUID]/grupos/[grupoGUID]/page.tsx` (precisa ganhar UI de chat — ver 1b)
- `frontend/app/dashboard/[escolaGUID]/tarefas/[tarefaGUID]/page.tsx`
- `frontend/lib/api/conversa.api.ts`, `grupoprojeto.api.ts`, `grupotarefa.api.ts`

---

## Progresso (retomar por aqui)

- [x] #19 Migration — rodada e verificada em produção.
- [x] #20 Entities + repositories.
- [x] #21 Helper de resolução de permissão granular.
- [x] #22 Endpoints: personalização + permissão de membro (chat).
- [x] #23 Endpoints: permissão de membro (grupoprojeto/grupotarefa) — controller + rota de `grupotarefa` fechados por último; `tsc --noEmit` limpo.
- [ ] **#24 Endpoints: submissão de projeto** ← próximo passo. Seção 4e acima: `vincularAnexoSubmissao` + `submeterProjeto` em `grupoprojeto.service.ts`, controller, rotas `POST /:grupoGUID/submissao/anexo` e `POST /:grupoGUID/submeter`, `validateVincularAnexoBody` no middleware.
- [ ] #25 Frontend: `GerenciarGrupoModal` (personalização + permissões).
- [ ] #26 Frontend: páginas de grupoprojeto/grupotarefa (toggles + painel de submissão).
- [ ] #27 Frontend: API clients novos.
- [ ] #28 Verificação final (tsc backend+frontend, checks read-only, teste manual ponta a ponta).
- [ ] **#29 Grupo de Projeto ganha chat associado** — mudança de escopo pedida em 2026-08-21, reverte a decisão original de v1. Ver seção 1b (migration do enum `ConversaGrupoTipo`, entity, helper, `conversa-grupo.service.ts`, integração em `grupoprojeto.service.ts`, decisão de produto sobre grupos já existentes, UI de chat na página de grupo de projeto). **Ainda não iniciado, nem sequer o design técnico foi validado com o usuário** — só documentado o que precisa mudar.

Nada foi commitado ainda (só commit quando pedido explicitamente).
