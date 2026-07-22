'use client';

/**
 * Formulário de Cadastro de Tarefa — extraído de
 * frontend/app/dashboard/[escolaGUID]/crud-tarefa/page.tsx (agora uma das
 * abas de /cadastro) sem alterar a lógica de negócio/validação/API, só
 * desacoplado do "página inteira" (removido header próprio — a navbar do
 * dashboard já é persistente via layout.tsx).
 */

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { converterParaBrasil, converterDoBrasil, usuarioForaDoBrasil } from '@/lib/timezone-utils';
import * as GradeHorariaAPI from '@/lib/api/gradehoraria.api';
import { DiaSemana, DIA_SEMANA_LABEL } from '@/lib/api/escolaconfiguracao.api';
import { Icon } from '@/components/Icon';
import styles from './TarefaForm.module.css';

interface Tarefa {
  TarefaGUID: string;
  MatriculaGUID: string;
  matXprofXturxescGUID: string;
  TarefaTitulo: string;
  TarefaConteudo: string | null;
  TarefaPrazoData: string;
  TarefaTipoEntrega: 'digital' | 'fisica';
  TarefaFeito: boolean;
}

interface MateriaOption {
  MatProfTurGUID: string;
  MateriaGUID: string;
  MateriaNome: string;
  TurmaNome: string;
  TurmaSerie: string;
}

interface ResultadoCalculoUI extends GradeHorariaAPI.ResultadoCalculo {
  diaEscolhido?: DiaSemana;
  dataManual?: string; // valor de <input type="datetime-local"> (timezone do navegador)
}

interface AlunoItem {
  MatriculaGUID: string;
  UsuarioNome: string;
  checked: boolean;
}

interface TurmaItem {
  TurmaGUID: string;
  TurmaNome: string;
  alunos: AlunoItem[];
  checked: boolean;
  expanded: boolean;
}

interface SerieItem {
  TurmaSerie: string;
  turmas: TurmaItem[];
  checked: boolean;
  expanded: boolean;
}

