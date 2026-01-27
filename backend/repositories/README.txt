📌 Camada de Persistência (Model – Dados)

Responsabilidade:

Executar operações no banco de dados

Centralizar CRUD

Converter dados do banco ↔ entidades

Exemplos:

UserRepository

ClassroomRepository

AssignmentRepository

EnrollmentRepository

✔️ Faz:

SELECT / INSERT / UPDATE / DELETE

Queries complexas

Transações

❌ Não faz:

Não conhece JWT

Não conhece HTTP

Não contém regra de negócio