import { Poppins, Figtree, Baloo_2 } from 'next/font/google';
import { SocketProvider } from '@/lib/socket/SocketContext';
import DashboardNavbar from './_components/DashboardNavbar';

/**
 * Layout compartilhado por todas as rotas de `/dashboard/[escolaGUID]/**`.
 *
 * - Monta a `DashboardNavbar` (marca da escola + tema + navegação por
 *   módulo + sino + avatar) uma única vez, para que ela persista ao navegar
 *   entre telas do dashboard (antes só existia dentro da home).
 * - Inicializa a conexão WebSocket (Socket.io) uma única vez em nível de
 *   layout — não por página — para que o módulo de Chat (e, futuramente,
 *   Notificações em tempo real) reaproveitem a mesma conexão.
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
      <div className={`${poppins.variable} ${figtree.variable} ${baloo2.variable}`}>
        <DashboardNavbar />
        {children}
      </div>
    </SocketProvider>
  );
}
