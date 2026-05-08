# Plano técnico de implementação: tarefas com calendário e notificações automáticas

## Objetivo
Implementar no sistema um fluxo em que o professor publique uma tarefa e ela fique automaticamente disponível em um calendário, com envio de lembretes automáticos por **WhatsApp** e **e-mail** para os alunos cadastrados **um dia antes** da data da tarefa.

## Escopo funcional
1. Professor cria uma tarefa.
2. A tarefa possui título, descrição, data de entrega e relacionamento com turma/disciplina.
3. A tarefa passa a aparecer no calendário do sistema.
4. O sistema identifica os alunos vinculados à turma/disciplina.
5. Um processo agendado executa diariamente a verificação de tarefas com vencimento no dia seguinte.
6. Para cada aluno elegível, o sistema envia:
   - mensagem por e-mail
   - mensagem por WhatsApp
7. O sistema registra o status dos envios para auditoria e prevenção de duplicidade.

## Arquitetura sugerida

### 1. Módulo de tarefas
Responsável por CRUD de tarefas.

**Campos mínimos da entidade `Task`**:
- `id`
- `title`
- `description`
- `dueDate`
- `classId` ou `courseId`
- `teacherId`
- `createdAt`
- `updatedAt`
- `notificationScheduled` (opcional)

### 2. Módulo de calendário
Responsável por expor as tarefas em formato de evento.

**Regras**:
- toda tarefa criada com `dueDate` válida deve ser refletida no calendário;
- o calendário pode consumir diretamente a coleção/tabela de tarefas ou uma camada adaptadora de eventos;
- filtros por turma, disciplina e período são recomendados.

### 3. Módulo de vínculos acadêmicos
Responsável por descobrir quais alunos devem receber a notificação.

**Dependências esperadas**:
- aluno
- turma/disciplina
- matrícula/vínculo aluno-turma

### 4. Módulo de notificações
Responsável por compor e enviar mensagens.

**Canais**:
- e-mail
- WhatsApp

**Subcomponentes**:
- `NotificationService`
- `EmailProvider`
- `WhatsAppProvider`
- `NotificationLogRepository`

### 5. Job agendado
Responsável por rodar diariamente.

**Comportamento**:
- buscar tarefas com vencimento em `amanhã`;
- resolver alunos vinculados;
- montar payload de mensagem;
- enviar por e-mail e WhatsApp;
- registrar sucesso/falha por aluno e por canal;
- evitar reenvio duplicado da mesma tarefa/canal/aluno.

## Modelo de dados sugerido

### Tabela/coleção `tasks`
- `id`
- `title`
- `description`
- `due_date`
- `class_id`
- `teacher_id`
- `created_at`
- `updated_at`

### Tabela/coleção `notification_logs`
- `id`
- `task_id`
- `student_id`
- `channel` (`email` | `whatsapp`)
- `status` (`pending` | `sent` | `failed`)
- `provider_message_id` (opcional)
- `error_message` (opcional)
- `sent_at`
- `created_at`

### Dados mínimos do aluno
- `id`
- `name`
- `email`
- `phone` (para WhatsApp, preferencialmente em formato internacional)
- vínculo com turma/disciplina

## Fluxo de implementação

### Etapa 1 — cadastro de tarefa
- revisar entidade/modelo atual de tarefa;
- garantir campo de data de entrega;
- garantir vínculo com turma/disciplina e professor;
- validar permissões do professor ao criar a tarefa.

### Etapa 2 — exibição no calendário
- criar endpoint/serviço que retorne tarefas como eventos de calendário;
- adaptar frontend para renderizar as tarefas no calendário;
- exibir ao menos: título, data, turma e descrição resumida.

### Etapa 3 — seleção de destinatários
- mapear onde o sistema armazena os alunos por turma/disciplina;
- implementar serviço para retornar os alunos elegíveis de uma tarefa.

Exemplo de responsabilidade:
- `getStudentsForTask(taskId)`

### Etapa 4 — infraestrutura de envio
- e-mail: usar provedor SMTP ou serviço transacional;
- WhatsApp: usar API oficial ou provedor parceiro;
- guardar credenciais em variáveis de ambiente.

