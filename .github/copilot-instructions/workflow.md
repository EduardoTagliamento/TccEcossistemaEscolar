# Workflow de Desenvolvimento

## Adicionando Novas Features

Siga esta ordem para manter a arquitetura consistente:

### 1. Criar Entity (`backend/entities/`)

```typescript
// backend/entities/turma.model.ts
export class Turma {
  #guid: string;
  #nome: string;
  #escolaGUID: string;
  #anoLetivo: number;

  // Getters e Setters com validação
  getGUID(): string { return this.#guid; }
  setGUID(guid: string): void {
    if (!guid) throw new Error("GUID obrigatório");
    this.#guid = guid;
  }

  getNome(): string { return this.#nome; }
  setNome(nome: string): void {
    if (!nome?.trim()) throw new Error("Nome obrigatório");
    this.#nome = nome.trim();
  }

  // ... outros getters/setters
}
```

### 2. Criar SQL Schema (`backend/database/sql.txt`)

```sql
CREATE TABLE turma (
  TurmaGUID CHAR(36) PRIMARY KEY,
  TurmaNome VARCHAR(100) NOT NULL,
  TurmaEscolaGUID CHAR(36) NOT NULL,
  TurmaAnoLetivo YEAR NOT NULL,
  FOREIGN KEY (TurmaEscolaGUID) REFERENCES escola(EscolaGUID),
  UNIQUE KEY (TurmaNome, TurmaEscolaGUID, TurmaAnoLetivo)
);
```

### 3. Criar Repository/DAO (`backend/repositories/`)

```typescript
// backend/repositories/turma.repository.ts
import { MysqlDatabase } from '../database/MysqlDatabase';
import { Turma } from '../entities/turma.model';
import { RowDataPacket } from 'mysql2';

export class TurmaDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log("⬆️ TurmaDAO constructor");
    this.#database = database;
  }

  async create(turma: Turma): Promise<void> {
    console.log("🟢 TurmaDAO.create");
    const SQL = `INSERT INTO turma (TurmaGUID, TurmaNome, TurmaEscolaGUID, TurmaAnoLetivo)
                 VALUES (?, ?, ?, ?)`;
    const params = [
      turma.getGUID(),
      turma.getNome(),
      turma.getEscolaGUID(),
      turma.getAnoLetivo()
    ];
    await this.#database.getPool().execute(SQL, params);
  }

  async findByGUID(guid: string): Promise<Turma | null> {
    console.log("🟢 TurmaDAO.findByGUID");
    const SQL = `SELECT * FROM turma WHERE TurmaGUID = ?`;
    const [rows] = await this.#database.getPool()
      .execute<RowDataPacket[]>(SQL, [guid]);
    
    if (rows.length === 0) return null;
    return this.mapRowToEntity(rows[0]);
  }

  async findAll(): Promise<Turma[]> {
    console.log("🟢 TurmaDAO.findAll");
    const SQL = `SELECT * FROM turma ORDER BY TurmaNome`;
    const [rows] = await this.#database.getPool()
      .execute<RowDataPacket[]>(SQL);
    
    return rows.map(row => this.mapRowToEntity(row));
  }

  private mapRowToEntity(row: RowDataPacket): Turma {
    const turma = new Turma();
    turma.setGUID(row.TurmaGUID);
    turma.setNome(row.TurmaNome);
    turma.setEscolaGUID(row.TurmaEscolaGUID);
    turma.setAnoLetivo(row.TurmaAnoLetivo);
    return turma;
  }
}
```

### 4. Criar Service (`backend/services/`)

```typescript
// backend/services/turma.service.ts
import { TurmaDAO } from '../repositories/turma.repository';
import { Turma } from '../entities/turma.model';
import { ErrorResponse } from '../utils/ErrorResponse';
import { v4 as uuidv4 } from 'uuid';

export class TurmaService {
  #turmaDAO: TurmaDAO;

  constructor(turmaDAO: TurmaDAO) {
    console.log("⬆️ TurmaService constructor");
    this.#turmaDAO = turmaDAO;
  }

  async createTurma(turmaData: any) {
    console.log("🟣 TurmaService.createTurma");
    
    // Validar se escola existe (se necessário)
    // ...

    // Criar entidade
    const turma = new Turma();
    turma.setGUID(uuidv4());
    turma.setNome(turmaData.nome);
    turma.setEscolaGUID(turmaData.escolaGUID);
    turma.setAnoLetivo(turmaData.anoLetivo);

    // Persistir
    await this.#turmaDAO.create(turma);

    // Retornar DTO
    return this.entityToDTO(turma);
  }

  async getTurma(guid: string) {
    console.log("🟣 TurmaService.getTurma");
    const turma = await this.#turmaDAO.findByGUID(guid);
    
    if (!turma) {
      throw new ErrorResponse(404, "Turma não encontrada", { guid });
    }

    return this.entityToDTO(turma);
  }

  async listTurmas() {
    console.log("🟣 TurmaService.listTurmas");
    const turmas = await this.#turmaDAO.findAll();
    return turmas.map(t => this.entityToDTO(t));
  }

  private entityToDTO(turma: Turma) {
    return {
      guid: turma.getGUID(),
      nome: turma.getNome(),
      escolaGUID: turma.getEscolaGUID(),
      anoLetivo: turma.getAnoLetivo()
    };
  }
}
```