export default function TarefaForm() {
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

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [materias, setMaterias] = useState<MateriaOption[]>([]);
  const [series, setSeries] = useState<SerieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingGUID, setEditingGUID] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [compartilhadaReadonly, setCompartilhadaReadonly] = useState(false);
  const [agendamentoAutomatico, setAgendamentoAutomatico] = useState(false);
  const [semanaBase, setSemanaBase] = useState('');
  const [deslocamentoMinutos, setDeslocamentoMinutos] = useState(0);
  const [calculandoDatas, setCalculandoDatas] = useState(false);
  const [resultadosCalculo, setResultadosCalculo] = useState<Record<string, ResultadoCalculoUI>>({});
  const [form, setForm] = useState({
    matXprofXturxescGUID: '',
    TarefaTitulo: '',
    TarefaConteudo: '',
    TarefaPrazoData: '',
    TarefaTipoEntrega: 'digital' as 'digital' | 'fisica',
    TarefaCompartilhada: false,
    TarefaMinPessoas: null as number | null,
    TarefaMaxPessoas: null as number | null,
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

    setForm(prev => ({ ...prev, TarefaPrazoData: dataPadrao }));
  }, []);

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }
    if (usuario) {
      void carregarMaterias();
      void carregarTarefas();
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
      const nomesUnicos = new Set(materiasData.map((m) => m.MateriaNome));
      if (nomesUnicos.size === 1) {
        setForm(prev => ({ ...prev, matXprofXturxescGUID: materiasData[0].MatProfTurGUID }));
      }
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar matérias');
    }
  };

  // O endpoint /api/professor/materias devolve uma linha por (matéria, turma).
  // Para o seletor, cada matéria deve aparecer só uma vez (qualquer uma das
  // linhas serve como referência: buscarTurmasAlunos já retorna TODAS as
  // turmas dessa matéria, não só a da linha escolhida).
  const materiasUnicas = useMemo(() => {
    const mapa = new Map<string, MateriaOption>();
    materias.forEach((m) => {
      if (!mapa.has(m.MateriaNome)) {
        mapa.set(m.MateriaNome, m);
      }
    });
    return Array.from(mapa.values());
  }, [materias]);

  const carregarTarefas = async () => {
    setLoading(true);
    setErro(null);
    try {
      const response = await fetch('/api/tarefa', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Erro ao carregar tarefas');
      setTarefas(data?.data?.tarefas || []);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalAlunos = async () => {
    if (!form.matXprofXturxescGUID) {
      alert('Por favor, selecione uma matéria primeiro.');
      return;
    }

    setModalAberto(true);
    setLoadingModal(true);
    setErro(null);
    setResultadosCalculo({});

    try {
      const url = `/api/professor/turmas-alunos?MatProfTurGUID=${form.matXprofXturxescGUID}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data?.message || 'Erro ao carregar alunos');

      // Transformar dados para estrutura com checkboxes
      const seriesData: SerieItem[] = (data?.data?.series || []).map((serie: any) => ({
        TurmaSerie: serie.TurmaSerie,
        checked: false,
        expanded: false,
        turmas: serie.turmas.map((turma: any) => ({
          TurmaGUID: turma.TurmaGUID,
          TurmaNome: turma.TurmaNome,
          checked: false,
          expanded: false,
          alunos: turma.alunos.map((aluno: any) => ({
            MatriculaGUID: aluno.MatriculaGUID,
            UsuarioNome: aluno.UsuarioNome,
            checked: false
          }))
        }))
      }));

      setSeries(seriesData);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar alunos');
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

  const toggleTurma = (serieIndex: number, turmaIndex: number) => {
    setSeries(prev => prev.map((serie, sIdx) =>
      sIdx === serieIndex
        ? {
            ...serie,
            turmas: serie.turmas.map((turma, tIdx) =>
              tIdx === turmaIndex
                ? { ...turma, expanded: !turma.expanded }
                : turma
            )
          }
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
              checked,
              alunos: turma.alunos.map(aluno => ({ ...aluno, checked }))
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
          ? {
              ...turma,
              checked,
              alunos: turma.alunos.map(aluno => ({ ...aluno, checked }))
            }
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

  const checkAluno = (serieIndex: number, turmaIndex: number, alunoIndex: number, checked: boolean) => {
    setSeries(prev => prev.map((serie, sIdx) => {
      if (sIdx !== serieIndex) return serie;

      const turmasAtualizadas = serie.turmas.map((turma, tIdx) => {
        if (tIdx !== turmaIndex) return turma;

        const alunosAtualizados = turma.alunos.map((aluno, aIdx) =>
          aIdx === alunoIndex ? { ...aluno, checked } : aluno
        );

        const todosAlunosMarcados = alunosAtualizados.every(a => a.checked);
        return {
          ...turma,
          checked: todosAlunosMarcados,
          alunos: alunosAtualizados
        };
      });

      const todasTurmasMarcadas = turmasAtualizadas.every(t => t.checked);

      return {
        ...serie,
        checked: todasTurmasMarcadas,
        turmas: turmasAtualizadas
      };
    }));
  };

  const obterMatriculasSelecionadas = (): string[] => {
    const matriculas: string[] = [];
    series.forEach(serie => {
      serie.turmas.forEach(turma => {
        turma.alunos.forEach(aluno => {
          if (aluno.checked) {
            matriculas.push(aluno.MatriculaGUID);
          }
        });
      });
    });
    return matriculas;
  };

  // Turmas que têm ao menos 1 aluno selecionado (o cronograma é por turma,
  // não por aluno — o prazo calculado para uma turma vale para todos os
  // alunos marcados dentro dela)
  const obterTurmasComAlunosSelecionados = (): { TurmaGUID: string; TurmaNome: string }[] => {
    const turmas: { TurmaGUID: string; TurmaNome: string }[] = [];
    series.forEach(serie => {
      serie.turmas.forEach(turma => {
        if (turma.alunos.some(a => a.checked)) {
          turmas.push({ TurmaGUID: turma.TurmaGUID, TurmaNome: turma.TurmaNome });
        }
      });
    });
    return turmas;
  };

  const turmaDoAluno = (matriculaGUID: string): string | null => {
    for (const serie of series) {
      for (const turma of serie.turmas) {
        if (turma.alunos.some(a => a.MatriculaGUID === matriculaGUID)) {
          return turma.TurmaGUID;
        }
      }
    }
    return null;
  };

  // diasOverride permite passar o dia escolhido sem depender do state (que
  // ainda não teria sido atualizado se chamado logo após um setResultadosCalculo)
  const handleCalcularDatas = async (diasOverride?: Record<string, DiaSemana>) => {
    const turmasComAlunos = obterTurmasComAlunosSelecionados();
    if (turmasComAlunos.length === 0) {
      setErro('Selecione ao menos um aluno antes de calcular as datas.');
      return;
    }
    if (!semanaBase) {
      setErro('Informe a semana de referência.');
      return;
    }

    const materiaSelecionadaAtual = materiasUnicas.find(m => m.MatProfTurGUID === form.matXprofXturxescGUID);
    if (!materiaSelecionadaAtual) {
      setErro('Selecione uma matéria antes de calcular.');
      return;
    }

    setErro(null);
    setCalculandoDatas(true);

    try {
      const resultados = await GradeHorariaAPI.calcularDatas(
        materiaSelecionadaAtual.MateriaGUID,
        turmasComAlunos.map(({ TurmaGUID }) => ({
          TurmaGUID,
          SemanaBase: semanaBase,
          DeslocamentoMinutos: deslocamentoMinutos || 0,
          DiaSemana: diasOverride?.[TurmaGUID] ?? resultadosCalculo[TurmaGUID]?.diaEscolhido,
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
    setCompartilhadaReadonly(false);
    setForm({
      matXprofXturxescGUID: materiasUnicas.length === 1 ? materiasUnicas[0].MatProfTurGUID : '',
      TarefaTitulo: '',
      TarefaConteudo: '',
      TarefaPrazoData: obterDataPadraoFimDoDia(),
      TarefaTipoEntrega: 'digital',
      TarefaCompartilhada: false,
      TarefaMinPessoas: null,
      TarefaMaxPessoas: null,
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
      // MODO EDIÇÃO: Atualizar tarefa existente
      if (editingGUID) {
        const payload = {
          tarefa: {
            TarefaTitulo: form.TarefaTitulo,
            TarefaConteudo: form.TarefaConteudo || undefined,
            TarefaPrazoData: converterParaBrasil(form.TarefaPrazoData), // Converte do timezone do usuário para GMT-3
            TarefaTipoEntrega: form.TarefaTipoEntrega,
            TarefaMinPessoas: form.TarefaCompartilhada ? form.TarefaMinPessoas : null,
            TarefaMaxPessoas: form.TarefaCompartilhada ? form.TarefaMaxPessoas : null,
          },
        };

        const response = await fetch(`/api/tarefa/${editingGUID}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || 'Erro ao atualizar tarefa');
        }

        alert('Tarefa atualizada com sucesso!');
        limparFormulario();
        await carregarTarefas();
        return;
      }

      // MODO CRIAÇÃO: Criar tarefas em lote
      const matriculasSelecionadas = obterMatriculasSelecionadas();

      if (matriculasSelecionadas.length === 0) {
        throw new Error('Selecione pelo menos um aluno');
      }

      let datasPorMatricula: Record<string, string> | undefined;
      let prazoParaEnvio = form.TarefaPrazoData ? converterParaBrasil(form.TarefaPrazoData) : '';

      if (agendamentoAutomatico) {
        datasPorMatricula = {};
        for (const matriculaGUID of matriculasSelecionadas) {
          const turmaGUID = turmaDoAluno(matriculaGUID);
          const resultado = turmaGUID ? resultadosCalculo[turmaGUID] : undefined;

          if (!resultado) {
            throw new Error('Clique em "Calcular Datas" antes de salvar.');
          }

          if (resultado.status === 'ok' && resultado.DataCalculada) {
            datasPorMatricula[matriculaGUID] = resultado.DataCalculada;
          } else if (resultado.status === 'semCronograma') {
            if (!resultado.dataManual) {
              throw new Error('Uma das turmas selecionadas não tem cronograma configurado — defina o prazo manualmente para ela.');
            }
            datasPorMatricula[matriculaGUID] = converterParaBrasil(resultado.dataManual);
          } else if (resultado.status === 'escolherDia') {
            throw new Error('Escolha o dia da semana para a(s) turma(s) com mais de uma aula por semana antes de salvar.');
          } else {
            throw new Error(resultado.mensagem || 'Não foi possível calcular o prazo para uma das turmas selecionadas.');
          }
        }

        prazoParaEnvio = Object.values(datasPorMatricula)[0] || prazoParaEnvio;
      }

      // Criar todas as tarefas em uma única requisição batch
      const payload = {
        tarefa: {
          MatriculasGUID: matriculasSelecionadas, // Array de GUIDs
          matXprofXturxescGUID: form.matXprofXturxescGUID,
          TarefaTitulo: form.TarefaTitulo,
          TarefaConteudo: form.TarefaConteudo || undefined,
          TarefaPrazoData: prazoParaEnvio, // Já em GMT-3 (manual: convertido do navegador; automático: calculado no servidor)
          TarefaTipoEntrega: form.TarefaTipoEntrega,
          TarefaCompartilhada: form.TarefaCompartilhada,
          TarefaMinPessoas: form.TarefaCompartilhada ? form.TarefaMinPessoas : null,
          TarefaMaxPessoas: form.TarefaCompartilhada ? form.TarefaMaxPessoas : null,
          DatasPorMatricula: datasPorMatricula,
        },
      };

      const response = await fetch('/api/tarefa/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Erro ao salvar tarefas');
      }

      alert(`${data.data.count} tarefa(s) criada(s) com sucesso!`);
      limparFormulario();
      await carregarTarefas();
      setModalAberto(false);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao salvar tarefas');
    } finally {
      setSubmitting(false);
    }
  };

  const editarTarefa = (tarefa: any) => {
    setEditingGUID(tarefa.TarefaGUID);
    setCompartilhadaReadonly(!!tarefa.TarefaCompartilhada);
    setForm({
      matXprofXturxescGUID: tarefa.matXprofXturxescGUID,
      TarefaTitulo: tarefa.TarefaTitulo,
      TarefaConteudo: tarefa.TarefaConteudo || '',
      TarefaPrazoData: converterDoBrasil(tarefa.TarefaPrazoData), // Converte GMT-3 para timezone do usuário
      TarefaTipoEntrega: tarefa.TarefaTipoEntrega,
      TarefaCompartilhada: !!tarefa.TarefaCompartilhada,
      TarefaMinPessoas: tarefa.TarefaMinPessoas,
      TarefaMaxPessoas: tarefa.TarefaMaxPessoas,
    });
    // Scroll para o topo para visualizar o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const excluirTarefa = async (tarefaGUID: string) => {
    if (!confirm('Deseja excluir esta tarefa?')) return;
    try {
      const response = await fetch(`/api/tarefa/${tarefaGUID}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Erro ao excluir tarefa');
      await carregarTarefas();
    } catch (err: any) {
      setErro(err?.message || 'Falha ao excluir tarefa');
    }
  };

  const materiaSelecionada = materias.find(m => m.MatProfTurGUID === form.matXprofXturxescGUID);
  const totalAlunosSelecionados = obterMatriculasSelecionadas().length;

  return (
    <div className={styles.container}>
      {/* Aviso de Timezone */}
      {mostrarAvisoTimezone && (
        <div className={styles.timezoneAlert}>
          <Icon name="clock" size={16} /> <strong>Atenção:</strong> Você está em um fuso horário diferente do Brasil (GMT-3).
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
              value={form.matXprofXturxescGUID}
              onChange={(e) => {
                setForm(prev => ({ ...prev, matXprofXturxescGUID: e.target.value }));
                setSeries([]); // Limpar seleção de alunos ao mudar matéria
              }}
              required
            >
              <option value="">Selecione uma matéria</option>
              {materiasUnicas.map(materia => (
                <option key={materia.MatProfTurGUID} value={materia.MatProfTurGUID}>
                  {materia.MateriaNome}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Campo de Alunos (Modal) - Oculto no modo de edição */}
        {!editingGUID && (
          <div className={styles.formGroup}>
            <label>Alunos *</label>
            <button
              type="button"
              onClick={abrirModalAlunos}
              className={styles.selectButton}
              disabled={!form.matXprofXturxescGUID}
            >
              {totalAlunosSelecionados === 0
                ? 'Selecionar Alunos'
                : `${totalAlunosSelecionados} aluno(s) selecionado(s)`}
            </button>
            {!form.matXprofXturxescGUID && (
              <p className={styles.hint}>Selecione uma matéria primeiro</p>
            )}
          </div>
        )}

        <input
          placeholder="Título *"
          value={form.TarefaTitulo}
          onChange={(e) => setForm((prev) => ({ ...prev, TarefaTitulo: e.target.value }))}
          required
        />
        <textarea
          placeholder="Conteúdo"
          value={form.TarefaConteudo}
          onChange={(e) => setForm((prev) => ({ ...prev, TarefaConteudo: e.target.value }))}
        />
        {!editingGUID && (
          <div className={styles.autoAgendamento}>
            <label className={styles.autoAgendamentoChecagem}>
              <input
                type="checkbox"
                checked={agendamentoAutomatico}
                onChange={(e) => setAgendamentoAutomatico(e.target.checked)}
                className={styles.checkbox}
              />
              Definir prazo automaticamente pelo cronograma das turmas
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
                    disabled={calculandoDatas || totalAlunosSelecionados === 0 || !semanaBase}
                  >
                    {calculandoDatas ? 'Calculando...' : 'Calcular Datas'}
                  </button>
                </div>

                {totalAlunosSelecionados === 0 && (
                  <p className={styles.hint}>Selecione ao menos um aluno acima antes de calcular.</p>
                )}

                {(() => {
                  const turmasComEscolha = obterTurmasComAlunosSelecionados().filter(
                    ({ TurmaGUID }) => resultadosCalculo[TurmaGUID]?.status === 'escolherDia'
                  );
                  const maxOcorrencias = turmasComEscolha.reduce(
                    (max, { TurmaGUID }) => Math.max(max, resultadosCalculo[TurmaGUID]?.Ocorrencias?.length || 0),
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
                  {obterTurmasComAlunosSelecionados().map(({ TurmaGUID, TurmaNome }) => {
                    const resultado = resultadosCalculo[TurmaGUID];
                    if (!resultado) return null;

                    if (resultado.status === 'ok') {
                      return (
                        <div key={TurmaGUID} className={`${styles.resultadoTurma} ${styles.resultadoOk}`}>
                          <strong>{TurmaNome}</strong>
                          <span>
                            {new Date(resultado.DataCalculada!).toLocaleString('pt-BR')} ({resultado.DiaSemana})
                          </span>
                        </div>
                      );
                    }

                    if (resultado.status === 'escolherDia') {
                      return (
                        <div key={TurmaGUID} className={`${styles.resultadoTurma} ${styles.resultadoAviso}`}>
                          <strong>{TurmaNome}</strong>
                          <span>Esta matéria tem mais de uma aula por semana nesta turma. Escolha qual usar:</span>
                          <select
                            value={resultado.diaEscolhido || ''}
                            onChange={(e) => handleEscolherDia(TurmaGUID, e.target.value as DiaSemana)}
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
                        <div key={TurmaGUID} className={`${styles.resultadoTurma} ${styles.resultadoAviso}`}>
                          <strong>{TurmaNome}</strong>
                          <span>Esta turma não tem cronograma configurado para esta matéria. Defina o prazo manualmente:</span>
                          <input
                            type="datetime-local"
                            value={resultado.dataManual || ''}
                            onChange={(e) => handleDataManual(TurmaGUID, e.target.value)}
                          />
                        </div>
                      );
                    }

                    return (
                      <div key={TurmaGUID} className={`${styles.resultadoTurma} ${styles.resultadoErro}`}>
                        <strong>{TurmaNome}</strong>
                        <span>{resultado.mensagem || 'Não foi possível calcular o prazo.'}</span>
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
            value={form.TarefaPrazoData}
            onChange={(e) => setForm((prev) => ({ ...prev, TarefaPrazoData: e.target.value }))}
            required
          />
        )}
        <select
          value={form.TarefaTipoEntrega}
          onChange={(e) => setForm((prev) => ({ ...prev, TarefaTipoEntrega: e.target.value as 'digital' | 'fisica' }))}
        >
          <option value="digital">Digital</option>
          <option value="fisica">Física</option>
        </select>

        {/* Checkbox Tarefa Compartilhada */}
        <div className={styles.formGroup}>
          <label htmlFor="tarefaCompartilhada" className={styles.checkboxLabel}>
            <input
              type="checkbox"
              id="tarefaCompartilhada"
              name="tarefaCompartilhada"
              checked={form.TarefaCompartilhada}
              disabled={compartilhadaReadonly}
              onChange={(e) => {
                const checked = e.target.checked;
                setForm({
                  ...form,
                  TarefaCompartilhada: checked,
                  TarefaMinPessoas: checked ? 1 : null,
                  TarefaMaxPessoas: checked ? 5 : null
                });
              }}
            />
            <span>Tarefa Compartilhada (alunos trabalham em grupos)</span>
          </label>
          <p className={styles.helpText}>
            Ao marcar esta opção, cada aluno receberá um grupo próprio e poderá convidar colegas.
          </p>
          {compartilhadaReadonly && (
            <p className={styles.warning}>
              <Icon name="alert-triangle" size={16} /> Não é possível alterar o tipo de tarefa após criação
            </p>
          )}
        </div>

        {/* Configuração de Grupos (condicional) */}
        {form.TarefaCompartilhada && (
          <div className={styles.grupoConfiguracao}>
            <h3>Configuração de Grupos</h3>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="minPessoas">Mínimo de Pessoas *</label>
                <input
                  type="number"
                  id="minPessoas"
                  name="minPessoas"
                  min="1"
                  value={form.TarefaMinPessoas || 1}
                  onChange={(e) => {
                    const min = parseInt(e.target.value);
                    setForm({
                      ...form,
                      TarefaMinPessoas: min,
                      TarefaMaxPessoas: Math.max(min, form.TarefaMaxPessoas || min)
                    });
                  }}
                  required
                />
                <p className={styles.helpText}>Quantidade mínima de pessoas por grupo</p>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="maxPessoas">Máximo de Pessoas *</label>
                <input
                  type="number"
                  id="maxPessoas"
                  name="maxPessoas"
                  min={form.TarefaMinPessoas || 1}
                  value={form.TarefaMaxPessoas || 5}
                  onChange={(e) => setForm({
                    ...form,
                    TarefaMaxPessoas: parseInt(e.target.value)
                  })}
                  required
                />
                <p className={styles.helpText}>Quantidade máxima de pessoas por grupo</p>
              </div>
            </div>

            <div className={styles.configPreview}>
              <strong>Grupos serão criados com:</strong>
              <ul>
                <li>Mínimo: {form.TarefaMinPessoas || 1} pessoa(s)</li>
                <li>Máximo: {form.TarefaMaxPessoas || 5} pessoa(s)</li>
                <li>Cada aluno começa como líder do próprio grupo</li>
              </ul>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <button type="submit" disabled={submitting || (!editingGUID && totalAlunosSelecionados === 0)}>
            {submitting ? 'Salvando...' : editingGUID ? 'Atualizar Tarefa' : `Criar ${totalAlunosSelecionados > 0 ? `(${totalAlunosSelecionados})` : ''}`}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => alert('A função de anexar será implementada no futuro.')}
          >
            Anexar
          </button>
          {editingGUID && (
            <button type="button" className={styles.secondaryButton} onClick={limparFormulario}>
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      {erro && <p className={styles.error}>{erro}</p>}

      {/* Modal de Seleção de Alunos */}
      {modalAberto && (
        <div className={styles.modalOverlay} onClick={() => setModalAberto(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Selecionar Alunos</h2>
              <button className={styles.modalClose} onClick={() => setModalAberto(false)}>×</button>
            </div>

            {materiaSelecionada && (
              <div className={styles.modalInfo}>
                <p><strong>Matéria:</strong> {materiaSelecionada.MateriaNome}</p>
              </div>
            )}

            <div className={styles.modalBody}>
              {loadingModal ? (
                <p className={styles.loading}>Carregando alunos...</p>
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
                          ({serie.turmas.reduce((acc, t) => acc + t.alunos.length, 0)} alunos)
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
                                <button
                                  type="button"
                                  onClick={() => toggleTurma(sIdx, tIdx)}
                                  className={styles.expandButton}
                                >
                                  {turma.expanded ? '▼' : '▶'} {turma.TurmaNome}
                                </button>
                                <span className={styles.count}>({turma.alunos.length} alunos)</span>
                              </div>

                              {/* Alunos da Turma */}
                              {turma.expanded && (
                                <div className={styles.alunosList}>
                                  {turma.alunos.map((aluno, aIdx) => (
                                    <div key={aIdx} className={styles.alunoItem}>
                                      <input
                                        type="checkbox"
                                        checked={aluno.checked}
                                        onChange={(e) => checkAluno(sIdx, tIdx, aIdx, e.target.checked)}
                                        className={styles.checkbox}
                                      />
                                      <label>
                                        {aluno.UsuarioNome}
                                        <span className={styles.matriculaId}> ({aluno.MatriculaGUID})</span>
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              )}
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
              <p><strong>{totalAlunosSelecionados}</strong> aluno(s) selecionado(s)</p>
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
        <h2>Tarefas cadastradas</h2>
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <ul className={styles.list}>
            {tarefas.map((tarefa) => (
              <li key={tarefa.TarefaGUID} className={styles.card}>
                <div>
                  <strong>{tarefa.TarefaTitulo}</strong>
                  <p>Prazo: {new Date(tarefa.TarefaPrazoData).toLocaleString('pt-BR')}</p>
                  <p>Entrega: {tarefa.TarefaTipoEntrega}</p>
                </div>
                <div className={styles.cardActions}>
                  <button type="button" onClick={() => editarTarefa(tarefa)}>Editar</button>
                  <button type="button" onClick={() => excluirTarefa(tarefa.TarefaGUID)}>Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
