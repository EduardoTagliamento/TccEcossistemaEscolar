'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { converterParaBrasil, converterDoBrasil, usuarioForaDoBrasil } from '@/lib/timezone-utils';
import * as GradeHorariaAPI from '@/lib/api/gradehoraria.api';
import { DiaSemana, DIA_SEMANA_LABEL } from '@/lib/api/escolaconfiguracao.api';
import styles from './page.module.css';

interface Prova {
  ProvaAgendadaGUID: string;
  MateriaGUID: string;
  ProvaData: string;
  ProvaDescricao: string | null;
  ProvaStatus: 'Agendada' | 'Realizada' | 'Cancelada';
  TurmasAtribuidas: string[];
}

interface ResultadoCalculoUI extends GradeHorariaAPI.ResultadoCalculo {
  diaEscolhido?: DiaSemana;
  dataManual?: string; // valor de <input type="datetime-local"> (timezone do navegador)
}

interface MateriaOption {
  MatProfTurGUID: string;
  MateriaGUID: string;
  MateriaNome: string;
  TurmaNome: string;
  TurmaSerie: string;
}

interface TurmaItem {
  TurmaGUID: string;
  TurmaNome: string;
  checked: boolean;
}

interface SerieItem {
  TurmaSerie: string;
  turmas: TurmaItem[];
  checked: boolean;
  expanded: boolean;
}

