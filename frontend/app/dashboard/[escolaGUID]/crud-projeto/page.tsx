'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { criarProjeto } from '@/lib/api/projeto.api';
import { listarTurmas, Turma } from '@/lib/api/turma.api';
import { ProjetoPublicoAlvo } from '@/types/projeto';
import styles from './page.module.css';

export default function CrudProjetoPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({
    ProjetoTitulo: '',
    ProjetoDescricao: '',
    ProjetoMecanicaPontuacao: '',
    ProjetoPublicoAlvo: 'Turmas' as ProjetoPublicoAlvo,
    ProjetoGrupoMinPessoas: 2,
    ProjetoGrupoMaxPessoas: 5,
    ProjetoInscricaoPrazoData: '',
    ProjetoEntregaPrazoData: ''
  });

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }
    if (usuario) {
      void carregarTurmas();
    }
  }, [usuario, authLoading]);

  useEffect(() => {
    const daquiA30Dias = new Date();
    daquiA30Dias.setDate(daquiA30Dias.getDate() + 30);
    daquiA30Dias.setHours(23, 59, 0, 0);
    const ano = daquiA30Dias.getFullYear();
    const mes = String(daquiA30Dias.getMonth() + 1).padStart(2, '0');
    const dia = String(daquiA30Dias.getDate()).padStart(2, '0');
    setForm((prev) => ({ ...prev, ProjetoInscricaoPrazoData: `${ano}-${mes}-${dia}T23:59` }));
  }, []);

  const carregarTurmas = async () => {
    setLoading(true);
    try {
      const { turmas: dados } = await listarTurmas({ EscolaGUID: escolaGUID, TurmaStatus: 'Ativa' });
      setTurmas(dados);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar turmas');
    } finally {
      setLoading(false);
    }
  };

  const toggleTurma = (turmaGUID: string) => {
    setTurmasSelecionadas((prev) => {
      const novo = new Set(prev);
      if (novo.has(turmaGUID)) {
        novo.delete(turmaGUID);
      } else {
        novo.add(turmaGUID);
      }
      return novo;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErro(null);

    if (form.ProjetoPublicoAlvo === 'Turmas' && turmasSelecionadas.size === 0) {
      setErro('Selecione ao menos uma turma, ou escolha "Escola inteira" como público-alvo.');
      return;
    }

    setSubmitting(true);
    try {
      const projeto = await criarProjeto({
        EscolaGUID: escolaGUID,
        ProjetoTitulo: form.ProjetoTitulo,
        ProjetoDescricao: form.ProjetoDescricao,
        ProjetoMecanicaPontuacao: form.ProjetoMecanicaPontuacao || undefined,
        ProjetoPublicoAlvo: form.ProjetoPublicoAlvo,
        TurmasGUID: form.ProjetoPublicoAlvo === 'Turmas' ? Array.from(turmasSelecionadas) : undefined,
        ProjetoGrupoMinPessoas: form.ProjetoGrupoMinPessoas,
        ProjetoGrupoMaxPessoas: form.ProjetoGrupoMaxPessoas,
        ProjetoInscricaoPrazoData: new Date(form.ProjetoInscricaoPrazoData).toISOString(),
        ProjetoEntregaPrazoData: form.ProjetoEntregaPrazoData
          ? new Date(form.ProjetoEntregaPrazoData).toISOString()
          : undefined
      });

      router.push(`/dashboard/${escolaGUID}/projetos/${projeto.ProjetoGUID}`);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao criar projeto');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Carregando...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>🚀 Criar Projeto</h1>
        <Link href={`/dashboard/${escolaGUID}/projetos`} className={styles.backLink}>
          ← Voltar aos Projetos
        </Link>
      </header>

      {erro && <p className={styles.error}>{erro}</p>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span>Título</span>
          <input
            type="text"
            required
            maxLength={128}
            value={form.ProjetoTitulo}
            onChange={(e) => setForm({ ...form, ProjetoTitulo: e.target.value })}
          />
        </label>

        <label className={styles.field}>
          <span>Descrição / ideia do projeto</span>
          <textarea
            required
            maxLength={2048}
            rows={4}
            value={form.ProjetoDescricao}
            onChange={(e) => setForm({ ...form, ProjetoDescricao: e.target.value })}
          />
        </label>

        <label className={styles.field}>
          <span>Mecânica de pontuação (opcional)</span>
          <textarea
            maxLength={1024}
            rows={3}
            placeholder="Como os grupos serão avaliados?"
            value={form.ProjetoMecanicaPontuacao}
            onChange={(e) => setForm({ ...form, ProjetoMecanicaPontuacao: e.target.value })}
          />
        </label>

        <div className={styles.field}>
          <span>Público-alvo</span>
          <div className={styles.radioGroup}>
            <label>
              <input
                type="radio"
                checked={form.ProjetoPublicoAlvo === 'Turmas'}
                onChange={() => setForm({ ...form, ProjetoPublicoAlvo: 'Turmas' })}
              />
              Turmas específicas
            </label>
            <label>
              <input
                type="radio"
                checked={form.ProjetoPublicoAlvo === 'Escola'}
                onChange={() => setForm({ ...form, ProjetoPublicoAlvo: 'Escola' })}
              />
              Escola inteira
            </label>
          </div>
        </div>

        {form.ProjetoPublicoAlvo === 'Turmas' && (
          <div className={styles.field}>
            <span>Turmas elegíveis</span>
            <div className={styles.turmasGrid}>
              {turmas.length === 0 && <p className={styles.turmasVazio}>Nenhuma turma ativa encontrada.</p>}
              {turmas.map((turma) => (
                <label key={turma.TurmaGUID} className={styles.turmaCheckbox}>
                  <input
                    type="checkbox"
                    checked={turmasSelecionadas.has(turma.TurmaGUID)}
                    onChange={() => toggleTurma(turma.TurmaGUID)}
                  />
                  {turma.TurmaSerie} - {turma.TurmaNome}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span>Mínimo de pessoas por grupo</span>
            <input
              type="number"
              min={1}
              required
              value={form.ProjetoGrupoMinPessoas}
              onChange={(e) => setForm({ ...form, ProjetoGrupoMinPessoas: Number(e.target.value) })}
            />
          </label>
          <label className={styles.field}>
            <span>Máximo de pessoas por grupo</span>
            <input
              type="number"
              min={form.ProjetoGrupoMinPessoas}
              required
              value={form.ProjetoGrupoMaxPessoas}
              onChange={(e) => setForm({ ...form, ProjetoGrupoMaxPessoas: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span>Prazo de inscrição (criar/entrar em grupos)</span>
            <input
              type="datetime-local"
              required
              value={form.ProjetoInscricaoPrazoData}
              onChange={(e) => setForm({ ...form, ProjetoInscricaoPrazoData: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span>Prazo de entrega do projeto (opcional)</span>
            <input
              type="datetime-local"
              value={form.ProjetoEntregaPrazoData}
              onChange={(e) => setForm({ ...form, ProjetoEntregaPrazoData: e.target.value })}
            />
          </label>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? 'Criando...' : 'Criar Projeto'}
        </button>
      </form>
    </div>
  );
}
