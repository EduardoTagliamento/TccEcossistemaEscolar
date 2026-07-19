'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Poppins, Figtree, Baloo_2 } from 'next/font/google';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './page.module.css';

// Tipografia da marca Bauá (tokens/fonts.css do design system — mesmo padrão
// já usado em frontend/app/page.tsx):
// Poppins -> display/headings · Figtree -> corpo/UI · Baloo 2 -> wordmark "bauá"
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

const fontVars = `${poppins.variable} ${figtree.variable} ${baloo2.variable}`;

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

// Glifos Feather-style extraídos literalmente de components/core/Icon.jsx
// (Bauá Design System, project 689c269f-be3b-4445-98c6-69b779c38839) — mesmo
// conjunto de ícones referenciado em "Dashboard Escola.dc.html" via
// BauDesignSystem_689c26.Icon.
type IconName =
  | 'home'
  | 'users'
  | 'file-text'
  | 'settings'
  | 'log-out'
  | 'book-open'
  | 'edit'
  | 'calendar'
  | 'database'
  | 'bell'
  | 'chevron-down'
  | 'message-circle';

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common: React.SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  switch (name) {
    case 'home':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'file-text':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'log-out':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    case 'book-open':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common} aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'database':
      return (
        <svg {...common} aria-hidden="true">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...common} aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      );
    case 'message-circle':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    default:
      return null;
  }
}

