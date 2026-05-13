# 📋 PLANO DE IMPLEMENTAÇÃO - Módulos Acadêmicos

**Data:** 12/05/2026  
**Ordem de Implementação:** Matéria → Curso → Turma → Matrícula → Professor  
**Status:** Planejamento Executável

---

## 🎯 VISÃO GERAL

### Objetivo
Implementar 5 módulos acadêmicos completos (CRUD + validações) seguindo o padrão MVC + Service já estabelecido no projeto.

### Dependências de Implementação
```
1. Matéria (independente)
2. Curso (depende de: alteração em Escola)
3. Turma (depende de: Curso)
4. Matrícula (depende de: Turma)
5. Professor (depende de: Matéria, Turma)
```

### Estimativa de Tempo
- **Matéria:** 4-6 horas
- **Curso:** 4-6 horas
- **Turma:** 6-8 horas (mais complexa)
- **Matrícula:** 8-10 horas (inclui transferência)
- **Professor:** 6-8 horas (alocação docente)
- **TOTAL:** 28-38 horas (~4-5 dias de trabalho)

---

## 📦 PRÉ-REQUISITOS

### ✅ Antes de Começar

#### 1. Executar Migration no Banco
```sql
-- 1. Alterar tabela escola
ALTER TABLE `tccecossistemaescolar`.`escola`
ADD COLUMN `EscolaIsTecnica` BOOLEAN NOT NULL DEFAULT FALSE AFTER `EscolaStatus`,
ADD INDEX `idx_escola_is_tecnica` (`EscolaIsTecnica`);

-- 2-6. Executar CREATEs das 5 tabelas (conforme documento)
```

#### 2. Adicionar Função "Direção" (6)
```sql
INSERT INTO `tccecossistemaescolar`.`funcao` (`FuncaoId`, `FuncaoNome`) 
VALUES (6, 'Direcao')
ON DUPLICATE KEY UPDATE `FuncaoNome` = VALUES(`FuncaoNome`);
```

#### 3. Atualizar Model de Escola
```typescript
// backend/entities/escola.model.ts
export interface Escola {
  // ... campos existentes ...
  EscolaIsTecnica: boolean;  // ← ADICIONAR
}
```

---

## 🔧 FASE 1: MATÉRIA (4-6h)

### Ordem de Criação de Arquivos:

#### 1.1 Entity (15 min)
**Arquivo:** `backend/entities/materia.model.ts`

```typescript
export interface Materia {
  MateriaGUID: string;
  EscolaGUID: string;
  MateriaNome: string;
  MateriaIsTecnico: boolean;
  MateriaStatus: 'Ativa' | 'Inativa';
  MateriaCreatedAt: Date;
  MateriaUpdatedAt: Date;
}
```

**Validações:**
- MateriaGUID: UUID v4
- EscolaGUID: UUID v4, deve existir
- MateriaNome: 3-100 chars, trim
- MateriaIsTecnico: boolean
- MateriaStatus: enum

---

#### 1.2 Repository (1-1.5h)
**Arquivo:** `backend/repositories/materia.repository.ts`

**Métodos Obrigatórios:**
```typescript
class MateriaDAO {
  // CRUD básico
  async create(materia: Materia): Promise<Materia>
  async findAll(filters: MateriaFilters): Promise<Materia[]>
  async findById(guid: string): Promise<Materia | null>
  async update(guid: string, materia: Partial<Materia>): Promise<Materia>
  async delete(guid: string): Promise<boolean>
  
  // Consultas auxiliares
  async findByEscolaAndNome(escolaGUID: string, nome: string): Promise<Materia | null>
  async countByEscola(escolaGUID: string): Promise<number>
}
```

**Queries SQL:**
```sql
-- CREATE
INSERT INTO materia (MateriaGUID, EscolaGUID, MateriaNome, MateriaIsTecnico, MateriaStatus) 
VALUES (?, ?, ?, ?, ?)

-- FIND ALL (com filtros opcionais)
SELECT * FROM materia 
WHERE 1=1
  AND (? IS NULL OR EscolaGUID = ?)
  AND (? IS NULL OR MateriaStatus = ?)
  AND (? IS NULL OR MateriaIsTecnico = ?)
ORDER BY MateriaNome ASC

-- FIND BY ID
SELECT * FROM materia WHERE MateriaGUID = ?

-- UPDATE
UPDATE materia 
SET MateriaNome = ?, MateriaIsTecnico = ?, MateriaStatus = ?, MateriaUpdatedAt = CURRENT_TIMESTAMP
WHERE MateriaGUID = ?

-- DELETE (soft delete recomendado)
UPDATE materia SET MateriaStatus = 'Inativa' WHERE MateriaGUID = ?

-- FIND BY ESCOLA AND NOME (validar duplicidade)
SELECT * FROM materia WHERE EscolaGUID = ? AND MateriaNome = ? LIMIT 1
```

---

#### 1.3 Service (1.5-2h)
**Arquivo:** `backend/services/materia.service.ts`

**Dependências:**
```typescript
import { MateriaDAO } from '../repositories/materia.repository';
import { EscolaDAO } from '../repositories/escola.repository';
import { ErrorResponse } from '../utils/ErrorResponse';
import { v4 as uuidv4 } from 'uuid';
```

