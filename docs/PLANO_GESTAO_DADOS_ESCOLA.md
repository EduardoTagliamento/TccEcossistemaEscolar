# 📊 PLANO DE IMPLEMENTAÇÃO - Gestão de Dados da Escola

**Data de criação:** 12/06/2026  
**Status:** 🟡 Planejamento  
**Complexidade:** Alta  
**Prioridade:** Crítica

---

## 📖 RESUMO EXECUTIVO

Implementação de um sistema completo de gestão de dados escolares, permitindo que Direção/Coordenação cadastrem todos os dados da escola (usuários, turmas, matérias, cursos) de forma individual ou em massa via planilha Excel. Inclui notificações automáticas por email e funcionalidades de visualização, edição e exclusão.

---

## 🎯 OBJETIVOS

### Objetivo Principal
Criar interface unificada para que Direção/Coordenação gerenciem todos os dados da escola de forma eficiente, com suporte a cadastro individual e em massa.

### Objetivos Específicos
1. Permitir cadastro completo de estrutura escolar
2. Facilitar entrada de dados em massa via Excel
3. Notificar usuários cadastrados automaticamente
4. Fornecer visualização e gestão de dados existentes
5. Suportar operações de transferência (ex: aluno entre turmas)

---

## 🗄️ ALTERAÇÕES NO BANCO DE DADOS

### 1. Tabela `materia` - ADICIONAR SUPORTE A CURSOS TÉCNICOS

```sql
-- Adicionar coluna CursoGUID nullable
ALTER TABLE materia
ADD COLUMN CursoGUID CHAR(36) NULL COMMENT 'Curso técnico associado (se aplicável)',
ADD INDEX idx_curso (CursoGUID),
ADD CONSTRAINT FK_Materia_Curso
  FOREIGN KEY (CursoGUID) REFERENCES curso(CursoGUID)
  ON UPDATE CASCADE ON DELETE SET NULL;
```

**Regra de negócio:**
- Se `IsTecnico = TRUE`: CursoGUID pode ser preenchido (matéria pertence a curso técnico)
- Se `IsTecnico = FALSE`: CursoGUID deve ser NULL (matéria geral)

---

## 📋 ENTIDADES E CADASTROS

### Hierarquia de Dependências

```
1º NÍVEL (Independentes)
├── Curso (apenas escolas técnicas)
├── Usuário (CPF base)
└── Escola (já existente)

2º NÍVEL (Dependem do 1º)
├── Matéria (pode depender de Curso se for técnica)
└── EscolaXUsuarioXFuncao (vincula usuário à escola)

3º NÍVEL (Dependem do 2º)
└── Turma (pode depender de Curso se for técnica)

4º NÍVEL (Dependem do 3º)
├── Matrícula (aluno + turma)
└── MateriaxProfessorxTurma (grade acadêmica)
```

---

## 🔧 ALTERAÇÕES EM REST APIs

### Padrão de Massa (Batch Operations)

Todas as APIs de criação devem aceitar **objeto único OU array**:

```typescript
// ANTES (apenas objeto único)
POST /api/materia
Body: { MateriaNome: "Matemática", ... }

// DEPOIS (objeto ou array)
POST /api/materia
Body: { MateriaNome: "Matemática", ... }  // OU
Body: [
  { MateriaNome: "Matemática", ... },
  { MateriaNome: "Português", ... }
]

// Response
{
  success: true,
  data: {
    criados: 2,
    erros: [],
    resultados: [...]
  }
}
```

### APIs a Modificar

**Alta Prioridade (Fase 1-2):**
1. `POST /api/usuario` - Criar usuários em massa
2. `POST /api/escolaxusuarioxfuncao` - Vincular funções em massa
3. `POST /api/materia` - Criar matérias em massa
4. `POST /api/turma` - Criar turmas em massa

**Média Prioridade (Fase 3-4):**
5. `POST /api/curso` - Criar cursos em massa
6. `POST /api/matricula` - Matricular alunos em massa
7. `POST /api/professor` - Associar professores em massa

**Estrutura de Response Padronizada:**

```typescript
interface BatchCreateResponse<T> {
  success: boolean;
  message: string;
  data: {
    criados: number;           // Quantos foram criados com sucesso
    ignorados: number;         // Quantos já existiam (CPF duplicado, etc)
    erros: number;             // Quantos falharam
    resultados: Array<{
      index: number;           // Posição no array enviado
      sucesso: boolean;
      dado?: T;                // Objeto criado (se sucesso)
      erro?: string;           // Mensagem de erro (se falhou)
      ignorado?: boolean;      // True se foi ignorado (já existe)
    }>;
  };
}
```

---

## 🏗️ ESTRUTURA DE TELAS E COMPONENTES

### Arquitetura de Páginas

```
frontend/app/dashboard/[escolaGUID]/
└── gestao-dados/
    ├── page.tsx                          [Hub principal - menu de opções]
    ├── page.module.css
    │
    ├── alunos/
    │   ├── page.tsx                      [Cadastro + visualização alunos]
    │   ├── page.module.css
    │   └── components/
    │       ├── FormularioAluno.tsx
    │       ├── CardAluno.tsx
    │       ├── ModalTransferirTurma.tsx
    │       └── UploadPlanilhaAlunos.tsx
    │
    ├── professores/
    │   ├── page.tsx
    │   ├── page.module.css
    │   └── components/
    │       ├── FormularioProfessor.tsx
    │       ├── CardProfessor.tsx
    │       └── UploadPlanilhaProfessores.tsx
    │
    ├── turmas/
    │   ├── page.tsx
    │   ├── page.module.css
    │   └── components/
    │       ├── FormularioTurma.tsx
    │       ├── CardTurma.tsx
    │       ├── VisualizarGradeAcademica.tsx
    │       ├── VisualizarAlunosTurma.tsx
    │       └── UploadPlanilhaTurmas.tsx
    │
    ├── materias/
    │   ├── page.tsx
    │   ├── page.module.css
    │   └── components/
    │       ├── FormularioMateria.tsx
    │       ├── CardMateria.tsx
    │       └── UploadPlanilhaMaterias.tsx
    │
    ├── cursos/
    │   ├── page.tsx                      [Apenas escolas técnicas]
    │   ├── page.module.css
    │   └── components/
    │       ├── FormularioCurso.tsx
    │       ├── CardCurso.tsx
    │       └── UploadPlanilhaCursos.tsx
    │
    ├── coordenacao/
    │   ├── page.tsx                      [Cadastro coordenadores]
    │   └── ...
    │
    ├── secretaria/
    │   ├── page.tsx                      [Cadastro secretários]
    │   └── ...
    │
    └── responsaveis/
        ├── page.tsx                      [Cadastro responsáveis]
        └── ...
```

### Componentes Reutilizáveis (Generalização)

```
frontend/components/gestao-dados/
├── BaseFormularioCadastro.tsx          [Componente genérico para formulários]
├── BaseCardVisualizacao.tsx            [Componente genérico para cards]
├── BaseUploadPlanilha.tsx              [Componente genérico para upload]
├── BaseTabelaDados.tsx                 [Tabela genérica com filtros]
├── ModalConfirmacao.tsx                [Modal de confirmação genérica]
├── ModalErrosImportacao.tsx            [Mostrar erros de importação]
└── NotificacaoEmail.tsx                [Feedback de emails enviados]
```

---

## 📊 FLUXO DE TRABALHO

### Fluxo 1: Cadastro Individual

```
[Usuário acessa tela de cadastro]
    ↓
[Preenche formulário manualmente]
    ↓
[Clica em "Salvar"]
    ↓
[Frontend valida dados]
    ↓
[POST /api/{entidade}]
    ↓
[Backend valida e cria registro]
    ↓ (Se for usuário novo)
[Gera senha aleatória (nome + 2 dígitos)]
    ↓
[Envia email com credenciais/aviso]
    ↓
[Retorna sucesso/erro para frontend]
    ↓
[Atualiza lista de dados cadastrados]
```

