# ⚡ Início Rápido - Ecossistema Escolar

## 🚀 Executar em 3 Passos

### 1️⃣ Instalar Dependências
```bash
npm install
```

### 2️⃣ Configurar Banco de Dados
```bash
# Entre no MySQL
mysql -u root -p

# Execute:
CREATE DATABASE tccecossistemaescolar;
exit
```

### 3️⃣ Iniciar Servidor
```bash
npm run dev
```

## ✅ Pronto!

Acesse: http://localhost:3000

### Testar API
```bash
# Health check
curl http://localhost:3000/health

# Criar escola
curl -X POST http://localhost:3000/api/escola -H "Content-Type: application/json" -d "{\"escola\":{\"EscolaNome\":\"Minha Escola\"}}"

# Listar escolas
curl http://localhost:3000/api/escola
```

## 📚 Documentação Completa

Veja [EXECUTAR.md](EXECUTAR.md) para guia detalhado e resolução de problemas.

## 🐛 Problemas Comuns

**MySQL não conecta?**
```bash
# Verifique se está rodando
services.msc  # Windows: Procure MySQL
```

**Porta 3000 ocupada?**
```bash
# Mude no arquivo .env
PORT=3001
```

**Precisa de ajuda?**
- Veja [EXECUTAR.md](EXECUTAR.md)
- Consulte [.github/copilot-instructions/](.github/copilot-instructions/)
