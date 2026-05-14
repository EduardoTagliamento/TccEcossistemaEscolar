# Planejamento: Tarefas, Matérias (Provas) e Pendências

**Data:** 13 de Maio de 2026  
**Status:** Estrutura definida e documentada  
**Escopo:** Sistema de avisos, tarefas acadêmicas e lembretes administrativos

**Base técnica adotada:** Este documento deve seguir a logica definida em [docs/plano-tecnico-tarefas-calendario-notificacoes.md](docs/plano-tecnico-tarefas-calendario-notificacoes.md), especialmente para calendario, job diario de lembretes e trilha de notificacoes.

### Logica de implementacao adotada (documento base)

1. Toda tarefa criada com prazo valido deve aparecer no calendario.
2. Um job diario verifica tarefas que vencem no dia seguinte.
3. Alunos vinculados a turma/disciplina recebem lembrete por e-mail e WhatsApp.
4. Cada envio deve ser registrado em log por aluno e por canal, com status de sucesso/falha.
5. O sistema deve evitar duplicidade de notificacao para o mesmo par tarefa + aluno + canal.
6. Canais sao independentes: falha em WhatsApp nao bloqueia envio por e-mail.

---

## 1. Decisão Arquitetural: 4 Tabelas Separadas

### Por que separar?

As quatro entidades possuem **semântica completamente diferente**, apesar de aparecerem na mesma tela (calendário):

| Aspecto | Tarefa Acadêmica | Prova Agendada | Pendência | Evento |
|---------|------------------|----------------|-----------|--------|
| **Conceito** | Aluno PRECISA fazer e ENTREGAR isso até X | Aviso: haverá prova sobre isso em X | Lembrete genérico de obrigação | Aviso: acontecerá X na data Y |
| **Destinatário** | 1 Aluno específico (por Matrícula) | N Alunos (por Turma) | 1 Usuário | N Usuários (segmentado) |
| **Obrigatoriedade** | SIM - entrega é mandatória | NÃO - é apenas aviso | DEPENDE do tipo | NÃO - apenas informativo |
| **Rastreamento** | Entrega, nota, realização | Data da ocorrência | Resolução simples | Sem rastreamento |
| **Campos principais** | Conteúdo, prazo, arquivo entregue | Matéria, data da prova | Título, conteúdo genérico | Título, data do evento |
| **Espera resposta?** | SIM (anexo ou marcação) | NÃO | SIM (resolução) | NÃO |
| **Quem cria** | Professor | Professor | Coordenação/Direção | Secretaria/Direção |

**Benefícios da separação:**
- ✅ Sem campos `NULL` desnecessários
- ✅ Lógica clara (sem `if/else` por tipo)
- ✅ Permissões e workflows diferentes por entidade
- ✅ Evoluição independente (ex: prova ganha "sala", tarefa ganha "rubrica")
- ✅ Queries no calendário via `UNION` (simples e performático)

---

## 2. Definição das Tabelas

### 2.1 Tabela: `tarefaacademica`

**Propósito:** Representar tarefas obrigatórias entregáveis por alunos

```sql
CREATE TABLE tarefaacademica (
  TarefaGUID UUID PRIMARY KEY,
  MatriculaGUID UUID NOT NULL,                    -- Aluno específico que recebeu
  matXprofXturxescGUID UUID NOT NULL,             -- Professor + Matéria + Turma + Escola
  TarefaTitulo VARCHAR(128) NOT NULL,             -- Ex: "Atividade de Logaritmo"
  TarefaConteudo VARCHAR(1024),                   -- Descrição/enunciado
  TarefaPostagemData DATETIME NOT NULL,           -- Quando foi publicada
  TarefaPrazoData DATETIME NOT NULL,              -- Até quando deve entregar
  TarefaTipoEntrega ENUM('digital', 'fisica') NOT NULL, -- Como entregar
  TarefaFeito BOOLEAN DEFAULT FALSE,              -- Indicador: tarefa já foi realizada pelo aluno
  TarefaRealizacaoData DATETIME,                  -- Timestamp de quando foi marcada como feita
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (MatriculaGUID) REFERENCES matricula(MatriculaGUID),
  FOREIGN KEY (matXprofXturxescGUID) REFERENCES materiaxprofessorxturma(matXprofXturxescGUID),
  INDEX idx_matricula (MatriculaGUID),
  INDEX idx_prazo (TarefaPrazoData),
  INDEX idx_feito (TarefaFeito),
  INDEX idx_tipo_entrega (TarefaTipoEntrega)
);
```

**Fluxo de vida:**

1. Professor cria tarefa com `TarefaPostagemData = NOW()` e define `TarefaTipoEntrega`
2. Aluno recebe notificação
3. Aluno realiza a tarefa (conforme tipo: anexa arquivo ou faz presencialmente)
4. Aluno **OU professor** marca como `TarefaFeito = TRUE` para indicar "tarefa pronta"
5. Campo serve para **orientar o aluno** sobre quais tarefas ainda falta fazer
6. **Não é rastreador de entrega**: apenas booleano para filtros/lista de atividades

**Importante:** `TarefaFeito` não garante entrega real. É um indicador visual no calendário do aluno.

---

### 2.2 Tabela: `provaagendada`

**Propósito:** Avisar alunos sobre provas vindouras (sem obrigação de "fazer")

```sql
CREATE TABLE provaagendada (
  ProvaAgendadaGUID UUID PRIMARY KEY,
  TurmaGUID UUID NOT NULL,                        -- Prova é pra TURMA, não aluno individual
  MateriaGUID UUID NOT NULL,                      -- Que matéria será cobrada
  ProvaData DATETIME NOT NULL,                    -- Quando a prova acontece
  ProvaDescricao VARCHAR(1024),                   -- Conteúdo a estudar / tópicos
  ProvaStatus ENUM('Agendada', 'Realizada', 'Cancelada') DEFAULT 'Agendada',
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (TurmaGUID) REFERENCES turma(TurmaGUID),
  FOREIGN KEY (MateriaGUID) REFERENCES materia(MateriaGUID),
  INDEX idx_data (ProvaData),
  INDEX idx_status (ProvaStatus),
  INDEX idx_turma (TurmaGUID)
);
```

