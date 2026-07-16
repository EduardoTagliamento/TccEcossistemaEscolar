'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { converterParaBrasil, usuarioForaDoBrasil } from '@/lib/timezone-utils';
import * as ConteudoAPI from '@/lib/api/conteudo.api';
import * as CategoriaConteudoAPI from '@/lib/api/categoriaconteudo.api';
import styles from './page.module.css';

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

const TAMANHO_FONTE_OPCOES: { valor: string; label: string }[] = [
  { valor: '2', label: 'Pequena' },
  { valor: '3', label: 'Normal' },
  { valor: '5', label: 'Grande' },
  { valor: '7', label: 'Enorme' },
];

export default function CrudConteudoPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, token, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  const [materias, setMaterias] = useState<MateriaOption[]>([]);
  const [categorias, setCategorias] = useState<CategoriaConteudoAPI.CategoriaConteudo[]>([]);
  const [conteudos, setConteudos] = useState<ConteudoAPI.Conteudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({
    MatProfTurGUID: '',
    CategoriaGUID: '',
    ConteudoTitulo: '',
    ConteudoTipo: 'texto' as ConteudoAPI.ConteudoTipo,
    ConteudoDescricao: '',
    OrigemTipo: 'upload' as ConteudoAPI.ConteudoOrigemTipo,
    LinkUrl: '',
  });

  const [arquivoCronometrado, setArquivoCronometrado] = useState<File | null>(null);
  const [arquivosPaginado, setArquivosPaginado] = useState<File[]>([]);
  const [conteudoHtml, setConteudoHtml] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  const [novaCategoriaAberta, setNovaCategoriaAberta] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');

  const [agendarPublicacao, setAgendarPublicacao] = useState(false); // false = postar agora
  const [dataPublicacaoManual, setDataPublicacaoManual] = useState('');
  const [dataDiferentePorTurma, setDataDiferentePorTurma] = useState(false);
  const [datasPorTurmaManual, setDatasPorTurmaManual] = useState<Record<string, string>>({});

  const [modalTurmasAberto, setModalTurmasAberto] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [series, setSeries] = useState<SerieItem[]>([]);

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }
    if (usuario) {
      void carregarMaterias();
    }
  }, [usuario, authLoading]);

  const carregarMaterias = async () => {
    try {
      const response = await fetch(`/api/professor/materias?EscolaGUID=${escolaGUID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Erro ao carregar matérias');
      setMaterias(data?.data || []);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar matérias');
    } finally {
      setLoading(false);
    }
  };

  // O endpoint /api/professor/materias devolve uma linha por (matéria, turma).
  const materiasUnicas = useMemo(() => {
    const mapa = new Map<string, MateriaOption>();
    materias.forEach((m) => {
      if (!mapa.has(m.MateriaGUID)) mapa.set(m.MateriaGUID, m);
    });
    return Array.from(mapa.values());
  }, [materias]);

  const materiaSelecionada = materiasUnicas.find((m) => m.MatProfTurGUID === form.MatProfTurGUID);

  useEffect(() => {
    if (materiaSelecionada) {
      void carregarCategorias(materiaSelecionada.MateriaGUID);
      void carregarConteudos(materiaSelecionada.MateriaGUID);
    } else {
      setCategorias([]);
      setConteudos([]);
    }
  }, [materiaSelecionada?.MateriaGUID]);

  const carregarCategorias = async (materiaGUID: string) => {
    try {
      const lista = await CategoriaConteudoAPI.listarCategorias({ MateriaGUID: materiaGUID });
      setCategorias(lista);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar categorias');
    }
  };

  const carregarConteudos = async (materiaGUID: string) => {
    try {
      const lista = await ConteudoAPI.listarConteudos({ MateriaGUID: materiaGUID, UsuarioCPF: usuario?.UsuarioCPF });
      setConteudos(lista);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar conteúdos');
    }
  };

  const handleCriarCategoria = async () => {
    if (!materiaSelecionada) return;
    if (!novaCategoriaNome.trim()) {
      setErro('Informe o nome da categoria.');
      return;
    }
    try {
      const categoria = await CategoriaConteudoAPI.criarCategoria(materiaSelecionada.MateriaGUID, novaCategoriaNome.trim());
      setCategorias((prev) => [...prev, categoria].sort((a, b) => a.CategoriaNome.localeCompare(b.CategoriaNome)));
      setForm((prev) => ({ ...prev, CategoriaGUID: categoria.CategoriaGUID }));
      setNovaCategoriaNome('');
      setNovaCategoriaAberta(false);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao criar categoria');
    }
  };

  const excluirCategoriaAtual = async (categoriaGUID: string) => {
    if (!confirm('Excluir esta categoria? Conteúdos já criados nela ficam sem categoria.')) return;
    try {
      await CategoriaConteudoAPI.excluirCategoria(categoriaGUID);
      setCategorias((prev) => prev.filter((c) => c.CategoriaGUID !== categoriaGUID));
      if (form.CategoriaGUID === categoriaGUID) {
        setForm((prev) => ({ ...prev, CategoriaGUID: '' }));
      }
    } catch (err: any) {
      alert(err?.message || 'Falha ao excluir categoria');
    }
  };

  // ===== Modal de turmas =====
  const abrirModalTurmas = async () => {
    if (!form.MatProfTurGUID) {
      alert('Selecione uma matéria primeiro.');
      return;
    }
    setModalTurmasAberto(true);
    setLoadingModal(true);
    setErro(null);

    try {
      const response = await fetch(`/api/professor/turmas-alunos?MatProfTurGUID=${form.MatProfTurGUID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Erro ao carregar turmas');

      const seriesData: SerieItem[] = (data?.data?.series || []).map((serie: any) => ({
        TurmaSerie: serie.TurmaSerie,
        checked: false,
        expanded: false,
        turmas: serie.turmas.map((turma: any) => ({
          TurmaGUID: turma.TurmaGUID,
          TurmaNome: turma.TurmaNome,
          checked: false,
        })),
      }));
      setSeries(seriesData);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar turmas');
    } finally {
      setLoadingModal(false);
    }
  };

  const toggleSerie = (serieIndex: number) => {
    setSeries((prev) => prev.map((serie, idx) => (idx === serieIndex ? { ...serie, expanded: !serie.expanded } : serie)));
  };

  const checkSerie = (serieIndex: number, checked: boolean) => {
    setSeries((prev) =>
      prev.map((serie, sIdx) =>
        sIdx === serieIndex
          ? { ...serie, checked, turmas: serie.turmas.map((turma) => ({ ...turma, checked })) }
          : serie
      )
    );
  };

  const checkTurma = (serieIndex: number, turmaIndex: number, checked: boolean) => {
    setSeries((prev) =>
      prev.map((serie, sIdx) => {
        if (sIdx !== serieIndex) return serie;
        const turmasAtualizadas = serie.turmas.map((turma, tIdx) => (tIdx === turmaIndex ? { ...turma, checked } : turma));
        return { ...serie, checked: turmasAtualizadas.every((t) => t.checked), turmas: turmasAtualizadas };
      })
    );
  };

  const obterTurmasSelecionadas = (): { TurmaGUID: string; TurmaNome: string }[] => {
    const turmas: { TurmaGUID: string; TurmaNome: string }[] = [];
    series.forEach((serie) => {
      serie.turmas.forEach((turma) => {
        if (turma.checked) turmas.push({ TurmaGUID: turma.TurmaGUID, TurmaNome: turma.TurmaNome });
      });
    });
    return turmas;
  };

  const totalTurmasSelecionadas = obterTurmasSelecionadas().length;

  // ===== Editor de texto rico (sem dependência externa) =====
  const aplicarFormato = (comando: string, valor?: string) => {
    editorRef.current?.focus();
    document.execCommand(comando, false, valor);
    setConteudoHtml(editorRef.current?.innerHTML || '');
  };

  const inserirLink = () => {
    const url = window.prompt('URL do link:');
    if (url) aplicarFormato('createLink', url);
  };

  // ===== Utilidades de data =====
  const obterDataAgoraLocal = (): string => {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    const hora = String(agora.getHours()).padStart(2, '0');
    const minuto = String(agora.getMinutes()).padStart(2, '0');
    return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
  };

  const limparFormulario = () => {
    setForm((prev) => ({
      ...prev,
      ConteudoTitulo: '',
      ConteudoDescricao: '',
      LinkUrl: '',
    }));
    setArquivoCronometrado(null);
    setArquivosPaginado([]);
    setConteudoHtml('');
    if (editorRef.current) editorRef.current.innerHTML = '';
    setSeries([]);
    setAgendarPublicacao(false);
    setDataPublicacaoManual('');
    setDataDiferentePorTurma(false);
    setDatasPorTurmaManual({});
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErro(null);

    try {
      if (!materiaSelecionada) {
        throw new Error('Selecione uma matéria.');
      }

      const turmasSelecionadas = obterTurmasSelecionadas();
      if (turmasSelecionadas.length === 0) {
        throw new Error('Selecione pelo menos uma turma.');
      }

      if (form.ConteudoTipo === 'cronometrado') {
        if (form.OrigemTipo === 'upload' && !arquivoCronometrado) {
          throw new Error('Envie um arquivo de vídeo/áudio ou escolha "Link".');
        }
        if (form.OrigemTipo === 'link' && !form.LinkUrl.trim()) {
          throw new Error('Informe o link do vídeo/áudio.');
        }
      } else if (form.ConteudoTipo === 'texto') {
        if (!conteudoHtml.trim()) {
          throw new Error('O texto não pode ficar vazio.');
        }
      } else if (form.ConteudoTipo === 'paginado') {
        if (arquivosPaginado.length === 0) {
          throw new Error('Envie ao menos um arquivo (PDF/PPTX/DOCX ou imagens).');
        }
      }

      let conteudoDataPublicacao: string;
      let datasPorTurma: Record<string, string> | undefined;

      if (!agendarPublicacao) {
        conteudoDataPublicacao = converterParaBrasil(obterDataAgoraLocal());
      } else if (!dataDiferentePorTurma) {
        if (!dataPublicacaoManual) {
          throw new Error('Informe a data/hora de publicação.');
        }
        conteudoDataPublicacao = converterParaBrasil(dataPublicacaoManual);
      } else {
        datasPorTurma = {};
        for (const { TurmaGUID } of turmasSelecionadas) {
          const valor = datasPorTurmaManual[TurmaGUID];
          if (!valor) {
            throw new Error('Informe a data/hora de publicação para todas as turmas selecionadas.');
          }
          datasPorTurma[TurmaGUID] = converterParaBrasil(valor);
        }
        conteudoDataPublicacao = Object.values(datasPorTurma)[0];
      }

      setSubmitting(true);

      await ConteudoAPI.criarConteudo({
        MateriaGUID: materiaSelecionada.MateriaGUID,
        CategoriaGUID: form.CategoriaGUID || null,
        ConteudoTitulo: form.ConteudoTitulo,
        ConteudoTipo: form.ConteudoTipo,
        ConteudoDescricao: form.ConteudoDescricao || undefined,
        TurmasGUID: turmasSelecionadas.map((t) => t.TurmaGUID),
        ConteudoDataPublicacao: conteudoDataPublicacao,
        DatasPorTurma: datasPorTurma,
        OrigemTipo: form.ConteudoTipo === 'cronometrado' ? form.OrigemTipo : undefined,
        LinkUrl: form.ConteudoTipo === 'cronometrado' && form.OrigemTipo === 'link' ? form.LinkUrl.trim() : undefined,
        arquivoCronometrado:
          form.ConteudoTipo === 'cronometrado' && form.OrigemTipo === 'upload' ? arquivoCronometrado || undefined : undefined,
        ConteudoHtml: form.ConteudoTipo === 'texto' ? conteudoHtml : undefined,
        arquivosPaginado: form.ConteudoTipo === 'paginado' ? arquivosPaginado : undefined,
      });

      alert('Conteúdo publicado com sucesso!');
      limparFormulario();
      if (materiaSelecionada) await carregarConteudos(materiaSelecionada.MateriaGUID);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao publicar conteúdo');
    } finally {
      setSubmitting(false);
    }
  };

  const excluirConteudoAtual = async (conteudoGUID: string) => {
    if (!confirm('Excluir este conteúdo? Os alunos deixarão de vê-lo.')) return;
    try {
      await ConteudoAPI.excluirConteudo(conteudoGUID);
      setConteudos((prev) => prev.filter((c) => c.ConteudoGUID !== conteudoGUID));
    } catch (err: any) {
      alert(err?.message || 'Falha ao excluir conteúdo');
    }
  };

  const rotuloTipo: Record<ConteudoAPI.ConteudoTipo, string> = {
    cronometrado: '🎬 Vídeo/Áudio',
    texto: '📝 Texto',
    paginado: '📄 Paginado',
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Cadastro de Conteúdo</h1>
        <Link href={`/dashboard/${escolaGUID}`} className={styles.backLink}>Voltar ao Dashboard</Link>
      </header>

      {usuarioForaDoBrasil() && (
        <div className={styles.hint}>
          🌍 Você está em um fuso horário diferente do Brasil (GMT-3). Datas ajustadas para o seu fuso local.
        </div>
      )}

      {erro && <p className={styles.error}>{erro}</p>}

      <form className={styles.form} onSubmit={onSubmit}>
        {/* Matéria */}
        <div className={styles.formGroup}>
          <label>Matéria *</label>
          {loading ? (
            <p className={styles.hint}>Carregando matérias...</p>
          ) : materiasUnicas.length === 1 ? (
            <input value={materiasUnicas[0].MateriaNome} disabled className={styles.inputDisabled} />
          ) : (
            <select
              value={form.MatProfTurGUID}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, MatProfTurGUID: e.target.value, CategoriaGUID: '' }));
                setSeries([]);
              }}
              required
            >
              <option value="">Selecione uma matéria</option>
              {materiasUnicas.map((materia) => (
                <option key={materia.MatProfTurGUID} value={materia.MatProfTurGUID}>
                  {materia.MateriaNome}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Categoria */}
        <div className={styles.formGroup}>
          <label>Categoria</label>
          <div className={styles.categoriaLinha}>
            <select
              value={form.CategoriaGUID}
              onChange={(e) => setForm((prev) => ({ ...prev, CategoriaGUID: e.target.value }))}
              disabled={!materiaSelecionada}
            >
              <option value="">Sem categoria</option>
              {categorias.map((categoria) => (
                <option key={categoria.CategoriaGUID} value={categoria.CategoriaGUID}>
                  {categoria.CategoriaNome}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.selectButton}
              onClick={() => setNovaCategoriaAberta((prev) => !prev)}
              disabled={!materiaSelecionada}
            >
              + Nova
            </button>
            {form.CategoriaGUID && (
              <button
                type="button"
                className={styles.selectButton}
                onClick={() => excluirCategoriaAtual(form.CategoriaGUID)}
              >
                Excluir categoria
              </button>
            )}
          </div>
          {novaCategoriaAberta && (
            <div className={styles.categoriaLinha}>
              <input
                placeholder="Nome da nova categoria (ex: Cinemática)"
                value={novaCategoriaNome}
                onChange={(e) => setNovaCategoriaNome(e.target.value)}
              />
              <button type="button" className={styles.selectButton} onClick={handleCriarCategoria}>
                Salvar
              </button>
            </div>
          )}
        </div>

        {/* Turmas */}
        <div className={styles.formGroup}>
          <label>Turmas *</label>
          <button
            type="button"
            onClick={abrirModalTurmas}
            className={styles.selectButton}
            disabled={!form.MatProfTurGUID}
          >
            {totalTurmasSelecionadas === 0 ? 'Selecionar Turmas' : `${totalTurmasSelecionadas} turma(s) selecionada(s)`}
          </button>
        </div>

        <input
          placeholder="Título *"
          value={form.ConteudoTitulo}
          onChange={(e) => setForm((prev) => ({ ...prev, ConteudoTitulo: e.target.value }))}
          required
        />
        <textarea
          placeholder="Descrição (opcional)"
          value={form.ConteudoDescricao}
          onChange={(e) => setForm((prev) => ({ ...prev, ConteudoDescricao: e.target.value }))}
        />

        {/* Tipo de conteúdo */}
        <div className={styles.formGroup}>
          <label>Tipo de conteúdo *</label>
          <div className={styles.tipoSelector}>
            {(['cronometrado', 'texto', 'paginado'] as ConteudoAPI.ConteudoTipo[]).map((tipo) => (
              <div
                key={tipo}
                className={`${styles.tipoOpcao} ${form.ConteudoTipo === tipo ? styles.tipoOpcaoAtiva : ''}`}
                onClick={() => setForm((prev) => ({ ...prev, ConteudoTipo: tipo }))}
              >
                {rotuloTipo[tipo]}
              </div>
            ))}
          </div>
          <p className={styles.hint}>
            {form.ConteudoTipo === 'cronometrado' && 'Vídeo, áudio ou link do YouTube — progresso do aluno medido por tempo assistido.'}
            {form.ConteudoTipo === 'texto' && 'Texto formatado — progresso do aluno é instantâneo (100% ao abrir).'}
            {form.ConteudoTipo === 'paginado' && 'PDF, PowerPoint, Word ou coleção de imagens — progresso do aluno medido por página vista.'}
          </p>
        </div>

        {/* Campos do tipo "cronometrado" */}
        {form.ConteudoTipo === 'cronometrado' && (
          <div className={styles.formGroup}>
            <div className={styles.formRow}>
              <label>
                <input
                  type="radio"
                  checked={form.OrigemTipo === 'upload'}
                  onChange={() => setForm((prev) => ({ ...prev, OrigemTipo: 'upload' }))}
                />{' '}
                Enviar arquivo
              </label>
              <label>
                <input
                  type="radio"
                  checked={form.OrigemTipo === 'link'}
                  onChange={() => setForm((prev) => ({ ...prev, OrigemTipo: 'link' }))}
                />{' '}
                Link (YouTube, etc.)
              </label>
            </div>
            {form.OrigemTipo === 'upload' ? (
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp3,audio/mp4,audio/wav"
                onChange={(e) => setArquivoCronometrado(e.target.files?.[0] || null)}
              />
            ) : (
              <input
                placeholder="https://www.youtube.com/watch?v=..."
                value={form.LinkUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, LinkUrl: e.target.value }))}
              />
            )}
          </div>
        )}

        {/* Campos do tipo "texto" */}
        {form.ConteudoTipo === 'texto' && (
          <div className={styles.formGroup}>
            <label>Texto *</label>
            <div className={styles.editorToolbar}>
              <button type="button" onClick={() => aplicarFormato('bold')}><strong>N</strong></button>
              <button type="button" onClick={() => aplicarFormato('italic')}><em>I</em></button>
              <button type="button" onClick={() => aplicarFormato('underline')}><u>S</u></button>
              <select onChange={(e) => aplicarFormato('fontSize', e.target.value)} defaultValue="3">
                {TAMANHO_FONTE_OPCOES.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>{opcao.label}</option>
                ))}
              </select>
              <button type="button" onClick={inserirLink}>🔗 Link</button>
            </div>
            <div
              ref={editorRef}
              className={styles.editorConteudo}
              contentEditable
              onInput={() => setConteudoHtml(editorRef.current?.innerHTML || '')}
              suppressContentEditableWarning
            />
          </div>
        )}

        {/* Campos do tipo "paginado" */}
        {form.ConteudoTipo === 'paginado' && (
          <div className={styles.formGroup}>
            <label>Arquivo(s) *</label>
            <input
              type="file"
              multiple
              accept="application/pdf,.pptx,.ppt,.docx,.doc,image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setArquivosPaginado(Array.from(e.target.files || []))}
            />
            <p className={styles.hint}>
              Um único arquivo PDF/PPTX/DOCX, ou várias imagens (cada imagem vira uma página, na ordem selecionada).
            </p>
            {arquivosPaginado.length > 0 && (
              <p className={styles.hint}>{arquivosPaginado.length} arquivo(s) selecionado(s).</p>
            )}
          </div>
        )}

        {/* Agendamento */}
        <div className={styles.agendamento}>
          <label className={styles.checkboxLinha}>
            <input
              type="checkbox"
              checked={agendarPublicacao}
              onChange={(e) => setAgendarPublicacao(e.target.checked)}
            />
            Agendar publicação (em vez de postar agora)
          </label>

          {agendarPublicacao && (
            <>
              <label className={styles.checkboxLinha}>
                <input
                  type="checkbox"
                  checked={dataDiferentePorTurma}
                  onChange={(e) => setDataDiferentePorTurma(e.target.checked)}
                />
                Usar uma data diferente para cada turma
              </label>

              {!dataDiferentePorTurma ? (
                <input
                  type="datetime-local"
                  value={dataPublicacaoManual}
                  onChange={(e) => setDataPublicacaoManual(e.target.value)}
                />
              ) : (
                <div className={styles.datasPorTurmaLista}>
                  {totalTurmasSelecionadas === 0 && (
                    <p className={styles.hint}>Selecione as turmas acima para definir uma data por turma.</p>
                  )}
                  {obterTurmasSelecionadas().map(({ TurmaGUID, TurmaNome }) => (
                    <div key={TurmaGUID} className={styles.dataPorTurmaItem}>
                      <strong>{TurmaNome}</strong>
                      <input
                        type="datetime-local"
                        value={datasPorTurmaManual[TurmaGUID] || ''}
                        onChange={(e) =>
                          setDatasPorTurmaManual((prev) => ({ ...prev, [TurmaGUID]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.actions}>
          <button type="submit" disabled={submitting || totalTurmasSelecionadas === 0}>
            {submitting ? 'Publicando...' : 'Publicar Conteúdo'}
          </button>
        </div>
      </form>

      {/* Modal de Seleção de Turmas */}
      {modalTurmasAberto && (
        <div className={styles.modalOverlay} onClick={() => setModalTurmasAberto(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Selecionar Turmas</h2>
              <button className={styles.modalClose} onClick={() => setModalTurmasAberto(false)}>×</button>
            </div>

            <div className={styles.modalBody}>
              {loadingModal ? (
                <p>Carregando turmas...</p>
              ) : series.length === 0 ? (
                <p>Nenhuma turma encontrada</p>
              ) : (
                <div className={styles.treeView}>
                  {series.map((serie, sIdx) => (
                    <div key={sIdx} className={styles.serieItem}>
                      <div className={styles.serieHeader}>
                        <input
                          type="checkbox"
                          checked={serie.checked}
                          onChange={(e) => checkSerie(sIdx, e.target.checked)}
                          className={styles.checkbox}
                        />
                        <button type="button" onClick={() => toggleSerie(sIdx)} className={styles.expandButton}>
                          {serie.expanded ? '▼' : '▶'} {serie.TurmaSerie}ª Série
                        </button>
                      </div>

                      {serie.expanded && (
                        <div className={styles.turmasList}>
                          {serie.turmas.map((turma, tIdx) => (
                            <div key={tIdx} className={styles.turmaItem}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={turma.checked}
                                  onChange={(e) => checkTurma(sIdx, tIdx, e.target.checked)}
                                  className={styles.checkbox}
                                />
                                {turma.TurmaNome}
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

            <div className={styles.modalFooter}>
              <p><strong>{totalTurmasSelecionadas}</strong> turma(s) selecionada(s)</p>
              <button type="button" onClick={() => setModalTurmasAberto(false)} className={styles.confirmButton}>
                Confirmar Seleção
              </button>
            </div>
          </div>
        </div>
      )}

      <section className={styles.listSection}>
        <h2>Conteúdos publicados</h2>
        {!materiaSelecionada ? (
          <p className={styles.hint}>Selecione uma matéria para ver os conteúdos.</p>
        ) : (
          <ul className={styles.list}>
            {conteudos.map((conteudo) => (
              <li key={conteudo.ConteudoGUID} className={styles.card}>
                <div>
                  <span className={styles.badge}>{rotuloTipo[conteudo.ConteudoTipo]}</span>
                  <strong>{conteudo.ConteudoTitulo}</strong>
                  {conteudo.ConteudoDescricao && <p>{conteudo.ConteudoDescricao}</p>}
                  <p>Turmas: {conteudo.Turmas.length}</p>
                  <p>Publicação: {new Date(conteudo.ConteudoDataPublicacao).toLocaleString('pt-BR')}</p>
                </div>
                <div className={styles.cardActions}>
                  <button type="button" onClick={() => excluirConteudoAtual(conteudo.ConteudoGUID)}>Excluir</button>
                </div>
              </li>
            ))}
            {conteudos.length === 0 && <p className={styles.hint}>Nenhum conteúdo publicado ainda.</p>}
          </ul>
        )}
      </section>
    </div>
  );
}
