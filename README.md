# Ecossistema Escolar

Este projeto é um sistema educacional avançado, inspirado no Google Classroom, mas com melhorias significativas para oferecer uma experiência mais rica e integrada. O Ecossistema Escolar visa facilitar a gestão de turmas, tarefas, comunicação e aprendizado personalizado através de inteligência artificial, proporcionando uma plataforma completa para alunos, professores e administradores.

## Funcionalidades Principais

- **Gestão de Usuários**: Cadastro e autenticação de alunos, professores e administradores.
- **Turmas**: Criação e organização de classes virtuais.
- **Tarefas**: Atribuição, acompanhamento e correção de atividades.
- **Integração com IA**: Planejamento de estudos, recomendações personalizadas e análise de desempenho.
- **Notificações**: Sistema de alertas para lembretes e atualizações.
- **Chat e Comunicação**: Ferramentas de interação em tempo real.
- **Armazenamento Seguro**: Integração com serviços de nuvem para arquivos e dados.
- **APIs Externas**: Consumo de serviços como EvolutionAPI, Google Search API e outros para enriquecer a plataforma.

## Estrutura do Projeto

O desenvolvimento é dividido em três funções principais, cada uma com responsabilidades específicas para garantir um sistema robusto, intuitivo e escalável.

### 1. Desenvolvedor Backend (REST API)

Responsável por construir a base técnica do sistema.

**Responsabilidades:**
- Criar toda a REST API.
- Modelar o banco de dados.
- Implementar autenticação JWT.
- Definir regras de negócio.
- Expor endpoints para usuários, turmas, tarefas, IA e notificações.
- Garantir segurança e performance.
- Integrar com serviços de IA e armazenamento.

**Tecnologias Típicas:**
- Node.js
- MySQL
- Azure DevOps Pipelines

### 2. Designer / Frontend (UI/UX)

Responsável por criar a interface e a experiência do usuário.

**Responsabilidades:**
- Criar a interface web, mobile e desktop
- Desenhar fluxos de navegação.
- Desenvolver telas como: Login, Dashboard do aluno, Área do professor, Turmas, Tarefas, Chat, Planejamento com IA.
- Garantir design responsivo.
- Melhorar a experiência do usuário.
- Consumir a API do backend.

**Tecnologias:**
- TypeScript (usado em tudo no frontend)
- React (web) + React Native (mobile) + Tauri (desktop)
- Figma/Lovable (ferramentas de auxílio para design e prototipagem)
- Design System

### 3. Arquiteto / IA / DevOps (Função Estratégica)

Essa função é o "cérebro do sistema", coordenando arquitetura, IA e operações.

**Responsabilidades:**

**📐 Arquitetura:**
- Definir padrões (MVC, Clean Architecture).
- Divisão de camadas.
- Contratos de API.
- Padrões de segurança.

**🤖 Inteligência Artificial:**
- Definir como a IA funciona.
- Criar prompts.
- Implementar fluxos: Planejamento de estudo, Recomendações, Análise de desempenho.
- Integrar com APIs (OpenAI, Azure AI, etc.).

**🚀 DevOps:**
- Criar pipelines no Azure DevOps.
- Definir sprints.
- Automatizar: Build, Testes, Deploy.
- Criar carga inicial (seed).
- Gerenciar ambientes (dev, homologação, prod).

**Pesquisa e Integração:**
- Pesquisar e consumir APIs externas como EvolutionAPI, Google Search API e outras.

Essa terceira pessoa coordena o projeto de forma estratégica, assegurando que todas as partes se integrem harmoniosamente.