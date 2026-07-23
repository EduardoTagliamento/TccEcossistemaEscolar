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
- **POST** `/api/professor` - Criar professores em massa (usuário novo + vínculo, ou só vínculo)
- **GET** `/api/professor` - Listar professores de uma escola
- **GET** `/api/professor/:cpf/escolas/:escolaGUID/alocacoes` - Buscar alocações do professor
- **POST** `/api/professor/alocacao` - Criar alocação individual ou em massa (Professor + Matéria + Turma)
- **GET** `/api/professor/alocacao` - Listar alocações (com filtros)
- **GET** `/api/professor/alocacao/:guid` - Buscar alocação por ID
- **PUT** `/api/professor/alocacao/:guid` - Atualizar alocação (status e/ou aulas por semana)
- **DELETE** `/api/professor/alocacao/:guid` - Remover alocação (soft delete)
- **GET** `/api/professor/materias` - Matérias/turmas do professor autenticado
- **GET** `/api/professor/turmas-alunos` - Turmas e alunos de uma alocação do professor autenticado

**Regras de Negócio Implementadas:**
- ✅ Professor = Usuario com FuncaoId=3 (não é entidade separada)
- ✅ Alocação única (UNIQUE: MateriaGUID + TurmaGUID + UsuarioCPF), com reativação automática se estava Inativa
- ✅ Matéria e Turma mesma escola
- ✅ Professor deve ser ativo na escola
- ✅ Junction table N:N:N (Professor + Matéria + Turma), com `AulasPorSemana` opcional por alocação
- ✅ Criação em massa de professores (usuário + senha temporária + e-mail de boas-vindas) e de alocações (por nome ou GUID)
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

Documentação completa da API de gerenciamento de tarefas acadêmicas (modelo normalizado: 1 tarefa → N alunos) incluindo:
- **POST** `/api/tarefa` - Criar tarefa e atribuir a uma ou mais matrículas
- **POST** `/api/tarefa/batch` - Alias de criação (mesmo body/validação de `POST /api/tarefa`)
- **GET** `/api/tarefa` - Listar tarefas (com filtros)
- **GET** `/api/tarefa/:TarefaGUID` - Buscar tarefa por ID
- **PUT** `/api/tarefa/:TarefaGUID` - Atualizar dados compartilhados da tarefa
- **PATCH** `/api/tarefa/:TarefaGUID/marcar-feito` - Aluno marca/desmarca sua atribuição como feita
- **DELETE** `/api/tarefa/:TarefaGUID` - Excluir tarefa
- **POST** `/api/tarefa/:TarefaGUID/anexo-entrega` - Vincular anexo de entrega do aluno
- **DELETE** `/api/tarefa/:TarefaGUID/anexo-entrega/:AnexoGUID` - Remover anexo de entrega
- **GET** `/api/tarefa/:TarefaGUID/anexos` - Listar anexos de material de apoio
- **POST** `/api/tarefa/:TarefaGUID/anexos` - Vincular anexo de material de apoio

**Regras de Negócio Implementadas:**
- ✅ 1 tarefa (dados compartilhados) → N atribuições por matrícula (`tarefaacademica_matricula`)
- ✅ Prazo não pode ser no passado (padrão e por matrícula via `DatasPorMatricula`)
- ✅ Tarefas compartilhadas/em grupo (`TarefaCompartilhada` + `TarefaMinPessoas`/`TarefaMaxPessoas`), integradas com Grupo de Tarefa
- ✅ Tipo de entrega: digital ou física
- ✅ Status de conclusão por aluno (TarefaFeito: true/false), individual via `PATCH .../marcar-feito`
- ✅ Data de realização automática ao marcar como feito
- ✅ Vinculação com matrícula (aluno) e matéria-professor-turma
- ✅ Dois tipos de anexo: material de apoio (professor) e entrega (aluno)
- ✅ Autenticação JWT obrigatória

### ✅ Escola Configuração (School Schedule Settings)
**Arquivo:** [escolaconfiguracao-api.md](escolaconfiguracao-api.md)

