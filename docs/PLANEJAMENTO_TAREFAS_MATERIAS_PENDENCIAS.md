# Planejamento: Tarefas, Matérias (Provas) e Pendências

**Data:** 13 de Maio de 2026  
**Status:** Estrutura definida e documentada  
**Escopo:** Sistema de avisos, tarefas acadêmicas e lembretes administrativos

---

## 1. Decisão Arquitetural: 3 Tabelas Separadas

### Por que separar?

As três entidades possuem **semântica completamente diferente**, apesar de aparecerem na mesma tela (calendário):

| Aspecto | Tarefa Acadêmica | Prova Agendada | Pendência |
|---------|------------------|----------------|-----------|
| **Conceito** | Aluno PRECISA fazer e ENTREGAR isso até X | Aviso: haverá prova sobre isso em X | Lembrete genérico de obrigação |
| **Destinatário** | 1 Aluno específico (por Matrícula) | N Alunos (por Turma) | N Usuários (por Escola/Função) |
| **Obrigatoriedade** | SIM - entrega é mandatória | NÃO - é apenas aviso | DEPENDE do tipo |
| **Rastreamento** | Entrega, nota, realização | Data da ocorrência | Resolução simples |
| **Campos principais** | Conteúdo, prazo, arquivo entregue | Matéria, data da prova | Título, conteúdo genérico |

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

## 3. Tabelas Auxiliares

### 3.1 Tabela: `anexo`

**Propósito:** Armazenar metadados de arquivos enviados (não o arquivo em si)

```sql
CREATE TABLE anexo (
  AnexoGUID UUID PRIMARY KEY,
  UsuarioCPF VARCHAR(14) NOT NULL,                -- Quem enviou
  EscolaGUID UUID NOT NULL,                       -- Contexto
  AnexoCaminho VARCHAR(500) NOT NULL,             -- Caminho no disco: /uploads/anexos/{GUID}.{ext}
  AnexoNomeOriginal VARCHAR(255),                 -- Nome original: "trabalho.pdf"
  AnexoTamanho INT,                               -- Tamanho em bytes
  AnexoTipo ENUM('professor', 'aluno', 'admin'),  -- Quem criou / tipo de envio
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (UsuarioCPF) REFERENCES usuario(UsuarioCPF),
  FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID),
  INDEX idx_usuario (UsuarioCPF),
  INDEX idx_escola (EscolaGUID),
  INDEX idx_tipo (AnexoTipo)
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

### 3.2 Tabela: `relacaoanexos` (Pivot)

**Propósito:** Vincular N anexos a N tarefas E N anexos a N pendências

```sql
CREATE TABLE relacaoanexos (
  RelacaoAnexoGUID UUID PRIMARY KEY,
  AnexoGUID UUID NOT NULL,
  TarefaGUID UUID,                                -- Allow NULL
  PendenciaGUID UUID,                             -- Allow NULL
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (AnexoGUID) REFERENCES anexo(AnexoGUID),
  FOREIGN KEY (TarefaGUID) REFERENCES tarefaacademica(TarefaGUID),
  FOREIGN KEY (PendenciaGUID) REFERENCES pendencia(PendenciaGUID),
  
  -- Validação: exatamente um dos dois deve estar preenchido
  CHECK ((TarefaGUID IS NOT NULL AND PendenciaGUID IS NULL) OR 
         (TarefaGUID IS NULL AND PendenciaGUID IS NOT NULL)),
  
  INDEX idx_tarefa (TarefaGUID),
  INDEX idx_pendencia (PendenciaGUID),
  INDEX idx_anexo (AnexoGUID)
);
```

**Fluxo de anexos em tarefas E pendências:**
1. Professor/Admin cria tarefa ou pendência
2. Envia arquivo(s) → cria `Anexo` com `AnexoTipo = 'professor'` ou `'admin'`
3. Relaciona arquivo → cria `RelacaoAnexos` apontando para `TarefaGUID` OU `PendenciaGUID`
4. Aluno/Usuário vê tarefa/pendência, baixa arquivo
5. Aluno/Usuário envia resposta/evidência → cria novo `Anexo` com `AnexoTipo = 'aluno'`
6. Relaciona nova resposta → novo `RelacaoAnexos` apontando para mesma `TarefaGUID` OU `PendenciaGUID`
7. Ambos os anexos aparecem juntos (ordenados por `CreatedAt`)

**Exemplos de pendências com anexos:**
- Pendência: "Corrigir prova de Matemática" → Prof envia `modelo_resposta.pdf` → Aluno envia `minha_correcao.pdf`
- Pendência: "Enviar relatório de reunião" → Admin envia `modelo_relatorio.docx` → Prof envia `relatorio_preenchido.docx`
- Pendência: "Justificar ausência" → Coordenação pede justificativa → Aluno envia `atestado.pdf`

---

### 3.3 Uso de Anexos em Pendências

Pendências, assim como tarefas, podem ter múltiplos anexos enviados por diferentes usuários. A tabela `relacaoanexos` já permite isso através do campo `PendenciaGUID`.

**Workflow Exemplo: Pendência de Correção**

```
Dia 1 - Coordenador cria pendência:
  PendenciaGUID: abc123
  Titulo: "Corrigir respostas da Prova de História"
  Prazo: 20/05
  UsuarioCPF: professor.cpf
  
  └─ Envia arquivo de modelo:
     Anexo { AnexoTipo: 'admin', UsuarioCPF: coord.cpf }
     RelacaoAnexos { PendenciaGUID: abc123, AnexoGUID: xyz789 }
     Arquivo: modelo_respostas.pdf

