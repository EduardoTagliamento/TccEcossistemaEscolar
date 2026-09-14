# 🗄️ Conexão com o MySQL de Produção (Railway)

## 📋 Visão Geral

O banco MySQL do Ecossistema Escolar roda como serviço gerenciado no Railway (projeto `charming-eagerness`, ambiente `production`, serviço de banco `MySQL`). Este documento registra **como conectar nele a partir de fora da rede do Railway** — por exemplo, para usar o banco real como fonte extra de conhecimento em investigações, debug ou consultas de schema/dados feitas por um agente Claude Code.

> ⚠️ Este é o banco de **produção**, com dados reais de escolas/usuários. Não existe banco de staging separado. Trate toda consulta como tocando dados reais.

## 🔑 Por que `DB_HOST=mysql.railway.internal` não funciona localmente

O `.env` do projeto define:

```
DB_HOST=mysql.railway.internal
DB_PORT=3306
```

`mysql.railway.internal` é o hostname da **rede privada** do Railway — só resolve DNS para serviços rodando dentro da própria infraestrutura do Railway (ex.: o backend do Ecossistema Escolar, que roda como serviço no mesmo projeto). Uma máquina local ou um agente rodando fora do Railway recebe `ENOTFOUND` ao tentar resolver esse host. Para acessar de fora é preciso o **proxy TCP público**.

## ✅ Duas formas de conectar de fora

### 1. Railway CLI (recomendado — mais seguro)

O Railway CLI já está instalado, logado e linkado neste ambiente:

```bash
railway whoami          # confirma quem está logado
railway status          # confirma projeto/serviço linkado
```

- **Setup feito uma vez** (login interativo — só um humano consegue fazer, via navegador):
  ```bash
  railway login --browserless   # imprime URL + código de pareamento
  railway link                  # linka a pasta do projeto ao projeto Railway certo (interativo)
  ```
- Depois de linkado, as credenciais do serviço MySQL saem direto do Railway, sem precisar copiar/colar segredos em lugar nenhum:
  ```bash
  railway variables --service MySQL --kv
  ```
  Isso retorna (entre outras) `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQL_PUBLIC_URL`, `RAILWAY_TCP_PROXY_DOMAIN` e `RAILWAY_TCP_PROXY_PORT`.
- `railway connect mysql` abriria uma sessão interativa já conectada, mas depende do binário `mysql` (client oficial) estar instalado localmente — **não está** neste ambiente Windows. Por isso o fluxo prático usado aqui é: pegar as variáveis com `railway variables` e conectar via Node (`mysql2`), como descrito abaixo.

### 2. Proxy TCP público direto (`MYSQL_PUBLIC_URL`)

O serviço MySQL do Railway expõe um proxy TCP público (variáveis `RAILWAY_TCP_PROXY_DOMAIN` + `RAILWAY_TCP_PROXY_PORT`, combinadas em `MYSQL_PUBLIC_URL`). Diferente de `mysql.railway.internal`, esse host **é alcançável da internet** — a segurança depende inteiramente da senha (`MYSQLPASSWORD`).

Como o projeto já tem `mysql2` como dependência (`package.json`), a conexão é feita direto em Node, sem precisar instalar o client `mysql` nativo:

```js
const mysql = require('mysql2/promise');

const conn = await mysql.createConnection({
  host: process.env.RAILWAY_TCP_PROXY_DOMAIN,  // ex.: algo.proxy.rlwy.net
  port: Number(process.env.RAILWAY_TCP_PROXY_PORT),
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  connectTimeout: 8000,
});

const [rows] = await conn.query('SHOW TABLES');
await conn.end();
```

Pegue esses valores em tempo real via `railway variables --service MySQL --kv` — **nunca hardcode host/senha em arquivo versionado** (nem aqui na doc, nem em código, nem em definição de agente). `.env` já guarda as credenciais internas e está no `.gitignore`; os valores do proxy público mudam de projeto pra projeto e não têm por que virar texto fixo em nenhum lugar rastreado pelo git.

## 🛡️ Regras de segurança específicas desta conexão

1. **Nunca commitar** host/usuário/senha do proxy público em nenhum arquivo rastreado (`docs/`, `.claude/`, código-fonte). Buscar sempre via `railway variables` ou `.env` local.
2. **Read-only por padrão.** Consultas exploratórias (`SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`) são seguras para investigação. `INSERT`/`UPDATE`/`DELETE`/`ALTER`/`DROP`/`TRUNCATE` contra produção só com confirmação explícita do usuário para aquela operação específica.
3. **Cuidado com PII.** O banco tem CPF, e-mail e outros dados pessoais de alunos/funcionários (tabela `usuario`, `matricula`, etc.). Ao mostrar amostras de linhas para ilustrar estrutura, preferir agregados/contagens ou mascarar campos sensíveis em vez de despejar dados reais na conversa sem necessidade.
4. O client `mysql` nativo **não está instalado** neste ambiente — o caminho funcional confirmado é `railway variables` + `mysql2` via Node, não `railway connect`.

## 🤖 Uso como fonte extra de conhecimento

Esse acesso existe para complementar (não substituir) a leitura do schema no código-fonte (`backend/database/sql.txt`, `backend/entities/*.model.ts`) — útil para confirmar schema drift, investigar dados reais durante debug, ou validar hipóteses sobre o comportamento do sistema em produção. Ver o agente especialista dedicado a isso em `.claude/agents/mysql.md`.