Documentação completa da API de configuração de horário letivo da escola (base do cronograma de turma) incluindo:
- **GET** `/api/escola-configuracao/:escolaGUID` - Obter configuração (ou rascunho padrão)
- **GET** `/api/escola-configuracao/:escolaGUID/slots` - Slots de aula calculados
- **PUT** `/api/escola-configuracao/:escolaGUID` - Salvar configuração (upsert)

**Regras de Negócio Implementadas:**
- ✅ 1 configuração por escola, com intervalos fixos ou variados por dia
- ✅ Validação de consistência de períodos manhã/tarde
- ✅ Avisos não bloqueantes de aula cortada por intervalo desalinhado
- ✅ Permissões de escrita (Coordenação/Direção); leitura livre

### ✅ Cronograma da Turma (Class Schedule)
**Arquivo:** [cronograma-turma-api.md](cronograma-turma-api.md)

Documentação completa da API de montagem do cronograma semanal de uma turma incluindo:
- **GET** `/api/turma/:turmaGUID/cronograma` - Obter cronograma (slots + banco de aulas pendentes)
- **POST** `/api/turma/:turmaGUID/cronograma/slot` - Alocar uma aula em dia/horário
- **DELETE** `/api/turma/:turmaGUID/cronograma/slot/:horarioTurmaGUID` - Remover aula do cronograma

**Regras de Negócio Implementadas:**
- ✅ Depende da configuração de horário letivo da escola
- ✅ Respeita limite de aulas semanais por alocação
- ✅ Impede conflito de horário do mesmo professor entre turmas
- ✅ Permissões de escrita (Coordenação/Direção); leitura livre

### ✅ Grade Horária (Automatic Scheduling)
**Arquivo:** [grade-horaria-api.md](grade-horaria-api.md)

Documentação completa da API de cálculo automático de data/hora de aula, usada para agendar Prova/Tarefa na próxima aula da turma:
- **POST** `/api/grade-horaria/calcular-datas` - Calcular datas para N turmas de uma vez

**Regras de Negócio Implementadas:**
- ✅ Reaproveita o cronograma da turma (`horarioturma`) já montado
- ✅ Suporta desambiguação quando a matéria ocorre mais de uma vez por semana (`status: "escolherDia"`)
- ✅ Deslocamento em minutos configurável por escolha
- ✅ Falhas por turma não bloqueiam o cálculo das demais (sempre 200, status por item)

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

### ✅ Notificação (Notifications)
**Arquivo:** [notificacao-api.md](notificacao-api.md)

Documentação completa do sistema de notificações (feed in-app, catálogo de tipos e preferências de canal) incluindo:
- **GET** `/api/notificacao` - Listar notificações do usuário
- **GET** `/api/notificacao/contador` - Contar não lidas
- **PATCH** `/api/notificacao/:NotificacaoGUID/lida` - Marcar uma como lida
- **PATCH** `/api/notificacao/lidas` - Marcar todas como lidas
- **GET** `/api/notificacao/tipos` - Catálogo de tipos
- **GET** `/api/notificacao/preferencias` - Preferências efetivas do usuário
- **PUT** `/api/notificacao/preferencias/:NotificacaoTipoId` - Atualizar preferência

**Regras de Negócio Implementadas:**
- ✅ Avisos (evento) e Lembretes (cron diário) — 20 tipos no catálogo
- ✅ Preferência de e-mail/whatsapp por tipo, global por usuário
- ✅ Feed in-app sempre populado, independente das preferências de canal
- ✅ Envio de e-mail via Resend; WhatsApp com canal pronto (stub) aguardando Evolution API
- ✅ Tempo real via WebSocket (`notificacao:nova`, room pessoal por usuário)
- ✅ Idempotência de lembretes (anti-duplicidade por dia)
- ✅ Autenticação JWT obrigatória

### ✅ Calendário (Aggregated Calendar)
**Arquivo:** [calendario-api.md](calendario-api.md)

Documentação completa da API somente leitura que agrega Tarefas e Provas Agendadas em uma linha do tempo por escola:
- **GET** `/api/calendario` - Listar avisos (tarefas + provas) do usuário, com filtros de período/tipo
- **GET** `/api/calendario/dia/:data` - Detalhes de um dia específico

