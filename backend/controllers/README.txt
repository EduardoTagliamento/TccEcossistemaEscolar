📌 Camada Controller (MVC)

Responsabilidade:

Receber requisições HTTP

Extrair params, body, query

Chamar o Service adequado

Retornar resposta HTTP (JSON + status)

Exemplos de Controllers:

AuthController

ClassroomController

AssignmentController

UserController

AIController

✔️ Faz:

Orquestra o fluxo da requisição

Aplica decorators HTTP (GET, POST, etc.)

Retorna respostas padronizadas

❌ Não faz:

Não acessa banco

Não valida JWT

Não contém regra de negócio

Não conversa diretamente com IA