# Database Guidelines

## Configuração

**Database**: MySQL (`tccecossistemaescolar`)
**Pool Connection**: Configurado em `backend/database/mysql.ts`

### Variáveis de Ambiente
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=senha
DB_NAME=tccecossistemaescolar
DB_PORT=3306
```

## Acesso ao Banco

### Sempre Use Queries Parametrizadas

```typescript
// ✅ CORRETO
const SQL = `SELECT * FROM escola WHERE EscolaGUID = ?`;
const [rows] = await pool.execute(SQL, [guid]);

// ❌ ERRADO (SQL Injection!)
const SQL = `SELECT * FROM escola WHERE EscolaGUID = '${guid}'`;
const [rows] = await pool.execute(SQL);
```

### Pool de Conexões

```typescript
import { MysqlDatabase } from './database/MysqlDatabase';

const database = new MysqlDatabase();
const pool = database.getPool();

// Execute com parâmetros
const [rows] = await pool.execute<RowDataPacket[]>(SQL, params);
```

## Schema Atual

### Tabela: `escola`

```sql
CREATE TABLE escola (
  EscolaGUID CHAR(36) PRIMARY KEY,
  EscolaNome VARCHAR(255) NOT NULL UNIQUE,
  EscolaIcone LONGBLOB,
  EscolaCor CHAR(6) NOT NULL DEFAULT 'FFFFFF'
);
```

**Campos**:
- `EscolaGUID`: UUID v4, chave primária
- `EscolaNome`: Nome único da escola
- `EscolaIcone`: Ícone em formato BLOB (PNG/JPG)
- `EscolaCor`: Cor hex de 6 caracteres (sem `#`)

### Migrações

Scripts SQL mantidos em `backend/database/sql.txt`

## Convenções de Nomenclatura

### Tabelas e Campos
- Notação húngara: `TabelaNomeCampo`
- Exemplo: `EscolaGUID`, `EscolaNome`
- GUIDs sempre com sufixo `GUID`
- Nomes sempre com sufixo `Nome`

### Tipos Comuns
- **IDs**: `CHAR(36)` para UUIDs
- **Nomes**: `VARCHAR(255)`
- **Textos**: `TEXT` ou `LONGTEXT`
- **Imagens**: `BLOB` ou `LONGBLOB`
- **Cores**: `CHAR(6)` (hex sem `#`)
- **Datas**: `DATETIME` ou `TIMESTAMP`
- **Booleanos**: `TINYINT(1)` (0/1)

## Mapeamento Entity ↔ Database

### DAO Pattern

```typescript
class EscolaDAO {
  async create(escola: Escola): Promise<void> {
    const SQL = `INSERT INTO escola 
                 (EscolaGUID, EscolaNome, EscolaIcone, EscolaCor) 
                 VALUES (?, ?, ?, ?)`;
    const params = [
      escola.getGUID(),
      escola.getNome(),
      escola.getIcone(),
      escola.getCor()
    ];
    await this.#database.getPool().execute(SQL, params);
  }

  async findByGUID(guid: string): Promise<Escola | null> {
    const SQL = `SELECT * FROM escola WHERE EscolaGUID = ?`;
    const [rows] = await this.#database.getPool()
      .execute<RowDataPacket[]>(SQL, [guid]);
    
    if (rows.length === 0) return null;
    
    return this.mapRowToEntity(rows[0]);
  }

  private mapRowToEntity(row: RowDataPacket): Escola {
    const escola = new Escola();
    escola.setGUID(row.EscolaGUID);
    escola.setNome(row.EscolaNome);
    escola.setIcone(row.EscolaIcone);
    escola.setCor(row.EscolaCor);
    return escola;
  }
}
```

## Tratamento de BLOBs

### Salvando Imagens

```typescript
// Receber de multipart/form-data ou base64
const iconeBuffer = Buffer.from(iconeBase64, 'base64');
escola.setIcone(iconeBuffer);
await escolaDAO.create(escola);
```

### Retornando Imagens na API

```typescript
// No Service, converter Buffer para base64
return {
  guid: escola.getGUID(),
  nome: escola.getNome(),
  icone: escola.getIcone()?.toString('base64'),
  cor: escola.getCor()
};
```

## Transações (Futuro)

Para operações que requerem múltiplas queries:

```typescript
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  
  await connection.execute(SQL1, params1);
  await connection.execute(SQL2, params2);
  
  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

## Performance

- Use `LIMIT` para paginação
- Índices em campos de busca frequente
- Evite `SELECT *` em produção (seja explícito)
- Use `COUNT(*)` para totais, não `length` de arrays

```typescript
// Paginação
const SQL = `SELECT * FROM escola 
             ORDER BY EscolaNome 
             LIMIT ? OFFSET ?`;
const [rows] = await pool.execute(SQL, [limit, offset]);
```