**Regras de Negócio:**
```typescript
class MateriaService {
  constructor(
    private materiaDAO: MateriaDAO,
    private escolaDAO: EscolaDAO
  ) {}

  // CREATE
  async criarMateria(data: MateriaCreateDTO, usuarioCPF: string) {
    // 1. Validar permissão (Coordenação ou Direção)
    await this.validarPermissaoEscrita(usuarioCPF, data.EscolaGUID);
    
    // 2. Validar existência da escola
    const escola = await this.escolaDAO.findById(data.EscolaGUID);
    if (!escola) throw new ErrorResponse('Escola não encontrada', 404);
    
    // 3. Validar se matéria técnica requer escola técnica
    if (data.MateriaIsTecnico && !escola.EscolaIsTecnica) {
      throw new ErrorResponse(
        'Matéria técnica só pode ser criada em escola técnica',
        400
      );
    }
    
    // 4. Validar duplicidade de nome
    const existente = await this.materiaDAO.findByEscolaAndNome(
      data.EscolaGUID,
      data.MateriaNome.trim()
    );
    if (existente) {
      throw new ErrorResponse('Já existe matéria com este nome nesta escola', 409);
    }
    
    // 5. Gerar GUID e criar
    const materia: Materia = {
      MateriaGUID: uuidv4(),
      EscolaGUID: data.EscolaGUID,
      MateriaNome: data.MateriaNome.trim(),
      MateriaIsTecnico: data.MateriaIsTecnico,
      MateriaStatus: data.MateriaStatus || 'Ativa',
      MateriaCreatedAt: new Date(),
      MateriaUpdatedAt: new Date()
    };
    
    return await this.materiaDAO.create(materia);
  }
  
  // INDEX (GET com filtros)
  async listarMaterias(filters: MateriaFilters) {
    // Qualquer usuário autenticado pode listar
    return await this.materiaDAO.findAll(filters);
  }
  
  // SHOW (GET por ID)
  async buscarMateria(guid: string) {
    const materia = await this.materiaDAO.findById(guid);
    if (!materia) throw new ErrorResponse('Matéria não encontrada', 404);
    return materia;
  }
  
  // UPDATE
  async atualizarMateria(guid: string, data: MateriaUpdateDTO, usuarioCPF: string) {
    // 1. Buscar matéria
    const materia = await this.buscarMateria(guid);
    
    // 2. Validar permissão
    await this.validarPermissaoEscrita(usuarioCPF, materia.EscolaGUID);
    
    // 3. Se mudou nome, validar duplicidade
    if (data.MateriaNome && data.MateriaNome !== materia.MateriaNome) {
      const existente = await this.materiaDAO.findByEscolaAndNome(
        materia.EscolaGUID,
        data.MateriaNome.trim()
      );
      if (existente && existente.MateriaGUID !== guid) {
        throw new ErrorResponse('Já existe matéria com este nome', 409);
      }
    }
    
    // 4. Se mudou para técnica, validar escola técnica
    if (data.MateriaIsTecnico) {
      const escola = await this.escolaDAO.findById(materia.EscolaGUID);
      if (!escola?.EscolaIsTecnica) {
        throw new ErrorResponse('Escola não é técnica', 400);
      }
    }
    
    // 5. Atualizar
    return await this.materiaDAO.update(guid, data);
  }
  
  // DELETE (soft delete)
  async excluirMateria(guid: string, usuarioCPF: string) {
    const materia = await this.buscarMateria(guid);
    await this.validarPermissaoEscrita(usuarioCPF, materia.EscolaGUID);
    return await this.materiaDAO.delete(guid);
  }
  
  // Helper: validar permissão de escrita
  private async validarPermissaoEscrita(cpf: string, escolaGUID: string) {
    // Query em escolaxusuarioxfuncao
    // Validar FuncaoId = 1 (Coordenação) ou 6 (Direção)
    // Se não tiver, throw ErrorResponse('Sem permissão', 403)
  }
}
```

---

#### 1.4 Middleware (30 min)
**Arquivo:** `backend/middlewares/materia.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../utils/ErrorResponse';

export class MateriaMiddleware {
  // Validar body do POST
  static validarCriacao(req: Request, res: Response, next: NextFunction) {
    const { EscolaGUID, MateriaNome, MateriaIsTecnico } = req.body.materia || {};
    
    if (!EscolaGUID || !MateriaNome) {
      return next(new ErrorResponse('Campos obrigatórios faltando', 400));
    }
    
    if (typeof MateriaIsTecnico !== 'boolean') {
      return next(new ErrorResponse('MateriaIsTecnico deve ser boolean', 400));
    }
    
    if (MateriaNome.length < 3 || MateriaNome.length > 100) {
      return next(new ErrorResponse('Nome deve ter 3-100 caracteres', 400));
    }
    
    next();
  }
  
  // Validar GUID no param
  static validarGUID(req: Request, res: Response, next: NextFunction) {
    const { guid } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(guid)) {
      return next(new ErrorResponse('GUID inválido', 400));
    }
    
    next();
  }
}
```

---

#### 1.5 Controller (1h)
**Arquivo:** `backend/controllers/materia.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { MateriaService } from '../services/materia.service';

export class MateriaController {
  constructor(private materiaService: MateriaService) {}
  
  // POST /api/materia
  store = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = req.usuario?.UsuarioCPF; // do AuthMiddleware
      const materia = await this.materiaService.criarMateria(req.body.materia, usuarioCPF);
      
      return res.status(201).json({
        success: true,
        message: 'Matéria criada com sucesso',
        data: { materia }
      });
    } catch (error) {
      next(error);
    }
  };
  
  // GET /api/materia?EscolaGUID=&MateriaStatus=&MateriaIsTecnico=
  index = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        EscolaGUID: req.query.EscolaGUID as string,
        MateriaStatus: req.query.MateriaStatus as 'Ativa' | 'Inativa',
        MateriaIsTecnico: req.query.MateriaIsTecnico === 'true'
      };
      
      const materias = await this.materiaService.listarMaterias(filters);
      
      return res.json({
        success: true,
        message: 'Matérias listadas',
        data: { materias, total: materias.length }
      });
    } catch (error) {
      next(error);
    }
  };
  
  // GET /api/materia/:guid
  show = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const materia = await this.materiaService.buscarMateria(req.params.guid);
      
      return res.json({
        success: true,
        message: 'Matéria encontrada',
        data: { materia }
      });
    } catch (error) {
      next(error);
    }
  };
  
  // PUT /api/materia/:guid
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = req.usuario?.UsuarioCPF;
      const materia = await this.materiaService.atualizarMateria(
        req.params.guid,
        req.body.materia,
        usuarioCPF
      );
      
      return res.json({
        success: true,
        message: 'Matéria atualizada',
        data: { materia }
      });
    } catch (error) {
      next(error);
    }
  };
  
  // DELETE /api/materia/:guid
  destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = req.usuario?.UsuarioCPF;
      await this.materiaService.excluirMateria(req.params.guid, usuarioCPF);
      
      return res.json({
        success: true,
        message: 'Matéria excluída',
        data: null
      });
    } catch (error) {
      next(error);
    }
  };
}
```

