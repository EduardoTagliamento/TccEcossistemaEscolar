'use client';

/**
 * Navbar persistente do dashboard — montada uma única vez em
 * `frontend/app/dashboard/[escolaGUID]/layout.tsx`, envolvendo todas as
 * rotas de `/dashboard/[escolaGUID]/**`. Antes só existia dentro de
 * `page.tsx` (a home), então sumia ao navegar pra qualquer outra tela.
 *
 * Concentra: marca da escola + tema dinâmico (CSS Variables injetadas no
 * <html>), navegação por módulo (papel-consciente), sino de notificações
 * (painel dropdown) e o dropdown do avatar do usuário (Meu Perfil / Trocar
 * Escola / Sair — o "Meu Perfil" leva à tela dedicada de configuração do
 * usuário em `/dashboard/[escolaGUID]/perfil`, distinta da configuração da
 * ESCOLA, que fica no item "Config. da Escola" da navegação por módulo).
 */

import { useEffect, useRef, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import * as NotificacaoAPI from '@/lib/api/notificacao.api';
import type { Notificacao } from '@/lib/api/notificacao.api';
import { contarPendencias } from '@/lib/api/pendencia.api';
import styles from './DashboardNavbar.module.css';

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
  /** Path de arquivo legado — nunca populado em nenhum fluxo real do app hoje;
   *  mantido só como fallback secundário. */
  EscolaLogo?: string | null;
  /** Ícone da escola salvo em `/configuracoes`, serializado como base64 pelo
   *  backend (ver EscolaAPI.Escola em `frontend/lib/api/escola.api.ts`). */
  EscolaIcone?: string | null;
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
// (Bauá Design System, project 689c269f-be3b-4445-98c6-69b779c38839).
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
  | 'chevron-left'
  | 'chevron-right'
  | 'message-circle'
  | 'user'
  | 'shield';

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
    case 'chevron-left':
      return (
        <svg {...common} aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...common} aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      );
    case 'message-circle':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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

