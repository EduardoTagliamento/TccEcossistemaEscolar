# 🚀 Como Executar o Servidor

Este guia explica como iniciar o servidor do Ecossistema Escolar.

## 📋 Pré-requisitos

### 1. Node.js
Versão 18 ou superior instalada
```bash
node --version  # Deve retornar v18.x.x ou superior
```

### 2. MySQL
Servidor MySQL rodando localmente ou remotamente
```bash
# Windows: Verifique nos Serviços
# Linux/Mac:
mysql --version
systemctl status mysql  # ou: brew services list
```

### 3. Banco de Dados
Crie o banco de dados:
```sql
CREATE DATABASE tccecossistemaescolar;
USE tccecossistemaescolar;

-- Execute o script SQL em backend/database/sql.txt
SOURCE backend/database/sql.txt;
```

## ⚙️ Configuração

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo e edite com suas configurações:
```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

Edite o arquivo `.env`:
```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_aqui
DB_NAME=tccecossistemaescolar
DB_PORT=3306
```

## 🏃 Executando o Servidor

### Modo Desenvolvimento (com hot reload)
```bash
npm run dev
```
O servidor será reiniciado automaticamente quando você modificar arquivos.

### Modo Produção
```bash
# Compilar TypeScript para JavaScript
npm run build

# Executar versão compilada
npm start
```

### Script Completo (Build + Start)
```bash
npm run prod
```

## ✅ Verificando se Funcionou

Se tudo estiver correto, você verá:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Ecossistema Escolar - Servidor iniciado
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🌐 URL: http://localhost:3000
   🏥 Health: http://localhost:3000/health
   📚 Docs: http://localhost:3000/docs/routes/escola-api.md
   🏫 API Escola: http://localhost:3000/api/escola
   ⚙️  Ambiente: development
   📊 Database: tccecossistemaescolar
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Testando a API

#### Health Check
```bash
curl http://localhost:3000/health
```

#### Listar Escolas
```bash
curl http://localhost:3000/api/escola
```

#### Criar Escola
```bash
curl -X POST http://localhost:3000/api/escola \
  -H "Content-Type: application/json" \
  -d '{
    "escola": {
      "EscolaNome": "Escola Teste",
      "EscolaCorPriEs": "1E3A8A",
      "EscolaCorPriCl": "FFFFFF"
    }
  }'
```

## 🐛 Resolução de Problemas

### ❌ Erro: "Cannot find module 'dotenv'"
```bash
npm install dotenv --save
```

### ❌ Erro: "ECONNREFUSED" (MySQL)
**Causa:** MySQL não está rodando

**Solução:**
```bash
# Windows
# Abra 'Serviços' (services.msc) e inicie MySQL

# Linux
sudo systemctl start mysql

# Mac
brew services start mysql
```

### ❌ Erro: "ER_ACCESS_DENIED_ERROR"
**Causa:** Usuário ou senha incorretos

**Solução:** Verifique as credenciais no arquivo `.env`
```bash
# Teste a conexão manualmente
mysql -u root -p

# Se necessário, crie novo usuário
CREATE USER 'seu_usuario'@'localhost' IDENTIFIED BY 'sua_senha';
GRANT ALL PRIVILEGES ON tccecossistemaescolar.* TO 'seu_usuario'@'localhost';
FLUSH PRIVILEGES;
```

### ❌ Erro: "ER_BAD_DB_ERROR"
**Causa:** Banco de dados não existe

**Solução:**
```bash
mysql -u root -p

# Dentro do MySQL:
CREATE DATABASE tccecossistemaescolar;
```

### ❌ Erro: "EADDRINUSE" (Porta em uso)
**Causa:** Porta 3000 já está sendo usada

**Solução 1:** Mude a porta no `.env`
```env
PORT=3001
```

**Solução 2:** Encerre o processo na porta 3000
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Linux/Mac
lsof -i :3000
kill -9 <pid>
```

### ❌ Erro: "Cannot find module './backend/Server'"
**Causa:** Arquivos TypeScript não compilados ou caminhos incorretos

**Solução:**
```bash
# Para desenvolvimento, use tsx:
npm run dev

# Para produção, compile primeiro:
npm run build
npm start
```

### ❌ Erros de TypeScript
**Causa:** Dependências de tipos não instaladas

**Solução:**
```bash
npm install --save-dev @types/node @types/express @types/cors @types/uuid
```

## 📊 Logs e Debug

### Níveis de Log

O servidor exibe logs detalhados:
- ⬆️  = Inicialização de componentes
- 🔵 = Controllers
- 🟣 = Services
- 🟢 = DAOs/Repositories
- 🔷 = Middlewares
- 🟡 = Avisos
- 🔴 = Erros

### Ver Requisições em Tempo Real

Todas as requisições são logadas:
```
📥 [2026-02-07T10:30:45.123Z] POST /api/escola
   Body: {
     "escola": {
       "EscolaNome": "Escola Teste"
     }
   }
```

## 🔄 Encerrando o Servidor

```bash
# Pressione Ctrl+C no terminal

# Você verá:
🛑 Sinal SIGINT recebido
⏳ Encerrando servidor gracefully...
✅ Servidor encerrado
```

## 📚 Próximos Passos

1. **Consulte a documentação da API:** `docs/routes/escola-api.md`
2. **Entenda a arquitetura:** `.github/copilot-instructions/`
3. **Adicione novas features:** `.github/copilot-instructions/workflow.md`

## 🆘 Precisa de Ajuda?

- Consulte a documentação em `.github/copilot-instructions/`
- Veja exemplos em `docs/routes/escola-api.md`
- Abra uma issue no GitHub

---

**Desenvolvido com ❤️ para o TCC - Ecossistema Escolar**