---

#### 1.6 Routes (30 min)
**Arquivo:** `routes/materia.routes.ts`

```typescript
import { Router } from 'express';
import { MateriaController } from '../backend/controllers/materia.controller';
import { MateriaService } from '../backend/services/materia.service';
import { MateriaDAO } from '../backend/repositories/materia.repository';
import { EscolaDAO } from '../backend/repositories/escola.repository';
import { MateriaMiddleware } from '../backend/middlewares/materia.middleware';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';
import { MysqlDatabase } from '../backend/database/MysqlDatabase';

class MateriaRoutes {
  #router: Router;
  #controller: MateriaController;
  
  constructor() {
    this.#router = Router();
    
    // Inicializar dependências
    const db = MysqlDatabase.getInstance();
    const materiaDAO = new MateriaDAO(db);
    const escolaDAO = new EscolaDAO(db);
    const materiaService = new MateriaService(materiaDAO, escolaDAO);
    this.#controller = new MateriaController(materiaService);
    
    this.#setupRoutes();
  }
  
  #setupRoutes() {
    // Todas as rotas requerem autenticação
    this.#router.use(AuthMiddleware.verificarToken);
    
    // POST /api/materia
    this.#router.post(
      '/',
      MateriaMiddleware.validarCriacao,
      this.#controller.store
    );
    
    // GET /api/materia
    this.#router.get('/', this.#controller.index);
    
    // GET /api/materia/:guid
    this.#router.get(
      '/:guid',
      MateriaMiddleware.validarGUID,
      this.#controller.show
    );
    
    // PUT /api/materia/:guid
    this.#router.put(
      '/:guid',
      MateriaMiddleware.validarGUID,
      this.#controller.update
    );
    
    // DELETE /api/materia/:guid
    this.#router.delete(
      '/:guid',
      MateriaMiddleware.validarGUID,
      this.#controller.destroy
    );
  }
  
  getRouter() {
    return this.#router;
  }
}

export default new MateriaRoutes().getRouter();
```

---

#### 1.7 Registrar no Server (5 min)
**Arquivo:** `backend/Server.ts`

```typescript
// Importar
import materiaRoutes from '../routes/materia.routes';

// Registrar (no método setupRoutes)
this.#app.use('/api/materia', materiaRoutes);
```

---

### ✅ Checklist Fase 1 - Matéria

- [ ] Migration executada (tabela `materia` criada)
- [ ] Entity criada (`materia.model.ts`)
- [ ] Repository implementado com 7 métodos
- [ ] Service com 5 métodos + validações
- [ ] Middleware de validação
- [ ] Controller com 5 endpoints
- [ ] Routes configuradas
- [ ] Rotas registradas no Server.ts
- [ ] **Teste:** POST criar matéria
- [ ] **Teste:** GET listar matérias
- [ ] **Teste:** GET buscar por GUID
- [ ] **Teste:** PUT atualizar matéria
- [ ] **Teste:** DELETE excluir matéria
- [ ] **Teste:** Erro ao criar matéria técnica em escola não-técnica
- [ ] **Teste:** Erro ao duplicar nome de matéria

---

## 🔧 FASE 2: CURSO (4-6h)

### Diferenças da Fase 1:
- Validação adicional: `EscolaIsTecnica` deve ser `TRUE`
- Sem campo `IsTecnico` (cursos são sempre técnicos)

### Ordem de Criação (mesmo padrão):

#### 2.1 Entity
**Arquivo:** `backend/entities/curso.model.ts`

```typescript
export interface Curso {
  CursoGUID: string;
  EscolaGUID: string;
  CursoNome: string;
  CursoStatus: 'Ativo' | 'Inativo';
  CursoCreatedAt: Date;
  CursoUpdatedAt: Date;
}
```

#### 2.2 Repository
**Arquivo:** `backend/repositories/curso.repository.ts`

**Métodos:** Igual Matéria  
**Queries:** Substituir `materia` por `curso`

#### 2.3 Service
**Arquivo:** `backend/services/curso.service.ts`

**Regra ADICIONAL:**
```typescript
// No CREATE
const escola = await this.escolaDAO.findById(data.EscolaGUID);
if (!escola?.EscolaIsTecnica) {
  throw new ErrorResponse(
    'Cursos só podem ser criados em escolas técnicas',
    400
  );
}
```

#### 2.4 Middleware
**Arquivo:** `backend/middlewares/curso.middleware.ts`

#### 2.5 Controller
**Arquivo:** `backend/controllers/curso.controller.ts`

#### 2.6 Routes
**Arquivo:** `routes/curso.routes.ts`

#### 2.7 Registrar
**Arquivo:** `backend/Server.ts`
```typescript
this.#app.use('/api/curso', cursoRoutes);
```

---

### ✅ Checklist Fase 2 - Curso

