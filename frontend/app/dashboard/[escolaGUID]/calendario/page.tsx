'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { usuarioForaDoBrasil } from '@/lib/timezone-utils';
import { converterParaBrasil, converterDoBrasil } from '@/lib/timezone-utils';
import { Anotacao } from '@/types/anotacao';
import {
  criarAnotacao,
  listarAnotacoesPorPeriodo,
  toggleAnotacaoFeito,
  excluirAnotacao,
  atualizarAnotacao
} from '@/lib/api/anotacao.api';
import { Evento, listarEventos } from '@/lib/api/evento.api';
import { Icon } from './icons';
import styles from './page.module.css';

interface AvisoCalendario {
  TipoAviso: 'tarefa' | 'prova' | 'evento' | 'anotacao';
  AvisoId: string;
  MatriculaGUID?: string | null;
  DataPrazo: string;
  Titulo: string;
  Descricao: string | null;
  StatusBoolean?: boolean | null;
  StatusTexto: string;
  TipoEntrega: 'digital' | 'fisica' | null;
  IsFeito?: boolean;
}

interface DiaCalendario {
  data: Date;
  diaDoMes: number;
  ehMesAtual: boolean;
  ehHoje: boolean;
  ehPassado: boolean;
  avisos: AvisoCalendario[];
}

