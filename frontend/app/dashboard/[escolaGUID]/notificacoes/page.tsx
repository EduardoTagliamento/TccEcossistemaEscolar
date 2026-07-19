'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import * as NotificacaoAPI from '@/lib/api/notificacao.api';
import type { Notificacao } from '@/lib/api/notificacao.api';

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

export default function NotificacoesPage() {
  const params = useParams();
  const router = useRouter();
  const escolaGUID = (params?.escolaGUID as string) || '';

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState<'todas' | 'nao-lidas'>('todas');

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  const carregar = async () => {
    try {
      setCarregando(true);
      setErro('');
      const lista = await NotificacaoAPI.listarNotificacoes(
        filtro === 'nao-lidas' ? { lida: false } : undefined
      );
      setNotificacoes(lista);
    } catch (e: any) {
      setErro(e.message || 'Erro ao carregar notificações');
    } finally {
      setCarregando(false);
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
      await NotificacaoAPI.marcarTodasComoLidas();
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
      </div>

      {erro && <div className={styles.erro}>{erro}</div>}

      {carregando ? (
        <div className={styles.estadoVazio}>Carregando...</div>
      ) : notificacoes.length === 0 ? (
        <div className={styles.estadoVazio}>Nenhuma notificação por aqui.</div>
      ) : (
        <ul className={styles.lista}>
          {notificacoes.map((n) => (
            <li key={n.NotificacaoGUID}>
              <button
                className={n.NotificacaoLida ? styles.item : `${styles.item} ${styles.itemNaoLido}`}
                onClick={() => handleClicarNotificacao(n)}
              >
                {!n.NotificacaoLida && <span className={styles.pontoNaoLido} aria-hidden="true" />}
                <div className={styles.itemConteudo}>
                  <p className={styles.itemTitulo}>{n.NotificacaoTitulo}</p>
                  {n.NotificacaoConteudo && <p className={styles.itemTexto}>{n.NotificacaoConteudo}</p>}
                  <span className={styles.itemData}>{formatarData(n.NotificacaoCreatedAt)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