- [ ] Migration executada (tabela `curso` criada)
- [ ] Entity criada
- [ ] Repository implementado
- [ ] Service com validação `EscolaIsTecnica`
- [ ] Middleware de validação
- [ ] Controller com 5 endpoints
- [ ] Routes configuradas
- [ ] Rotas registradas
- [ ] **Teste:** Erro ao criar curso em escola não-técnica
- [ ] **Teste:** CRUD completo funcional

---

## 🔧 FASE 3: TURMA (6-8h)

### Complexidade Adicional:
- Relacionamento com `Curso` (OPCIONAL)
- Validações cruzadas com `EscolaIsTecnica`
- UNIQUE KEY composto: `(EscolaGUID, TurmaSerie, TurmaNome)`

### Ordem de Criação:

#### 3.1 Entity
**Arquivo:** `backend/entities/turma.model.ts`

```typescript
export interface Turma {
  TurmaGUID: string;
  EscolaGUID: string;
  TurmaSerie: string;
  TurmaNome: string;
  TurmaIsTecnico: boolean;
  CursoGUID: string | null;  // ← NULLABLE
  TurmaStatus: 'Ativa' | 'Inativa' | 'Encerrada';
  TurmaCreatedAt: Date;
  TurmaUpdatedAt: Date;
}
```

#### 3.2 Repository
**Arquivo:** `backend/repositories/turma.repository.ts`

**Consultas Adicionais:**
```typescript
async findByEscolaSerieNome(
  escolaGUID: string,
  serie: string,
  nome: string
): Promise<Turma | null>

async findByEscolaAndCurso(
  escolaGUID: string,
  cursoGUID: string
): Promise<Turma[]>
```

#### 3.3 Service
**Arquivo:** `backend/services/turma.service.ts`

**Dependências:**
```typescript
import { CursoDAO } from '../repositories/curso.repository';
```

**Regras de Negócio COMPLEXAS:**
```typescript
async criarTurma(data: TurmaCreateDTO, usuarioCPF: string) {
  // 1. Validar permissão
  await this.validarPermissaoEscrita(usuarioCPF, data.EscolaGUID);
  
  // 2. Buscar escola
  const escola = await this.escolaDAO.findById(data.EscolaGUID);
  if (!escola) throw new ErrorResponse('Escola não encontrada', 404);
  
  // 3. Validar turma técnica em escola não-técnica
  if (data.TurmaIsTecnico && !escola.EscolaIsTecnica) {
    throw new ErrorResponse(
      'Turma técnica só pode ser criada em escola técnica',
      400
    );
  }
  
  // 4. Se escola não-técnica, forçar valores
  if (!escola.EscolaIsTecnica) {
    data.TurmaIsTecnico = false;
    data.CursoGUID = null;
  }
  
  // 5. Se informou curso, validar
  if (data.CursoGUID) {
    const curso = await this.cursoDAO.findById(data.CursoGUID);
    if (!curso) throw new ErrorResponse('Curso não encontrado', 404);
    
    if (curso.EscolaGUID !== data.EscolaGUID) {
      throw new ErrorResponse('Curso não pertence a esta escola', 400);
    }
  }
  
  // 6. Validar duplicidade (escola + série + nome)
  const existente = await this.turmaDAO.findByEscolaSerieNome(
    data.EscolaGUID,
    data.TurmaSerie,
    data.TurmaNome
  );
  if (existente) {
    throw new ErrorResponse('Turma já existe com essa série e nome', 409);
  }
  
  // 7. Criar
  const turma: Turma = {
    TurmaGUID: uuidv4(),
    EscolaGUID: data.EscolaGUID,
    TurmaSerie: data.TurmaSerie.trim(),
    TurmaNome: data.TurmaNome.trim(),
    TurmaIsTecnico: data.TurmaIsTecnico,
    CursoGUID: data.CursoGUID || null,
    TurmaStatus: data.TurmaStatus || 'Ativa',
    TurmaCreatedAt: new Date(),
    TurmaUpdatedAt: new Date()
  };
  
  return await this.turmaDAO.create(turma);
}
```

#### 3.4 Middleware
**Arquivo:** `backend/middlewares/turma.middleware.ts`

**Validações:**
- TurmaSerie: 1-12 chars
- TurmaNome: 2-256 chars
- TurmaIsTecnico: boolean
- CursoGUID: UUID ou null

#### 3.5 Controller
**Arquivo:** `backend/controllers/turma.controller.ts`

#### 3.6 Routes
**Arquivo:** `routes/turma.routes.ts`

#### 3.7 Registrar
```typescript
this.#app.use('/api/turma', turmaRoutes);
```

---

### ✅ Checklist Fase 3 - Turma

- [ ] Migration executada (tabela `turma` criada)
- [ ] Entity com CursoGUID nullable
- [ ] Repository com consultas adicionais
- [ ] Service com validações complexas
- [ ] Middleware de validação
- [ ] Controller com 5 endpoints
- [ ] Routes configuradas
- [ ] Rotas registradas
- [ ] **Teste:** Criar turma normal em escola normal
- [ ] **Teste:** Criar turma técnica em escola técnica
- [ ] **Teste:** Erro: turma técnica em escola normal
- [ ] **Teste:** Turma técnica SEM curso (deve permitir)
- [ ] **Teste:** Turma técnica COM curso
- [ ] **Teste:** Erro: curso de outra escola
- [ ] **Teste:** Erro: duplicar série+nome

---

## 🔧 FASE 4: MATRÍCULA (8-10h)

### Complexidade MÁXIMA:
- `MatriculaGUID` aceita RA customizado OU UUID
- Validação de matrícula ativa única
- **Endpoint de Transferência** (transacional)

### Ordem de Criação:

#### 4.1 Entity
**Arquivo:** `backend/entities/matricula.model.ts`

