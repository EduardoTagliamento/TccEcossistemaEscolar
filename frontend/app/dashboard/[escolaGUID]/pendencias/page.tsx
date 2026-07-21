'use client';

/**
 * "Minhas Pendências" — lista as pendências do usuário autenticado nesta
 * escola (feitas e pendentes, para histórico/contexto — sem filtrar só as
 * em aberto aqui). Estrutura extraída de
 * `frontend/app/dashboard/[escolaGUID]/tarefas/page.tsx`.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Pendencia, listarPendencias } from '@/lib/api/pendencia.api';
import styles from './page.module.css';

export default function PendenciasPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }
    if (usuario && escolaGUID) {
      void carregarPendencias();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, authLoading, escolaGUID]);

  const carregarPendencias = async () => {
    setLoading(true);
    setErro(null);
    try {
      const resultado = await listarPendencias({ EscolaGUID: escolaGUID });
      const ordenadas = [...resultado.pendencias].sort(
        (a, b) => new Date(a.PendenciaPrazoData).getTime() - new Date(b.PendenciaPrazoData).getTime()
      );
      setPendencias(ordenadas);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar pendências');
    } finally {
      setLoading(false);
    }
  };

  const obterStatus = (pendencia: Pendencia): { texto: string; badge: string; card: string } => {
    if (pendencia.PendenciaFeito) {
      return { texto: 'Feito', badge: styles.badgeFeito, card: styles.cardFeito };
    }
    const atrasada = new Date(pendencia.PendenciaPrazoData) < new Date();
    if (atrasada) {
      return { texto: 'Atrasada', badge: styles.badgeAtrasada, card: styles.cardAtrasada };
    }
    return { texto: 'Pendente', badge: styles.badgePendente, card: styles.cardPendente };
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Carregando pendências...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.titulo}>Minhas Pendências</h1>
        <p className={styles.subtitulo}>Lembretes e avisos direcionados a você por esta escola.</p>
      </header>

      {erro && <p className={styles.erro}>{erro}</p>}

      {pendencias.length === 0 ? (
        <p className={styles.info}>Você não tem pendências por aqui.</p>
      ) : (
        <div className={styles.grid}>
          {pendencias.map((pendencia) => {
            const status = obterStatus(pendencia);
            return (
              <Link
                key={pendencia.PendenciaGUID}
                href={`/dashboard/${escolaGUID}/pendencias/${pendencia.PendenciaGUID}`}
                className={`${styles.card} ${status.card}`}
              >
                <div className={styles.cardTituloLinha}>
                  <h2 className={styles.cardTitulo}>{pendencia.PendenciaTitulo}</h2>
                  <span className={`${styles.badge} ${status.badge}`}>{status.texto}</span>
                </div>
                {pendencia.PendenciaConteudo && (
                  <p className={styles.cardConteudo}>
                    {pendencia.PendenciaConteudo.substring(0, 140)}
                    {pendencia.PendenciaConteudo.length > 140 ? '...' : ''}
                  </p>
                )}
                <p className={styles.cardPrazo}>
                  Prazo: {new Date(pendencia.PendenciaPrazoData).toLocaleString('pt-BR')}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
