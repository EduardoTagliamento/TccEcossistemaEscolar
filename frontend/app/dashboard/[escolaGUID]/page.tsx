'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { FiHome, FiSettings, FiUsers, FiFileText, FiLogOut } from 'react-icons/fi';
import styles from './page.module.css';

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

export default function DashboardPage() {
  const router = useRouter();
  const params = useParams();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';
  const { usuario, token, isLoading: authLoading, logout } = useAuth();

  const [escola, setEscola] = useState<Escola | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }

    if (usuario && escolaGUID) {
      buscarEscola();
    }
  }, [usuario, authLoading, escolaGUID]);

  const buscarEscola = async () => {
    try {
      const response = await fetch(`/api/escola/${escolaGUID}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar escola');
      }

      setEscola(data.data.escola);
      
      // Aplicar tema da escola
      if (data.data.escola.EscolaCor1) {
        document.documentElement.style.setProperty('--color-primary', data.data.escola.EscolaCor1);
      }
      if (data.data.escola.EscolaCor2) {
        document.documentElement.style.setProperty('--color-secondary', data.data.escola.EscolaCor2);
      }
      if (data.data.escola.EscolaCor3) {
        document.documentElement.style.setProperty('--color-tertiary', data.data.escola.EscolaCor3);
      }
      if (data.data.escola.EscolaCor4) {
        document.documentElement.style.setProperty('--color-accent', data.data.escola.EscolaCor4);
      }
    } catch (err: any) {
      console.error('Erro ao buscar escola:', err);
      router.push('/selecionar-escola');
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

  if (authLoading || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.escolaInfo}>
            {escola?.EscolaLogo ? (
              <img
                src={`/uploads/logos/${escola.EscolaLogo}`}
                alt={escola.EscolaNome}
                className={styles.escolaLogo}
              />
            ) : (
              <div className={styles.escolaIcon}>
                {escola?.EscolaNome.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1>{escola?.EscolaNome}</h1>
              <p>{usuario?.UsuarioNome} {usuario?.UsuarioSobrenome}</p>
            </div>
          </div>
          
          <div className={styles.headerActions}>
            <Link href="/selecionar-escola" className={styles.changeSchoolButton}>
              Trocar Escola
            </Link>
            <button onClick={handleLogout} className={styles.logoutButton}>
              <FiLogOut /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className={styles.mainContent}>
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            <Link href={`/dashboard/${escolaGUID}`} className={`${styles.navItem} ${styles.active}`}>
              <FiHome /> Dashboard
            </Link>
            <Link href={`/dashboard/${escolaGUID}/usuarios`} className={styles.navItem}>
              <FiUsers /> Usuários
            </Link>
            <Link href={`/dashboard/${escolaGUID}/relatorios`} className={styles.navItem}>
              <FiFileText /> Relatórios
            </Link>
            <Link href={`/dashboard/${escolaGUID}/configuracoes`} className={styles.navItem}>
              <FiSettings /> Configurações
            </Link>
          </nav>
        </aside>

        <main className={styles.content}>
          <div className={styles.welcomeSection}>
            <h2>Bem-vindo ao Dashboard</h2>
            <p>Aqui você pode gerenciar todas as atividades da sua escola</p>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: escola?.EscolaCor1 || 'var(--color-primary)' }}>
                <FiUsers />
              </div>
              <div className={styles.statContent}>
                <h3>Usuários</h3>
                <p className={styles.statValue}>--</p>
                <p className={styles.statLabel}>Total de usuários</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: escola?.EscolaCor4 || 'var(--color-accent)' }}>
                <FiFileText />
              </div>
              <div className={styles.statContent}>
                <h3>Atividades</h3>
                <p className={styles.statValue}>--</p>
                <p className={styles.statLabel}>Atividades recentes</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-success)' }}>
                <FiSettings />
              </div>
              <div className={styles.statContent}>
                <h3>Sistema</h3>
                <p className={styles.statValue}>Ativo</p>
                <p className={styles.statLabel}>Status do sistema</p>
              </div>
            </div>
          </div>

          <div className={styles.infoBox}>
            <h3>🚧 Dashboard em Desenvolvimento</h3>
            <p>
              O dashboard completo está sendo desenvolvido. Em breve você terá acesso a:
            </p>
            <ul>
              <li>Gestão de usuários e permissões</li>
              <li>Relatórios e análises</li>
              <li>Configurações da escola</li>
              <li>Muito mais...</li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
