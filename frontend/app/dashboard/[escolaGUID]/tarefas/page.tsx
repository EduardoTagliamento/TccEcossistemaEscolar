'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTarefas } from '@/lib/tarefas/useTarefaQueries';
import { TarefaListItem } from '@/types/tarefaacademica';
import { Icon } from '@/components/Icon';
import Loader from '@/components/Loader';
import styles from './page.module.css';

export default function TarefasPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'individual' | 'compartilhada'>('todas');

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
    }
  }, [usuario, authLoading, router]);

  const filters = useMemo(() => {
    if (filtroTipo === 'individual') return { TarefaCompartilhada: false, EscolaGUID: escolaGUID };
    if (filtroTipo === 'compartilhada') return { TarefaCompartilhada: true, EscolaGUID: escolaGUID };
    return { EscolaGUID: escolaGUID };
  }, [filtroTipo, escolaGUID]);

  const { data: tarefasBrutas, isLoading, error } = useTarefas(usuario ? filters : undefined);
  const erro = error instanceof Error ? error.message : null;

  const tarefas: TarefaListItem[] = useMemo(() => {
    if (!tarefasBrutas) return [];

    const agora = new Date();
    const comStatus = tarefasBrutas.map((tarefa) => {
      const prazo = new Date(tarefa.TarefaPrazoData);
      const status: TarefaListItem['Status'] = prazo < agora ? 'Atrasada' : 'Pendente';
      return { ...tarefa, TarefaCompartilhada: Boolean(tarefa.TarefaCompartilhada), Status: status };
    });

    comStatus.sort((a, b) => new Date(a.TarefaPrazoData).getTime() - new Date(b.TarefaPrazoData).getTime());
    return comStatus;
  }, [tarefasBrutas]);

  const totalCount = tarefas.length;
  const aVencerCount = tarefas.filter((t) => t.Status === 'Pendente').length;
  const atrasadaCount = tarefas.filter((t) => t.Status === 'Atrasada').length;
  const compartilhadasCount = tarefas.filter((t) => t.TarefaCompartilhada).length;

  const renderLinhaTarefa = (tarefa: TarefaListItem) => {
    const prazo = new Date(tarefa.TarefaPrazoData);
    const atrasada = tarefa.Status === 'Atrasada';

    return (
      <div
        key={tarefa.TarefaGUID}
        className={`${styles.linhaTarefa} ${atrasada ? styles.linhaAtrasada : styles.linhaPendente}`}
      >
        <div className={styles.linhaInfo}>
          <div className={styles.linhaTituloRow}>
            <h3 className={styles.linhaTitulo}>{tarefa.TarefaTitulo}</h3>
            <span className={`${styles.badgeStatus} ${atrasada ? styles.badgeAtrasada : styles.badgeAVencer}`}>
              {atrasada ? 'Atrasada' : 'A vencer'}
            </span>
            {tarefa.TarefaCompartilhada && (
              <span className={styles.badgeGrupo}>
                <Icon name="users" size={12} /> Em grupo
              </span>
            )}
          </div>
          <p className={styles.linhaMateria}>
            {tarefa.MateriaNome || 'Sem matéria'}{tarefa.TurmaNome ? ` · ${tarefa.TurmaNome}` : ''}
          </p>
        </div>
        <div className={styles.linhaAcao}>
          <span className={styles.linhaPrazo}>
            <span className={styles.prazoLabel}>Prazo</span>
            <span className={styles.prazoData}>{prazo.toLocaleDateString('pt-BR')} {prazo.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
          <Link href={`/dashboard/${escolaGUID}/tarefas/${tarefa.TarefaGUID}`} className={styles.botaoAbrir}>
            {tarefa.TarefaCompartilhada ? 'Ver grupos' : 'Abrir'}
          </Link>
        </div>
      </div>
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '3rem 0' }}>
          <Loader />
          <p className={styles.loading}>Carregando tarefas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.titulo}>
            <span className={styles.tituloIcone}><Icon name="list" size={20} /></span> Minhas Tarefas
          </h1>
          <p className={styles.subtitulo}>Acompanhe suas entregas e prazos</p>
        </div>
        <Link href={`/dashboard/${escolaGUID}/cadastro?aba=tarefa`} className={styles.botaoNovo}>
          <Icon name="plus" size={16} /> Novo cadastro
        </Link>
      </header>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={`${styles.statIcone} ${styles.statIconeTotal}`}><Icon name="book-open" size={18} /></span>
          <div>
            <p className={styles.statNumero}>{totalCount}</p>
            <p className={styles.statLabel}>Total</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statIcone} ${styles.statIconeAVencer}`}><Icon name="clock" size={18} /></span>
          <div>
            <p className={styles.statNumero}>{aVencerCount}</p>
            <p className={styles.statLabel}>A vencer</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statIcone} ${styles.statIconeGrupo}`}><Icon name="users" size={18} /></span>
          <div>
            <p className={styles.statNumero}>{compartilhadasCount}</p>
            <p className={styles.statLabel}>Em grupo</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statIcone} ${styles.statIconeAtrasada}`}><Icon name="alert-triangle" size={18} /></span>
          <div>
            <p className={styles.statNumero}>{atrasadaCount}</p>
            <p className={styles.statLabel}>Atrasada</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtros}>
        <button
          className={filtroTipo === 'todas' ? styles.filtroAtivo : styles.filtro}
          onClick={() => setFiltroTipo('todas')}
        >
          Todas
        </button>
        <button
          className={filtroTipo === 'individual' ? styles.filtroAtivo : styles.filtro}
          onClick={() => setFiltroTipo('individual')}
        >
          Individuais
        </button>
        <button
          className={filtroTipo === 'compartilhada' ? styles.filtroAtivo : styles.filtro}
          onClick={() => setFiltroTipo('compartilhada')}
        >
          Compartilhadas
        </button>
      </div>

      {erro && <p className={styles.error}>{erro}</p>}

      {tarefas.length === 0 ? (
        <div className={styles.empty}>
          <p><Icon name="check-circle" size={20} color="var(--green-500)" /> Você não tem tarefas pendentes!</p>
        </div>
      ) : (
        <div className={styles.listaTarefas}>
          {tarefas.map(renderLinhaTarefa)}
        </div>
      )}
    </div>
  );
}
