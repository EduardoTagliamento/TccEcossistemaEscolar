# Copilot Instructions — Ecossistema Escolar (Bauá)

Plataforma educacional completa (inspirada no Google Classroom), desenvolvida como TCC.
Backend Node.js + Express + TypeScript + MySQL; frontend Next.js 14 + React 18 + TypeScript.

---

## Stack Tecnológico

| Camada      | Tecnologia                                        |
|-------------|---------------------------------------------------|
| Runtime     | Node.js 18+ · TypeScript 5.x                     |
| HTTP        | Express 4.x                                       |
| Banco       | MySQL 8 via `mysql2` (pool de conexões)           |
| Auth        | JWT (`jsonwebtoken`) · bcrypt (10 salt rounds)    |
| Email       | Resend SDK                                        |
| Upload      | Multer (PNG/JPG, máx 1 MB)                        |
| Cron        | node-cron                                         |
| UUID        | `uuid` v4                                         |
| Frontend    | Next.js 14.2 · React 18.3 · TypeScript            |
| Planilhas   | xlsx (importação de dados)                        |

---

## Arquitetura: MVC em Camadas Estritas

```
Request → Middleware → Controller → Service → DAO → Database
            (valida)    (HTTP)      (negócio)  (SQL)
                                       ↓
                                   Entities (domínio)
```

**Regra de ouro:** cada camada só conhece a camada imediatamente abaixo dela.

---

## Estrutura de Pastas

```
backend/
  controllers/     # *Control.ts         🔵
  services/        # *.service.ts        🟣
  repositories/    # *.repository.ts     🟢  (classes *DAO)
  entities/        # *.model.ts          (domínio)
  middlewares/     # *.middleware.ts     🔷
  auth/            # JWT middleware
  guards/          # Autorização por papel
  database/        # MysqlDatabase.ts, sql.txt
  utils/           # ErrorResponse.ts, JwtService.ts
  external/        # Resend, Brevo (email)
  ai/              # Agentes de IA (futuros)
  scripts/         # Utilitários avulsos

routes/            # DI wiring + registro de rotas
frontend/
  pages/           # Next.js pages
  components/      # Componentes reutilizáveis
  hooks/           # Custom hooks
  utils/           # Validadores (CPF, email, senha, telefone)
  types/           # TypeScript types
  styles/          # CSS global e por componente
  public/          # Assets estáticos

docs/              # Documentação de API
uploads/logos/     # Logos enviados pelas escolas
```

---

## Convenções de Nomenclatura

### Classes e Arquivos

| Camada      | Classe        | Arquivo                    |
|-------------|---------------|----------------------------|
| Controller  | `*Control`    | `*.controller.ts`          |
| Service     | `*Service`    | `*.service.ts`             |
| DAO         | `*DAO`        | `*.repository.ts`          |
| Entity      | nome domínio  | `*.model.ts`               |
| Middleware  | `*Middleware` | `*.middleware.ts`          |
| Router      | `*Roteador`   | `*.routes.ts`              |

### Métodos CRUD

| Operação    | Controller | DAO              |
|-------------|------------|------------------|
| Criar       | `store`    | `create`         |
| Listar      | `index`    | `findAll`        |
| Buscar      | `show`     | `findByGUID`     |
| Atualizar   | `update`   | `update`         |
| Deletar     | `destroy`  | `delete`         |

### Banco de Dados — Notação Húngara

Todos os campos seguem `TabelaNomeCampo`:

```
EscolaGUID     EscolaNome      EscolaStatus
UsuarioCPF     UsuarioEmail    UsuarioCreatedAt
TurmaGUID      TurmaSerie      TurmaCreatedAt
```

- GUIDs: sufixo `*GUID` · tipo `CHAR(36)` · UUID v4
- Status: strings em português — `"Ativa"/"Inativa"`, `"Ativo"/"Inativo"`, `"Bloqueado"`
- Datas: `*CreatedAt`, `*UpdatedAt` · tipo `DATETIME`/`TIMESTAMP`
- Imagens: `BLOB`/`LONGBLOB`
- Cores: `CHAR(6)` — hex sem `#` (ex: `"FF5733"`)
- Booleanos: `TINYINT(1)` ou enum em string

