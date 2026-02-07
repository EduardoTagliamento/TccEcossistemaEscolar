# Copilot Instructions - Ecossistema Escolar

Esta pasta contém as instruções estruturadas para o GitHub Copilot entender a arquitetura e padrões do projeto **Ecossistema Escolar**.

## Arquivos de Instrução

### 📐 [architecture.md](architecture.md)
- Visão geral da arquitetura MVC em camadas
- Responsabilidades de cada camada (Controllers, Services, Repositories, Entities, Middlewares, AI)
- Padrões de injeção de dependências
- Error handling e DTOs
- Convenções de nomenclatura

### 🗄️ [database.md](database.md)
- Configuração do MySQL e pool de conexões
- Schema atual das tabelas
- Queries parametrizadas e prevenção de SQL Injection
- Convenções de nomenclatura (notação húngara)
- Mapeamento Entity ↔ Database
- Tratamento de BLOBs (imagens)

### 🎯 [patterns.md](patterns.md)
- Campos privados com sintaxe `#`
- Validação em múltiplas camadas
- Logging com emojis para identificação visual
- Estrutura de ErrorResponse
- DTOs para respostas de API
- Rotas RESTful e bind de contexto
- Async/Await e TypeScript types

### 🔄 [workflow.md](workflow.md)
- Passo a passo completo para adicionar novas features
- Ordem de implementação: Entity → SQL → DAO → Service → Middleware → Controller → Routes
- Templates de código para cada camada
- Checklist de implementação
- Exemplos de testes manuais com cURL

### ⚠️ [anti-patterns.md](anti-patterns.md)
- Erros comuns a evitar
- Comparações lado a lado: ERRADO vs CORRETO
- Violações de separação de responsabilidades
- Problemas de segurança (SQL Injection)
- Más práticas de encapsulamento

## Como Usar

### Para Desenvolvedores
Consulte estes arquivos ao:
- Implementar novas features
- Revisar código
- Onboarding de novos membros
- Resolver dúvidas arquiteturais

### Para o GitHub Copilot
Estes arquivos servem como contexto para:
- Gerar código consistente com a arquitetura
- Sugerir implementações seguindo os padrões do projeto
- Identificar e alertar sobre anti-patterns
- Completar código de forma contextualizada

## Estrutura do Projeto

```
backend/
├── controllers/      # HTTP handling (🔵)
├── services/         # Business logic (🟣)
├── repositories/     # Data access (🟢)
├── entities/         # Domain models
├── middlewares/      # Request validation (🔷)
├── ai/              # AI agents (future)
├── database/        # DB configuration
└── utils/           # ErrorResponse, helpers

routes/              # Route definitions
docs/                # API documentation
frontend/            # React/React Native/Tauri
```

## Padrões de Log

Use emojis para identificação visual:
- ⬆️ Constructor calls
- 🔵 Controllers
- 🟣 Services
- 🟢 DAOs/Repositories
- 🔷 Middlewares

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, mysql2, uuid
- **Database**: MySQL
- **Frontend**: React (web), React Native (mobile), Tauri (desktop)
- **Planned**: JWT auth, AI integration (OpenAI/Azure)

## Filosofia de Arquitetura

1. **Separação de Responsabilidades**: Cada camada tem um propósito único
2. **Injeção de Dependências**: Classes desacopladas, testáveis
3. **Encapsulamento**: Campos privados com `#`, validação em setters
4. **Tratamento de Erros**: ErrorResponse estruturado em todas as camadas
5. **DTOs**: Nunca expor entidades diretamente na API
6. **Segurança**: Queries parametrizadas, validação em múltiplas camadas

## Contribuindo

Ao adicionar novas features ou modificar a arquitetura:
1. Siga o workflow em [workflow.md](workflow.md)
2. Atualize estes arquivos de instrução se necessário
3. Mantenha consistência com os padrões estabelecidos
4. Documente decisões arquiteturais significativas

## Contato

Projeto TCC - Ecossistema Escolar  
Repositório: EduardoTagliamento/TccEcossistemaEscolar