**Regras de Negócio Implementadas:**
- ✅ Visibilidade por matrícula (aluno) ou alocação ativa (professor)
- ✅ Vínculo ativo com a escola obrigatório
- ✅ `StatusTexto` calculado (Feita/Atrasada/Pendente) no SQL
- ✅ Somente leitura — não persiste nada

### ✅ Pendência (Administrative Reminder)
**Arquivo:** [pendencia-api.md](pendencia-api.md)

Documentação completa da API de lembretes/avisos administrativos direcionados a um único usuário incluindo:
- **POST** `/api/pendencia` - Criar pendência
- **GET** `/api/pendencia` - Listar pendências (com filtros)
- **GET** `/api/pendencia/contador/pendentes` - Contar pendências não concluídas
- **GET** `/api/pendencia/contador/atrasadas` - Contar pendências atrasadas
- **GET** `/api/pendencia/:PendenciaGUID` - Buscar pendência por ID
- **PUT** `/api/pendencia/:PendenciaGUID` - Atualizar pendência
- **DELETE** `/api/pendencia/:PendenciaGUID` - Excluir pendência (hard delete)
- **PATCH** `/api/pendencia/:PendenciaGUID/feito` - Destinatário marca como feita
- **GET** `/api/pendencia/:PendenciaGUID/anexos` - Listar anexos
- **POST** `/api/pendencia/:PendenciaGUID/anexos` - Vincular anexo

**Regras de Negócio Implementadas:**
- ✅ Destinatário único por pendência
- ✅ Criação/edição/exclusão restrita a Coordenação/Secretaria/Direção
- ✅ Marcar como feito exclusivo do destinatário
- ✅ Prazo sempre futuro na criação e atualização

### ✅ Evento (School Event)
**Arquivo:** [evento-api.md](evento-api.md)

Documentação completa da API de eventos escolares (avisos amplos por escola, sem destinatário individual) incluindo:
- **POST** `/api/evento` - Criar evento
- **GET** `/api/evento` - Listar eventos (com filtros)
- **GET** `/api/evento/:EventoGUID` - Buscar evento por ID
- **PUT** `/api/evento/:EventoGUID` - Atualizar evento
- **DELETE** `/api/evento/:EventoGUID` - Cancelar evento (soft delete)
- **GET** `/api/evento/:EventoGUID/anexos` - Listar anexos
- **POST** `/api/evento/:EventoGUID/anexos` - Vincular anexo

**Regras de Negócio Implementadas:**
- ✅ Evento por escola, visível a todos os vinculados
- ✅ Status: Agendado/Realizado/Cancelado (soft delete)
- ✅ Data sempre futura na criação/atualização
- ✅ Permissões de escrita (Coordenação/Secretaria/Direção)

### ✅ Anotação (Personal Note)
**Arquivo:** [anotacao-api.md](anotacao-api.md)

Documentação completa da API de anotações pessoais do usuário (uso privado, tipo agenda) incluindo:
- **POST** `/api/anotacao` - Criar anotação
- **GET** `/api/anotacao` - Listar anotações (filtros e intervalo de datas)
- **GET** `/api/anotacao/estatisticas` - Total/feitas/pendentes
- **GET** `/api/anotacao/:guid` - Buscar anotação por ID
- **PUT** `/api/anotacao/:guid` - Atualizar anotação
- **PATCH** `/api/anotacao/:guid/toggle` - Alternar status de feito
- **DELETE** `/api/anotacao/:guid` - Excluir anotação (hard delete)

**Regras de Negócio Implementadas:**
- ✅ Anotação é sempre pessoal (dono definido pelo token, nunca pelo body)
- ✅ Somente o dono acessa/edita/exclui
- ✅ Toggle inverte o status atual (não aceita valor explícito)

### ✅ Grupo de Tarefa (Task Group)
**Arquivo:** [grupotarefa-api.md](grupotarefa-api.md)

Documentação completa da API de grupos formados dentro de uma tarefa compartilhada incluindo:
- **GET** `/api/grupotarefa/:tarefaGUID` - Listar grupos de uma tarefa
- **GET** `/api/grupotarefa/grupo/:grupoGUID` - Buscar grupo (com membros)
- **PATCH** `/api/grupotarefa/:grupoGUID/nome` - Renomear grupo (líder)
- **DELETE** `/api/grupotarefa/:grupoGUID/membros/:cpf` - Expulsar membro (líder)
- **PATCH** `/api/grupotarefa/:grupoGUID/transferir-lider` - Transferir liderança