### Fluxo 2: Cadastro em Massa (Planilha)

```
[Usuário clica "Importar Planilha"]
    ↓
[Modal com botão "Baixar Modelo"]
    ↓
[Usuário faz upload do arquivo .xlsx]
    ↓
[Frontend lê planilha com biblioteca (xlsx/sheetjs)]
    ↓
[Converte linhas em objetos JSON]
    ↓
[Renderiza cards/preview dos dados importados]
    ↓
[Usuário pode editar individualmente antes de salvar]
    ↓
[Clica em "Salvar Todos"]
    ↓
[POST /api/{entidade} com array no body]
    ↓
[Backend processa em loop/transação]
    ↓ (Para cada usuário novo)
[Gera senha, envia email]
    ↓
[Retorna batch response com sucessos/erros]
    ↓
[Frontend mostra modal de resultado:]
    - ✅ X cadastrados
    - ⚠️ Y ignorados (já existiam)
    - ❌ Z erros (com detalhes)
    ↓
[Atualiza lista de dados]
```

### Fluxo 3: Visualização e Gestão

```
[Usuário acessa tela de cadastro]
    ↓
[Clica em "Ver Cadastrados"]
    ↓
[GET /api/{entidade}?escolaGUID={guid}]
    ↓
[Renderiza tabela/grid com dados]
    ↓
[Filtros: nome, status, tipo, etc]
    ↓
[Ações por item:]
    - ✏️ Editar (abre modal com formulário)
    - 🗑️ Deletar (confirmação)
    - 🔄 Transferir (se aplicável)
    ↓
[Operação executada]
    ↓
[Atualiza lista]
```

---

## 📄 MODELOS DE PLANILHAS

### Estrutura Padrão

Cada tipo de cadastro terá sua planilha modelo. Primeira linha = cabeçalho (nomes das colunas).

**🎯 FACILIDADE:** Todas as colunas que referenciam outras entidades (Turma, Matéria, Curso) aceitam **NOME ou GUID**. O sistema busca automaticamente o GUID baseado no nome fornecido.

---

### 1. Planilha de Alunos

**Arquivo:** `modelo_alunos.xlsx`

| UsuarioCPF | UsuarioNome | UsuarioEmail | UsuarioTelefone | UsuarioDataNascimento | Turma |
|------------|-------------|--------------|-----------------|----------------------|-------|
| 12345678901 | João Silva | joao@email.com | 11999999999 | 2010-05-15 | 1º Ano A |
| 98765432100 | Maria Santos | maria@email.com | 11988888888 | 2010-08-20 | 1º Ano A |
| 11111111111 | Pedro Souza | pedro@email.com | 11977777777 | 2010-03-10 | Info 1º |

**Campos obrigatórios:** CPF, Nome, Email, Turma  
**Campos opcionais:** Telefone, DataNascimento

**Coluna "Turma":**
- ✅ Aceita nome da turma: `1º Ano A`, `Info 1º`
- ✅ Aceita GUID: `abc-123-def-456`
- 🔍 API busca automaticamente o GUID pela turma da escola

---

### 2. Planilha de Professores

**Arquivo:** `modelo_professores.xlsx`

| UsuarioCPF | UsuarioNome | UsuarioEmail | UsuarioTelefone | Materias | Turmas |
|------------|-------------|--------------|-----------------|----------|--------|
| 11122233344 | Prof. Carlos | carlos@email.com | 11977777777 | Matemática, Física | 1º Ano A, 1º Ano B |
| 22233344455 | Profa. Ana | ana@email.com | 11966666666 | Programação Web | Info 1º, Info 2º |

**Campos obrigatórios:** CPF, Nome, Email, Materias, Turmas  
**Campos opcionais:** Telefone

**Colunas "Materias" e "Turmas":**
- ✅ Aceita nomes separados por vírgula: `Matemática, Física`
- ✅ Aceita GUIDs separados por vírgula: `mat-guid-1, mat-guid-2`
- ✅ Aceita mistura: `Matemática, mat-guid-2`
- 🔍 API converte todos os nomes para GUIDs automaticamente

---

### 3. Planilha de Matérias

**Arquivo:** `modelo_materias.xlsx`

| MateriaNome | IsTecnico | Curso |
|-------------|-----------|-------|
| Matemática | FALSE | |
| Português | FALSE | |
| Programação Web | TRUE | Técnico em Informática |
| Banco de Dados | TRUE | Técnico em Informática |
| Enfermagem Básica | TRUE | Técnico em Enfermagem |

**Campos obrigatórios:** MateriaNome, IsTecnico  
**Campos opcionais:** Curso (obrigatório se IsTecnico = TRUE)

**Coluna "Curso":**
- ✅ Aceita nome do curso: `Técnico em Informática`
- ✅ Aceita GUID: `curso-guid-1`
- 🔍 API busca automaticamente o GUID pelo curso da escola
- ⚠️ Deixar vazio se matéria não for técnica

**Valores aceitos em "IsTecnico":**
- TRUE, true, 1, SIM, sim, S, s → `TRUE`
- FALSE, false, 0, NÃO, não, NAO, nao, N, n → `FALSE`

---

### 4. Planilha de Turmas

**Arquivo:** `modelo_turmas.xlsx`

| TurmaNome | TurmaTurno | TurmaAno | IsTecnica | Curso |
|-----------|------------|----------|-----------|-------|
| 1º Ano A | Manhã | 2026 | FALSE | |
| 1º Ano B | Tarde | 2026 | FALSE | |
| Info 1º | Integral | 2026 | TRUE | Técnico em Informática |
| Enf 1º | Manhã | 2026 | TRUE | Técnico em Enfermagem |

**Campos obrigatórios:** TurmaNome, TurmaTurno, TurmaAno, IsTecnica  
**Campos opcionais:** Curso (obrigatório se IsTecnica = TRUE)

**Coluna "Curso":**
- ✅ Aceita nome do curso: `Técnico em Informática`
- ✅ Aceita GUID: `curso-guid-1`
- 🔍 API busca automaticamente o GUID pelo curso da escola
- ⚠️ Deixar vazio se turma não for técnica

**Valores aceitos em "TurmaTurno":**
- `Manhã`, `Tarde`, `Noite`, `Integral`, `Vespertino`, `Matutino`, `Noturno`

**Valores aceitos em "IsTecnica":**
- TRUE, true, 1, SIM, sim, S, s → `TRUE`
- FALSE, false, 0, NÃO, não, NAO, nao, N, n → `FALSE`

---

### 5. Planilha de Cursos

**Arquivo:** `modelo_cursos.xlsx`

| CursoNome | CursoDescricao | CursoDuracao |
|-----------|----------------|--------------|
| Técnico em Informática | Curso técnico profissionalizante em desenvolvimento de sistemas | 3 anos |
| Técnico em Enfermagem | Formação de técnicos em enfermagem para atuação hospitalar | 2 anos |
| Técnico em Administração | Gestão empresarial e processos administrativos | 2 anos |

**Campos obrigatórios:** CursoNome, CursoDescricao, CursoDuracao  
**Campos opcionais:** Nenhum

---

## 🔄 LÓGICA DE CONVERSÃO NOME → GUID

### Como Funciona

Quando a planilha é processada, o backend executa as seguintes etapas:

