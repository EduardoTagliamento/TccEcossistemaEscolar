'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { FiHome, FiSettings, FiUsers, FiFileText, FiLogOut, FiBookOpen, FiEdit3, FiCalendar, FiDatabase } from 'react-icons/fi';
import styles from './page.module.css';

interface Escola {
  EscolaGUID: string;
  EscolaNome: string;
  EscolaEmail: string;
  EscolaCor1?: string | null;
  EscolaCor2?: string | null;
  EscolaCor3?: string | null;
  EscolaCor4?: string | null;
  EscolaCorPriEs?: string | null;
  EscolaCorPriCl?: string | null;
  EscolaCorSecEs?: string | null;
  EscolaCorSecCl?: string | null;
  EscolaLogo: string | null;
}

interface EscolaComFuncoes {
  escola: {
    EscolaGUID: string;
  };
  funcoes: Array<{
    FuncaoId: number;
    Status: 'Ativo' | 'Inativo' | 'Finalizado';
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const params = useParams();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';
  const { usuario, token, isLoading: authLoading, logout } = useAuth();

  const [escola, setEscola] = useState<Escola | null>(null);
  const [funcoesEscola, setFuncoesEscola] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }

    if (usuario && escolaGUID) {
      buscarEscola();
      buscarFuncoesDaEscola();
    }
  }, [usuario, authLoading, escolaGUID]);

  const buscarEscola = async () => {
    setLoadError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/escola/${escolaGUID}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const mensagem = data?.message || 'Erro ao buscar escola';

        if (response.status === 401 || response.status === 403) {
          // Token expirado/inválido: volta ao login em vez de loop entre páginas.
          logout();
          router.push('/login');
          return;
        }

        if (response.status === 404) {
          setLoadError('Escola não encontrada ou sem permissão de acesso.');
          return;
        }

        throw new Error(mensagem);
      }

      const escolaPayload: Escola | undefined = data?.data?.escola ?? data?.data;
      if (!escolaPayload) {
        throw new Error('Resposta da API de escola está em formato inválido');
      }

      setEscola(escolaPayload);

      // Compatível com payload legado (EscolaCor1..4) e novo schema (EscolaCorPri/Sec*).
      const corPrimary = escolaPayload.EscolaCor1 ?? escolaPayload.EscolaCorPriEs;
      const corSecondary = escolaPayload.EscolaCor2 ?? escolaPayload.EscolaCorPriCl;
      const corTertiary = escolaPayload.EscolaCor3 ?? escolaPayload.EscolaCorSecEs;
      const corAccent = escolaPayload.EscolaCor4 ?? escolaPayload.EscolaCorSecCl;

      if (corPrimary) {
        document.documentElement.style.setProperty('--color-primary', corPrimary.startsWith('#') ? corPrimary : `#${corPrimary}`);
      }
      if (corSecondary) {
        document.documentElement.style.setProperty('--color-secondary', corSecondary.startsWith('#') ? corSecondary : `#${corSecondary}`);
      }
      if (corTertiary) {
        document.documentElement.style.setProperty('--color-tertiary', corTertiary.startsWith('#') ? corTertiary : `#${corTertiary}`);
      }
      if (corAccent) {
        document.documentElement.style.setProperty('--color-accent', corAccent.startsWith('#') ? corAccent : `#${corAccent}`);
      }
    } catch (err: any) {
      console.error('Erro ao buscar escola:', err);
      setLoadError(err?.message || 'Falha ao carregar o dashboard. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const buscarFuncoesDaEscola = async () => {
    if (!usuario) return;

    try {
      const response = await fetch(`/api/usuario/${usuario.UsuarioCPF}/escolas`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) return;

      const escolas: EscolaComFuncoes[] = data?.data?.escolas || [];
      const escolaSelecionada = escolas.find((item) => item.escola.EscolaGUID === escolaGUID);
      const funcoesAtivas = (escolaSelecionada?.funcoes || [])
        .filter((funcao) => funcao.Status === 'Ativo')
        .map((funcao) => funcao.FuncaoId);

      setFuncoesEscola(funcoesAtivas);
    } catch (error) {
      console.error('Erro ao buscar funções da escola:', error);
      setFuncoesEscola([]);
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

  if (loadError) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorCard}>
          <h2 className={styles.errorTitle}>Não foi possível carregar o dashboard</h2>
          <p className={styles.errorText}>{loadError}</p>
          <div className={styles.errorActions}>
            <button
              type="button"
              className={styles.retryButton}
              onClick={() => {
                void buscarEscola();
              }}
            >
              Tentar Novamente
            </button>
            <Link href="/selecionar-escola" className={styles.changeSchoolButton}>
              Voltar para Seleção
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isProfessor = funcoesEscola.includes(3);
  const isAluno = funcoesEscola.includes(5);
  const isCoordenacaoOuDirecao = funcoesEscola.includes(1) || funcoesEscola.includes(6);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.escolaInfo}>
            {escola?.EscolaLogo ? (
              <img
                src={escola.EscolaLogo}
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
            {(isCoordenacaoOuDirecao || isProfessor || isAluno) && (
              <div className={styles.quickActions}>
                {isCoordenacaoOuDirecao && (
                  <Link href={`/dashboard/${escolaGUID}/gestao-dados`} className={styles.quickActionButton}>
                    <FiDatabase /> Gestão de Dados
                  </Link>
                )}
                {isProfessor && (
                  <>
                    <Link href={`/dashboard/${escolaGUID}/crud-tarefa`} className={styles.quickActionButton}>
                      <FiBookOpen /> Cadastro de Tarefa
                    </Link>
                    <Link href={`/dashboard/${escolaGUID}/crud-provaagendada`} className={styles.quickActionButton}>
                      <FiEdit3 /> Cadastro de Prova Agendada
                    </Link>
                    <Link href={`/dashboard/${escolaGUID}/crud-conteudo`} className={styles.quickActionButton}>
                      <FiBookOpen /> Cadastro de Conteúdo
                    </Link>
                  </>
                )}
                {isAluno && (
                  <>
                    <Link href={`/dashboard/${escolaGUID}/tarefas`} className={styles.quickActionButton}>
                      <FiBookOpen /> Minhas Tarefas
                    </Link>
                    <Link href={`/dashboard/${escolaGUID}/calendario`} className={styles.quickActionButton}>
                      <FiCalendar /> Calendário de Avisos
                    </Link>
                  </>
                )}
              </div>
            )}
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