**Regras de Negócio Implementadas:**
- ✅ 1 grupo individual por aluno criado automaticamente ao atribuir tarefa compartilhada
- ✅ Expulsão gera novo grupo individual para o membro expulso
- ✅ Transferência de liderança transacional
- ✅ Integração com Conversa (grupo de chat espelhado)

### ✅ Convite de Grupo de Tarefa (Task Group Invite)
**Arquivo:** [convitegrupotarefa-api.md](convitegrupotarefa-api.md)

Documentação completa da API de convites (líder → aluno) e solicitações (aluno → grupo) para entrada em grupos de tarefa incluindo:
- **POST** `/api/convitegrupotarefa/:grupoGUID/convites` - Líder envia convite
- **POST** `/api/convitegrupotarefa/:grupoGUID/solicitacoes` - Aluno solicita entrada
- **GET** `/api/convitegrupotarefa/pendentes` - Listar convites/solicitações pendentes
- **PATCH** `/api/convitegrupotarefa/:conviteGUID/aceitar` - Aceitar
- **PATCH** `/api/convitegrupotarefa/:conviteGUID/recusar` - Recusar

**Regras de Negócio Implementadas:**
- ✅ Convite aceito/recusado pelo convidado; solicitação aceita/recusada pelo líder
- ✅ Sem duplicidade de convite/solicitação pendente
- ✅ Aceitar é transacional (move o usuário para o grupo + histórico)

### ✅ Conversa / Mensagens (Chat)
**Arquivo:** [conversa-api.md](conversa-api.md)

Documentação completa da API de conversas individuais e em grupo (Turma/Tarefa) incluindo:
- **POST** `/api/conversa/individual` - Iniciar/recuperar conversa 1:1 (idempotente)
- **GET** `/api/conversa` - Listar conversas do usuário
- **GET** `/api/conversa/:guid` - Detalhes + últimas mensagens + fixadas
- **GET** `/api/conversa/:guid/mensagem` - Histórico paginado
- **GET** `/api/conversa/:guid/fixadas` - Mensagens fixadas
- **POST**/**DELETE** `/api/conversa/:guid/mensagem/:msgGuid/fixar` - Fixar/desafixar mensagem
- **DELETE**/**PATCH** `/api/conversa/:guid/mensagem/:msgGuid` - Deletar/editar mensagem
- **POST** `/api/conversa/:guid/mensagem/:msgGuid/reacao` - Reagir a mensagem (toggle, múltiplos emojis por usuário)
- **PUT**/**DELETE** `/api/conversa/:guid/permissao/representante` - Gerenciar Representante (Turma)
- **PUT**/**DELETE** `/api/conversa/:guid/permissao/vice-representante[/:cpf]` - Gerenciar Vice-Representante

**Regras de Negócio Implementadas:**
- ✅ Conversa individual idempotente e normalizada por par de CPFs
- ✅ Papéis de moderação diferem por tipo de grupo (Líder em Tarefa; Representante/Vice em Turma)
- ✅ Soft delete e edição de mensagens; fixar/desafixar com papel exigido em grupo
- ✅ Envio de mensagem em tempo real via WebSocket (fora desta API REST)
- ✅ Reações a mensagens (2026-07-23): múltiplas simultâneas e independentes por usuário (`👍 ❤️ 😂 😮 😢 🙏`), toggle por par (usuário, emoji), sem hierarquia de papel; REST + WebSocket (`reagir_mensagem`/`reacao_atualizada`)
- ✅ Recibo de leitura visual (2026-07-23): `MensagemDTO.Leitores` (CPFs que já leram, exceto o remetente), em conversas Individuais e em Grupo
- ✅ Gestão de grupo (2026-07-23): `ConversaDetalheDTO.ConversaGrupoRefGUID` e `MembroDTO.UsuarioNome` novos (enriquecimento aditivo); eventos `permissao_atualizada`/`membro_saiu` agora também consumidos pelo frontend

