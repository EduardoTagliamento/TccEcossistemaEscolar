# Pendências reais — Ecossistema Escolar

> Lista **só do que falta**, sem o histórico narrativo/justificativas — isso continua em `RELATORIO_BAUA_CODIGO.md`. Este arquivo é o que deve ser consultado pra saber "o que falta fazer" e mantido atualizado daqui pra frente: quando um item for implementado, **apague a linha daqui** (não deixe virar um segundo checklist desatualizado).
>
> Última atualização: 2026-07-29. Itens fora dos módulos Matérias, Chat, Notificações, Configuração da escola e Auth/institucional refletem o estado confirmado em 2026-07-22 no relatório original — não foram re-auditados nesta rodada. **Chat foi re-auditado em 2026-07-29** e removido inteiro daqui: reações, gestão de Representante/Vice-Representante (com UI) e recibo de leitura já estavam implementados desde o commit `68d8cf3` (2026-07-23) — a documentação é que estava desatualizada, não o código. **Notificações também foi re-auditado em 2026-07-29**: o toast em tempo real já estava implementado (`NotificacaoToastListener`, montado no layout do dashboard); paginação/retenção do feed foi decidida pelo usuário (expurgo automático só de notificações já lidas, 30 dias) e implementada nesta mesma rodada — item removido daqui. **Dois gaps do Matérias também foram fechados em 2026-07-29**: edição de mídia de Conteúdo já publicado (texto/link/arquivo, por tipo) e link "Gerenciar grupo" no visualizador para tarefas compartilhadas (leva à tela `/tarefas/[tarefaGUID]` já existente, antes só alcançável navegando manualmente). **"Configuração da escola" e 2 dos 3 itens de "Auth/institucional" também caem em 2026-07-29**: e-mail/logo da escola e o rework de `saiba-mais` + reposicionamento de login/cadastro já tinham sido implementados no dia seguinte ao relatório original (commits `4a0970e` e `6b27275`, ambos 2026-07-23) — de novo, documentação desatualizada, não código faltando.

## Como ler

- Cada item tem uma tag entre parênteses:
  - **(bug/gap)** — falta de verdade, deveria ser feito.
  - **(fora de escopo)** — adiamento consciente do usuário, não é esquecimento. Não tratar como prioridade sem confirmar antes.
  - **(confirmar)** — incerteza real: pode já estar resolvido, mas não foi verificado no código.

---

## Matérias

- [ ] Tarefa tipo "lista" (7º tipo de tarefa) — só digital/presencial existem hoje **(fora de escopo)**
- [ ] Recomendação de estudo por IA — sem fonte de dado nem provedor escolhidos, `backend/ai/` só tem README **(fora de escopo)**
- [ ] Nota de prova (`prova_nota`) — prova hoje é só leitura + "já vi", sem lançamento de nota **(fora de escopo)**
- [ ] Categoria "do representante" (aluno representante de turma criar categoria própria) — hook de permissão pronto no backend, sem UI **(fora de escopo, função futura confirmada)**

## Notificações

- [ ] Canal WhatsApp (Evolution API) — **(fora de escopo por ora)**

## Auth / institucional (Login, Cadastro, Saiba mais, Landing page)

- [ ] Revisão de copy/persuasão da landing page (confiança, argumentos de venda, FAQ) — decisão de conteúdo, não de layout **(confirmar com o usuário/negócio, não é trabalho de código)**

## Outros

- [ ] Módulo "em standby" (pág. 11 do board original) — só o post-it "a mimir, volte mais tarde", sem nome nem spec. Só a equipe consegue esclarecer o que era **(confirmar com a equipe)**
- [ ] Filtro de pesquisa na listagem de Gestão de Dados (post-it original) **(bug/gap)**
- [ ] Confirmar se os cards da home de Gestão de Dados já são dinâmicos (contagem de turmas/matérias/alunos) ou ainda estáticos **(confirmar)**
- [ ] Dashboard (home): os post-its "ícones de acesso rápido às matérias" e "identidade visual de entidades (turmas/matérias)" dependiam do módulo Matérias, que agora existe — confirmar se a home do dashboard já expõe atalho/identidade visual pras matérias do usuário, ou se isso ficou só na navbar **(confirmar)**
- [ ] Cobertura de CSS de acessibilidade (dark/daltônico/alto-contraste/escala de fonte) não abrange todo o app — só `globals.css` + navbar + home do dashboard + perfil + configurações da escola. Gestão de dados, calendário, tarefas, chat, projetos e **Matérias** (módulo novo, não avaliado ainda) seguem fora dessa cobertura **(bug/gap)**
