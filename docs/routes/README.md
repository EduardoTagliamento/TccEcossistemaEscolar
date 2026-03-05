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

---

## 🔜 APIs em Desenvolvimento

- **Turma** - Gerenciamento de turmas/classes
- **Professor** - Gerenciamento de professores
- **Aluno** - Gerenciamento de alunos
- **Disciplina** - Gerenciamento de disciplinas
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