```typescript
// Exemplo: Processando planilha de alunos

async function processarLinhaAluno(linha: any, escolaGUID: string) {
  let turmaGUID: string;
  
  // 1. Verificar se é GUID (formato UUID)
  if (isUUID(linha.Turma)) {
    turmaGUID = linha.Turma;
  } else {
    // 2. Buscar turma pelo nome
    const turma = await buscarTurmaPorNome(linha.Turma, escolaGUID);
    
    if (!turma) {
      throw new Error(`Turma "${linha.Turma}" não encontrada na escola`);
    }
    
    turmaGUID = turma.TurmaGUID;
  }
  
  // 3. Criar aluno com GUID resolvido
  return {
    UsuarioCPF: linha.UsuarioCPF,
    UsuarioNome: linha.UsuarioNome,
    UsuarioEmail: linha.UsuarioEmail,
    TurmaGUID: turmaGUID  // ✅ GUID resolvido
  };
}
```

### Exemplo: Professores com Múltiplas Matérias

```typescript
async function resolverMateriasETurmas(linha: any, escolaGUID: string) {
  // Coluna "Materias": "Matemática, Física, mat-guid-3"
  const materiasInput = linha.Materias.split(',').map(m => m.trim());
  const materiasGUIDs: string[] = [];
  
  for (const materiaInput of materiasInput) {
    if (isUUID(materiaInput)) {
      // Já é GUID
      materiasGUIDs.push(materiaInput);
    } else {
      // Buscar por nome
      const materia = await buscarMateriaPorNome(materiaInput, escolaGUID);
      
      if (!materia) {
        throw new Error(`Matéria "${materiaInput}" não encontrada`);
      }
      
      materiasGUIDs.push(materia.MateriaGUID);
    }
  }
  
  // Mesmo processo para turmas...
  const turmasGUIDs = await resolverTurmas(linha.Turmas, escolaGUID);
  
  return { materiasGUIDs, turmasGUIDs };
}
```

### Vantagens desta Abordagem

✅ **Facilidade de preenchimento:** Usuário não precisa copiar GUIDs  
✅ **Legibilidade:** Planilha fica mais clara e compreensível  
✅ **Flexibilidade:** Aceita GUID para casos específicos  
✅ **Validação:** Detecta erros de digitação em nomes  
✅ **Manutenção:** Mesmo se GUID mudar, nome continua funcionando

### Tratamento de Erros - Resolução Interativa

Quando a planilha é processada, **todos os dados são validados primeiro**. Erros são identificados e armazenados. Depois, **cada erro é apresentado ao usuário individualmente** através de modais interativos, permitindo correção em tempo real.

#### Fluxo de Resolução de Erros

```
[Upload da planilha]
    ↓
[Processar todas as linhas]
    ↓
[Identificar erros: não encontrado, ambíguos, inválidos]
    ↓
[Para cada erro encontrado:]
    ↓
[Abrir modal específico com opções de resolução]
    ↓
[Usuário seleciona correção]
    ↓
[Aplicar correção e marcar como resolvido]
    ↓
[Próximo erro (se houver)]
    ↓
[Todos erros resolvidos? Prosseguir para salvamento]
```

---

#### Cenário 1: Nome não encontrado

**Situação:** Linha 3 - Turma "9º Ano Z" não existe na escola

**Modal Interativo:**

```
┌─────────────────────────────────────────────────────┐
│ ⚠️ Turma não encontrada - Linha 3               [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ A turma "9º Ano Z" não foi encontrada na escola.   │
│                                                     │
│ Aluno: João Silva (CPF: 123.456.789-01)            │
│                                                     │
│ Selecione a turma correta:                         │
│ ┌─────────────────────────────────────────────┐   │
│ │ ○ 1º Ano A - Manhã (45 alunos)             │   │
│ │ ○ 1º Ano B - Tarde (42 alunos)             │   │
│ │ ○ 2º Ano A - Manhã (38 alunos)             │   │
│ │ ○ Info 1º - Integral (30 alunos)           │   │
│ │ ○ Info 2º - Integral (28 alunos)           │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ 🔍 [Buscar turma...]                               │
│                                                     │
│ [Pular este aluno] [❌ Cancelar] [✅ Confirmar]    │
└─────────────────────────────────────────────────────┘
```

**Ações:**
- **Selecionar turma:** Aplica correção e prossegue
- **Pular:** Ignora este aluno (não será cadastrado)
- **Cancelar:** Aborta todo o processo de importação

---

#### Cenário 2: Múltiplos resultados (nome ambíguo)

**Situação:** Linha 5 - Existem 2 matérias chamadas "Matemática"

**Modal Interativo:**

```
┌─────────────────────────────────────────────────────┐
│ ⚠️ Nome ambíguo - Linha 5                       [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Foram encontradas múltiplas matérias com o nome    │
│ "Matemática".                                       │
│                                                     │
│ Professor: Prof. Carlos (CPF: 111.222.333-44)      │
│                                                     │
│ Selecione qual matéria deve ser associada:        │
│ ┌─────────────────────────────────────────────┐   │
│ │ ○ Matemática (Ensino Fundamental I)        │   │
│ │   Curso: - | GUID: mat-guid-1              │   │
│ │                                             │   │
│ │ ○ Matemática (Ensino Fundamental II)       │   │
│ │   Curso: - | GUID: mat-guid-2              │   │
│ │                                             │   │
│ │ ○ Matemática Aplicada                      │   │
│ │   Curso: Técnico em Informática            │   │
│ │   GUID: mat-guid-3                         │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ 💡 Dica: Use o GUID na planilha para evitar isso   │
│                                                     │
│ [Pular] [❌ Cancelar] [✅ Confirmar]               │
└─────────────────────────────────────────────────────┘
```

**Detalhes técnicos:**
- Mostrar informações extras para diferenciar (curso associado, descrição)
- Permitir busca/filtro se houver muitas opções
- Salvar escolha para aplicar a todas as ocorrências seguintes do mesmo nome

---

#### Cenário 3: Campo obrigatório vazio

**Situação:** Linha 7 - Campo "Email" está vazio

**Modal Interativo:**

```
┌─────────────────────────────────────────────────────┐
│ ❌ Campo obrigatório vazio - Linha 7            [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ O campo "Email" é obrigatório mas está vazio.      │
│                                                     │
│ Aluno: Pedro Costa (CPF: 999.888.777-66)           │
│ Turma: 1º Ano A                                    │
│                                                     │
│ Digite o email para continuar:                     │
│ [_________________________________________]         │
│                                                     │
│ Ou escolha uma ação:                               │
│ ○ Gerar email automático: pedro.costa@escola.com   │
│ ○ Pular este aluno                                 │
│                                                     │
│ [❌ Cancelar] [✅ Confirmar]                        │
└─────────────────────────────────────────────────────┘
```

---

#### Cenário 4: CPF inválido

**Situação:** Linha 10 - CPF com formato incorreto

**Modal Interativo:**

```
┌─────────────────────────────────────────────────────┐
│ ❌ CPF inválido - Linha 10                      [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ O CPF "123.456" está inválido ou incompleto.      │
│                                                     │
│ Aluno: Ana Maria                                   │
│ Email: ana@email.com                               │
│                                                     │
│ Digite o CPF correto (11 dígitos):                │
│ [___.___.___-__]                                   │
│                                                     │
│ ✅ Validação automática de dígitos verificadores   │
│                                                     │
│ [Pular este aluno] [❌ Cancelar] [✅ Confirmar]    │
└─────────────────────────────────────────────────────┘
```

---

#### Cenário 5: Valor booleano inválido

**Situação:** Linha 12 - "IsTecnico" com valor não reconhecido

**Modal Interativo:**

```
┌─────────────────────────────────────────────────────┐
│ ⚠️ Valor não reconhecido - Linha 12             [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ O campo "IsTecnico" tem valor "talvez" que não é   │
│ reconhecido.                                        │
│                                                     │
│ Matéria: Programação Avançada                      │
│                                                     │
│ Selecione o valor correto:                         │
│ ○ SIM - É uma matéria técnica                      │
│ ○ NÃO - É uma matéria geral                        │
│                                                     │
│ Valores aceitos na planilha:                       │
│ SIM: TRUE, true, 1, SIM, sim, S                    │
│ NÃO: FALSE, false, 0, NÃO, não, N                 │
│                                                     │
│ [Pular] [❌ Cancelar] [✅ Confirmar]               │
└─────────────────────────────────────────────────────┘
```

