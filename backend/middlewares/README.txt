📌 Camada de Interceptação e Validação

Responsabilidade:

Executar ANTES do Controller.

Tipos:

Guards → JWT, permissões

Pipes → validação de body/params

Middlewares → logging, métricas

✔️ Faz:

Valida dados de entrada

Garante segurança

Evita requests inválidas

❌ Não faz:

Não acessa banco

Não executa regra de negócio