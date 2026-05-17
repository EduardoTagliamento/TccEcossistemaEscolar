'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './page.module.css';

interface AvisoCalendario {
  TipoAviso: 'tarefa' | 'prova' | 'evento';
  AvisoId: string;
  DataPrazo: string;
  Titulo: string;
  Descricao: string | null;
  StatusTexto: string;
  TipoEntrega: 'digital' | 'fisica' | null;
}

interface DiaCalendario {
  data: Date;
  diaDoMes: number;
  ehMesAtual: boolean;
  ehHoje: boolean;
  avisos: AvisoCalendario[];
}

export default function CalendarioAlunoPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, token, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  const [dataAtual, setDataAtual] = useState(() => new Date());
  const [avisos, setAvisos] = useState<AvisoCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<DiaCalendario | null>(null);
  const [indiceDiaModal, setIndiceDiaModal] = useState(0);

  const mesSelecionado = useMemo(() => {
    return `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;
  }, [dataAtual]);

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

  const diasDoCalendario = useMemo(() => {
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const diaSemanaInicio = primeiroDia.getDay();
    const diasNoMes = ultimoDia.getDate();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dias: DiaCalendario[] = [];

    // Dias do mês anterior
    const mesAnterior = new Date(ano, mes, 0);
    const diasMesAnterior = mesAnterior.getDate();
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const dia = diasMesAnterior - i;
      const data = new Date(ano, mes - 1, dia);
      dias.push({
        data,
        diaDoMes: dia,
        ehMesAtual: false,
        ehHoje: false,
        avisos: []
      });
    }

    // Dias do mês atual
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const data = new Date(ano, mes, dia);
      const dataStr = data.toISOString().split('T')[0];
      const avisosNoDia = avisos.filter(aviso => {
        const avisoData = new Date(aviso.DataPrazo);
        return avisoData.toISOString().split('T')[0] === dataStr;
      });

      const dataComparacao = new Date(data);
      dataComparacao.setHours(0, 0, 0, 0);

      dias.push({
        data,
        diaDoMes: dia,
        ehMesAtual: true,
        ehHoje: dataComparacao.getTime() === hoje.getTime(),
        avisos: avisosNoDia
      });
    }

    // Dias do próximo mês
    const diasRestantes = 42 - dias.length; // 6 semanas x 7 dias
    for (let dia = 1; dia <= diasRestantes; dia++) {
      const data = new Date(ano, mes + 1, dia);
      dias.push({
        data,
        diaDoMes: dia,
        ehMesAtual: false,
        ehHoje: false,
        avisos: []
      });
    }

    return dias;
  }, [dataAtual, avisos]);

  const diasComAvisos = useMemo(() => {
    return diasDoCalendario.filter(dia => dia.ehMesAtual && dia.avisos.length > 0);
  }, [diasDoCalendario]);

  const diasDoMesAtual = useMemo(() => {
    return diasDoCalendario.filter(dia => dia.ehMesAtual);
  }, [diasDoCalendario]);

  const mudarMes = (direcao: number) => {
    setDataAtual(prev => {
      const nova = new Date(prev);
      nova.setMonth(nova.getMonth() + direcao);
      return nova;
    });
  };

  const abrirModal = (dia: DiaCalendario) => {
    setDiaSelecionado(dia);
    const indice = diasDoMesAtual.findIndex(d => d.data.getTime() === dia.data.getTime());
    setIndiceDiaModal(indice);
    setModalAberto(true);
  };

  const navegarDiaModal = (direcao: number) => {
    const novoIndice = indiceDiaModal + direcao;
    if (novoIndice >= 0 && novoIndice < diasDoMesAtual.length) {
      setIndiceDiaModal(novoIndice);
      setDiaSelecionado(diasDoMesAtual[novoIndice]);
    }
  };

  const fecharModal = () => {
    setModalAberto(false);
    setDiaSelecionado(null);
  };

  const obterCorTipo = (tipo: string) => {
    switch (tipo) {
      case 'tarefa': return '#4CAF50';
      case 'prova': return '#FF5722';
      case 'evento': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Calendário de Avisos</h1>
        <Link href={`/dashboard/${escolaGUID}`} className={styles.backLink}>Voltar ao Dashboard</Link>
      </header>

      <section className={styles.calendarControls}>
        <button onClick={() => mudarMes(-1)} className={styles.navButton}>
          ← Mês Anterior
        </button>
        <h2 className={styles.mesAno}>
          {dataAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
        </h2>
        <button onClick={() => mudarMes(1)} className={styles.navButton}>
          Próximo Mês →
        </button>
      </section>

      {erro && <p className={styles.error}>{erro}</p>}

      <section className={styles.calendarGrid}>
        {loading ? (
          <p className={styles.loading}>Carregando calendário...</p>
        ) : (
          <>
            <div className={styles.weekDays}>
              <div>Dom</div>
              <div>Seg</div>
              <div>Ter</div>
              <div>Qua</div>
              <div>Qui</div>
              <div>Sex</div>
              <div>Sáb</div>
            </div>
            <div className={styles.daysGrid}>
              {diasDoCalendario.map((dia, index) => (
                <div
                  key={index}
                  className={`${styles.dayCell} ${
                    !dia.ehMesAtual ? styles.outroMes : ''
                  } ${dia.ehHoje ? styles.hoje : ''} ${
                    dia.avisos.length > 0 ? styles.temAvisos : ''
                  }`}
                  onClick={() => abrirModal(dia)}
                >
                  <div className={styles.diaNumero}>{dia.diaDoMes}</div>
                  {dia.avisos.length > 0 && (
                    <div className={styles.avisosContainer}>
                      {dia.avisos.slice(0, 3).map((aviso, idx) => (
                        <div
                          key={aviso.AvisoId}
                          className={styles.avisoFita}
                          style={{ backgroundColor: obterCorTipo(aviso.TipoAviso) }}
                          title={aviso.Titulo}
                        >
                          <span className={styles.avisoTitulo}>{aviso.Titulo}</span>
                        </div>
                      ))}
                      {dia.avisos.length > 3 && (
                        <div className={styles.maisAvisos}>+{dia.avisos.length - 3}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <div className={styles.legenda}>
        <div className={styles.legendaItem}>
          <div className={styles.legendaCor} style={{ backgroundColor: '#4CAF50' }}></div>
          <span>Tarefa</span>
        </div>
        <div className={styles.legendaItem}>
          <div className={styles.legendaCor} style={{ backgroundColor: '#FF5722' }}></div>
          <span>Prova</span>
        </div>
        <div className={styles.legendaItem}>
          <div className={styles.legendaCor} style={{ backgroundColor: '#2196F3' }}></div>
          <span>Evento</span>
        </div>
      </div>

      {modalAberto && diaSelecionado && (
        <div className={styles.modalOverlay} onClick={fecharModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <button
                onClick={() => navegarDiaModal(-1)}
                disabled={indiceDiaModal === 0}
                className={styles.modalNavButton}
              >
                ←
              </button>
              <h2>
                {diaSelecionado.data.toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </h2>
              <button
                onClick={() => navegarDiaModal(1)}
                disabled={indiceDiaModal === diasDoMesAtual.length - 1}
                className={styles.modalNavButton}
              >
                →
              </button>
            </div>
            <button onClick={fecharModal} className={styles.modalClose}>✕</button>
            <div className={styles.modalBody}>
              {diaSelecionado.avisos.length === 0 ? (
                <div className={styles.semAvisos}>
                  <p>📅 Nenhum aviso agendado para este dia.</p>
                </div>
              ) : (
                diaSelecionado.avisos.map((aviso) => (
                  <div key={aviso.AvisoId} className={styles.avisoDetalhes}>
                  <div className={styles.avisoHeader}>
                    <span
                      className={styles.avisoBadge}
                      style={{ backgroundColor: obterCorTipo(aviso.TipoAviso) }}
                    >
                      {aviso.TipoAviso.toUpperCase()}
                    </span>
                    <span className={styles.avisoHora}>
                      {new Date(aviso.DataPrazo).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <h3>{aviso.Titulo}</h3>
                  {aviso.Descricao && (
                    <p className={styles.avisoDescricao}>{aviso.Descricao}</p>
                  )}
                  <div className={styles.avisoFooter}>
                    <span className={styles.avisoStatus}>{aviso.StatusTexto}</span>
                    {aviso.TipoEntrega && (
                      <span className={styles.avisoEntrega}>
                        Entrega: {aviso.TipoEntrega === 'digital' ? 'Digital' : 'Física'}
                      </span>
                    )}
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