---

#### Cenário 6: Múltiplas matérias - uma ou mais não encontradas

**Situação:** Professor com "Matemática, Física, Química" - Química não existe

**Modal Interativo:**

```
┌─────────────────────────────────────────────────────┐
│ ⚠️ Matéria não encontrada - Linha 8             [×] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Professor: Profa. Maria (CPF: 444.555.666-77)      │
│                                                     │
│ Matérias encontradas:                              │
│ ✅ Matemática                                       │
│ ✅ Física                                           │
│ ❌ Química - NÃO ENCONTRADA                         │
│                                                     │
│ Selecione a matéria correta para "Química":       │
│ ┌─────────────────────────────────────────────┐   │
│ │ 🔍 [Buscar matéria...]                      │   │
│ │                                             │   │
│ │ ○ Química Orgânica                          │   │
│ │ ○ Química Inorgânica                        │   │
│ │ ○ Bioquímica                                │   │
│ │ ○ Físico-Química                            │   │
│ │ --- Todas as matérias (50) ---              │   │
│ │ ○ Matemática                                │   │
│ │ ○ Português                                 │   │
│ │ ...                                         │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Ações:                                             │
│ ○ Remover "Química" da lista                       │
│ ○ Criar nova matéria "Química"                     │
│                                                     │
│ [Pular professor] [❌ Cancelar] [✅ Confirmar]     │
└─────────────────────────────────────────────────────┘
```

---

### Implementação Frontend

#### Componente de Resolução de Erros

```typescript
// frontend/components/gestao-dados/ModalResolverErros.tsx

interface ErroImportacao {
  linha: number;
  tipo: 'nao_encontrado' | 'ambiguo' | 'invalido' | 'vazio';
  campo: string;
  valorOriginal: string;
  contexto: {
    dadosLinha: any;
    opcoesDisponiveis?: any[];
  };
}

export function ModalResolverErros({ erros, onResolver, onCancelar }: Props) {
  const [erroAtual, setErroAtual] = useState(0);
  const [resolucoes, setResolucoes] = useState<Map<number, any>>(new Map());
  
  const erro = erros[erroAtual];
  
  const handleResolverErro = (resolucao: any) => {
    // Salvar resolução
    setResolucoes(prev => {
      const novas = new Map(prev);
      novas.set(erroAtual, resolucao);
      return novas;
    });
    
    // Próximo erro
    if (erroAtual < erros.length - 1) {
      setErroAtual(erroAtual + 1);
    } else {
      // Todos resolvidos
      onResolver(resolucoes);
    }
  };
  
  const handlePular = () => {
    handleResolverErro({ acao: 'pular' });
  };
  
  return (
    <div className={styles.modal}>
      <div className={styles.header}>
        <h2>{getTituloErro(erro.tipo)} - Linha {erro.linha}</h2>
        <span className={styles.progresso}>
          {erroAtual + 1} de {erros.length} erros
        </span>
      </div>
      
      <div className={styles.body}>
        {renderErroEspecifico(erro, handleResolverErro)}
      </div>
      
      <div className={styles.footer}>
        <button onClick={handlePular}>Pular</button>
        <button onClick={onCancelar}>❌ Cancelar Tudo</button>
        <ProgressBar 
          atual={erroAtual + 1} 
          total={erros.length} 
        />
      </div>
    </div>
  );
}
```

#### Renderização Específica por Tipo de Erro

```typescript
function renderErroEspecifico(erro: ErroImportacao, onResolucao: Function) {
  switch (erro.tipo) {
    case 'nao_encontrado':
      return (
        <SeletorComBusca
          label={`Selecione ${erro.campo} correta:`}
          opcoes={erro.contexto.opcoesDisponiveis}
          onSelecionar={(opcao) => onResolucao({ 
            acao: 'substituir', 
            novoValor: opcao.guid 
          })}
        />
      );
      
    case 'ambiguo':
      return (
        <ListaOpcoes
          titulo="Múltiplos resultados encontrados"
          opcoes={erro.contexto.opcoesDisponiveis}
          renderOpcao={(opcao) => (
            <div>
              <strong>{opcao.nome}</strong>
              <p>{opcao.detalhes}</p>
              <small>GUID: {opcao.guid}</small>
            </div>
          )}
          onSelecionar={(opcao) => onResolucao({ 
            acao: 'especificar', 
            guid: opcao.guid 
          })}
        />
      );
      
    case 'vazio':
      return (
        <CampoTexto
          label={`Digite ${erro.campo}:`}
          placeholder={`Exemplo: ${getExemploParaCampo(erro.campo)}`}
          validacao={getValidadorParaCampo(erro.campo)}
          onConfirmar={(valor) => onResolucao({ 
            acao: 'preencher', 
            novoValor: valor 
          })}
        />
      );
      
    case 'invalido':
      return (
        <OpcoesRadio
          opcoes={getOpcoesPorCampo(erro.campo)}
          onSelecionar={(valor) => onResolucao({ 
            acao: 'corrigir', 
            novoValor: valor 
          })}
        />
      );
  }
}
```

---

### Fluxo Backend - Validação e Resposta

```typescript
// backend/services/importacao.service.ts

async function validarPlanilhaCompleta(dados: any[], escolaGUID: string) {
  const erros: ErroImportacao[] = [];
  const dadosValidados: any[] = [];
  
  for (let i = 0; i < dados.length; i++) {
    const linha = dados[i];
    const resultado = await validarLinha(linha, escolaGUID, i + 2);
    
    if (resultado.erros.length > 0) {
      erros.push(...resultado.erros);
    } else {
      dadosValidados.push(resultado.dadosResolvidos);
    }
  }
  
  // Se houver erros, retornar para resolução interativa
  if (erros.length > 0) {
    return {
      status: 'erros_encontrados',
      erros: erros,
      dadosValidados: dadosValidados
    };
  }
  
  // Sem erros, prosseguir com criação
  return {
    status: 'validacao_ok',
    dados: dadosValidados
  };
}

async function validarLinha(linha: any, escolaGUID: string, numeroLinha: number) {
  const erros: ErroImportacao[] = [];
  const dadosResolvidos = { ...linha };
  
  // Validar turma
  if (linha.Turma) {
    const resultado = await resolverTurma(linha.Turma, escolaGUID);
    
    if (!resultado.encontrado) {
      erros.push({
        linha: numeroLinha,
        tipo: 'nao_encontrado',
        campo: 'Turma',
        valorOriginal: linha.Turma,
        contexto: {
          dadosLinha: linha,
          opcoesDisponiveis: await listarTodasTurmas(escolaGUID)
        }
      });
    } else if (resultado.multiplos) {
      erros.push({
        linha: numeroLinha,
        tipo: 'ambiguo',
        campo: 'Turma',
        valorOriginal: linha.Turma,
        contexto: {
          dadosLinha: linha,
          opcoesDisponiveis: resultado.opcoes
        }
      });
    } else {
      dadosResolvidos.TurmaGUID = resultado.guid;
    }
  }
  
  // Validar email
  if (!linha.UsuarioEmail) {
    erros.push({
      linha: numeroLinha,
      tipo: 'vazio',
      campo: 'Email',
      valorOriginal: '',
      contexto: { dadosLinha: linha }
    });
  }
  
  return { erros, dadosResolvidos };
}
```

---

### Vantagens desta Abordagem

