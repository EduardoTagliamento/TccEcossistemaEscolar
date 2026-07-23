import { Poppins, Figtree, Baloo_2 } from 'next/font/google';
import { SocketProvider } from '@/lib/socket/SocketContext';
import { ChatUIProvider } from '@/lib/chat/ChatUIContext';
import DashboardNavbar from './_components/DashboardNavbar';
import MinimizedChatBubble from './_components/MinimizedChatBubble';
import NotificacaoToastListener from './_components/NotificacaoToastListener';

/**
 * Layout compartilhado por todas as rotas de `/dashboard/[escolaGUID]/**`.
 *
 * - Monta a `DashboardNavbar` (marca da escola + tema + navegação por
 *   módulo + sino + avatar) uma única vez, para que ela persista ao navegar
 *   entre telas do dashboard (antes só existia dentro da home).
 * - Inicializa a conexão WebSocket (Socket.io) uma única vez em nível de
 *   layout — não por página — para que o módulo de Chat (e, futuramente,
 *   Notificações em tempo real) reaproveitem a mesma conexão.
 * - `ChatUIProvider` + `MinimizedChatBubble`: quando o usuário sai da tela
 *   cheia de chat com uma conversa aberta, uma bolha flutuante minimizada
 *   (estilo Instagram Web) continua mostrando essa conversa por cima de
 *   qualquer outra página do dashboard — ver
 *   frontend/lib/chat/ChatUIContext.tsx e
 *   _components/MinimizedChatBubble.tsx.
 * - `NotificacaoToastListener`: mostra um toast em tempo real (WebSocket
 *   `notificacao:nova`) em qualquer tela do dashboard, não só quando o sino
 *   está aberto — ver _components/NotificacaoToastListener.tsx.
 * - Carrega a tipografia da marca Bauá (Poppins/Figtree/Baloo 2) como CSS
 *   Variables no wrapper, disponíveis pra qualquer página filha que
 *   referencie `var(--font-display)`/`var(--font-body)`/`var(--font-wordmark)`.
 */
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const baloo2 = Baloo_2({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-wordmark',
  display: 'swap',
});

export default function DashboardEscolaLayout({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <ChatUIProvider>
        <div className={`${poppins.variable} ${figtree.variable} ${baloo2.variable}`}>
          <DashboardNavbar />
          {children}
          <MinimizedChatBubble />
          <NotificacaoToastListener />
        </div>
      </ChatUIProvider>
    </SocketProvider>
  );
}
