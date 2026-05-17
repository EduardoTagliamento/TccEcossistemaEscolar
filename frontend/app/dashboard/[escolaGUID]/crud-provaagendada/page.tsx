'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './page.module.css';

interface Prova {
  ProvaAgendadaGUID: string;
  TurmaGUID: string;
  MateriaGUID: string;
  ProvaData: string;
  ProvaDescricao: string | null;
  ProvaStatus: 'Agendada' | 'Realizada' | 'Cancelada';
}

export default function CrudProvaAgendadaPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, token, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  const [provas, setProvas] = useState<Prova[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingGUID, setEditingGUID] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState({
    TurmaGUID: '',
    MateriaGUID: '',
    ProvaData: '',
    ProvaDescricao: '',
    ProvaStatus: 'Agendada' as 'Agendada' | 'Realizada' | 'Cancelada',
  });

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }
    if (usuario) {
      void carregarProvas();
    }
  }, [usuario, authLoading]);

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

  const limparFormulario = () => {
    setEditingGUID(null);
    setForm({
      TurmaGUID: '',
      MateriaGUID: '',
      ProvaData: '',
      ProvaDescricao: '',
      ProvaStatus: 'Agendada',
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErro(null);

    try {
      const createPayload = {
        prova: {
          TurmaGUID: form.TurmaGUID,
          MateriaGUID: form.MateriaGUID,
          ProvaData: new Date(form.ProvaData).toISOString(),
          ProvaDescricao: form.ProvaDescricao || undefined,
        },
      };

      const updatePayload = {
        prova: {
          ProvaData: new Date(form.ProvaData).toISOString(),
          ProvaDescricao: form.ProvaDescricao || undefined,
          ProvaStatus: form.ProvaStatus,
        },
      };

      const response = await fetch(editingGUID ? `/api/prova/${editingGUID}` : '/api/prova', {
        method: editingGUID ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingGUID ? updatePayload : createPayload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Erro ao salvar prova');

      limparFormulario();
      await carregarProvas();
    } catch (err: any) {
      setErro(err?.message || 'Falha ao salvar prova');
    } finally {
      setSubmitting(false);
    }
  };

  const editarProva = (prova: Prova) => {
    setEditingGUID(prova.ProvaAgendadaGUID);
    setForm({
      TurmaGUID: prova.TurmaGUID,
      MateriaGUID: prova.MateriaGUID,
      ProvaData: prova.ProvaData.slice(0, 16),
      ProvaDescricao: prova.ProvaDescricao || '',
      ProvaStatus: prova.ProvaStatus,
    });
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>CRUD de Prova Agendada</h1>
        <Link href={`/dashboard/${escolaGUID}`} className={styles.backLink}>Voltar ao Dashboard</Link>
      </header>

      <form className={styles.form} onSubmit={onSubmit}>
        <input
          placeholder="TurmaGUID"
          value={form.TurmaGUID}
          onChange={(e) => setForm((prev) => ({ ...prev, TurmaGUID: e.target.value }))}
          required
        />
        <input
          placeholder="MateriaGUID"
          value={form.MateriaGUID}
          onChange={(e) => setForm((prev) => ({ ...prev, MateriaGUID: e.target.value }))}
          required
        />
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
        <select
          value={form.ProvaStatus}
          onChange={(e) => setForm((prev) => ({ ...prev, ProvaStatus: e.target.value as 'Agendada' | 'Realizada' | 'Cancelada' }))}
        >
          <option value="Agendada">Agendada</option>
          <option value="Realizada">Realizada</option>
          <option value="Cancelada">Cancelada</option>
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
        <h2>Provas cadastradas</h2>
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <ul className={styles.list}>
            {provas.map((prova) => (
              <li key={prova.ProvaAgendadaGUID} className={styles.card}>
                <div>
                  <strong>{prova.ProvaDescricao || 'Prova agendada'}</strong>
                  <p>Data: {new Date(prova.ProvaData).toLocaleString('pt-BR')}</p>
                  <p>Status: {prova.ProvaStatus}</p>
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