✅ **Experiência do usuário:** Erros resolvidos de forma guiada e interativa  
✅ **Precisão:** Usuário escolhe exatamente o que quer, sem ambiguidades  
✅ **Aprendizado:** Usuário vê padrões de erros e aprende a preencher melhor  
✅ **Flexibilidade:** Pode criar novos registros ou pular itens problemáticos  
✅ **Eficiência:** Resolve todos os erros de uma vez, sem reprocessar  
✅ **Rastreabilidade:** Histórico de correções aplicadas

---

### Progressão Visual

Durante a resolução de erros, mostrar progresso:

```
┌─────────────────────────────────────────┐
│ Resolvendo erros da importação         │
├─────────────────────────────────────────┤
│                                         │
│ ████████████░░░░░░░░░░░░  8/15 erros   │
│                                         │
│ ✅ 5 resolvidos                         │
│ 🔄 3 corrigidos automaticamente         │
│ ⏩ 2 pulados                            │
│ 📝 7 restantes                          │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔍 ENDPOINTS DE BUSCA (Para Suporte)

Para facilitar o preenchimento de planilhas, criar endpoints auxiliares:

```typescript
// GET /api/turma/listar-nomes?escolaGUID={guid}
// Response: { data: ["1º Ano A", "1º Ano B", "Info 1º"] }

// GET /api/materia/listar-nomes?escolaGUID={guid}
// Response: { data: ["Matemática", "Português", "Programação Web"] }

// GET /api/curso/listar-nomes?escolaGUID={guid}
// Response: { data: ["Técnico em Informática", "Técnico em Enfermagem"] }
```

**Uso no frontend:**
- Ao clicar em "Baixar Modelo", gerar planilha com aba extra "Opções Disponíveis"
- Aba contém listas de turmas, matérias e cursos da escola
- Usuário pode copiar/colar nomes diretamente

---

## 🔐 LÓGICA DE CRIAÇÃO DE USUÁRIOS E NOTIFICAÇÕES

### Algoritmo de Criação

```typescript
async function criarUsuarioComNotificacao(data: UsuarioData, funcao: Funcao, escolaGUID: string) {
  // 1. Verificar se CPF já existe
  const usuarioExiste = await buscarPorCPF(data.UsuarioCPF);
  
  if (!usuarioExiste) {
    // 2. Gerar senha aleatória
    const primeiroNome = data.UsuarioNome.split(' ')[0];
    const numerosAleatorios = Math.floor(Math.random() * 90) + 10; // 10-99
    const senhaTemporaria = `${primeiroNome}${numerosAleatorios}`;
    
    // 3. Criar usuário
    const usuario = await criarUsuario({
      ...data,
      UsuarioSenha: await hashPassword(senhaTemporaria)
    });
    
    // 4. Criar vínculo com escola e função
    await criarEscolaXUsuarioXFuncao({
      EscolaGUID: escolaGUID,
      UsuarioCPF: data.UsuarioCPF,
      FuncaoID: funcao
    });
    
    // 5. Enviar email com senha
    await enviarEmail({
      para: data.UsuarioEmail,
      assunto: 'Bem-vindo ao Ecossistema Escolar',
      corpo: `
        Olá ${data.UsuarioNome}!
        
        Sua conta foi criada na escola ${nomeEscola}.
        Função: ${nomeFuncao}
        
        Suas credenciais de acesso:
        CPF: ${data.UsuarioCPF}
        Senha temporária: ${senhaTemporaria}
        
        Por favor, altere sua senha no primeiro acesso.
        
        Link: https://ecossistema.com/login
      `
    });
    
    return { criado: true, senha: senhaTemporaria };
    
  } else {
    // Usuário já existe, apenas vincular à escola
    await criarEscolaXUsuarioXFuncao({
      EscolaGUID: escolaGUID,
      UsuarioCPF: data.UsuarioCPF,
      FuncaoID: funcao
    });
    
    // Enviar email de aviso
    await enviarEmail({
      para: data.UsuarioEmail,
      assunto: 'Nova função atribuída - Ecossistema Escolar',
      corpo: `
        Olá ${usuarioExiste.UsuarioNome}!
        
        Você foi adicionado à escola ${nomeEscola} com a função de ${nomeFuncao}.
        
        Use suas credenciais existentes para fazer login.
      `
    });
    
    return { criado: false, jaExistia: true };
  }
}
```

---

## 🎨 LAYOUT DAS TELAS

### Tela Principal (Hub)

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Gestão de Dados da Escola - [Nome da Escola]            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Gerenciamento completo de dados escolares                  │
│ Cadastre usuários, turmas, matérias e mais.                │
│                                                             │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│ │  👨‍🎓 Alunos  │  │ 👨‍🏫 Profes. │  │  📚 Turmas  │         │
│ │             │  │             │  │             │         │
│ │  125 cadas. │  │  32 cadas.  │  │  12 cadas.  │         │
│ │             │  │             │  │             │         │
│ │  [Acessar]  │  │  [Acessar]  │  │  [Acessar]  │         │
│ └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│ │ 📖 Matérias │  │ 🎓 Cursos * │  │ 👥 Coord.   │         │
│ │             │  │             │  │             │         │
│ │  45 cadas.  │  │  3 cadas.   │  │  5 cadas.   │         │
│ │             │  │             │  │             │         │
│ │  [Acessar]  │  │  [Acessar]  │  │  [Acessar]  │         │
│ └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│ ┌─────────────┐  ┌─────────────┐                          │
│ │ 🏢 Secret.  │  │ 👪 Respons. │                          │
│ │             │  │             │                          │
│ │  8 cadas.   │  │  200 cadas. │                          │
│ │             │  │             │                          │
│ │  [Acessar]  │  │  [Acessar]  │                          │
│ └─────────────┘  └─────────────┘                          │
│                                                             │
│ * Apenas escolas técnicas                                  │
└─────────────────────────────────────────────────────────────┘
```

### Tela de Cadastro (Exemplo: Alunos)

```
┌─────────────────────────────────────────────────────────────┐
│ ← Voltar | 👨‍🎓 Gestão de Alunos                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [📝 Cadastro Individual] [📊 Ver Cadastrados (125)]         │
│                                                             │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│ ┃ Novo Aluno                                            ┃  │
│ ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│ ┃                                                       ┃  │
│ ┃ [📤 Importar Planilha]  [⬇️ Baixar Modelo]           ┃  │
│ ┃                                                       ┃  │
│ ┃ CPF *                                                 ┃  │
│ ┃ [___________________]                                 ┃  │
│ ┃                                                       ┃  │
│ ┃ Nome Completo *                                       ┃  │
│ ┃ [___________________]                                 ┃  │
│ ┃                                                       ┃  │
│ ┃ Email *                                               ┃  │
│ ┃ [___________________]                                 ┃  │
│ ┃                                                       ┃  │
│ ┃ Telefone                                              ┃  │
│ ┃ [___________________]                                 ┃  │
│ ┃                                                       ┃  │
│ ┃ Data de Nascimento                                    ┃  │
│ ┃ [___________________]                                 ┃  │
│ ┃                                                       ┃  │
│ ┃ Turma *                                               ┃  │
│ ┃ [Selecione a turma ▼]                                ┃  │
│ ┃                                                       ┃  │
│ ┃ ⚠️ Se não houver turmas, crie uma primeiro           ┃  │
│ ┃                                                       ┃  │
│ ┃ [Cancelar]                            [💾 Salvar]    ┃  │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Modal de Importação de Planilha

```
┌─────────────────────────────────────────────────┐
│ 📊 Importar Alunos via Planilha            [×] │
├─────────────────────────────────────────────────┤
│                                                 │
│ 1. Baixe o modelo de planilha                  │
│    [⬇️ Baixar modelo_alunos.xlsx]              │
│                                                 │
│ 2. Preencha os dados no Excel                  │
│    • Uma linha por aluno                       │
│    • Não altere os cabeçalhos                  │
│    • Campos obrigatórios: CPF, Nome, Email     │
│                                                 │
│ 3. Faça upload do arquivo preenchido           │
│    ┌─────────────────────────────────────────┐ │
│    │  📄 Arraste o arquivo aqui             │ │
│    │     ou clique para selecionar          │ │
│    │                                         │ │
│    │  Formatos aceitos: .xlsx, .xls         │ │
│    └─────────────────────────────────────────┘ │
│                                                 │
│               [Cancelar]                        │
└─────────────────────────────────────────────────┘
```

### Visualização de Dados Importados

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Revisar Dados Importados - 15 alunos encontrados        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Revise os dados antes de salvar. Você pode editar          │
│ individualmente clicando em cada card.                      │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ✅ João Silva (CPF: 123.456.789-01)           [✏️] │    │
│ │ Email: joao@email.com | Turma: 1º Ano A            │    │
│ │ Status: Novo usuário - senha será gerada           │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ⚠️ Maria Santos (CPF: 987.654.321-00)         [✏️] │    │
│ │ Email: maria@email.com | Turma: 1º Ano A           │    │
│ │ Status: CPF já cadastrado - será vinculado         │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ❌ Pedro Costa (CPF: inválido)                [✏️] │    │
│ │ Erro: CPF inválido                                 │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ [+ Ver todos (15)]                                         │
│                                                             │
│ Resumo: ✅ 13 válidos | ⚠️ 1 já existe | ❌ 1 erro        │
│                                                             │
│ [← Voltar]                           [💾 Salvar Todos]     │
└─────────────────────────────────────────────────────────────┘
```