### 5. Criar Middleware (`backend/middlewares/`)

```typescript
// backend/middlewares/turma.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../utils/ErrorResponse';

export const validateCreateBody = (req: Request, res: Response, next: NextFunction) => {
  console.log("🔷 turma.middleware.validateCreateBody");
  
  const { turma } = req.body;

  if (!turma) {
    return next(new ErrorResponse(400, "Objeto 'turma' obrigatório"));
  }

  if (!turma.nome?.trim()) {
    return next(new ErrorResponse(400, "Nome da turma obrigatório"));
  }

  if (!turma.escolaGUID) {
    return next(new ErrorResponse(400, "GUID da escola obrigatório"));
  }

  if (!turma.anoLetivo || turma.anoLetivo < 2000 || turma.anoLetivo > 2100) {
    return next(new ErrorResponse(400, "Ano letivo inválido"));
  }

  next();
};

export const validateGUID = (req: Request, res: Response, next: NextFunction) => {
  console.log("🔷 turma.middleware.validateGUID");
  
  const { guid } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(guid)) {
    return next(new ErrorResponse(400, "GUID inválido"));
  }

  next();
};
```

### 6. Criar Controller (`backend/controllers/`)

```typescript
// backend/controllers/turma.controller.ts
import { Request, Response, NextFunction } from 'express';
import { TurmaService } from '../services/turma.service';

export class TurmaControl {
  #turmaService: TurmaService;

  constructor(turmaService: TurmaService) {
    console.log("⬆️ TurmaControl constructor");
    this.#turmaService = turmaService;
  }

  async store(request: Request, response: Response, next: NextFunction) {
    console.log("🔵 TurmaControl.store");
    try {
      const turmaData = request.body.turma;
      const result = await this.#turmaService.createTurma(turmaData);
      
      return response.status(201).json({
        success: true,
        message: "Turma criada com sucesso",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async index(request: Request, response: Response, next: NextFunction) {
    console.log("🔵 TurmaControl.index");
    try {
      const turmas = await this.#turmaService.listTurmas();
      
      return response.status(200).json({
        success: true,
        message: "Turmas listadas com sucesso",
        data: turmas
      });
    } catch (error) {
      next(error);
    }
  }

  async show(request: Request, response: Response, next: NextFunction) {
    console.log("🔵 TurmaControl.show");
    try {
      const { guid } = request.params;
      const turma = await this.#turmaService.getTurma(guid);
      
      return response.status(200).json({
        success: true,
        message: "Turma encontrada",
        data: turma
      });
    } catch (error) {
      next(error);
    }
  }

  // update() e destroy() seguem padrão similar
}
```

### 7. Configurar Rotas (`routes/`)

```typescript
// routes/turma.routes.ts
import { Router } from 'express';
import { MysqlDatabase } from '../backend/database/MysqlDatabase';
import { TurmaDAO } from '../backend/repositories/turma.repository';
import { TurmaService } from '../backend/services/turma.service';
import { TurmaControl } from '../backend/controllers/turma.controller';
import * as turmaMiddleware from '../backend/middlewares/turma.middleware';

// Injeção de dependências
const database = new MysqlDatabase();
const turmaDAO = new TurmaDAO(database);
const turmaService = new TurmaService(turmaDAO);
const turmaControl = new TurmaControl(turmaService);

const router = Router();

// Rotas
router.post('/', 
  turmaMiddleware.validateCreateBody,
  turmaControl.store.bind(turmaControl)
);

router.get('/', 
  turmaControl.index.bind(turmaControl)
);

router.get('/:guid', 
  turmaMiddleware.validateGUID,
  turmaControl.show.bind(turmaControl)
);

// PUT e DELETE seguem padrão similar

export default router;
```

### 8. Registrar no Server (`backend/server.ts`)

```typescript
import turmaRoutes from '../routes/turma.routes';

app.use('/api/turma', turmaRoutes);
```

## Checklist de Implementação

- [ ] Entity criada com campos privados (`#`) e validação
- [ ] Schema SQL adicionado a `database/sql.txt`
- [ ] DAO implementado com métodos CRUD
- [ ] Service com regras de negócio e conversão para DTO
- [ ] Middleware de validação de requisições
- [ ] Controller com métodos RESTful (store, index, show, update, destroy)
- [ ] Rotas configuradas com injeção de dependências
- [ ] Rotas registradas no server
- [ ] Logs com emojis em todas as camadas
- [ ] ErrorResponse usado para tratamento de erros
- [ ] Bind aplicado nos métodos do controller

## Testes Manuais com cURL/Postman

```bash
# Criar
curl -X POST http://localhost:3000/api/turma \
  -H "Content-Type: application/json" \
  -d '{"turma": {"nome": "3º Ano A", "escolaGUID": "...", "anoLetivo": 2024}}'

# Listar
curl http://localhost:3000/api/turma

# Buscar por GUID
curl http://localhost:3000/api/turma/{guid}

# Atualizar
curl -X PUT http://localhost:3000/api/turma/{guid} \
  -H "Content-Type: application/json" \
  -d '{"turma": {"nome": "3º Ano B"}}'

# Deletar
curl -X DELETE http://localhost:3000/api/turma/{guid}
```

## Documentação

Após implementar, documente em:
- `docs/routes/README.md`: Endpoints da API
- `docs/features/README.md`: Descrição da feature
