'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import styles from './page.module.css';

interface AvisoCalendario {
  TipoAviso: 'tarefa' | 'prova' | 'evento' | 'anotacao';
  AvisoId: string;
  DataPrazo: string;
  Titulo: string;
  Descricao: string | null;
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

  const [dataAtual, setDataAtual] = useState(() => new Date());
  const [avisos, setAvisos] = useState<AvisoCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<DiaCalendario | null>(null);
  const [indiceDiaModal, setIndiceDiaModal] = useState(0);
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [mostrarAnotacoes, setMostrarAnotacoes] = useState(true);
  const [modoEdicaoAnotacao, setModoEdicaoAnotacao] = useState<string | null>(null);
  const [modalCriarAnotacaoAberto, setModalCriarAnotacaoAberto] = useState(false);
  const [formNovaAnotacao, setFormNovaAnotacao] = useState({ titulo: '', descricao: '' });
  const [formEdicaoAnotacao, setFormEdicaoAnotacao] = useState({ titulo: '', descricao: '' });

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
  }, [dataAtual, avisos, anotacoes, mostrarAnotacoes]);

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

  const obterCorTipo = (tipo: string) => {
    switch (tipo) {
      case 'tarefa': return '#4CAF50';
      case 'prova': return '#FF5722';
      case 'evento': return '#2196F3';
      case 'anotacao': return '#FFC107';
      default: return '#9E9E9E';
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Calendário de Avisos</h1>
        <Link href={`/dashboard/${escolaGUID}`} className={styles.backLink}>Voltar ao Dashboard</Link>
      </header>

      {/* Aviso de Timezone */}
      {usuarioForaDoBrasil() && (
        <div className={styles.timezoneAlert}>
          🌍 <strong>Atenção:</strong> Você está em um fuso horário diferente do Brasil (GMT-3). 
          As datas e horários exibidos foram ajustados para o seu fuso local.
        </div>
      )}

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
                    dia.ehPassado && dia.ehMesAtual ? styles.passado : ''
                  } ${dia.avisos.length > 0 ? styles.temAvisos : ''
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
        <div className={styles.legendaItem}>
          <div className={styles.legendaCor} style={{ backgroundColor: '#FFC107' }}></div>
          <span>Anotação</span>
        </div>
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
              <div className={styles.modalHeaderActions}>
                <button
                  onClick={() => setModalCriarAnotacaoAberto(true)}
                  className={styles.novaAnotacaoIconBtn}
                  title="Nova anotação"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14"/>
                    <path d="M5 12h14"/>
                  </svg>
                </button>
                <button
                  onClick={() => navegarDiaModal(1)}
                  disabled={indiceDiaModal === diasDoMesAtual.length - 1}
                  className={styles.modalNavButton}
                >
                  →
                </button>
              </div>
            </div>
            <button onClick={fecharModal} className={styles.modalClose}>✕</button>
            <div className={styles.modalBody}>
              {diaSelecionado.avisos.length === 0 ? (
                <div className={styles.semAvisos}>
                  <p>📅 Nenhum aviso agendado para este dia.</p>
                </div>
              ) : (
                diaSelecionado.avisos.map((aviso) => {
                  if (aviso.TipoAviso === 'anotacao') {
                    if (modoEdicaoAnotacao === aviso.AvisoId) {
                      return (
                        <div key={aviso.AvisoId} className={styles.avisoDetalhes}>
                          <div className={styles.avisoHeader}>
                            <span className={styles.avisoBadge} style={{ backgroundColor: '#FFC107', color: '#5D4037' }}>
                              ANOTAÇÃO
                            </span>
                          </div>
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
                          <div className={styles.acoesEdicao}>
                            <button onClick={() => handleEditarAnotacao(aviso.AvisoId)} className={styles.btnConfirmar}>
                              ✓ Confirmar
                            </button>
                            <button onClick={() => {
                              setModoEdicaoAnotacao(null);
                              setFormEdicaoAnotacao({ titulo: '', descricao: '' });
                            }} className={styles.btnCancelar}>
                              ✕ Cancelar
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={aviso.AvisoId} className={styles.avisoDetalhes}>
                        <div className={styles.avisoHeader}>
                          <span className={styles.avisoBadge} style={{ backgroundColor: '#FFC107', color: '#5D4037' }}>
                            ANOTAÇÃO
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
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleExcluirAnotacao(aviso.AvisoId)}
                              className={styles.iconBtnAnotacao}
                              title="Excluir"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                              </svg>
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

                  return (
                    <div key={aviso.AvisoId} className={styles.avisoDetalhes}>
                      <div className={styles.avisoHeader}>
                        <span
                          className={styles.avisoBadge}
                          style={{ backgroundColor: obterCorTipo(aviso.TipoAviso) }}
                        >
                          {aviso.TipoAviso.toUpperCase()}
                        </span>
                        {aviso.TipoAviso !== 'prova' && (
                          <span className={styles.avisoHora}>
                            {new Date(aviso.DataPrazo).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
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
                  );
                })
              )}
            </div>

            {modalCriarAnotacaoAberto && (
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
                        ✓ Salvar
                      </button>
                      <button
                        onClick={() => {
                          setModalCriarAnotacaoAberto(false);
                          setFormNovaAnotacao({ titulo: '', descricao: '' });
                        }}
                        className={styles.btnCancelar}
                      >
                        ✕ Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
