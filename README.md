# Ecossistema Escolar

**TCC — Trabalho de Conclusão de Curso**  
**Autor:** Eduardo Tagliamento  
**Licença:** MIT

---

## 📖 Sobre o Projeto

O **Ecossistema Escolar** é uma plataforma educacional avançada, inspirada no Google Classroom, desenvolvida como TCC. O objetivo é oferecer uma experiência mais rica e integrada para a gestão de turmas, tarefas, comunicação e aprendizado personalizado por meio de inteligência artificial, atendendo alunos, professores e administradores.

---

## 🗺️ Escopo do Projeto

### Visão Geral

O sistema é uma REST API construída com **Node.js + TypeScript + Express + MySQL**, seguindo arquitetura **MVC em camadas** com estrita separação de responsabilidades:

```
Controllers → Services → Repositories → Database
     ↓           ↓            ↓
Middlewares   AI Agents    Entities
```

### Funcionalidades Planejadas

| Funcionalidade | Status |
|---|---|
| Gestão de Escolas (CRUD) | ✅ Implementado |
| Gestão de Usuários (alunos, professores, admins) | 🔜 Planejado |
| Autenticação JWT | 🔜 Planejado |
| Turmas virtuais | 🔜 Planejado |
| Tarefas (atribuição, entrega, correção) | 🔜 Planejado |
| Chat / Comunicação em tempo real | 🔜 Planejado |
| Notificações por e-mail | ✅ Implementado (Resend / Brevo) |
| Integração com IA (planejamento de estudos, recomendações) | 🔜 Planejado (OpenAI / Azure AI) |
| Interface Web (React) | 🔜 Planejado |
| Interface Mobile (React Native) | 🔜 Planejado |
| Interface Desktop (Tauri) | 🔜 Planejado |
| Pipelines CI/CD (Azure DevOps) | 🔜 Planejado |

---

## 🏗️ Arquitetura e Tecnologias

### Backend (implementado)
- **Runtime:** Node.js ≥ 18
- **Linguagem:** TypeScript 5.x
- **Framework HTTP:** Express 4.x
- **Banco de dados:** MySQL 8 via `mysql2`
- **Envio de e-mail:** Resend SDK / SendBrevo
- **Geração de IDs:** UUID v4
- **Requisições HTTP externas:** Axios
- **Padrão arquitetural:** MVC em camadas (Controller → Service → DAO → Entity)
- **Injeção de dependências:** via construtor

### Frontend (estrutura inicial)
- **Linguagem:** TypeScript
- **Web:** React *(a implementar)*
- **Mobile:** React Native *(a implementar)*
- **Desktop:** Tauri *(a implementar)*
- **Design:** Figma / Lovable

### DevOps
- **Pipelines:** Azure DevOps *(a configurar)*
- **Ambientes:** dev, homologação, produção

---

## 📦 O que está implementado

### API REST — Escola

Base URL: `http://localhost:3000/api/escola`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/escola` | Cria uma escola |
| `GET` | `/api/escola` | Lista escolas (com filtro por nome) |
| `GET` | `/api/escola/:EscolaGUID` | Busca escola por ID |
| `PUT` | `/api/escola/:EscolaGUID` | Atualiza escola (parcial) |
| `DELETE` | `/api/escola/:EscolaGUID` | Remove escola |

**Modelo de dados — Escola:**

| Campo | Tipo | Descrição |
|---|---|---|
| `EscolaGUID` | `CHAR(36)` | UUID v4 (chave primária, gerado automaticamente) |
| `EscolaNome` | `VARCHAR(100)` | Nome da escola (único, 3–100 caracteres) |
| `EscolaCorPriEs` | `CHAR(6)` | Cor **Pri**mária **Es**cura — tema escuro (hex 6 chars, ex: `1E3A8A`) |
| `EscolaCorPriCl` | `CHAR(6)` | Cor **Pri**mária **Cl**ara — tema claro (hex 6 chars, ex: `FFFFFF`) |
| `EscolaCorSecEs` | `CHAR(6)` | Cor **Sec**undária **Es**cura — tema escuro (hex 6 chars) |
| `EscolaCorSecCl` | `CHAR(6)` | Cor **Sec**undária **Cl**ara — tema claro (hex 6 chars) |
| `EscolaIcone` | `BLOB` | Logotipo da escola; armazenado como binário (BLOB), aceito e retornado pela API como string **Base64** |

### Serviços Externos

- **ResendEmailService** — e-mails transacionais: boas-vindas, recuperação de senha, notificação de atividade
- **SendBrevoEmailService** — alternativa de envio de e-mails via Brevo

---

## 🚀 Como Executar

Veja o guia completo em [EXECUTAR.md](EXECUTAR.md) ou o início rápido em [QUICKSTART.md](QUICKSTART.md).

```bash
# 1. Instalar dependências
npm install

