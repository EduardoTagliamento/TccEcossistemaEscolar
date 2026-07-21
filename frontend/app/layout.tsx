import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth/AuthContext';
import '../styles/globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bauá - Ecossistema Educacional',
  description: 'Plataforma de gestão educacional integrada',
  keywords: ['educação', 'gestão escolar', 'ensino', 'escola'],
  authors: [{ name: 'Eduardo Tagliamento' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#1cc47b',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="UTF-8" />
        {/*
          Script de boot bloqueante: evita flash de tema/movimento errado
          antes do React hidratar. Preferências reais são por conta
          (`UsuarioTema`/`UsuarioReduzirMovimento`/etc., sem localStorage) e
          só chegam depois do `AuthContext` buscar `/api/auth/me` — antes
          disso (ou em rotas sem login, como a landing/login) não há como
          saber a preferência salva, então o melhor palpite possível aqui é
          o do sistema operacional (`prefers-color-scheme` /
          `prefers-reduced-motion`). Escala de fonte, modo daltônico e alto
          contraste não têm um sinal de SO equivalente amplamente suportado,
          então ficam no padrão (médio / desligado / desligado) até o
          `AuthContext` corrigir, via `frontend/lib/theme/tema.ts` (mesma
          lógica de resolução).
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=window.matchMedia;var e=m&&m('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',e?'dark':'light');var r=m&&m('(prefers-reduced-motion: reduce)').matches;document.documentElement.setAttribute('data-reduzir-movimento',r?'true':'false');}catch(t){}})();`,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
