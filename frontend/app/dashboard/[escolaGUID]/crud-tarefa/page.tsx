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

export default function CrudTarefaPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, token, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingGUID, setEditingGUID] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState({
    MatriculaGUID: '',
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
      void carregarTarefas();
    }
  }, [usuario, authLoading]);

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

  const limparFormulario = () => {
    setEditingGUID(null);
    setForm({
      MatriculaGUID: '',
      matXprofXturxescGUID: '',
      TarefaTitulo: '',
      TarefaConteudo: '',
      TarefaPrazoData: '',
      TarefaTipoEntrega: 'digital',
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErro(null);

    try {
      const payload = {
        tarefa: {
          MatriculaGUID: form.MatriculaGUID,
          matXprofXturxescGUID: form.matXprofXturxescGUID,
          TarefaTitulo: form.TarefaTitulo,
          TarefaConteudo: form.TarefaConteudo || undefined,
          TarefaPrazoData: new Date(form.TarefaPrazoData).toISOString(),
          TarefaTipoEntrega: form.TarefaTipoEntrega,
        },
      };

      const url = editingGUID ? `/api/tarefa/${editingGUID}` : '/api/tarefa';
      const method = editingGUID ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
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

      limparFormulario();
      await carregarTarefas();
    } catch (err: any) {
      setErro(err?.message || 'Falha ao salvar tarefa');
    } finally {
      setSubmitting(false);
    }
  };

  const editarTarefa = (tarefa: Tarefa) => {
    setEditingGUID(tarefa.TarefaGUID);
    setForm({
      MatriculaGUID: tarefa.MatriculaGUID,
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>CRUD de Tarefa</h1>
        <Link href={`/dashboard/${escolaGUID}`} className={styles.backLink}>Voltar ao Dashboard</Link>
      </header>

      <form className={styles.form} onSubmit={onSubmit}>
        <input
          placeholder="MatriculaGUID"
          value={form.MatriculaGUID}
          onChange={(e) => setForm((prev) => ({ ...prev, MatriculaGUID: e.target.value }))}
          required
        />
        <input
          placeholder="matXprofXturxescGUID"
          value={form.matXprofXturxescGUID}
          onChange={(e) => setForm((prev) => ({ ...prev, matXprofXturxescGUID: e.target.value }))}
          required
        />
        <input
          placeholder="Título"
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
          <button type="submit" disabled={submitting}>
            {editingGUID ? 'Atualizar' : 'Criar'}
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