function formatarDataNotificacao(iso: string): string {
  const data = new Date(iso);
  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();
  if (mesmoDia) return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function DashboardNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';
  const { usuario, token, logout } = useAuth();

  const [escola, setEscola] = useState<Escola | null>(null);
  const [funcoesEscola, setFuncoesEscola] = useState<number[]>([]);
  const [userMenuAberto, setUserMenuAberto] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [notifAberto, setNotifAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregandoNotif, setCarregandoNotif] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const [pendenciasPendentesCount, setPendenciasPendentesCount] = useState(0);

  // Setas de rolagem da nav de módulos — só aparecem quando os itens não
  // cabem na largura disponível (ex. usuário com muitos papéis/módulos
  // visíveis ao mesmo tempo).
  const moduleNavRef = useRef<HTMLElement>(null);
  const [podeRolarNavEsquerda, setPodeRolarNavEsquerda] = useState(false);
  const [podeRolarNavDireita, setPodeRolarNavDireita] = useState(false);

  const atualizarEstadoScrollNav = () => {
    const el = moduleNavRef.current;
    if (!el) return;
    const folga = 4; // margem pra evitar flicker por arredondamento de subpixel
    setPodeRolarNavEsquerda(el.scrollLeft > folga);
    setPodeRolarNavDireita(el.scrollLeft < el.scrollWidth - el.clientWidth - folga);
  };

  useEffect(() => {
    const el = moduleNavRef.current;
    if (!el) return;

    atualizarEstadoScrollNav();

    const observer = new ResizeObserver(() => atualizarEstadoScrollNav());
    observer.observe(el);
    el.addEventListener('scroll', atualizarEstadoScrollNav, { passive: true });

    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', atualizarEstadoScrollNav);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcoesEscola.length, pendenciasPendentesCount]);

  const rolarNavParaEsquerda = () => {
    moduleNavRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  };

  const rolarNavParaDireita = () => {
    const el = moduleNavRef.current;
    if (!el) return;
    el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
  };

  useEffect(() => {
    if (usuario && escolaGUID) {
      void buscarEscola();
      void buscarFuncoesDaEscola();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, escolaGUID]);

  useEffect(() => {
    if (!usuario) return;
    NotificacaoAPI.contarNaoLidas()
      .then(setNaoLidas)
      .catch(() => setNaoLidas(0));
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;
    contarPendencias(escolaGUID)
      .then(setPendenciasPendentesCount)
      .catch(() => setPendenciasPendentesCount(0));
  }, [usuario, escolaGUID]);

  useEffect(() => {
    // Disparado pela tela de configurações (`/configuracoes`) após salvar a
    // "Identidade da Escola". A navbar é montada uma única vez no layout e
    // não remonta entre rotas, então sem isso a marca só atualizaria depois
    // de um refresh manual.
    const aoAtualizarEscola = (evento: Event) => {
      const detalhe = (evento as CustomEvent<{ escolaGUID?: string }>).detail;
      if (detalhe?.escolaGUID && detalhe.escolaGUID === escolaGUID) {
        void buscarEscola();
      }
    };
    window.addEventListener('baua:escola-atualizada', aoAtualizarEscola);
    return () => window.removeEventListener('baua:escola-atualizada', aoAtualizarEscola);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaGUID]);

  useEffect(() => {
    // Disparado pela tela de recebimento de pendência
    // (`/pendencias/[pendenciaGUID]`) após `PATCH .../feito`. Sem isso o item
    // "Minhas Pendências" só sumiria da navbar depois de um refresh manual,
    // já que ela é montada uma única vez no layout e não remonta entre rotas.
    const aoAtualizarPendencia = () => {
      if (!usuario) return;
      contarPendencias(escolaGUID)
        .then(setPendenciasPendentesCount)
        .catch(() => setPendenciasPendentesCount(0));
    };
    window.addEventListener('baua:pendencia-atualizada', aoAtualizarPendencia);
    return () => window.removeEventListener('baua:pendencia-atualizada', aoAtualizarPendencia);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, escolaGUID]);

  useEffect(() => {
    const fecharAoClicarFora = (evento: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(evento.target as Node)) {
        setUserMenuAberto(false);
      }
      if (notifRef.current && !notifRef.current.contains(evento.target as Node)) {
        setNotifAberto(false);
      }
    };
    document.addEventListener('mousedown', fecharAoClicarFora);
    return () => document.removeEventListener('mousedown', fecharAoClicarFora);
  }, []);

  const buscarEscola = async () => {
    try {
      const response = await fetch(`/api/escola/${escolaGUID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logout();
          router.push('/login');
        }
        return;
      }

      const escolaPayload: Escola | undefined = data?.data?.escola ?? data?.data;
      if (!escolaPayload) return;

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
    } catch (err) {
      console.error('Erro ao buscar escola:', err);
    }
  };

  const buscarFuncoesDaEscola = async () => {
    if (!usuario) return;
    try {
      const response = await fetch(`/api/usuario/${usuario.UsuarioCPF}/escolas`, {
        headers: { Authorization: `Bearer ${token}` },
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

  const abrirNotificacoes = async () => {
    const abrindo = !notifAberto;
    setNotifAberto(abrindo);
    if (abrindo) {
      setCarregandoNotif(true);
      try {
        const lista = await NotificacaoAPI.listarNotificacoes({ limit: 5 });
        setNotificacoes(lista);
      } catch (erro) {
        console.error('Erro ao carregar notificações:', erro);
      } finally {
        setCarregandoNotif(false);
      }
    }
  };

  const handleClicarNotificacao = async (notificacao: Notificacao) => {
    if (!notificacao.NotificacaoLida) {
      try {
        await NotificacaoAPI.marcarComoLida(notificacao.NotificacaoGUID);
        setNotificacoes((prev) =>
          prev.map((n) => (n.NotificacaoGUID === notificacao.NotificacaoGUID ? { ...n, NotificacaoLida: true } : n))
        );
        setNaoLidas((prev) => Math.max(0, prev - 1));
      } catch {
        // Falha silenciosa: não impede a navegação
      }
    }
    setNotifAberto(false);
    if (notificacao.NotificacaoLink) {
      router.push(notificacao.NotificacaoLink);
    }
  };

  const handleMarcarTodasComoLidas = async () => {
    try {
      await NotificacaoAPI.marcarTodasComoLidas();
      setNotificacoes((prev) => prev.map((n) => ({ ...n, NotificacaoLida: true })));
      setNaoLidas(0);
    } catch (erro) {
      console.error('Erro ao marcar notificações como lidas:', erro);
    }
  };

  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
      logout();
      router.push('/login');
    }
  };

  const isProfessor = funcoesEscola.includes(3);
  const isAluno = funcoesEscola.includes(5);
  const isCoordenacaoOuDirecao = funcoesEscola.includes(1) || funcoesEscola.includes(6);
  const isCoordSecretariaOuDirecao =
    funcoesEscola.includes(1) || funcoesEscola.includes(2) || funcoesEscola.includes(6);

  const modulosNav: Array<{ key: string; href: string; label: string; icon: IconName }> = [
    { key: 'dashboard', href: `/dashboard/${escolaGUID}`, label: 'Dashboard', icon: 'home' },
    ...(isCoordenacaoOuDirecao
      ? [{ key: 'gestao-dados', href: `/dashboard/${escolaGUID}/gestao-dados`, label: 'Gestão de Dados', icon: 'database' as IconName }]
      : []),
    ...(isCoordSecretariaOuDirecao
      ? [{ key: 'cadastro-evento', href: `/dashboard/${escolaGUID}/cadastro-evento`, label: 'Cadastro de Eventos', icon: 'edit' as IconName }]
      : []),
    ...(isCoordSecretariaOuDirecao
      ? [{ key: 'cadastro-pendencia', href: `/dashboard/${escolaGUID}/cadastro-pendencia`, label: 'Cadastro de Pendências', icon: 'file-text' as IconName }]
      : []),
    ...(isProfessor
      ? [{ key: 'cadastro', href: `/dashboard/${escolaGUID}/cadastro`, label: 'Cadastro', icon: 'edit' as IconName }]
      : []),
    ...(isAluno
      ? [{ key: 'tarefas', href: `/dashboard/${escolaGUID}/tarefas`, label: 'Minhas Tarefas', icon: 'book-open' as IconName }]
      : []),
    ...(pendenciasPendentesCount > 0
      ? [{ key: 'pendencias', href: `/dashboard/${escolaGUID}/pendencias`, label: 'Minhas Pendências', icon: 'bell' as IconName }]
      : []),
    { key: 'calendario', href: `/dashboard/${escolaGUID}/calendario`, label: 'Calendário', icon: 'calendar' },
    { key: 'projetos', href: `/dashboard/${escolaGUID}/projetos`, label: 'Projetos', icon: 'users' },
    { key: 'chat', href: `/dashboard/${escolaGUID}/chat`, label: 'Conversas', icon: 'message-circle' },
    ...(isCoordenacaoOuDirecao
      ? [{ key: 'configuracoes', href: `/dashboard/${escolaGUID}/configuracoes`, label: 'Config. da Escola', icon: 'settings' as IconName }]
      : []),
    ...(isCoordSecretariaOuDirecao
      ? [{ key: 'auditoria', href: `/dashboard/${escolaGUID}/auditoria`, label: 'Auditoria', icon: 'shield' as IconName }]
      : []),
  ];

  const nomeCompleto = `${usuario?.UsuarioNome || ''} ${usuario?.UsuarioSobrenome || ''}`.trim();
  const iniciaisUsuario = obterIniciais(usuario?.UsuarioNome, usuario?.UsuarioSobrenome);

  return (
    <header className={styles.navbar}>
      <div className={styles.navbarInner}>
        <Link href={`/dashboard/${escolaGUID}`} className={styles.brand}>
          {escola?.EscolaIcone ? (
            <img
              src={`data:image/png;base64,${escola.EscolaIcone}`}
              alt={escola.EscolaNome}
              className={styles.brandLogo}
            />
          ) : escola?.EscolaLogo ? (
            <img src={escola.EscolaLogo} alt={escola.EscolaNome} className={styles.brandLogo} />
          ) : (
            <div className={styles.brandLogoFallback}>{escola?.EscolaNome?.charAt(0).toUpperCase()}</div>
          )}
          <div className={styles.brandText}>
            <span className={styles.brandName}>{escola?.EscolaNome}</span>
            <span className={styles.brandPowered}>
              powered by <span className={styles.brandWordmark}>bauá</span>
            </span>
          </div>
        </Link>

        <div className={styles.moduleNavWrap}>
          {podeRolarNavEsquerda && (
            <button
              type="button"
              className={`${styles.moduleNavSeta} ${styles.moduleNavSetaEsquerda}`}
              onClick={rolarNavParaEsquerda}
              aria-label="Rolar módulos para a esquerda"
              tabIndex={-1}
            >
              <Icon name="chevron-left" size={18} />
            </button>
          )}

          <nav
            className={[
              styles.moduleNav,
              podeRolarNavEsquerda ? styles.moduleNavComSetaEsquerda : '',
              podeRolarNavDireita ? styles.moduleNavComSetaDireita : '',
            ].filter(Boolean).join(' ')}
            aria-label="Módulos da escola"
            ref={moduleNavRef}
          >
            {modulosNav.map((modulo) => {
              const ativo = modulo.key === 'dashboard' ? pathname === modulo.href : (pathname || '').startsWith(modulo.href);
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

          {podeRolarNavDireita && (
            <button
              type="button"
              className={`${styles.moduleNavSeta} ${styles.moduleNavSetaDireita}`}
              onClick={rolarNavParaDireita}
              aria-label="Rolar módulos para a direita"
              tabIndex={-1}
            >
              <Icon name="chevron-right" size={18} />
            </button>
          )}
        </div>

        <div className={styles.navActions}>
          <div className={styles.notifWrap} ref={notifRef}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => void abrirNotificacoes()}
              aria-label="Avisos"
              title="Avisos"
              aria-haspopup="true"
              aria-expanded={notifAberto}
            >
              <Icon name="bell" size={19} />
              {naoLidas > 0 && <span className={styles.notifDot} />}
            </button>

            {notifAberto && (
              <div className={styles.notifDropdown}>
                <div className={styles.notifDropdownHeader}>
                  <span>Notificações</span>
                  {naoLidas > 0 && (
                    <button type="button" onClick={() => void handleMarcarTodasComoLidas()}>
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className={styles.notifList}>
                  {carregandoNotif ? (
                    <p className={styles.notifEstadoVazio}>Carregando...</p>
                  ) : notificacoes.length === 0 ? (
                    <p className={styles.notifEstadoVazio}>Nenhuma notificação por aqui.</p>
                  ) : (
                    notificacoes.map((notificacao) => (
                      <button
                        type="button"
                        key={notificacao.NotificacaoGUID}
                        className={
                          notificacao.NotificacaoLida ? styles.notifItem : `${styles.notifItem} ${styles.notifItemNaoLido}`
                        }
                        onClick={() => void handleClicarNotificacao(notificacao)}
                      >
                        {!notificacao.NotificacaoLida && <span className={styles.notifPonto} aria-hidden="true" />}
                        <span className={styles.notifItemConteudo}>
                          <span className={styles.notifItemTitulo}>{notificacao.NotificacaoTitulo}</span>
                          {notificacao.NotificacaoConteudo && (
                            <span className={styles.notifItemTexto}>{notificacao.NotificacaoConteudo}</span>
                          )}
                          <span className={styles.notifItemData}>{formatarDataNotificacao(notificacao.NotificacaoCreatedAt)}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
                <Link
                  href={`/dashboard/${escolaGUID}/notificacoes`}
                  className={styles.notifVerTodas}
                  onClick={() => setNotifAberto(false)}
                >
                  Ver todas
                </Link>
              </div>
            )}
          </div>

          <span className={styles.navDivider} />

          <div className={styles.userMenuWrap} ref={userMenuRef}>
            <button
              type="button"
              className={styles.userTrigger}
              onClick={() => setUserMenuAberto((aberto) => !aberto)}
              aria-haspopup="true"
              aria-expanded={userMenuAberto}
              aria-label="Menu da conta"
            >
              {usuario?.UsuarioFotoUrl ? (
                <img src={usuario.UsuarioFotoUrl} alt="" className={styles.avatarFoto} />
              ) : (
                <span className={styles.avatar}>{iniciaisUsuario}</span>
              )}
              <Icon name="chevron-down" size={16} />
            </button>

            {userMenuAberto && (
              <div className={styles.userDropdown}>
                <div className={styles.userDropdownHeader}>
                  {usuario?.UsuarioFotoUrl ? (
                    <img src={usuario.UsuarioFotoUrl} alt="" className={styles.avatarFoto} />
                  ) : (
                    <span className={styles.avatar}>{iniciaisUsuario}</span>
                  )}
                  <div className={styles.userDropdownInfo}>
                    <span className={styles.userDropdownName}>{nomeCompleto || 'Usuário'}</span>
                    <span className={styles.userDropdownEmail}>{usuario?.UsuarioEmail}</span>
                  </div>
                </div>
                <div className={styles.dropdownDivider} />
                <Link
                  href={`/dashboard/${escolaGUID}/perfil`}
                  className={styles.menuItem}
                  onClick={() => setUserMenuAberto(false)}
                >
                  <Icon name="user" size={17} /> Meu Perfil
                </Link>
                <Link href="/selecionar-escola" className={styles.menuItem} onClick={() => setUserMenuAberto(false)}>
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
  );
}
