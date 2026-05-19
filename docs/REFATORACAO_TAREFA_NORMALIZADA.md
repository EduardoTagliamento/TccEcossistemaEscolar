# Refatoração: TarefaAcademica - Modelo Normalizado (N:N)

## 📊 Resumo da Mudança

### ANTES (Modelo Desnormalizado)
```
tarefaacademica
├── TarefaGUID (PK)
├── MatriculaGUID (FK) ❌ Causa duplicação
├── TarefaTitulo (duplicado para cada aluno)
├── TarefaConteudo (duplicado para cada aluno)
├── TarefaFeito
├── TarefaRealizacaoData
└── ... demais campos duplicados

Problema: 1 tarefa para 30 alunos = 30 registros COM DADOS DUPLICADOS
```

### DEPOIS (Modelo Normalizado)
```
tarefaacademica
├── TarefaGUID (PK)
├── TarefaTitulo ✅ Armazenado UMA VEZ
├── TarefaConteudo ✅ Armazenado UMA VEZ
└── ... demais campos únicos

tarefaacademica_matricula (NOVA)
├── TarefaMatriculaGUID (PK)
├── TarefaGUID (FK)
├── MatriculaGUID (FK)
├── TarefaFeito (individual por aluno)
└── TarefaRealizacaoData (individual por aluno)

Solução: 1 tarefa + 30 atribuições = SEM DUPLICAÇÃO
```

## 🔧 Arquivos Modificados

### 1. **Migration SQL** 
📄 `backend/database/migrations/refactor-tarefa-normalized.sql`
- ✅ Cria tabela `tarefaacademica_new` (sem MatriculaGUID, TarefaFeito, TarefaRealizacaoData)
- ✅ Cria tabela `tarefaacademica_matricula` (relacionamento N:N)
- ✅ Migra dados existentes (agrupa tarefas duplicadas)
- ✅ Atualiza FKs em `relacaoanexostarefa`
- ⚠️ **IMPORTANTE**: Faça backup antes de executar!

**Execução**:
```bash
mysql -u root -p railway < backend/database/migrations/refactor-tarefa-normalized.sql
```

### 2. **Entidades**

#### ✅ `backend/entities/tarefaacademica-matricula.model.ts` (NOVO)
```typescript
class TarefaAcademicaMatricula {
  TarefaMatriculaGUID: string;
  TarefaGUID: string;
  MatriculaGUID: string;
  TarefaFeito: boolean;
  TarefaRealizacaoData: Date | null;
}
```

#### ✅ `backend/entities/tarefaacademica.model.ts` (REFATORADO)
**Removido**:
- ❌ `MatriculaGUID`
- ❌ `TarefaFeito`
- ❌ `TarefaRealizacaoData`

**Mantido**:
- ✅ `TarefaGUID`, `matXprofXturxescGUID`
- ✅ `TarefaTitulo`, `TarefaConteudo`
- ✅ `TarefaPostagemData`, `TarefaPrazoData`, `TarefaTipoEntrega`

### 3. **Repositories**

#### ✅ `backend/repositories/tarefaacademica-matricula.repository.ts` (NOVO)
```typescript
class TarefaAcademicaMatriculaDAO {
  create(atribuicao): Promise<TarefaAcademicaMatricula>
  createBatch(atribuicoes[]): Promise<TarefaAcademicaMatricula[]>
  findByTarefa(TarefaGUID): Promise<TarefaAcademicaMatricula[]>
  findByMatricula(MatriculaGUID): Promise<TarefaAcademicaMatricula[]>
  findByTarefaAndMatricula(TarefaGUID, MatriculaGUID): Promise<TarefaAcademicaMatricula | null>
  update(TarefaMatriculaGUID, updates): Promise<TarefaAcademicaMatricula | null>
  delete(TarefaMatriculaGUID): Promise<boolean>
  deleteByTarefa(TarefaGUID): Promise<number>
}
```

#### ✅ `backend/repositories/tarefaacademica.repository.ts` (REFATORADO)
**Mudanças**:
- ❌ `create()` - removido parâmetro `MatriculaGUID`
- ❌ `createBatch()` - marcado como obsoleto (lança erro)
- ❌ `findAll()` - removido filtro `MatriculaGUID` e `TarefaFeito`
- ❌ `update()` - removido campo `TarefaFeito`
- ❌ `mapRowToTarefa()` - não mapeia mais `MatriculaGUID`, `TarefaFeito`, `TarefaRealizacaoData`

### 4. **Services**

