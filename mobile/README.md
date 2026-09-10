# Ecossistema Escolar — App Mobile (Expo/React Native)

App mobile em TypeScript (Expo) que consome a mesma API do backend
(`../backend`) usada pelo frontend web (`../frontend`) — REST via
`fetch` + JWT, chat em tempo real via Socket.IO. Ver
`../docs/ANALISE_VIABILIDADE_APP_MOBILE.md` para a análise que motivou este
projeto e `../docs/monografia/` (design "Etapa Escola Mobile" no Claude
Design) para a referência visual.

## Rodando

```bash
cd mobile
npm install
npx expo start
```

Abra no **Expo Go** (Android/iOS) ou num emulador. `EXPO_PUBLIC_API_URL` e
`EXPO_PUBLIC_SOCKET_URL` (em `.env`) já apontam para produção
(`https://www.baua.com.br`) — é o único backend acessível fora da rede da
Railway. Para apontar para outro ambiente, crie um `.env.local`
(gitignorado) com as mesmas chaves.

## Escopo desta leva (v1 — aluno/professor)

Implementado, consumindo endpoints reais do backend:

- **Login** (`/api/auth/login`) + seleção de escola (quando o usuário tem
  vínculo ativo em mais de uma)
- **Início**: resumo de matérias, tarefas a vencer, avisos gerais
- **Matérias**: lista + busca, detalhe com categorias/conteúdos/provas/tarefas
- **Tarefas**: estatísticas + lista com status real (`Atrasada`/`Pendente`/
  `Rascunho`/`Concluida`, calculado pelo backend)
- **Calendário**: grade do mês (tarefas/provas/eventos/anotações) + modal do
  dia
- **Conversas e Chat**: lista de conversas, mensagens em tempo real via
  Socket.IO (`join_conversa`/`send_mensagem`/`mark_as_read`/`typing`),
  reações e apagar mensagem própria
- **Notificações**: feed do sino + marcar como lida/marcar todas
- **Perfil**: preferências de acessibilidade (tema/daltônico/alto
  contraste) gravadas de verdade em `/api/usuario` (mesmos campos que o
  frontend web usa) + sair da conta

## Fora desta leva (adiado por decisão do usuário)

Presentes no design "Etapa Escola Mobile" mas **não implementados ainda**:

- **Gestão** (9 sub-abas: alunos, professores, turmas, matérias,
  responsáveis, avisos, auditoria, admin de plataforma, configuração da
  escola)
- **Cadastro** (criação de tarefa/aviso/evento/pendência pelo app)
- **Projetos** (lista, detalhe, grupos)
- **Pendências**

Essas telas são de coordenação/admin — o v1 cobre o uso diário de
aluno/professor. Fica para uma próxima leva de implementação.

## Também fora do escopo (identificado na análise de viabilidade)

- **Push notification nativa** (FCM/APNs) — hoje o badge de notificação usa
  polling leve enquanto o app está aberto (`useNotificacoesNaoLidas`); não
  há notificação com o app fechado.
- **Publicação nas lojas** (Google Play / App Store) — build/assinatura,
  contas de desenvolvedor.
- **Anexos no chat** (imagem/arquivo) — só mensagens de texto nesta leva.
- **Responder mensagem (reply-quote)** — não existe like campo real no
  backend hoje (era só dado de demonstração no mockup de referência); o chat
  aqui implementa só o que a API realmente suporta: texto, reações, editar/
  apagar mensagem própria.

## Estrutura

```
src/
  api/          # um *.api.ts por recurso, espelhando frontend/lib/api/*.api.ts
  context/       # AuthContext, EscolaContext, ThemeContext, SocketContext
  theme/         # tokens de cor/fonte + lógica de tema (claro/escuro/daltônico/alto contraste)
  navigation/    # RootNavigator (stack) + MainTabs (bottom tabs)
  components/    # Header, Screen, Card, Button, TextField, Pill, ícones
  screens/       # uma pasta por área (auth, inicio, materias, tarefas, calendario, conversas, notificacoes, perfil)
  hooks/         # hooks reutilizáveis (ex.: contador de notificações não lidas)
  utils/         # formatação de data e status de tarefa
```