function obterIniciais(nome?: string, sobrenome?: string): string {
  const nomeCompleto = `${nome || ''} ${sobrenome || ''}`.trim();
  if (!nomeCompleto) return '?';
  return nomeCompleto
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase();
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';
  const { usuario, token, isLoading: authLoading, logout } = useAuth();

  const [escola, setEscola] = useState<Escola | null>(null);
  const [funcoesEscola, setFuncoesEscola] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userMenuAberto, setUserMenuAberto] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const fecharAoClicarFora = (evento: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(evento.target as Node)) {
        setUserMenuAberto(false);
      }
    };
    document.addEventListener('mousedown', fecharAoClicarFora);
    return () => document.removeEventListener('mousedown', fecharAoClicarFora);
  }, []);

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
      <div className={`${styles.container} ${fontVars}`}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`${styles.container} ${fontVars}`}>
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
      </div>
    );
  }

  const isProfessor = funcoesEscola.includes(3);
  const isAluno = funcoesEscola.includes(5);
  const isCoordenacaoOuDirecao = funcoesEscola.includes(1) || funcoesEscola.includes(6);

  const modulosNav: Array<{ key: string; href: string; label: string; icon: IconName }> = [
    { key: 'dashboard', href: `/dashboard/${escolaGUID}`, label: 'Dashboard', icon: 'home' },
    { key: 'chat', href: `/dashboard/${escolaGUID}/chat`, label: 'Conversas', icon: 'message-circle' },
    { key: 'usuarios', href: `/dashboard/${escolaGUID}/usuarios`, label: 'Usuários', icon: 'users' },
    { key: 'relatorios', href: `/dashboard/${escolaGUID}/relatorios`, label: 'Relatórios', icon: 'file-text' },
    { key: 'configuracoes', href: `/dashboard/${escolaGUID}/configuracoes`, label: 'Configurações', icon: 'settings' },
  ];

  const agora = new Date();
  const hora = agora.getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const diaSemana = capitalizar(agora.toLocaleDateString('pt-BR', { weekday: 'long' }));
  const diaMes = agora.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  const primeiroNome = usuario?.UsuarioNome || '';
  const nomeCompleto = `${usuario?.UsuarioNome || ''} ${usuario?.UsuarioSobrenome || ''}`.trim();
  const iniciaisUsuario = obterIniciais(usuario?.UsuarioNome, usuario?.UsuarioSobrenome);

  return (
    <div className={`${styles.container} ${fontVars}`}>
      <header className={styles.navbar}>
        <div className={styles.navbarInner}>
          <div className={styles.brand}>
            {escola?.EscolaLogo ? (
              <img src={escola.EscolaLogo} alt={escola.EscolaNome} className={styles.brandLogo} />
            ) : (
              <div className={styles.brandLogoFallback}>
                {escola?.EscolaNome.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={styles.brandText}>
              <span className={styles.brandName}>{escola?.EscolaNome}</span>
              <span className={styles.brandPowered}>
                powered by <span className={styles.brandWordmark}>bauá</span>
              </span>
            </div>
          </div>

          <nav className={styles.moduleNav} aria-label="Módulos da escola">
            {modulosNav.map((modulo) => {
              const ativo = modulo.key === 'dashboard'
                ? pathname === modulo.href
                : (pathname || '').startsWith(modulo.href);
              return (
                <Link
                  key={modulo.key}
                  href={modulo.href}
                  className={`${styles.moduleItem} ${ativo ? styles.moduleItemActive : ''}`}
                >
                  <Icon name={modulo.icon} size={20} />
                  <span>{modulo.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className={styles.navActions}>
            <Link
              href={`/dashboard/${escolaGUID}/notificacoes`}
              className={styles.iconButton}
              aria-label="Avisos"
              title="Avisos"
            >
              <Icon name="bell" size={19} />
            </Link>
            <span className={styles.navDivider} />
            <div className={styles.userMenuWrap} ref={userMenuRef}>
              <button
                type="button"
                className={styles.userTrigger}
                onClick={() => setUserMenuAberto((aberto) => !aberto)}
                aria-haspopup="true"
                aria-expanded={userMenuAberto}
              >
                <span className={styles.avatar}>{iniciaisUsuario}</span>
                <Icon name="chevron-down" size={16} />
              </button>

              {userMenuAberto && (
                <div className={styles.userDropdown}>
                  <div className={styles.userDropdownHeader}>
                    <span className={styles.avatar}>{iniciaisUsuario}</span>
                    <div className={styles.userDropdownInfo}>
                      <span className={styles.userDropdownName}>{nomeCompleto || 'Usuário'}</span>
                      <span className={styles.userDropdownEmail}>{usuario?.UsuarioEmail}</span>
                    </div>
                  </div>
                  <div className={styles.dropdownDivider} />
                  <Link href={`/dashboard/${escolaGUID}/configuracoes`} className={styles.menuItem}>
                    <Icon name="settings" size={17} /> Configurações
                  </Link>
                  <Link href="/selecionar-escola" className={styles.menuItem}>
                    <Icon name="home" size={17} /> Trocar Escola
                  </Link>
                  <div className={styles.dropdownDivider} />
                  <button type="button" onClick={handleLogout} className={styles.menuItemDanger}>
                    <Icon name="log-out" size={17} /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.contentStack}>
          <section className={styles.greetingBanner}>
            <div className={styles.gridBg} aria-hidden="true" />
            <div className={styles.bannerContent}>
              <span className={styles.bannerEyebrow}>{diaSemana} · {diaMes}</span>
              <h1 className={styles.bannerTitle}>{saudacao}, {primeiroNome || 'bem-vindo'} 👋</h1>
              <p className={styles.bannerSubtitle}>
                Aqui você pode acompanhar e gerenciar todas as atividades de {escola?.EscolaNome || 'sua escola'}.
              </p>

              {(isCoordenacaoOuDirecao || isProfessor || isAluno) && (
                <div className={styles.bannerPills}>
                  {isCoordenacaoOuDirecao && (
                    <Link href={`/dashboard/${escolaGUID}/gestao-dados`} className={styles.pillSolid}>
                      <Icon name="database" size={16} /> Gestão de Dados
                    </Link>
                  )}
                  {isProfessor && (
                    <>
                      <Link href={`/dashboard/${escolaGUID}/crud-tarefa`} className={styles.pillOutline}>
                        <Icon name="book-open" size={16} /> Cadastro de Tarefa
                      </Link>
                      <Link href={`/dashboard/${escolaGUID}/crud-provaagendada`} className={styles.pillOutline}>
                        <Icon name="edit" size={16} /> Cadastro de Prova Agendada
                      </Link>
                      <Link href={`/dashboard/${escolaGUID}/crud-conteudo`} className={styles.pillOutline}>
                        <Icon name="book-open" size={16} /> Cadastro de Conteúdo
                      </Link>
                    </>
                  )}
                  {isAluno && (
                    <>
                      <Link href={`/dashboard/${escolaGUID}/tarefas`} className={styles.pillOutline}>
                        <Icon name="book-open" size={16} /> Minhas Tarefas
                      </Link>
                      <Link href={`/dashboard/${escolaGUID}/calendario`} className={styles.pillOutline}>
                        <Icon name="calendar" size={16} /> Calendário de Avisos
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: 'var(--color-primary)' }}>
                <Icon name="users" size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Usuários</span>
                <span className={styles.statValue}>--</span>
                <span className={styles.statCaption}>Total de usuários</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: 'var(--color-accent)' }}>
                <Icon name="file-text" size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Atividades</span>
                <span className={styles.statValue}>--</span>
                <span className={styles.statCaption}>Atividades recentes</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
                <Icon name="settings" size={20} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Sistema</span>
                <span className={styles.statValue}>Ativo</span>
                <span className={styles.statCaption}>Status do sistema</span>
              </div>
            </div>
          </section>

          <section className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <Icon name="database" size={18} />
              <h3>Dashboard em desenvolvimento</h3>
            </div>
            <p className={styles.infoCardText}>
              O dashboard completo está sendo desenvolvido. Em breve você terá acesso a:
            </p>
            <ul className={styles.infoList}>
              <li>Gestão de usuários e permissões</li>
              <li>Relatórios e análises</li>
              <li>Configurações da escola</li>
              <li>Muito mais...</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