**Fluxo de vida:**
1. Professor agenda prova com `ProvaStatus = 'Agendada'`
2. Todos os alunos da turma recebem aviso
3. Alunos estudam conforme `ProvaDescricao`
4. Professor muda para `ProvaStatus = 'Realizada'` ou `'Cancelada'`
5. Sistema remove do calendário ou marca como histórico

**Permissões:**
- Professor (matéria): criar, editar, visualizar, cancelar
- Aluno (turma): visualizar
- Coordenação/Direção: visualizar todas

---

### 2.3 Tabela: `pendencia`

**Propósito:** Lembrete genérico de obrigações administrativas ou pedagógicas

```sql
CREATE TABLE pendencia (
  PendenciaGUID UUID PRIMARY KEY,
  UsuarioCPF VARCHAR(14) NOT NULL,                -- Quem recebe o lembrete
  EscolaGUID UUID NOT NULL,                       -- Contexto da escola
  PendenciaTitulo VARCHAR(128) NOT NULL,          -- Ex: "Enviar notas até sexta"
  PendenciaConteudo VARCHAR(1024),                -- Detalhes adicionais
  PendenciaPostagemData DATETIME NOT NULL,        -- Quando foi criada
  PendenciaPrazoData DATETIME NOT NULL,           -- Até quando deve resolver
  PendenciaFeito BOOLEAN DEFAULT FALSE,           -- Foi resolvida
  PendenciaRealizacaoData DATETIME,               -- Quando resolveu
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (UsuarioCPF) REFERENCES usuario(UsuarioCPF),
  FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID),
  INDEX idx_usuario (UsuarioCPF),
  INDEX idx_prazo (PendenciaPrazoData),
  INDEX idx_feito (PendenciaFeito),
  INDEX idx_escola (EscolaGUID)
);
```

**Fluxo de vida:**
1. Coordenador/Diretor cria pendência para um usuário (opcionalmente com arquivo anexado)
2. Usuário recebe notificação
3. Usuário pode responder enviando anexo(s) como comprovação/resposta
4. Usuário marca como resolvida (`PendenciaFeito = TRUE`)
5. Pendência sai do calendário ativo

**Exemplos de pendências:**
- "Professor: enviar notas da prova até 13/05" (pode enviar arquivo com notas)
- "Aluno: apresentar atestado médico até 15/05" (aluno envia atestado.pdf)
- "Coordenador: aprovar orçamento até 20/05" (coordenador envia orçamento_aprovado.pdf)
- "Aluno: corrigir prova e reenviar até 20/05" (prof envia feedback.pdf → aluno resubmete prova_corrigida.pdf)

**Permissões:**
- Coordenação/Direção: criar, editar, visualizar todas, deletar, enviar anexos (enunciado)
- Aluno/Professor: visualizar suas, marcar como feita, **enviar anexos como resposta/comprovação**
- Autores de pendências: editar sua própria

---

### 2.4 Tabela: `evento`

**Propósito:** Avisar sobre eventos gerais da escola (sem expectativa de resposta)

```sql
CREATE TABLE evento (
  EventoGUID UUID PRIMARY KEY,
  EscolaGUID UUID NOT NULL,                       -- Escola onde acontece
  UsuarioCPF VARCHAR(14) NOT NULL,                -- Quem criou (secretaria/direção)
  EventoTitulo VARCHAR(128) NOT NULL,             -- Ex: "Festa Junina 2026"
  EventoConteudo VARCHAR(1024),                   -- Detalhes/descrição
  EventoDataHora DATETIME NOT NULL,               -- Quando o evento acontece
  EventoStatus ENUM('Agendado', 'Realizado', 'Cancelado') DEFAULT 'Agendado',
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID),
  FOREIGN KEY (UsuarioCPF) REFERENCES usuario(UsuarioCPF),
  INDEX idx_escola (EscolaGUID),
  INDEX idx_data (EventoDataHora),
  INDEX idx_status (EventoStatus)
);
```

**Fluxo de vida:**
1. Secretaria/Direção cria evento com `EventoStatus = 'Agendado'`
2. Define destinatários via `eventodestinatarios` (função, turma ou broadcast)
3. Usuários elegíveis recebem notificação
4. Evento aparece no calendário de quem tem permissão
5. Após acontecer, status muda para `'Realizado'` ou `'Cancelado'`

**Exemplos de eventos:**
- "Festa Junina - 12/06" (todos da escola)
- "Reunião de Pais - 3º ano - 15/06" (só pais do 3º ano)
- "Workshop de capacitação - 20/06" (só professores)

**Permissões:**
- Secretaria/Direção/Coordenação: criar, editar, visualizar todas, deletar, enviar anexos
- Aluno/Professor: visualizar eventos destinados a eles
- Sem interação: apenas visualização, sem resposta esperada

---

### 2.5 Tabela: `eventodestinatarios` (Segmentação)

**Propósito:** Definir quem pode ver cada evento (controle de audiência)

```sql
CREATE TABLE eventodestinatarios (
  EventoDestinatarioGUID UUID PRIMARY KEY,
  EventoGUID UUID NOT NULL,
  FuncaoId INT,                                   -- NULL = todos; 4 = alunos; 5 = professores
  TurmaGUID UUID,                                 -- NULL = todas; específico para filtrar
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (EventoGUID) REFERENCES evento(EventoGUID) ON DELETE CASCADE,
  FOREIGN KEY (FuncaoId) REFERENCES funcao(FuncaoId),
  FOREIGN KEY (TurmaGUID) REFERENCES turma(TurmaGUID),
  INDEX idx_evento (EventoGUID),
  INDEX idx_funcao (FuncaoId),
  INDEX idx_turma (TurmaGUID)
);
```

