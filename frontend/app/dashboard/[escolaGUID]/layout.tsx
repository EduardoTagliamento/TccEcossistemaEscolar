import { SocketProvider } from '@/lib/socket/SocketContext';

/**
 * Layout compartilhado por todas as rotas de `/dashboard/[escolaGUID]/**`.
 * Inicializa a conexão WebSocket (Socket.io) uma única vez em nível de
 * layout — não por página — para que o módulo de Chat (e, futuramente,
 * Notificações em tempo real) reaproveitem a mesma conexão ao navegar
 * entre telas do dashboard. Ver `frontend/lib/socket/SocketContext.tsx`.
 */
export default function DashboardEscolaLayout({ children }: { children: React.ReactNode }) {
  return <SocketProvider>{children}</SocketProvider>;
}