---

## Entities — Encapsulamento com `#`

**Regra:** sempre usar `#` do JavaScript (nunca `private` do TypeScript).  
Campos nomeados igual à coluna do banco. Getters/setters como **propriedades** TypeScript.

```typescript
// backend/entities/escola.model.ts
export class Escola {
  #EscolaGUID!: string;
  #EscolaNome: string | null = null;
  #EscolaStatus: string | null = null;
  #EscolaIcone: Buffer | null = null;
  #EscolaCreatedAt: Date | null = null;

  get EscolaGUID(): string { return this.#EscolaGUID; }
  set EscolaGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "")
      throw new Error("EscolaGUID deve ser uma string não vazia.");
    if (value.length !== 36)
      throw new Error("EscolaGUID deve ter 36 caracteres.");
    this.#EscolaGUID = value.trim();
  }

  get EscolaNome(): string | null { return this.#EscolaNome; }
  set EscolaNome(value: string | null) {
    if (value !== null) {
      if (typeof value !== "string" || value.trim() === "")
        throw new Error("EscolaNome inválido.");
      this.#EscolaNome = value.trim();
    } else {
      this.#EscolaNome = null;
    }
  }

  get EscolaIcone(): Buffer | null { return this.#EscolaIcone; }
  set EscolaIcone(value: Buffer | null) { this.#EscolaIcone = value; }

  get EscolaCreatedAt(): Date | null { return this.#EscolaCreatedAt; }
  set EscolaCreatedAt(value: Date | null) { this.#EscolaCreatedAt = value; }
}
```

Setters **validam e normalizam** (trim, uppercase, etc.) — nunca atribuem sem validar.

---

## DTOs — Nunca Expor Entidades na API

Converter para DTO no Service antes de retornar ao Controller.

```typescript
// Conversões obrigatórias:
// Buffer  → base64 string
// Date    → ISO string via .toISOString()
// campos privados → omitidos

private toDTO(escola: Escola): EscolaDTO {
  return {
    EscolaGUID:      escola.EscolaGUID,
    EscolaNome:      escola.EscolaNome,
    EscolaStatus:    escola.EscolaStatus,
    EscolaIcone:     escola.EscolaIcone
                       ? escola.EscolaIcone.toString("base64")
                       : null,
    EscolaCreatedAt: escola.EscolaCreatedAt?.toISOString() ?? null,
  };
}
```

---

## DAOs / Repositories

Queries **sempre parametrizadas** (`?`). Mapear linhas do banco para entidades via método privado.

```typescript
// backend/repositories/escola.repository.ts
export class EscolaDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log("⬆️ EscolaDAO.constructor()");
    this.#database = database;
  }

  async create(escola: Escola): Promise<void> {
    console.log("🟢 EscolaDAO.create()");
    const SQL = `INSERT INTO escola (EscolaGUID, EscolaNome, EscolaStatus)
                 VALUES (?, ?, ?)`;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [escola.EscolaGUID, escola.EscolaNome, escola.EscolaStatus]);
  }

  async findByGUID(guid: string): Promise<Escola | null> {
    console.log("🟢 EscolaDAO.findByGUID()");
    const SQL = `SELECT * FROM escola WHERE EscolaGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(SQL, [guid]);
    if (rows.length === 0) return null;
    return this.#mapRow(rows[0]);
  }

  #mapRow(row: RowDataPacket): Escola {
    const e = new Escola();
    e.EscolaGUID   = row.EscolaGUID;
    e.EscolaNome   = row.EscolaNome;
    e.EscolaStatus = row.EscolaStatus;
    e.EscolaIcone  = row.EscolaIcone ?? null;
    e.EscolaCreatedAt = row.EscolaCreatedAt ? new Date(row.EscolaCreatedAt) : null;
    return e;
  }
}
```

---

## Services

Contêm **toda a lógica de negócio**. Orquestram DAOs. Nunca tocam HTTP ou JWT.

```typescript
// backend/services/escola.service.ts
export class EscolaService {
  #escolaDAO: EscolaDAO;