**Regras de visibilidade:**

| Cenário | FuncaoId | TurmaGUID | Quem vê |
|---------|----------|-----------|---------|
| Broadcast | NULL | NULL | **Todos** da escola |
| Só alunos | 4 | NULL | Todos os alunos |
| Alunos do 3º ano | 4 | {turma-3ano-guid} | Alunos matriculados no 3º ano |
| Só professores | 5 | NULL | Todos os professores |
| Coordenação | 1 | NULL | Apenas coordenadores |

**Workflow exemplo:**
```
Evento: "Festa Junina"
└─ Destinatário: FuncaoId = NULL, TurmaGUID = NULL
   → Todos veem (broadcast)

Evento: "Reunião de Pais - 3º ano"
└─ Destinatário 1: FuncaoId = 4, TurmaGUID = {3ano}  (alunos do 3º)
└─ Destinatário 2: FuncaoId = NULL, TurmaGUID = {3ano}  (responsáveis/pais)
   → Apenas turma específica
```

**Query para descobrir eventos visíveis:**
```sql
SELECT e.* 
FROM evento e
LEFT JOIN eventodestinatarios ed ON e.EventoGUID = ed.EventoGUID
LEFT JOIN escolaxusuarioxfuncao euf ON euf.UsuarioCPF = ?
LEFT JOIN matricula m ON m.MatriculaGUID = ? -- se for aluno
WHERE e.EscolaGUID = ?
  AND (
    -- Broadcast (sem destinatários específicos)
    ed.EventoDestinatarioGUID IS NULL
    OR
    -- Por função
    (ed.FuncaoId = euf.FuncaoId AND ed.TurmaGUID IS NULL)
    OR
    -- Por turma
    (ed.TurmaGUID = m.TurmaGUID)
  )
```

---

## 3. Tabelas Auxiliares

### 3.1 Tabela: `anexo`

**Propósito:** Armazenar metadados de arquivos enviados (não o arquivo em si)

```sql
CREATE TABLE anexo (
  AnexoGUID UUID PRIMARY KEY,
  UsuarioCPF VARCHAR(14) NOT NULL,                -- Quem enviou (tipo descoberto via escolaxusuarioxfuncao)
  EscolaGUID UUID NOT NULL,                       -- Contexto
  AnexoCaminho VARCHAR(500) NOT NULL,             -- Caminho no disco: /uploads/anexos/{GUID}.{ext}
  AnexoNomeOriginal VARCHAR(255),                 -- Nome original: "trabalho.pdf"
  AnexoTamanho INT,                               -- Tamanho em bytes
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (UsuarioCPF) REFERENCES usuario(UsuarioCPF),
  FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID),
  INDEX idx_usuario (UsuarioCPF),
  INDEX idx_escola (EscolaGUID)
);
```

**Armazenamento físico:**
```
/uploads/anexos/
  ├── {UUID-1}.pdf
  ├── {UUID-2}.docx
  └── {UUID-3}.png
```

---

### 3.2 Tabelas de Relação: Anexos por Entidade

**Propósito:** Vincular N anexos a cada tipo de entidade com semântica específica

**Decisão arquitetural:** Tabelas separadas (não tabela única) para:
- ✅ Eliminar NULLs (todas FKs são NOT NULL)
- ✅ Diferenciar anexos de descrição vs entrega (campo `AnexoTipo`)
- ✅ Performance (índices otimizados por entidade)
- ✅ Permitir campos específicos por contexto

#### 3.2.1 Tabela: `relacaoanexostarefa`

**Propósito:** Vincular anexos a tarefas (bidirecionais: descrição + entrega)

```sql
CREATE TABLE relacaoanexostarefa (
  RelacaoAnexoTarefaGUID UUID PRIMARY KEY,
  AnexoGUID UUID NOT NULL,
  TarefaGUID UUID NOT NULL,                       -- NOT NULL!
  AnexoTipo ENUM('descricao', 'entrega') NOT NULL, -- Diferencia professor vs aluno
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (AnexoGUID) REFERENCES anexo(AnexoGUID) ON DELETE CASCADE,
  FOREIGN KEY (TarefaGUID) REFERENCES tarefaacademica(TarefaGUID) ON DELETE CASCADE,
  INDEX idx_tarefa (TarefaGUID),
  INDEX idx_anexo (AnexoGUID),
  INDEX idx_tipo (AnexoTipo)
);
```

**Regra de uso:**
- `AnexoTipo = 'descricao'`: Professor envia enunciado/material
- `AnexoTipo = 'entrega'`: Aluno envia trabalho/resposta

---

#### 3.2.2 Tabela: `relacaoanexospendencia`

**Propósito:** Vincular anexos a pendências (bidirecionais: descrição + entrega)

```sql
CREATE TABLE relacaoanexospendencia (
  RelacaoAnexoPendenciaGUID UUID PRIMARY KEY,
  AnexoGUID UUID NOT NULL,
  PendenciaGUID UUID NOT NULL,                    -- NOT NULL!
  AnexoTipo ENUM('descricao', 'entrega') NOT NULL, -- Diferencia solicitante vs respondente
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (AnexoGUID) REFERENCES anexo(AnexoGUID) ON DELETE CASCADE,
  FOREIGN KEY (PendenciaGUID) REFERENCES pendencia(PendenciaGUID) ON DELETE CASCADE,
  INDEX idx_pendencia (PendenciaGUID),
  INDEX idx_anexo (AnexoGUID),
  INDEX idx_tipo (AnexoTipo)
);
```

