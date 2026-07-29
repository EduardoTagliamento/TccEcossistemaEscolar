'use client';

/**
 * Formulário de Cadastro de Conteúdo — extraído de
 * frontend/app/dashboard/[escolaGUID]/crud-conteudo/page.tsx (agora uma das
 * abas de /cadastro) sem alterar a lógica de negócio/validação/API, só
 * desacoplado do "página inteira" (removido header próprio — a navbar do
 * dashboard já é persistente via layout.tsx).
 */

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { converterParaBrasil, usuarioForaDoBrasil } from '@/lib/timezone-utils';
import * as ConteudoAPI from '@/lib/api/conteudo.api';
import * as CategoriaConteudoAPI from '@/lib/api/categoriaconteudo.api';
import { Icon, IconName } from '@/components/Icon';
import styles from './ConteudoForm.module.css';

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

// Valores em px (não a escala legada 1-7 do document.execCommand('fontSize')) —
// o backend sanitiza o HTML salvo e só aceita `<span style="font-size: ...">`
// (ver SANITIZE_HTML_OPTIONS em conteudo.service.ts), não a tag <font size>
// que o execCommand gera por padrão.
const TAMANHO_FONTE_OPCOES: { valor: string; label: string }[] = [
  { valor: '13px', label: 'Pequena' },
  { valor: '16px', label: 'Normal' },
  { valor: '22px', label: 'Grande' },
  { valor: '32px', label: 'Enorme' },
];

interface ConteudoFormProps {
  /** Pré-preenchimento direto via prop (uso como modal embutido) — tem prioridade sobre a query string. */
  materiaGUIDInicial?: string;
  turmaGUIDInicial?: string;
  categoriaGUIDInicial?: string;
  /** Quando informado, carrega esse conteúdo e abre direto no modo edição — usado pelo ícone de editar do visualizador. Só título/descrição são editáveis (mídia/turmas exigem um conteúdo novo). */
  editarGUIDInicial?: string;
  /** Esconde a seção "Conteúdos publicados" — usado quando embutido no modal do "+". */
  ocultarListagem?: boolean;
  /** Chamado após criar com sucesso — usado pelo modal do "+" pra fechar e atualizar a tela de categorias. */
  onCriado?: () => void;
}

