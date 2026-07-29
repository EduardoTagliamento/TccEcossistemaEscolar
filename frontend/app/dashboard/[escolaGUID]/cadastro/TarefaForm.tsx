'use client';

/**
 * Formulário de Cadastro de Tarefa — extraído de
 * frontend/app/dashboard/[escolaGUID]/crud-tarefa/page.tsx (agora uma das
 * abas de /cadastro) sem alterar a lógica de negócio/validação/API, só
 * desacoplado do "página inteira" (removido header próprio — a navbar do
 * dashboard já é persistente via layout.tsx).
 */

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { converterParaBrasil, converterDoBrasil, usuarioForaDoBrasil } from '@/lib/timezone-utils';
import * as GradeHorariaAPI from '@/lib/api/gradehoraria.api';
import * as CategoriaConteudoAPI from '@/lib/api/categoriaconteudo.api';
import * as TarefaAcademicaAPI from '@/lib/api/tarefaacademica.api';
import { QuestaoCreateInput } from '@/types/tarefaacademica';
import { DiaSemana, DIA_SEMANA_LABEL } from '@/lib/api/escolaconfiguracao.api';
import { Icon } from '@/components/Icon';
import ImportarQuestoesPlanilha from '@/components/materias/ImportarQuestoesPlanilha';
import type { QuestaoImportRow, Questao } from '@/types/tarefaacademica';
import styles from './TarefaForm.module.css';

interface Tarefa {
  TarefaGUID: string;
  MatriculaGUID: string;
  matXprofXturxescGUID: string;
  CategoriaGUID?: string | null;
  TarefaTitulo: string;
  TarefaConteudo: string | null;
  TarefaPrazoData: string;
  TarefaTipoEntrega: 'digital' | 'fisica' | 'lista';
  TarefaFeito: boolean;
}

interface AlternativaRascunho {
  clientId: string;
  Texto: string;
  Correta: boolean;
  Pontos: number;
}

interface QuestaoRascunho {
  clientId: string;
  /** Presente só em modo edição, quando a questão já existe no backend. */
  QuestaoGUID?: string;
  Enunciado: string;
  Tipo: 'objetiva' | 'discursiva';
  PontosMaximos: number;
  Explicacao: string;
  Alternativas: AlternativaRascunho[];
  /** Vem do backend (modo edição) — bloqueia mudar Tipo/Alternativas/excluir. */
  TemResposta: boolean;
}

let questaoClientIdSeq = 0;
const novoClientId = () => `q-${Date.now()}-${questaoClientIdSeq++}`;

const novaQuestaoRascunho = (): QuestaoRascunho => ({
  clientId: novoClientId(),
  Enunciado: '',
  Tipo: 'objetiva',
  PontosMaximos: 1,
  Explicacao: '',
  TemResposta: false,
  Alternativas: [
    { clientId: novoClientId(), Texto: '', Correta: true, Pontos: 1 },
    { clientId: novoClientId(), Texto: '', Correta: false, Pontos: 0 },
  ],
});

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
  /** Alocação (matéria+professor+TURMA) desta turma específica — cada turma
   * tem a sua própria, mesmo lecionando a mesma matéria; é o que precisa ir
   * em `matXprofXturxescGUID` na criação, já que Tarefa é sempre de 1 turma
   * só (ver decisão #4 do PLANO_IMPLEMENTACAO_MATERIAS.md). Usar o
   * MatProfTurGUID "genérico" do seletor de matéria aqui era o bug: ele
   * corresponde a uma turma arbitrária (a primeira encontrada), não
   * necessariamente à turma de quem foi marcado. */
  MatProfTurGUID: string;
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

interface TarefaFormProps {
  materiaGUIDInicial?: string;
  turmaGUIDInicial?: string;
  categoriaGUIDInicial?: string;
  /** Quando informado, carrega essa tarefa e abre direto no modo edição — usado pelo ícone de editar do visualizador. */
  editarGUIDInicial?: string;
  ocultarListagem?: boolean;
  onCriado?: () => void;
}