```typescript
export interface Matricula {
  MatriculaGUID: string;  // ← Pode ser RA customizado
  UsuarioCPF: string;
  TurmaGUID: string;
  MatriculaDataEntrada: Date;
  MatriculaDataSaida: Date | null;
  MatriculaStatus: 'Ativa' | 'Transferida' | 'Concluida' | 'Cancelada';
  MatriculaCreatedAt: Date;
  MatriculaUpdatedAt: Date;
}
```

#### 4.2 Repository
**Arquivo:** `backend/repositories/matricula.repository.ts`

**Consultas ESPECIAIS:**
```typescript
// Buscar matrícula ativa do aluno
async findMatriculaAtivaByUsuario(cpf: string): Promise<Matricula | null> {
  const query = `
    SELECT * FROM matricula 
    WHERE UsuarioCPF = ? 
      AND MatriculaStatus = 'Ativa'
    ORDER BY MatriculaDataEntrada DESC
    LIMIT 1
  `;
  // ...
}

// Histórico completo do aluno
async findHistoricoByUsuario(cpf: string): Promise<Matricula[]> {
  const query = `
    SELECT m.*, t.TurmaNome, t.TurmaSerie, e.EscolaNome
    FROM matricula m
    JOIN turma t ON m.TurmaGUID = t.TurmaGUID
    JOIN escola e ON t.EscolaGUID = e.EscolaGUID
    WHERE m.UsuarioCPF = ?
    ORDER BY m.MatriculaDataEntrada DESC
  `;
  // ...
}

// Buscar por turma (listar alunos)
async findByTurma(turmaGUID: string): Promise<Matricula[]>
```

#### 4.3 Service
**Arquivo:** `backend/services/matricula.service.ts`

**Método CREATE:**
```typescript
async criarMatricula(data: MatriculaCreateDTO, usuarioCPF: string) {
  // 1. Validar permissão
  const turma = await this.turmaDAO.findById(data.TurmaGUID);
  if (!turma) throw new ErrorResponse('Turma não encontrada', 404);
  
  await this.validarPermissaoEscrita(usuarioCPF, turma.EscolaGUID);
  
  // 2. Validar usuário aluno
  const usuario = await this.usuarioDAO.findByCPF(data.UsuarioCPF);
  if (!usuario) throw new ErrorResponse('Usuário não encontrado', 404);
  
  // 3. Validar se já tem matrícula ativa
  const matriculaAtiva = await this.matriculaDAO.findMatriculaAtivaByUsuario(
    data.UsuarioCPF
  );
  if (matriculaAtiva) {
    throw new ErrorResponse(
      'Aluno já possui matrícula ativa. Use transferência.',
      409
    );
  }
  
  // 4. MatriculaGUID: usar fornecido OU gerar UUID
  const matriculaGUID = data.MatriculaGUID?.trim() || uuidv4();
  
  // 5. Criar
  const matricula: Matricula = {
    MatriculaGUID: matriculaGUID,
    UsuarioCPF: data.UsuarioCPF,
    TurmaGUID: data.TurmaGUID,
    MatriculaDataEntrada: data.MatriculaDataEntrada || new Date(),
    MatriculaDataSaida: null,
    MatriculaStatus: 'Ativa',
    MatriculaCreatedAt: new Date(),
    MatriculaUpdatedAt: new Date()
  };
  
  return await this.matriculaDAO.create(matricula);
}
```

