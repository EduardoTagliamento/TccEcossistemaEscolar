'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import * as NotificacaoAPI from '@/lib/api/notificacao.api';
import type { Notificacao } from '@/lib/api/notificacao.api';

const TAMANHO_PAGINA = 30;

function formatarData(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Ícone do badge por tipo de notificação (prova/evento/mensagem ganham glifo próprio;
 *  o resto cai no padrão por categoria — Aviso = sino, Lembrete = relógio) — mesmos
 *  glifos Feather usados no resto do app (ver Icon() em DashboardNavbar.tsx). */
function IconePorTipo({ categoria, slug }: { categoria?: 'Aviso' | 'Lembrete'; slug?: string }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (slug?.startsWith('prova')) {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    );
  }
  if (slug?.startsWith('evento')) {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }
  if (slug?.includes('mensagem')) {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    );
  }
  if (categoria === 'Lembrete') {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function NotificacoesPage() {
  const params = useParams();
  const router = useRouter();
  const escolaGUID = (params?.escolaGUID as string) || '';

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [categoriaPorTipo, setCategoriaPorTipo] = useState<Map<number, 'Aviso' | 'Lembrete'>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [temMais, setTemMais] = useState(false);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState<'todas' | 'nao-lidas'>('todas');
  const [verTodasEscolas, setVerTodasEscolas] = useState(false);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro, verTodasEscolas]);

  useEffect(() => {
    NotificacaoAPI.listarTipos()
      .then((tipos) => setCategoriaPorTipo(new Map(tipos.map((t) => [t.NotificacaoTipoId, t.NotificacaoTipoCategoria]))))
      .catch(() => {});
  }, []);

  const carregar = async () => {
    try {
      setCarregando(true);
      setErro('');
      const lista = await NotificacaoAPI.listarNotificacoes({
        ...(filtro === 'nao-lidas' ? { lida: false } : {}),
        ...(verTodasEscolas ? {} : { EscolaGUID: escolaGUID }),
        limit: TAMANHO_PAGINA,
        offset: 0,
      });
      setNotificacoes(lista);
      setTemMais(lista.length === TAMANHO_PAGINA);
    } catch (e: any) {
      setErro(e.message || 'Erro ao carregar notificações');
    } finally {
      setCarregando(false);
    }
  };

  const carregarMais = async () => {
    try {
      setCarregandoMais(true);
      const proximas = await NotificacaoAPI.listarNotificacoes({
        ...(filtro === 'nao-lidas' ? { lida: false } : {}),
        ...(verTodasEscolas ? {} : { EscolaGUID: escolaGUID }),
        limit: TAMANHO_PAGINA,
        offset: notificacoes.length,
      });
      setNotificacoes((prev) => [...prev, ...proximas]);
      setTemMais(proximas.length === TAMANHO_PAGINA);
    } catch (e: any) {
      setErro(e.message || 'Erro ao carregar mais notificações');
    } finally {
      setCarregandoMais(false);
    }
  };

  const handleClicarNotificacao = async (notificacao: Notificacao) => {
    if (!notificacao.NotificacaoLida) {
      try {
        await NotificacaoAPI.marcarComoLida(notificacao.NotificacaoGUID);
        setNotificacoes((prev) =>
          prev.map((n) =>
            n.NotificacaoGUID === notificacao.NotificacaoGUID ? { ...n, NotificacaoLida: true } : n
          )
        );
      } catch {
        // Falha silenciosa: não impede a navegação
      }
    }

    if (notificacao.NotificacaoLink) {
      router.push(notificacao.NotificacaoLink);
    }
  };

  const handleMarcarTodasComoLidas = async () => {
    try {
      await NotificacaoAPI.marcarTodasComoLidas(verTodasEscolas ? undefined : escolaGUID);
      setNotificacoes((prev) => prev.map((n) => ({ ...n, NotificacaoLida: true })));
    } catch (e: any) {
      setErro(e.message || 'Erro ao marcar notificações como lidas');
    }
  };

  const naoLidas = notificacoes.filter((n) => !n.NotificacaoLida).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>Notificações</h1>
          <p className={styles.subtitulo}>
            {naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? 's' : ''}` : 'Tudo em dia'}
          </p>
        </div>
        <div className={styles.acoes}>
          <Link href={`/dashboard/${escolaGUID}/notificacoes/configuracoes`} className={styles.botaoSecundario}>
            Preferências
          </Link>
          <button className={styles.botaoSecundario} onClick={handleMarcarTodasComoLidas} disabled={naoLidas === 0}>
            Marcar todas como lidas
          </button>
        </div>
      </div>

      <div className={styles.filtros}>
        <button
          className={filtro === 'todas' ? styles.filtroAtivo : styles.filtro}
          onClick={() => setFiltro('todas')}
        >
          Todas
        </button>
        <button
          className={filtro === 'nao-lidas' ? styles.filtroAtivo : styles.filtro}
          onClick={() => setFiltro('nao-lidas')}
        >
          Não lidas
        </button>
        <span style={{ flex: 1 }} />
        <button
          className={verTodasEscolas ? styles.filtroAtivo : styles.filtro}
          onClick={() => setVerTodasEscolas((v) => !v)}
          title={verTodasEscolas ? 'Mostrando notificações de todas as suas escolas' : 'Mostrando só as notificações desta escola'}
        >
          {verTodasEscolas ? 'Todas as escolas' : 'Só esta escola'}
        </button>
      </div>

      {erro && <div className={styles.erro}>{erro}</div>}

      {carregando ? (
        <div className={styles.estadoVazio}>Carregando...</div>
      ) : notificacoes.length === 0 ? (
        <div className={styles.estadoVazio}>Nenhuma notificação por aqui.</div>
      ) : (
        <ul className={styles.lista}>
          {notificacoes.map((n) => {
            const categoria = categoriaPorTipo.get(n.NotificacaoTipoId);
            return (
              <li key={n.NotificacaoGUID}>
                <button
                  className={n.NotificacaoLida ? styles.item : `${styles.item} ${styles.itemNaoLido}`}
                  onClick={() => handleClicarNotificacao(n)}
                >
                  <span className={categoria === 'Lembrete' ? `${styles.itemIcone} ${styles.itemIconeLembrete}` : styles.itemIcone}>
                    <IconePorCategoria categoria={categoria} />
                  </span>
                  <div className={styles.itemConteudo}>
                    <span className={styles.itemTituloRow}>
                      <span className={styles.itemTitulo}>{n.NotificacaoTitulo}</span>
                      {!n.NotificacaoLida && <span className={styles.pontoNaoLido} aria-hidden="true" />}
                    </span>
                    {n.NotificacaoConteudo && <p className={styles.itemTexto}>{n.NotificacaoConteudo}</p>}
                    <span className={styles.itemData}>{formatarData(n.NotificacaoCreatedAt)}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!carregando && temMais && (
        <div className={styles.carregarMaisArea}>
          <button className={styles.botaoSecundario} onClick={carregarMais} disabled={carregandoMais}>
            {carregandoMais ? 'Carregando...' : 'Carregar mais'}
          </button>
        </div>
      )}
    </div>
  );
}