export default function TarefaForm({
  materiaGUIDInicial,
  turmaGUIDInicial,
  categoriaGUIDInicial,
  editarGUIDInicial,
  ocultarListagem = false,
  onCriado,
}: TarefaFormProps = {}) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { usuario, token, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  // Pré-preenchimento vindo do "+" da tela de categorias — por prop quando
  // embutido como modal, ou por query string na tela /cadastro standalone.
  // Aplicado uma vez cada (refs), pra não sobrescrever se o professor trocar manualmente depois.
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

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [materias, setMaterias] = useState<MateriaOption[]>([]);
  const [series, setSeries] = useState<SerieItem[]>([]);
  const [categoriaNomes, setCategoriaNomes] = useState<string[]>([]);
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
    CategoriaNome: '',
    TarefaTitulo: '',
    TarefaConteudo: '',
    TarefaPrazoData: '',
    TarefaTipoEntrega: 'digital' as 'digital' | 'fisica' | 'lista',
    TarefaCompartilhada: false,
    TarefaMinPessoas: null as number | null,
    TarefaMaxPessoas: null as number | null,
  });

  // ========== Lista de questões (tarefa tipo "lista") ==========
  const [questoes, setQuestoes] = useState<QuestaoRascunho[]>([]);
  const [modoQuestoes, setModoQuestoes] = useState<'manual' | 'planilha'>('manual');
  const [erroQuestoes, setErroQuestoes] = useState<string | null>(null);
  const questoesOriginaisGUIDsRef = useRef<Set<string>>(new Set());

  const temQuestaoComResposta = questoes.some((q) => q.TemResposta);

  const adicionarQuestao = () => setQuestoes((prev) => [...prev, novaQuestaoRascunho()]);

  const removerQuestao = (clientId: string) =>
    setQuestoes((prev) => prev.filter((q) => q.clientId !== clientId));

  const moverQuestao = (clientId: string, direcao: -1 | 1) => {
    setQuestoes((prev) => {
      const index = prev.findIndex((q) => q.clientId === clientId);
      const novoIndex = index + direcao;
      if (index < 0 || novoIndex < 0 || novoIndex >= prev.length) return prev;
      const copia = [...prev];
      [copia[index], copia[novoIndex]] = [copia[novoIndex], copia[index]];
      return copia;
    });
  };

  const atualizarCampoQuestao = <K extends keyof QuestaoRascunho>(clientId: string, campo: K, valor: QuestaoRascunho[K]) =>
    setQuestoes((prev) => prev.map((q) => (q.clientId === clientId ? { ...q, [campo]: valor } : q)));

  const adicionarAlternativa = (questaoClientId: string) =>
    setQuestoes((prev) =>
      prev.map((q) =>
        q.clientId === questaoClientId
          ? { ...q, Alternativas: [...q.Alternativas, { clientId: novoClientId(), Texto: '', Correta: false, Pontos: 0 }] }
          : q
      )
    );

  const removerAlternativa = (questaoClientId: string, alternativaClientId: string) =>
    setQuestoes((prev) =>
      prev.map((q) =>
        q.clientId === questaoClientId
          ? { ...q, Alternativas: q.Alternativas.filter((a) => a.clientId !== alternativaClientId) }
          : q
      )
    );

  const atualizarAlternativa = <K extends keyof AlternativaRascunho>(
    questaoClientId: string,
    alternativaClientId: string,
    campo: K,
    valor: AlternativaRascunho[K]
  ) =>
    setQuestoes((prev) =>
      prev.map((q) =>
        q.clientId === questaoClientId
          ? { ...q, Alternativas: q.Alternativas.map((a) => (a.clientId === alternativaClientId ? { ...a, [campo]: valor } : a)) }
          : q
      )
    );

  const marcarAlternativaCorreta = (questaoClientId: string, alternativaClientId: string) =>
    setQuestoes((prev) =>
      prev.map((q) =>
        q.clientId === questaoClientId
          ? { ...q, Alternativas: q.Alternativas.map((a) => ({ ...a, Correta: a.clientId === alternativaClientId })) }
          : q
      )
    );

  const validarQuestoes = (): string | null => {
    if (questoes.length === 0) {
      return 'Adicione ao menos uma questão à lista.';
    }
    for (let i = 0; i < questoes.length; i++) {
      const q = questoes[i];
      if (!q.Enunciado.trim()) {
        return `Questão ${i + 1}: o enunciado é obrigatório.`;
      }
      if (!q.PontosMaximos || q.PontosMaximos <= 0) {
        return `Questão ${i + 1}: os pontos máximos devem ser maiores que zero.`;
      }
      if (q.Tipo === 'objetiva') {
        if (q.Alternativas.length < 2) {
          return `Questão ${i + 1}: uma questão objetiva precisa de ao menos 2 alternativas.`;
        }
        if (q.Alternativas.some((a) => !a.Texto.trim())) {
          return `Questão ${i + 1}: todas as alternativas precisam de texto.`;
        }
        if (q.Alternativas.filter((a) => a.Correta).length !== 1) {
          return `Questão ${i + 1}: marque exatamente uma alternativa como correta.`;
        }
      }
    }
    return null;
  };

  const questaoParaInput = (q: QuestaoRascunho): QuestaoCreateInput => ({
    QuestaoEnunciado: q.Enunciado.trim(),
    QuestaoTipo: q.Tipo,
    QuestaoPontosMaximos: q.PontosMaximos,
    QuestaoExplicacao: q.Explicacao.trim() || undefined,
    Alternativas:
      q.Tipo === 'objetiva'
        ? q.Alternativas.map((a) => ({ AlternativaTexto: a.Texto.trim(), AlternativaCorreta: a.Correta, AlternativaPontos: a.Pontos }))
        : undefined,
  });

  /** Modo edição: carrega as questões já cadastradas dessa tarefa lista. */
  const carregarQuestoesParaEdicao = async (tarefaGUID: string) => {
    try {
      const carregadas = await TarefaAcademicaAPI.listarQuestoes(tarefaGUID);
      questoesOriginaisGUIDsRef.current = new Set(carregadas.map((q) => q.QuestaoGUID));
      setQuestoes(
        carregadas.map((q) => ({
          clientId: novoClientId(),
          QuestaoGUID: q.QuestaoGUID,
          Enunciado: q.QuestaoEnunciado,
          Tipo: q.QuestaoTipo,
          PontosMaximos: q.QuestaoPontosMaximos,
          Explicacao: q.QuestaoExplicacao || '',
          TemResposta: q.TemResposta,
          Alternativas: q.Alternativas.map((a) => ({
            clientId: novoClientId(),
            Texto: a.AlternativaTexto,
            Correta: a.AlternativaCorreta,
            Pontos: a.AlternativaPontos,
          })),
        }))
      );
    } catch (err: any) {
      setErroQuestoes(err?.message || 'Falha ao carregar questões da lista');
    }
  };

  /** Modo edição: aplica as diferenças (criadas/atualizadas/excluídas/reordenadas) contra o backend. */
  const sincronizarQuestoesEdicao = async (tarefaGUID: string) => {
    const guidsAtuais = new Set(questoes.filter((q) => q.QuestaoGUID).map((q) => q.QuestaoGUID as string));
    const excluidas = Array.from(questoesOriginaisGUIDsRef.current).filter((guid) => !guidsAtuais.has(guid));

    for (const guid of excluidas) {
      await TarefaAcademicaAPI.excluirQuestao(guid);
    }

    const ordens: Array<{ QuestaoGUID: string; QuestaoOrdem: number }> = [];

    for (let i = 0; i < questoes.length; i++) {
      const q = questoes[i];
      if (q.QuestaoGUID) {
        const atualizada = await TarefaAcademicaAPI.atualizarQuestao(q.QuestaoGUID, {
          QuestaoEnunciado: q.Enunciado.trim(),
          QuestaoPontosMaximos: q.PontosMaximos,
          QuestaoExplicacao: q.Explicacao.trim() || null,
          ...(q.TemResposta ? {} : { QuestaoTipo: q.Tipo, Alternativas: questaoParaInput(q).Alternativas }),
        });
        ordens.push({ QuestaoGUID: atualizada.QuestaoGUID, QuestaoOrdem: i });
      } else {
        const criada = await TarefaAcademicaAPI.criarQuestao(tarefaGUID, questaoParaInput(q));
        ordens.push({ QuestaoGUID: criada.QuestaoGUID, QuestaoOrdem: i });
      }
    }

    if (ordens.length > 0) {
      await TarefaAcademicaAPI.reordenarQuestoes(tarefaGUID, ordens);
    }
  };

  /** Modo criação (tarefa ainda sem GUID): acrescenta as linhas importadas ao rascunho local, junto com as manuais. */
  const handleImportadoRascunho = (linhas: QuestaoImportRow[]) => {
    setQuestoes((prev) => [
      ...prev,
      ...linhas.map((l) => ({
        clientId: novoClientId(),
        Enunciado: l.QuestaoEnunciado,
        Tipo: l.QuestaoTipo,
        PontosMaximos: l.QuestaoPontosMaximos,
        Explicacao: l.QuestaoExplicacao || '',
        TemResposta: false,
        Alternativas: (l.Alternativas || []).map((a) => ({
          clientId: novoClientId(),
          Texto: a.AlternativaTexto,
          Correta: a.AlternativaCorreta,
          Pontos: a.AlternativaPontos,
        })),
      })),
    ]);
    setModoQuestoes('manual');
  };

  /** Modo edição (tarefa já existe): a importação já foi persistida no backend — só reflete no rascunho local. */
  const handleImportadoBackend = (criadas: Questao[]) => {
    questoesOriginaisGUIDsRef.current = new Set([...questoesOriginaisGUIDsRef.current, ...criadas.map((q) => q.QuestaoGUID)]);
    setQuestoes((prev) => [
      ...prev,
      ...criadas.map((q) => ({
        clientId: novoClientId(),
        QuestaoGUID: q.QuestaoGUID,
        Enunciado: q.QuestaoEnunciado,
        Tipo: q.QuestaoTipo,
        PontosMaximos: q.QuestaoPontosMaximos,
        Explicacao: q.QuestaoExplicacao || '',
        TemResposta: q.TemResposta,
        Alternativas: q.Alternativas.map((a) => ({
          clientId: novoClientId(),
          Texto: a.AlternativaTexto,
          Correta: a.AlternativaCorreta,
          Pontos: a.AlternativaPontos,
        })),
      })),
    ]);
    setModoQuestoes('manual');
  };

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

  const buscarSeriesAlunos = async (matProfTurGUID: string, turmaGUIDPreSelecionada?: string): Promise<SerieItem[]> => {
    const url = `/api/professor/turmas-alunos?MatProfTurGUID=${matProfTurGUID}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || 'Erro ao carregar alunos');

    return (data?.data?.series || []).map((serie: any) => ({
      TurmaSerie: serie.TurmaSerie,
      checked: false,
      expanded: serie.turmas.some((t: any) => t.TurmaGUID === turmaGUIDPreSelecionada),
      turmas: serie.turmas.map((turma: any) => {
        const preSelecionada = turma.TurmaGUID === turmaGUIDPreSelecionada;
        return {
          TurmaGUID: turma.TurmaGUID,
          TurmaNome: turma.TurmaNome,
          MatProfTurGUID: turma.MatProfTurGUID,
          checked: preSelecionada,
          expanded: preSelecionada,
          alunos: turma.alunos.map((aluno: any) => ({
            MatriculaGUID: aluno.MatriculaGUID,
            UsuarioNome: aluno.UsuarioNome,
            checked: preSelecionada
          }))
        };
      })
    }));
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
      setSeries(await buscarSeriesAlunos(form.matXprofXturxescGUID));
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
  // alunos marcados dentro dela). Carrega junto o MatProfTurGUID PRÓPRIO de
  // cada turma — cada turma tem sua própria alocação, mesmo lecionando a
  // mesma matéria (esse é o dado que faltava e causava o 403 de categoria:
  // antes se enviava o MatProfTurGUID "genérico" do seletor de matéria,
  // que corresponde a uma turma arbitrária, não à turma de quem foi marcado).
  const obterTurmasComAlunosSelecionados = (): { TurmaGUID: string; TurmaNome: string; MatProfTurGUID: string }[] => {
    const turmas: { TurmaGUID: string; TurmaNome: string; MatProfTurGUID: string }[] = [];
    series.forEach(serie => {
      serie.turmas.forEach(turma => {
        if (turma.alunos.some(a => a.checked)) {
          turmas.push({ TurmaGUID: turma.TurmaGUID, TurmaNome: turma.TurmaNome, MatProfTurGUID: turma.MatProfTurGUID });
        }
      });
    });
    return turmas;
  };

  // Uma tarefa é sempre de 1 turma só (decisão de arquitetura) — quando os
  // alunos marcados abrangem N turmas, a criação vira N chamadas separadas
  // (uma por turma, cada uma com seu próprio matXprofXturxescGUID e alunos).
  const obterGruposPorTurma = (): { TurmaGUID: string; TurmaNome: string; MatProfTurGUID: string; matriculas: string[] }[] => {
    const grupos: { TurmaGUID: string; TurmaNome: string; MatProfTurGUID: string; matriculas: string[] }[] = [];
    series.forEach((serie) => {
      serie.turmas.forEach((turma) => {
        const matriculas = turma.alunos.filter((a) => a.checked).map((a) => a.MatriculaGUID);
        if (matriculas.length > 0) {
          grupos.push({ TurmaGUID: turma.TurmaGUID, TurmaNome: turma.TurmaNome, MatProfTurGUID: turma.MatProfTurGUID, matriculas });
        }
      });
    });
    return grupos;
  };

  // Nomes de categoria "geral" já usados pelo professor nessa matéria (em
  // qualquer turma onde leciona) — mesma fonte do "Gerenciar categorias".
  // Serve só de sugestão (datalist); no submit, o nome escolhido/digitado é
  // resolvido/criado exatamente nas turmas que têm aluno marcado, via
  // resolverCategoriaPorNomeParaTurmas.
  const carregarCategoriaNomes = async (materiaGUID: string) => {
    try {
      const board = await CategoriaConteudoAPI.buscarBoardGeral(materiaGUID);
      setCategoriaNomes(board.Categorias.map((c) => c.CategoriaNome));
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar categorias');
    }
  };

  useEffect(() => {
    const materiaAtual = materiasUnicas.find((m) => m.MatProfTurGUID === form.matXprofXturxescGUID);
    if (materiaAtual) {
      void carregarCategoriaNomes(materiaAtual.MateriaGUID);
    } else {
      setCategoriaNomes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.matXprofXturxescGUID]);

  // Pré-preenchimento: matéria vinda da URL, assim que a lista carregar
  useEffect(() => {
    if (materiaPreenchidaRef.current || !materiaGUIDQuery || materiasUnicas.length === 0) return;
    const match = materiasUnicas.find((m) => m.MateriaGUID === materiaGUIDQuery);
    if (match) {
      materiaPreenchidaRef.current = true;
      setForm((prev) => ({ ...prev, matXprofXturxescGUID: match.MatProfTurGUID }));
    }
  }, [materiaGUIDQuery, materiasUnicas]);

  // Pré-preenchimento: turma vinda da URL — marca a turma (e todos os alunos
  // dela) automaticamente, assim que a matéria acima já estiver resolvida.
  useEffect(() => {
    if (turmaPreenchidaRef.current || !turmaGUIDQuery || !form.matXprofXturxescGUID) return;
    turmaPreenchidaRef.current = true;
    buscarSeriesAlunos(form.matXprofXturxescGUID, turmaGUIDQuery)
      .then(setSeries)
      .catch(() => {
        // pré-preenchimento é best-effort — o professor ainda pode selecionar manualmente
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaGUIDQuery, form.matXprofXturxescGUID]);

  // Pré-preenchimento: categoria vinda da URL (GUID de uma turma específica,
  // vindo do "+" da tela de categorias) — resolvido pro NOME, já que o campo
  // do formulário agora trabalha por nome (ver carregarCategoriaNomes acima).
  useEffect(() => {
    const materiaAtual = materiasUnicas.find((m) => m.MatProfTurGUID === form.matXprofXturxescGUID);
    if (categoriaPreenchidaRef.current || !categoriaGUIDQuery || !turmaGUIDQuery || !materiaAtual) return;
    categoriaPreenchidaRef.current = true;
    CategoriaConteudoAPI.listarCategorias({ MateriaGUID: materiaAtual.MateriaGUID, TurmaGUID: turmaGUIDQuery })
      .then((lista) => {
        const match = lista.find((c) => c.CategoriaGUID === categoriaGUIDQuery);
        if (match) setForm((prev) => ({ ...prev, CategoriaNome: match.CategoriaNome }));
      })
      .catch(() => {
        // pré-preenchimento é best-effort — o professor ainda pode escolher a categoria manualmente
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriaGUIDQuery, turmaGUIDQuery, form.matXprofXturxescGUID, materiasUnicas]);

  // Carrega uma tarefa existente e abre direto no modo edição — usado quando
  // este form é embutido no modal de edição (ícone de lápis do visualizador),
  // em vez do fluxo normal de clicar "Editar" na listagem interna.
  const editarGUIDAplicadoRef = useRef(false);
  useEffect(() => {
    if (editarGUIDAplicadoRef.current || !editarGUIDInicial || !usuario) return;
    editarGUIDAplicadoRef.current = true;
    (async () => {
      try {
        const response = await fetch(`/api/tarefa/${editarGUIDInicial}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || 'Erro ao carregar tarefa');
        editarTarefa(data.data.tarefa);
      } catch (err: any) {
        setErro(err?.message || 'Falha ao carregar tarefa para edição');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editarGUIDInicial, usuario, token]);

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
      CategoriaNome: '',
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
    setQuestoes([]);
    setModoQuestoes('manual');
    setErroQuestoes(null);
    questoesOriginaisGUIDsRef.current = new Set();
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErro(null);

    try {
      // MODO EDIÇÃO: Atualizar tarefa existente
      if (editingGUID) {
        if (form.TarefaTipoEntrega === 'lista') {
          const erroValidacao = validarQuestoes();
          if (erroValidacao) {
            throw new Error(erroValidacao);
          }
        }

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

        if (form.TarefaTipoEntrega === 'lista') {
          await sincronizarQuestoesEdicao(editingGUID);
        }

        alert('Tarefa atualizada com sucesso!');
        limparFormulario();
        await carregarTarefas();
        onCriado?.();
        return;
      }

      // MODO CRIAÇÃO: Tarefa é sempre de 1 turma só (decisão de arquitetura,
      // ver PLANO_IMPLEMENTACAO_MATERIAS.md) — quando os alunos marcados
      // abrangem N turmas, viram N chamadas separadas (uma por turma), cada
      // uma com o matXprofXturxescGUID e a categoria certos daquela turma.
      const grupos = obterGruposPorTurma();

      if (grupos.length === 0) {
        throw new Error('Selecione pelo menos um aluno');
      }

      if (form.TarefaTipoEntrega === 'lista') {
        const erroValidacao = validarQuestoes();
        if (erroValidacao) {
          throw new Error(erroValidacao);
        }
      }

      const materiaAtual = materiasUnicas.find((m) => m.MatProfTurGUID === form.matXprofXturxescGUID);
      if (!materiaAtual) {
        throw new Error('Selecione uma matéria.');
      }

      const categoriaNome = form.CategoriaNome.trim();
      const categoriasPorTurma = categoriaNome
        ? await CategoriaConteudoAPI.resolverCategoriaPorNomeParaTurmas(
            materiaAtual.MateriaGUID,
            grupos.map((g) => g.TurmaGUID),
            categoriaNome
          )
        : {};

      let totalCriadas = 0;

      for (const grupo of grupos) {
        let datasPorMatricula: Record<string, string> | undefined;
        let prazoParaEnvio = form.TarefaPrazoData ? converterParaBrasil(form.TarefaPrazoData) : '';

        if (agendamentoAutomatico) {
          const resultado = resultadosCalculo[grupo.TurmaGUID];
          if (!resultado) {
            throw new Error('Clique em "Calcular Datas" antes de salvar.');
          }

          let dataResolvida: string;
          if (resultado.status === 'ok' && resultado.DataCalculada) {
            dataResolvida = resultado.DataCalculada;
          } else if (resultado.status === 'semCronograma') {
            if (!resultado.dataManual) {
              throw new Error(`A turma ${grupo.TurmaNome} não tem cronograma configurado — defina o prazo manualmente para ela.`);
            }
            dataResolvida = converterParaBrasil(resultado.dataManual);
          } else if (resultado.status === 'escolherDia') {
            throw new Error(`Escolha o dia da semana pra turma ${grupo.TurmaNome} (tem mais de uma aula por semana) antes de salvar.`);
          } else {
            throw new Error(resultado.mensagem || `Não foi possível calcular o prazo pra turma ${grupo.TurmaNome}.`);
          }

          datasPorMatricula = {};
          for (const matriculaGUID of grupo.matriculas) {
            datasPorMatricula[matriculaGUID] = dataResolvida;
          }
          prazoParaEnvio = dataResolvida;
        }

        const payload = {
          tarefa: {
            MatriculasGUID: grupo.matriculas,
            matXprofXturxescGUID: grupo.MatProfTurGUID,
            CategoriaGUID: categoriasPorTurma[grupo.TurmaGUID],
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
          throw new Error(`Turma ${grupo.TurmaNome}: ${data?.message || 'erro ao salvar tarefa'}`);
        }
        totalCriadas += data.data.count;

        if (form.TarefaTipoEntrega === 'lista' && questoes.length > 0) {
          const novaTarefaGUID = data.data.tarefas?.[0]?.TarefaGUID;
          if (novaTarefaGUID) {
            await TarefaAcademicaAPI.criarQuestoesBatch(novaTarefaGUID, questoes.map(questaoParaInput));
          }
        }
      }

      alert(`${totalCriadas} tarefa(s) criada(s) com sucesso!`);
      limparFormulario();
      await carregarTarefas();
      setModalAberto(false);
      onCriado?.();
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
      CategoriaNome: '',
      TarefaTitulo: tarefa.TarefaTitulo,
      TarefaConteudo: tarefa.TarefaConteudo || '',
      TarefaPrazoData: converterDoBrasil(tarefa.TarefaPrazoData), // Converte GMT-3 para timezone do usuário
      TarefaTipoEntrega: tarefa.TarefaTipoEntrega,
      TarefaCompartilhada: !!tarefa.TarefaCompartilhada,
      TarefaMinPessoas: tarefa.TarefaMinPessoas,
      TarefaMaxPessoas: tarefa.TarefaMaxPessoas,
    });
    setQuestoes([]);
    setErroQuestoes(null);
    questoesOriginaisGUIDsRef.current = new Set();
    if (tarefa.TarefaTipoEntrega === 'lista') {
      void carregarQuestoesParaEdicao(tarefa.TarefaGUID);
    }
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

        {/* Categoria — por nome (não por turma): reaproveita uma categoria já
            usada em outra turma sua, ou cria uma nova, aplicada exatamente
            nas turmas de quem foi marcado acima (mesmo se forem várias). */}
        {!editingGUID && (
          <div className={styles.formGroup}>
            <label>Categoria</label>
            <input
              list="categoria-nomes-lista"
              placeholder="Sem categoria (opcional)"
              value={form.CategoriaNome}
              onChange={(e) => setForm((prev) => ({ ...prev, CategoriaNome: e.target.value }))}
              disabled={!form.matXprofXturxescGUID}
            />
            <datalist id="categoria-nomes-lista">
              {categoriaNomes.map((nome) => (
                <option key={nome} value={nome} />
              ))}
            </datalist>
            <p className={styles.hint}>
              Escolha um nome já usado ou digite um novo — a categoria é aplicada nas turmas de quem foi marcado acima.
            </p>
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
          onChange={(e) => setForm((prev) => ({ ...prev, TarefaTipoEntrega: e.target.value as 'digital' | 'fisica' | 'lista' }))}
        >
          <option value="digital">Digital</option>
          <option value="fisica">Física</option>
          <option value="lista">Lista de questões</option>
        </select>

        {form.TarefaTipoEntrega === 'lista' && (
          <div className={styles.listaQuestoes}>
            <div className={styles.listaQuestoesHeader}>
              <h3><Icon name="list" size={18} /> Questões da lista</h3>
              <div className={styles.modoQuestoesTabs}>
                <button
                  type="button"
                  className={modoQuestoes === 'manual' ? styles.modoQuestoesTabAtiva : styles.modoQuestoesTab}
                  onClick={() => setModoQuestoes('manual')}
                >
                  Adicionar manualmente
                </button>
                <button
                  type="button"
                  className={modoQuestoes === 'planilha' ? styles.modoQuestoesTabAtiva : styles.modoQuestoesTab}
                  onClick={() => setModoQuestoes('planilha')}
                >
                  Importar de planilha
                </button>
              </div>
            </div>

            {temQuestaoComResposta && (
              <p className={styles.warning}>
                <Icon name="alert-triangle" size={16} /> Uma ou mais questões já têm resposta de aluno — não é possível mudar o tipo,
                as alternativas ou excluir essas questões. Enunciado, pontos e explicação continuam editáveis.
              </p>
            )}

            {erroQuestoes && <p className={styles.error}>{erroQuestoes}</p>}

            {modoQuestoes === 'manual' ? (
              <>
                <div className={styles.questoesList}>
                  {questoes.map((questao, index) => (
                    <div key={questao.clientId} className={styles.questaoCard}>
                      <div className={styles.questaoCardHeader}>
                        <strong>Questão {index + 1}</strong>
                        <div className={styles.questaoCardHeaderActions}>
                          <button type="button" onClick={() => moverQuestao(questao.clientId, -1)} disabled={index === 0} title="Mover para cima">
                            <Icon name="chevron-right" size={16} style={{ transform: 'rotate(-90deg)' }} />
                          </button>
                          <button type="button" onClick={() => moverQuestao(questao.clientId, 1)} disabled={index === questoes.length - 1} title="Mover para baixo">
                            <Icon name="chevron-right" size={16} style={{ transform: 'rotate(90deg)' }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removerQuestao(questao.clientId)}
                            disabled={questao.TemResposta}
                            title={questao.TemResposta ? 'Não é possível excluir: já tem resposta' : 'Remover questão'}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </div>

                      <textarea
                        placeholder="Enunciado da questão *"
                        value={questao.Enunciado}
                        onChange={(e) => atualizarCampoQuestao(questao.clientId, 'Enunciado', e.target.value)}
                      />

                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Tipo</label>
                          <select
                            value={questao.Tipo}
                            disabled={questao.TemResposta}
                            onChange={(e) => atualizarCampoQuestao(questao.clientId, 'Tipo', e.target.value as 'objetiva' | 'discursiva')}
                          >
                            <option value="objetiva">Objetiva</option>
                            <option value="discursiva">Discursiva</option>
                          </select>
                        </div>
                        <div className={styles.formGroup}>
                          <label>Pontos máximos</label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={questao.PontosMaximos}
                            onChange={(e) => atualizarCampoQuestao(questao.clientId, 'PontosMaximos', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <textarea
                        placeholder="Explicação exibida ao aluno após responder (opcional)"
                        value={questao.Explicacao}
                        onChange={(e) => atualizarCampoQuestao(questao.clientId, 'Explicacao', e.target.value)}
                      />

                      {questao.Tipo === 'objetiva' && (
                        <div className={styles.alternativasList}>
                          <label>Alternativas (marque a correta)</label>
                          {questao.Alternativas.map((alt) => (
                            <div key={alt.clientId} className={styles.alternativaRow}>
                              <input
                                type="radio"
                                name={`correta-${questao.clientId}`}
                                checked={alt.Correta}
                                disabled={questao.TemResposta}
                                onChange={() => marcarAlternativaCorreta(questao.clientId, alt.clientId)}
                              />
                              <input
                                type="text"
                                placeholder="Texto da alternativa"
                                value={alt.Texto}
                                onChange={(e) => atualizarAlternativa(questao.clientId, alt.clientId, 'Texto', e.target.value)}
                              />
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className={styles.alternativaPontos}
                                title="Pontos dessa alternativa"
                                value={alt.Pontos}
                                onChange={(e) => atualizarAlternativa(questao.clientId, alt.clientId, 'Pontos', parseFloat(e.target.value) || 0)}
                              />
                              <button
                                type="button"
                                onClick={() => removerAlternativa(questao.clientId, alt.clientId)}
                                disabled={questao.TemResposta || questao.Alternativas.length <= 2}
                                title="Remover alternativa"
                              >
                                <Icon name="x" size={14} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => adicionarAlternativa(questao.clientId)}
                            disabled={questao.TemResposta}
                          >
                            <Icon name="plus" size={14} /> Adicionar alternativa
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button type="button" className={styles.secondaryButton} onClick={adicionarQuestao}>
                  <Icon name="plus" size={16} /> Adicionar questão
                </button>
              </>
            ) : (
              <ImportarQuestoesPlanilha
                tarefaGUID={editingGUID ?? undefined}
                onImportadoRascunho={handleImportadoRascunho}
                onImportadoBackend={handleImportadoBackend}
              />
            )}
          </div>
        )}

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

      {!ocultarListagem && (
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
      )}
    </div>
  );
}
