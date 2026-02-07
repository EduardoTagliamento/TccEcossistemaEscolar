# Anti-Patterns a Evitar

## ❌ Controllers Acessando Database Diretamente

**ERRADO**:
```typescript
class EscolaControl {
  #database: MysqlDatabase;

  async store(req: Request, res: Response) {
    const SQL = "INSERT INTO escola...";
    await this.#database.getPool().execute(SQL, params); // ❌
  }
}
```

**CORRETO**:
```typescript
class EscolaControl {
  #escolaService: EscolaService;

  async store(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.#escolaService.createEscola(req.body.escola); // ✅
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
```

## ❌ Business Logic em Controllers

**ERRADO**:
```typescript
async store(req: Request, res: Response) {
  const { nome } = req.body.escola;
  
  // Validação de negócio no controller ❌
  const exists = await this.#dao.findByNome(nome);
  if (exists) {
    return res.status(409).json({ error: "Já existe" });
  }
  
  const guid = uuidv4(); // Geração de GUID no controller ❌
  await this.#dao.create({ guid, nome });
}
```

**CORRETO**:
```typescript
// Controller apenas delega
async store(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await this.#service.createEscola(req.body.escola); // ✅
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// Service contém a lógica de negócio
async createEscola(data: any) {
  const exists = await this.#dao.findByNome(data.nome);
  if (exists) throw new ErrorResponse(409, "Escola já existe"); // ✅
  
  const escola = new Escola();
  escola.setGUID(uuidv4()); // ✅
  escola.setNome(data.nome);
  
  await this.#dao.create(escola);
  return this.entityToDTO(escola);
}
```

## ❌ Services Manipulando HTTP

**ERRADO**:
```typescript
class EscolaService {
  async createEscola(req: Request, res: Response) { // ❌ Recebe req/res
    const { nome } = req.body.escola;
    
    const escola = new Escola();
    escola.setGUID(uuidv4());
    escola.setNome(nome);
    
    await this.#dao.create(escola);
    
    return res.json({ success: true }); // ❌ Manipula resposta HTTP
  }
}
```

**CORRETO**:
```typescript
class EscolaService {
  async createEscola(escolaData: any) { // ✅ Recebe dados simples
    const escola = new Escola();
    escola.setGUID(uuidv4());
    escola.setNome(escolaData.nome);
    
    await this.#dao.create(escola);
    
    return this.entityToDTO(escola); // ✅ Retorna DTO
  }
}
```

## ❌ Validação de Requisição em Services

**ERRADO**:
```typescript
// Service validando estrutura de requisição ❌
async createEscola(data: any) {
  if (!data || !data.nome) {
    throw new ErrorResponse(400, "Nome obrigatório na requisição");
  }
  // ...
}
```

**CORRETO**:
```typescript
// Middleware valida requisição ✅
export const validateCreateBody = (req, res, next) => {
  if (!req.body.escola?.nome) {
    return next(new ErrorResponse(400, "Nome obrigatório"));
  }
  next();
};

// Service valida regra de negócio ✅
async createEscola(escolaData: any) {
  if (escolaData.nome.length < 3) {
    throw new ErrorResponse(400, "Nome deve ter no mínimo 3 caracteres");
  }
  // ...
}
```

## ❌ Expor Entidades Diretamente na API

**ERRADO**:
```typescript
async show(req: Request, res: Response) {
  const escola = await this.#service.getEscola(req.params.guid);
  return res.json({ data: escola }); // ❌ Expõe métodos privados, Buffer
}
```

**CORRETO**:
```typescript
// Controller
async show(req: Request, res: Response, next: NextFunction) {
  try {
    const escolaDTO = await this.#service.getEscola(req.params.guid); // ✅ Recebe DTO
    return res.json({ success: true, data: escolaDTO });
  } catch (error) {
    next(error);
  }
}

// Service
async getEscola(guid: string) {
  const escola = await this.#dao.findByGUID(guid);
  if (!escola) throw new ErrorResponse(404, "Não encontrada");
  
  return this.entityToDTO(escola); // ✅ Converte para DTO
}

private entityToDTO(escola: Escola) {
  return {
    guid: escola.getGUID(),
    nome: escola.getNome(),
    cor: escola.getCor(),
    icone: escola.getIcone()?.toString('base64') // ✅ Converte Buffer
  };
}
```