# 2. Criar banco de dados (MySQL)
mysql -u root -p -e "CREATE DATABASE tccecossistemaescolar;"
mysql -u root -p tccecossistemaescolar < backend/database/sql.txt

# 3. Configurar variáveis de ambiente
cp .env.example .env
# edite o .env com suas credenciais

# 4. Iniciar servidor (modo desenvolvimento)
npm run dev
```

Acesse: `http://localhost:3000`

---

## 📂 Estrutura de Diretórios

```
TccEcossistemaEscolar/
├── app.ts                        # Entry point do servidor
├── routes/                       # Definição de rotas Express
│   └── escola.routes.ts
├── backend/
│   ├── Server.ts                 # Configuração do servidor Express
│   ├── controllers/              # Camada HTTP (req/res)
│   ├── services/                 # Regras de negócio
│   ├── repositories/             # Acesso ao banco (DAOs)
│   ├── entities/                 # Modelos de domínio com validação
│   ├── middlewares/              # Validação de requisições
│   ├── database/                 # Conexão MySQL e scripts SQL
│   ├── ai/                       # Agentes de IA (a implementar)
│   ├── auth/                     # Autenticação JWT (a implementar)
│   ├── external/                 # Serviços de terceiros (e-mail, etc.)
│   ├── guards/                   # Autorização de rotas
│   └── utils/                    # Utilitários gerais
├── frontend/
│   ├── public/                   # Assets estáticos
│   └── src/
│       ├── pages/                # Telas da aplicação
│       ├── components/           # Componentes reutilizáveis
│       ├── hooks/                # Custom hooks
│       ├── utils/                # Funções auxiliares
│       └── assets/               # Imagens e recursos
└── docs/
    ├── routes/                   # Documentação das rotas da API
    └── features/                 # Documentação de funcionalidades
```

---

## 👥 Equipe e Papéis

O desenvolvimento é dividido em três funções:

| Papel | Responsabilidades |
|---|---|
| **Backend (REST API)** | REST API, banco de dados, autenticação JWT, regras de negócio, segurança |
| **Frontend (UI/UX)** | Interface web/mobile/desktop, fluxos de navegação, design responsivo, consumo de API |
| **Arquiteto / IA / DevOps** | Arquitetura, integração com IA (OpenAI/Azure), pipelines CI/CD, gestão de ambientes |

---

## 📚 Documentação

- [`docs/routes/escola-api.md`](docs/routes/escola-api.md) — Documentação completa da API de Escola
- [`docs/API_KEYS_GUIDE.md`](docs/API_KEYS_GUIDE.md) — Guia de gerenciamento de chaves de API
- [`.github/copilot-instructions/architecture.md`](.github/copilot-instructions/architecture.md) — Padrões e arquitetura do sistema
- [`.github/copilot-instructions/patterns.md`](.github/copilot-instructions/patterns.md) — Padrões de código
- [`EXECUTAR.md`](EXECUTAR.md) — Guia detalhado de execução e resolução de problemas