### ✅ Categoria de Conteúdo (Content Category)
**Arquivo:** [categoriaconteudo-api.md](categoriaconteudo-api.md)

Documentação completa da API de categorias pessoais de organização de conteúdo de aula incluindo:
- **POST** `/api/categoria-conteudo` - Criar categoria
- **GET** `/api/categoria-conteudo` - Listar categorias (com filtros)
- **PUT** `/api/categoria-conteudo/:guid` - Atualizar categoria
- **DELETE** `/api/categoria-conteudo/:guid` - Excluir categoria

**Regras de Negócio Implementadas:**
- ✅ Categoria pessoal por professor + matéria (nome único na combinação)
- ✅ Editar/excluir restrito ao criador
- ✅ Excluir categoria não exclui conteúdos (`SET NULL`)

### ✅ Conteúdo de Aula (Class Content)
**Arquivo:** [conteudo-api.md](conteudo-api.md)

Documentação completa da API de publicação de material de aula (vídeo/áudio, texto rico ou arquivo paginado) incluindo:
- **POST** `/api/conteudo` - Criar conteúdo (multipart/form-data, upload para Cloudflare R2)
- **GET** `/api/conteudo` - Listar conteúdos (com filtros)
- **GET** `/api/conteudo/:guid` - Buscar conteúdo por ID
- **DELETE** `/api/conteudo/:guid` - Excluir conteúdo

**Regras de Negócio Implementadas:**
- ✅ Modelo "1 conteúdo → N turmas", com data de publicação compartilhada e override por turma
- ✅ Três tipos com subtabela própria: cronometrado (upload/link), texto (HTML sanitizado), paginado (arquivos ordenados)
- ✅ Professor precisa lecionar em todas as turmas selecionadas
- ✅ Exclusão restrita ao autor; arquivos removidos do R2 de forma assíncrona

### ✅ Projeto (Project)
**Arquivo:** [projeto-api.md](projeto-api.md)

Documentação completa da API do módulo Projetos (atividade-mãe criada por Professor/Direção, direcionada a turmas específicas ou à escola inteira) incluindo:
- **POST** `/api/projeto` - Criar projeto (Professor/Direção)
- **GET** `/api/projeto` - Listar projetos visíveis ao usuário
- **GET** `/api/projeto/:projetoGUID` - Buscar projeto por ID
- **PATCH** `/api/projeto/:projetoGUID` - Atualizar projeto (só criador)
- **PATCH** `/api/projeto/:projetoGUID/encerrar` - Encerrar projeto (só criador)

**Regras de Negócio Implementadas:**
- ✅ Criação restrita a Professor (FuncaoId=3) ou Direção (FuncaoId=6) da escola
- ✅ Público-alvo: escola inteira ou turmas específicas (`projetoturma`)
- ✅ Listagem depende do papel (criador vê os próprios; aluno vê os elegíveis)
- ✅ Sem exclusão física — só encerramento
- ✅ Notificação `projeto_criado` por fan-out (escola ou turmas-alvo)

### ✅ Grupo de Projeto (Project Group)
**Arquivo:** [grupoprojeto-api.md](grupoprojeto-api.md)

Documentação completa da API de grupos formados dentro de um Projeto (grupos podem reunir alunos de turmas diferentes, diferente de Grupo de Tarefa) incluindo:
- **POST** `/api/grupoprojeto` - Aluno cria grupo (líder = ele mesmo)
- **GET** `/api/grupoprojeto/projeto/:projetoGUID` - Listar grupos de um projeto
- **GET** `/api/grupoprojeto/:grupoGUID` - Buscar grupo (com membros)
- **PATCH** `/api/grupoprojeto/:grupoGUID` - Atualizar nome/proposta/visibilidade (líder)
- **PATCH** `/api/grupoprojeto/:grupoGUID/pontuacao` - Atribuir pontuação (criador do projeto)
- **POST** `/api/grupoprojeto/:grupoGUID/entrar` - Entrar diretamente (grupo Aberto)
- **DELETE** `/api/grupoprojeto/:grupoGUID/sair` - Sair do próprio grupo
- **POST** `/api/grupoprojeto/:grupoGUID/membros` - Adicionar membro direto (criador do projeto)
- **DELETE** `/api/grupoprojeto/:grupoGUID/membros/:cpf` - Expulsar membro (líder ou criador do projeto)
- **PATCH** `/api/grupoprojeto/:grupoGUID/transferir-lider` - Transferir liderança

