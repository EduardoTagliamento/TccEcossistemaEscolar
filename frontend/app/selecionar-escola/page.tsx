'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Poppins, Figtree, Baloo_2 } from 'next/font/google';
import { useAuth } from '@/lib/auth/AuthContext';
import AuthGreenShell from '@/components/auth/AuthGreenShell';
import AuthIcon from '@/components/auth/AuthIcon';
import BauaLogo from '@/components/auth/BauaLogo';
import styles from './page.module.css';

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

interface Funcao {
  EscolaxUsuarioxFuncaoId: number;
  FuncaoId: number;
  FuncaoNome: string;
  DataInicio: string;
  DataFim: string | null;
  Status: 'Ativa' | 'Inativa';
}

interface Escola {
  EscolaGUID: string;
  EscolaNome: string;
  EscolaEmail: string;
  EscolaCor1: string | null;
  EscolaCor2: string | null;
  EscolaCor3: string | null;
  EscolaCor4: string | null;
  EscolaLogo: string | null;
}

interface EscolaComFuncoes {
  escola: Escola;
  funcoes: Funcao[];
}

export default function SelecionarEscolaPage() {
  const router = useRouter();
  const { usuario, token, isLoading: authLoading, logout } = useAuth();

  const [escolas, setEscolas] = useState<EscolaComFuncoes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }

    if (usuario) {
      buscarEscolas();
    }
  }, [usuario, authLoading]);

  const buscarEscolas = async () => {
    if (!usuario) return;

    try {
      const response = await fetch(`/api/usuario/${usuario.UsuarioCPF}/escolas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar escolas');
      }

      setEscolas(data.data.escolas || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar suas escolas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
      logout();
      router.push('/login');
    }
  };

  const selecionarEscola = (escolaGUID: string) => {
    // Salvar escola selecionada no localStorage
    localStorage.setItem('@baua:escolaSelecionada', escolaGUID);

    // Redirecionar para dashboard
    router.push(`/dashboard/${escolaGUID}`);
  };

  const fontVars = `${poppins.variable} ${figtree.variable} ${baloo2.variable}`;

  if (authLoading || isLoading) {
    return (
      <AuthGreenShell className={fontVars} maxWidth={420}>
        <div className={styles.loadingState}>
          <BauaLogo size={28} />
          <div className={styles.spinner} />
          <p>Carregando suas escolas...</p>
        </div>
      </AuthGreenShell>
    );
  }

  return (
    <AuthGreenShell className={fontVars} maxWidth={680}>
      <div className={styles.topRow}>
        <BauaLogo size={26} />
        <div className={styles.userChip}>
          {usuario && <span className={styles.userName}>{usuario.UsuarioNome}</span>}
          <button onClick={handleLogout} className={styles.logoutLink}>
            <AuthIcon name="log-out" size={14} /> Sair
          </button>
        </div>
      </div>

      <h1 className={styles.title}>Suas escolas</h1>
      <p className={styles.subtitle}>Escolha uma escola para continuar.</p>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <AuthIcon name="alert-triangle" size={16} />
          <span>{error}</span>
        </div>
      )}

      {escolas.length === 0 && !error ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <AuthIcon name="plus" size={28} />
          </div>
          <h2>Você ainda não está vinculado a nenhuma escola</h2>
          <p>Crie sua primeira escola para começar a usar o Bauá</p>
          <Link href="/criar-escola" className={styles.emptyCta}>
            <AuthIcon name="plus" size={18} /> Criar Primeira Escola
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {escolas.map((item) => {
            const cor1 = item.escola.EscolaCor1 || undefined;
            const cor2 = item.escola.EscolaCor2 || '#FFFFFF';
            const inicial = item.escola.EscolaNome.charAt(0).toUpperCase();
            const papel = item.funcoes[0]?.FuncaoNome;

            return (
              <button
                key={item.escola.EscolaGUID}
                className={styles.escolaCard}
                onClick={() => selecionarEscola(item.escola.EscolaGUID)}
              >
                {item.escola.EscolaLogo ? (
                  <img src={item.escola.EscolaLogo} alt="" className={styles.escolaLogoImg} />
                ) : (
                  <span
                    className={styles.escolaAvatar}
                    style={{ background: cor1 || 'var(--green-500)', color: cor2 }}
                  >
                    {inicial}
                  </span>
                )}
                <span className={styles.escolaInfo}>
                  <span className={styles.escolaName}>{item.escola.EscolaNome}</span>
                  {papel && <span className={styles.escolaRole}>{papel}</span>}
                </span>
                <AuthIcon name="chevron-right" size={18} className={styles.escolaChevron} />
              </button>
            );
          })}

          <Link href="/criar-escola" className={styles.createCard}>
            <AuthIcon name="plus" size={20} /> Criar nova escola
          </Link>
        </div>
      )}
    </AuthGreenShell>
  );
}