**Método TRANSFERÊNCIA (CRÍTICO):**
```typescript
async transferirAluno(data: TransferenciaDTO, usuarioCPF: string) {
  const connection = await this.db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 1. Validar turma origem
    const turmaOrigem = await this.turmaDAO.findById(data.TurmaOrigemGUID);
    if (!turmaOrigem) throw new ErrorResponse('Turma origem não encontrada', 404);
    
    // 2. Validar turma destino
    const turmaDestino = await this.turmaDAO.findById(data.TurmaDestinoGUID);
    if (!turmaDestino) throw new ErrorResponse('Turma destino não encontrada', 404);
    
    // 3. Validar permissão (na escola de origem)
    await this.validarPermissaoEscrita(usuarioCPF, turmaOrigem.EscolaGUID);
    
    // 4. Buscar matrícula ativa na turma origem
    const query = `
      SELECT * FROM matricula 
      WHERE UsuarioCPF = ? 
        AND TurmaGUID = ? 
        AND MatriculaStatus = 'Ativa'
      LIMIT 1
    `;
    const [matriculas] = await connection.execute(query, [
      data.UsuarioCPF,
      data.TurmaOrigemGUID
    ]);
    
    if (!Array.isArray(matriculas) || matriculas.length === 0) {
      throw new ErrorResponse('Matrícula ativa não encontrada', 404);
    }
    
    const matriculaOrigem = matriculas[0];
    
    // 5. Encerrar matrícula origem
    await connection.execute(
      `UPDATE matricula 
       SET MatriculaStatus = 'Transferida',
           MatriculaDataSaida = ?,
           MatriculaUpdatedAt = CURRENT_TIMESTAMP
       WHERE MatriculaGUID = ?`,
      [data.DataTransferencia, matriculaOrigem.MatriculaGUID]
    );
    
    // 6. Criar nova matrícula no destino
    const novaMatricula: Matricula = {
      MatriculaGUID: uuidv4(),  // Sempre gera novo UUID na transferência
      UsuarioCPF: data.UsuarioCPF,
      TurmaGUID: data.TurmaDestinoGUID,
      MatriculaDataEntrada: data.DataTransferencia,
      MatriculaDataSaida: null,
      MatriculaStatus: 'Ativa',
      MatriculaCreatedAt: new Date(),
      MatriculaUpdatedAt: new Date()
    };
    
    await connection.execute(
      `INSERT INTO matricula 
       (MatriculaGUID, UsuarioCPF, TurmaGUID, MatriculaDataEntrada, 
        MatriculaStatus, MatriculaCreatedAt, MatriculaUpdatedAt)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        novaMatricula.MatriculaGUID,
        novaMatricula.UsuarioCPF,
        novaMatricula.TurmaGUID,
        novaMatricula.MatriculaDataEntrada,
        novaMatricula.MatriculaStatus
      ]
    );
    
    await connection.commit();
    
    return {
      matriculaAnterior: matriculaOrigem,
      matriculaNova: novaMatricula
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```

#### 4.4 Middleware
**Arquivo:** `backend/middlewares/matricula.middleware.ts`

**Validações:**
- MatriculaGUID: opcional, se fornecido: 1-36 chars alfanumérico
- UsuarioCPF: formato válido
- TurmaGUID: UUID válido
- MatriculaDataEntrada: data válida

#### 4.5 Controller
**Arquivo:** `backend/controllers/matricula.controller.ts`

**Endpoints:**
```typescript
// POST /api/matricula
store

// GET /api/matricula?UsuarioCPF=&TurmaGUID=&MatriculaStatus=
index

// GET /api/matricula/:guid
show

// PUT /api/matricula/:guid
update

// DELETE /api/matricula/:guid
destroy

// POST /api/matricula/transferir  ← NOVO
transferir = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarioCPF = req.usuario?.UsuarioCPF;
    const resultado = await this.matriculaService.transferirAluno(
      req.body.transferencia,
      usuarioCPF
    );
    
    return res.json({
      success: true,
      message: 'Transferência realizada com sucesso',
      data: resultado
    });
  } catch (error) {
    next(error);
  }
};
```

#### 4.6 Routes
**Arquivo:** `routes/matricula.routes.ts`

```typescript
// POST /api/matricula/transferir (ANTES das rotas com :guid)
this.#router.post(
  '/transferir',
  MatriculaMiddleware.validarTransferencia,
  this.#controller.transferir
);
```

#### 4.7 Registrar
```typescript
this.#app.use('/api/matricula', matriculaRoutes);
```

---

### ✅ Checklist Fase 4 - Matrícula

- [ ] Migration executada (tabela `matricula` criada)
- [ ] Entity com MatriculaGUID string livre
- [ ] Repository com consultas de histórico
- [ ] Service com CREATE + validação de RA
- [ ] Service com método `transferirAluno` transacional
- [ ] Middleware para criar e transferir
- [ ] Controller com 6 endpoints (incluindo transferir)
- [ ] Routes com endpoint `/transferir`
- [ ] Rotas registradas
- [ ] **Teste:** Criar matrícula SEM RA (gera UUID)
- [ ] **Teste:** Criar matrícula COM RA customizado
- [ ] **Teste:** Erro ao ter 2 matrículas ativas
- [ ] **Teste:** Transferência entre turmas (transação)
- [ ] **Teste:** Rollback em erro de transferência
- [ ] **Teste:** Histórico completo do aluno

---

## 🔧 FASE 5: PROFESSOR (6-8h)

### Abordagem DIFERENTE:
- Não é um CRUD tradicional
- **Professores são usuários** com vínculo em `escolaxusuarioxfuncao`
- **Alocação** usa tabela `materiaxprofessorxturma`

### Ordem de Criação:

#### 5.1 Entity
**Arquivo:** `backend/entities/materiaxprofessorxturma.model.ts`

```typescript
export interface MaterialProfessorTurma {
  MatProfTurGUID: string;
  MateriaGUID: string;
  TurmaGUID: string;
  UsuarioCPF: string;
  AlocacaoStatus: 'Ativa' | 'Inativa';
  AlocacaoCreatedAt: Date;
  AlocacaoUpdatedAt: Date;
}
```

#### 5.2 Repository
**Arquivo:** `backend/repositories/materiaxprofessorxturma.repository.ts`

**Consultas ESPECIAIS:**
```typescript
// Buscar alocações do professor
async findByProfessor(cpf: string): Promise<MaterialProfessorTurma[]>

// Buscar alocações da turma
async findByTurma(turmaGUID: string): Promise<MaterialProfessorTurma[]>

// Validar duplicidade
async findByMateriaTurmaProfessor(
  materiaGUID: string,
  turmaGUID: string,
  cpf: string
): Promise<MaterialProfessorTurma | null>

// Listar professores de uma escola (JOIN com usuario + escolaxusuarioxfuncao)
async findProfessoresByEscola(escolaGUID: string): Promise<Usuario[]> {
  const query = `
    SELECT DISTINCT u.*
    FROM usuario u
    JOIN escolaxusuarioxfuncao euf ON u.UsuarioCPF = euf.UsuarioCPF
    WHERE euf.EscolaGUID = ? 
      AND euf.FuncaoId = 3
      AND euf.Status = 'Ativo'
      AND u.UsuarioStatus = 'Ativo'
    ORDER BY u.UsuarioNome ASC
  `;
  // ...
}
```

#### 5.3 Service
**Arquivo:** `backend/services/professor.service.ts`

**Métodos:**
```typescript
class ProfessorService {
  // Listar professores da escola
  async listarProfessores(escolaGUID: string) {
    return await this.alocacaoDAO.findProfessoresByEscola(escolaGUID);
  }
  
