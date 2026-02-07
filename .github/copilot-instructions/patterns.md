# Padrões de Desenvolvimento

## Campos Privados

Use sintaxe `#` para encapsulamento (não `private` do TypeScript):

```typescript
// ✅ CORRETO
class Escola {
  #guid: string;
  #nome: string;

  getGUID(): string { return this.#guid; }
  setGUID(guid: string): void {
    if (!guid) throw new Error("GUID obrigatório");
    this.#guid = guid;
  }
}

// ❌ ERRADO
class Escola {
  private guid: string; // Não use 'private' keyword
  nome: string; // Não exponha campos públicos
}
```

## Validação

### Em Middlewares
Valide estrutura da requisição:

```typescript
export const validateCreateBody = (req: Request, res: Response, next: NextFunction) => {
  const { escola } = req.body;
  
  if (!escola?.nome?.trim()) {
    return next(new ErrorResponse(400, "Nome obrigatório"));
  }
  
  next();
};
```

### Em Entities
Valide valores de domínio:

```typescript
setCor(cor: string): void {
  if (!/^[0-9A-Fa-f]{6}$/.test(cor)) {
    throw new Error("Cor deve ser hex de 6 caracteres");
  }
  this.#cor = cor.toUpperCase();
}
```

### Em Services
Valide regras de negócio:

```typescript
async createEscola(data: any) {
  // Unicidade
  const exists = await this.#escolaDAO.findByNome(data.nome);
  if (exists) {
    throw new ErrorResponse(409, "Escola já cadastrada");
  }
  
  // Continuar...
}
```

## Logging com Emojis

Para identificação visual de camadas:

```typescript
// ⬆️ Constructors
constructor(service: EscolaService) {
  console.log("⬆️ EscolaControl constructor");
  this.#escolaService = service;
}

// 🔵 Controllers
async store(req: Request, res: Response, next: NextFunction) {
  console.log("🔵 EscolaControl.store");
  // ...
}

// 🟣 Services
async createEscola(data: any) {
  console.log("🟣 EscolaService.createEscola");
  // ...
}

// 🟢 DAOs/Repositories
async create(escola: Escola) {
  console.log("🟢 EscolaDAO.create");
  // ...
}

// 🔷 Middlewares
export const validateCreateBody = (req, res, next) => {
  console.log("🔷 validateCreateBody");
  // ...
}
```

## Error Handling

### Estrutura do ErrorResponse

```typescript
// backend/utils/ErrorResponse.ts
export class ErrorResponse extends Error {
  statusCode: number;
  details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
```

### Uso em Diferentes Camadas

```typescript
// Middleware
if (!valid) {
  return next(new ErrorResponse(400, "Dados inválidos"));
}

// Service
if (!found) {
  throw new ErrorResponse(404, "Recurso não encontrado", { guid });
}

// Controller
try {
  const result = await this.#service.method();
  return res.json({ success: true, data: result });
} catch (error) {
  next(error); // Será tratado pelo middleware de erro
}
```

### Middleware de Erro (Global)

```typescript
// Em server.ts
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Erro interno do servidor";
  
  res.status(statusCode).json({
    success: false,
    message,
    details: error.details,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});
```

## DTOs (Data Transfer Objects)

**Sempre** converter entidades para DTOs antes de expor na API:

```typescript
// ❌ ERRADO
async show(req: Request, res: Response, next: NextFunction) {
  const escola = await this.#service.getEscola(req.params.guid);
  return res.json({ success: true, data: escola }); // Expõe métodos, Buffer
}

// ✅ CORRETO
async show(req: Request, res: Response, next: NextFunction) {
  const escolaDTO = await this.#service.getEscola(req.params.guid);
  return res.json({ success: true, data: escolaDTO }); // DTO limpo
}

// No Service:
async getEscola(guid: string) {
  const escola = await this.#escolaDAO.findByGUID(guid);
  if (!escola) throw new ErrorResponse(404, "Escola não encontrada");
  
  return this.entityToDTO(escola);
}

private entityToDTO(escola: Escola) {
  return {
    guid: escola.getGUID(),
    nome: escola.getNome(),
    cor: escola.getCor(),
    icone: escola.getIcone()?.toString('base64')
  };
}
```

## Rotas RESTful

### Estrutura Padrão

```typescript
import { Router } from 'express';

const router = Router();

// Criar
router.post('/', middleware.validate, controller.store);

// Listar todos
router.get('/', controller.index);

// Buscar por ID
router.get('/:guid', middleware.validateGUID, controller.show);

// Atualizar
router.put('/:guid', middleware.validateUpdate, controller.update);

// Deletar
router.delete('/:guid', middleware.validateGUID, controller.destroy);

export default router;
```

### Bind de Contexto

```typescript
// ✅ CORRETO - Bind necessário para preservar 'this'
router.post('/', controller.store.bind(controller));

// ❌ ERRADO - Perde contexto do 'this'
router.post('/', controller.store);
```

## Injeção de Dependências

Sempre de cima para baixo:

```typescript
// routes/escola.routes.ts
import { MysqlDatabase } from '../backend/database/MysqlDatabase';
import { EscolaDAO } from '../backend/repositories/escola.repository';
import { EscolaService } from '../backend/services/escola.service';
import { EscolaControl } from '../backend/controllers/escola.controller';

const database = new MysqlDatabase();
const escolaDAO = new EscolaDAO(database);
const escolaService = new EscolaService(escolaDAO);
const escolaControl = new EscolaControl(escolaService);

const router = Router();
router.post('/', escolaControl.store.bind(escolaControl));
```

## Async/Await

Sempre use async/await, nunca `.then()/.catch()`:

```typescript
// ✅ CORRETO
async store(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await this.#service.createEscola(req.body.escola);
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ❌ ERRADO
store(req: Request, res: Response, next: NextFunction) {
  this.#service.createEscola(req.body.escola)
    .then(result => res.json({ success: true, data: result }))
    .catch(error => next(error));
}
```

## TypeScript Types

```typescript
// Para rows do mysql2
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const [rows] = await pool.execute<RowDataPacket[]>(SQL, params);
const [result] = await pool.execute<ResultSetHeader>(SQL, params);
```

## UUID Generation

```typescript
import { v4 as uuidv4 } from 'uuid';

const guid = uuidv4(); // Ex: "550e8400-e29b-41d4-a716-446655440000"
```