### Tela de Visualização de Dados Cadastrados

```
┌─────────────────────────────────────────────────────────────┐
│ 👨‍🎓 Alunos Cadastrados (125)              [+ Novo Aluno]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Filtros:                                                    │
│ [Buscar por nome...] [Turma: Todas ▼] [Status: Todos ▼]   │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ João Silva                                    [✏️][🗑️] │    │
│ │ CPF: 123.456.789-01 | Email: joao@email.com        │    │
│ │ Turma: 1º Ano A                                     │    │
│ │ [🔄 Transferir Turma]                               │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Maria Santos                                  [✏️][🗑️] │    │
│ │ CPF: 987.654.321-00 | Email: maria@email.com       │    │
│ │ Turma: 1º Ano B                                     │    │
│ │ [🔄 Transferir Turma]                               │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ [1] 2 3 ... 7 [Próxima →]                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 ORDEM DE IMPLEMENTAÇÃO (FASES)

### 🔴 FASE 0: Preparação (2-3 dias)

**Objetivo:** Preparar infraestrutura base

- [ ] Criar migration para adicionar `CursoGUID` em `materia`
- [ ] Executar migration em desenvolvimento
- [ ] Criar estrutura de pastas `/gestao-dados/`
- [ ] Criar componentes genéricos reutilizáveis
- [ ] Configurar biblioteca de leitura de Excel (xlsx/sheetjs)
- [ ] Criar helper de geração de senha aleatória
- [ ] Criar helper de envio de email

---

### 🟡 FASE 1: Cadastro de Cursos (3-4 dias)

**Objetivo:** Base para escolas técnicas

**Backend:**
- [ ] Modificar `POST /api/curso` para aceitar array
- [ ] Criar lógica de batch response
- [ ] Testar com Postman

**Frontend:**
- [ ] Criar página `/gestao-dados/cursos/page.tsx`
- [ ] Implementar formulário individual
- [ ] Implementar upload de planilha
- [ ] Implementar preview de dados importados
- [ ] Implementar visualização de cursos cadastrados
- [ ] Implementar edição/exclusão

**Arquivos a criar/modificar:**
```
backend/controllers/curso.controller.ts           [MODIFICAR]
backend/services/curso.service.ts                 [MODIFICAR]
frontend/app/dashboard/[escolaGUID]/gestao-dados/
  └── cursos/
      ├── page.tsx                                [CRIAR]
      ├── page.module.css                         [CRIAR]
      └── components/
          ├── FormularioCurso.tsx                 [CRIAR]
          ├── CardCurso.tsx                       [CRIAR]
          └── UploadPlanilhaCursos.tsx           [CRIAR]
