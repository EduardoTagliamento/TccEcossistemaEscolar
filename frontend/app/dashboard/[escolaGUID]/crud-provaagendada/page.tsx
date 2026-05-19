'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './page.module.css';

interface Prova {
  ProvaAgendadaGUID: string;
  MateriaGUID: string;
  ProvaData: string;
  ProvaDescricao: string | null;
  ProvaStatus: 'Agendada' | 'Realizada' | 'Cancelada';
  TurmasAtribuidas: string[];
}

interface MateriaOption {
  MatProfTurGUID: string;
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

  const [provas, setProvas] = useState<Prova[]>([]);
  const [materias, setMaterias] = useState<MateriaOption[]>([]);
  const [series, setSeries] = useState<SerieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingGUID, setEditingGUID] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [form, setForm] = useState({
    MateriaGUID: '',
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
      const materiasData = data?.data || [];
      setMaterias(materiasData);

      // Auto-preencher se tiver apenas uma matéria
      if (materiasData.length === 1) {
        setForm(prev => ({ ...prev, MateriaGUID: materiasData[0].MatProfTurGUID }));
      }
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar matérias');
    }
  };

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
    if (!form.MateriaGUID) {
      alert('Por favor, selecione uma matéria primeiro.');
      return;
    }

    setModalAberto(true);
    setLoadingModal(true);
    setErro(null);

    try {
      const url = `/api/professor/turmas-alunos?MatProfTurGUID=${form.MateriaGUID}`;

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
      MateriaGUID: materias.length === 1 ? materias[0].MatProfTurGUID : '',
      ProvaData: obterDataPadraoFimDoDia(),
      ProvaDescricao: '',
      ProvaStatus: 'Agendada',
    });
    setSeries([]);
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
            ProvaData: new Date(form.ProvaData).toISOString(),
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

      const payload = {
        prova: {
          TurmasGUID: turmasSelecionadas,
          MateriaGUID: form.MateriaGUID,
          ProvaData: new Date(form.ProvaData).toISOString(),
          ProvaDescricao: form.ProvaDescricao || undefined,
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
      ProvaData: prova.ProvaData.slice(0, 16),
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

  const materiaSelecionada = materias.find(m => m.MatProfTurGUID === form.MateriaGUID);
  const totalTurmasSelecionadas = obterTurmasSelecionadas().length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{editingGUID ? '✏️ Editando Prova' : 'Cadastro de Prova Agendada'}</h1>
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
              value={form.MateriaGUID}
              onChange={(e) => {
                setForm(prev => ({ ...prev, MateriaGUID: e.target.value }));
                setSeries([]); // Limpar seleção de turmas ao mudar matéria
              }}
              required
              disabled={!!editingGUID}
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

        {/* Campo de Turmas (Modal) - Oculto no modo de edição */}
        {!editingGUID && (
          <div className={styles.formGroup}>
            <label>Turmas *</label>
            <button
              type="button"
              onClick={abrirModalTurmas}
              className={styles.selectButton}
              disabled={!form.MateriaGUID}
            >
              {totalTurmasSelecionadas === 0
                ? 'Selecionar Turmas'
                : `${totalTurmasSelecionadas} turma(s) selecionada(s)`}
            </button>
            {!form.MateriaGUID && (
              <p className={styles.hint}>Selecione uma matéria primeiro</p>
            )}
          </div>
        )}

        <input
          type="datetime-local"
          value={form.ProvaData}
          onChange={(e) => setForm((prev) => ({ ...prev, ProvaData: e.target.value }))}
          required
        />
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
                <p><strong>Turma:</strong> {materiaSelecionada.TurmaSerie}º {materiaSelecionada.TurmaNome}</p>
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
