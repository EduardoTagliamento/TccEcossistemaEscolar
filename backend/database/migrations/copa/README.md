# 🏆 Sistema de Álbum da Copa do Mundo 2026

Sistema completo para gerenciar coleção de figurinhas da Copa do Mundo 2026 em 3 álbuns: Prata 🥈, Normal 📘 e Ouro 🥇.

## 🚀 Início Rápido

### 1. Executar Migrations do Banco de Dados

O sistema precisa que você execute as migrations SQL no banco de dados MySQL do Railway.

```bash
# Conectar ao MySQL Railway
mysql -h <railway-host> -u <user> -p <database>

# Executar migrations na ordem:
source backend/database/migrations/copa/001_create_copa_tables.sql;
source backend/database/migrations/copa/002_seed_figurinhas.sql;
source backend/database/migrations/copa/003_create_indexes.sql;
```

**Verifique que as tabelas foram criadas:**
```sql
SHOW TABLES LIKE 'copa_%';
-- Deve retornar: copa_albuns, copa_figurinhas, copa_status

SELECT COUNT(*) FROM copa_figurinhas;
-- Deve retornar: 994

SELECT COUNT(*) FROM copa_status;
-- Deve retornar: 2982 (994 x 3 álbuns)
```

### 2. Iniciar o Servidor

```bash
# Modo desenvolvimento
npm run dev

# Modo produção
npm run build
npm start
```

### 3. Acessar o Sistema

- **Sistema Escolar**: http://localhost:3000
- **Copa do Mundo**: http://localhost:3000/album

## 📋 Funcionalidades

### Dashboard Principal (`/album`)
- Estatísticas gerais dos 3 álbuns
- Progresso de completude
- Navegação para pesquisa e visualização

### Pesquisa de Figurinhas (`/album/pesquisa`)
- Buscar por código completo (ex: `GHA01`)
- Buscar por prefixo (ex: `GHA` retorna todas as 20)
- Visualizar status em cada álbum
- Editar status com senha (modal)

### Meus Álbuns (`/album/meus-albuns`)
- Ver figurinhas faltantes organizadas por grupo
- Alternar entre os 3 álbuns
- Estatísticas de cada álbum

## 🔐 Senha de Proteção

Para alterar o status de uma figurinha, é necessária a senha: **12345**

A senha pode ser alterada em:
`backend/services/copa/album.service.ts` (método `atualizarStatus`)

## 📊 Estrutura do Banco de Dados

### Tabelas

- **copa_figurinhas**: 994 figurinhas (FWC, Seleções, Coca-Cola)
- **copa_albuns**: 3 álbuns fixos (Prata, Normal, Ouro)
- **copa_status**: Status de cada figurinha em cada álbum (2982 registros)

### Views

- **copa_estatisticas_geral**: Estatísticas agregadas por álbum
- **copa_faltantes_por_grupo**: Figurinhas faltantes agrupadas

## 🛠️ Tecnologias

- **Backend**: Node.js + TypeScript + Express
- **Frontend**: React + Next.js 14 + Tailwind CSS
- **Banco**: MySQL 8.0 (Railway)
- **Pool**: mysql2 (mesma conexão do sistema escolar)

## 📁 Estrutura de Arquivos

```
backend/
  controllers/copa/     # Controllers HTTP
  services/copa/        # Lógica de negócio
  repositories/copa/    # Acesso ao banco
  entities/copa/        # Interfaces TypeScript
  database/migrations/copa/  # Migrations SQL

routes/copa/            # Rotas da API

frontend/
  app/album/           # Páginas Next.js
  components/copa/     # Componentes React
  lib/copa/            # API client e tipos
```

## 🔌 API Endpoints

### Figurinhas
- `GET /album/figurinhas` - Listar todas (com filtros)
- `GET /album/figurinhas/codigo/:codigo` - Buscar por código
- `GET /album/figurinhas/prefixo/:prefixo` - Buscar por prefixo

### Álbuns
- `GET /album/albuns` - Listar todos os álbuns
- `GET /album/albuns/:id/figurinhas` - Figurinhas com status
- `GET /album/albuns/:id/faltantes` - Figurinhas faltantes
- `PUT /album/albuns/:id/figurinhas/:figurinhaId` - Atualizar status

### Estatísticas
- `GET /album/estatisticas/geral` - Estatísticas gerais
- `GET /album/estatisticas/faltantes/:albumNome` - Faltantes agrupadas
- `GET /album/estatisticas/resumo` - Resumo rápido

### Health Check
- `GET /album/health` - Status do sistema

## 🗑️ Remoção Futura

Para remover o sistema da Copa:

1. **Deletar tabelas SQL**:
```sql
DROP TABLE IF EXISTS copa_status;
DROP TABLE IF EXISTS copa_albuns;
DROP TABLE IF EXISTS copa_figurinhas;
```

2. **Remover arquivos**:
```bash
rm -rf backend/controllers/copa
rm -rf backend/services/copa
rm -rf backend/repositories/copa
rm -rf backend/entities/copa
rm -rf routes/copa
rm -rf frontend/app/album
rm -rf frontend/components/copa
rm -rf frontend/lib/copa
```

3. **Remover integração no Server.ts**:
```typescript
// Remover estas linhas:
const { copaRoutes } = require("../routes/copa/index");
this.#app.use("/album", copaRoutes);
```

## 🐛 Troubleshooting

### Erro: Tabelas não existem
Execute as migrations SQL na ordem correta.

### Erro: Senha incorreta
Verifique a senha fixa no código (padrão: "12345").

### Erro: Cannot find module
Execute `npm install` para instalar dependências.

### Erro: API não responde
Verifique se o servidor está rodando e se a conexão MySQL está ativa.

## 📝 Notas

- Sistema completamente isolado do Ecossistema Escolar
- Usa a mesma conexão MySQL (tabelas separadas com prefixo `copa_`)
- Todas as rotas começam com `/album`
- Sem autenticação de usuário (proteção apenas por senha fixa)
- Dados baseados no JSON original da aplicação Python

## 📧 Suporte

Para dúvidas ou problemas, consulte:
- [PLANEJAMENTO_IMPLEMENTACAO_ISOLADA.md](../docs/copa do mundo/PLANEJAMENTO_IMPLEMENTACAO_ISOLADA.md)
- Documentação original: [docs/copa do mundo/README.md](../docs/copa do mundo/README.md)

---

**Versão**: 1.0  
**Data**: 06 de Junho de 2026  
**Status**: ✅ Implementado