export default function CalendarioAlunoPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, token, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  // Calculado só no cliente (useEffect) — chamar usuarioForaDoBrasil() direto
  // no corpo do render causa mismatch de hidratação: o timezone do servidor
  // (SSR) quase nunca bate com o do navegador do usuário.
  const [mostrarAvisoTimezone, setMostrarAvisoTimezone] = useState(false);
  useEffect(() => {
    setMostrarAvisoTimezone(usuarioForaDoBrasil());
  }, []);

  const [dataAtual, setDataAtual] = useState(() => new Date());
  const [avisos, setAvisos] = useState<AvisoCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<DiaCalendario | null>(null);
  const [indiceDiaModal, setIndiceDiaModal] = useState(0);
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [mostrarAnotacoes, setMostrarAnotacoes] = useState(true);
  const [modoEdicaoAnotacao, setModoEdicaoAnotacao] = useState<string | null>(null);
  const [modalCriarAnotacaoAberto, setModalCriarAnotacaoAberto] = useState(false);
  const [formNovaAnotacao, setFormNovaAnotacao] = useState({ titulo: '', descricao: '' });
  const [formEdicaoAnotacao, setFormEdicaoAnotacao] = useState({ titulo: '', descricao: '' });
  const [avisosExpandidos, setAvisosExpandidos] = useState<Record<string, boolean>>({});

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

      // Buscar anotações do período
      try {
        const anotacoesData = await listarAnotacoesPorPeriodo(
          escolaGUID,
          inicio.toISOString().split('T')[0],
          fim.toISOString().split('T')[0]
        );
        setAnotacoes(anotacoesData);
      } catch (err) {
        console.error('Erro ao carregar anotações:', err);
      }

      // Buscar eventos do período (avisos amplos da escola, sempre exibidos —
      // não é gated pelo toggle "Mostrar Anotações")
      try {
        const eventosData = await listarEventos({
          EscolaGUID: escolaGUID,
          dataInicio: inicio.toISOString(),
          dataFim: fim.toISOString(),
        });
        setEventos(eventosData.eventos);
      } catch (err) {
        console.error('Erro ao carregar eventos:', err);
      }
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
      const dataComparacao = new Date(data);
      dataComparacao.setHours(0, 0, 0, 0);

      dias.push({
        data,
        diaDoMes: dia,
        ehMesAtual: false,
        ehHoje: false,
        ehPassado: dataComparacao.getTime() < hoje.getTime(),
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

      // Adicionar anotações se toggle estiver ativado
      if (mostrarAnotacoes) {
        const anotacoesNoDia = anotacoes.filter(anotacao => {
          const dataAnotacao = new Date(anotacao.AnotacaoData);
          return dataAnotacao.toISOString().split('T')[0] === dataStr;
        });

        anotacoesNoDia.forEach(anotacao => {
          avisosNoDia.push({
            AvisoId: anotacao.AnotacaoGUID,
            Titulo: anotacao.AnotacaoTitulo,
            Descricao: anotacao.AnotacaoDescricao,
            DataPrazo: anotacao.AnotacaoData,
            TipoAviso: 'anotacao',
            StatusTexto: anotacao.AnotacaoIsFeito ? 'Feita' : 'Pendente',
            TipoEntrega: null,
            IsFeito: anotacao.AnotacaoIsFeito
          });
        });
      }

      // Eventos sempre aparecem — não é gated pelo toggle "Mostrar Anotações"
      const eventosNoDia = eventos.filter(evento => {
        const dataEvento = new Date(evento.EventoData);
        return dataEvento.toISOString().split('T')[0] === dataStr;
      });

      eventosNoDia.forEach(evento => {
        avisosNoDia.push({
          AvisoId: evento.EventoGUID,
          Titulo: evento.EventoTitulo,
          Descricao: evento.EventoDescricao,
          DataPrazo: evento.EventoData,
          TipoAviso: 'evento',
          StatusTexto: evento.EventoStatus,
          TipoEntrega: null,
        });
      });

      const dataComparacao = new Date(data);
      dataComparacao.setHours(0, 0, 0, 0);

      dias.push({
        data,
        diaDoMes: dia,
        ehMesAtual: true,
        ehHoje: dataComparacao.getTime() === hoje.getTime(),
        ehPassado: dataComparacao.getTime() < hoje.getTime(),
        avisos: avisosNoDia
      });
    }

    // Dias do próximo mês
    const diasRestantes = 42 - dias.length; // 6 semanas x 7 dias
    for (let dia = 1; dia <= diasRestantes; dia++) {
      const data = new Date(ano, mes + 1, dia);
      const dataComparacao = new Date(data);
      dataComparacao.setHours(0, 0, 0, 0);

      dias.push({
        data,
        diaDoMes: dia,
        ehMesAtual: false,
        ehHoje: false,
        ehPassado: dataComparacao.getTime() < hoje.getTime(),
        avisos: []
      });
    }

    return dias;
  }, [dataAtual, avisos, anotacoes, mostrarAnotacoes, eventos]);

  const diasComAvisos = useMemo(() => {
    return diasDoCalendario.filter(dia => dia.ehMesAtual && dia.avisos.length > 0);
  }, [diasDoCalendario]);

  const diasDoMesAtual = useMemo(() => {
    return diasDoCalendario.filter(dia => dia.ehMesAtual);
  }, [diasDoCalendario]);

  useEffect(() => {
    if (!modalAberto || !diaSelecionado) return;

    const diaAtualizado = diasDoMesAtual.find(
      d => d.data.getTime() === diaSelecionado.data.getTime()
    );

    if (diaAtualizado && diaAtualizado !== diaSelecionado) {
      setDiaSelecionado(diaAtualizado);
    }
  }, [modalAberto, diaSelecionado, diasDoMesAtual]);

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
    setModoEdicaoAnotacao(null);
    setModalCriarAnotacaoAberto(false);
    setFormNovaAnotacao({ titulo: '', descricao: '' });
    setFormEdicaoAnotacao({ titulo: '', descricao: '' });
  };

  const handleCriarAnotacao = async () => {
    if (!diaSelecionado || !formNovaAnotacao.titulo.trim()) {
      alert('Título é obrigatório');
      return;
    }

    try {
      const dataGMT3 = converterParaBrasil(
        `${diaSelecionado.data.toISOString().split('T')[0]}T12:00:00`
      );

      await criarAnotacao(
        escolaGUID,
        dataGMT3,
        formNovaAnotacao.titulo,
        formNovaAnotacao.descricao || undefined
      );

      setFormNovaAnotacao({ titulo: '', descricao: '' });
      setModalCriarAnotacaoAberto(false);
      await carregarCalendario();
    } catch (error: any) {
      alert(error.message || 'Erro ao criar anotação');
    }
  };

  const handleToggleAnotacao = async (guid: string) => {
    try {
      await toggleAnotacaoFeito(guid);
      await carregarCalendario();
    } catch (error: any) {
      alert(error.message || 'Erro ao atualizar status');
    }
  };

  const handleExcluirAnotacao = async (guid: string) => {
    if (!confirm('Deseja realmente excluir esta anotação?')) return;

    try {
      await excluirAnotacao(guid);
      await carregarCalendario();
    } catch (error: any) {
      alert(error.message || 'Erro ao excluir anotação');
    }
  };

  const handleEditarAnotacao = async (guid: string) => {
    if (!formEdicaoAnotacao.titulo.trim()) {
      alert('Título é obrigatório');
      return;
    }

    try {
      await atualizarAnotacao(guid, {
        AnotacaoTitulo: formEdicaoAnotacao.titulo,
        AnotacaoDescricao: formEdicaoAnotacao.descricao || null
      });

      setModoEdicaoAnotacao(null);
      setFormEdicaoAnotacao({ titulo: '', descricao: '' });
      await carregarCalendario();
    } catch (error: any) {
      alert(error.message || 'Erro ao editar anotação');
    }
  };

  const handleToggleTarefaFisica = async (aviso: AvisoCalendario) => {
    if (aviso.TipoAviso !== 'tarefa') return;
    if (aviso.TipoEntrega !== 'fisica') return;
    if (!aviso.MatriculaGUID) {
      alert('Não foi possível identificar a matrícula para atualizar esta tarefa.');
      return;
    }

    const tarefaFeitoAtual = avisoEstaConcluido(aviso);

    try {
      const response = await fetch(`/api/tarefa/${aviso.AvisoId}/marcar-feito`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          MatriculaGUID: aviso.MatriculaGUID,
          TarefaFeito: !tarefaFeitoAtual,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Erro ao atualizar tarefa');
      }

      await carregarCalendario();
    } catch (error: any) {
      alert(error.message || 'Erro ao atualizar tarefa física');
    }
  };

  // Paleta de tipo de aviso — tokens reais do Bauá Design System
  // (tarefa → --blue-500, prova → --gold-500, evento → --green-500,
  // anotacao → --slate-400), usada tanto nas fitas do mini-calendário
  // quanto nos badges do modal de detalhes do dia (ver obterClasseBadgeTipo).
  const obterCorTipo = (tipo: string) => {
    switch (tipo) {
      case 'tarefa': return '#2F5BEA';
      case 'prova': return '#FFC02E';
      case 'evento': return '#17C077';
      case 'anotacao': return '#8A968E';
      default: return '#B7C1BA';
    }
  };

  const obterCorTextoTipo = (tipo: string) => {
    // Contraste: o dourado (prova) precisa de texto escuro; os demais tons
    // já têm luminância baixa o bastante para texto branco.
    return tipo === 'prova' ? '#0F1D17' : '#FFFFFF';
  };

  const obterClasseBadgeTipo = (tipo: AvisoCalendario['TipoAviso']) => {
    switch (tipo) {
      case 'tarefa': return styles.badgeTarefa;
      case 'prova': return styles.badgeProva;
      case 'evento': return styles.badgeEvento;
      case 'anotacao': return styles.badgeAnotacao;
      default: return styles.badgeAnotacao;
    }
  };

  const obterLabelTipoAviso = (tipo: AvisoCalendario['TipoAviso']) => {
    switch (tipo) {
      case 'tarefa':
        return 'Tarefa';
      case 'prova':
        return 'Prova';
      case 'evento':
        return 'Evento';
      case 'anotacao':
        return 'Anotação';
      default:
        return 'Aviso';
    }
  };

  const alternarAvisoExpandido = (avisoId: string) => {
    setAvisosExpandidos((prev) => ({
      ...prev,
      [avisoId]: !prev[avisoId],
    }));
  };

  const avisoExpandido = (avisoId: string) => Boolean(avisosExpandidos[avisoId]);

  const formatarHoraAviso = (aviso: AvisoCalendario) => {
    return new Date(aviso.DataPrazo).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const obterClasseStatusTarefa = (aviso: AvisoCalendario) => {
    const statusNormalizado = aviso.StatusTexto.toLowerCase();

    if (aviso.IsFeito || /feito|conclu/i.test(statusNormalizado)) {
      return styles.statusFeita;
    }

    if (/atras/i.test(statusNormalizado)) {
      return styles.statusAtrasada;
    }

    return styles.statusPendente;
  };

  const hexParaRgba = (hex: string, alpha: number) => {
    const normalizado = hex.replace('#', '');
    const bigint = parseInt(normalizado, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const obterEstiloFita = (aviso: AvisoCalendario) => {
    const corBase = obterCorTipo(aviso.TipoAviso);

    if (!avisoEstaConcluido(aviso)) {
      return { backgroundColor: corBase, color: obterCorTextoTipo(aviso.TipoAviso) };
    }

    return {
      backgroundColor: hexParaRgba(corBase, 0.24),
      border: '1px solid rgba(15, 29, 23, 0.12)',
      color: 'rgba(15, 29, 23, 0.55)',
    };
  };

  const avisoEstaConcluido = (aviso: AvisoCalendario) => {
    if (aviso.TipoAviso === 'anotacao') {
      return Boolean(aviso.IsFeito) || /feito|conclu/i.test(aviso.StatusTexto);
    }

    if (aviso.TipoAviso === 'tarefa') {
      if (typeof aviso.StatusBoolean === 'boolean') return aviso.StatusBoolean;
      return /feito|conclu/i.test(aviso.StatusTexto);
    }

    return false;
  };

  const avisosDoDiaOrdenados = useMemo(() => {
    if (!diaSelecionado) return [];

    return [...diaSelecionado.avisos].sort((a, b) => {
      const aConcluido = avisoEstaConcluido(a);
      const bConcluido = avisoEstaConcluido(b);

      if (aConcluido === bConcluido) return 0;
      return aConcluido ? 1 : -1;
    });
  }, [diaSelecionado]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.headerIcon} aria-hidden="true">
          <Icon name="calendar" size={20} />
        </span>
        <h1 className={styles.pageTitle}>Calendário de Avisos</h1>
      </header>

      {/* Aviso de Timezone */}
      {mostrarAvisoTimezone && (
        <div className={styles.timezoneAlert}>
          <Icon name="alert-triangle" size={18} className={styles.timezoneAlertIcon} />
          <span>
            <strong>Atenção:</strong> Você está em um fuso horário diferente do Brasil (GMT-3).
            As datas e horários exibidos foram ajustados para o seu fuso local.
          </span>
        </div>
      )}

      <section className={styles.calendarControls}>
        <button onClick={() => mudarMes(-1)} className={styles.navButton}>
          <Icon name="chevron-left" size={16} />
          Mês Anterior
        </button>
        <h2 className={styles.mesAno}>
          {dataAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
        </h2>
        <button onClick={() => mudarMes(1)} className={styles.navButton}>
          Próximo Mês
          <Icon name="chevron-right" size={16} />
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
                    dia.ehPassado && dia.ehMesAtual ? styles.passado : ''
                  } ${dia.avisos.length > 0 ? styles.temAvisos : ''
                  }`}
                  onClick={() => abrirModal(dia)}
                >
                  <div className={styles.diaNumero}>{dia.diaDoMes}</div>
                  {dia.avisos.length > 0 && (
                    <div className={styles.avisosContainer}>
                      {[...dia.avisos]
                        .sort((a, b) => {
                          const aConcluido = avisoEstaConcluido(a);
                          const bConcluido = avisoEstaConcluido(b);

                          if (aConcluido === bConcluido) return 0;
                          return aConcluido ? 1 : -1;
                        })
                        .slice(0, 3)
                        .map((aviso, idx) => (
                        <div
                          key={aviso.AvisoId}
                          className={`${styles.avisoFita} ${avisoEstaConcluido(aviso) ? styles.avisoFitaConcluida : ''}`}
                          style={obterEstiloFita(aviso)}
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
        <span className={`${styles.legendaBadge} ${styles.badgeTarefa}`}>Tarefa</span>
        <span className={`${styles.legendaBadge} ${styles.badgeProva}`}>Prova</span>
        <span className={`${styles.legendaBadge} ${styles.badgeEvento}`}>Evento</span>
        <span className={`${styles.legendaBadge} ${styles.badgeAnotacao}`}>Anotação</span>

        <div className={styles.toggleContainer}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={mostrarAnotacoes}
              onChange={() => setMostrarAnotacoes(!mostrarAnotacoes)}
              className={styles.toggleCheckbox}
            />
            <span>Mostrar Anotações</span>
          </label>
        </div>
      </div>

      {modalAberto && diaSelecionado && (
        <div className={styles.modalOverlay} onClick={fecharModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button onClick={fecharModal} className={styles.modalClose} aria-label="Fechar">
              <Icon name="x" size={16} />
            </button>
            <div className={styles.modalHeader}>
              <button
                onClick={() => navegarDiaModal(-1)}
                disabled={indiceDiaModal === 0}
                className={styles.modalNavButton}
                aria-label="Dia anterior"
              >
                <Icon name="chevron-left" size={16} />
              </button>
              <h2>
                {diaSelecionado.data.toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </h2>
              <div className={styles.modalHeaderActions}>
                <button
                  onClick={() => setModalCriarAnotacaoAberto(true)}
                  className={styles.novaAnotacaoIconBtn}
                  title="Nova anotação"
                >
                  <Icon name="plus" size={16} />
                </button>
                <button
                  onClick={() => navegarDiaModal(1)}
                  disabled={indiceDiaModal === diasDoMesAtual.length - 1}
                  className={styles.modalNavButton}
                  aria-label="Próximo dia"
                >
                  <Icon name="chevron-right" size={16} />
                </button>
              </div>
            </div>
            <div className={styles.modalBody}>
              {avisosDoDiaOrdenados.length === 0 ? (
                <div className={styles.semAvisos}>
                  <Icon name="calendar" size={28} className={styles.semAvisosIcone} />
                  <p>Nenhum aviso agendado para este dia.</p>
                  <button
                    type="button"
                    className={styles.semAvisosLink}
                    onClick={() => setModalCriarAnotacaoAberto(true)}
                  >
                    Deseja criar uma anotação?
                  </button>
                </div>
              ) : (
                avisosDoDiaOrdenados.map((aviso) => {
                  if (aviso.TipoAviso === 'anotacao') {
                    if (modoEdicaoAnotacao === aviso.AvisoId) {
                      return (
                        <div
                          key={aviso.AvisoId}
                          className={`${styles.avisoDetalhes} ${avisoEstaConcluido(aviso) ? styles.avisoConcluido : ''}`}
                        >
                          <div className={styles.avisoHeader}>
                            <span className={`${styles.badge} ${styles.badgeAnotacao}`}>
                              Anotação
                            </span>
                          </div>
                          <div className={styles.edicaoAnotacaoForm}>
                            <input
                              type="text"
                              value={formEdicaoAnotacao.titulo}
                              onChange={(e) => setFormEdicaoAnotacao({ ...formEdicaoAnotacao, titulo: e.target.value })}
                              className={styles.input}
                              placeholder="Título"
                            />
                            <textarea
                              value={formEdicaoAnotacao.descricao}
                              onChange={(e) => setFormEdicaoAnotacao({ ...formEdicaoAnotacao, descricao: e.target.value })}
                              className={styles.textarea}
                              placeholder="Descrição (opcional)"
                            />
                          </div>
                          <div className={styles.acoesEdicao}>
                            <button onClick={() => handleEditarAnotacao(aviso.AvisoId)} className={styles.btnConfirmar}>
                              <Icon name="check" size={14} /> Confirmar
                            </button>
                            <button onClick={() => {
                              setModoEdicaoAnotacao(null);
                              setFormEdicaoAnotacao({ titulo: '', descricao: '' });
                            }} className={styles.btnCancelar}>
                              <Icon name="x" size={14} /> Cancelar
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={aviso.AvisoId}
                        className={`${styles.avisoDetalhes} ${avisoEstaConcluido(aviso) ? styles.avisoConcluido : ''}`}
                      >
                        <div className={styles.avisoHeader}>
                          <span className={`${styles.badge} ${styles.badgeAnotacao}`}>
                            Anotação
                          </span>
                          <div className={styles.acoesInline}>
                            <button
                              onClick={() => {
                                setModoEdicaoAnotacao(aviso.AvisoId);
                                setFormEdicaoAnotacao({ titulo: aviso.Titulo, descricao: aviso.Descricao || '' });
                              }}
                              className={styles.iconBtnAnotacao}
                              title="Editar"
                            >
                              <Icon name="edit" size={14} />
                            </button>
                            <button
                              onClick={() => handleExcluirAnotacao(aviso.AvisoId)}
                              className={styles.iconBtnAnotacao}
                              title="Excluir"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        </div>
                        <div className={styles.anotacaoCheckTitle}>
                          <input
                            type="checkbox"
                            checked={aviso.IsFeito}
                            onChange={() => handleToggleAnotacao(aviso.AvisoId)}
                            className={styles.checkbox}
                          />
                          <h3 className={aviso.IsFeito ? styles.feito : ''}>{aviso.Titulo}</h3>
                        </div>
                        {aviso.Descricao && (
                          <p className={styles.avisoDescricao}>{aviso.Descricao}</p>
                        )}
                      </div>
                    );
                  }

                  const expandido = avisoExpandido(aviso.AvisoId);

                  return (
                    <div
                      key={aviso.AvisoId}
                      className={`${styles.avisoDetalhes} ${expandido ? styles.avisoDetalhesExpandido : styles.avisoDetalhesMinimizado} ${avisoEstaConcluido(aviso) ? styles.avisoConcluido : ''}`}
                    >
                      <button
                        type="button"
                        className={styles.avisoResumoBar}
                        onClick={() => alternarAvisoExpandido(aviso.AvisoId)}
                        aria-expanded={expandido}
                      >
                        <div className={styles.avisoBadgeFaixa}>
                          <span className={`${styles.badge} ${obterClasseBadgeTipo(aviso.TipoAviso)}`}>
                            {obterLabelTipoAviso(aviso.TipoAviso)}
                          </span>
                          <span className={styles.avisoTipoGrupoRight}>
                            {aviso.TipoAviso !== 'prova' && (
                              <span className={styles.avisoHoraFaixa}>
                                <Icon name="clock" size={12} />
                                {formatarHoraAviso(aviso)}
                              </span>
                            )}
                            <span className={styles.avisoToggleExpandido}>
                              <Icon name={expandido ? 'chevron-down' : 'chevron-right'} size={14} />
                            </span>
                          </span>
                        </div>

                        <div className={styles.avisoTituloLinha}>
                          <h3 className={styles.avisoTituloPrincipal}>{aviso.Titulo}</h3>
                        </div>
                      </button>

                      {expandido && (
                        <div className={styles.avisoConteudoExpandido}>
                          {aviso.Descricao && (
                            <p className={styles.avisoDescricao}>{aviso.Descricao}</p>
                          )}
                          <div className={styles.avisoFooter}>
                            {aviso.TipoAviso === 'tarefa' && (
                              <label className={styles.tarefaCheckboxInline}>
                                <input
                                  type="checkbox"
                                  checked={avisoEstaConcluido(aviso)}
                                  disabled={aviso.TipoEntrega !== 'fisica'}
                                  onChange={() => handleToggleTarefaFisica(aviso)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span>
                                  {aviso.TipoEntrega === 'fisica'
                                    ? 'Entregue'
                                    : 'Entrega digital'}
                                </span>
                              </label>
                            )}
                            {aviso.TipoAviso === 'tarefa' ? (
                              <span className={`${styles.avisoStatus} ${obterClasseStatusTarefa(aviso)}`}>
                                {aviso.StatusTexto}
                              </span>
                            ) : (
                              <span className={styles.avisoStatus}>{aviso.StatusTexto}</span>
                            )}
                            {aviso.TipoEntrega && (
                              <span className={styles.avisoEntrega}>
                                Entrega: {aviso.TipoEntrega === 'digital' ? 'Digital' : 'Física'}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {modalCriarAnotacaoAberto && diaSelecionado && (
        <div className={styles.subModalOverlay} onClick={() => setModalCriarAnotacaoAberto(false)}>
          <div className={styles.subModalContent} onClick={(e) => e.stopPropagation()}>
            <h3>
              Nova anotação em {diaSelecionado.data.toLocaleDateString('pt-BR')}
            </h3>
            <div className={styles.anotacaoForm}>
              <input
                type="text"
                placeholder="Título da anotação"
                value={formNovaAnotacao.titulo}
                onChange={(e) => setFormNovaAnotacao({ ...formNovaAnotacao, titulo: e.target.value })}
                maxLength={256}
                className={styles.input}
              />
              <textarea
                placeholder="Descrição (opcional)"
                value={formNovaAnotacao.descricao}
                onChange={(e) => setFormNovaAnotacao({ ...formNovaAnotacao, descricao: e.target.value })}
                maxLength={2048}
                className={styles.textarea}
              />
              <div className={styles.acoesEdicao}>
                <button onClick={handleCriarAnotacao} className={styles.btnConfirmar}>
                  <Icon name="check" size={14} /> Salvar
                </button>
                <button
                  onClick={() => {
                    setModalCriarAnotacaoAberto(false);
                    setFormNovaAnotacao({ titulo: '', descricao: '' });
                  }}
                  className={styles.btnCancelar}
                >
                  <Icon name="x" size={14} /> Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
