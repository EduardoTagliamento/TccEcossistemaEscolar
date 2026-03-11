import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth/AuthContext';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Bauá - Ecossistema Educacional',
  description: 'Plataforma de gestão educacional integrada',
  keywords: ['educação', 'gestão escolar', 'ensino', 'escola'],
  authors: [{ name: 'Eduardo Tagliamento' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#00CED1',
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
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