**Regra de uso:**
- `AnexoTipo = 'descricao'`: Coordenação/Admin envia modelo/instrução
- `AnexoTipo = 'entrega'`: Usuário envia comprovante/evidência

---

#### 3.2.3 Tabela: `relacaoanexosevento`

**Propósito:** Vincular anexos a eventos (unidirecionais: apenas descrição)

```sql
CREATE TABLE relacaoanexosevento (
  RelacaoAnexoEventoGUID UUID PRIMARY KEY,
  AnexoGUID UUID NOT NULL,
  EventoGUID UUID NOT NULL,                       -- NOT NULL!
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (AnexoGUID) REFERENCES anexo(AnexoGUID) ON DELETE CASCADE,
  FOREIGN KEY (EventoGUID) REFERENCES evento(EventoGUID) ON DELETE CASCADE,
  INDEX idx_evento (EventoGUID),
  INDEX idx_anexo (AnexoGUID)
);
```

**Observação:** Sem campo `AnexoTipo` - eventos **não** esperam resposta, apenas visualização.

---

#### 3.2.4 Tabela: `relacaoanexosprova`

**Propósito:** Vincular anexos a provas agendadas (unidirecionais: apenas descrição)

```sql
CREATE TABLE relacaoanexosprova (
  RelacaoAnexoProvaGUID UUID PRIMARY KEY,
  AnexoGUID UUID NOT NULL,
  ProvaAgendadaGUID UUID NOT NULL,                -- NOT NULL!
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (AnexoGUID) REFERENCES anexo(AnexoGUID) ON DELETE CASCADE,
  FOREIGN KEY (ProvaAgendadaGUID) REFERENCES provaagendada(ProvaAgendadaGUID) ON DELETE CASCADE,
  INDEX idx_prova (ProvaAgendadaGUID),
  INDEX idx_anexo (AnexoGUID)
);
```

**Observação:** Provas não esperam entrega, apenas visualização de conteúdo - sem `AnexoTipo`.

**Exemplos de uso:**
- Professor anexa PDF com "Conteúdo da Prova de História"
- Professor envia lista de tópicos em DOCX
- Alunos da turma visualizam o material antes da prova
```

**Fluxo de anexos por entidade:**

**Tarefa Acadêmica (bidirecional):**
1. Professor cria tarefa → envia `enunciado.pdf`
   - INSERT INTO `relacaoanexostarefa` com `AnexoTipo = 'descricao'`
2. Aluno vê tarefa → baixa enunciado
3. Aluno envia `resposta.pdf`
   - INSERT INTO `relacaoanexostarefa` com `AnexoTipo = 'entrega'`
4. Professor vê ambos anexos diferenciados por tipo

**Prova Agendada (unidirecional):**
1. Professor agenda prova → envia `conteudo_prova.pdf`
   - INSERT INTO `relacaoanexosprova` (sem campo `AnexoTipo`)
2. Alunos da turma veem prova → baixam anexo (sem resposta esperada)

**Pendência (bidirecional):**
1. Coordenação cria pendência → envia `modelo.docx`
   - INSERT INTO `relacaoanexospendencia` com `AnexoTipo = 'descricao'`
2. Usuário vê pendência → baixa modelo
3. Usuário envia `comprovante.pdf`
   - INSERT INTO `relacaoanexospendencia` com `AnexoTipo = 'entrega'`
4. Ambos ficam vinculados e diferenciados por tipo

**Evento (unidirecional):**
1. Secretaria cria evento → envia `cartaz.png`, `programa.pdf`
   - INSERT INTO `relacaoanexosevento` (sem campo `AnexoTipo`)
2. Destinatários veem evento → baixam anexos (sem resposta esperada)

**Observações importantes:**
- **Eventos e Provas:** Apenas descrição (sem `AnexoTipo`, sem entrega)
- **Tarefas e Pendências:** `AnexoTipo` diferencia descrição vs entrega
- Tipo de usuário descoberto via `UsuarioCPF` + `escolaxusuarioxfuncao`
- **Material didático:** Será implementado futuramente (fora do calendário)

**Diferenciação de anexos por tipo de entidade:**

| Aspecto | Tarefa | Prova | Pendência | Evento |
|---------|--------|-------|-----------|--------|
| **AnexoTipo** | ✅ 'descricao'/'entrega' | ❌ Sem campo | ✅ 'descricao'/'entrega' | ❌ Sem campo |
| **Bidirecional** | ✅ Professor envia + Aluno responde | ❌ Só visualização | ✅ Admin envia + Usuário comprova | ❌ Só visualização |
| **Visibilidade** | Aluno específico | Turma inteira | Usuário específico | Segmentado (FuncaoId/TurmaGUID) |
| **Exemplo** | `enunciado.pdf` + `trabalho.pdf` | `conteudo_prova.pdf` | `modelo.docx` + `atestado.pdf` | `cartaz.png` |

**Exemplos práticos por entidade:**

| Entidade | Anexos de Descrição | Anexos de Entrega |
|----------|---------------------|-------------------|
| **Tarefa** | Professor envia `enunciado.pdf` | Aluno envia `trabalho.pdf` |
| **Prova** | Professor envia `conteudo_prova.pdf` | ❌ Não há entrega |
| **Pendência** | Coordenação envia `modelo.docx` | Usuário envia `comprovante.pdf` |
| **Evento** | Secretaria envia `cartaz.png` | ❌ Não há entrega |

---

### 3.3 Exemplos de Workflows Completos

**Workflow 1: Tarefa com anexos bidirecionais**

```
Dia 01/05 - Professor cria tarefa:
  TarefaGUID: tarefa-123
  Titulo: "Trabalho sobre Revolução Francesa"
  Prazo: 15/05/2026
  
  └─ Envia arquivo de descrição:
     INSERT INTO anexo (AnexoGUID, UsuarioCPF, EscolaGUID, AnexoCaminho, AnexoNomeOriginal)
     VALUES ('anexo-abc', 'prof-cpf', 'escola-1', '/uploads/anexos/abc.pdf', 'enunciado.pdf');
     
     INSERT INTO relacaoanexostarefa (RelacaoAnexoTarefaGUID, AnexoGUID, TarefaGUID, AnexoTipo)
     VALUES ('rel-1', 'anexo-abc', 'tarefa-123', 'descricao');

