# 🏆 Planejamento: Implementação Isolada do Sistema de Álbum da Copa do Mundo

**Projeto:** Sistema de Gerenciamento de Figurinhas - Copa do Mundo 2026  
**Domínio:** www.baua.com.br/album  
**Infraestrutura:** Railway (compartilhada com Ecossistema Escolar)  
**Status:** Planejamento  
**Data:** 06 de Junho de 2026  
**Versão:** 1.0

---

## 📋 Índice

1. [Visão Geral e Objetivos](#visão-geral-e-objetivos)
2. [Arquitetura de Isolamento](#arquitetura-de-isolamento)
3. [Estrutura de Diretórios](#estrutura-de-diretórios)
4. [Modelagem do Banco de Dados](#modelagem-do-banco-de-dados)
5. [Backend - API REST](#backend-api-rest)
6. [Frontend - Interface do Usuário](#frontend-interface-do-usuário)
7. [Integração com Ecossistema Escolar](#integração-com-ecossistema-escolar)
8. [Plano de Implementação Passo a Passo](#plano-de-implementação-passo-a-passo)
9. [Estratégia de Remoção Futura](#estratégia-de-remoção-futura)
10. [Checklist de Implementação](#checklist-de-implementação)

---

## 🎯 Visão Geral e Objetivos

### Objetivos Principais

1. **Isolamento Total**: Sistema completamente independente do Ecossistema Escolar
2. **Mesmo Domínio**: Funcionar em `www.baua.com.br/album`
3. **Mesma Infraestrutura**: Usar Railway e MySQL compartilhado (tabelas separadas)
4. **Remoção Fácil**: Estrutura preparada para remoção futura sem impactar sistema principal
5. **Zero Interferência**: Não afetar o funcionamento do Ecossistema Escolar

### Escopo Funcional

- **Gerenciamento de Figurinhas**: 994 figurinhas (FWC, Seleções, Coca-Cola)
- **3 Álbuns Simultâneos**: Prata 🥈, Normal 📘, Ouro 🥇
- **Busca e Filtros**: Pesquisa inteligente por código/prefixo
- **Estatísticas**: Dashboard com percentuais de completude
- **Autenticação Simples**: Sistema de login básico para gerenciar coleções pessoais

---

## 🏗️ Arquitetura de Isolamento

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        www.baua.com.br                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐        ┌──────────────────────┐      │
│  │  / (Sistema Escolar) │        │   /album (Copa 2026) │      │
│  │                      │        │                      │      │
│  │  - Escolas           │        │  - Figurinhas        │      │
│  │  - Turmas            │        │  - Álbuns            │      │
│  │  - Alunos            │        │  - Estatísticas      │      │
│  │  - Tarefas           │        │  - Busca             │      │
│  └──────────┬───────────┘        └──────────┬───────────┘      │
│             │                               │                   │
│             └───────────┬───────────────────┘                   │
│                         │                                       │
│              ┌──────────▼──────────┐                           │
│              │   Express Server     │                           │
│              │   (app.ts/Server.ts) │                           │
│              └──────────┬───────────┘                           │
│                         │                                       │
│              ┌──────────▼──────────┐                           │
│              │   MySQL Connection   │                           │
│              │   (pool - Railway)   │                           │
│              └──────────┬───────────┘                           │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                ┌─────────▼──────────┐
                │  MySQL Database    │
                │  (Railway)         │
                ├────────────────────┤
                │ Tabelas Escolares: │
                │  - escola          │
                │  - usuario         │
                │  - turma           │
                │  - tarefa          │
                │  - ...             │
                ├────────────────────┤
                │ Tabelas Copa 2026: │
                │  - copa_usuarios   │
                │  - copa_figurinhas │
                │  - copa_albuns     │
                │  - copa_status     │
                └────────────────────┘
```

### Princípios de Isolamento

1. **Prefixo em Tabelas**: Todas as tabelas usam prefixo `copa_`
2. **Namespace em Rotas**: Todas as rotas começam com `/album`
3. **Controllers Separados**: Pasta `backend/controllers/copa/`
4. **Services Isolados**: Pasta `backend/services/copa/`
5. **Frontend Isolado**: Página `frontend/app/album/`
6. **Sem Dependências Cruzadas**: Zero imports entre sistemas

---

## 📁 Estrutura de Diretórios

### Estrutura Completa do Projeto

```
EcossistemaEscolar/
│
├── backend/
│   ├── controllers/
│   │   ├── escola.controller.ts          # ✅ Sistema Escolar
│   │   ├── usuario.controller.ts         # ✅ Sistema Escolar
│   │   └── copa/                         # 🆕 NOVO - Sistema Copa
│   │       ├── index.ts
│   │       ├── album.controller.ts       # Gerenciar álbuns
│   │       ├── figurinha.controller.ts   # CRUD de figurinhas
│   │       ├── auth.controller.ts        # Login simples
│   │       └── estatistica.controller.ts # Estatísticas
│   │
│   ├── services/
│   │   ├── escola.service.ts             # ✅ Sistema Escolar
│   │   └── copa/                         # 🆕 NOVO - Sistema Copa
│   │       ├── index.ts
│   │       ├── album.service.ts
│   │       ├── figurinha.service.ts
│   │       ├── auth.service.ts
│   │       └── estatistica.service.ts
│   │
│   ├── repositories/
│   │   ├── escola.repository.ts          # ✅ Sistema Escolar
│   │   └── copa/                         # 🆕 NOVO - Sistema Copa
│   │       ├── index.ts
│   │       ├── album.repository.ts
│   │       ├── figurinha.repository.ts
│   │       └── usuario.repository.ts
│   │
│   ├── entities/
│   │   ├── Escola.ts                     # ✅ Sistema Escolar
│   │   └── copa/                         # 🆕 NOVO - Sistema Copa
│   │       ├── CopaUsuario.ts
│   │       ├── CopaFigurinha.ts
│   │       ├── CopaAlbum.ts
│   │       └── CopaStatus.ts
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts            # ✅ Sistema Escolar
│   │   └── copa/                         # 🆕 NOVO - Sistema Copa
│   │       └── copa-auth.middleware.ts   # Autenticação simples
│   │
│   ├── utils/
│   │   └── copa/                         # 🆕 NOVO - Sistema Copa
│   │       ├── figurinha-seed.ts         # Script seed 994 figurinhas
│   │       └── copa-validator.ts         # Validações específicas
│   │
│   └── database/
│       ├── mysql.ts                      # ✅ Conexão compartilhada
│       ├── MysqlDatabase.ts              # ✅ Classe compartilhada
│       └── migrations/
│           └── copa/                     # 🆕 NOVO - Migrações isoladas
│               ├── 001_create_copa_tables.sql
│               ├── 002_seed_figurinhas.sql
│               └── 003_create_indexes.sql
│
├── routes/
│   ├── escola.routes.ts                  # ✅ Sistema Escolar
│   └── copa/                             # 🆕 NOVO - Sistema Copa
│       ├── index.ts                      # Agregador de rotas
│       ├── album.routes.ts
│       ├── figurinha.routes.ts
│       ├── auth.routes.ts
│       └── estatistica.routes.ts
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                      # ✅ Sistema Escolar (Home)
│   │   ├── escola/                       # ✅ Sistema Escolar
│   │   └── album/                        # 🆕 NOVO - Sistema Copa
│   │       ├── page.tsx                  # Dashboard principal
│   │       ├── login/
│   │       │   └── page.tsx              # Login simples
│   │       ├── pesquisa/
│   │       │   └── page.tsx              # Busca de figurinhas
│   │       ├── meus-albuns/
│   │       │   └── page.tsx              # Visualização por álbum
│   │       └── layout.tsx                # Layout específico Copa
│   │
│   ├── components/
│   │   └── copa/                         # 🆕 NOVO - Componentes isolados
│   │       ├── FigurinhaCard.tsx         # Card de figurinha
│   │       ├── AlbumSelector.tsx         # Seletor de álbum
│   │       ├── BuscaFigurinha.tsx        # Barra de busca
│   │       ├── EstatisticasCard.tsx      # Card de estatísticas
│   │       └── ModalEditarStatus.tsx     # Modal editar status
│   │
│   └── lib/
│       └── copa/                         # 🆕 NOVO - Utilitários frontend
│           ├── api.ts                    # Cliente API Copa
│           └── types.ts                  # Tipos TypeScript
│
├── docs/
│   └── copa do mundo/
│       ├── PLANEJAMENTO_IMPLEMENTACAO_ISOLADA.md  # 📄 Este arquivo
│       ├── README.md                     # ✅ Documentação original Python
│       └── PLANEJAMENTO_WEB_TYPESCRIPT_MYSQL.md   # ✅ Planejamento web
│
└── app.ts                                # ✅ Servidor principal (modificar)
```

---

## 🗄️ Modelagem do Banco de Dados

### Tabelas do Sistema Copa (Prefixo: `copa_`)

#### 1. `copa_usuarios` - Usuários do Sistema de Álbum

```sql
CREATE TABLE copa_usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Observação**: Sistema de autenticação simples, sem integração com usuários escolares.

#### 2. `copa_figurinhas` - Catálogo de Figurinhas

```sql
CREATE TABLE copa_figurinhas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(10) UNIQUE NOT NULL,     -- GHA01, FWC05, CC01
  prefixo VARCHAR(5) NOT NULL,            -- GHA, FWC, CC
  numero INT NOT NULL,                    -- 01, 05, 01
  tipo ENUM('FWC', 'SELECAO', 'COCACOLA') NOT NULL,
  grupo VARCHAR(20) DEFAULT NULL,         -- Grupo A, B, C... (para seleções)
  selecao VARCHAR(50) DEFAULT NULL,       -- Nome da seleção (se aplicável)
  ordem_exibicao INT NOT NULL,            -- Ordem de exibição no álbum
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_codigo (codigo),
  INDEX idx_prefixo (prefixo),
  INDEX idx_tipo (tipo),
  INDEX idx_grupo (grupo),
  UNIQUE KEY uk_prefixo_numero (prefixo, numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Total**: 994 registros (20 FWC + 960 Seleções + 14 Coca-Cola)

#### 3. `copa_albuns` - Álbuns dos Usuários

```sql
CREATE TABLE copa_albuns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  nome ENUM('prata', 'normal', 'ouro') NOT NULL,
  cor VARCHAR(7) NOT NULL,                -- #C0C0C0, #0066CC, #FFD700
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES copa_usuarios(id) ON DELETE CASCADE,
  UNIQUE KEY uk_usuario_album (usuario_id, nome),
  INDEX idx_usuario_id (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Criação Automática**: Quando um usuário se registra, 3 álbuns são criados automaticamente.

#### 4. `copa_status` - Status das Figurinhas nos Álbuns

```sql
CREATE TABLE copa_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  album_id INT NOT NULL,
  figurinha_id INT NOT NULL,
  possui BOOLEAN DEFAULT FALSE,           -- TRUE = tem, FALSE = falta
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (album_id) REFERENCES copa_albuns(id) ON DELETE CASCADE,
  FOREIGN KEY (figurinha_id) REFERENCES copa_figurinhas(id) ON DELETE CASCADE,
  UNIQUE KEY uk_album_figurinha (album_id, figurinha_id),
  INDEX idx_album_id (album_id),
  INDEX idx_figurinha_id (figurinha_id),
  INDEX idx_possui (possui)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Total de Registros**: `Nº Usuários × 3 álbuns × 994 figurinhas`

### Diagrama de Relacionamento (ERD)

```
┌─────────────────┐
│ copa_usuarios   │
│─────────────────│
│ id (PK)         │
│ nome            │
│ email (UNIQUE)  │
│ senha_hash      │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐         ┌─────────────────┐
│  copa_albuns    │         │ copa_figurinhas │
│─────────────────│         │─────────────────│
│ id (PK)         │         │ id (PK)         │
│ usuario_id (FK) │         │ codigo (UNIQUE) │
│ nome            │         │ prefixo         │
│ cor             │         │ numero          │
└────────┬────────┘         │ tipo            │
         │                  │ grupo           │
         │ 1:N              │ selecao         │
         │                  │ ordem_exibicao  │
┌────────▼────────┐         └────────┬────────┘
│  copa_status    │                  │
│─────────────────│                  │
│ id (PK)         │◄─────────────────┘
│ album_id (FK)   │         N:1
│ figurinha_id(FK)│
│ possui          │
└─────────────────┘
```

### Script de Seed das 994 Figurinhas

O script gerará as figurinhas na seguinte estrutura:

```sql
-- FWC (20 figurinhas)
INSERT INTO copa_figurinhas (codigo, prefixo, numero, tipo, grupo, selecao, ordem_exibicao) VALUES
('FWC00', 'FWC', 0, 'FWC', NULL, NULL, 1),
('FWC01', 'FWC', 1, 'FWC', NULL, NULL, 2),
-- ... até FWC19

-- Seleções (960 figurinhas = 48 seleções × 20)
-- Exemplo: Gana (Grupo A)
INSERT INTO copa_figurinhas (codigo, prefixo, numero, tipo, grupo, selecao, ordem_exibicao) VALUES
('GHA01', 'GHA', 1, 'SELECAO', 'Grupo A', 'Gana', 21),
('GHA02', 'GHA', 2, 'SELECAO', 'Grupo A', 'Gana', 22),
-- ... até GHA20

-- Coca-Cola (14 figurinhas)
INSERT INTO copa_figurinhas (codigo, prefixo, numero, tipo, grupo, selecao, ordem_exibicao) VALUES
('CC01', 'CC', 1, 'COCACOLA', NULL, 'Coca-Cola', 981),
('CC02', 'CC', 2, 'COCACOLA', NULL, 'Coca-Cola', 982),
-- ... até CC14
```

---

## 🔌 Backend - API REST

### Roteamento Principal (`app.ts` modificado)

```typescript
// app.ts (adicionar ao Server.ts)

// ✅ Rotas existentes do Sistema Escolar
this.#app.use("/api/escolas", escolaRouter);
this.#app.use("/api/usuarios", usuarioRouter);
// ... outras rotas escolares

// 🆕 NOVO - Rotas do Sistema Copa (isoladas)
import { copaRoutes } from "../routes/copa/index";
this.#app.use("/album", copaRoutes); // Todas as rotas Copa começam com /album
```

### Endpoints da API Copa

#### 1. Autenticação (`/album/auth`)

```typescript
// POST /album/auth/registro
{
  "nome": "João Silva",
  "email": "joao@example.com",
  "senha": "senha123"
}
// Resposta: { "token": "jwt...", "usuario": {...} }

// POST /album/auth/login
{
  "email": "joao@example.com",
  "senha": "senha123"
}
// Resposta: { "token": "jwt...", "usuario": {...} }

// GET /album/auth/me (requer token)
// Resposta: { "usuario": {...} }
```

#### 2. Figurinhas (`/album/figurinhas`)

```typescript
// GET /album/figurinhas
// Query params: ?tipo=SELECAO&prefixo=GHA&codigo=GHA01
// Resposta: [{ id, codigo, prefixo, numero, tipo, grupo, selecao }, ...]

// GET /album/figurinhas/:id
// Resposta: { id, codigo, prefixo, numero, tipo, grupo, selecao }

// GET /album/figurinhas/buscar/:codigo
// Exemplo: /album/figurinhas/buscar/GHA01
// Resposta: { id, codigo, prefixo, numero, tipo, grupo, selecao }

// GET /album/figurinhas/prefixo/:prefixo
// Exemplo: /album/figurinhas/prefixo/GHA
// Resposta: [{ código GHA01 }, { código GHA02 }, ...]
```

#### 3. Álbuns (`/album/albuns`)

```typescript
// GET /album/albuns/meus (requer token)
// Resposta: [
//   { id, nome: 'prata', cor: '#C0C0C0', estatisticas: {...} },
//   { id, nome: 'normal', cor: '#0066CC', estatisticas: {...} },
//   { id, nome: 'ouro', cor: '#FFD700', estatisticas: {...} }
// ]

// GET /album/albuns/:albumId/figurinhas
// Resposta: [
//   { figurinha: {...}, possui: true },
//   { figurinha: {...}, possui: false },
//   ...
// ]

// PUT /album/albuns/:albumId/figurinhas/:figurinhaId
{
  "possui": true  // ou false
}
// Resposta: { "sucesso": true, "status": {...} }
```

#### 4. Estatísticas (`/album/estatisticas`)

```typescript
// GET /album/estatisticas/geral (requer token)
// Resposta: {
//   "prata": { total: 994, completas: 977, faltantes: 17, percentual: 98.3 },
//   "normal": { total: 994, completas: 955, faltantes: 39, percentual: 96.1 },
//   "ouro": { total: 994, completas: 717, faltantes: 277, percentual: 72.1 },
//   "completasNos3": 715
// }

// GET /album/estatisticas/faltantes/:albumNome
// Exemplo: /album/estatisticas/faltantes/prata
// Resposta: {
//   "total": 17,
//   "porGrupo": [
//     { "grupo": "Grupo A", "faltantes": [{ codigo: "GHA15" }, ...] },
//     ...
//   ]
// }
```

### Estrutura dos Controllers

#### Exemplo: `backend/controllers/copa/figurinha.controller.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import { FigurinhaService } from "../../services/copa/figurinha.service";
import ErrorResponse from "../../utils/ErrorResponse";

export class FigurinhaController {
  private figurinhaService: FigurinhaService;

  constructor() {
    this.figurinhaService = new FigurinhaService();
  }

  // GET /album/figurinhas
  listarTodas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tipo, prefixo, codigo } = req.query;
      const figurinhas = await this.figurinhaService.buscar({ tipo, prefixo, codigo });
      res.json({ sucesso: true, data: figurinhas });
    } catch (error) {
      next(new ErrorResponse("Erro ao buscar figurinhas", 500));
    }
  };

  // GET /album/figurinhas/buscar/:codigo
  buscarPorCodigo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { codigo } = req.params;
      const figurinha = await this.figurinhaService.buscarPorCodigo(codigo);
      if (!figurinha) {
        return next(new ErrorResponse("Figurinha não encontrada", 404));
      }
      res.json({ sucesso: true, data: figurinha });
    } catch (error) {
      next(new ErrorResponse("Erro ao buscar figurinha", 500));
    }
  };

  // GET /album/figurinhas/prefixo/:prefixo
  buscarPorPrefixo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prefixo } = req.params;
      const figurinhas = await this.figurinhaService.buscarPorPrefixo(prefixo);
      res.json({ sucesso: true, data: figurinhas, total: figurinhas.length });
    } catch (error) {
      next(new ErrorResponse("Erro ao buscar figurinhas por prefixo", 500));
    }
  };
}
```

---

## 🎨 Frontend - Interface do Usuário

### Páginas Principais

#### 1. Dashboard Principal (`/album`)

**Componentes:**
- Header com logo Copa 2026
- Estatísticas gerais (3 cards: Prata, Normal, Ouro)
- Botões de navegação
- Indicador de completude geral

**Mockup:**
```
┌────────────────────────────────────────────────────┐
│  🏆 Copa do Mundo 2026 - Meu Álbum                │
│  [Logout]                                          │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ 🥈 PRATA │  │ 📘 NORMAL│  │ 🥇 OURO  │        │
│  │ 977/994  │  │ 955/994  │  │ 717/994  │        │
│  │  98.3%   │  │  96.1%   │  │  72.1%   │        │
│  └──────────┘  └──────────┘  └──────────┘        │
│                                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │ 🏆 Completas nos 3 álbuns: 715 (71.9%)     │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
│  [🔍 Pesquisar Figurinhas]  [📚 Meus Álbuns]     │
│                                                    │
└────────────────────────────────────────────────────┘
```

#### 2. Pesquisa de Figurinhas (`/album/pesquisa`)

**Componentes:**
- Barra de busca (código ou prefixo)
- Filtros (tipo, status)
- Grid de figurinhas (cards)
- Modal de edição de status

**Mockup:**
```
┌────────────────────────────────────────────────────┐
│  🔍 Pesquisar Figurinhas                           │
│  [← Voltar]                                        │
├────────────────────────────────────────────────────┤
│                                                    │
│  Pesquisar: [GHA        ] [🔍 Buscar]             │
│                                                    │
│  Tipo: [Todas ▼]  Status: [Todas ▼]              │
│                                                    │
├────────────────────────────────────────────────────┤
│  Resultados: 20 figurinhas                         │
│                                                    │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│  │GHA01│ │GHA02│ │GHA03│ │GHA04│ │GHA05│        │
│  │✓ ✓ ✓│ │✓ ✓ ✗│ │✓ ✓ ✓│ │✓ ✗ ✗│ │✓ ✓ ✓│        │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘        │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│  │GHA06│ │GHA07│ │GHA08│ │GHA09│ │GHA10│        │
│  │✓ ✓ ✓│ │✓ ✓ ✓│ │✓ ✓ ✗│ │✓ ✓ ✓│ │✓ ✓ ✓│        │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘        │
│                                                    │
│  Legenda: ✓ Prata  ✓ Normal  ✓ Ouro              │
└────────────────────────────────────────────────────┘
```

#### 3. Visualização por Álbum (`/album/meus-albuns`)

**Componentes:**
- Tabs para alternar entre álbuns
- Lista de faltantes organizada por grupo
- Estatísticas do álbum selecionado
- Progresso visual

**Mockup:**
```
┌────────────────────────────────────────────────────┐
│  📚 Meus Álbuns                                    │
│  [← Voltar]                                        │
├────────────────────────────────────────────────────┤
│                                                    │
│  [🥈 Prata] [📘 Normal] [🥇 Ouro]                │
│   ATIVO      -          -                         │
│                                                    │
│  🥈 Álbum Prata: 977/994 (98.3%)                  │
│  [████████████████████░░] 98%                     │
│                                                    │
│  Faltam apenas 17 figurinhas:                     │
│                                                    │
│  📦 Grupo A (2 faltantes)                         │
│     • GHA15, GHA18                                │
│                                                    │
│  📦 Grupo D (5 faltantes)                         │
│     • MEX03, MEX07, MEX11, MEX15, MEX19          │
│                                                    │
│  📦 FWC (3 faltantes)                             │
│     • FWC12, FWC16, FWC19                         │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Componentes React

#### Exemplo: `FigurinhaCard.tsx`

```typescript
interface FigurinhaCardProps {
  figurinha: {
    id: number;
    codigo: string;
    prefixo: string;
    numero: number;
    tipo: string;
  };
  status: {
    prata: boolean;
    normal: boolean;
    ouro: boolean;
  };
  onClick: (figurinha: any) => void;
}

export const FigurinhaCard: React.FC<FigurinhaCardProps> = ({
  figurinha,
  status,
  onClick,
}) => {
  const isCompleta = status.prata && status.normal && status.ouro;
  const borderColor = isCompleta ? "border-green-500" : "border-gray-300";

  return (
    <div
      className={`p-4 border-2 ${borderColor} rounded-lg cursor-pointer hover:shadow-lg transition`}
      onClick={() => onClick(figurinha)}
    >
      <h3 className="text-lg font-bold text-center">{figurinha.codigo}</h3>
      <div className="flex justify-center gap-2 mt-2">
        <span className={status.prata ? "text-gray-400" : "text-gray-200"}>P</span>
        <span className={status.normal ? "text-blue-600" : "text-gray-200"}>N</span>
        <span className={status.ouro ? "text-yellow-500" : "text-gray-200"}>O</span>
      </div>
    </div>
  );
};
```

---

## 🔗 Integração com Ecossistema Escolar

### Pontos de Integração

#### 1. Conexão MySQL (Compartilhada)

```typescript
// backend/database/mysql.ts (SEM MODIFICAÇÕES)
// ✅ Mesma pool de conexões usada por ambos os sistemas

// Uso no Sistema Copa:
import { pool } from "../../database/mysql";

export class CopaRepository {
  async buscarFigurinhas() {
    const [rows] = await pool.query("SELECT * FROM copa_figurinhas");
    return rows;
  }
}
```

#### 2. Servidor Express (Modificações Mínimas)

```typescript
// backend/Server.ts

// ✅ Método setupRoutes() - ADICIONAR no final
private setupRoutes(): void {
  // ... rotas existentes do sistema escolar ...
  
  // 🆕 ADICIONAR - Rotas do Sistema Copa
  const copaRouter = copaRouterFactory();
  this.#app.use("/album", copaRouter);
  
  console.log("✅ Rotas da Copa do Mundo registradas em /album");
}
```

#### 3. Frontend Next.js (Nova Página)

```typescript
// frontend/app/album/layout.tsx
export default function AlbumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-green-700">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-2xl font-bold">🏆 Copa 2026</h1>
        </div>
      </nav>
      <main className="py-8">{children}</main>
    </div>
  );
}
```

### Checklist de Não-Interferência

- [ ] **Zero imports** de controllers/services escolares em código Copa
- [ ] **Zero imports** de controllers/services Copa em código escolar
- [ ] **Prefixo `copa_`** em todas as tabelas MySQL
- [ ] **Namespace `/album`** em todas as rotas Copa
- [ ] **Autenticação independente** (sem JWT compartilhado)
- [ ] **Migrations separadas** na pasta `migrations/copa/`
- [ ] **Componentes React isolados** na pasta `components/copa/`

---

## 📋 Plano de Implementação Passo a Passo

### Fase 1: Preparação do Banco de Dados (2-3 horas)

#### Passo 1.1: Criar Migrations

```bash
# Criar diretório de migrations
mkdir -p backend/database/migrations/copa

# Criar arquivos SQL
touch backend/database/migrations/copa/001_create_copa_tables.sql
touch backend/database/migrations/copa/002_seed_figurinhas.sql
touch backend/database/migrations/copa/003_create_indexes.sql
```

**Arquivo:** `001_create_copa_tables.sql`
- Criar tabelas: `copa_usuarios`, `copa_figurinhas`, `copa_albuns`, `copa_status`

**Arquivo:** `002_seed_figurinhas.sql`
- Inserir 994 figurinhas (script de seed)

**Arquivo:** `003_create_indexes.sql`
- Criar índices otimizados

#### Passo 1.2: Executar Migrations

```bash
# Conectar ao MySQL Railway
mysql -h <railway-host> -u <user> -p <database>

# Executar migrations
source backend/database/migrations/copa/001_create_copa_tables.sql;
source backend/database/migrations/copa/002_seed_figurinhas.sql;
source backend/database/migrations/copa/003_create_indexes.sql;
```

#### Passo 1.3: Validar Estrutura

```sql
-- Verificar tabelas criadas
SHOW TABLES LIKE 'copa_%';

-- Verificar 994 figurinhas inseridas
SELECT COUNT(*) FROM copa_figurinhas;

-- Verificar índices
SHOW INDEX FROM copa_figurinhas;
```

---

### Fase 2: Backend - Entities e Repositories (3-4 horas)

#### Passo 2.1: Criar Entities

```bash
mkdir -p backend/entities/copa
touch backend/entities/copa/CopaUsuario.ts
touch backend/entities/copa/CopaFigurinha.ts
touch backend/entities/copa/CopaAlbum.ts
touch backend/entities/copa/CopaStatus.ts
touch backend/entities/copa/index.ts
```

#### Passo 2.2: Implementar Entities

**Arquivo:** `backend/entities/copa/CopaFigurinha.ts`
```typescript
export interface CopaFigurinha {
  id: number;
  codigo: string;
  prefixo: string;
  numero: number;
  tipo: 'FWC' | 'SELECAO' | 'COCACOLA';
  grupo: string | null;
  selecao: string | null;
  ordemExibicao: number;
  criadoEm: Date;
}
```

#### Passo 2.3: Criar Repositories

```bash
mkdir -p backend/repositories/copa
touch backend/repositories/copa/figurinha.repository.ts
touch backend/repositories/copa/album.repository.ts
touch backend/repositories/copa/usuario.repository.ts
touch backend/repositories/copa/status.repository.ts
touch backend/repositories/copa/index.ts
```

#### Passo 2.4: Implementar Repositories

**Arquivo:** `backend/repositories/copa/figurinha.repository.ts`
```typescript
import { pool } from "../../database/mysql";
import { CopaFigurinha } from "../../entities/copa/CopaFigurinha";

export class FigurinhaRepository {
  async buscarTodas(): Promise<CopaFigurinha[]> {
    const [rows] = await pool.query(
      "SELECT * FROM copa_figurinhas ORDER BY ordem_exibicao"
    );
    return rows as CopaFigurinha[];
  }

  async buscarPorCodigo(codigo: string): Promise<CopaFigurinha | null> {
    const [rows] = await pool.query(
      "SELECT * FROM copa_figurinhas WHERE codigo = ?",
      [codigo.toUpperCase()]
    );
    return (rows as CopaFigurinha[])[0] || null;
  }

  async buscarPorPrefixo(prefixo: string): Promise<CopaFigurinha[]> {
    const [rows] = await pool.query(
      "SELECT * FROM copa_figurinhas WHERE prefixo = ? ORDER BY numero",
      [prefixo.toUpperCase()]
    );
    return rows as CopaFigurinha[];
  }
}
```

---

### Fase 3: Backend - Services e Controllers (4-5 horas)

#### Passo 3.1: Criar Services

```bash
mkdir -p backend/services/copa
touch backend/services/copa/figurinha.service.ts
touch backend/services/copa/album.service.ts
touch backend/services/copa/auth.service.ts
touch backend/services/copa/estatistica.service.ts
touch backend/services/copa/index.ts
```

#### Passo 3.2: Implementar Services

**Arquivo:** `backend/services/copa/figurinha.service.ts`
```typescript
import { FigurinhaRepository } from "../../repositories/copa/figurinha.repository";
import { CopaFigurinha } from "../../entities/copa/CopaFigurinha";

export class FigurinhaService {
  private repository: FigurinhaRepository;

  constructor() {
    this.repository = new FigurinhaRepository();
  }

  async buscar(filtros: {
    tipo?: string;
    prefixo?: string;
    codigo?: string;
  }): Promise<CopaFigurinha[]> {
    // Lógica de busca com filtros
    if (filtros.codigo) {
      const fig = await this.repository.buscarPorCodigo(filtros.codigo);
      return fig ? [fig] : [];
    }
    if (filtros.prefixo) {
      return await this.repository.buscarPorPrefixo(filtros.prefixo);
    }
    return await this.repository.buscarTodas();
  }

  async buscarPorCodigo(codigo: string): Promise<CopaFigurinha | null> {
    return await this.repository.buscarPorCodigo(codigo);
  }

  async buscarPorPrefixo(prefixo: string): Promise<CopaFigurinha[]> {
    return await this.repository.buscarPorPrefixo(prefixo);
  }
}
```

#### Passo 3.3: Criar Controllers

```bash
mkdir -p backend/controllers/copa
touch backend/controllers/copa/figurinha.controller.ts
touch backend/controllers/copa/album.controller.ts
touch backend/controllers/copa/auth.controller.ts
touch backend/controllers/copa/estatistica.controller.ts
touch backend/controllers/copa/index.ts
```

#### Passo 3.4: Implementar Controllers

(Ver exemplo completo na seção "Backend - API REST")

---

### Fase 4: Backend - Rotas (2-3 horas)

#### Passo 4.1: Criar Rotas

```bash
mkdir -p routes/copa
touch routes/copa/index.ts
touch routes/copa/figurinha.routes.ts
touch routes/copa/album.routes.ts
touch routes/copa/auth.routes.ts
touch routes/copa/estatistica.routes.ts
```

#### Passo 4.2: Implementar Rotas

**Arquivo:** `routes/copa/figurinha.routes.ts`
```typescript
import { Router } from "express";
import { FigurinhaController } from "../../backend/controllers/copa/figurinha.controller";

export function figurinhaRouterFactory(): Router {
  const router = Router();
  const controller = new FigurinhaController();

  // GET /album/figurinhas
  router.get("/", controller.listarTodas);

  // GET /album/figurinhas/buscar/:codigo
  router.get("/buscar/:codigo", controller.buscarPorCodigo);

  // GET /album/figurinhas/prefixo/:prefixo
  router.get("/prefixo/:prefixo", controller.buscarPorPrefixo);

  return router;
}
```

#### Passo 4.3: Agregar Rotas

**Arquivo:** `routes/copa/index.ts`
```typescript
import { Router } from "express";
import { figurinhaRouterFactory } from "./figurinha.routes";
import { albumRouterFactory } from "./album.routes";
import { authRouterFactory } from "./auth.routes";
import { estatisticaRouterFactory } from "./estatistica.routes";

export function copaRouterFactory(): Router {
  const router = Router();

  router.use("/auth", authRouterFactory());
  router.use("/figurinhas", figurinhaRouterFactory());
  router.use("/albuns", albumRouterFactory());
  router.use("/estatisticas", estatisticaRouterFactory());

  return router;
}

export const copaRoutes = copaRouterFactory();
```

#### Passo 4.4: Integrar no Servidor

**Arquivo:** `backend/Server.ts` (modificar método `setupRoutes()`)
```typescript
private setupRoutes(): void {
  // ... rotas existentes do sistema escolar ...
  
  // 🆕 ADICIONAR - Rotas do Sistema Copa
  import { copaRoutes } from "../routes/copa/index";
  this.#app.use("/album", copaRoutes);
  
  console.log("✅ Rotas da Copa do Mundo registradas em /album");
}
```

---

### Fase 5: Frontend - Configuração e Utilitários (2-3 horas)

#### Passo 5.1: Criar Cliente API

```bash
mkdir -p frontend/lib/copa
touch frontend/lib/copa/api.ts
touch frontend/lib/copa/types.ts
```

**Arquivo:** `frontend/lib/copa/api.ts`
```typescript
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const copaApi = {
  // Autenticação
  login: async (email: string, senha: string) => {
    const response = await axios.post(`${API_BASE}/album/auth/login`, {
      email,
      senha,
    });
    return response.data;
  },

  registro: async (nome: string, email: string, senha: string) => {
    const response = await axios.post(`${API_BASE}/album/auth/registro`, {
      nome,
      email,
      senha,
    });
    return response.data;
  },

  // Figurinhas
  buscarFigurinhas: async (filtros?: {
    tipo?: string;
    prefixo?: string;
    codigo?: string;
  }) => {
    const params = new URLSearchParams(filtros as any);
    const response = await axios.get(
      `${API_BASE}/album/figurinhas?${params}`
    );
    return response.data;
  },

  buscarPorCodigo: async (codigo: string) => {
    const response = await axios.get(
      `${API_BASE}/album/figurinhas/buscar/${codigo}`
    );
    return response.data;
  },

  // Álbuns
  meusAlbuns: async (token: string) => {
    const response = await axios.get(`${API_BASE}/album/albuns/meus`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  atualizarStatus: async (
    albumId: number,
    figurinhaId: number,
    possui: boolean,
    token: string
  ) => {
    const response = await axios.put(
      `${API_BASE}/album/albuns/${albumId}/figurinhas/${figurinhaId}`,
      { possui },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // Estatísticas
  estatisticasGerais: async (token: string) => {
    const response = await axios.get(`${API_BASE}/album/estatisticas/geral`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};
```

#### Passo 5.2: Criar Tipos TypeScript

**Arquivo:** `frontend/lib/copa/types.ts`
```typescript
export interface Figurinha {
  id: number;
  codigo: string;
  prefixo: string;
  numero: number;
  tipo: "FWC" | "SELECAO" | "COCACOLA";
  grupo: string | null;
  selecao: string | null;
  ordemExibicao: number;
}

export interface Album {
  id: number;
  nome: "prata" | "normal" | "ouro";
  cor: string;
  estatisticas: {
    total: number;
    completas: number;
    faltantes: number;
    percentual: number;
  };
}

export interface StatusFigurinha {
  albumId: number;
  figurinhaId: number;
  possui: boolean;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
}
```

---

### Fase 6: Frontend - Componentes (4-5 horas)

#### Passo 6.1: Criar Componentes

```bash
mkdir -p frontend/components/copa
touch frontend/components/copa/FigurinhaCard.tsx
touch frontend/components/copa/AlbumSelector.tsx
touch frontend/components/copa/BuscaFigurinha.tsx
touch frontend/components/copa/EstatisticasCard.tsx
touch frontend/components/copa/ModalEditarStatus.tsx
```

#### Passo 6.2: Implementar Componentes

(Ver exemplo `FigurinhaCard.tsx` na seção "Frontend - Interface do Usuário")

---

### Fase 7: Frontend - Páginas (5-6 horas)

#### Passo 7.1: Criar Estrutura de Páginas

```bash
mkdir -p frontend/app/album
mkdir -p frontend/app/album/login
mkdir -p frontend/app/album/pesquisa
mkdir -p frontend/app/album/meus-albuns

touch frontend/app/album/layout.tsx
touch frontend/app/album/page.tsx
touch frontend/app/album/login/page.tsx
touch frontend/app/album/pesquisa/page.tsx
touch frontend/app/album/meus-albuns/page.tsx
```

#### Passo 7.2: Implementar Layout

**Arquivo:** `frontend/app/album/layout.tsx`
```typescript
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AlbumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("copa_token");
    if (!token) {
      router.push("/album/login");
    } else {
      // Validar token
      // ...
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("copa_token");
    router.push("/album/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-green-700 to-yellow-600">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-700">
            🏆 Copa do Mundo 2026
          </h1>
          {usuario && (
            <div className="flex items-center gap-4">
              <span className="text-gray-700">Olá, {usuario.nome}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </nav>
      <main className="py-8">{children}</main>
    </div>
  );
}
```

#### Passo 7.3: Implementar Páginas

**Arquivo:** `frontend/app/album/page.tsx` (Dashboard)
```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { copaApi } from "@/lib/copa/api";
import { EstatisticasCard } from "@/components/copa/EstatisticasCard";

export default function AlbumDashboard() {
  const router = useRouter();
  const [estatisticas, setEstatisticas] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarEstatisticas();
  }, []);

  const carregarEstatisticas = async () => {
    try {
      const token = localStorage.getItem("copa_token");
      if (!token) {
        router.push("/album/login");
        return;
      }

      const data = await copaApi.estatisticasGerais(token);
      setEstatisticas(data.data);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-white text-2xl">Carregando...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      <h2 className="text-3xl font-bold text-white mb-8 text-center">
        Meu Álbum da Copa
      </h2>

      {/* Estatísticas dos 3 álbuns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <EstatisticasCard
          nome="Prata"
          cor="#C0C0C0"
          stats={estatisticas?.prata}
        />
        <EstatisticasCard
          nome="Normal"
          cor="#0066CC"
          stats={estatisticas?.normal}
        />
        <EstatisticasCard
          nome="Ouro"
          cor="#FFD700"
          stats={estatisticas?.ouro}
        />
      </div>

      {/* Completude geral */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h3 className="text-2xl font-bold text-center mb-4">
          🏆 Completas nos 3 álbuns: {estatisticas?.completasNos3} (
          {((estatisticas?.completasNos3 / 994) * 100).toFixed(1)}%)
        </h3>
      </div>

      {/* Botões de navegação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => router.push("/album/pesquisa")}
          className="bg-blue-600 text-white py-6 rounded-lg text-xl font-bold hover:bg-blue-700 transition"
        >
          🔍 Pesquisar Figurinhas
        </button>
        <button
          onClick={() => router.push("/album/meus-albuns")}
          className="bg-green-600 text-white py-6 rounded-lg text-xl font-bold hover:bg-green-700 transition"
        >
          📚 Meus Álbuns
        </button>
      </div>
    </div>
  );
}
```

---

### Fase 8: Testes e Validação (3-4 horas)

#### Passo 8.1: Testes de API

```bash
# Criar coleção Postman
touch tests/Copa_Album_Collection.json
```

**Testar Endpoints:**
- ✅ POST `/album/auth/registro`
- ✅ POST `/album/auth/login`
- ✅ GET `/album/figurinhas`
- ✅ GET `/album/figurinhas/buscar/GHA01`
- ✅ GET `/album/figurinhas/prefixo/GHA`
- ✅ GET `/album/albuns/meus`
- ✅ PUT `/album/albuns/:albumId/figurinhas/:figurinhaId`
- ✅ GET `/album/estatisticas/geral`

#### Passo 8.2: Testes de Frontend

- ✅ Login funciona corretamente
- ✅ Dashboard carrega estatísticas
- ✅ Pesquisa de figurinhas funciona
- ✅ Modal de edição atualiza status
- ✅ Navegação entre páginas funciona
- ✅ Logout limpa token

#### Passo 8.3: Validação de Isolamento

```sql
-- Verificar que tabelas Copa não afetam sistema escolar
SELECT * FROM copa_figurinhas LIMIT 5;
SELECT * FROM escola LIMIT 5; -- Deve funcionar normalmente

-- Verificar isolamento de dados
SELECT COUNT(*) FROM copa_usuarios; -- Usuários Copa
SELECT COUNT(*) FROM usuario; -- Usuários Sistema Escolar
```

---

### Fase 9: Deploy e Configuração (2-3 horas)

#### Passo 9.1: Configurar Variáveis de Ambiente

```bash
# .env (adicionar se necessário)
COPA_JWT_SECRET=sua_chave_secreta_copa_diferente_do_sistema_escolar
```

#### Passo 9.2: Build e Deploy

```bash
# Backend já usa o mesmo servidor Express
# Frontend Next.js já está configurado

# Testar localmente
npm run dev

# Build para produção
npm run build

# Deploy no Railway
git add .
git commit -m "feat: Adicionar sistema de álbum da Copa do Mundo"
git push railway main
```

#### Passo 9.3: Validar em Produção

- ✅ Acessar `www.baua.com.br/album`
- ✅ Testar login/registro
- ✅ Testar funcionalidades principais
- ✅ Verificar que sistema escolar não foi afetado

---

## 🗑️ Estratégia de Remoção Futura

### Quando Remover o Sistema Copa

1. **Identificar Arquivos para Deletar**

```bash
# Backend
rm -rf backend/controllers/copa/
rm -rf backend/services/copa/
rm -rf backend/repositories/copa/
rm -rf backend/entities/copa/
rm -rf backend/middlewares/copa/
rm -rf backend/utils/copa/

# Routes
rm -rf routes/copa/

# Frontend
rm -rf frontend/app/album/
rm -rf frontend/components/copa/
rm -rf frontend/lib/copa/

# Migrations
rm -rf backend/database/migrations/copa/
```

2. **Remover Rotas do Servidor**

```typescript
// backend/Server.ts - REMOVER estas linhas:
import { copaRoutes } from "../routes/copa/index";
this.#app.use("/album", copaRoutes);
```

3. **Remover Tabelas do Banco**

```sql
-- Conectar ao MySQL Railway
mysql -h <railway-host> -u <user> -p <database>

-- Deletar tabelas Copa
DROP TABLE IF EXISTS copa_status;
DROP TABLE IF EXISTS copa_albuns;
DROP TABLE IF EXISTS copa_figurinhas;
DROP TABLE IF EXISTS copa_usuarios;
```

4. **Commit e Deploy**

```bash
git add .
git commit -m "feat: Remover sistema temporário de álbum da Copa"
git push railway main
```

### Checklist de Remoção

- [ ] Backup dos dados Copa (se necessário)
- [ ] Deletar arquivos backend Copa
- [ ] Deletar arquivos frontend Copa
- [ ] Deletar rotas Copa
- [ ] Remover integração no Server.ts
- [ ] Deletar tabelas MySQL com prefixo `copa_`
- [ ] Validar que sistema escolar continua funcionando
- [ ] Commit e deploy

---

## ✅ Checklist de Implementação

### Preparação

- [ ] Ler planejamento completo
- [ ] Configurar ambiente de desenvolvimento
- [ ] Backup do banco de dados atual

### Fase 1: Banco de Dados

- [ ] Criar migrations SQL
- [ ] Executar migrations no Railway
- [ ] Validar 994 figurinhas inseridas
- [ ] Validar índices criados

### Fase 2: Backend - Estrutura

- [ ] Criar entities Copa
- [ ] Criar repositories Copa
- [ ] Testar conexão com MySQL

### Fase 3: Backend - Lógica

- [ ] Implementar services Copa
- [ ] Implementar controllers Copa
- [ ] Implementar middleware de autenticação

### Fase 4: Backend - Rotas

- [ ] Criar rotas de autenticação
- [ ] Criar rotas de figurinhas
- [ ] Criar rotas de álbuns
- [ ] Criar rotas de estatísticas
- [ ] Integrar rotas no Server.ts

### Fase 5: Frontend - Base

- [ ] Criar cliente API
- [ ] Criar tipos TypeScript
- [ ] Configurar layout Copa

### Fase 6: Frontend - Componentes

- [ ] Componente FigurinhaCard
- [ ] Componente AlbumSelector
- [ ] Componente BuscaFigurinha
- [ ] Componente EstatisticasCard
- [ ] Componente ModalEditarStatus

### Fase 7: Frontend - Páginas

- [ ] Página de login
- [ ] Dashboard principal
- [ ] Página de pesquisa
- [ ] Página de álbuns

### Fase 8: Testes

- [ ] Testar APIs no Postman
- [ ] Testar frontend localmente
- [ ] Validar isolamento
- [ ] Testar fluxo completo

### Fase 9: Deploy

- [ ] Build local
- [ ] Deploy no Railway
- [ ] Validar em produção
- [ ] Testar sistema escolar não afetado

---

## 📊 Estimativa de Tempo Total

| Fase | Descrição | Tempo Estimado |
|------|-----------|----------------|
| 1 | Preparação do Banco de Dados | 2-3 horas |
| 2 | Backend - Entities e Repositories | 3-4 horas |
| 3 | Backend - Services e Controllers | 4-5 horas |
| 4 | Backend - Rotas | 2-3 horas |
| 5 | Frontend - Configuração e Utilitários | 2-3 horas |
| 6 | Frontend - Componentes | 4-5 horas |
| 7 | Frontend - Páginas | 5-6 horas |
| 8 | Testes e Validação | 3-4 horas |
| 9 | Deploy e Configuração | 2-3 horas |
| **TOTAL** | | **27-36 horas** |

---

## 🎯 Considerações Finais

### Vantagens da Abordagem Isolada

1. **Zero Risco**: Sistema escolar não é afetado
2. **Fácil Remoção**: Estrutura preparada para deleção futura
3. **Mesma Infraestrutura**: Aproveita Railway e MySQL existentes
4. **Manutenção Simples**: Código organizado e separado

### Pontos de Atenção

1. **Prefixo `copa_`**: SEMPRE usar em tabelas MySQL
2. **Namespace `/album`**: SEMPRE usar em rotas
3. **Zero Dependências**: Não importar código do sistema escolar
4. **Autenticação Separada**: JWT próprio, não compartilhar com sistema escolar

### Próximos Passos

1. ✅ Ler e validar este planejamento
2. ✅ Iniciar Fase 1 (Banco de Dados)
3. ✅ Seguir fases sequencialmente
4. ✅ Testar após cada fase
5. ✅ Deploy e validação final

---

**Documento criado em:** 06 de Junho de 2026  
**Versão:** 1.0  
**Autor:** Sistema de Planejamento Automatizado  
**Status:** Pronto para Implementação 🚀