```

---

### 🟢 FASE 2: Cadastro de Matérias (3-4 dias)

**Objetivo:** Matérias gerais e técnicas

**Backend:**
- [ ] Modificar `POST /api/materia` para aceitar array
- [ ] Adicionar suporte a `CursoGUID` no DTO
- [ ] Validar: se `IsTecnico=true`, CursoGUID pode ser preenchido
- [ ] Validar: se `IsTecnico=false`, CursoGUID deve ser null
- [ ] Implementar lógica de batch

**Frontend:**
- [ ] Criar página `/gestao-dados/materias/page.tsx`
- [ ] Formulário com checkbox "Matéria Técnica"
- [ ] Se técnica: mostrar dropdown de cursos
- [ ] Implementar upload de planilha
- [ ] Preview e validação
- [ ] Visualização, edição, exclusão

**Validações especiais:**
- Avisar para criar cursos antes (se escola técnica e não houver cursos)
- Validar GUIDs de cursos na planilha

---

### 🔵 FASE 3: Cadastro de Turmas (4-5 dias)

**Objetivo:** Turmas normais e técnicas

**Backend:**
- [ ] Modificar `POST /api/turma` para aceitar array
- [ ] Adicionar suporte a `CursoGUID` no DTO
- [ ] Implementar lógica de batch

**Frontend:**
- [ ] Criar página `/gestao-dados/turmas/page.tsx`
- [ ] Formulário com checkbox "Turma Técnica"
- [ ] Se técnica: dropdown de cursos
- [ ] Upload de planilha
- [ ] Visualização avançada:
  - Lista de alunos matriculados
  - Grade acadêmica (matérias + professores)
  - Botão "Gerenciar Grade" (abre modal)

**Funcionalidades extras:**
- Modal de grade acadêmica
- Associar matéria + professor à turma
- Remover associações

---

### 🟣 FASE 4: Cadastro de Alunos (5-6 dias)

**Objetivo:** Alunos com notificação por email

**Backend:**
- [ ] Modificar `POST /api/usuario` para aceitar array
- [ ] Implementar lógica de criação/vinculação
- [ ] Gerar senha aleatória para novos usuários
- [ ] Integrar com serviço de email (Brevo/Resend)
- [ ] Enviar emails em batch (fila se necessário)
- [ ] Modificar `POST /api/matricula` para aceitar array

**Frontend:**
- [ ] Criar página `/gestao-dados/alunos/page.tsx`
- [ ] Formulário com dropdown de turmas
- [ ] Upload de planilha
- [ ] Preview mostrando status (novo/existente/erro)
- [ ] Modal de resultado de importação:
  - X criados com sucesso
  - Y já existiam
  - Z erros (com detalhes)
- [ ] Visualização de alunos por turma
- [ ] Funcionalidade de transferência entre turmas
- [ ] Modal de transferência (confirmar nova turma)

**Lógica de transferência:**
```typescript
async function transferirAluno(cpf: string, turmaAtualGUID: string, turmaNovGUID: string) {
  // 1. Buscar matrícula atual
  // 2. Desativar/deletar matrícula antiga
  // 3. Criar nova matrícula
  // 4. Enviar email de notificação
}
```

---

### 🟠 FASE 5: Cadastro de Professores (5-6 dias)

**Objetivo:** Professores com matérias e turmas

**Backend:**
- [ ] Reutilizar lógica de criação de usuário (Fase 4)
- [ ] Modificar `POST /api/professor` para aceitar array
- [ ] Criar associações MateriaxProfessorxTurma em massa

**Frontend:**
- [ ] Criar página `/gestao-dados/professores/page.tsx`
- [ ] Formulário com:
  - Multi-select de matérias
  - Multi-select de turmas
  - Validação: ter pelo menos 1 matéria e 1 turma
- [ ] Upload de planilha (matérias/turmas separadas por vírgula)
- [ ] Parser especial para vírgulas
- [ ] Visualização:
  - Lista de matérias lecionadas
  - Lista de turmas
  - Botão "Gerenciar Aulas" (modal)

---

### 🟤 FASE 6: Cadastro de Coordenação e Secretaria (2-3 dias)

**Objetivo:** Funções administrativas

**Backend:**
- [ ] Reutilizar lógica de criação de usuário (Fase 4)
- [ ] Função = Coordenação ou Secretaria

**Frontend:**
- [ ] Criar `/gestao-dados/coordenacao/page.tsx`
- [ ] Criar `/gestao-dados/secretaria/page.tsx`
- [ ] Formulários simples (sem associações complexas)
- [ ] Upload de planilha
- [ ] Visualização, edição, exclusão

---

### ⚪ FASE 7: Cadastro de Responsáveis (3-4 dias)

**Objetivo:** Responsáveis legais dos alunos

**Backend:**
- [ ] Reutilizar lógica de criação de usuário
- [ ] Implementar associação responsável ↔ aluno
- [ ] Criar tabela `responsavelxaluno` (se não existir)

**Frontend:**
- [ ] Criar `/gestao-dados/responsaveis/page.tsx`
- [ ] Formulário com multi-select de alunos
- [ ] Upload de planilha
- [ ] Visualização mostrando alunos vinculados

---

### 🟢 FASE 8: Tela Hub e Refinamentos (2-3 dias)

**Objetivo:** Centralizar tudo e polir UX

**Frontend:**
- [ ] Criar página hub `/gestao-dados/page.tsx`
- [ ] Cards com contadores dinâmicos
- [ ] Navegação fluida
- [ ] Breadcrumbs
- [ ] Loading states
- [ ] Tratamento de erros consistente

**Melhorias gerais:**
- [ ] Adicionar mensagens de sucesso (toasts)
- [ ] Melhorar feedback visual
- [ ] Adicionar animações
- [ ] Responsividade mobile

---

### 🔴 FASE 9: Testes e Ajustes (3-4 dias)

**Objetivo:** Garantir estabilidade

- [ ] Testar todos os fluxos individualmente
- [ ] Testar importações com planilhas grandes (100+ linhas)
- [ ] Testar casos extremos (CPFs duplicados, emails inválidos)
- [ ] Validar emails enviados
- [ ] Testar permissões (apenas direção/coordenação acessa)
- [ ] Corrigir bugs encontrados
- [ ] Otimizar queries lentas
- [ ] Adicionar índices faltantes

---

## 🎯 PRIORIZAÇÃO DE IMPLEMENTAÇÃO

### Ordem Recomendada (Mais Crítico → Menos Crítico)

1. **Cursos** (base para escolas técnicas)
2. **Matérias** (base para turmas e professores)
3. **Turmas** (base para alunos)
4. **Alunos** (usuários principais)
5. **Professores** (ministram aulas)
6. **Coordenação/Secretaria** (gestão)
7. **Responsáveis** (opcional no início)
8. **Hub e refinamentos** (UX)

### Cronograma Estimado

| Fase | Duração | Prazo Acumulado |
|------|---------|-----------------|
| Fase 0 - Preparação | 3 dias | 3 dias |
| Fase 1 - Cursos | 4 dias | 7 dias |
| Fase 2 - Matérias | 4 dias | 11 dias |
| Fase 3 - Turmas | 5 dias | 16 dias |
| Fase 4 - Alunos | 6 dias | 22 dias |
| Fase 5 - Professores | 6 dias | 28 dias |
| Fase 6 - Coord/Secret | 3 dias | 31 dias |
| Fase 7 - Responsáveis | 4 dias | 35 dias |
| Fase 8 - Hub | 3 dias | 38 dias |
| Fase 9 - Testes | 4 dias | **42 dias** |

**Total:** ~6 semanas de desenvolvimento

---

## 🔐 CONTROLE DE ACESSO

### Middleware de Autorização

```typescript
// backend/middlewares/autorizar-gestao-dados.middleware.ts

export async function autorizarGestaoDados(req: Request, res: Response, next: NextFunction) {
  const usuarioCPF = req.user?.UsuarioCPF;
  const escolaGUID = req.params.escolaGUID || req.body.EscolaGUID;
  
  if (!usuarioCPF || !escolaGUID) {
    return res.status(401).json({
      success: false,
      message: 'Não autenticado'
    });
  }
  
  // Buscar função do usuário na escola
  const vinculo = await buscarVinculo(escolaGUID, usuarioCPF);
  
  if (!vinculo) {
    return res.status(403).json({
      success: false,
      message: 'Você não está vinculado a esta escola'
    });
  }
  
  // Apenas Direção e Coordenação podem acessar
  const funcoesPermitidas = ['Direcao', 'Coordenacao'];
  
  if (!funcoesPermitidas.includes(vinculo.FuncaoNome)) {
    return res.status(403).json({
      success: false,
      message: 'Apenas Direção e Coordenação podem acessar esta funcionalidade'
    });
  }
  
  next();
}
```

**Aplicar em todas as rotas de gestão:**

```typescript
// routes/usuario.routes.ts
router.post('/api/usuario', ensureAuthenticated, autorizarGestaoDados, controller.createBatch);
```

---

## 📧 SISTEMA DE NOTIFICAÇÕES POR EMAIL

### Templates de Email

#### 1. Novo Usuário (com senha)

**Assunto:** Bem-vindo ao Ecossistema Escolar

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .credentials { background-color: #fff; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 Ecossistema Escolar</h1>
    </div>
    <div class="content">
      <h2>Olá, {{UsuarioNome}}!</h2>
      
      <p>Sua conta foi criada com sucesso na escola <strong>{{EscolaNome}}</strong>.</p>
      
      <p>Você foi cadastrado com a função de <strong>{{FuncaoNome}}</strong>.</p>
      
      <div class="credentials">
        <h3>📋 Suas credenciais de acesso:</h3>
        <p><strong>CPF:</strong> {{UsuarioCPF}}</p>
        <p><strong>Senha temporária:</strong> {{SenhaTemporaria}}</p>
      </div>
      
      <p>⚠️ <strong>Importante:</strong> Por segurança, altere sua senha no primeiro acesso.</p>
      
      <a href="{{LinkLogin}}" class="button">Fazer Login</a>
      
      <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
        Se você não esperava este email, por favor entre em contato conosco.
      </p>
    </div>
  </div>
</body>
</html>
```

#### 2. Usuário Existente (vinculação)

**Assunto:** Nova função atribuída - Ecossistema Escolar

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Same styles -->
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 Ecossistema Escolar</h1>
    </div>
    <div class="content">
      <h2>Olá, {{UsuarioNome}}!</h2>
      
      <p>Você foi adicionado à escola <strong>{{EscolaNome}}</strong> com a função de <strong>{{FuncaoNome}}</strong>.</p>
      
      <p>Use suas credenciais existentes para fazer login e acessar as novas funcionalidades.</p>
      
      <a href="{{LinkLogin}}" class="button">Fazer Login</a>
    </div>
  </div>
</body>
</html>
```

### Implementação do Serviço de Email

```typescript
// backend/services/email.service.ts

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailNovoUsuario {
  para: string;
  usuarioNome: string;
  escolaNome: string;
  funcaoNome: string;
  cpf: string;
  senhaTemporaria: string;
}

interface EmailUsuarioExistente {
  para: string;
  usuarioNome: string;
  escolaNome: string;
  funcaoNome: string;
}

export class EmailService {
  async enviarEmailNovoUsuario(data: EmailNovoUsuario): Promise<void> {
    const html = renderTemplateNovoUsuario(data);
    
    await resend.emails.send({
      from: 'Ecossistema Escolar <noreply@ecossistema.com>',
      to: data.para,
      subject: 'Bem-vindo ao Ecossistema Escolar',
      html
    });
  }
  