Dia 10/05 - Aluno envia resposta:
  └─ Envia arquivo de entrega:
     INSERT INTO anexo (AnexoGUID, UsuarioCPF, EscolaGUID, AnexoCaminho, AnexoNomeOriginal)
     VALUES ('anexo-xyz', 'aluno-cpf', 'escola-1', '/uploads/anexos/xyz.pdf', 'trabalho.pdf');
     
     INSERT INTO relacaoanexostarefa (RelacaoAnexoTarefaGUID, AnexoGUID, TarefaGUID, AnexoTipo)
     VALUES ('rel-2', 'anexo-xyz', 'tarefa-123', 'entrega');

  └─ Marca como feita:
     UPDATE tarefaacademica SET TarefaFeito = TRUE WHERE TarefaGUID = 'tarefa-123';

Frontend exibe:
  [📚 Tarefa: Trabalho sobre Revolução Francesa]
  Status: ✅ Feita
  
  Arquivos de Descrição (AnexoTipo = 'descricao'):
  - 📄 [Prof. João] enunciado.pdf (01/05 às 14h)
  
  Arquivos de Entrega (AnexoTipo = 'entrega'):
  - 📄 [Aluno Maria] trabalho.pdf (10/05 às 20h)
```

**Workflow 2: Matéria com material didático**

```
Dia 01/03 - Professor disponibiliza apostila:
  MateriaGUID: mat-matematica
  
  └─ Envia material didático:
     INSERT INTO anexo (AnexoGUID, UsuarioCPF, EscolaGUID, AnexoCaminho, AnexoNomeOriginal)
     VALUES ('anexo-apostila', 'prof-cpf', 'escola-1', '/uploads/anexos/apostila.pdf', 'apostila_funcoes.pdf');
     
     INSERT INTO relacaoanexosmateria (RelacaoAnexoMateriaGUID, AnexoGUID, MateriaGUID)
     VALUES ('rel-mat-1', 'anexo-apostila', 'mat-matematica');

Durante todo o ano:
  - Alunos matriculados em Matemática veem anexo na página da matéria
  - Material fica disponível independente de tarefas específicas
  - Professor pode adicionar mais anexos (slides, exercícios, vídeos)

Query de acesso:
  SELECT a.* 
  FROM anexo a
  JOIN relacaoanexosmateria ram ON a.AnexoGUID = ram.AnexoGUID
  WHERE ram.MateriaGUID = 'mat-matematica'
  ORDER BY a.CreatedAt DESC;
```

**Workflow 3: Pendência com evidência**

```
Dia 05/06 - Coordenação cria pendência:
  PendenciaGUID: pend-123
  Titulo: "Justificar ausência de 03/06"
  UsuarioCPF: aluno-cpf
  Prazo: 10/06/2026
  
  (Sem anexo de descrição, apenas texto)

Dia 07/06 - Aluno responde:
  └─ Envia comprovante:
     INSERT INTO anexo (AnexoGUID, UsuarioCPF, EscolaGUID, AnexoCaminho, AnexoNomeOriginal)
     VALUES ('anexo-atestado', 'aluno-cpf', 'escola-1', '/uploads/atestado.pdf', 'atestado_medico.pdf');
     
     INSERT INTO relacaoanexospendencia (RelacaoAnexoPendenciaGUID, AnexoGUID, PendenciaGUID, AnexoTipo)
     VALUES ('rel-3', 'anexo-atestado', 'pend-123', 'entrega');
     
  └─ Marca como resolvida:
     UPDATE pendencia SET PendenciaFeito = TRUE, PendenciaRealizacaoData = '2026-06-07' 
     WHERE PendenciaGUID = 'pend-123';

Frontend exibe:
  [📋 Pendência: Justificar ausência de 03/06]
  Status: ✅ Resolvida em 07/06
  
  Arquivos:
  - 📄 [Aluno João] atestado_medico.pdf (07/06 às 10h)
```

---

### 3.4 Uso de Segmentação em Eventos

Eventos podem ser direcionados a grupos específicos através da tabela `eventodestinatarios`, permitindo controle fino de audiência.

**Workflow Exemplo 1: Evento Broadcast (todos veem)**

```
Dia 01/06 - Secretaria cria evento:
  EventoGUID: evt-abc
  Titulo: "Festa Junina"
  Data: 12/06/2026 às 19h
  Conteúdo: "Venha participar da tradicional festa junina!"
  
  └─ Anexo: cartaz_festa.png
  
  └─ Destinatários: (nenhum registro em eventodestinatarios)
     → Broadcast: TODOS da escola veem

Frontend exibe para:
  - Alunos ✅
  - Professores ✅
  - Coordenação ✅
  - Pais/Responsáveis ✅
  - Todos os usuários da escola
```

**Workflow Exemplo 2: Evento Segmentado (só professores)**

```
Dia 05/06 - Direção cria evento:
  EventoGUID: evt-xyz
  Titulo: "Workshop: Metodologias Ativas"
  Data: 20/06/2026 às 14h
  Conteúdo: "Capacitação pedagógica obrigatória"
  
  └─ Anexo: programa_workshop.pdf
  
  └─ Destinatários:
     EventoDestinatarios { FuncaoId: 5, TurmaGUID: NULL }
     → Apenas professores (FuncaoId = 5)

Frontend exibe para:
  - Professores ✅
  - Alunos ❌
  - Coordenação ❌ (a menos que também tenham FuncaoId = 5)