  // Buscar alocações do professor em uma escola
  async buscarAlocacoesProfessor(cpf: string, escolaGUID: string) {
    // 1. Verificar se é professor na escola
    const vinculo = await this.escolaUsuarioFuncaoDAO.findByUsuarioEscolaFuncao(
      cpf,
      escolaGUID,
      3  // FuncaoId Professor
    );
    
    if (!vinculo) {
      throw new ErrorResponse('Usuário não é professor nesta escola', 404);
    }
    
    // 2. Buscar alocações
    const alocacoes = await this.alocacaoDAO.findByProfessor(cpf);
    
    // 3. Filtrar apenas da escola
    return alocacoes.filter(async (alocacao) => {
      const turma = await this.turmaDAO.findById(alocacao.TurmaGUID);
      return turma?.EscolaGUID === escolaGUID;
    });
  }
  
  // Criar alocação (professor em matéria+turma)
  async criarAlocacao(data: AlocacaoCreateDTO, usuarioCPF: string) {
    // 1. Buscar turma
    const turma = await this.turmaDAO.findById(data.TurmaGUID);
    if (!turma) throw new ErrorResponse('Turma não encontrada', 404);
    
    // 2. Validar permissão de quem está alocando
    await this.validarPermissaoEscrita(usuarioCPF, turma.EscolaGUID);
    
    // 3. Buscar matéria
    const materia = await this.materiaDAO.findById(data.MateriaGUID);
    if (!materia) throw new ErrorResponse('Matéria não encontrada', 404);
    
    // 4. Validar que matéria e turma são da mesma escola
    if (materia.EscolaGUID !== turma.EscolaGUID) {
      throw new ErrorResponse('Matéria e turma de escolas diferentes', 400);
    }
    
    // 5. Validar que usuário é professor na escola
    const vinculo = await this.escolaUsuarioFuncaoDAO.findByUsuarioEscolaFuncao(
      data.UsuarioCPF,
      turma.EscolaGUID,
      3  // FuncaoId Professor
    );
    
    if (!vinculo || vinculo.Status !== 'Ativo') {
      throw new ErrorResponse('Usuário não é professor ativo nesta escola', 403);
    }
    
    // 6. Validar duplicidade
    const existente = await this.alocacaoDAO.findByMateriaTurmaProfessor(
      data.MateriaGUID,
      data.TurmaGUID,
      data.UsuarioCPF
    );
    
    if (existente) {
      throw new ErrorResponse('Professor já alocado nesta matéria e turma', 409);
    }
    
    // 7. Criar
    const alocacao: MaterialProfessorTurma = {
      MatProfTurGUID: uuidv4(),
      MateriaGUID: data.MateriaGUID,
      TurmaGUID: data.TurmaGUID,
      UsuarioCPF: data.UsuarioCPF,
      AlocacaoStatus: data.AlocacaoStatus || 'Ativa',
      AlocacaoCreatedAt: new Date(),
      AlocacaoUpdatedAt: new Date()
    };
    
    return await this.alocacaoDAO.create(alocacao);
  }
  
  // Atualizar alocação (apenas status)
  async atualizarAlocacao(guid: string, data: AlocacaoUpdateDTO, usuarioCPF: string)
  
  // Excluir alocação
  async excluirAlocacao(guid: string, usuarioCPF: string)
}
```

#### 5.4 Middleware
**Arquivo:** `backend/middlewares/professor.middleware.ts`

#### 5.5 Controller
**Arquivo:** `backend/controllers/professor.controller.ts`

**Endpoints:**
```typescript
// GET /api/professor?EscolaGUID=
listarProfessores

// GET /api/professor/:cpf/escolas/:escolaGUID/alocacoes
buscarAlocacoes

// POST /api/professor/alocacao
criarAlocacao

// PUT /api/professor/alocacao/:guid
atualizarAlocacao

// DELETE /api/professor/alocacao/:guid
excluirAlocacao
```

#### 5.6 Routes
**Arquivo:** `routes/professor.routes.ts`

```typescript
// GET /api/professor?EscolaGUID=
this.#router.get('/', this.#controller.listarProfessores);

// GET /api/professor/:cpf/escolas/:escolaGUID/alocacoes
this.#router.get(
  '/:cpf/escolas/:escolaGUID/alocacoes',
  this.#controller.buscarAlocacoes
);

// POST /api/professor/alocacao
this.#router.post(
  '/alocacao',
  ProfessorMiddleware.validarAlocacao,
  this.#controller.criarAlocacao
);

// PUT /api/professor/alocacao/:guid
this.#router.put(
  '/alocacao/:guid',
  ProfessorMiddleware.validarGUID,
  this.#controller.atualizarAlocacao
);

// DELETE /api/professor/alocacao/:guid
this.#router.delete(
  '/alocacao/:guid',
  ProfessorMiddleware.validarGUID,
  this.#controller.excluirAlocacao
);
```

#### 5.7 Registrar
```typescript
this.#app.use('/api/professor', professorRoutes);
```

---

### ✅ Checklist Fase 5 - Professor

- [ ] Migration executada (tabela `materiaxprofessorxturma` criada)
- [ ] Entity criada
- [ ] Repository com consultas de professores por escola
- [ ] Service com validações de vínculo
- [ ] Middleware de validação
- [ ] Controller com 5 endpoints
- [ ] Routes configuradas
- [ ] Rotas registradas
- [ ] **Teste:** Listar professores da escola
- [ ] **Teste:** Buscar alocações de um professor
- [ ] **Teste:** Criar alocação
- [ ] **Teste:** Erro: alocar usuário sem vínculo de professor
- [ ] **Teste:** Erro: matéria e turma de escolas diferentes
- [ ] **Teste:** Erro: duplicar alocação

---

## 📊 RESUMO FINAL

### Arquivos Criados (35 arquivos)

| Módulo    | Entity | Repo | Service | Middleware | Controller | Routes | TOTAL |
|-----------|--------|------|---------|------------|------------|--------|-------|
| Matéria   | 1      | 1    | 1       | 1          | 1          | 1      | 6     |
| Curso     | 1      | 1    | 1       | 1          | 1          | 1      | 6     |
| Turma     | 1      | 1    | 1       | 1          | 1          | 1      | 6     |
| Matrícula | 1      | 1    | 1       | 1          | 1          | 1      | 6     |
| Professor | 1      | 1    | 1       | 1          | 1          | 1      | 6     |
| **TOTAL** | **5**  | **5**| **5**   | **5**      | **5**      | **5**  | **30**|

**Alterações:**
- 1 alteração em `escola.model.ts` (+1 campo)
- 5 registros em `Server.ts` (+5 rotas)

---

## 🎯 ESTRATÉGIA DE IMPLEMENTAÇÃO

### Abordagem Incremental:
1. **Completar 100% de uma fase antes de passar para a próxima**
2. Testar cada endpoint após implementação
3. Validar todas as regras de negócio
4. Documentar casos de erro encontrados

### Sequência de Testes por Fase:

#### Após Matéria:
```bash
# POST criar matéria
POST http://localhost:3000/api/materia
{
  "materia": {
    "EscolaGUID": "uuid-escola",
    "MateriaNome": "Matemática",
    "MateriaIsTecnico": false,
    "MateriaStatus": "Ativa"
  }
}