#### ✅ `backend/services/tarefaacademica.service.ts` (REFATORADO COMPLETO)

**DTOs Atualizados**:
```typescript
// ANTES
interface TarefaAcademicaDTO {
  MatriculaGUID: string;
  TarefaFeito: boolean;
  TarefaRealizacaoData: string | null;
  // ...
}

// DEPOIS
interface TarefaAcademicaDTO {
  MatriculasAtribuidas: MatriculaAtribuidaDTO[]; // Array de alunos
  // ...
}

interface MatriculaAtribuidaDTO {
  TarefaMatriculaGUID: string;
  MatriculaGUID: string;
  TarefaFeito: boolean;
  TarefaRealizacaoData: string | null;
}
```

**Métodos Refatorados**:

1. **`criarTarefa()`**
   ```typescript
   // ANTES: criava 1 tarefa para 1 aluno
   MatriculaGUID: string

   // DEPOIS: cria 1 tarefa para N alunos
   MatriculasGUID: string[]
   
   // Lógica:
   // 1. Cria tarefa única (TarefaAcademicaDAO)
   // 2. Cria N atribuições (TarefaAcademicaMatriculaDAO.createBatch)
   // 3. Vincula anexos
   ```

2. **`criarTarefasBatch()`**
   ```typescript
   // ANTES: criava N tarefas duplicadas
   // DEPOIS: alias para criarTarefa()
   // Retorna: { tarefas: [tarefa], count: 1 }
   ```

3. **`listarTarefas()`**
   ```typescript
   // ANTES: retornava N registros duplicados
   // DEPOIS: retorna tarefas únicas + MatriculasAtribuidas[]
   ```

4. **`buscarTarefa()`**
   ```typescript
   // ANTES: 1 tarefa = 1 aluno
   // DEPOIS: 1 tarefa = N alunos em MatriculasAtribuidas[]
   ```

5. **`atualizarTarefa()`**
   ```typescript
   // ANTES: atualizava 1 registro
   // DEPOIS: atualiza dados compartilhados (afeta TODOS os alunos)
   // Removido: TarefaFeito (agora é método separado)
   ```

6. **`marcarComoFeito()` (NOVO)**
   ```typescript
   marcarComoFeito(
     TarefaGUID: string,
     MatriculaGUID: string,
     TarefaFeito: boolean
   ): Promise<MatriculaAtribuidaDTO>
   
   // Atualiza status apenas do aluno específico
   // Não afeta outros alunos que receberam a mesma tarefa
   ```

### 5. **Controllers**

#### ✅ `backend/controllers/tarefaacademica.controller.ts` (REFATORADO)

**Endpoints Atualizados**:

```typescript
// POST /api/tarefa
store() {
  // ANTES: esperava { tarefa: { MatriculaGUID, ... } }
  // DEPOIS: espera { tarefa: { MatriculasGUID[], ... } }
}

// POST /api/tarefa/batch
storeBatch() {
  // DEPOIS: retorna { tarefas: [tarefa], count: 1 }
  // (compatibilidade mantida)
}

// GET /api/tarefa?filters
index() {
  // ANTES: filtros MatriculaGUID, TarefaFeito
  // DEPOIS: apenas matXprofXturxescGUID, DataInicio, DataFim
}

// PUT /api/tarefa/:TarefaGUID
update() {
  // Removido: TarefaFeito do body
}

// PATCH /api/tarefa/:TarefaGUID/marcar-feito (NOVO)
marcarComoFeito() {
  // Body: { MatriculaGUID: string, TarefaFeito: boolean }
}
```

### 6. **Middlewares**

#### ✅ `backend/middlewares/tarefaacademica.middleware.ts` (REFATORADO)

```typescript
// validateCreateBody()
// ANTES: valida MatriculaGUID (string)
// DEPOIS: valida MatriculasGUID (array)

// validateBatchCreateBody()
// Mantido (já validava array)

// validateUpdateBody()
// Removido: validação de TarefaFeito

// validateMarcarFeitoBody() (NOVO)
// Valida: { MatriculaGUID: string, TarefaFeito: boolean }
```

### 7. **Routes**

#### ✅ `routes/tarefaacademica.routes.ts` (REFATORADO)

**Mudanças**:
- ✅ Adicionado import `TarefaAcademicaMatriculaDAO`
- ✅ Instanciado `tarefaMatriculaDAO`
- ✅ Passado para `TarefaAcademicaService`
- ✅ Adicionada rota `PATCH /:TarefaGUID/marcar-feito`

## 🎯 Impacto no Frontend

