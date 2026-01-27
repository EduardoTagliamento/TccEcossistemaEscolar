📌 Autenticação e Autorização (JWT)

Responsabilidade:

Geração e validação de JWT

Controle de sessão

Autorização por papel (aluno, professor, admin)

Exemplos:

JwtService

AuthService

JwtGuard

RolesGuard

✔️ Faz:

Valida token

Extrai claims

Bloqueia acesso não autorizado

❌ Não faz:

Não acessa banco diretamente (via service)

Não contém regra de negócio educacional