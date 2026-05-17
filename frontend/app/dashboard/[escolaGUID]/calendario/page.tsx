'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './page.module.css';

interface AvisoCalendario {
  TipoAviso: 'tarefa' | 'prova';
  AvisoId: string;
  DataPrazo: string;
  Titulo: string;
  Descricao: string | null;
  StatusTexto: string;
  TipoEntrega: 'digital' | 'fisica' | null;
}

export default function CalendarioAlunoPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, token, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  const [mesSelecionado, setMesSelecionado] = useState(() => new Date().toISOString().slice(0, 7));
  const [avisos, setAvisos] = useState<AvisoCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }
    if (usuario && escolaGUID) {
      void carregarCalendario();
    }
  }, [usuario, authLoading, escolaGUID, mesSelecionado]);

  const carregarCalendario = async () => {
    setLoading(true);
    setErro(null);

    try {
      const [ano, mes] = mesSelecionado.split('-').map(Number);
      const inicio = new Date(ano, mes - 1, 1);
      const fim = new Date(ano, mes, 0, 23, 59, 59);

      const paramsUrl = new URLSearchParams({
        EscolaGUID: escolaGUID,
        DataInicio: inicio.toISOString(),
        DataFim: fim.toISOString(),
      });

      const response = await fetch(`/api/calendario?${paramsUrl.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Erro ao carregar calendário');
      setAvisos(data?.data?.avisos || []);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar calendário');
    } finally {
      setLoading(false);
    }
  };

  const avisosPorDia = useMemo(() => {
    const agrupado = new Map<string, AvisoCalendario[]>();
    for (const aviso of avisos) {
      const chave = new Date(aviso.DataPrazo).toLocaleDateString('pt-BR');
      if (!agrupado.has(chave)) agrupado.set(chave, []);
      agrupado.get(chave)!.push(aviso);
    }
    return Array.from(agrupado.entries()).sort((a, b) => {
      const [diaA, mesA, anoA] = a[0].split('/').map(Number);
      const [diaB, mesB, anoB] = b[0].split('/').map(Number);
      return new Date(anoA, mesA - 1, diaA).getTime() - new Date(anoB, mesB - 1, diaB).getTime();
    });
  }, [avisos]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Calendário de Avisos</h1>
        <Link href={`/dashboard/${escolaGUID}`} className={styles.backLink}>Voltar ao Dashboard</Link>
      </header>

      <section className={styles.filters}>
        <label>
          Mês
          <input type="month" value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)} />
        </label>
      </section>

      {erro && <p className={styles.error}>{erro}</p>}

      <section className={styles.calendarCard}>
        {loading ? (
          <p>Carregando avisos...</p>
        ) : avisosPorDia.length === 0 ? (
          <p>Nenhum aviso registrado neste período.</p>
        ) : (
          <div className={styles.dayList}>
            {avisosPorDia.map(([dia, eventos]) => (
              <div key={dia} className={styles.dayCard}>
                <h2>{dia}</h2>
                <ul>
                  {eventos.map((evento) => (
                    <li key={evento.AvisoId} className={styles.eventItem}>
                      <span className={`${styles.badge} ${evento.TipoAviso === 'tarefa' ? styles.tarefa : styles.prova}`}>
                        {evento.TipoAviso.toUpperCase()}
                      </span>
                      <div>
                        <strong>{evento.Titulo}</strong>
                        {evento.Descricao && <p>{evento.Descricao}</p>}
                        <small>{new Date(evento.DataPrazo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {evento.StatusTexto}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