### Formato de Resposta Alterado

#### **GET /api/tarefa** (Lista)
```json
// ANTES (modelo antigo)
{
  "data": {
    "tarefas": [
      {
        "TarefaGUID": "tarefa-1",
        "MatriculaGUID": "aluno-1",
        "TarefaTitulo": "Trabalho de Matemática",
        "TarefaFeito": false
      },
      {
        "TarefaGUID": "tarefa-2", // GUID diferente!
        "MatriculaGUID": "aluno-2",
        "TarefaTitulo": "Trabalho de Matemática", // DUPLICADO
        "TarefaFeito": true
      }
    ]
  }
}

// DEPOIS (modelo normalizado)
{
  "data": {
    "tarefas": [
      {
        "TarefaGUID": "tarefa-1", // ÚNICO
        "TarefaTitulo": "Trabalho de Matemática", // ÚNICO
        "MatriculasAtribuidas": [
          {
            "TarefaMatriculaGUID": "atrib-1",
            "MatriculaGUID": "aluno-1",
            "TarefaFeito": false,
            "TarefaRealizacaoData": null
          },
          {
            "TarefaMatriculaGUID": "atrib-2",
            "MatriculaGUID": "aluno-2",
            "TarefaFeito": true,
            "TarefaRealizacaoData": "2024-01-15T10:30:00Z"
          }
        ]
      }
    ]
  }
}
```

#### **POST /api/tarefa/batch** (Criar)
```json
// Request (ANTES)
{
  "tarefa": {
    "MatriculaGUID": "aluno-1", // ❌ String única
    "TarefaTitulo": "Trabalho"
  }
}

// Request (DEPOIS)
{
  "tarefa": {
    "MatriculasGUID": ["aluno-1", "aluno-2", "aluno-3"], // ✅ Array
    "TarefaTitulo": "Trabalho"
  }
}

// Response (ANTES)
{
  "data": {
    "tarefas": [ /* 3 registros duplicados */ ],
    "count": 3
  }
}

// Response (DEPOIS)
{
  "data": {
    "tarefas": [
      {
        "TarefaGUID": "tarefa-1",
        "TarefaTitulo": "Trabalho",
        "MatriculasAtribuidas": [
          { "MatriculaGUID": "aluno-1", "TarefaFeito": false },
          { "MatriculaGUID": "aluno-2", "TarefaFeito": false },
          { "MatriculaGUID": "aluno-3", "TarefaFeito": false }
        ]
      }
    ],
    "count": 1 // 1 tarefa (não 3)
  }
}
```

### Endpoints Novos no Frontend

```typescript
// NOVO: Marcar tarefa como feita
PATCH /api/tarefa/:TarefaGUID/marcar-feito
Body: { MatriculaGUID: string, TarefaFeito: boolean }
```

## ✅ Benefícios da Refatoração

1. **Sem Duplicação**: Dados da tarefa armazenados UMA VEZ
2. **Professor Edita Facilmente**: Alterar prazo afeta TODOS os alunos automaticamente
3. **Melhor Performance**: Menos registros no banco
4. **Estrutura Correta**: Relacionamento N:N verdadeiro
5. **Escalabilidade**: Funciona bem com turmas grandes (100+ alunos)
6. **Facilita Novas Features**: Exclusão em lote, reatribuição, estatísticas

## ⚠️ Checklist de Deploy

- [ ] 1. Fazer backup completo do banco de dados
- [ ] 2. Executar migration SQL
- [ ] 3. Verificar integridade dos dados (queries no final da migration)
- [ ] 4. Atualizar frontend para novo formato de API
- [ ] 5. Testar criar tarefa para múltiplos alunos
- [ ] 6. Testar editar tarefa (deve afetar todos os alunos)
- [ ] 7. Testar aluno marcar como feito (deve afetar apenas ele)
- [ ] 8. Testar excluir tarefa (CASCADE deve remover atribuições)
- [ ] 9. Validar que anexos continuam funcionando
- [ ] 10. Testar performance com turmas grandes

## 📚 Documentação Adicional

- Migration SQL: `backend/database/migrations/refactor-tarefa-normalized.sql`
- Entity: `backend/entities/tarefaacademica-matricula.model.ts`
- Repository: `backend/repositories/tarefaacademica-matricula.repository.ts`
- Service: `backend/services/tarefaacademica.service.ts`
- Controller: `backend/controllers/tarefaacademica.controller.ts`

---

**Data da Refatoração**: 2024
**Status**: ✅ Backend Completo | 🔄 Frontend Pendente
