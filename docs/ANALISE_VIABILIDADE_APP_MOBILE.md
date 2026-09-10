# Análise: Viabilidade de um App Mobile para o Ecossistema Escolar

> Documento de análise técnica, não um plano de implementação aprovado.
> Objetivo: responder se é preciso ir para uma linguagem nativa (ex.: Kotlin/Swift)
> ou se dá para reaproveitar TypeScript, e o que cada caminho custaria de verdade
> considerando a API real do projeto.

## 1. Resposta direta

**Não precisa de linguagem nativa.** A API do backend (Express + MySQL, autenticação
via JWT, chat em tempo real via Socket.IO) já é consumida hoje pelo frontend
Next.js como um cliente HTTP/WebSocket qualquer — nada ali é "amarrado" ao navegador.
Isso significa que **qualquer cliente capaz de fazer `fetch`/`axios` e abrir um
socket** consegue falar com o mesmo backend, incluindo um app escrito em
TypeScript.

O caminho recomendado é **React Native** (idealmente via **Expo**), que continua
sendo TypeScript e reaproveita boa parte do raciocínio (hooks, React Query,
Zod, formulários) já usado no frontend web — só a camada de UI muda (não é
HTML/CSS, é `View`/`Text`/`StyleSheet`, mas o modelo mental é o mesmo).

Kotlin/Swift nativo só entraria em jogo se, no futuro, o app precisar de algo
que só a plataforma nativa dá (ex.: widgets de tela inicial, integração muito
profunda com sensores/Bluetooth, ou performance de UI em nível de jogo) — não é
o caso de um app de comunicação escolar/CRUD/chat.

## 2. Por que a API já está pronta para isso

- **REST + JWT** (`backend/utils/JwtService.ts`, rotas Express em `backend/routes`):
  autenticação por token, sem depender de sessão de navegador/cookie. Um app
  mobile guarda o token em storage seguro (`expo-secure-store`/Keychain/Keystore)
  e manda `Authorization: Bearer <token>` igual o frontend web já faz hoje.
- **Chat em tempo real via Socket.IO** (`backend/websocket/SocketServer.ts`,
  `conversa.handler.ts`, lib `socket.io` v4.8): existe cliente oficial
  `socket.io-client` para React Native, funciona igual ao client web usado no
  Next.js — não precisa reimplementar o protocolo.
- **Upload de arquivos** (multer + S3, em `backend/services/upload.service.ts`):
  RN consegue montar `multipart/form-data` nativamente (`expo-document-picker`
  + `fetch`/`FormData`), então provas, materiais didáticos e fotos de perfil
  seguem o mesmo contrato de rota.
- **Camadas DAO/Service já separadas dos controllers** (`backend/repositories`,
  `backend/services`): o backend não sabe (nem precisa saber) quem está do
  outro lado da requisição — web ou mobile —, então nenhuma mudança de
  arquitetura de backend é necessária para "abrir a porta" para um app.

Em resumo: o app mobile seria **mais um consumidor da mesma API**, não uma
reescrita de backend.

## 3. Comparação de caminhos

| Caminho | Linguagem | Reaproveita o quê do projeto atual | Esforço | Quando faz sentido |
|---|---|---|---|---|
| **React Native (Expo)** ✅ recomendado | TypeScript | Tipos de DTO, lógica de chamada de API, React Query, Zod, hooks de auth (adaptando storage) | Médio — UI é refeita, lógica não | Caminho natural dado que tudo já é TS/React |
| **Capacitor/Ionic** (empacota o site atual em WebView) | TypeScript/HTML/CSS | O frontend Next.js quase 100% como está | Baixo, mas... | MVP rápido / prova de conceito; UX fica "site dentro de app", não parece nativo, WebSocket e câmera funcionam mas com mais gambiarra |
| **PWA** (instalar o site como app, sem loja) | TypeScript | 100% do frontend atual | Muito baixo | Só cobre "atalho na tela + funciona offline básico"; não substitui push notification nativo nem presença em loja de apps |
| **Flutter** | Dart (não é TS) | Nada de código, só os DTOs/contratos de API (reescritos) | Alto (nova stack) | Só valeria se o time quisesse UI muito polida e não se importasse de aprender Dart |
| **Nativo puro (Kotlin + Swift)** | Kotlin / Swift | Nada de código do frontend, só a API mesmo | Alto (duas bases de código, dois times/skillsets) | Só se precisar de recurso 100% nativo específico de plataforma |

## 4. O que precisaria ser criado (não existe hoje)

Independente da tecnologia escolhida, alguns pontos do backend/infra ainda não
existem e teriam que ser adicionados:

1. **Push notifications nativas** (FCM para Android / APNs para iOS). Hoje o
   sistema de notificações (`PLANO_IMPLEMENTACAO_NOTIFICACOES.md`) é
   pensado para web; para mobile de verdade (notificação com o app fechado)
   precisa de um provedor (ex.: Firebase Cloud Messaging) e uma rota nova no
   backend para registrar o token do dispositivo por usuário.
2. **Storage seguro de token no cliente** (troca de `localStorage` do browser
   por `expo-secure-store`/Keychain/Keystore no app).
3. **Refresh/revogação de sessão pensada para app de longa duração** (um app
   fica instalado por meses; vale revisar expiração/renovação do JWT nesse
   cenário, diferente da aba de navegador que fecha com frequência).
4. **Ajustes de CORS/host** para o app apontar para a URL de produção
   (`baua.com.br`) como uma API externa, não como "same origin".
5. **Build/distribuição**: conta de desenvolvedor Google Play e Apple
   Developer Program (esse segundo tem custo anual e exige Mac para build/
   assinatura via Xcode, mesmo usando Expo/EAS Build na nuvem para evitar
   comprar um Mac).

Nenhum desses pontos exige mudar a arquitetura MVC/DAO/Service existente —
são adições, não refatorações.

## 5. Recomendação prática

Se o objetivo é ter um app na Play Store/App Store **sem trocar de
linguagem e sem duplicar lógica de negócio**:

1. Começar com **Expo + React Native + TypeScript**.
2. Reaproveitar os **schemas Zod e tipos de DTO** do backend como fonte da
   verdade dos formatos de request/response (hoje já usados no frontend web).
3. Usar **React Query** no app do mesmo jeito que no site, apontando para os
   mesmos endpoints REST.
4. Reaproveitar o **`socket.io-client`** para o chat em tempo real.
5. Deixar push notification nativa como uma segunda fase, já que é a única
   peça de infraestrutura genuinamente nova.

Isso mantém uma única linguagem (TypeScript) e um único time capaz de
trabalhar em ambas as frentes (web e mobile), com a maior parte do esforço
concentrado em UI — não em reconstruir a comunicação com o backend.
