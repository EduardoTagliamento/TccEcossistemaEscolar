'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Icon } from '@/components/Icon';
import * as MateriaGlobalAPI from '@/lib/api/materiaglobal.api';
import * as QuestaoBancoAPI from '@/lib/api/questaobanco.api';
import * as SugestaoAPI from '@/lib/api/sugestao.api';
import * as AnexoAPI from '@/lib/api/anexo.api';
import * as TurmaAPI from '@/lib/api/turma.api';
import * as AlunoAPI from '@/lib/api/aluno.api';
import styles from './page.module.css';

// Mesmo parser mínimo de `banco-questoes/page.tsx` (não extraído pra componente
// compartilhado de propósito — evita acoplar essa tela, em desenvolvimento ativo
// em paralelo por outra sessão, a uma mudança de contrato aqui). `\n\n` vira
// parágrafo, `**texto**` vira negrito, `![alt](url)` vira imagem inline.
const TOKEN_REGEX_PREVIEW = /\*\*(.+?)\*\*|!\[([^\]]*)\]\(([^)]+)\)/g;
function renderInlineTokensPreview(texto: string, keyPrefix: string): ReactNode[] {
  const partes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;
  TOKEN_REGEX_PREVIEW.lastIndex = 0;
  while ((match = TOKEN_REGEX_PREVIEW.exec(texto)) !== null) {
    if (match.index > lastIndex) partes.push(texto.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      partes.push(<strong key={`${keyPrefix}-${idx++}`}>{match[1]}</strong>);
    } else {
      partes.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`${keyPrefix}-${idx++}`} src={match[3]} alt={match[2]} className={styles.enunciadoImagemInline} />
      );
    }
    lastIndex = TOKEN_REGEX_PREVIEW.lastIndex;
  }
  if (lastIndex < texto.length) partes.push(texto.slice(lastIndex));
  return partes;
}
function renderEnunciadoPreview(texto: string) {
  return texto.split(/\n\n+/).map((paragrafo, i) => (
    <p key={i} className={styles.enunciadoParagrafo}>
      {renderInlineTokensPreview(paragrafo, `p${i}`)}
    </p>
  ));
}

/** Acha todas as ocorrências `![alt](url)` dentro do Enunciado — cada uma vira um
 * cartão de imagem editável (recortar/trocar/remover) na tela de validação. */
function extrairImagensInline(texto: string): { alt: string; url: string; ocorrencia: string }[] {
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const resultado: { alt: string; url: string; ocorrencia: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(texto)) !== null) {
    resultado.push({ alt: m[1], url: m[2], ocorrencia: m[0] });
  }
  return resultado;
}

interface AreaRecorteTela {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

/**
 * Modal de recorte de imagem — sem lib externa, arrasta um retângulo sobre a imagem carregada.
 * Só calcula a ÁREA (em pixels reais do arquivo, não de tela) e devolve pro chamador — o recorte
 * em si roda no SERVIDOR (`AnexoAPI.recortarAnexo`, via sharp), não aqui. Tentativa inicial usava
 * `<canvas>`/`toBlob()` no navegador, mas imagem de outra origem (R2) deixa o canvas "tainted"
 * (bloqueado pelo navegador por CORS) mesmo só pra EXIBIR funcionando normalmente — `toBlob()`
 * falhava sempre com "Tainted canvases may not be exported", confirmado em produção. Pedido do
 * Eduardo, 2026-10-05 ("dá pra arrastar e cortar parte da imagem").
 */
function ModalRecorteImagem({
  src,
  onCancelar,
  onConfirmar,
}: {
  src: string;
  onCancelar: () => void;
  onConfirmar: (area: AnexoAPI.AreaRecorte) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [inicio, setInicio] = useState<{ x: number; y: number } | null>(null);
  const [area, setArea] = useState<AreaRecorteTela | null>(null);
  const [erro, setErro] = useState('');

  const posRelativa = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const p = posRelativa(e);
    setInicio(p);
    setArea({ x: p.x, y: p.y, largura: 0, altura: 0 });
    setArrastando(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!arrastando || !inicio) return;
    const p = posRelativa(e);
    setArea({
      x: Math.min(inicio.x, p.x),
      y: Math.min(inicio.y, p.y),
      largura: Math.abs(p.x - inicio.x),
      altura: Math.abs(p.y - inicio.y),
    });
  };

  const handleMouseUp = () => setArrastando(false);

  const handleConfirmar = () => {
    const img = imgRef.current;
    if (!img || !area || area.largura < 5 || area.altura < 5) {
      setErro('Arraste um retângulo sobre a imagem pra marcar o recorte.');
      return;
    }
    // Imagem exibida (CSS) pode ter escala diferente do pixel real do arquivo — converte a área
    // arrastada (coordenada de tela) pra coordenada natural antes de mandar pro servidor.
    const escalaX = img.naturalWidth / img.clientWidth;
    const escalaY = img.naturalHeight / img.clientHeight;
    onConfirmar({
      left: Math.round(area.x * escalaX),
      top: Math.round(area.y * escalaY),
      width: Math.round(area.largura * escalaX),
      height: Math.round(area.altura * escalaY),
    });
  };

  return (
    <div className={styles.recorteOverlay} onClick={onCancelar}>
      <div className={styles.recorteModal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.hint}>Arraste um retângulo sobre a parte da imagem que quer manter.</p>
        <div
          className={styles.recorteArea}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt="Imagem a recortar"
            className={styles.recorteImagem}
            draggable={false}
            onError={() => setErro('Não deu pra carregar essa imagem pra recortar.')}
          />
          {area && (
            <div
              className={styles.recorteSelecao}
              style={{ left: area.x, top: area.y, width: area.largura, height: area.altura }}
            />
          )}
        </div>
        {erro && <p className={styles.erroTexto}>{erro}</p>}
        <div className={styles.recorteAcoes}>
          <button type="button" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className={styles.botaoSalvar} onClick={handleConfirmar}>
            Confirmar recorte
          </button>
        </div>
      </div>
    </div>
  );
}

const DIFICULDADES: QuestaoBancoAPI.QuestaoBancoDificuldade[] = ['Facil', 'Media', 'Dificil'];

// Fluxo temporário da feira técnica (ver docs/SPEC_FEIRA_TECNICA_UNIVAP_2026.md) —
// escola fixa de propósito, é a única "Univap" real das 8 que existem no banco.
const ESCOLA_GUID_UNIVAP = 'b67a6634-9afd-4fb3-8227-d2569a3db98c';
const ESCOLA_NOME_UNIVAP = 'Colégios UNIVAP - Centro';

function formularioAlunoUnivapVazio() {
  return { UsuarioNome: '', UsuarioEmail: '', UsuarioTelefone: '', TurmaGUID: '' };
}

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