# GET listar
GET http://localhost:3000/api/materia?EscolaGUID=uuid-escola

# PUT atualizar
PUT http://localhost:3000/api/materia/:guid
```

#### Após Curso:
```bash
# Testar em escola técnica e não-técnica
POST http://localhost:3000/api/curso
```

#### Após Turma:
```bash
# Testar: normal, técnica, com curso, sem curso
POST http://localhost:3000/api/turma
```

#### Após Matrícula:
```bash
# Testar: com RA, sem RA, transferência
POST http://localhost:3000/api/matricula
POST http://localhost:3000/api/matricula/transferir
```

#### Após Professor:
```bash
# Testar: listar, alocar, validações
GET http://localhost:3000/api/professor?EscolaGUID=
POST http://localhost:3000/api/professor/alocacao
```

---

## ⚠️ PONTOS DE ATENÇÃO

### Armadilhas Comuns:

1. **Matéria:**
   - ❌ Esquecer validação `MateriaIsTecnico` vs `EscolaIsTecnica`
   - ❌ Não validar duplicidade de nome por escola

2. **Curso:**
   - ❌ Permitir criar curso em escola não-técnica
   - ❌ Não bloquear acesso às rotas quando escola não é técnica

3. **Turma:**
   - ❌ Não aceitar `CursoGUID = null` (é opcional!)
   - ❌ Validar curso de outra escola
   - ❌ Esquecer validação da chave única composta

4. **Matrícula:**
   - ❌ Forçar MatriculaGUID como UUID (deve aceitar RA!)
   - ❌ Não implementar transação na transferência
   - ❌ Esquecer rollback em erro

5. **Professor:**
   - ❌ Achar que é CRUD de usuário (não é!)
   - ❌ Não validar vínculo em `escolaxusuarioxfuncao`
   - ❌ Permitir alocar matéria e turma de escolas diferentes

---

## 📝 DOCUMENTAÇÃO RECOMENDADA

Após completar cada fase, criar arquivo:

- `docs/routes/materia-api.md`
- `docs/routes/curso-api.md`
- `docs/routes/turma-api.md`
- `docs/routes/matricula-api.md`
- `docs/routes/professor-api.md`

**Template:**
```markdown
# API de [Módulo]

## Autenticação
JWT obrigatório em todas as rotas

## Autorização
- GET: Qualquer usuário autenticado
- POST/PUT/DELETE: Coordenação (1) ou Direção (6)

## Endpoints

### POST /api/[modulo]
Criar novo registro...

### GET /api/[modulo]
Listar com filtros...
```

---

## ✅ CHECKLIST GERAL FINAL

### Preparação:
- [ ] Migration executada (6 tabelas)
- [ ] Função Direção (6) criada
- [ ] Model Escola atualizada

### Fase 1 - Matéria:
- [ ] 6 arquivos criados
- [ ] 5 endpoints testados
- [ ] Documentação criada

### Fase 2 - Curso:
- [ ] 6 arquivos criados
- [ ] 5 endpoints testados
- [ ] Documentação criada

### Fase 3 - Turma:
- [ ] 6 arquivos criados
- [ ] 5 endpoints testados
- [ ] Casos complexos testados
- [ ] Documentação criada

### Fase 4 - Matrícula:
- [ ] 6 arquivos criados
- [ ] 6 endpoints testados (incluindo transferir)
- [ ] Transação testada com rollback
- [ ] Documentação criada

### Fase 5 - Professor:
- [ ] 6 arquivos criados
- [ ] 5 endpoints testados
- [ ] Alocações validadas
- [ ] Documentação criada

### Finalização:
- [ ] Todas as 5 rotas registradas em Server.ts
- [ ] README atualizado com novos módulos
- [ ] STATUS_DO_PROJETO.md atualizado
- [ ] Testes integrados executados

---

## 🚀 PRÓXIMOS PASSOS (Pós-Implementação)

### Após completar as 5 fases:

1. **Criar seeds de exemplo:**
   - Matérias padrão (Português, Matemática, etc)
   - Cursos técnicos exemplo
   - Turmas demo

2. **Criar API de Alunos** (opcional):
   - GET `/api/aluno?EscolaGUID=&TurmaGUID=`
   - GET `/api/aluno/:cpf/historico-matriculas`
   - Delega para endpoints de matrícula

3. **Dashboard acadêmico:**
   - Estatísticas de matrícula
   - Professores por escola
   - Turmas ativas

4. **Relatórios:**
   - Alunos por turma
   - Professores por matéria
   - Histórico escolar

---

**Boa implementação! 🎓**