  constructor(escolaDAO: EscolaDAO) {
    console.log("⬆️ EscolaService.constructor()");
    this.#escolaDAO = escolaDAO;
  }

  async createEscola(json: Record<string, unknown>): Promise<EscolaDTO> {
    console.log("🟣 EscolaService.createEscola()");

    // Regra de negócio — unicidade
    const exists = await this.#escolaDAO.findByNome(json.EscolaNome as string);
    if (exists) throw new ErrorResponse(409, "Escola já cadastrada.");

    const escola = new Escola();
    escola.EscolaGUID   = uuidv4();
    escola.EscolaNome   = json.EscolaNome as string;
    escola.EscolaStatus = "Ativa";

    await this.#escolaDAO.create(escola);
    return this.toDTO(escola);
  }

  async findById(guid: string): Promise<EscolaDTO> {
    console.log("🟣 EscolaService.findById()");
    const escola = await this.#escolaDAO.findByGUID(guid);
    if (!escola) throw new ErrorResponse(404, "Escola não encontrada.", { guid });
    return this.toDTO(escola);
  }

  private toDTO(escola: Escola): EscolaDTO { /* ver seção DTOs */ }
}
```

---

## Controllers

Apenas HTTP: extrair dados, chamar service, retornar JSON. **Sempre** `try/catch → next(error)`.  
Usar **arrow functions** como métodos (auto-bind de `this`, sem `.bind()` necessário).

```typescript
// backend/controllers/escola.controller.ts
export class EscolaControl {
  #escolaService: EscolaService;

  constructor(escolaService: EscolaService) {
    console.log("⬆️ EscolaControl.constructor()");
    this.#escolaService = escolaService;
  }