  async enviarEmailUsuarioExistente(data: EmailUsuarioExistente): Promise<void> {
    const html = renderTemplateUsuarioExistente(data);
    
    await resend.emails.send({
      from: 'Ecossistema Escolar <noreply@ecossistema.com>',
      to: data.para,
      subject: 'Nova função atribuída - Ecossistema Escolar',
      html
    });
  }
  
  // Enviar múltiplos emails em lote (para importação de planilha)
  async enviarEmailsEmLote(emails: Array<EmailNovoUsuario | EmailUsuarioExistente>): Promise<void> {
    // Implementar fila de emails ou enviar em chunks de 10
    const chunks = chunkArray(emails, 10);
    
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(email => 
          'senhaTemporaria' in email 
            ? this.enviarEmailNovoUsuario(email)
            : this.enviarEmailUsuarioExistente(email)
        )
      );
      
      // Aguardar 1 segundo entre chunks para não sobrecarregar
      await sleep(1000);
    }
  }
}
```

---

## 🛡️ VALIDAÇÕES E TRATAMENTO DE ERROS

### Validações no Frontend

```typescript
// frontend/lib/validations/cadastro.validations.ts

export function validarCPF(cpf: string): boolean {
  const cpfLimpo = cpf.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) return false;
  
  // Implementar algoritmo de validação de CPF
  // ...
  return true;
}

export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validarPlanilhaAlunos(dados: any[]): ValidationResult {
  const erros: string[] = [];
  const validos: any[] = [];
  
  dados.forEach((linha, index) => {
    const errosLinha: string[] = [];
    
    if (!linha.UsuarioCPF) {
      errosLinha.push('CPF é obrigatório');
    } else if (!validarCPF(linha.UsuarioCPF)) {
      errosLinha.push('CPF inválido');
    }
    
    if (!linha.UsuarioNome || linha.UsuarioNome.trim().length < 3) {
      errosLinha.push('Nome deve ter pelo menos 3 caracteres');
    }
    
    if (!linha.UsuarioEmail || !validarEmail(linha.UsuarioEmail)) {
      errosLinha.push('Email inválido');
    }
    
    if (!linha.TurmaGUID) {
      errosLinha.push('Turma é obrigatória');
    }
    
    if (errosLinha.length > 0) {
      erros.push(`Linha ${index + 2}: ${errosLinha.join(', ')}`);
    } else {
      validos.push(linha);
    }
  });
  
  return { validos, erros };
}
```

### Tratamento de Erros no Backend

```typescript
// backend/services/usuario.service.ts

async criarUsuariosEmMassa(usuarios: UsuarioCreateDTO[]): Promise<BatchResult> {
  const resultados: BatchResult = {
    criados: [],
    ignorados: [],
    erros: []
  };
  
  for (const [index, dados] of usuarios.entries()) {
    try {
      // Validar dados
      if (!validarCPF(dados.UsuarioCPF)) {
        resultados.erros.push({
          index,
          dados,
          erro: 'CPF inválido'
        });
        continue;
      }
      
      // Verificar se já existe
      const existe = await this.usuarioRepo.findByCPF(dados.UsuarioCPF);
      
      if (existe) {
        resultados.ignorados.push({
          index,
          dados,
          usuario: existe
        });
        continue;
      }
      
      // Criar usuário
      const usuario = await this.criarUsuario(dados);
      resultados.criados.push({
        index,
        usuario
      });
      
    } catch (erro: any) {
      resultados.erros.push({
        index,
        dados,
        erro: erro.message
      });
    }
  }
  
  return resultados;
}
```

---

## 📚 BIBLIOTECAS NECESSÁRIAS

### Backend

```json
{
  "dependencies": {
    "resend": "^2.0.0",              // Email service
    "uuid": "^9.0.0"                 // Geração de GUIDs
  }
}
```

### Frontend

```json
{
  "dependencies": {
    "xlsx": "^0.18.5",               // Leitura de planilhas Excel
    "react-dropzone": "^14.2.3"      // Upload de arquivos drag-and-drop
  }
}
```

### Instalação

```bash
# Backend
cd backend
npm install resend uuid

# Frontend
cd frontend
npm install xlsx react-dropzone
```

---

## 🎨 COMPONENTES GENÉRICOS REUTILIZÁVEIS

### 1. BaseFormularioCadastro.tsx

```typescript
interface BaseFormularioCadastroProps<T> {
  campos: CampoFormulario[];
  valoresIniciais: Partial<T>;
  onSubmit: (valores: T) => Promise<void>;
  onCancel: () => void;
  tituloFormulario: string;
}

export function BaseFormularioCadastro<T>({ ... }: BaseFormularioCadastroProps<T>) {
  // Lógica genérica de formulário
  // Renderiza campos dinamicamente baseado em 'campos'
}
```

### 2. BaseUploadPlanilha.tsx

```typescript
interface BaseUploadPlanilhaProps<T> {
  modeloArquivo: string;           // Nome do arquivo modelo
  colunas: string[];               // Colunas esperadas
  onDadosImportados: (dados: T[]) => void;
  validarDados: (dados: any[]) => ValidationResult;
}

export function BaseUploadPlanilha<T>({ ... }: BaseUploadPlanilhaProps<T>) {
  // Lógica genérica de upload
  // Leitura de Excel com xlsx
  // Validação de colunas
  // Parsing de dados
}
```

### 3. BaseTabelaDados.tsx

```typescript
interface BaseTabelaDadosProps<T> {
  dados: T[];
  colunas: ColunaTabela<T>[];
  acoes: AcaoTabela<T>[];
  filtros: FiltroTabela[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

export function BaseTabelaDados<T>({ ... }: BaseTabelaDadosProps<T>) {
  // Tabela genérica
  // Paginação
  // Ordenação
  // Filtros dinâmicos
  // Ações por linha
}
```

---

## 🔍 PRÓXIMOS PASSOS IMEDIATOS

### Para começar a implementação:

1. **Revisar e aprovar este planejamento**
2. **Definir prioridades** (se houver mudanças)
3. **Executar Fase 0** (preparação)
4. **Criar branch Git** para desenvolvimento
5. **Implementar Fase 1** (Cursos) como piloto

### Checklist de início:

- [ ] Plano aprovado
- [ ] Migration criada e testada
- [ ] Estrutura de pastas criada
- [ ] Bibliotecas instaladas
- [ ] Branch `feature/gestao-dados-escola` criada
- [ ] Primeira implementação (Cursos) iniciada

---

## 📞 DÚVIDAS E DECISÕES PENDENTES

### Decisões Técnicas

1. **Biblioteca de Excel:** Usar `xlsx` (mais leve) ou `exceljs` (mais features)?
   - **Recomendação:** `xlsx` (suficiente para nosso caso)

2. **Envio de emails em lote:** Usar fila (Redis/Bull) ou envio sequencial?
   - **Recomendação:** Sequencial com chunks (mais simples inicialmente)

3. **Validação de CPF:** Fazer validação completa com dígitos verificadores?
   - **Recomendação:** Sim, para garantir dados corretos

4. **Limite de linhas na planilha:** Definir máximo?
   - **Recomendação:** 500 linhas por vez (performance)

### Perguntas para o Cliente

1. Escolas terão limite de usuários cadastrados?
2. Responsável pode ter múltiplos alunos sob sua tutela?
3. Professor pode lecionar em múltiplas escolas?
4. Email deve ser único por CPF ou pode repetir?

---

**✅ DOCUMENTO COMPLETO PARA IMPLEMENTAÇÃO!**

**Total de Páginas:** 📄 ~50 páginas
**Tempo de Leitura:** ~45 minutos
**Complexidade:** Alta
**Prioridade:** Crítica
