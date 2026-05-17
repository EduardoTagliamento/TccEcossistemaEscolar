# Documentação de Rotas

Esta pasta contém a documentação completa das rotas já implementadas no backend do projeto, funcionando como um Swagger manual.

## 📚 APIs Documentadas

### ✅ Escola (School)
**Arquivo:** [escola-api.md](escola-api.md)

Documentação completa da API de gerenciamento de escolas incluindo:
- **POST** `/api/escola` - Criar nova escola
- **GET** `/api/escola` - Listar escolas (com filtro por nome)
- **GET** `/api/escola/:EscolaGUID` - Buscar escola por ID
- **PUT** `/api/escola/:EscolaGUID` - Atualizar escola
- **DELETE** `/api/escola/:EscolaGUID` - Remover escola

**Regras de Negócio Implementadas:**
- ✅ Validação de nome único (3-100 caracteres)
- ✅ Sistema de cores personalizáveis (hex 6 caracteres)
- ✅ Upload de ícones em Base64
- ✅ Geração automática de GUID (UUID v4)
- ✅ Atualização parcial de campos
- ✅ Busca com filtro LIKE por nome

### ✅ Usuario (User)
**Arquivo:** [usuario-api.md](usuario-api.md)

Documentacao completa da API de gerenciamento de usuarios incluindo:
- **POST** `/api/usuario` - Criar novo usuario
- **GET** `/api/usuario` - Listar usuarios (com filtro por nome)
- **GET** `/api/usuario/:UsuarioCPF` - Buscar usuario por CPF
- **PUT** `/api/usuario/:UsuarioCPF` - Atualizar usuario
- **DELETE** `/api/usuario/:UsuarioCPF` - Remover usuario

### ✅ Escola x Usuario x Funcao (N:N:N)
**Arquivo:** [escolaxusuarioxfuncao-api.md](escolaxusuarioxfuncao-api.md)

Documentacao completa da API de vinculos incluindo:
- **POST** `/api/escolaxusuarioxfuncao` - Criar vinculo
- **GET** `/api/escolaxusuarioxfuncao` - Listar vinculos (com filtros)
- **GET** `/api/escolaxusuarioxfuncao/:EscolaxUsuarioxFuncaoId` - Buscar vinculo por ID
- **PUT** `/api/escolaxusuarioxfuncao/:EscolaxUsuarioxFuncaoId` - Atualizar vinculo
- **DELETE** `/api/escolaxusuarioxfuncao/:EscolaxUsuarioxFuncaoId` - Remover vinculo

### ✅ Matéria (Subject/Discipline)
**Arquivo:** [materia-api.md](materia-api.md)

Documentação completa da API de gerenciamento de matérias incluindo:
- **POST** `/api/materia` - Criar nova matéria
- **GET** `/api/materia` - Listar matérias (com filtros)
- **GET** `/api/materia/:guid` - Buscar matéria por ID
- **PUT** `/api/materia/:guid` - Atualizar matéria
- **DELETE** `/api/materia/:guid` - Remover matéria (soft delete)

**Regras de Negócio Implementadas:**
- ✅ Nome único por escola
- ✅ Matérias técnicas requerem escola técnica
- ✅ Permissões de escrita (Coordenação/Direção)
- ✅ Soft delete com status
- ✅ Filtros por escola e tipo (técnica/comum)

### ✅ Curso (Technical Course)
**Arquivo:** [curso-api.md](curso-api.md)

Documentação completa da API de gerenciamento de cursos técnicos incluindo:
- **POST** `/api/curso` - Criar novo curso
- **GET** `/api/curso` - Listar cursos (com filtros)
- **GET** `/api/curso/:guid` - Buscar curso por ID
- **PUT** `/api/curso/:guid` - Atualizar curso
- **DELETE** `/api/curso/:guid` - Remover curso (soft delete)

**Regras de Negócio Implementadas:**
- ✅ Cursos apenas em escolas técnicas (crítico)
- ✅ Nome único por escola
- ✅ Todos os cursos são técnicos (sem flag CursoIsTecnico)
- ✅ Permissões de escrita (Coordenação/Direção)
- ✅ Vinculado a turmas técnicas

### ✅ Turma (Class/Group)
**Arquivo:** [turma-api.md](turma-api.md)

Documentação completa da API de gerenciamento de turmas incluindo:
- **POST** `/api/turma` - Criar nova turma
- **GET** `/api/turma` - Listar turmas (com filtros)
- **GET** `/api/turma/:guid` - Buscar turma por ID
- **PUT** `/api/turma/:guid` - Atualizar turma
- **DELETE** `/api/turma/:guid` - Remover turma (soft delete)

**Regras de Negócio Implementadas:**
- ✅ Identificador único composto (EscolaGUID + TurmaSerie + TurmaNome)
- ✅ Turmas técnicas requerem escola técnica
- ✅ Turmas técnicas requerem curso
- ✅ Curso deve pertencer à mesma escola
- ✅ Status: Ativa/Inativa/Encerrada
- ✅ Permissões de escrita (Coordenação/Direção)

