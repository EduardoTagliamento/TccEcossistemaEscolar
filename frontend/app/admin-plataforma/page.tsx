'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Icon } from '@/components/Icon';
import * as MateriaGlobalAPI from '@/lib/api/materiaglobal.api';
import * as QuestaoBancoAPI from '@/lib/api/questaobanco.api';
import styles from './page.module.css';

const DIFICULDADES: QuestaoBancoAPI.QuestaoBancoDificuldade[] = ['Facil', 'Media', 'Dificil'];

function formularioVazio() {
  return {
    MateriaGlobalGUID: '',
    SubMateriaGlobalGUID: '',
    VestibularGUID: '',
    Dificuldade: 'Media' as QuestaoBancoAPI.QuestaoBancoDificuldade,
    Enunciado: '',
    VideoResolucaoUrl: '',
    Alternativas: [
      { Texto: '', Correta: true },
      { Texto: '', Correta: false },
      { Texto: '', Correta: false },
      { Texto: '', Correta: false },
    ],
  };
}

export default function AdminPlataformaPage() {
  const { usuario, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !usuario) router.push('/login');
  }, [authLoading, usuario, router]);

  const ehAdmin = !!usuario?.UsuarioIsPlataformaAdmin;

  // ---- Fila de MateriaGlobal Pendente ----
  const [pendentes, setPendentes] = useState<MateriaGlobalAPI.MateriaGlobal[]>([]);
  const [confirmados, setConfirmados] = useState<MateriaGlobalAPI.MateriaGlobal[]>([]);
  const [mesclarEscolhido, setMesclarEscolhido] = useState<Record<string, string>>({});
  const [carregandoFila, setCarregandoFila] = useState(true);

  const carregarFila = async () => {
    try {
      setCarregandoFila(true);
      const [p, c] = await Promise.all([
        MateriaGlobalAPI.listarMateriasGlobais('Pendente'),
        MateriaGlobalAPI.listarMateriasGlobais('Confirmado'),
      ]);
      setPendentes(p);
      setConfirmados(c);
    } catch (erro: any) {
      alert(erro.message || 'Erro ao carregar fila de matérias globais');
    } finally {
      setCarregandoFila(false);
    }
  };

  const handleConfirmarComoNova = async (guid: string) => {
    try {
      await MateriaGlobalAPI.resolverPendente(guid, null);
      await carregarFila();
    } catch (erro: any) {
      alert(erro.message || 'Erro ao confirmar');
    }
  };

  const handleMesclar = async (guid: string) => {
    const destino = mesclarEscolhido[guid];
    if (!destino) {
      alert('Escolha em qual matéria global mesclar.');
      return;
    }
    try {
      await MateriaGlobalAPI.resolverPendente(guid, destino);
      await carregarFila();
    } catch (erro: any) {
      alert(erro.message || 'Erro ao mesclar');
    }
  };

  // ---- Banco de Questões ----
  const [questoes, setQuestoes] = useState<QuestaoBancoAPI.QuestaoBanco[]>([]);
  const [vestibulares, setVestibulares] = useState<QuestaoBancoAPI.Vestibular[]>([]);
  const [subMaterias, setSubMaterias] = useState<MateriaGlobalAPI.SubMateriaGlobal[]>([]);
  const [form, setForm] = useState(formularioVazio());
  const [novoVestibular, setNovoVestibular] = useState('');
  const [novaSubMateria, setNovaSubMateria] = useState('');
  const [salvandoQuestao, setSalvandoQuestao] = useState(false);
  const [carregandoBanco, setCarregandoBanco] = useState(true);

  const carregarBanco = async () => {
    try {
      setCarregandoBanco(true);
      const [q, v] = await Promise.all([QuestaoBancoAPI.listarQuestoes(), QuestaoBancoAPI.listarVestibulares()]);
      setQuestoes(q);
      setVestibulares(v);
    } catch (erro: any) {
      alert(erro.message || 'Erro ao carregar banco de questões');
    } finally {
      setCarregandoBanco(false);
    }
  };

  useEffect(() => {
    if (!ehAdmin) return;
    void carregarFila();
    void carregarBanco();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ehAdmin]);

  useEffect(() => {
    if (!form.MateriaGlobalGUID) {
      setSubMaterias([]);
      return;
    }
    MateriaGlobalAPI.listarSubMaterias(form.MateriaGlobalGUID)
      .then(setSubMaterias)
      .catch((erro) => alert(erro.message || 'Erro ao carregar submatérias'));
  }, [form.MateriaGlobalGUID]);

  const handleAdicionarVestibular = async () => {
    const nome = novoVestibular.trim();
    if (!nome) return;
    try {
      const criado = await QuestaoBancoAPI.criarVestibular(nome);
      setVestibulares((prev) => [...prev, criado]);
      setForm((prev) => ({ ...prev, VestibularGUID: criado.VestibularGUID }));
      setNovoVestibular('');
    } catch (erro: any) {
      alert(erro.message || 'Erro ao criar vestibular');
    }
  };

  const handleAdicionarSubMateria = async () => {
    const nome = novaSubMateria.trim();
    if (!nome || !form.MateriaGlobalGUID) return;
    try {
      const criada = await MateriaGlobalAPI.criarSubMateria(form.MateriaGlobalGUID, nome);
      setSubMaterias((prev) => [...prev, criada]);
      setForm((prev) => ({ ...prev, SubMateriaGlobalGUID: criada.SubMateriaGlobalGUID }));
      setNovaSubMateria('');
    } catch (erro: any) {
      alert(erro.message || 'Erro ao criar submatéria');
    }
  };

  const handleAlternativaTexto = (indice: number, texto: string) => {
    setForm((prev) => ({
      ...prev,
      Alternativas: prev.Alternativas.map((a, i) => (i === indice ? { ...a, Texto: texto } : a)),
    }));
  };

  const handleAlternativaCorreta = (indice: number) => {
    setForm((prev) => ({
      ...prev,
      Alternativas: prev.Alternativas.map((a, i) => ({ ...a, Correta: i === indice })),
    }));
  };

  const handleSalvarQuestao = async () => {
    if (!form.MateriaGlobalGUID || !form.SubMateriaGlobalGUID || !form.VestibularGUID) {
      alert('Selecione matéria global, submatéria e vestibular.');
      return;
    }
    if (!form.Enunciado.trim()) {
      alert('Informe o enunciado.');
      return;
    }
    const alternativasPreenchidas = form.Alternativas.filter((a) => a.Texto.trim());
    if (alternativasPreenchidas.length < 2) {
      alert('Preencha pelo menos 2 alternativas.');
      return;
    }

    setSalvandoQuestao(true);
    try {
      await QuestaoBancoAPI.criarQuestao({
        MateriaGlobalGUID: form.MateriaGlobalGUID,
        SubMateriaGlobalGUID: form.SubMateriaGlobalGUID,
        VestibularGUID: form.VestibularGUID,
        Dificuldade: form.Dificuldade,
        Enunciado: form.Enunciado.trim(),
        VideoResolucaoUrl: form.VideoResolucaoUrl.trim() || undefined,
        Alternativas: alternativasPreenchidas,
      });
      setForm(formularioVazio());
      await carregarBanco();
    } catch (erro: any) {
      alert(erro.message || 'Erro ao criar questão');
    } finally {
      setSalvandoQuestao(false);
    }
  };

  const handleExcluirQuestao = async (guid: string) => {
    if (!confirm('Excluir esta questão do banco?')) return;
    try {
      await QuestaoBancoAPI.excluirQuestao(guid);
      await carregarBanco();
    } catch (erro: any) {
      alert(erro.message || 'Erro ao excluir questão');
    }
  };

  if (authLoading || !usuario) {
    return <div className={styles.container}>Carregando...</div>;
  }

  if (!ehAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.acessoNegado}>
          <Icon name="lock" size={32} />
          <h1>Acesso restrito</h1>
          <p>Esta área é exclusiva de administradores de plataforma.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.titulo}><Icon name="database" size={22} /> Administração de Plataforma</h1>
      <p className={styles.subtitulo}>Banco de questões universal e taxonomia global — Recomendação de Estudos por IA</p>

      <section className={styles.secao}>
        <h2 className={styles.secaoTitulo}>
          <Icon name="alert-triangle" size={18} /> Fila de matérias globais pendentes ({pendentes.length})
        </h2>
        {carregandoFila ? (
          <p>Carregando...</p>
        ) : pendentes.length === 0 ? (
          <p className={styles.hint}>Nenhuma pendência no momento.</p>
        ) : (
          <ul className={styles.listaPendentes}>
            {pendentes.map((p) => (
              <li key={p.MateriaGlobalGUID} className={styles.itemPendente}>
                <strong>{p.Nome}</strong>
                <div className={styles.acoesPendente}>
                  <button type="button" onClick={() => handleConfirmarComoNova(p.MateriaGlobalGUID)}>
                    Confirmar como nova
                  </button>
                  <select
                    value={mesclarEscolhido[p.MateriaGlobalGUID] || ''}
                    onChange={(e) => setMesclarEscolhido((prev) => ({ ...prev, [p.MateriaGlobalGUID]: e.target.value }))}
                  >
                    <option value="">Mesclar em...</option>
                    {confirmados.map((c) => (
                      <option key={c.MateriaGlobalGUID} value={c.MateriaGlobalGUID}>
                        {c.Nome}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => handleMesclar(p.MateriaGlobalGUID)}>
                    Mesclar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.secao}>
        <h2 className={styles.secaoTitulo}>
          <Icon name="edit" size={18} /> Nova questão do banco universal
        </h2>
        <div className={styles.formQuestao}>
          <div className={styles.linhaForm}>
            <select value={form.MateriaGlobalGUID} onChange={(e) => setForm((p) => ({ ...p, MateriaGlobalGUID: e.target.value, SubMateriaGlobalGUID: '' }))}>
              <option value="">Matéria global...</option>
              {confirmados.map((c) => (
                <option key={c.MateriaGlobalGUID} value={c.MateriaGlobalGUID}>
                  {c.Nome}
                </option>
              ))}
            </select>

            <select value={form.SubMateriaGlobalGUID} onChange={(e) => setForm((p) => ({ ...p, SubMateriaGlobalGUID: e.target.value }))} disabled={!form.MateriaGlobalGUID}>
              <option value="">Submatéria...</option>
              {subMaterias.map((s) => (
                <option key={s.SubMateriaGlobalGUID} value={s.SubMateriaGlobalGUID}>
                  {s.Nome}
                </option>
              ))}
            </select>
          </div>

          {form.MateriaGlobalGUID && (
            <div className={styles.linhaForm}>
              <input placeholder="Nova submatéria (ex: Trigonometria)" value={novaSubMateria} onChange={(e) => setNovaSubMateria(e.target.value)} />
              <button type="button" onClick={handleAdicionarSubMateria} disabled={!novaSubMateria.trim()}>
                Adicionar submatéria
              </button>
            </div>
          )}

          <div className={styles.linhaForm}>
            <select value={form.VestibularGUID} onChange={(e) => setForm((p) => ({ ...p, VestibularGUID: e.target.value }))}>
              <option value="">Vestibular...</option>
              {vestibulares.map((v) => (
                <option key={v.VestibularGUID} value={v.VestibularGUID}>
                  {v.Nome}
                </option>
              ))}
            </select>
            <input placeholder="Novo vestibular (ex: ENEM)" value={novoVestibular} onChange={(e) => setNovoVestibular(e.target.value)} />
            <button type="button" onClick={handleAdicionarVestibular} disabled={!novoVestibular.trim()}>
              Adicionar
            </button>
          </div>

          <div className={styles.linhaForm}>
            <select value={form.Dificuldade} onChange={(e) => setForm((p) => ({ ...p, Dificuldade: e.target.value as QuestaoBancoAPI.QuestaoBancoDificuldade }))}>
              {DIFICULDADES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <textarea placeholder="Enunciado" value={form.Enunciado} onChange={(e) => setForm((p) => ({ ...p, Enunciado: e.target.value }))} rows={4} />

          <div className={styles.alternativas}>
            {form.Alternativas.map((a, i) => (
              <div key={i} className={styles.alternativaLinha}>
                <input
                  type="radio"
                  name="alternativa-correta"
                  checked={a.Correta}
                  onChange={() => handleAlternativaCorreta(i)}
                />
                <input
                  placeholder={`Alternativa ${i + 1}`}
                  value={a.Texto}
                  onChange={(e) => handleAlternativaTexto(i, e.target.value)}
                />
              </div>
            ))}
          </div>

          <input
            placeholder="URL do vídeo de resolução (opcional)"
            value={form.VideoResolucaoUrl}
            onChange={(e) => setForm((p) => ({ ...p, VideoResolucaoUrl: e.target.value }))}
          />

          <button type="button" className={styles.botaoSalvar} onClick={handleSalvarQuestao} disabled={salvandoQuestao}>
            {salvandoQuestao ? 'Salvando...' : 'Salvar questão'}
          </button>
        </div>
      </section>

      <section className={styles.secao}>
        <h2 className={styles.secaoTitulo}>
          <Icon name="list" size={18} /> Questões cadastradas ({questoes.length})
        </h2>
        {carregandoBanco ? (
          <p>Carregando...</p>
        ) : questoes.length === 0 ? (
          <p className={styles.hint}>Nenhuma questão cadastrada ainda.</p>
        ) : (
          <ul className={styles.listaQuestoes}>
            {questoes.map((q) => (
              <li key={q.QuestaoBancoGUID} className={styles.itemQuestao}>
                <div>
                  <span className={styles.badgeDificuldade}>{q.Dificuldade}</span>
                  <p>{q.Enunciado.slice(0, 160)}{q.Enunciado.length > 160 ? '…' : ''}</p>
                </div>
                <button type="button" onClick={() => handleExcluirQuestao(q.QuestaoBancoGUID)}>
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