**Regras de Negócio Implementadas:**
- ✅ Nenhum grupo é criado automaticamente — aluno cria o próprio grupo com proposta
- ✅ Grupo `Aberto` (entrada livre) ou `Fechado` (só convite/solicitação)
- ✅ Criador do projeto tem autoridade extra: adicionar/expulsar membros (inclusive o líder) e pontuar
- ✅ Expulsão do líder promove o membro mais antigo, ou dissolve o grupo
- ✅ Limite de vagas validado em todo ponto de entrada
- ✅ Visualização pública dentro do projeto (não restrita a membros)

### ✅ Convite de Grupo de Projeto (Project Group Invite)
**Arquivo:** [convitegrupoprojeto-api.md](convitegrupoprojeto-api.md)

Documentação completa da API de convites (líder → aluno) e solicitações (aluno → grupo) para entrada em grupos de projeto fechados incluindo:
- **POST** `/api/convitegrupoprojeto/:grupoGUID/convites` - Líder envia convite
- **POST** `/api/convitegrupoprojeto/:grupoGUID/solicitacoes` - Aluno solicita entrada
- **GET** `/api/convitegrupoprojeto/pendentes` - Listar convites/solicitações pendentes
- **PATCH** `/api/convitegrupoprojeto/:conviteGUID/aceitar` - Aceitar
- **PATCH** `/api/convitegrupoprojeto/:conviteGUID/recusar` - Recusar

**Regras de Negócio Implementadas:**
- ✅ Convite aceito/recusado pelo convidado; solicitação aceita/recusada pelo líder
- ✅ Limite de vagas validado no envio **e** na aceitação (diferente do TODO de Tarefa Compartilhada)
- ✅ Elegibilidade revalidada antes de criar convite/solicitação
- ✅ Sem duplicidade pendente; 1 participação por aluno por projeto

### ✅ Registro de Auditoria (Audit Log)
**Arquivo:** [auditoria-api.md](auditoria-api.md)

Documentação completa da API somente leitura do módulo transversal de auditoria (quem fez o quê, quando, em qual entidade, por escola), incluindo a sub-feature "último acesso do usuário na escola":
- **GET** `/api/auditoria` - Listar registros de auditoria da escola (com filtros)
- **GET** `/api/auditoria/:RegistroAuditoriaGUID` - Buscar registro por ID
- **GET** `/api/auditoria/categorias` - Catálogo de categorias de sensibilidade/retenção
- **POST** `/api/usuario/:UsuarioCPF/escolas/:EscolaGUID/acesso` - Registrar "último acesso" do próprio usuário na escola (sub-feature separada, não é auditoria)

**Regras de Negócio Implementadas:**
- ✅ Sem endpoints de escrita expostos — registro criado só internamente via `AuditoriaService.registrar()`, chamado no fim de métodos de escrita de outros services
- ✅ Sem diff campo a campo — só o fato de que a ação ocorreu (quem, o quê, quando, em qual entidade)
- ✅ Consulta restrita a Coordenação/Secretaria/Direção ativa na escola consultada
- ✅ 5 categorias de sensibilidade com retenção diferenciada (90 a 730 dias), expurgo automático por job agendado
- ✅ Paginação com teto (limit padrão 50, máx. 100), ordenado por mais recente primeiro
- ✅ "Último acesso" é um timestamp único por usuário+escola (upsert com throttle de 1h), não um histórico — exposto também em `GET /api/usuario/:cpf/escolas` e `GET /api/escolaxusuarioxfuncao?EscolaGUID=`

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

> Nota: **Aluno** e **Atividade** não são módulos separados — "Aluno" é um `Usuario` com `FuncaoId=5` + uma `Matricula` (ver [matricula-api.md](matricula-api.md) e [usuario-api.md](usuario-api.md)), e "Atividade" é coberta por [tarefaacademica-api.md](tarefaacademica-api.md) e [provaagendada-api.md](provaagendada-api.md). **Auth** já está documentado em [auth-api.md](auth-api.md).

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
