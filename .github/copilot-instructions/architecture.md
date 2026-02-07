# Arquitetura do Sistema

## Visão Geral

Plataforma educacional inspirada no Google Classroom com recursos de IA. Backend segue arquitetura **MVC em camadas** com estrita separação de responsabilidades:

```
Controllers → Services → Repositories → Database
     ↓           ↓            ↓
Middlewares   AI Agents    Entities
```

## Responsabilidades das Camadas

### Controllers (`backend/controllers/`)
- **Apenas** manipular requisições/respostas HTTP
- Extrair params/body/query, chamar services, retornar JSON
- Formato de resposta padronizado: `{success: boolean, message: string, data?: any}`
- Métodos padrão: `store`, `index`, `show`, `update`, `destroy`
- Nomenclatura: `*Control` classes
- Log: 🔵 emoji

**Exemplo correto**:
```typescript
async store(request: Request, response: Response, next: NextFunction) {
  try {
    const escolaData = request.body.escola;
    const result = await this.#escolaService.createEscola(escolaData);
    return response.status(201).json({
      success: true,
      message: "Escola criada com sucesso",
      data: result
    });
  } catch (error) {
    next(error);
  }
}
```

### Services (`backend/services/`)
- Implementar **regras de negócio**
- Orquestrar repositórios e coordenar agentes de IA
- **NUNCA** manipular HTTP ou JWT diretamente
- Converter entidades para DTOs antes de retornar
- Nomenclatura: `*Service` classes
- Log: 🟣 emoji

**Exemplo correto**:
```typescript
async createEscola(escolaData: any) {
  // Validar unicidade
  const exists = await this.#escolaDAO.findByNome(escolaData.nome);
  if (exists) {
    throw new ErrorResponse(409, "Escola já existe");
  }
  
  // Criar entidade
  const escola = new Escola();
  escola.setGUID(uuidv4());
  escola.setNome(escolaData.nome);
  
  // Persistir
  await this.#escolaDAO.create(escola);
  
  // Retornar DTO (não a entidade!)
  return {
    guid: escola.getGUID(),
    nome: escola.getNome()
  };
}
```

### Repositories (`backend/repositories/`)
- Nomenclatura: `*DAO` classes
- Executar queries SQL com **parâmetros preparados**
- Mapear linhas do banco para entidades
- Operações CRUD: `create`, `findAll`, `findByGUID`, `update`, `delete`
- Log: 🟢 emoji

**Exemplo correto**:
```typescript
async create(escola: Escola): Promise<void> {
  const SQL = `INSERT INTO escola (EscolaGUID, EscolaNome, EscolaIcone, EscolaCor) 
               VALUES (?, ?, ?, ?)`;
  const params = [
    escola.getGUID(),
    escola.getNome(),
    escola.getIcone(),
    escola.getCor()
  ];
  await this.#database.getPool().execute(SQL, params);
}
```

### Entities (`backend/entities/`)
- Modelos de domínio com campos **privados** (prefixo `#`)
- Getters/setters com validação rigorosa
- Nomenclatura: `*.model.ts`
- Sem lógica de persistência

**Exemplo correto**:
```typescript
export class Escola {
  #guid: string;
  #nome: string;
  #icone: Buffer;
  #cor: string;

  getGUID(): string { return this.#guid; }
  setGUID(guid: string): void {
    if (!guid || guid.trim().length === 0) {
      throw new Error("GUID inválido");
    }
    this.#guid = guid;
  }
  
  // ... outros getters/setters
}
```

### Middlewares (`backend/middlewares/`)
- Validar body/params/query **antes** do controller
- Usar `ErrorResponse` para erros estruturados
- Nomenclatura: `*.middleware.ts`
- Log: 🔷 emoji

**Exemplo correto**:
```typescript
export const validateCreateBody = (req: Request, res: Response, next: NextFunction) => {
  const { escola } = req.body;
  
  if (!escola || !escola.nome) {
    return next(new ErrorResponse(400, "Nome da escola obrigatório"));
  }
  
  if (escola.cor && !/^[0-9A-Fa-f]{6}$/.test(escola.cor)) {
    return next(new ErrorResponse(400, "Cor deve ser hex de 6 caracteres"));
  }
  
  next();
};
```

### AI Layer (`backend/ai/`)
- **Chamados por Services**, nunca por Controllers
- Processar prompts e retornar insights
- Integração com OpenAI/Azure AI
- Focos: planejamento de estudos, análise de desempenho, recomendações
- **Nunca** acessar banco ou manipular HTTP diretamente

## Injeção de Dependências

Todas as classes recebem dependências via construtor:

```typescript
// Em routes/escola.routes.ts
const database = new MysqlDatabase();
const escolaDAO = new EscolaDAO(database);
const escolaService = new EscolaService(escolaDAO);
const escolaControl = new EscolaControl(escolaService);

router.post('/', middleware, escolaControl.store.bind(escolaControl));
```

Log de construção: ⬆️ emoji

## Error Handling

```typescript
import { ErrorResponse } from '../utils/ErrorResponse';

// Lançar erro em Service/DAO/Middleware:
throw new ErrorResponse(404, "Escola não encontrada", { guid: "..." });

// Capturar em Controller:
try {
  // ...
} catch (error) {
  next(error); // Middleware de erro irá processar
}
```

## DTOs para Respostas de API

**Sempre** converter entidades para objetos simples antes de retornar:

```typescript
// ❌ ERRADO (expõe Buffer, métodos privados)
return escola;

// ✅ CORRETO (DTO limpo)
return {
  guid: escola.getGUID(),
  nome: escola.getNome(),
  cor: escola.getCor(),
  icone: escola.getIcone()?.toString('base64') // Converter Buffer para base64
};
```

## Convenções de Nomenclatura

### Backend
- Controllers: `*Control` (ex: `EscolaControl`)
- Services: `*Service` (ex: `EscolaService`)
- Repositories: `*DAO` (ex: `EscolaDAO`)
- Entities: `*.model.ts` (ex: `escola.model.ts`)
- Middlewares: `*.middleware.ts`

### Database
- Notação húngara: `TabelaNomeCampo`
- Exemplo: `EscolaGUID`, `EscolaNome`, `EscolaIcone`, `EscolaCor`

### Métodos
- Create: `store` (controller) / `create` (repository)
- Read All: `index` (controller) / `findAll` (repository)
- Read One: `show` (controller) / `findByGUID` (repository)
- Update: `update` (ambos)
- Delete: `destroy` (controller) / `delete` (repository)