  // ---- Sugestões (módulo temporário, beta com grupo pequeno) ----
  const [sugestoes, setSugestoes] = useState<SugestaoAPI.Sugestao[]>([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(true);

  const carregarSugestoes = async () => {
    try {
      setCarregandoSugestoes(true);
      setSugestoes(await SugestaoAPI.listarSugestoes());
    } catch (erro: any) {
      alert(erro.message || 'Erro ao carregar sugestões');
    } finally {
      setCarregandoSugestoes(false);
    }
  };

  const handleExcluirSugestao = async (guid: string) => {
    if (!confirm('Excluir esta sugestão?')) return;
    try {
      await SugestaoAPI.excluirSugestao(guid);
      setSugestoes((prev) => prev.filter((s) => s.SugestaoGUID !== guid));
    } catch (erro: any) {
      alert(erro.message || 'Erro ao excluir sugestão');
    }
  };

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

  // ---- Fila de validação de questões (Status='Pendente') ----
  interface FormEdicaoQuestao {
    MateriaGlobalGUID: string;
    SubMateriaGlobalGUID: string;
    VestibularGUID: string;
    Dificuldade: QuestaoBancoAPI.QuestaoBancoDificuldade;
    Enunciado: string;
    Alternativas: { Texto: string; Correta: boolean }[];
  }

  const [questoesPendentes, setQuestoesPendentes] = useState<QuestaoBancoAPI.QuestaoBanco[]>([]);
  const [carregandoPendentes, setCarregandoPendentes] = useState(true);
  const [editandoGUID, setEditandoGUID] = useState<string | null>(null);
  const [formEdicao, setFormEdicao] = useState<FormEdicaoQuestao | null>(null);
  const [subMateriasEdicao, setSubMateriasEdicao] = useState<MateriaGlobalAPI.SubMateriaGlobal[]>([]);
  const [novoVestibularEdicao, setNovoVestibularEdicao] = useState('');
  const [novaSubMateriaEdicao, setNovaSubMateriaEdicao] = useState('');
  const [anexosEdicao, setAnexosEdicao] = useState<{ AnexoGUID: string; AnexoCaminho: string }[]>([]);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [validandoGUID, setValidandoGUID] = useState<string | null>(null);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [recorteAberto, setRecorteAberto] = useState<{ src: string; aoConfirmar: (area: AnexoAPI.AreaRecorte) => void } | null>(
    null
  );
  // Só 1 questão fica aberta pra edição por vez (`editandoGUID`), então 1 ref compartilhada
  // entre todas as linhas do .map() é suficiente (nunca renderiza 2 textareas ao mesmo tempo).
  const enunciadoEdicaoRef = useRef<HTMLTextAreaElement>(null);

  const carregarPendentes = async () => {
    try {
      setCarregandoPendentes(true);
      setQuestoesPendentes(await QuestaoBancoAPI.listarPendentes());
    } catch (erro: any) {
      alert(erro.message || 'Erro ao carregar questões pendentes');
    } finally {
      setCarregandoPendentes(false);
    }
  };

  const abrirEdicao = (questao: QuestaoBancoAPI.QuestaoBanco) => {
    setEditandoGUID(questao.QuestaoBancoGUID);
    setFormEdicao({
      MateriaGlobalGUID: questao.MateriaGlobalGUID,
      SubMateriaGlobalGUID: questao.SubMateriaGlobalGUID,
      VestibularGUID: questao.VestibularGUID,
      Dificuldade: questao.Dificuldade,
      Enunciado: questao.Enunciado,
      Alternativas: questao.Alternativas.map((a) => ({ Texto: a.AlternativaTexto, Correta: a.AlternativaCorreta })),
    });
    setAnexosEdicao(questao.Anexos.map((a) => ({ AnexoGUID: a.AnexoGUID, AnexoCaminho: a.AnexoCaminho })));
  };

  const fecharEdicao = () => {
    setEditandoGUID(null);
    setFormEdicao(null);
    setAnexosEdicao([]);
    setSubMateriasEdicao([]);
    setNovoVestibularEdicao('');
    setNovaSubMateriaEdicao('');
  };

  const handleAdicionarVestibularEdicao = async () => {
    const nome = novoVestibularEdicao.trim();
    if (!nome) return;
    try {
      const criado = await QuestaoBancoAPI.criarVestibular(nome);
      setVestibulares((prev) => (prev.some((v) => v.VestibularGUID === criado.VestibularGUID) ? prev : [...prev, criado]));
      setFormEdicao((p) => (p ? { ...p, VestibularGUID: criado.VestibularGUID } : p));
      setNovoVestibularEdicao('');
    } catch (erro: any) {
      alert(erro.message || 'Erro ao criar vestibular');
    }
  };

  const handleAdicionarSubMateriaEdicao = async () => {
    const nome = novaSubMateriaEdicao.trim();
    if (!nome || !formEdicao?.MateriaGlobalGUID) return;
    try {
      const criada = await MateriaGlobalAPI.criarSubMateria(formEdicao.MateriaGlobalGUID, nome);
      setSubMateriasEdicao((prev) => [...prev, criada]);
      setFormEdicao((p) => (p ? { ...p, SubMateriaGlobalGUID: criada.SubMateriaGlobalGUID } : p));
      setNovaSubMateriaEdicao('');
    } catch (erro: any) {
      alert(erro.message || 'Erro ao criar submatéria');
    }
  };

  useEffect(() => {
    if (!editandoGUID || !formEdicao?.MateriaGlobalGUID) return;
    MateriaGlobalAPI.listarSubMaterias(formEdicao.MateriaGlobalGUID)
      .then(setSubMateriasEdicao)
      .catch((erro: any) => alert(erro.message || 'Erro ao carregar submatérias'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formEdicao?.MateriaGlobalGUID, editandoGUID]);

  const validarFormEdicao = (): { Texto: string; Correta: boolean }[] | null => {
    if (!formEdicao) return null;
    if (!formEdicao.MateriaGlobalGUID || !formEdicao.SubMateriaGlobalGUID || !formEdicao.VestibularGUID) {
      // Sem isso, um GUID vazio (ex. admin deixou o dropdown em "Vestibular...") seguia até o
      // banco e quebrava a foreign key (`FK_QuestaoBanco_Vestibular`) só no PATCH — erro real
      // confirmado em produção, bem mais tarde e mais confuso do que travar aqui na validação.
      alert('Selecione matéria global, submatéria e vestibular.');
      return null;
    }
    if (!formEdicao.Enunciado.trim()) {
      alert('Informe o enunciado.');
      return null;
    }
    const alternativasPreenchidas = formEdicao.Alternativas.filter((a) => a.Texto.trim());
    if (alternativasPreenchidas.length < 2 || alternativasPreenchidas.filter((a) => a.Correta).length !== 1) {
      alert('Pelo menos 2 alternativas preenchidas, exatamente uma marcada como correta.');
      return null;
    }
    return alternativasPreenchidas;
  };

  const handleSalvarEdicao = async () => {
    if (!editandoGUID || !formEdicao) return;
    const alternativasPreenchidas = validarFormEdicao();
    if (!alternativasPreenchidas) return;
    setSalvandoEdicao(true);
    try {
      const atualizada = await QuestaoBancoAPI.atualizarQuestao(editandoGUID, {
        MateriaGlobalGUID: formEdicao.MateriaGlobalGUID,
        SubMateriaGlobalGUID: formEdicao.SubMateriaGlobalGUID,
        VestibularGUID: formEdicao.VestibularGUID,
        Dificuldade: formEdicao.Dificuldade,
        Enunciado: formEdicao.Enunciado.trim(),
        Alternativas: alternativasPreenchidas,
        AnexoGUIDs: anexosEdicao.map((a) => a.AnexoGUID),
      });
      setQuestoesPendentes((prev) => prev.map((p) => (p.QuestaoBancoGUID === editandoGUID ? atualizada : p)));
    } catch (erro: any) {
      alert(erro.message || 'Erro ao salvar edição');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  /** "Validar com o estado atual" — salva o formulário (como está AGORA, mesmo que nunca
   * tenha clicado em "Salvar" antes) e só então marca Status='Validado', num clique só. */
  const handleValidarComEdicao = async (guid: string) => {
    if (editandoGUID !== guid || !formEdicao) {
      // Pendente ainda não aberta pra edição (lista recolhida) — valida direto, sem tocar
      // em nada do conteúdo (equivalente a "está bom do jeito que está").
      setValidandoGUID(guid);
      try {
        await QuestaoBancoAPI.validarQuestao(guid);
        setQuestoesPendentes((prev) => prev.filter((p) => p.QuestaoBancoGUID !== guid));
      } catch (erro: any) {
        alert(erro.message || 'Erro ao validar questão');
      } finally {
        setValidandoGUID(null);
      }
      return;
    }

    const alternativasPreenchidas = validarFormEdicao();
    if (!alternativasPreenchidas) return;
    setValidandoGUID(guid);
    try {
      await QuestaoBancoAPI.atualizarQuestao(guid, {
        MateriaGlobalGUID: formEdicao.MateriaGlobalGUID,
        SubMateriaGlobalGUID: formEdicao.SubMateriaGlobalGUID,
        VestibularGUID: formEdicao.VestibularGUID,
        Dificuldade: formEdicao.Dificuldade,
        Enunciado: formEdicao.Enunciado.trim(),
        Alternativas: alternativasPreenchidas,
        AnexoGUIDs: anexosEdicao.map((a) => a.AnexoGUID),
      });
      await QuestaoBancoAPI.validarQuestao(guid);
      setQuestoesPendentes((prev) => prev.filter((p) => p.QuestaoBancoGUID !== guid));
      fecharEdicao();
    } catch (erro: any) {
      alert(erro.message || 'Erro ao validar questão');
    } finally {
      setValidandoGUID(null);
    }
  };

  const handleExcluirPendente = async (guid: string) => {
    if (!confirm('Excluir esta questão pendente? Essa ação não pode ser desfeita.')) return;
    try {
      await QuestaoBancoAPI.excluirQuestao(guid);
      setQuestoesPendentes((prev) => prev.filter((p) => p.QuestaoBancoGUID !== guid));
      if (editandoGUID === guid) fecharEdicao();
    } catch (erro: any) {
      alert(erro.message || 'Erro ao excluir questão');
    }
  };

  const handleAlternativaEdicaoTexto = (indice: number, texto: string) => {
    setFormEdicao((prev) =>
      prev ? { ...prev, Alternativas: prev.Alternativas.map((a, i) => (i === indice ? { ...a, Texto: texto } : a)) } : prev
    );
  };

  const handleAlternativaEdicaoCorreta = (indice: number) => {
    setFormEdicao((prev) =>
      prev ? { ...prev, Alternativas: prev.Alternativas.map((a, i) => ({ ...a, Correta: i === indice })) } : prev
    );
  };

  /** Trocar (recortar de novo) uma imagem já anexada ao enunciado — recorta em cima do anexo que
   * já existe, direto no servidor, sem precisar reenviar o arquivo. */
  const handleTrocarAnexoEnunciado = (anexoAtual: { AnexoGUID: string; AnexoCaminho: string }) => {
    setRecorteAberto({
      src: anexoAtual.AnexoCaminho,
      aoConfirmar: async (area) => {
        setRecorteAberto(null);
        setEnviandoImagem(true);
        try {
          const anexo = await AnexoAPI.recortarAnexo(anexoAtual.AnexoGUID, area);
          setAnexosEdicao((prev) =>
            prev
              .filter((a) => a.AnexoGUID !== anexoAtual.AnexoGUID)
              .concat({ AnexoGUID: anexo.AnexoGUID, AnexoCaminho: anexo.AnexoCaminho })
          );
        } catch (erro: any) {
          alert(erro.message || 'Erro ao recortar imagem');
        } finally {
          setEnviandoImagem(false);
        }
      },
    });
  };

  const handleRemoverAnexoEnunciado = (anexoGUID: string) => {
    setAnexosEdicao((prev) => prev.filter((a) => a.AnexoGUID !== anexoGUID));
  };

  /** Upload de arquivo novo (não é recorte de um já existente) — abre o modal de recorte com o
   * arquivo escolhido como fonte, pra sempre passar por um corte antes de anexar. Sobe o arquivo
   * original primeiro (precisa de um AnexoGUID pra poder chamar o endpoint de recorte), recorta
   * em cima dele, e descarta o original sem recorte (best-effort, não bloqueia a resposta). */
  const handleArquivoNovaImagemEnunciado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    const src = URL.createObjectURL(arquivo);
    setRecorteAberto({
      src,
      aoConfirmar: async (area) => {
        setRecorteAberto(null);
        URL.revokeObjectURL(src);
        setEnviandoImagem(true);
        try {
          const original = await AnexoAPI.uploadAnexo(arquivo, ESCOLA_GUID_UNIVAP);
          const anexo = await AnexoAPI.recortarAnexo(original.AnexoGUID, area);
          AnexoAPI.excluirAnexo(original.AnexoGUID).catch(() => {});
          setAnexosEdicao((prev) => [...prev, { AnexoGUID: anexo.AnexoGUID, AnexoCaminho: anexo.AnexoCaminho }]);
        } catch (erro: any) {
          alert(erro.message || 'Erro ao enviar imagem');
        } finally {
          setEnviandoImagem(false);
        }
      },
    });
  };

  /** Trocar/recortar de novo uma imagem INLINE (`![alt](url)` dentro do próprio Enunciado) — só
   * tem a URL no texto, não o AnexoGUID, então resolve ele primeiro antes de poder recortar. */
  const handleTrocarImagemInline = (img: { alt: string; url: string; ocorrencia: string }) => {
    setRecorteAberto({
      src: img.url,
      aoConfirmar: async (area) => {
        setRecorteAberto(null);
        setEnviandoImagem(true);
        try {
          const original = await AnexoAPI.buscarAnexoPorCaminho(img.url);
          const anexo = await AnexoAPI.recortarAnexo(original.AnexoGUID, area);
          const novaTag = `![${img.alt}](${anexo.AnexoCaminho})`;
          setFormEdicao((prev) => (prev ? { ...prev, Enunciado: prev.Enunciado.split(img.ocorrencia).join(novaTag) } : prev));
        } catch (erro: any) {
          alert(erro.message || 'Erro ao recortar imagem');
        } finally {
          setEnviandoImagem(false);
        }
      },
    });
  };

  const handleRemoverImagemInline = (img: { ocorrencia: string }) => {
    setFormEdicao((prev) =>
      prev ? { ...prev, Enunciado: prev.Enunciado.split(img.ocorrencia).join('').replace(/[ \t]{2,}/g, ' ').trim() } : prev
    );
  };

  /** Insere `\n\n` (quebra de PARÁGRAFO — a prévia só reconhece essa, não um Enter só) na
   * posição do cursor do textarea, no lugar de pedir pro admin decorar a sintaxe. */
  const inserirQuebraParagrafo = () => {
    const el = enunciadoEdicaoRef.current;
    if (!el || !formEdicao) return;
    const inicio = el.selectionStart ?? formEdicao.Enunciado.length;
    const fim = el.selectionEnd ?? inicio;
    const novoTexto = formEdicao.Enunciado.slice(0, inicio) + '\n\n' + formEdicao.Enunciado.slice(fim);
    setFormEdicao((p) => (p ? { ...p, Enunciado: novoTexto } : p));
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = inicio + 2;
    });
  };

  // ---- Registrar aluno — Colégio Univap (feira técnica, temporário) ----
  const [turmasUnivap, setTurmasUnivap] = useState<TurmaAPI.Turma[]>([]);
  const [carregandoTurmasUnivap, setCarregandoTurmasUnivap] = useState(true);
  const [formAlunoUnivap, setFormAlunoUnivap] = useState(formularioAlunoUnivapVazio());
  const [salvandoAlunoUnivap, setSalvandoAlunoUnivap] = useState(false);
  const [mensagemAlunoUnivap, setMensagemAlunoUnivap] = useState('');

  const carregarTurmasUnivap = async () => {
    try {
      setCarregandoTurmasUnivap(true);
      const resultado = await TurmaAPI.listarTurmas({ EscolaGUID: ESCOLA_GUID_UNIVAP });
      setTurmasUnivap(
        [...resultado.turmas].sort((a, b) => a.TurmaSerie.localeCompare(b.TurmaSerie) || a.TurmaNome.localeCompare(b.TurmaNome))
      );
    } catch (erro: any) {
      alert(erro.message || 'Erro ao carregar turmas da Univap');
    } finally {
      setCarregandoTurmasUnivap(false);
    }
  };

  const handleSalvarAlunoUnivap = async () => {
    if (!formAlunoUnivap.UsuarioNome.trim() || !formAlunoUnivap.TurmaGUID) {
      alert('Preencha nome e turma.');
      return;
    }
    setSalvandoAlunoUnivap(true);
    setMensagemAlunoUnivap('');
    try {
      await AlunoAPI.criarAluno(
        {
          UsuarioNome: formAlunoUnivap.UsuarioNome.trim(),
          UsuarioEmail: formAlunoUnivap.UsuarioEmail.trim() || undefined,
          UsuarioTelefone: formAlunoUnivap.UsuarioTelefone.trim() || undefined,
          TurmaGUID: formAlunoUnivap.TurmaGUID,
        },
        ESCOLA_GUID_UNIVAP,
        undefined,
        ESCOLA_NOME_UNIVAP
      );
      setMensagemAlunoUnivap(`"${formAlunoUnivap.UsuarioNome.trim()}" registrado com sucesso.`);
      setFormAlunoUnivap(formularioAlunoUnivapVazio());
    } catch (erro: any) {
      alert(erro.message || 'Erro ao registrar aluno');
    } finally {
      setSalvandoAlunoUnivap(false);
    }
  };

  useEffect(() => {
    if (!ehAdmin) return;
    void carregarSugestoes();
    void carregarFila();
    void carregarBanco();
    void carregarPendentes();
    void carregarTurmasUnivap();
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
          <Icon name="mail" size={18} /> Sugestões dos usuários ({sugestoes.length})
        </h2>
        <p className={styles.hint}>Módulo temporário — botão "?" flutuante no dashboard, pro teste com o grupo pequeno.</p>
        {carregandoSugestoes ? (
          <p>Carregando...</p>
        ) : sugestoes.length === 0 ? (
          <p className={styles.hint}>Nenhuma sugestão recebida ainda.</p>
        ) : (
          <ul className={styles.listaQuestoes}>
            {sugestoes.map((s) => (
              <li key={s.SugestaoGUID} className={styles.itemQuestao}>
                <div>
                  <p className={styles.hint}>
                    {s.UsuarioNome || s.UsuarioEmail || s.UsuarioGUID.slice(0, 8)} · {new Date(s.SugestaoCreatedAt).toLocaleString('pt-BR')}
                    {s.SugestaoPaginaUrl && ` · ${s.SugestaoPaginaUrl}`}
                  </p>
                  <p>{s.SugestaoTexto}</p>
                  {s.Anexos.length > 0 && (
                    <div className={styles.anexosSugestao}>
                      {s.Anexos.map((anexo) => (
                        <button
                          key={anexo.AnexoGUID}
                          type="button"
                          className={styles.anexoSugestaoBotao}
                          onClick={() => AnexoAPI.baixarAnexo(anexo.AnexoGUID, anexo.AnexoNomeOriginal || undefined)}
                        >
                          <Icon name="paperclip" size={13} /> {anexo.AnexoNomeOriginal || 'Arquivo anexado'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => handleExcluirSugestao(s.SugestaoGUID)}>
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
          <Icon name="check-circle" size={18} /> Questões pendentes de validação ({questoesPendentes.length})
        </h2>
        <p className={styles.hint}>
          Questões extraídas automaticamente de livro — nunca foram revisadas por um humano. Só aparecem pro aluno
          depois de validadas aqui.
        </p>
        {carregandoPendentes ? (
          <p>Carregando...</p>
        ) : questoesPendentes.length === 0 ? (
          <p className={styles.hint}>Nenhuma questão pendente no momento.</p>
        ) : (
          <ul className={styles.listaQuestoes}>
            {questoesPendentes.map((q) => {
              const imagensInline = editandoGUID === q.QuestaoBancoGUID && formEdicao ? extrairImagensInline(formEdicao.Enunciado) : [];
              return (
                <li key={q.QuestaoBancoGUID} className={styles.itemQuestaoPendente}>
                  {editandoGUID === q.QuestaoBancoGUID && formEdicao ? (
                    <div className={styles.formQuestao}>
                      <div className={styles.linhaForm}>
                        <select
                          value={formEdicao.MateriaGlobalGUID}
                          onChange={(e) =>
                            setFormEdicao((p) => (p ? { ...p, MateriaGlobalGUID: e.target.value, SubMateriaGlobalGUID: '' } : p))
                          }
                        >
                          <option value="">Matéria global...</option>
                          {confirmados.map((c) => (
                            <option key={c.MateriaGlobalGUID} value={c.MateriaGlobalGUID}>
                              {c.Nome}
                            </option>
                          ))}
                        </select>
                        <select
                          value={formEdicao.SubMateriaGlobalGUID}
                          onChange={(e) => setFormEdicao((p) => (p ? { ...p, SubMateriaGlobalGUID: e.target.value } : p))}
                        >
                          <option value="">Submatéria...</option>
                          {subMateriasEdicao.map((s) => (
                            <option key={s.SubMateriaGlobalGUID} value={s.SubMateriaGlobalGUID}>
                              {s.Nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      {formEdicao.MateriaGlobalGUID && (
                        <div className={styles.linhaForm}>
                          <input
                            placeholder="Nova submatéria (ex: Trigonometria)"
                            value={novaSubMateriaEdicao}
                            onChange={(e) => setNovaSubMateriaEdicao(e.target.value)}
                          />
                          <button type="button" onClick={handleAdicionarSubMateriaEdicao} disabled={!novaSubMateriaEdicao.trim()}>
                            Adicionar submatéria
                          </button>
                        </div>
                      )}

                      <div className={styles.linhaForm}>
                        <select
                          value={formEdicao.VestibularGUID}
                          onChange={(e) => setFormEdicao((p) => (p ? { ...p, VestibularGUID: e.target.value } : p))}
                        >
                          <option value="">Vestibular...</option>
                          {vestibulares.map((v) => (
                            <option key={v.VestibularGUID} value={v.VestibularGUID}>
                              {v.Nome}
                            </option>
                          ))}
                        </select>
                        <input
                          placeholder="Novo vestibular (ex: ENEM)"
                          value={novoVestibularEdicao}
                          onChange={(e) => setNovoVestibularEdicao(e.target.value)}
                        />
                        <button type="button" onClick={handleAdicionarVestibularEdicao} disabled={!novoVestibularEdicao.trim()}>
                          Adicionar
                        </button>
                      </div>

                      <div className={styles.linhaForm}>
                        <select
                          value={formEdicao.Dificuldade}
                          onChange={(e) =>
                            setFormEdicao((p) => (p ? { ...p, Dificuldade: e.target.value as QuestaoBancoAPI.QuestaoBancoDificuldade } : p))
                          }
                        >
                          {DIFICULDADES.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      <textarea
                        ref={enunciadoEdicaoRef}
                        value={formEdicao.Enunciado}
                        onChange={(e) => setFormEdicao((p) => (p ? { ...p, Enunciado: e.target.value } : p))}
                        rows={6}
                      />
                      <div className={styles.linhaForm}>
                        <button type="button" onClick={inserirQuebraParagrafo}>
                          ¶ Quebra de parágrafo
                        </button>
                        <p className={styles.hint}>
                          Enter sozinho não separa parágrafo na prévia — deixe uma linha em branco entre trechos (ou
                          use o botão, que insere no cursor). <code>**texto**</code> vira negrito.
                        </p>
                      </div>

                      {imagensInline.length > 0 && (
                        <div className={styles.imagensEdicao}>
                          <p className={styles.hint}>Imagens embutidas no texto (fórmula/gráfico/tabela recortada):</p>
                          {imagensInline.map((img, i) => (
                            <div key={i} className={styles.imagemEdicaoCartao}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.url} alt={img.alt} className={styles.imagemEdicaoThumb} />
                              <div className={styles.imagemEdicaoAcoes}>
                                <button type="button" onClick={() => handleTrocarImagemInline(img)} disabled={enviandoImagem}>
                                  Recortar/trocar
                                </button>
                                <button type="button" onClick={() => handleRemoverImagemInline(img)}>
                                  Remover
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className={styles.previaTitulo}>Prévia (como o aluno vê):</p>
                      <div className={styles.previaEnunciado}>{renderEnunciadoPreview(formEdicao.Enunciado)}</div>

                      {anexosEdicao.length > 0 && (
                        <div className={styles.imagensEdicao}>
                          <p className={styles.hint}>Imagens anexadas à questão (não embutidas no texto):</p>
                          {anexosEdicao.map((a) => (
                            <div key={a.AnexoGUID} className={styles.imagemEdicaoCartao}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={a.AnexoCaminho} alt="Anexo da questão" className={styles.imagemEdicaoThumb} />
                              <div className={styles.imagemEdicaoAcoes}>
                                <button type="button" onClick={() => handleTrocarAnexoEnunciado(a)} disabled={enviandoImagem}>
                                  Recortar/trocar
                                </button>
                                <button type="button" onClick={() => handleRemoverAnexoEnunciado(a.AnexoGUID)}>
                                  Remover
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <label className={styles.botaoUpload}>
                        {enviandoImagem ? 'Enviando...' : '+ Adicionar imagem'}
                        <input type="file" accept="image/*" hidden onChange={handleArquivoNovaImagemEnunciado} disabled={enviandoImagem} />
                      </label>

                      <div className={styles.alternativas}>
                        {formEdicao.Alternativas.map((a, i) => (
                          <div key={i} className={styles.alternativaLinha}>
                            <input type="radio" name={`alt-correta-${q.QuestaoBancoGUID}`} checked={a.Correta} onChange={() => handleAlternativaEdicaoCorreta(i)} />
                            <input placeholder={`Alternativa ${i + 1}`} value={a.Texto} onChange={(e) => handleAlternativaEdicaoTexto(i, e.target.value)} />
                          </div>
                        ))}
                      </div>

                      <div className={styles.acoesPendente}>
                        <button type="button" onClick={fecharEdicao}>
                          Cancelar
                        </button>
                        <button type="button" onClick={handleSalvarEdicao} disabled={salvandoEdicao}>
                          {salvandoEdicao ? 'Salvando...' : 'Salvar sem validar'}
                        </button>
                        <button
                          type="button"
                          className={styles.botaoSalvar}
                          onClick={() => handleValidarComEdicao(q.QuestaoBancoGUID)}
                          disabled={validandoGUID === q.QuestaoBancoGUID}
                        >
                          {validandoGUID === q.QuestaoBancoGUID ? 'Validando...' : 'Validar com o estado atual'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.itemQuestao}>
                      <div>
                        <span className={styles.badgeDificuldade}>{q.Dificuldade}</span>
                        <p>
                          {q.Enunciado.replace(/!\[[^\]]*\]\([^)]+\)/g, '[imagem]').slice(0, 160)}
                          {q.Enunciado.length > 160 ? '…' : ''}
                        </p>
                      </div>
                      <div className={styles.acoesPendente}>
                        <button type="button" onClick={() => abrirEdicao(q)}>
                          Revisar
                        </button>
                        <button
                          type="button"
                          className={styles.botaoSalvar}
                          onClick={() => handleValidarComEdicao(q.QuestaoBancoGUID)}
                          disabled={validandoGUID === q.QuestaoBancoGUID}
                        >
                          {validandoGUID === q.QuestaoBancoGUID ? 'Validando...' : 'Validar direto'}
                        </button>
                        <button type="button" onClick={() => handleExcluirPendente(q.QuestaoBancoGUID)}>
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {recorteAberto && (
        <ModalRecorteImagem
          src={recorteAberto.src}
          onCancelar={() => setRecorteAberto(null)}
          onConfirmar={recorteAberto.aoConfirmar}
        />
      )}

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

      <section className={styles.secao}>
        <h2 className={styles.secaoTitulo}>
          <Icon name="users" size={18} /> Registrar aluno — Colégio Univap
        </h2>
        <p className={styles.hint}>
          Módulo temporário pra feira técnica — pra quem não apareceu na busca por nome do fluxo
          público (<code>/cadastro/univap</code>). Cria a conta direto nessa escola.
        </p>
        <div className={styles.formQuestao}>
          <div className={styles.linhaForm}>
            <input
              placeholder="Nome completo"
              value={formAlunoUnivap.UsuarioNome}
              onChange={(e) => setFormAlunoUnivap((p) => ({ ...p, UsuarioNome: e.target.value }))}
            />
            <select
              value={formAlunoUnivap.TurmaGUID}
              onChange={(e) => setFormAlunoUnivap((p) => ({ ...p, TurmaGUID: e.target.value }))}
              disabled={carregandoTurmasUnivap}
            >
              <option value="">{carregandoTurmasUnivap ? 'Carregando turmas...' : 'Turma...'}</option>
              {turmasUnivap.map((t) => (
                <option key={t.TurmaGUID} value={t.TurmaGUID}>
                  {t.TurmaSerie}º ano {t.TurmaNome}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.linhaForm}>
            <input
              placeholder="Telefone (opcional)"
              value={formAlunoUnivap.UsuarioTelefone}
              onChange={(e) => setFormAlunoUnivap((p) => ({ ...p, UsuarioTelefone: e.target.value }))}
            />
            <input
              placeholder="Email (opcional)"
              value={formAlunoUnivap.UsuarioEmail}
              onChange={(e) => setFormAlunoUnivap((p) => ({ ...p, UsuarioEmail: e.target.value }))}
            />
          </div>
          {mensagemAlunoUnivap && <p className={styles.hint}>{mensagemAlunoUnivap}</p>}
          <button type="button" className={styles.botaoSalvar} onClick={handleSalvarAlunoUnivap} disabled={salvandoAlunoUnivap}>
            {salvandoAlunoUnivap ? 'Registrando...' : 'Registrar aluno'}
          </button>
        </div>
      </section>
    </div>
  );
}