### ✅ Matrícula (Student Enrollment)
**Arquivo:** [matricula-api.md](matricula-api.md)

Documentação completa da API de gerenciamento de matrículas incluindo:
- **POST** `/api/matricula` - Criar nova matrícula
- **POST** `/api/matricula/transferir` - Transferir aluno (transacional)
- **GET** `/api/matricula` - Listar matrículas (com filtros)
- **GET** `/api/matricula/:guid` - Buscar matrícula por RA
- **PUT** `/api/matricula/:guid` - Atualizar matrícula
- **DELETE** `/api/matricula/:guid` - Remover matrícula (soft delete)

**Regras de Negócio Implementadas:**
- ✅ RA customizável (1-36 caracteres) ou gerado automaticamente
- ✅ Um aluno = uma matrícula ativa (crítico)
- ✅ Transferência transacional (BEGIN/COMMIT/ROLLBACK)
- ✅ Usuário deve ser aluno (FuncaoId=5)
- ✅ Status: Ativa/Transferida/Concluida/Cancelada
- ✅ Permissões de escrita (Coordenação/Direção/Secretaria)

### ✅ Professor (Teacher & Allocations)
**Arquivo:** [professor-api.md](professor-api.md)

Documentação completa da API de gerenciamento de professores e alocações incluindo:
- **GET** `/api/professor` - Listar professores de uma escola
- **GET** `/api/professor/:cpf/escolas/:escolaGUID/alocacoes` - Buscar alocações do professor
- **POST** `/api/professor/alocacao` - Criar alocação (Professor + Matéria + Turma)
- **GET** `/api/professor/alocacao` - Listar alocações (com filtros)
- **GET** `/api/professor/alocacao/:guid` - Buscar alocação por ID
- **PUT** `/api/professor/alocacao/:guid` - Atualizar alocação
- **DELETE** `/api/professor/alocacao/:guid` - Remover alocação (soft delete)

**Regras de Negócio Implementadas:**
- ✅ Professor = Usuario com FuncaoId=3 (não é entidade separada)
- ✅ Alocação única (UNIQUE: MateriaGUID + TurmaGUID + UsuarioCPF)
- ✅ Matéria e Turma mesma escola
- ✅ Professor deve ser ativo na escola
- ✅ Junction table N:N:N (Professor + Matéria + Turma)
- ✅ Permissões de escrita (Coordenação/Direção)

### ✅ Anexo (Attachment)
**Arquivo:** [anexo-api.md](anexo-api.md)

Documentação completa da API de gerenciamento de anexos (arquivos) incluindo:
- **POST** `/api/anexo` - Upload de anexo (multipart/form-data)
- **GET** `/api/anexo` - Listar anexos (com filtros)
- **GET** `/api/anexo/:AnexoGUID` - Buscar metadados do anexo
- **GET** `/api/anexo/:AnexoGUID/download` - Download do arquivo
- **DELETE** `/api/anexo/:AnexoGUID` - Excluir anexo (físico + DB)

**Regras de Negócio Implementadas:**
- ✅ Tamanho máximo: 5MB por arquivo
- ✅ Tipos permitidos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, ZIP
- ✅ Nomenclatura automática: UUID + extensão original
- ✅ Armazenamento em `/uploads/anexos/`
- ✅ Tipo determinado pela função do usuário (professor/aluno/admin)
- ✅ Autenticação JWT obrigatória
- ✅ Exclusão remove arquivo físico + registro DB

### ✅ Prova Agendada (Scheduled Test)
**Arquivo:** [provaagendada-api.md](provaagendada-api.md)

Documentação completa da API de gerenciamento de provas agendadas incluindo:
- **POST** `/api/prova` - Criar prova agendada
- **GET** `/api/prova` - Listar provas (com filtros)
- **GET** `/api/prova/:ProvaAgendadaGUID` - Buscar prova por ID
- **PUT** `/api/prova/:ProvaAgendadaGUID` - Atualizar prova
- **DELETE** `/api/prova/:ProvaAgendadaGUID` - Excluir prova

**Regras de Negócio Implementadas:**
- ✅ Data da prova não pode ser no passado
- ✅ Status: Agendada, Realizada, Cancelada
- ✅ Vinculada a turma e matéria específicas
- ✅ Permissões de escrita (Professor/Coordenação/Secretaria)
- ✅ Rate limiting (30 req/min)
- ✅ Anexos opcionais com descrição
- ✅ Autenticação JWT obrigatória

### ✅ Tarefa Acadêmica (Academic Task)
**Arquivo:** [tarefaacademica-api.md](tarefaacademica-api.md)