```

**Workflow Exemplo 3: Evento por Turma (reunião de pais)**

```
Dia 10/06 - Coordenação cria evento:
  EventoGUID: evt-reuniao
  Titulo: "Reunião de Pais - 3º Ano A"
  Data: 25/06/2026 às 18h
  Conteúdo: "Discussão sobre desempenho acadêmico"
  
  └─ Anexo: pauta_reuniao.pdf
  
  └─ Destinatários:
     EventoDestinatarios { FuncaoId: 4, TurmaGUID: {3ano-a-guid} }
     → Apenas alunos (FuncaoId = 4) da turma 3º Ano A

Frontend exibe para:
  - Alunos do 3º Ano A ✅
  - Alunos de outras turmas ❌
  - Professores ❌ (exceto se matriculados como "responsáveis")
```

**Workflow Exemplo 4: Múltiplos destinatários**

```
Evento: "Palestra sobre Vestibular"
  
└─ Destinatários:
   1. EventoDestinatarios { FuncaoId: 4, TurmaGUID: {3ano-a} }
   2. EventoDestinatarios { FuncaoId: 4, TurmaGUID: {3ano-b} }
   3. EventoDestinatarios { FuncaoId: 5, TurmaGUID: NULL }
   
   → Alunos do 3º ano A e B + Todos os professores
```

---

## 4. Fluxo Integrado: Calendário

### Query UNION para o calendário

```sql
SELECT 
  'tarefa' as TipoAviso,
  TarefaGUID as AvisoId,
  TarefaPrazoData as DataPrazo,
  TarefaTitulo as Titulo,
  'Tarefa' as Categoria,
  TarefaFeito as Status,
  CreatedAt
FROM tarefaacademica
WHERE TarefaFeito = FALSE
  AND TarefaPrazoData >= CURDATE()
  AND MatriculaGUID = ?  -- Filtro por aluno

UNION ALL

SELECT 
  'prova',
  ProvaAgendadaGUID,
  ProvaData,
  CONCAT(ProvaDescricao, ' - ', NomeDisciplina),
  'Prova',
  IF(ProvaStatus = 'Cancelada', 'Cancelada', 'Agendada'),
  CreatedAt
FROM provaagendada
JOIN materia ON provaagendada.MateriaGUID = materia.MateriaGUID
WHERE ProvaStatus IN ('Agendada', 'Realizada')
  AND ProvaData >= CURDATE()
  AND TurmaGUID IN (SELECT TurmaGUID FROM matricula WHERE MatriculaGUID = ?)

UNION ALL

SELECT 
  'pendencia',
  PendenciaGUID,
  PendenciaPrazoData,
  PendenciaTitulo,
  'Pendência',
  IF(PendenciaFeito, 'Resolvida', 'Pendente'),
  CreatedAt
FROM pendencia
WHERE PendenciaFeito = FALSE
  AND PendenciaPrazoData >= CURDATE()
  AND UsuarioCPF = ?  -- Filtro por usuário

UNION ALL

SELECT 
  'evento',
  EventoGUID,
  EventoDataHora,
  EventoTitulo,
  'Evento',
  EventoStatus,
  CreatedAt
FROM evento
WHERE EventoStatus IN ('Agendado', 'Realizado')
  AND EventoDataHora >= CURDATE()
  AND EventoGUID IN (
    SELECT ed.EventoGUID 
    FROM eventodestinatarios ed
    LEFT JOIN escolaxusuarioxfuncao euf ON euf.UsuarioCPF = ?
    LEFT JOIN matricula m ON m.MatriculaGUID = ?
    WHERE (
      -- Broadcast (sem restrição)
      ed.EventoDestinatarioGUID IS NULL
      OR
      -- Por função
      (ed.FuncaoId = euf.FuncaoId AND ed.TurmaGUID IS NULL)
      OR
      -- Por turma
      (ed.TurmaGUID = m.TurmaGUID)
    )
  )

ORDER BY DataPrazo ASC;
```

**Frontend renderiza tudo com ícones/cores diferentes por tipo:**
- 📝 Tarefa (azul) - obrigatória | Mostra: QtdAnexosDescricao, QtdAnexosEntrega, StatusTexto (Feita/Atrasada/Pendente)
- 📚 Prova (roxo) - apenas aviso | Mostra: QtdAnexosDescricao, matéria
- ⚠️ Pendência (laranja) - cobrança | Mostra: QtdAnexosDescricao, QtdAnexosEntrega, StatusTexto
- 🎉 Evento (verde) - informativo | Mostra: QtdAnexosDescricao

**Campos retornados pela query:**
1. `TipoAviso` - tipo da entidade ('tarefa', 'prova', 'pendencia', 'evento')
2. `AvisoId` - GUID da entidade
3. `DataPrazo` - data de vencimento/realização
4. `Titulo` - título do aviso
5. `Descricao` - conteúdo/detalhes
6. `StatusBoolean` - TRUE/FALSE (apenas tarefa/pendência)
7. `StatusTexto` - 'Feita'/'Atrasada'/'Pendente'/'Agendada'/etc
8. `TipoEntrega` - 'digital'/'fisica' (apenas tarefa)
9. `QtdAnexosDescricao` - contagem de anexos de descrição
10. `QtdAnexosEntrega` - contagem de anexos de entrega
11. `PermiteMarcarFeito` - boolean indicando se pode marcar como feito
12. `PermiteEnviarAnexo` - boolean indicando se pode enviar anexo
13. `IconeTipo` - string para o frontend escolher ícone
14. `CreatedAt` - timestamp de criação

### Comportamento da Interface do Calendário

**Vista Geral do Mês (Calendar Grid):**
- Cada dia mostra **apenas o título** dos avisos marcados
- Usa ícones/cores para diferenciar tipos: 📝 (azul) Tarefa, 📚 (roxo) Prova, ⚠️ (laranja) Pendência, 🎉 (verde) Evento
- Visualização compacta: máximo 3-4 títulos por dia, com indicador "+N mais" se houver excesso

**Ao Clicar no Dia (Modal/Painel de Detalhes):**
- Abre popup/sidebar com **todos os avisos daquele dia**
- Mostra **detalhes completos** de cada aviso:
  - Título + Descrição completa
  - Status (Feita/Atrasada/Pendente para tarefa/pendência)
  - Tipo de entrega (digital/física para tarefas)
  - **Lista de anexos de descrição** (com botão download)
  - **Lista de anexos de entrega** (se aplicável)
  - Botões de ação:
    - ✅ "Marcar como feita" (se `PermiteMarcarFeito = TRUE`)
    - 📎 "Enviar anexo" (se `PermiteEnviarAnexo = TRUE`)
- Agrupa por tipo de aviso (Tarefas → Provas → Pendências → Eventos)

**Exemplo Visual:**

```
Vista Geral:          |  Detalhes ao Clicar (15/05):
                      |
