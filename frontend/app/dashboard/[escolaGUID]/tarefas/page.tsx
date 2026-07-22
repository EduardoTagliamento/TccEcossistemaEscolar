'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { listarTarefas } from '@/lib/api/tarefaacademica.api';
import { TarefaListItem } from '@/types/tarefaacademica';
import { Icon } from '@/components/Icon';
import styles from './page.module.css';

export default function TarefasPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, token, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  const [tarefas, setTarefas] = useState<TarefaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'individual' | 'compartilhada'>('todas');

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }
    if (usuario) {
      void carregarTarefas();
    }
  }, [usuario, authLoading, filtroTipo]);

  const carregarTarefas = async () => {
    setLoading(true);
    setErro(null);
    try {
      const filters: any = {};
      
      if (filtroTipo === 'individual') {
        filters.TarefaCompartilhada = false;
      } else if (filtroTipo === 'compartilhada') {
        filters.TarefaCompartilhada = true;
      }

      const dados = await listarTarefas(filters);
      
      // DEBUG: Verificar dados recebidos
      console.log('🔍 DEBUG Frontend - Tarefas recebidas:', dados.map(t => ({
        TarefaGUID: t.TarefaGUID,
        TarefaTitulo: t.TarefaTitulo,
        TarefaCompartilhada: t.TarefaCompartilhada,
        tipo: typeof t.TarefaCompartilhada
      })));
      
      // Calcular status de cada tarefa
      const tarefasComStatus = dados.map((tarefa) => {
        const prazo = new Date(tarefa.TarefaPrazoData);
        const agora = new Date();
        
        let status: TarefaListItem['Status'];
        if (prazo < agora) {
          status = 'Atrasada';
        } else {
          status = 'Pendente';
        }
        
        // Garantir que TarefaCompartilhada seja tratado como boolean
        return { 
          ...tarefa, 
          TarefaCompartilhada: Boolean(tarefa.TarefaCompartilhada),
          Status: status 
        };
      });

      // Ordenar por prazo (mais próximo primeiro)
      tarefasComStatus.sort((a, b) => 
        new Date(a.TarefaPrazoData).getTime() - new Date(b.TarefaPrazoData).getTime()
      );

      setTarefas(tarefasComStatus);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  // Agrupar tarefas por período
  const agruparTarefasPorPeriodo = () => {
    const agora = new Date();
    const amanha = new Date(agora);
    amanha.setDate(amanha.getDate() + 1);
    amanha.setHours(23, 59, 59, 999);

    const fimSemana = new Date(agora);
    fimSemana.setDate(fimSemana.getDate() + (7 - fimSemana.getDay()));
    fimSemana.setHours(23, 59, 59, 999);

    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
    fimMes.setHours(23, 59, 59, 999);

    const fimProximoMes = new Date(agora.getFullYear(), agora.getMonth() + 2, 0);
    fimProximoMes.setHours(23, 59, 59, 999);

    return {
      atrasadas: tarefas.filter(t => t.Status === 'Atrasada'),
      amanha: tarefas.filter(t => {
        const prazo = new Date(t.TarefaPrazoData);
        return t.Status !== 'Atrasada' && prazo <= amanha;
      }),
      estaSemana: tarefas.filter(t => {
        const prazo = new Date(t.TarefaPrazoData);
        return t.Status !== 'Atrasada' && prazo > amanha && prazo <= fimSemana;
      }),
      esteMes: tarefas.filter(t => {
        const prazo = new Date(t.TarefaPrazoData);
        return t.Status !== 'Atrasada' && prazo > fimSemana && prazo <= fimMes;
      }),
      proximoMes: tarefas.filter(t => {
        const prazo = new Date(t.TarefaPrazoData);
        return t.Status !== 'Atrasada' && prazo > fimMes && prazo <= fimProximoMes;
      }),
      futuro: tarefas.filter(t => {
        const prazo = new Date(t.TarefaPrazoData);
        return t.Status !== 'Atrasada' && prazo > fimProximoMes;
      })
    };
  };

  const grupos = agruparTarefasPorPeriodo();

  const renderTarefaCard = (tarefa: TarefaListItem) => {
    const prazo = new Date(tarefa.TarefaPrazoData);
    const statusClass = tarefa.Status === 'Atrasada' ? styles.cardAtrasada : styles.cardPendente;

    return (
      <Link 
        key={tarefa.TarefaGUID} 
        href={`/dashboard/${escolaGUID}/tarefas/${tarefa.TarefaGUID}`}
        className={`${styles.tarefaCard} ${statusClass}`}
      >
        <div className={styles.cardHeader}>
          <div className={styles.materiaIcone}>
            {tarefa.MateriaNome?.charAt(0) || 'T'}
          </div>
          <div className={styles.cardInfo}>
            <h3>{tarefa.TarefaTitulo}</h3>
            <p className={styles.materia}>{tarefa.MateriaNome || 'Sem matéria'}</p>
          </div>
          {tarefa.TarefaCompartilhada && (
            <span className={styles.badgeCompartilhada}>
              <Icon name="users" size={14} color="#FFFFFF" /> Compartilhada
            </span>
          )}
        </div>

        <div className={styles.cardBody}>
          {tarefa.TarefaConteudo && (
            <p className={styles.conteudo}>
              {tarefa.TarefaConteudo.substring(0, 150)}
              {tarefa.TarefaConteudo.length > 150 ? '...' : ''}
            </p>
          )}
        </div>

        <div className={styles.cardFooter}>
          <span className={styles.prazo}>
            <Icon name="calendar" size={14} /> {prazo.toLocaleDateString('pt-BR')} às {prazo.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className={`${styles.statusBadge} ${styles[`status${tarefa.Status}`]}`}>
            {tarefa.Status}
          </span>
        </div>
      </Link>
    );
  };

  const renderGrupo = (titulo: ReactNode, tarefas: TarefaListItem[]) => {
    if (tarefas.length === 0) return null;

    return (
      <section className={styles.grupoTarefas}>
        <h2 className={styles.grupoTitulo}>
          {titulo} <span className={styles.contador}>({tarefas.length})</span>
        </h2>
        <div className={styles.tarefasGrid}>
          {tarefas.map(renderTarefaCard)}
        </div>
      </section>
    );
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Carregando tarefas...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1><Icon name="book-open" size={24} /> Minhas Tarefas</h1>
      </header>

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
        <>
          {renderGrupo(<><Icon name="alert-triangle" size={20} color="var(--danger-500)" /> Atrasadas</>, grupos.atrasadas)}
          {renderGrupo(<><Icon name="clock" size={20} /> Amanhã</>, grupos.amanha)}
          {renderGrupo(<><Icon name="calendar" size={20} /> Esta Semana</>, grupos.estaSemana)}
          {renderGrupo(<><Icon name="calendar" size={20} /> Este Mês</>, grupos.esteMes)}
          {renderGrupo(<><Icon name="calendar" size={20} /> Próximo Mês</>, grupos.proximoMes)}
          {renderGrupo(<><Icon name="layers" size={20} /> Futuro</>, grupos.futuro)}
        </>
      )}
    </div>
  );
}