## ❌ SQL Injection (Concatenação de Strings)

**ERRADO**:
```typescript
const SQL = `SELECT * FROM escola WHERE EscolaNome = '${nome}'`; // ❌
await pool.execute(SQL);
```

**CORRETO**:
```typescript
const SQL = `SELECT * FROM escola WHERE EscolaNome = ?`; // ✅
await pool.execute(SQL, [nome]);
```

## ❌ Campos Públicos em Entities

**ERRADO**:
```typescript
class Escola {
  guid: string; // ❌ Público
  nome: string; // ❌ Público
  
  constructor(guid: string, nome: string) {
    this.guid = guid;
    this.nome = nome;
  }
}
```

**CORRETO**:
```typescript
class Escola {
  #guid: string; // ✅ Privado
  #nome: string; // ✅ Privado
  
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
}
```

## ❌ Usar Keyword `private` do TypeScript

**ERRADO**:
```typescript
class Escola {
  private guid: string; // ❌ Não use 'private' keyword
}
```

**CORRETO**:
```typescript
class Escola {
  #guid: string; // ✅ Use sintaxe # para privado
}
```

## ❌ Esquecer `bind()` nas Rotas

**ERRADO**:
```typescript
router.post('/', controller.store); // ❌ Perde contexto 'this'
```

**CORRETO**:
```typescript
router.post('/', controller.store.bind(controller)); // ✅ Preserva 'this'
```

## ❌ Não Tratar Erros em Controllers

**ERRADO**:
```typescript
async store(req: Request, res: Response) {
  const result = await this.#service.create(req.body); // ❌ Sem try/catch
  return res.json({ data: result });
}
```

**CORRETO**:
```typescript
async store(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await this.#service.create(req.body);
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error); // ✅ Passa para middleware de erro
  }
}
```

## ❌ Validação de JWT em Services

**ERRADO**:
```typescript
// Service verificando token ❌
async createEscola(token: string, data: any) {
  const decoded = jwt.verify(token, SECRET);
  // ...
}
```

**CORRETO**:
```typescript
// Middleware de autenticação verifica token ✅
export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next(new ErrorResponse(401, "Token não fornecido"));
  
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    next(new ErrorResponse(401, "Token inválido"));
  }
};

// Rota usa middleware ✅
router.post('/', authenticate, controller.store);

// Service apenas recebe dados de usuário se necessário ✅
async createEscola(escolaData: any, userGUID?: string) {
  // ...
}
```

## ❌ Promises com `.then()/.catch()`

**ERRADO**:
```typescript
store(req: Request, res: Response) {
  this.#service.create(req.body)
    .then(result => res.json({ data: result })) // ❌
    .catch(error => res.status(500).json({ error })); // ❌
}
```

**CORRETO**:
```typescript
async store(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await this.#service.create(req.body); // ✅
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error); // ✅
  }
}
```

## ❌ Lógica de Persistência em Services

**ERRADO**:
```typescript
// Service com SQL direto ❌
async createEscola(data: any) {
  const SQL = "INSERT INTO escola...";
  await this.#database.getPool().execute(SQL, params);
}
```

**CORRETO**:
```typescript
// Service delega para DAO ✅
async createEscola(data: any) {
  const escola = new Escola();
  escola.setGUID(uuidv4());
  escola.setNome(data.nome);
  
  await this.#dao.create(escola); // ✅ DAO faz persistência
  
  return this.entityToDTO(escola);
}
```

## ❌ AI Agents Acessando Database

**ERRADO**:
```typescript
class StudyPlannerAgent {
  #database: MysqlDatabase;
  
  async generatePlan(studentGUID: string) {
    const SQL = "SELECT * FROM student..."; // ❌
    const [rows] = await this.#database.getPool().execute(SQL, [studentGUID]);
    // ...
  }
}
```

**CORRETO**:
```typescript
// Service coordena AI e DAO ✅
class StudentService {
  #studentDAO: StudentDAO;
  #studyPlannerAgent: StudyPlannerAgent;
  
  async generateStudyPlan(studentGUID: string) {
    const student = await this.#studentDAO.findByGUID(studentGUID); // ✅
    const studentData = this.entityToDTO(student);
    
    const plan = await this.#studyPlannerAgent.generatePlan(studentData); // ✅
    
    return plan;
  }
}
```
