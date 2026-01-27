📌 Camada de Regra de Negócio

Responsabilidade:

Implementar regras do domínio educacional

Decidir o que pode ou não pode acontecer

Orquestrar DAOs / Repositories

Coordenar chamadas externas (IA, notificações)

Exemplos de Services:

ClassroomService

AssignmentService

UserService

StudyPlannerService (IA)

ProgressAnalysisService (IA)

✔️ Faz:

Verifica permissões lógicas (ex: professor x aluno)

Garante integridade do fluxo educacional

Decide quando acionar agentes de IA

❌ Não faz:

Não conhece HTTP

Não retorna JSON

Não valida token diretamente