export default function CrudProvaAgendadaPage() {
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

  const [provas, setProvas] = useState<Prova[]>([]);
  const [materias, setMaterias] = useState<MateriaOption[]>([]);
  const [series, setSeries] = useState<SerieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingGUID, setEditingGUID] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [agendamentoAutomatico, setAgendamentoAutomatico] = useState(false);
  const [semanaBase, setSemanaBase] = useState('');
  const [deslocamentoMinutos, setDeslocamentoMinutos] = useState(0);
  const [calculandoDatas, setCalculandoDatas] = useState(false);
  const [resultadosCalculo, setResultadosCalculo] = useState<Record<string, ResultadoCalculoUI>>({});
  const [form, setForm] = useState({
    MateriaGUID: '',
    MatProfTurGUID: '', // Para buscar turmas
    ProvaData: '',
    ProvaDescricao: '',
    ProvaStatus: 'Agendada' as 'Agendada' | 'Realizada' | 'Cancelada',
  });

  /**
   * Inicializar campo de data com hoje às 23:59
   */
  useEffect(() => {
    const hoje = new Date();
    hoje.setHours(23, 59, 0, 0);
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const dataPadrao = `${ano}-${mes}-${dia}T23:59`;
    
    setForm(prev => ({ ...prev, ProvaData: dataPadrao }));
  }, []);

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }
    if (usuario) {
      void carregarMaterias();
      void carregarProvas();
    }
  }, [usuario, authLoading]);

  const carregarMaterias = async () => {
    try {
      const response = await fetch(`/api/professor/materias?EscolaGUID=${escolaGUID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Erro ao carregar matérias');
      const materiasData: MateriaOption[] = data?.data || [];

      setMaterias(materiasData);

      // O backend retorna uma linha por (matéria, turma); auto-preencher só
      // quando o professor leciona uma ÚNICA matéria (não uma única linha).
      const guidsUnicos = new Set(materiasData.map((m) => m.MateriaGUID));
      if (guidsUnicos.size === 1) {
        setForm(prev => ({
          ...prev,
          MateriaGUID: materiasData[0].MateriaGUID,
          MatProfTurGUID: materiasData[0].MatProfTurGUID
        }));
      }
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar matérias');
    }
  };

  // O endpoint /api/professor/materias devolve uma linha por (matéria, turma).
  // Para o seletor, cada matéria deve aparecer só uma vez.
  const materiasUnicas = useMemo(() => {
    const mapa = new Map<string, MateriaOption>();
    materias.forEach((m) => {
      if (!mapa.has(m.MateriaGUID)) {
        mapa.set(m.MateriaGUID, m);
      }
    });
    return Array.from(mapa.values());
  }, [materias]);

  const carregarProvas = async () => {
    setLoading(true);
    setErro(null);
    try {
      const response = await fetch('/api/prova', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Erro ao carregar provas');
      setProvas(data?.data?.provas || []);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar provas');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalTurmas = async () => {
    if (!form.MatProfTurGUID) {
      alert('Por favor, selecione uma matéria primeiro.');
      return;
    }

    setModalAberto(true);
    setLoadingModal(true);
    setErro(null);
    setResultadosCalculo({});

    try {
      const url = `/api/professor/turmas-alunos?MatProfTurGUID=${form.MatProfTurGUID}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();

      if (!response.ok) throw new Error(data?.message || 'Erro ao carregar turmas');

      // Transformar dados para estrutura com checkboxes
      const seriesData: SerieItem[] = (data?.data?.series || []).map((serie: any) => ({
        TurmaSerie: serie.TurmaSerie,
        checked: false,
        expanded: false,
        turmas: serie.turmas.map((turma: any) => ({
          TurmaGUID: turma.TurmaGUID,
          TurmaNome: turma.TurmaNome,
          checked: false
        }))
      }));

      setSeries(seriesData);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar turmas');
    } finally {
      setLoadingModal(false);
    }
  };

  const toggleSerie = (serieIndex: number) => {
    setSeries(prev => prev.map((serie, idx) => 
      idx === serieIndex 
        ? { ...serie, expanded: !serie.expanded }
        : serie
    ));
  };

  const checkSerie = (serieIndex: number, checked: boolean) => {
    setSeries(prev => prev.map((serie, sIdx) => 
      sIdx === serieIndex
        ? {
            ...serie,
            checked,
            turmas: serie.turmas.map(turma => ({
              ...turma,
              checked
            }))
          }
        : serie
    ));
  };

  const checkTurma = (serieIndex: number, turmaIndex: number, checked: boolean) => {
    setSeries(prev => prev.map((serie, sIdx) => {
      if (sIdx !== serieIndex) return serie;

      const turmasAtualizadas = serie.turmas.map((turma, tIdx) =>
        tIdx === turmaIndex
          ? { ...turma, checked }
          : turma
      );

      // Atualizar checkbox da série
      const todasTurmasMarcadas = turmasAtualizadas.every(t => t.checked);

      return {
        ...serie,
        checked: todasTurmasMarcadas,
        turmas: turmasAtualizadas
      };
    }));
  };

  const obterTurmasSelecionadas = (): string[] => {
    const turmasGUID: string[] = [];
    series.forEach(serie => {
      serie.turmas.forEach(turma => {
        if (turma.checked) {
          turmasGUID.push(turma.TurmaGUID);
        }
      });
    });
    return turmasGUID;
  };

  const nomeDaTurma = (turmaGUID: string): string => {
    for (const serie of series) {
      const turma = serie.turmas.find((t) => t.TurmaGUID === turmaGUID);
      if (turma) return `${serie.TurmaSerie}º ${turma.TurmaNome}`;
    }
    return turmaGUID;
  };

  // diasOverride permite passar o dia escolhido sem depender do state (que
  // ainda não teria sido atualizado se chamado logo após um setResultadosCalculo)
  const handleCalcularDatas = async (diasOverride?: Record<string, DiaSemana>) => {
    const turmasSelecionadas = obterTurmasSelecionadas();
    if (turmasSelecionadas.length === 0) {
      setErro('Selecione ao menos uma turma antes de calcular as datas.');
      return;
    }
    if (!semanaBase) {
      setErro('Informe a semana de referência.');
      return;
    }

    setErro(null);
    setCalculandoDatas(true);

    try {
      const resultados = await GradeHorariaAPI.calcularDatas(
        form.MateriaGUID,
        turmasSelecionadas.map((turmaGUID) => ({
          TurmaGUID: turmaGUID,
          SemanaBase: semanaBase,
          DeslocamentoMinutos: deslocamentoMinutos || 0,
          DiaSemana: diasOverride?.[turmaGUID] ?? resultadosCalculo[turmaGUID]?.diaEscolhido,
        }))
      );

      setResultadosCalculo((prev) => {
        const novo = { ...prev };
        resultados.forEach((r) => {
          novo[r.TurmaGUID] = { ...novo[r.TurmaGUID], ...r };
        });
        return novo;
      });
    } catch (err: any) {
      setErro(err?.message || 'Falha ao calcular as datas automaticamente');
    } finally {
      setCalculandoDatas(false);
    }
  };

  const handleEscolherDia = (turmaGUID: string, dia: DiaSemana) => {
    setResultadosCalculo((prev) => ({
      ...prev,
      [turmaGUID]: { ...prev[turmaGUID], diaEscolhido: dia },
    }));
  };

  const handleDataManual = (turmaGUID: string, valor: string) => {
    setResultadosCalculo((prev) => ({
      ...prev,
      [turmaGUID]: { ...prev[turmaGUID], dataManual: valor },
    }));
  };

  // Aplica a N-ésima ocorrência semanal (1ª, 2ª, 3ª aula...) em todas as
  // turmas que estejam com conflito ("escolherDia"), de uma vez.
  const handleAplicarOcorrenciaGlobal = async (indice: number) => {
    const diasEscolhidos: Record<string, DiaSemana> = {};

    Object.entries(resultadosCalculo).forEach(([turmaGUID, resultado]) => {
      if (resultado.status === 'escolherDia') {
        const ocorrencia = resultado.Ocorrencias?.[indice - 1];
        if (ocorrencia) {
          diasEscolhidos[turmaGUID] = ocorrencia.DiaSemana;
        }
      }
    });

    if (Object.keys(diasEscolhidos).length === 0) return;

    setResultadosCalculo((prev) => {
      const novo = { ...prev };
      Object.entries(diasEscolhidos).forEach(([turmaGUID, dia]) => {
        novo[turmaGUID] = { ...novo[turmaGUID], diaEscolhido: dia };
      });
      return novo;
    });

    await handleCalcularDatas(diasEscolhidos);
  };

  /**
   * Obtém a data de hoje às 23:59 no formato datetime-local
   */
  const obterDataPadraoFimDoDia = (): string => {
    const hoje = new Date();
    hoje.setHours(23, 59, 0, 0);
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}T23:59`;
  };

  const limparFormulario = () => {
    setEditingGUID(null);
    setForm({
      MateriaGUID: materiasUnicas.length === 1 ? materiasUnicas[0].MateriaGUID : '',
      MatProfTurGUID: materiasUnicas.length === 1 ? materiasUnicas[0].MatProfTurGUID : '',
      ProvaData: obterDataPadraoFimDoDia(),
      ProvaDescricao: '',
      ProvaStatus: 'Agendada',
    });
    setSeries([]);
    setAgendamentoAutomatico(false);
    setResultadosCalculo({});
    setSemanaBase('');
    setDeslocamentoMinutos(0);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErro(null);

    try {
      // MODO EDIÇÃO: Atualizar prova existente
      if (editingGUID) {
        const payload = {
          prova: {
            ProvaData: converterParaBrasil(form.ProvaData), // Converte do timezone do usuário para GMT-3
            ProvaDescricao: form.ProvaDescricao || undefined,
            ProvaStatus: form.ProvaStatus,
          },
        };

        const response = await fetch(`/api/prova/${editingGUID}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || 'Erro ao atualizar prova');
        }

        alert('Prova atualizada com sucesso!');
        limparFormulario();
        await carregarProvas();
        return;
      }

      // MODO CRIAÇÃO: Criar provas para turmas selecionadas
      const turmasSelecionadas = obterTurmasSelecionadas();

      if (turmasSelecionadas.length === 0) {
        throw new Error('Selecione pelo menos uma turma');
      }

      let datasPorTurma: Record<string, string> | undefined;
      let provaDataParaEnvio = form.ProvaData ? converterParaBrasil(form.ProvaData) : '';

      if (agendamentoAutomatico) {
        datasPorTurma = {};
        for (const turmaGUID of turmasSelecionadas) {
          const resultado = resultadosCalculo[turmaGUID];

          if (!resultado) {
            throw new Error('Clique em "Calcular Datas" antes de salvar.');
          }

          if (resultado.status === 'ok' && resultado.DataCalculada) {
            datasPorTurma[turmaGUID] = resultado.DataCalculada;
          } else if (resultado.status === 'semCronograma') {
            if (!resultado.dataManual) {
              throw new Error('Uma das turmas selecionadas não tem cronograma configurado — defina a data manualmente para ela.');
            }
            datasPorTurma[turmaGUID] = converterParaBrasil(resultado.dataManual);
          } else if (resultado.status === 'escolherDia') {
            throw new Error('Escolha o dia da semana para a(s) turma(s) com mais de uma aula por semana antes de salvar.');
          } else {
            throw new Error(resultado.mensagem || 'Não foi possível calcular a data para uma das turmas selecionadas.');
          }
        }

        provaDataParaEnvio = Object.values(datasPorTurma)[0] || provaDataParaEnvio;
      }

      const payload = {
        prova: {
          TurmasGUID: turmasSelecionadas,
          MateriaGUID: form.MateriaGUID,
          ProvaData: provaDataParaEnvio, // Já em GMT-3 (manual: convertido do navegador; automático: calculado no servidor)
          ProvaDescricao: form.ProvaDescricao || undefined,
          DatasPorTurma: datasPorTurma,
        },
      };

      const response = await fetch('/api/prova', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Erro ao salvar prova');
      }

      alert(`Prova criada para ${turmasSelecionadas.length} turma(s) com sucesso!`);
      limparFormulario();
      await carregarProvas();
      setModalAberto(false);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao salvar prova');
    } finally {
      setSubmitting(false);
    }
  };

  const editarProva = (prova: Prova) => {
    setEditingGUID(prova.ProvaAgendadaGUID);
    setForm({
      MateriaGUID: prova.MateriaGUID,
      MatProfTurGUID: '', // Não precisa para edição
      ProvaData: converterDoBrasil(prova.ProvaData), // Converte GMT-3 para timezone do usuário
      ProvaDescricao: prova.ProvaDescricao || '',
      ProvaStatus: prova.ProvaStatus,
    });
    // Scroll para o topo para visualizar o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const excluirProva = async (provaGUID: string) => {
    if (!confirm('Deseja excluir esta prova?')) return;
    try {
      const response = await fetch(`/api/prova/${provaGUID}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Erro ao excluir prova');
      await carregarProvas();
    } catch (err: any) {
      setErro(err?.message || 'Falha ao excluir prova');
    }
  };

  const materiaSelecionada = materias.find(m => m.MatProfTurGUID === form.MatProfTurGUID);
  const totalTurmasSelecionadas = obterTurmasSelecionadas().length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{editingGUID ? '✏️ Editando Prova' : 'Cadastro de Prova Agendada'}</h1>
        <Link href={`/dashboard/${escolaGUID}`} className={styles.backLink}>Voltar ao Dashboard</Link>
      </header>

      {/* Aviso de Timezone */}
      {mostrarAvisoTimezone && (
        <div className={styles.timezoneAlert}>
          🌍 <strong>Atenção:</strong> Você está em um fuso horário diferente do Brasil (GMT-3). 
          As datas e horários exibidos foram ajustados para o seu fuso local.
        </div>
      )}

      <form className={styles.form} onSubmit={onSubmit}>
        {/* Campo de Matéria */}
        <div className={styles.formGroup}>
          <label>Matéria *</label>
          {materiasUnicas.length === 0 ? (
            <p className={styles.info}>Carregando matérias...</p>
          ) : materiasUnicas.length === 1 ? (
            <input
              value={materiasUnicas[0].MateriaNome}
              disabled
              className={styles.inputDisabled}
            />
          ) : (
            <select
              value={form.MateriaGUID}
              onChange={(e) => {
                const materiaSelecionada = materiasUnicas.find(m => m.MateriaGUID === e.target.value);
                setForm(prev => ({
                  ...prev,
                  MateriaGUID: e.target.value,
                  MatProfTurGUID: materiaSelecionada?.MatProfTurGUID || ''
                }));
                setSeries([]); // Limpar seleção de turmas ao mudar matéria
              }}
              required
              disabled={!!editingGUID}
            >
              <option value="">Selecione uma matéria</option>
              {materiasUnicas.map(materia => (
                <option key={materia.MateriaGUID} value={materia.MateriaGUID}>
                  {materia.MateriaNome}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Campo de Turmas (Modal) - Oculto no modo de edição */}
        {!editingGUID && (
          <div className={styles.formGroup}>
            <label>Turmas *</label>
            <button
              type="button"
              onClick={abrirModalTurmas}
              className={styles.selectButton}
              disabled={!form.MatProfTurGUID}
            >
              {totalTurmasSelecionadas === 0
                ? 'Selecionar Turmas'
                : `${totalTurmasSelecionadas} turma(s) selecionada(s)`}
            </button>
            {!form.MatProfTurGUID && (
              <p className={styles.hint}>Selecione uma matéria primeiro</p>
            )}
          </div>
        )}

        {!editingGUID && (
          <div className={styles.autoAgendamento}>
            <label className={styles.autoAgendamentoChecagem}>
              <input
                type="checkbox"
                checked={agendamentoAutomatico}
                onChange={(e) => setAgendamentoAutomatico(e.target.checked)}
                className={styles.checkbox}
              />
              Definir automaticamente pelo cronograma das turmas
            </label>

            {agendamentoAutomatico && (
              <>
                <div className={styles.autoAgendamentoLinha}>
                  <div className={styles.autoAgendamentoCampo}>
                    <label>Semana de referência</label>
                    <input
                      type="date"
                      value={semanaBase}
                      onChange={(e) => setSemanaBase(e.target.value)}
                    />
                  </div>
                  <div className={styles.autoAgendamentoCampo}>
                    <label>Deslocamento (minutos, +/-)</label>
                    <input
                      type="number"
                      value={deslocamentoMinutos}
                      onChange={(e) => setDeslocamentoMinutos(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.selectButton}
                    onClick={() => handleCalcularDatas()}
                    disabled={calculandoDatas || totalTurmasSelecionadas === 0 || !semanaBase}
                  >
                    {calculandoDatas ? 'Calculando...' : 'Calcular Datas'}
                  </button>
                </div>

                {totalTurmasSelecionadas === 0 && (
                  <p className={styles.hint}>Selecione ao menos uma turma acima antes de calcular.</p>
                )}

                {(() => {
                  const turmasComEscolha = obterTurmasSelecionadas().filter(
                    (t) => resultadosCalculo[t]?.status === 'escolherDia'
                  );
                  const maxOcorrencias = turmasComEscolha.reduce(
                    (max, t) => Math.max(max, resultadosCalculo[t]?.Ocorrencias?.length || 0),
                    0
                  );

                  if (turmasComEscolha.length === 0) return null;

                  return (
                    <div className={styles.aplicarGlobal}>
                      <span>
                        {turmasComEscolha.length} turma(s) com mais de uma aula por semana. Aplicar a mesma ocorrência em todas:
                      </span>
                      <div className={styles.aplicarGlobalBotoes}>
                        {Array.from({ length: maxOcorrencias }, (_, i) => i + 1).map((n) => (
                          <button
                            key={n}
                            type="button"
                            className={styles.selectButton}
                            onClick={() => handleAplicarOcorrenciaGlobal(n)}
                          >
                            {n}ª aula da semana
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className={styles.resultadosCalculo}>
                  {obterTurmasSelecionadas().map((turmaGUID) => {
                    const resultado = resultadosCalculo[turmaGUID];
                    if (!resultado) return null;

                    if (resultado.status === 'ok') {
                      return (
                        <div key={turmaGUID} className={`${styles.resultadoTurma} ${styles.resultadoOk}`}>
                          <strong>{nomeDaTurma(turmaGUID)}</strong>
                          <span>
                            {new Date(resultado.DataCalculada!).toLocaleString('pt-BR')} ({resultado.DiaSemana})
                          </span>
                        </div>
                      );
                    }

                    if (resultado.status === 'escolherDia') {
                      return (
                        <div key={turmaGUID} className={`${styles.resultadoTurma} ${styles.resultadoAviso}`}>
                          <strong>{nomeDaTurma(turmaGUID)}</strong>
                          <span>Esta matéria tem mais de uma aula por semana nesta turma. Escolha qual usar:</span>
                          <select
                            value={resultado.diaEscolhido || ''}
                            onChange={(e) => {
                              handleEscolherDia(turmaGUID, e.target.value as DiaSemana);
                            }}
                          >
                            <option value="">Selecione o dia...</option>
                            {resultado.Ocorrencias?.map((o) => (
                              <option key={o.DiaSemana} value={o.DiaSemana}>
                                {DIA_SEMANA_LABEL[o.DiaSemana]} {o.HoraInicio}–{o.HoraFim}
                              </option>
                            ))}
                          </select>
                          {resultado.diaEscolhido && (
                            <button type="button" className={styles.selectButton} onClick={() => handleCalcularDatas()}>
                              Recalcular com este dia
                            </button>
                          )}
                        </div>
                      );
                    }

                    if (resultado.status === 'semCronograma') {
                      return (
                        <div key={turmaGUID} className={`${styles.resultadoTurma} ${styles.resultadoAviso}`}>
                          <strong>{nomeDaTurma(turmaGUID)}</strong>
                          <span>Esta turma não tem cronograma configurado para esta matéria. Defina a data manualmente:</span>
                          <input
                            type="datetime-local"
                            value={resultado.dataManual || ''}
                            onChange={(e) => handleDataManual(turmaGUID, e.target.value)}
                          />
                        </div>
                      );
                    }

                    return (
                      <div key={turmaGUID} className={`${styles.resultadoTurma} ${styles.resultadoErro}`}>
                        <strong>{nomeDaTurma(turmaGUID)}</strong>
                        <span>{resultado.mensagem || 'Não foi possível calcular a data.'}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {!agendamentoAutomatico && (
          <input
            type="datetime-local"
            value={form.ProvaData}
            onChange={(e) => setForm((prev) => ({ ...prev, ProvaData: e.target.value }))}
            required
          />
        )}
        <textarea
          placeholder="Descrição"
          value={form.ProvaDescricao}
          onChange={(e) => setForm((prev) => ({ ...prev, ProvaDescricao: e.target.value }))}
        />

        {/* Campo de Status - Apenas no modo de edição */}
        {editingGUID && (
          <div className={styles.formGroup}>
            <label>Status *</label>
            <select
              value={form.ProvaStatus}
              onChange={(e) => setForm((prev) => ({ ...prev, ProvaStatus: e.target.value as 'Agendada' | 'Realizada' | 'Cancelada' }))}
              required
            >
              <option value="Agendada">Agendada</option>
              <option value="Realizada">Realizada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
        )}

        <div className={styles.actions}>
          <button type="submit" disabled={submitting || (!editingGUID && totalTurmasSelecionadas === 0)}>
            {submitting ? 'Salvando...' : editingGUID ? 'Atualizar Prova' : `Criar ${totalTurmasSelecionadas > 0 ? `(${totalTurmasSelecionadas})` : ''}`}
          </button>
          {editingGUID && (
            <button type="button" className={styles.secondaryButton} onClick={limparFormulario}>
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      {erro && <p className={styles.error}>{erro}</p>}

      {/* Modal de Seleção de Turmas */}
      {modalAberto && (
        <div className={styles.modalOverlay} onClick={() => setModalAberto(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Selecionar Turmas</h2>
              <button className={styles.modalClose} onClick={() => setModalAberto(false)}>×</button>
            </div>

            {materiaSelecionada && (
              <div className={styles.modalInfo}>
                <p><strong>Matéria:</strong> {materiaSelecionada.MateriaNome}</p>
              </div>
            )}

            <div className={styles.modalBody}>
              {loadingModal ? (
                <p className={styles.loading}>Carregando turmas...</p>
              ) : series.length === 0 ? (
                <p className={styles.empty}>Nenhuma turma encontrada</p>
              ) : (
                <div className={styles.treeView}>
                  {series.map((serie, sIdx) => (
                    <div key={sIdx} className={styles.serieItem}>
                      {/* Checkbox e Nome da Série */}
                      <div className={styles.serieHeader}>
                        <input
                          type="checkbox"
                          checked={serie.checked}
                          onChange={(e) => checkSerie(sIdx, e.target.checked)}
                          className={styles.checkbox}
                        />
                        <button
                          type="button"
                          onClick={() => toggleSerie(sIdx)}
                          className={styles.expandButton}
                        >
                          {serie.expanded ? '▼' : '▶'} {serie.TurmaSerie}ª Série
                        </button>
                        <span className={styles.count}>
                          ({serie.turmas.length} turma{serie.turmas.length !== 1 ? 's' : ''})
                        </span>
                      </div>

                      {/* Turmas da Série */}
                      {serie.expanded && (
                        <div className={styles.turmasList}>
                          {serie.turmas.map((turma, tIdx) => (
                            <div key={tIdx} className={styles.turmaItem}>
                              {/* Checkbox e Nome da Turma */}
                              <div className={styles.turmaHeader}>
                                <input
                                  type="checkbox"
                                  checked={turma.checked}
                                  onChange={(e) => checkTurma(sIdx, tIdx, e.target.checked)}
                                  className={styles.checkbox}
                                />
                                <label>{turma.TurmaNome}</label>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <p><strong>{totalTurmasSelecionadas}</strong> turma(s) selecionada(s)</p>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className={styles.confirmButton}
              >
                Confirmar Seleção
              </button>
            </div>
          </div>
        </div>
      )}

      <section className={styles.listSection}>
        <h2>Provas cadastradas</h2>
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <ul className={styles.list}>
            {provas.map((prova) => (
              <li key={prova.ProvaAgendadaGUID} className={styles.card}>
                <div>
                  <strong>Prova - {new Date(prova.ProvaData).toLocaleDateString('pt-BR')}</strong>
                  <p>Data/Hora: {new Date(prova.ProvaData).toLocaleString('pt-BR')}</p>
                  {prova.ProvaDescricao && <p>Descrição: {prova.ProvaDescricao}</p>}
                  <p>Status: {prova.ProvaStatus}</p>
                  <p>Turmas: {prova.TurmasAtribuidas?.length || 0}</p>
                </div>
                <div className={styles.cardActions}>
                  <button type="button" onClick={() => editarProva(prova)}>Editar</button>
                  <button type="button" onClick={() => excluirProva(prova.ProvaAgendadaGUID)}>Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