[ Maio 2026 ]         |  📝 Tarefa: Trabalho sobre Revolução Francesa
                      |     Descrição: Elaborar análise crítica...
DOM SEG TER QUA       |     Status: ⏰ Atrasada (prazo era 10/05)
12  13  14  15        |     Anexos: 📄 enunciado.pdf [Download]
    📝      📝📚      |     Ações: [✅ Marcar feita] [📎 Enviar resposta]
        ⚠️            |
                      |  📚 Prova: História - Cap. 4 e 5
                      |     Data: 15/05 às 14h
                      |     Anexos: 📄 conteudo_prova.pdf [Download]
```

**Query de Detalhes do Dia:**
```sql
-- Retorna todos os avisos de um dia específico com detalhes completos
SELECT * FROM (
  -- [mesma UNION query acima]
) AS calendario
WHERE DATE(DataPrazo) = '2026-05-15'
ORDER BY 
  FIELD(TipoAviso, 'tarefa', 'prova', 'pendencia', 'evento'),
  DataPrazo ASC;
```

---

## 5. Permissões por Função

### Professor (FuncaoId = 5)

| Entidade | Criar | Editar | Ler | Deletar |
|----------|-------|--------|-----|--------|
| **Tarefa Acadêmica** | ✅ Suas disciplinas | ✅ Suas | ✅ Suas | ✅ Suas |
| **Prova Agendada** | ✅ Suas disciplinas | ✅ Suas | ✅ Todas da turma | ✅ Suas |
| **Pendência** | ❌ | ✅ Marcar como resolvida, enviar anexos | ✅ Suas | ❌ |
| **Evento** | ❌ | ❌ | ✅ Eventos destinados a ele | ❌ |
| **Anexo (Tarefa/Pendência/Prova)** | ✅ Enviar | - | ✅ | ✅ |

### Aluno (FuncaoId = 4)

| Entidade | Criar | Editar | Ler | Deletar |
|----------|-------|--------|-----|--------|
| **Tarefa Acadêmica** | ❌ | ✅ Marcar como feita | ✅ Suas | ❌ |
| **Prova Agendada** | ❌ | ❌ | ✅ Suas | ❌ |
| **Pendência** | ❌ | ✅ Marcar resolvida, enviar anexos | ✅ Suas | ❌ |
| **Evento** | ❌ | ❌ | ✅ Eventos destinados a ele | ❌ |
| **Anexo (Tarefa/Pendência)** | ✅ Enviar resposta/comprovação | - | ✅ | ❌ |

### Coordenação (FuncaoId = 1) / Direção (FuncaoId = 6) / Secretaria

| Entidade | Criar | Editar | Ler | Deletar |
|----------|-------|--------|-----|--------|
| **Tarefa Acadêmica** | ❌ | ❌ | ❌ **Não aparece no calendário deles** | ❌ |
| **Prova Agendada** | ❌ | ❌ | ❌ **Não aparece no calendário deles** | ❌ |
| **Pendência** | ✅ Todas | ✅ Suas, enviar anexos | ✅ **Apenas suas** (calendário mostra só CPF = ?) | ✅ Suas |
| **Evento** | ✅ Todas | ✅ Suas | ✅ Todas | ✅ Suas |
| **Anexo (Evento/Pendência)** | ✅ Enviar | - | ✅ Todas | ✅ Admin |

---

## 6. Implementação: Stack Sugerida

### Backend (TypeScript + Express)

**Estrutura de pastas:**
```
backend/
├── entities/
│   ├── tarefaacademica.model.ts
│   ├── provaagendada.model.ts
│   ├── pendencia.model.ts
│   ├── evento.model.ts
│   ├── eventodestinatarios.model.ts
│   ├── anexo.model.ts
│   ├── relacaoanexostarefa.model.ts
│   ├── relacaoanexospendencia.model.ts
│   ├── relacaoanexosevento.model.ts
│   └── relacaoanexosprova.model.ts
├── repositories/
│   ├── tarefaacademica.repository.ts
│   ├── provaagendada.repository.ts
│   ├── pendencia.repository.ts
│   ├── evento.repository.ts
│   ├── eventodestinatarios.repository.ts
│   ├── anexo.repository.ts
│   ├── relacaoanexostarefa.repository.ts
│   ├── relacaoanexospendencia.repository.ts
│   ├── relacaoanexosevento.repository.ts
│   └── relacaoanexosprova.repository.ts
├── services/
│   ├── tarefaacademica.service.ts
│   ├── provaagendada.service.ts
│   ├── pendencia.service.ts
│   ├── evento.service.ts
│   └── anexo.service.ts
├── controllers/
│   ├── tarefaacademica.controller.ts
│   ├── provaagendada.controller.ts
│   ├── pendencia.controller.ts
│   ├── evento.controller.ts
│   └── anexo.controller.ts
├── middlewares/
│   ├── tarefaacademica.middleware.ts
│   └── evento.middleware.ts
└── routes/
    ├── calendario.routes.ts (UNION view)
    └── evento.routes.ts
