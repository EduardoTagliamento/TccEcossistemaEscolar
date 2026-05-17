'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './page.module.css';

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
  MateriaNome: string;
  TurmaNome: string;
  TurmaSerie: string;
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

export default function CrudTarefaPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, token, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [materias, setMaterias] = useState<MateriaOption[]>([]);
  const [series, setSeries] = useState<SerieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingGUID, setEditingGUID] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [form, setForm] = useState({
    matXprofXturxescGUID: '',
    TarefaTitulo: '',
    TarefaConteudo: '',
    TarefaPrazoData: '',
    TarefaTipoEntrega: 'digital' as 'digital' | 'fisica',
  });

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
      const materiasData = data?.data || [];
      setMaterias(materiasData);

      // Auto-preencher se tiver apenas uma matéria
      if (materiasData.length === 1) {
        setForm(prev => ({ ...prev, matXprofXturxescGUID: materiasData[0].MatProfTurGUID }));
      }
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar matérias');
    }
  };

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

    try {
      const response = await fetch(
        `/api/professor/turmas-alunos?MatProfTurGUID=${form.matXprofXturxescGUID}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
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

  const limparFormulario = () => {
    setEditingGUID(null);
    setForm({
      matXprofXturxescGUID: materias.length === 1 ? materias[0].MatProfTurGUID : '',
      TarefaTitulo: '',
      TarefaConteudo: '',
      TarefaPrazoData: '',
      TarefaTipoEntrega: 'digital',
    });
    setSeries([]);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErro(null);

    try {
      const matriculasSelecionadas = obterMatriculasSelecionadas();

      if (matriculasSelecionadas.length === 0) {
        throw new Error('Selecione pelo menos um aluno');
      }

      // Criar uma tarefa para cada matrícula selecionada
      const promessas = matriculasSelecionadas.map(async (matriculaGUID) => {
        const payload = {
          tarefa: {
            MatriculaGUID: matriculaGUID,
            matXprofXturxescGUID: form.matXprofXturxescGUID,
            TarefaTitulo: form.TarefaTitulo,
            TarefaConteudo: form.TarefaConteudo || undefined,
            TarefaPrazoData: new Date(form.TarefaPrazoData).toISOString(),
            TarefaTipoEntrega: form.TarefaTipoEntrega,
          },
        };

        const response = await fetch('/api/tarefa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || 'Erro ao salvar tarefa');
        }

        return data;
      });

      await Promise.all(promessas);

      alert(`${matriculasSelecionadas.length} tarefa(s) criada(s) com sucesso!`);
      limparFormulario();
      await carregarTarefas();
      setModalAberto(false);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao salvar tarefas');
    } finally {
      setSubmitting(false);
    }
  };

  const editarTarefa = (tarefa: Tarefa) => {
    setEditingGUID(tarefa.TarefaGUID);
    setForm({
      matXprofXturxescGUID: tarefa.matXprofXturxescGUID,
      TarefaTitulo: tarefa.TarefaTitulo,
      TarefaConteudo: tarefa.TarefaConteudo || '',
      TarefaPrazoData: tarefa.TarefaPrazoData.slice(0, 16),
      TarefaTipoEntrega: tarefa.TarefaTipoEntrega,
    });
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
      <header className={styles.header}>
        <h1>Cadastro de Tarefa</h1>
        <Link href={`/dashboard/${escolaGUID}`} className={styles.backLink}>Voltar ao Dashboard</Link>
      </header>

      <form className={styles.form} onSubmit={onSubmit}>
        {/* Campo de Matéria */}
        <div className={styles.formGroup}>
          <label>Matéria *</label>
          {materias.length === 0 ? (
            <p className={styles.info}>Carregando matérias...</p>
          ) : materias.length === 1 ? (
            <input
              value={`${materias[0].MateriaNome} - ${materias[0].TurmaSerie}º ${materias[0].TurmaNome}`}
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
              {materias.map(materia => (
                <option key={materia.MatProfTurGUID} value={materia.MatProfTurGUID}>
                  {materia.MateriaNome} - {materia.TurmaSerie}º {materia.TurmaNome}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Campo de Alunos (Modal) */}
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
        <input
          type="datetime-local"
          value={form.TarefaPrazoData}
          onChange={(e) => setForm((prev) => ({ ...prev, TarefaPrazoData: e.target.value }))}
          required
        />
        <select
          value={form.TarefaTipoEntrega}
          onChange={(e) => setForm((prev) => ({ ...prev, TarefaTipoEntrega: e.target.value as 'digital' | 'fisica' }))}
        >
          <option value="digital">Digital</option>
          <option value="fisica">Física</option>
        </select>

        <div className={styles.actions}>
          <button type="submit" disabled={submitting || totalAlunosSelecionados === 0}>
            {submitting ? 'Salvando...' : `Criar ${totalAlunosSelecionados > 0 ? `(${totalAlunosSelecionados})` : ''}`}
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
                <p><strong>Turma:</strong> {materiaSelecionada.TurmaSerie}º {materiaSelecionada.TurmaNome}</p>
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