**Variáveis de ambiente sugeridas**:
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`
- `WHATSAPP_API_URL`
- `WHATSAPP_API_TOKEN`
- `WHATSAPP_SENDER_ID`

### Etapa 5 — job diário
Implementar rotina agendada para execução 1 vez por dia.

**Sugestão de horário**:
- 08:00 no fuso principal da escola

**Regras do job**:
- considerar tarefas cuja `dueDate` esteja no dia seguinte;
- considerar timezone corretamente;
- enviar somente para alunos ativos;
- não reenviar quando já houver `notification_logs` com status `sent` para o mesmo `task_id + student_id + channel`.

### Etapa 6 — templates de mensagem

**E-mail**:
Assunto sugerido:
- `Lembrete de tarefa: {titulo}`

Corpo sugerido:
- nome do aluno
- título da tarefa
- descrição breve
- data de entrega
- turma/disciplina
- link para acessar no sistema

**WhatsApp**:
Mensagem curta e objetiva:
- `Olá, {nome}. Lembrete: a tarefa "{titulo}" vence em {data}. Acesse o sistema para mais detalhes.`

### Etapa 7 — observabilidade e segurança
- registrar logs de execução do job;
- registrar falhas por canal;
- proteger credenciais com `.env`;
- respeitar consentimento e política de comunicação;
- validar números e e-mails antes do envio.

## Estrutura técnica sugerida para projeto TypeScript
Como o repositório é majoritariamente TypeScript, a organização pode seguir algo como:

- `src/modules/tasks/`
- `src/modules/calendar/`
- `src/modules/notifications/`
- `src/modules/students/`
- `src/jobs/sendTaskReminders.ts`
- `src/providers/email/`
- `src/providers/whatsapp/`
- `src/repositories/notificationLogRepository.ts`

## Contratos de serviço sugeridos

### `TaskService`
- `createTask(data)`
- `listTasksByCalendarRange(start, end, filters)`
- `getTaskById(id)`

### `StudentService`
- `getStudentsByClass(classId)`

### `NotificationService`
- `sendTaskReminder(task, student)`
- `sendEmailReminder(task, student)`
- `sendWhatsAppReminder(task, student)`

### `ReminderJobService`
- `findTasksDueTomorrow()`
- `processTaskReminders(task)`

## Regras de negócio importantes
- apenas professores autorizados podem publicar tarefas;
- tarefa sem data de entrega não entra no calendário de vencimentos;
- aluno sem e-mail válido recebe apenas WhatsApp, se houver número válido;
- aluno sem telefone válido recebe apenas e-mail, se houver e-mail válido;
- canais independentes: falha em WhatsApp não impede envio de e-mail;
- evitar duplicidade de notificações;
- considerar feriados/fins de semana apenas se isso fizer parte da regra acadêmica.

## Critérios de aceite
- professor consegue cadastrar tarefa com data de entrega;
- tarefa aparece no calendário;
- job diário encontra tarefas que vencem amanhã;
- alunos vinculados recebem lembrete por e-mail;
- alunos vinculados recebem lembrete por WhatsApp;
- sistema registra sucesso/falha de envio;
- sistema não duplica notificações já enviadas.

## Plano incremental recomendado

### Fase 1
- cadastro de tarefa com data
- exibição no calendário

### Fase 2
- seleção de alunos por turma
- envio por e-mail
- log de envio

### Fase 3
- integração com WhatsApp
- retentativas e monitoramento

### Fase 4
- preferências de notificação
- painel administrativo de auditoria

## Riscos e dependências
- necessidade de confirmar a estrutura atual de entidades do projeto;
- necessidade de validar como o calendário já está implementado, se existir;
- dependência de provedor externo para WhatsApp;
- dependência de credenciais de e-mail válidas;
- cuidado com LGPD e consentimento de contato.

## Próximos passos no repositório
1. localizar o módulo atual de tarefas;
2. localizar a camada de calendário, se existir;
3. identificar modelo de aluno/turma/matrícula;
4. criar ou adaptar a entidade de log de notificações;
5. implementar job agendado;
6. integrar provedores de e-mail e WhatsApp;
7. adicionar documentação de configuração no README.