```
│   ├── tarefaacademica.service.ts
│   ├── provaagendada.service.ts
│   ├── pendencia.service.ts
│   └── anexo.service.ts
├── controllers/
│   ├── tarefaacademica.controller.ts
│   ├── provaagendada.controller.ts
│   ├── pendencia.controller.ts
│   └── anexo.controller.ts
├── middlewares/
│   └── tarefaacademica.middleware.ts (etc)
└── routes/
    └── calendario.routes.ts (UNION view)
```

### Frontend (Next.js)

**Componentes:**
```
frontend/app/
├── calendario/
│   ├── page.tsx          -- View principal (UNION query)
│   ├── components/
│   │   ├── TarefaCard.tsx
│   │   ├── ProvaCard.tsx
│   │   ├── PendenciaCard.tsx
│   │   ├── EventoCard.tsx
│   │   └── AnexoViewer.tsx
│   └── page.module.css
├── tarefas/
│   ├── [tarefaGUID]/
│   │   ├── page.tsx      -- Detalhes + anexos
│   │   └── editar/
│   └── criar/
├── eventos/
│   ├── [eventoGUID]/
│   │   └── page.tsx      -- Detalhes + anexos
│   └── criar/            -- Apenas admin/secretaria
└── pendencias/
    └── (similar)
```

---

## 7. Considerações Futuras

### Escalabilidade

1. **Notificações:** Criar tabela `notificacao` que referencia qualquer uma das 4 entidades
2. **Histórico:** Manter registros deletados em `tarefaacademica_deleted`, `evento_deleted` para auditoria
3. **Analytics:** View agregada com contagem de tarefas/eventos por período, taxas de entrega/participação
4. **Integração com email:** Disparar emails via fila (Bull/RabbitMQ) quando próximo do prazo ou evento

### Funcionalidades Adicionais

- **Rubrica/Critérios:** Tabela `rubrica` para avaliar tarefas
- **Feedback:** Tabela `feedback_tarefa` com comentários do professor
- **Retrabalho:** Permitir N submissões de tarefa (versioning)
- **Confirmação de presença:** Adicionar campo em `eventodestinatarios` para confirmar participação em eventos
- **Galeria de fotos:** Anexar fotos pós-evento (ex: fotos da festa junina)
- **Versionamento de material:** Histórico de edições de apostilas (ex: "apostila_v1.pdf", "apostila_v2.pdf")
- **Download em massa:** Permitir aluno baixar todos anexos de uma matéria como ZIP
- **Tags/categorias em anexos:** Classificar material didático (ex: "Apostila", "Exercício", "Slide", "Vídeo-aula")

---

## 8. Resumo de Decisões

| Decisão | Justificativa | Status |
|---------|---------------|--------|
| 4 tabelas separadas (Tarefa, Prova, Pendência, Evento) | Semântica diferente, fluxos diferentes, sem NULLs | ✅ Definido |
| Provas POR TURMA | Avisos genéricos, não individuais | ✅ Definido |
| Pendências genéricas | Aplicável a qualquer função/contexto | ✅ Definido |
| Eventos com segmentação | Controle de audiência via `eventodestinatarios` | ✅ Definido |
| 4 tabelas de relação separadas | `relacaoanexostarefa`, `relacaoanexospendencia`, `relacaoanexosevento`, `relacaoanexosprova` (sem NULLs!) | ✅ Definido |
| Campo `AnexoTipo` em Tarefa/Pendência | Diferencia 'descricao' (professor/admin) vs 'entrega' (aluno/usuário) | ✅ Definido |
| Anexos bidirecionais | Tarefas e Pendências com `AnexoTipo` para descrição + entrega | ✅ Definido |
| Anexos unidirecionais | Eventos e Provas sem `AnexoTipo` (apenas visualização) | ✅ Definido |
| Query por perfil | Aluno/Professor veem tudo; Coordenação vê apenas suas pendências/eventos | ✅ Definido |
| Tarefas atrasadas | Incluir prazo < CURDATE() + TarefaFeito = FALSE (últimos 30 dias) | ✅ Definido |
| Campos completos no UNION | 14 campos incluindo contagem de anexos, permissões, status | ✅ Definido |
| Broadcast de eventos corrigido | Lógica NOT EXISTS para eventos sem destinatários | ✅ Definido |
| UNION no calendário | Performance + simplicidade no frontend | ✅ Definido |
| Separação de permissões | Controle fino por função | ✅ Definido |
| Campo `TarefaTipoEntrega` | Diferencia digitais de físicas na interface | ✅ Definido |
| Campo `TarefaFeito` booleano | Indicador simples para orientar alunos (não rastreia entrega) | ✅ Definido |
| Eventos NÃO esperam resposta | Apenas informativo, sem interação obrigatória | ✅ Definido |

---

**Próximos passos:**
1. ✅ Criar migrations SQL com as 10 tabelas (tarefaacademica, provaagendada, pendencia, evento, eventodestinatarios, anexo, relacaoanexostarefa, relacaoanexospendencia, relacaoanexosevento, relacaoanexosprova)
2. ⏳ Implementar job diário às 3h da manhã (verificar tarefas/provas/pendências/eventos que vencem no dia seguinte)
3. ⏳ Sistema de notificações (email + WhatsApp) - será documentado posteriormente
2. ⏳ Implementar entities/repositories (backend)
3. ⏳ Implementar services com autorização
4. ⏳ Criar endpoints REST
5. ⏳ Desenvolver frontend do calendário com UNION
6. ⏳ Testes de integração