Documentação completa da API de gerenciamento de tarefas acadêmicas incluindo:
- **POST** `/api/tarefa` - Criar tarefa acadêmica
- **GET** `/api/tarefa` - Listar tarefas (com filtros)
- **GET** `/api/tarefa/:TarefaGUID` - Buscar tarefa por ID
- **PUT** `/api/tarefa/:TarefaGUID` - Atualizar tarefa
- **DELETE** `/api/tarefa/:TarefaGUID` - Excluir tarefa
- **POST** `/api/tarefa/:TarefaGUID/anexo-entrega` - Vincular anexo de entrega
- **DELETE** `/api/tarefa/:TarefaGUID/anexo-entrega/:AnexoGUID` - Remover anexo

**Regras de Negócio Implementadas:**
- ✅ Prazo não pode ser no passado
- ✅ Tipo de entrega: digital ou física
- ✅ Status de conclusão (TarefaFeito: true/false)
- ✅ Data de realização automática ao marcar como feito
- ✅ Vinculação com matrícula (aluno) e matéria-professor-turma
- ✅ Anexos de entrega gerenciados (vincular/desvincular)
- ✅ Permissões diferenciadas (Professor: full / Aluno: marcar feito)
- ✅ Autenticação JWT obrigatória

### ✅ Upload (File Upload)
**Arquivo:** [upload-api.md](upload-api.md)

Documentação completa da API de gerenciamento de upload de arquivos incluindo:
- **POST** `/api/upload/logo/:EscolaGUID` - Upload de logo da escola
- **DELETE** `/api/upload/logo/:EscolaGUID` - Remover logo da escola

**Regras de Negócio Implementadas:**
- ✅ Tamanho máximo: 1MB por arquivo
- ✅ Tipos permitidos: PNG, JPG, JPEG
- ✅ Nomenclatura automática com timestamp e hash
- ✅ Armazenamento em `/uploads/logos/`
- ✅ Substituição automática (remove logo antigo ao fazer novo upload)
- ✅ Remoção física do arquivo ao deletar
- ✅ Atualização automática do campo `EscolaLogo` no banco
- ✅ Permissões (Coordenação/Secretaria/Direção)
- ✅ Autenticação JWT obrigatória

### ℹ️ Escolas do Usuário
**Arquivo:** [usuario-escolas-api.md](usuario-escolas-api.md)

Documentação do endpoint para listar escolas vinculadas a um usuário:
- **GET** `/api/usuario/:cpf/escolas` - Listar escolas do usuário

**Regras de Negócio Implementadas:**
- ✅ Busca por CPF (formato: 000.000.000-00)
- ✅ Retorna todas as escolas vinculadas ao usuário
- ✅ Inclui informações de função (Aluno, Professor, Coordenação, etc.)
- ✅ Autenticação JWT obrigatória

---

## 🔜 APIs em Desenvolvimento

- **Aluno** - Gerenciamento de alunos
- **Atividade** - Gerenciamento de atividades/tarefas
- **Auth** - Autenticação JWT

---

## 📖 Modelo para Documentação

Ao adicionar novas rotas, siga este modelo:

### Template Básico

- **Rota:** `/exemplo/rota`
- **Método:** `GET | POST | PUT | DELETE`
- **Descrição:** Breve explicação da finalidade da rota.
- **Parâmetros de entrada:**
  - `param1`: descrição
  - `param2`: descrição
- **Exemplo de requisição:**
```json
{
  "param1": "valor",
  "param2": "valor"
}
```
- **Resposta esperada:**
```json
{
  "resultado": "valor"
}
```
- **Observações:**
  - Pontos importantes ou restrições.

### Recomendações

1. **Formato Swagger/OpenAPI**: Use formato detalhado com tabelas, exemplos e códigos de status
2. **Exemplos cURL**: Inclua exemplos práticos de uso
3. **Regras de Negócio**: Documente todas as validações e restrições
4. **Modelos de Dados**: Defina interfaces TypeScript e schemas SQL
5. **Tratamento de Erros**: Liste todos os possíveis erros e suas causas

### Estrutura Recomendada

Para documentação completa no estilo Swagger, inclua:

1. **Overview** - Descrição geral da API
2. **Endpoints** - Lista detalhada de todos os endpoints
3. **Request/Response Examples** - Exemplos concretos
4. **Data Models** - Schemas e tipos de dados
5. **Business Rules** - Regras de domínio implementadas
6. **Error Handling** - Códigos de status e mensagens
7. **Authentication** - Requisitos de autenticação (quando aplicável)
8. **Examples** - Workflows completos e casos de uso

Veja [escola-api.md](escola-api.md) como referência de documentação completa.

---

## 🔗 Recursos Úteis

- [Copilot Instructions](../../.github/copilot-instructions/) - Guias de arquitetura e padrões
- [Features Documentation](../features/) - Documentação de funcionalidades
- [Database Schema](../../backend/database/sql.txt) - Schemas SQL

---

**Base URL:** `http://localhost:3000/api`  
**Content-Type:** `application/json`  
**Response Format:** Padronizado com `{success, message, data}`