export default function ConteudoForm({
  materiaGUIDInicial,
  turmaGUIDInicial,
  categoriaGUIDInicial,
  editarGUIDInicial,
  ocultarListagem = false,
  onCriado,
}: ConteudoFormProps = {}) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { usuario, token, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  // Pré-preenchimento vindo do "+" da tela de categorias (materias/.../turmas/[turmaGUID]) —
  // por prop quando embutido como modal, ou por query string na tela /cadastro standalone.
  // Aplicado uma vez cada (refs), pra não sobrescrever se o usuário trocar manualmente depois.
  const materiaGUIDQuery = materiaGUIDInicial ?? (searchParams?.get('MateriaGUID') || '');
  const turmaGUIDQuery = turmaGUIDInicial ?? (searchParams?.get('TurmaGUID') || '');
  const categoriaGUIDQuery = categoriaGUIDInicial ?? (searchParams?.get('CategoriaGUID') || '');
  const materiaPreenchidaRef = useRef(false);
  const turmaPreenchidaRef = useRef(false);
  const categoriaPreenchidaRef = useRef(false);

  // Calculado só no cliente (useEffect) — chamar usuarioForaDoBrasil() direto
  // no corpo do render causa mismatch de hidratação: o timezone do servidor
  // (SSR) quase nunca bate com o do navegador do usuário.
  const [mostrarAvisoTimezone, setMostrarAvisoTimezone] = useState(false);
  useEffect(() => {
    setMostrarAvisoTimezone(usuarioForaDoBrasil());
  }, []);

  const [materias, setMaterias] = useState<MateriaOption[]>([]);
  const [categoriaNomes, setCategoriaNomes] = useState<string[]>([]);
  const [conteudos, setConteudos] = useState<ConteudoAPI.Conteudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [editingGUID, setEditingGUID] = useState<string | null>(null);

  const [form, setForm] = useState({
    MatProfTurGUID: '',
    CategoriaNome: '',
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
      void carregarConteudos(materiaSelecionada.MateriaGUID);
    } else {
      setConteudos([]);
    }
  }, [materiaSelecionada?.MateriaGUID]);

  // Nomes de categoria "geral" já usados pelo professor nessa matéria (em
  // qualquer turma onde leciona) — mesma fonte do "Gerenciar categorias".
  // Serve só de sugestão (datalist); no submit, o nome escolhido/digitado é
  // resolvido/criado exatamente nas turmas selecionadas abaixo, via
  // resolverCategoriaPorNomeParaTurmas.
  const carregarCategoriaNomes = async (materiaGUID: string) => {
    try {
      const board = await CategoriaConteudoAPI.buscarBoardGeral(materiaGUID);
      setCategoriaNomes(board.Categorias.map((c) => c.CategoriaNome));
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

  // ===== Modal de turmas =====
  const buscarSeries = async (matProfTurGUID: string, turmaGUIDPreSelecionada?: string): Promise<SerieItem[]> => {
    const response = await fetch(`/api/professor/turmas-alunos?MatProfTurGUID=${matProfTurGUID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || 'Erro ao carregar turmas');

    return (data?.data?.series || []).map((serie: any) => ({
      TurmaSerie: serie.TurmaSerie,
      checked: false,
      expanded: serie.turmas.some((t: any) => t.TurmaGUID === turmaGUIDPreSelecionada),
      turmas: serie.turmas.map((turma: any) => ({
        TurmaGUID: turma.TurmaGUID,
        TurmaNome: turma.TurmaNome,
        checked: turma.TurmaGUID === turmaGUIDPreSelecionada,
      })),
    }));
  };

  const abrirModalTurmas = async () => {
    if (!form.MatProfTurGUID) {
      alert('Selecione uma matéria primeiro.');
      return;
    }
    setModalTurmasAberto(true);
    setLoadingModal(true);
    setErro(null);

    try {
      setSeries(await buscarSeries(form.MatProfTurGUID));
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar turmas');
    } finally {
      setLoadingModal(false);
    }
  };

  // Pré-preenchimento: matéria vinda da URL (query param) assim que a lista carregar
  useEffect(() => {
    if (materiaPreenchidaRef.current || !materiaGUIDQuery || materiasUnicas.length === 0) return;
    const match = materiasUnicas.find((m) => m.MateriaGUID === materiaGUIDQuery);
    if (match) {
      materiaPreenchidaRef.current = true;
      setForm((prev) => ({ ...prev, MatProfTurGUID: match.MatProfTurGUID }));
    }
  }, [materiaGUIDQuery, materiasUnicas]);

  // Pré-preenchimento: turma vinda da URL, assim que a matéria (acima) já estiver resolvida
  useEffect(() => {
    if (turmaPreenchidaRef.current || !turmaGUIDQuery || !form.MatProfTurGUID) return;
    turmaPreenchidaRef.current = true;
    buscarSeries(form.MatProfTurGUID, turmaGUIDQuery)
      .then(setSeries)
      .catch(() => {
        // pré-preenchimento é best-effort — o professor ainda pode selecionar a turma manualmente
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaGUIDQuery, form.MatProfTurGUID]);

  // Pré-preenchimento: categoria vinda da URL (GUID de uma turma específica,
  // vindo do "+" da tela de categorias) — resolvido pro NOME, já que o campo
  // do formulário agora trabalha por nome (ver carregarCategoriaNomes acima).
  useEffect(() => {
    if (categoriaPreenchidaRef.current || !categoriaGUIDQuery || !turmaGUIDQuery || !materiaSelecionada) return;
    categoriaPreenchidaRef.current = true;
    CategoriaConteudoAPI.listarCategorias({ MateriaGUID: materiaSelecionada.MateriaGUID, TurmaGUID: turmaGUIDQuery })
      .then((lista) => {
        const match = lista.find((c) => c.CategoriaGUID === categoriaGUIDQuery);
        if (match) setForm((prev) => ({ ...prev, CategoriaNome: match.CategoriaNome }));
      })
      .catch(() => {
        // pré-preenchimento é best-effort — o professor ainda pode escolher a categoria manualmente
      });
  }, [categoriaGUIDQuery, turmaGUIDQuery, materiaSelecionada]);

  // Conteúdo paginado existente (só leitura — a substituição é por um novo
  // conjunto de arquivos, não por edição individual de cada página).
  const [paginasExistentes, setPaginasExistentes] = useState<{ Ordem: number; ArquivoUrl: string }[]>([]);

  // Carrega um conteúdo existente e abre direto no modo edição — usado quando
  // este form é embutido no modal de edição (ícone de lápis do visualizador).
  // Título/descrição e a mídia (HTML do texto, link ou arquivo do vídeo,
  // arquivos do paginado) são editáveis; ConteudoTipo, origem e turmas não.
  const editarGUIDAplicadoRef = useRef(false);
  useEffect(() => {
    if (editarGUIDAplicadoRef.current || !editarGUIDInicial || !usuario) return;
    editarGUIDAplicadoRef.current = true;
    (async () => {
      try {
        const conteudo = await ConteudoAPI.buscarConteudo(editarGUIDInicial);
        setEditingGUID(conteudo.ConteudoGUID);
        setForm((prev) => ({
          ...prev,
          ConteudoTitulo: conteudo.ConteudoTitulo,
          ConteudoDescricao: conteudo.ConteudoDescricao || '',
          ConteudoTipo: conteudo.ConteudoTipo,
          OrigemTipo: conteudo.Cronometrado?.OrigemTipo || prev.OrigemTipo,
          LinkUrl: conteudo.Cronometrado?.LinkUrl || '',
        }));
        if (conteudo.ConteudoTipo === 'texto' && conteudo.Texto) {
          setConteudoHtml(conteudo.Texto.ConteudoHtml);
          if (editorRef.current) editorRef.current.innerHTML = conteudo.Texto.ConteudoHtml;
        }
        if (conteudo.ConteudoTipo === 'paginado' && conteudo.Paginado) {
          setPaginasExistentes(conteudo.Paginado.Arquivos.map((a) => ({ Ordem: a.Ordem, ArquivoUrl: a.ArquivoUrl })));
        }
      } catch (err: any) {
        setErro(err?.message || 'Falha ao carregar conteúdo para edição');
      }
    })();
  }, [editarGUIDInicial, usuario]);

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

  useEffect(() => {
    if (materiaSelecionada) {
      void carregarCategoriaNomes(materiaSelecionada.MateriaGUID);
    } else {
      setCategoriaNomes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiaSelecionada?.MateriaGUID]);

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

  // document.execCommand('fontSize', ...) só aceita a escala legada 1-7 e
  // gera <font size="N">, que o backend descarta na sanitização (só permite
  // <span style="font-size">). Por isso aplicamos a escala legada como um
  // marcador único (tamanho 7) e depois trocamos manualmente cada <font>
  // gerada por um <span> com o tamanho em px de verdade.
  const aplicarTamanhoFonte = (tamanhoPx: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand('fontSize', false, '7');
    editor.querySelectorAll('font[size="7"]').forEach((elemento) => {
      const span = document.createElement('span');
      span.style.fontSize = tamanhoPx;
      span.innerHTML = elemento.innerHTML;
      elemento.replaceWith(span);
    });
    setConteudoHtml(editor.innerHTML);
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

    if (editingGUID) {
      if (form.ConteudoTipo === 'texto' && !conteudoHtml.trim()) {
        setErro('O texto não pode ficar vazio.');
        return;
      }
      if (form.ConteudoTipo === 'cronometrado' && form.OrigemTipo === 'link' && !form.LinkUrl.trim()) {
        setErro('Informe o link do vídeo/áudio.');
        return;
      }

      setSubmitting(true);
      try {
        await ConteudoAPI.atualizarConteudo(editingGUID, {
          ConteudoTitulo: form.ConteudoTitulo,
          ConteudoDescricao: form.ConteudoDescricao,
          ConteudoHtml: form.ConteudoTipo === 'texto' ? conteudoHtml : undefined,
          LinkUrl: form.ConteudoTipo === 'cronometrado' && form.OrigemTipo === 'link' ? form.LinkUrl.trim() : undefined,
          arquivoCronometrado:
            form.ConteudoTipo === 'cronometrado' && form.OrigemTipo === 'upload' ? arquivoCronometrado || undefined : undefined,
          arquivosPaginado: form.ConteudoTipo === 'paginado' && arquivosPaginado.length > 0 ? arquivosPaginado : undefined,
        });
        alert('Conteúdo atualizado com sucesso!');
        onCriado?.();
      } catch (err: any) {
        setErro(err?.message || 'Falha ao atualizar conteúdo');
      } finally {
        setSubmitting(false);
      }
      return;
    }

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

      const categoriaNome = form.CategoriaNome.trim();
      const categoriasPorTurma = categoriaNome
        ? await CategoriaConteudoAPI.resolverCategoriaPorNomeParaTurmas(
            materiaSelecionada.MateriaGUID,
            turmasSelecionadas.map((t) => t.TurmaGUID),
            categoriaNome
          )
        : undefined;

      await ConteudoAPI.criarConteudo({
        MateriaGUID: materiaSelecionada.MateriaGUID,
        ConteudoTitulo: form.ConteudoTitulo,
        ConteudoTipo: form.ConteudoTipo,
        ConteudoDescricao: form.ConteudoDescricao || undefined,
        TurmasGUID: turmasSelecionadas.map((t) => t.TurmaGUID),
        ConteudoDataPublicacao: conteudoDataPublicacao,
        DatasPorTurma: datasPorTurma,
        CategoriasPorTurma: categoriasPorTurma,
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
      onCriado?.();
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

  const rotuloTipo: Record<ConteudoAPI.ConteudoTipo, { icon: IconName; label: string }> = {
    cronometrado: { icon: 'camera', label: 'Vídeo/Áudio' },
    texto: { icon: 'file-text', label: 'Texto' },
    paginado: { icon: 'layers', label: 'Paginado' },
  };

  return (
    <div className={styles.container}>
      {mostrarAvisoTimezone && (
        <div className={styles.hint}>
          <Icon name="clock" size={16} /> Você está em um fuso horário diferente do Brasil (GMT-3). Datas ajustadas para o seu fuso local.
        </div>
      )}

      {erro && <p className={styles.error}>{erro}</p>}

      <form className={styles.form} onSubmit={onSubmit}>
        {editingGUID && (
          <p className={styles.hint}>
            Editando conteúdo existente — título, descrição e a mídia (
            {form.ConteudoTipo === 'texto' ? 'o texto' : form.ConteudoTipo === 'cronometrado' ? 'o vídeo/áudio' : 'os arquivos'}
            ) podem ser alterados aqui. Tipo de conteúdo e turmas exigem publicar um conteúdo novo.
          </p>
        )}

        {/* Matéria */}
        {!editingGUID && (
        <>
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
                setForm((prev) => ({ ...prev, MatProfTurGUID: e.target.value, CategoriaNome: '' }));
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

        {/* Categoria — por nome (não por turma): reaproveita uma categoria já
            usada em outra turma sua, ou cria uma nova, aplicada exatamente
            nas turmas marcadas na seção "Turmas" abaixo. */}
        <div className={styles.formGroup}>
          <label>Categoria</label>
          <input
            list="categoria-nomes-lista"
            placeholder="Sem categoria (opcional)"
            value={form.CategoriaNome}
            onChange={(e) => setForm((prev) => ({ ...prev, CategoriaNome: e.target.value }))}
            disabled={!materiaSelecionada}
          />
          <datalist id="categoria-nomes-lista">
            {categoriaNomes.map((nome) => (
              <option key={nome} value={nome} />
            ))}
          </datalist>
          <p className={styles.hint}>
            Escolha um nome já usado ou digite um novo — a categoria é aplicada nas turmas marcadas abaixo.
          </p>
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
        </>
        )}

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

        {!editingGUID && (
        <>
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
                <Icon name={rotuloTipo[tipo].icon} size={16} /> {rotuloTipo[tipo].label}
              </div>
            ))}
          </div>
          <p className={styles.hint}>
            {form.ConteudoTipo === 'cronometrado' && 'Vídeo, áudio ou link do YouTube — progresso do aluno medido por tempo assistido.'}
            {form.ConteudoTipo === 'texto' && 'Texto formatado — progresso do aluno é instantâneo (100% ao abrir).'}
            {form.ConteudoTipo === 'paginado' && 'PDF, PowerPoint, Word ou coleção de imagens — progresso do aluno medido por página vista.'}
          </p>
        </div>
        </>
        )}

        {/* Campos do tipo "cronometrado" — origem travada na edição, só o valor (arquivo/link) muda */}
        {form.ConteudoTipo === 'cronometrado' && (
          <div className={styles.formGroup}>
            <div className={styles.formRow}>
              <label>
                <input
                  type="radio"
                  checked={form.OrigemTipo === 'upload'}
                  disabled={!!editingGUID}
                  onChange={() => setForm((prev) => ({ ...prev, OrigemTipo: 'upload' }))}
                />{' '}
                Enviar arquivo
              </label>
              <label>
                <input
                  type="radio"
                  checked={form.OrigemTipo === 'link'}
                  disabled={!!editingGUID}
                  onChange={() => setForm((prev) => ({ ...prev, OrigemTipo: 'link' }))}
                />{' '}
                Link (YouTube, etc.)
              </label>
            </div>
            {form.OrigemTipo === 'upload' ? (
              <>
                {editingGUID && <p className={styles.hint}>Selecione um novo arquivo para substituir o atual, ou deixe em branco para manter.</p>}
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp3,audio/mp4,audio/wav"
                  onChange={(e) => setArquivoCronometrado(e.target.files?.[0] || null)}
                />
              </>
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
              <select onChange={(e) => aplicarTamanhoFonte(e.target.value)} defaultValue="16px">
                {TAMANHO_FONTE_OPCOES.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>{opcao.label}</option>
                ))}
              </select>
              <button type="button" onClick={inserirLink}><Icon name="paperclip" size={14} /> Link</button>
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

        {/* Campos do tipo "paginado" — substitui TODAS as páginas atuais */}
        {form.ConteudoTipo === 'paginado' && (
          <div className={styles.formGroup}>
            <label>{editingGUID ? 'Substituir arquivo(s)' : 'Arquivo(s) *'}</label>
            {editingGUID && paginasExistentes.length > 0 && (
              <p className={styles.hint}>
                Hoje: {paginasExistentes.length} página(s). Enviar novos arquivos substitui todas de uma vez; deixe em branco para manter.
              </p>
            )}
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
        {!editingGUID && (
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
        )}

        <div className={styles.actions}>
          <button type="submit" disabled={submitting || (!editingGUID && totalTurmasSelecionadas === 0)}>
            {submitting ? 'Salvando...' : editingGUID ? 'Salvar alterações' : 'Publicar Conteúdo'}
          </button>
          {editingGUID && (
            <button
              type="button"
              className={styles.selectButton}
              onClick={() => {
                setEditingGUID(null);
                limparFormulario();
              }}
            >
              Cancelar edição
            </button>
          )}
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

      {!ocultarListagem && (
        <section className={styles.listSection}>
          <h2>Conteúdos publicados</h2>
          {!materiaSelecionada ? (
            <p className={styles.hint}>Selecione uma matéria para ver os conteúdos.</p>
          ) : (
            <ul className={styles.list}>
              {conteudos.map((conteudo) => (
                <li key={conteudo.ConteudoGUID} className={styles.card}>
                  <div>
                    <span className={styles.badge}>
                      <Icon name={rotuloTipo[conteudo.ConteudoTipo].icon} size={14} /> {rotuloTipo[conteudo.ConteudoTipo].label}
                    </span>
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
      )}
    </div>
  );
}