Dia 10 - Professor responde:
  └─ Envia provas corrigidas:
     Anexo { AnexoTipo: 'professor', UsuarioCPF: professor.cpf }
     RelacaoAnexos { PendenciaGUID: abc123, AnexoGUID: new123 }
     Arquivo: provas_corrigidas.pdf
     
  └─ Marca como feita:
     PendenciaFeito = TRUE
     PendenciaRealizacaoData = 2026-05-10

Frontend exibe:
  [📋 Pendência: Corrigir respostas da Prova de História]
  Prazo: 20/05
  Status: ✅ Resolvida
  
  Arquivos (ordenados por data):
  - 📄 [Admin] modelo_respostas.pdf (criado em 01/05)
  - 📄 [Prof] provas_corrigidas.pdf (criado em 10/05)
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

ORDER BY DataPrazo ASC;
```

**Frontend renderiza tudo com ícones/cores diferentes por tipo.**

---

## 5. Permissões por Função

### Professor (FuncaoId = 5)

| Entidade | Criar | Editar | Ler | Deletar |
|----------|-------|--------|-----|--------|
| **Tarefa Acadêmica** | ✅ Suas disciplinas | ✅ Suas | ✅ Suas | ✅ Suas |
| **Prova Agendada** | ✅ Suas disciplinas | ✅ Suas | ✅ Todas da turma | ✅ Suas |
| **Pendência** | ❌ | ✅ Marcar como resolvida, enviar anexos | ✅ Suas | ❌ |
| **Anexo (Tarefa/Pendência)** | ✅ Enviar | - | ✅ | ✅ |

### Aluno (FuncaoId = 4)

| Entidade | Criar | Editar | Ler | Deletar |
|----------|-------|--------|-----|--------|
| **Tarefa Acadêmica** | ❌ | ✅ Marcar como feita | ✅ Suas | ❌ |
| **Prova Agendada** | ❌ | ❌ | ✅ Suas | ❌ |
| **Pendência** | ❌ | ✅ Marcar resolvida, enviar anexos | ✅ Suas | ❌ |
| **Anexo (Tarefa/Pendência)** | ✅ Enviar resposta/comprovação | - | ✅ | ❌ |

### Coordenação (FuncaoId = 1) / Direção (FuncaoId = 6)

| Entidade | Criar | Editar | Ler | Deletar |
|----------|-------|--------|-----|--------|
| **Tarefa Acadêmica** | ❌ | ❌ | ✅ Todas | ❌ |
| **Prova Agendada** | ❌ | ❌ | ✅ Todas | ❌ |
| **Pendência** | ✅ Todas | ✅ Suas, enviar anexos | ✅ Todas | ✅ Suas |
| **Anexo (Pendência)** | ✅ Enviar | - | ✅ Todas | ✅ Admin |

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
│   ├── anexo.model.ts
│   └── relacaoanexos.model.ts
├── repositories/
│   ├── tarefaacademica.repository.ts
│   ├── provaagendada.repository.ts
│   ├── pendencia.repository.ts
│   ├── anexo.repository.ts
│   └── relacaoanexos.repository.ts
├── services/
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
│   │   └── AnexoViewer.tsx
│   └── page.module.css
├── tarefas/
│   ├── [tarefaGUID]/
│   │   ├── page.tsx      -- Detalhes + anexos
│   │   └── editar/
│   └── criar/
└── pendencias/
    └── (similar)
```

---

## 7. Considerações Futuras

### Escalabilidade

1. **Notificações:** Criar tabela `notificacao` que referencia qualquer uma das 3
2. **Histórico:** Manter registros deletados em `tarefaacademica_deleted` para auditoria
3. **Analytics:** View agregada com contagem de tarefas por período, taxas de entrega
4. **Integração com email:** Disparar emails via fila (Bull/RabbitMQ) quando próximo do prazo

### Funcionalidades Adicionais

- **Rubrica/Critérios:** Tabela `rubrica` para avaliar tarefas
- **Feedback:** Tabela `feedback_tarefa` com comentários do professor
- **Retrabalho:** Permitir N submissões de tarefa (versioning)
- **Anexos em Pendência:** Evidências de resolução (ex: foto de recibo)

---

## 8. Resumo de Decisões

| Decisão | Justificativa | Status |
|---------|---------------|--------|
| 3 tabelas separadas | Semântica diferente, fluxos diferentes, sem NULLs | ✅ Definido |
| Provas POR TURMA | Avisos genéricos, não individuais | ✅ Definido |
| Pendências genéricas | Aplicável a qualquer função/contexto | ✅ Definido |
| Anexos com `AnexoTipo` | Rastrear quem enviou (professor vs aluno) | ✅ Definido |
| Anexos em Tarefas E Pendências | Ambas permitem envio/recebimento de arquivos (comprovação) | ✅ Definido |
| UNION no calendário | Performance + simplicidade no frontend | ✅ Definido |
| Separação de permissões | Controle fino por função | ✅ Definido |
| Campo `TarefaTipoEntrega` | Diferencia digitais de físicas na interface | ✅ Definido |
| Campo `TarefaFeito` booleano | Indicador simples para orientar alunos (não rastreia entrega) | ✅ Definido |

---

**Próximos passos:**
1. ✅ Criar migrations SQL com as 5 tabelas
2. ⏳ Implementar entities/repositories (backend)
3. ⏳ Implementar services com autorização
4. ⏳ Criar endpoints REST
5. ⏳ Desenvolver frontend do calendário com UNION
6. ⏳ Testes de integração