  store = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 EscolaControl.store()");
    try {
      const result = await this.#escolaService.createEscola(request.body.escola);
      return response.status(201).json({ success: true, message: "Escola criada com sucesso.", data: result });
    } catch (error) {
      next(error);
    }
  };

  index = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 EscolaControl.index()");
    try {
      const result = await this.#escolaService.findAll();
      return response.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  show = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 EscolaControl.show()");
    try {
      const result = await this.#escolaService.findById(request.params.EscolaGUID);
      return response.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
```

**Formato de resposta padrão:**
```json
{ "success": true, "message": "...", "data": {} }
{ "success": false, "message": "...", "details": {} }
```

---

## Middlewares

Validam estrutura da request **antes** do controller. Erros via `next(new ErrorResponse(...))`.

```typescript
// backend/middlewares/escola.middleware.ts
export class EscolaMiddleware {
  validateCreateBody = (req: Request, res: Response, next: NextFunction) => {
    console.log("🔷 EscolaMiddleware.validateCreateBody()");

    const { escola } = req.body;
    if (!escola)
      return next(new ErrorResponse(400, "Objeto 'escola' obrigatório."));

    if (!escola.EscolaNome?.trim())
      return next(new ErrorResponse(400, "EscolaNome obrigatório."));

    next();
  };
}
```

---

## Routers e Injeção de Dependência

Cada módulo tem uma classe `*Roteador` e uma factory function. DI manual no arquivo de rotas.

```typescript
// routes/escola.routes.ts
export default class EscolaRoteador {
  #router: Router;
  #escolaControl: EscolaControl;
  #escolaMiddleware: EscolaMiddleware;

  constructor(escolaMiddleware: EscolaMiddleware, escolaControl: EscolaControl) {
    this.#router = Router();
    this.#escolaMiddleware = escolaMiddleware;
    this.#escolaControl = escolaControl;
  }

  createRoutes = () => {
    this.#router.post(
      "/",
      AuthMiddleware.authenticate,
      this.#escolaMiddleware.validateCreateBody,
      this.#escolaControl.store          // Arrow function — sem .bind()
    );
    this.#router.get("/", this.#escolaControl.index);
    this.#router.get("/:EscolaGUID", this.#escolaControl.show);
    return this.#router;
  };
}

// Factory com DI
export const escolaRouterFactory = () => {
  const database = MysqlDatabase.getInstance();   // Singleton
  const escolaDAO = new EscolaDAO(database);
  const escolaService = new EscolaService(escolaDAO);
  const escolaControl = new EscolaControl(escolaService);
  const escolaMiddleware = new EscolaMiddleware();
  const roteador = new EscolaRoteador(escolaMiddleware, escolaControl);
  return roteador.createRoutes();
};
```

No servidor: `app.use("/api/escola", escolaRouterFactory());`

**Singleton do banco:** sempre `MysqlDatabase.getInstance()`, nunca `new MysqlDatabase()`.

---

## Autenticação JWT

- Token em `Authorization: Bearer {token}` · expiração 24h
- Decodificado pelo `AuthMiddleware.authenticate` → adicionado em `req.user`
- Payload: `UsuarioCPF`, `UsuarioEmail`, `UsuarioNome`
- `AuthMiddleware.optionalAuth` para rotas que aceitam usuário não autenticado

---

## Error Handling

```typescript
// backend/utils/ErrorResponse.ts
export default class ErrorResponse extends Error {
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(statusCode: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
```

- **Middleware** → `next(new ErrorResponse(400, "..."))`
- **Service/DAO** → `throw new ErrorResponse(404, "...", { guid })`
- **Controller** → `catch (error) { next(error); }`
- **Handler global** (em `Server.ts`) processa e responde com `{ success: false, ... }`

---

## Logging com Emojis

| Emoji | Camada             |
|-------|--------------------|
| `⬆️`  | Constructor        |
| `🔵`  | Controller         |
| `🟣`  | Service            |
| `🟢`  | DAO/Repository     |
| `🔷`  | Middleware         |
| `✅`  | Sucesso            |
| `⚠️`  | Aviso              |
| `❌`  | Erro               |
| `🔒`  | Auth/Authorization |

Todo método de toda classe loga `console.log("🔵 EscolaControl.store()")` na primeira linha.

---

## Async/Await — Regra Absoluta

**Sempre** `async/await`. **Nunca** `.then()/.catch()`.

---

## Banco de Dados

**Banco:** `tccecossistemaescolar` · MySQL 8  
**Schema SQL:** `backend/database/sql.txt`  
**Pool:** `backend/database/mysql.ts` · instanciado via `MysqlDatabase.getInstance()`

### Variáveis de Ambiente

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=...
DB_NAME=tccecossistemaescolar
DB_PORT=3306
JWT_SECRET=...
NODE_ENV=development
PORT=3000
RESEND_API_KEY=...
```

### Tipos SQL Padrão

| Dado        | Tipo SQL           |
|-------------|--------------------|
| GUID        | `CHAR(36)`         |
| Nome        | `VARCHAR(255)`     |
| Texto longo | `TEXT` / `LONGTEXT`|
| Imagem      | `BLOB` / `LONGBLOB`|
| Cor hex     | `CHAR(6)`          |
| Data        | `DATETIME`         |
| Booleano    | `TINYINT(1)`       |

### Queries Parametrizadas (obrigatório)

```typescript
// ✅ CORRETO
const [rows] = await pool.execute<RowDataPacket[]>(
  `SELECT * FROM escola WHERE EscolaGUID = ?`, [guid]
);

// ❌ ERRADO — SQL Injection
const SQL = `SELECT * FROM escola WHERE EscolaGUID = '${guid}'`;
```

### BLOBs (imagens)

- Receber: `base64` string → converter para `Buffer` no Service
- Armazenar: `Buffer` na entidade e no banco
- Retornar (DTO): `buffer.toString("base64")`

---

## Módulos do Sistema

### Autenticação (`/api/auth`)
- Login via CPF, e-mail ou telefone
- JWT 24h · bcrypt 10 rounds
- `GET /api/auth/me` — dados do usuário autenticado

### Verificação de E-mail (`/api/verificacao-email`)
- OTP de 6 dígitos · expiração 15 min
- Entrega via Resend SDK
- Cron diário às 3h limpa códigos expirados

### Usuários (`/api/usuario`)
- CPF validado (formato `XXX.XXX.XXX-XX`, normalizado no service)
- Status: `"Ativo"` / `"Inativo"` / `"Bloqueado"`
- Login alternativo por e-mail ou telefone

### Escolas (`/api/escola`)
- 4 cores customizáveis por escola (hex sem `#`): `CorPrimariaDark`, `CorPrimariaLight`, `CorSecundariaDark`, `CorSecundariaLight`
- Logo upload via Multer → salvo em `uploads/logos/`
- Tema dinâmico no frontend via CSS Variables por `escolaGUID`

### Funções e Papéis (`/api/escolaxusuarioxfuncao`)
- Tabela N:N:N: `escolaxusuarioxfuncao` (Escola × Usuário × Função)
- 5 papéis: `Coordenação`, `Secretaria`, `Professor`, `Responsável`, `Aluno`
- Campos `DataInicio`, `DataFim`, `Status` para controle temporal

### Cursos (`/api/curso`)
- Vinculados a escolas técnicas (`IsTecnica`)

### Matérias (`/api/materia`)
- Disciplinas vinculadas a cursos

### Turmas (`/api/turma`)
- Vinculadas a cursos; campo `TurmaSerie` (série/ano)

### Matrículas (`/api/matricula`)
- Alunos matriculados em turmas
- Status: `"Ativa"`, `"Transferido"`, `"Concluído"`, `"Cancelado"`

### Alocação de Professores (`/api/professor`)
- Tabela `materiaxprofessorxturma` — Professor × Matéria × Turma

### Tarefas Acadêmicas (`/api/tarefa`)
- Suporte a grupos (`TarefaCompartilhada`, `MinPessoas`, `MaxPessoas`)
- Entrega física ou digital
- Anexos via `relacaoanexos`
- Criação em lote

### Grupos de Tarefa (`/api/grupotarefa`)
- Líder do grupo, convites, histórico de alterações
- Convites: `/api/convitegrupotarefa`

### Provas Agendadas (`/api/prova`)
- Vinculadas a turmas (N:N via `provaagendada_turma`)

### Pendências (`/api/pendencia`)
- Tracking de conclusão por aluno (tarefas + provas + eventos)

### Calendário (`/api/calendario`)
- Eventos e agenda por turma/escola

### Eventos (`/api/evento`)
- Status: `"Agendado"`, `"Em andamento"`, `"Concluído"`, `"Cancelado"`

### Anotações (`/api/anotacao`)
- Notas pessoais estilo post-it vinculadas a datas
- Toggle de conclusão

### Anexos (`/api/anexo`)
- Arquivos vinculados a tarefas, provas e eventos

### Upload (`/api/upload`)
- Logos de escolas via multipart/form-data

---

## Schema do Banco — Tabelas Principais

```sql
usuario                     -- contas de usuário
escola                      -- escolas com tema customizável
verificacao_email           -- OTP de verificação (limpeza automática)
funcao                      -- lookup de papéis
escolaxusuarioxfuncao       -- Escola × Usuário × Papel (N:N:N)
curso                       -- cursos técnicos
materia                     -- disciplinas
turma                       -- turmas/séries
matricula                   -- matrículas de alunos
materiaxprofessorxturma     -- alocação Professor × Matéria × Turma
tarefaacademica             -- tarefas/atividades
tarefaacademica_matricula   -- Tarefa × Aluno (N:N, com status)
provaagendada               -- provas agendadas
provaagendada_turma         -- Prova × Turma (N:N)
anexo                       -- metadados de arquivos
relacaoanexos               -- polimórfico: liga anexos a qualquer entidade
calendario                  -- eventos de agenda
anotacao                    -- notas pessoais
pendencia                   -- itens pendentes por aluno
evento                      -- eventos escolares
grupotarefa                 -- grupos de trabalho
usuarioxgrupotarefa         -- Usuário × Grupo
historicogrupotarefa        -- auditoria de mudanças no grupo
```

---

## Workflow para Novas Features

Siga **esta ordem exata**:

1. **Entity** — `backend/entities/*.model.ts` — campos `#privados`, getters/setters com validação
2. **SQL** — `backend/database/sql.txt` — `CREATE TABLE` com tipos corretos
3. **DAO** — `backend/repositories/*.repository.ts` — CRUD com queries parametrizadas
4. **Service** — `backend/services/*.service.ts` — lógica de negócio, conversão para DTO
5. **Middleware** — `backend/middlewares/*.middleware.ts` — validação de request
6. **Controller** — `backend/controllers/*.controller.ts` — HTTP, try/catch, arrow functions
7. **Router** — `routes/*.routes.ts` — classe `*Roteador` + factory com DI
8. **Server** — registrar `app.use("/api/rota", factory())`
9. **Logging** — emojis em todos os métodos de todas as camadas
10. **Erros** — `ErrorResponse` consistente em todas as camadas

---

## Anti-Padrões — Nunca Faça

| Anti-padrão | Por quê |
|-------------|---------|
| Controller acessar `pool` ou DAO diretamente | Viola separação de camadas |
| Lógica de negócio em controller | Pertence ao service |
| Service receber `req`/`res` | Service não conhece HTTP |
| Validação de request em service | Responsabilidade do middleware |
| Expor entidade na API (sem DTO) | Vaza `Buffer`, métodos internos |
| `SELECT * FROM tabela WHERE campo = '${var}'` | SQL Injection |
| Campos públicos em entidade | Rompe encapsulamento |
| `private campo` do TypeScript | Usar `#campo` JavaScript |
| `.then()/.catch()` em vez de `async/await` | Padrão do projeto |
| JWT validation em service | Responsabilidade do middleware de auth |
| SQL direto em service | Responsabilidade do DAO |
| AI agent acessar banco direto | Service coordena IA e DAO |
| `new MysqlDatabase()` fora da factory | Usar `MysqlDatabase.getInstance()` |

---

## Frontend — Next.js

### Páginas Implementadas

| Rota | Descrição |
|------|-----------|
| `/` | Landing page (hero, features, CTA) |
| `/login` | Login com auto-detecção CPF/e-mail/telefone |
| `/cadastro` | Cadastro com validação em tempo real |
| `/verificar-email` | Verificação OTP 6 dígitos |
| `/selecionar-escola` | Grid de escolas do usuário |
| `/criar-escola` | Criação de escola com color pickers e logo |
| `/dashboard/[escolaGUID]` | Dashboard com tema dinâmico por escola |
| `/dashboard/[escolaGUID]/gestao-dados/alunos` | Gestão de alunos |
| `/dashboard/[escolaGUID]/gestao-dados/professores` | Gestão de professores |
| `/dashboard/[escolaGUID]/gestao-dados/turmas` | Gestão de turmas |
| `/dashboard/[escolaGUID]/gestao-dados/materias` | Gestão de matérias |
| `/dashboard/[escolaGUID]/gestao-dados/cursos` | Gestão de cursos |
| `/dashboard/[escolaGUID]/calendario` | Calendário com anotações |
| `/dashboard/[escolaGUID]/tarefas` | Lista de tarefas |
| `/dashboard/[escolaGUID]/tarefas/[tarefaGUID]` | Detalhe de tarefa |
| `/dashboard/[escolaGUID]/crud-tarefa` | Criar/editar tarefas |
| `/dashboard/[escolaGUID]/crud-provaagendada` | Criar/editar provas |
| `/saiba-mais` | Informações sobre a plataforma |

### Estado e Autenticação

- `AuthContext` com persistência em `localStorage`
- `escolaGUID` na URL como escopo de todas as rotas do dashboard
- Tema: CSS Variables injetadas por escola (`--cor-primaria-dark`, etc.)

### Validadores (frontend/utils/)

- CPF — formato e dígitos verificadores
- E-mail — regex
- Telefone — formato brasileiro
- Senha — nível de força

---

## Regras Gerais

- Idioma do código: **português** (variáveis, métodos, mensagens, campos do banco)
- Idioma dos comentários: português
- Nomes de tabelas e campos do banco: **notação húngara em português**
- Todos os IDs são UUID v4, nunca autoincrement
- Nenhuma entidade é exposta diretamente na API
- Toda operação async usa `async/await`
- Todo controller tem `try/catch → next(error)`
- Todo método de toda classe tem log com emoji na primeira linha
