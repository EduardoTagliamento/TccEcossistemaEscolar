'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Icon, IconName } from '@/components/Icon';
import ItemProgressoBar from '@/components/materias/ItemProgressoBar';
import VisualizadorItemModal from '@/components/materias/VisualizadorItemModal';
import EditarItemModal from '@/components/materias/EditarItemModal';
import NovoItemModal, { NovoItemAba } from '@/components/materias/NovoItemModal';
import { useRouter } from 'next/navigation';
import * as MateriasModuloAPI from '@/lib/api/materiasmodulo.api';
import * as CategoriaConteudoAPI from '@/lib/api/categoriaconteudo.api';
import * as TurmaAPI from '@/lib/api/turma.api';
import * as MateriaAPI from '@/lib/api/materia.api';
import * as ConversaAPI from '@/lib/api/conversa.api';
import { useChatUI } from '@/lib/chat/ChatUIContext';
import type { ItemCategoria } from '@/lib/api/materiasmodulo.api';
import Loader from '@/components/Loader';
import styles from './page.module.css';

interface EscolaComFuncoes {
  escola: { EscolaGUID: string };
  funcoes: Array<{ FuncaoId: number; Status: 'Ativo' | 'Inativo' | 'Finalizado' }>;
}

const ICONE_POR_TIPO: Record<ItemCategoria['Tipo'], IconName> = {
  prova: 'award',
  tarefa_digital: 'upload',
  tarefa_presencial: 'edit',
  tarefa_lista: 'list',
  conteudo_video: 'camera',
  conteudo_texto: 'file-text',
  conteudo_imagem: 'layers',
};

type AbaFiltro = 'tudo' | 'conteudos' | 'provas' | 'tarefas';

const GRUPO_POR_TIPO: Record<ItemCategoria['Tipo'], AbaFiltro> = {
  prova: 'provas',
  tarefa_digital: 'tarefas',
  tarefa_presencial: 'tarefas',
  tarefa_lista: 'tarefas',
  conteudo_video: 'conteudos',
  conteudo_texto: 'conteudos',
  conteudo_imagem: 'conteudos',
};

const COR_ICONE_POR_TIPO: Record<ItemCategoria['Tipo'], string> = {
  prova: '#F5A524',
  tarefa_digital: '#F5A524',
  tarefa_presencial: '#F5A524',
  tarefa_lista: '#F5A524',
  conteudo_video: '#7C6FF0',
  conteudo_texto: '#17C077',
  conteudo_imagem: '#7C6FF0',
};

const ABAS: { chave: AbaFiltro; label: string; icone: IconName }[] = [
  { chave: 'tudo', label: 'Tudo', icone: 'layers' },
  { chave: 'conteudos', label: 'Conteúdos', icone: 'file-text' },
  { chave: 'provas', label: 'Provas', icone: 'award' },
  { chave: 'tarefas', label: 'Tarefas', icone: 'list' },
];

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] || '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

function textoEstado(estado: ItemCategoria['Estado'], percentual: number | null): { texto: string; cor: string } {
  switch (estado) {
    case 'concluido':
      return { texto: 'Concluído', cor: '#17C077' };
    case 'atrasado':
      return { texto: 'Atrasado', cor: '#E5484D' };
    case 'aguardando_avaliacao':
      return { texto: 'Aguardando', cor: '#F5A524' };
    case 'avaliado':
    case 'parcial':
      return { texto: `${percentual ?? 0}%`, cor: '#647268' };
    default:
      return { texto: '', cor: '#647268' };
  }
}

function CategoriaPageConteudo() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const escolaGUID = (params?.escolaGUID as string) || '';
  const materiaGUID = (params?.materiaGUID as string) || '';
  const turmaGUID = (params?.turmaGUID as string) || '';
  const { usuario, token } = useAuth();
  const { definirConversaAberta } = useChatUI();

  const [ehProfessor, setEhProfessor] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [materiaNome, setMateriaNome] = useState('');
  const [turmaLabel, setTurmaLabel] = useState('');
  const [professorGUID, setProfessorGUID] = useState('');
  const [professorNome, setProfessorNome] = useState('');
  const [professorFotoUrl, setProfessorFotoUrl] = useState<string | null>(null);
  const [iniciandoConversa, setIniciandoConversa] = useState(false);
  const [imagemFundo, setImagemFundo] = useState<string | null>(null);
  const [corFundo, setCorFundo] = useState('#17C077');
  const [podeEditarCapa, setPodeEditarCapa] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [mensagemVisivel, setMensagemVisivel] = useState(true);
  const [abaFiltro, setAbaFiltro] = useState<AbaFiltro>('tudo');
  const [popoverGerenciarAberto, setPopoverGerenciarAberto] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [criandoCategoria, setCriandoCategoria] = useState(false);
  const [categorias, setCategorias] = useState<MateriasModuloAPI.CategoriaCompleta[]>([]);
  const [itensSemCategoria, setItensSemCategoria] = useState<ItemCategoria[]>([]);
  const [itemSelecionado, setItemSelecionado] = useState<ItemCategoria | null>(null);
  const [itemEditando, setItemEditando] = useState<ItemCategoria | null>(null);
  const [categoriaArrastando, setCategoriaArrastando] = useState<string | null>(null);
  const [popoverAberto, setPopoverAberto] = useState<string | null>(null);
  const [itemArrastando, setItemArrastando] = useState<string | null>(null);
  const [editandoCategoriaGUID, setEditandoCategoriaGUID] = useState<string | null>(null);
  const [confirmacaoCategoria, setConfirmacaoCategoria] = useState<{
    tipo: 'renomear' | 'excluir';
    categoria: MateriasModuloAPI.CategoriaCompleta;
    novoNome?: string;
  } | null>(null);
  const [modalNovoItem, setModalNovoItem] = useState<{ categoriaGUID: string; aba: NovoItemAba } | null>(null);

  // Trocar capa/cor da turma — só Representante/Vice-Representante do grupo
  // da turma (ou Coordenação/Direção) pode de fato salvar; o botão aparece
  // pra qualquer aluno (não dá pra saber a função dele aqui sem uma consulta
  // extra) e o backend rejeita com mensagem clara quem não tem permissão.
  const [modalCapaAberto, setModalCapaAberto] = useState(false);
  const [capaImagem, setCapaImagem] = useState<File | null>(null);
  const [capaImagemPreview, setCapaImagemPreview] = useState<string | null>(null);
  const [capaCor, setCapaCor] = useState('#17C077');
  const [capaCorAutomatica, setCapaCorAutomatica] = useState(false);
  const [capaSalvando, setCapaSalvando] = useState(false);
  const [capaErro, setCapaErro] = useState('');

  // Outras telas (ex.: "tarefas a se esgotar"/"avaliações pendentes" do
  // dashboard) linkam pra cá com ?abrirItem=GUID — abre o visualizador do
  // item automaticamente assim que a lista carregar. O módulo Matérias é
  // quem "recebe" essa navegação, nunca o contrário.
  const abrirItemGUID = searchParams?.get('abrirItem') || '';
  const itemAutoAbertoRef = useRef(false);

  useEffect(() => {
    if (escolaGUID && usuario) void inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaGUID, usuario, materiaGUID, turmaGUID]);

  useEffect(() => {
    if (mensagem) {
      const timer = setTimeout(() => setMensagemVisivel(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [mensagem]);

  const inicializar = async () => {
    if (!usuario) return;
    try {
      setCarregando(true);
      const response = await fetch(`/api/usuario/${usuario.UsuarioGUID}/escolas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const escolas: EscolaComFuncoes[] = data?.data?.escolas || [];
      const escolaSelecionada = escolas.find((item) => item.escola.EscolaGUID === escolaGUID);
      const funcoesAtivas = (escolaSelecionada?.funcoes || [])
        .filter((funcao) => funcao.Status === 'Ativo')
        .map((funcao) => funcao.FuncaoId);
      const professor = funcoesAtivas.includes(3);
      setEhProfessor(professor);

      const turma = await TurmaAPI.buscarTurma(turmaGUID);
      setTurmaLabel(`${turma.TurmaSerie} ${turma.TurmaNome}`.trim());
      setImagemFundo(turma.TurmaImagemUrl || null);
      setCorFundo(turma.TurmaCorFundo || '#17C077');

      if (professor) {
        const materia = await MateriaAPI.buscarMateria(materiaGUID);
        setMateriaNome(materia.MateriaNome);
        setProfessorNome(usuario.UsuarioNome);
        setProfessorFotoUrl(usuario.UsuarioFotoUrl || null);
      } else {
        const materias = await MateriasModuloAPI.listarMateriasDoAluno(usuario.UsuarioGUID, escolaGUID);
        const materiaAtual = materias.find((m) => m.MateriaGUID === materiaGUID);
        setMateriaNome(materiaAtual?.MateriaNome || 'Matéria');
        setProfessorGUID(materiaAtual?.ProfessorGUID || '');
        setProfessorNome(materiaAtual?.ProfessorNome || '');
        setProfessorFotoUrl(materiaAtual?.ProfessorFotoUrl || null);
        setMensagem(materiaAtual?.MensagemBoasVindas || null);

        // Só Representante/Vice-Representante do grupo da turma pode trocar
        // a capa — o backend já garante isso, aqui é só pra não mostrar o
        // botão pra quem não pode de fato usá-lo.
        try {
          const funcao = await TurmaAPI.buscarMinhaFuncaoGrupo(turmaGUID);
          setPodeEditarCapa(funcao === 'Representante' || funcao === 'Vice-Representante');
        } catch (erro) {
          console.error('Erro ao consultar função no grupo da turma:', erro);
          setPodeEditarCapa(false);
        }
      }

      await carregarCategorias();
    } catch (erro) {
      console.error('Erro ao inicializar tela de categoria:', erro);
    } finally {
      setCarregando(false);
    }
  };

  const handleConversarComProfessor = async () => {
    if (!professorGUID || iniciandoConversa) return;
    try {
      setIniciandoConversa(true);
      const { ConversaGUID } = await ConversaAPI.iniciarConversaIndividual(professorGUID);
      definirConversaAberta(ConversaGUID);
      router.push(`/dashboard/${escolaGUID}/chat`);
    } catch (erro) {
      console.error('Erro ao iniciar conversa com o professor:', erro);
    } finally {
      setIniciandoConversa(false);
    }
  };

  const abrirModalCapa = () => {
    setCapaCor(corFundo);
    setCapaCorAutomatica(false);
    setCapaImagem(null);
    setCapaImagemPreview(null);
    setCapaErro('');
    setModalCapaAberto(true);
  };

  const fecharModalCapa = () => {
    if (capaImagemPreview) URL.revokeObjectURL(capaImagemPreview);
    setCapaImagemPreview(null);
    setModalCapaAberto(false);
  };

  const escolherImagemCapa = (file: File | null) => {
    if (capaImagemPreview) URL.revokeObjectURL(capaImagemPreview);
    setCapaImagem(file);
    setCapaImagemPreview(file ? URL.createObjectURL(file) : null);
    // Nova imagem: até o usuário mexer na cor manualmente, deixa o backend
    // extrair a cor dominante dela automaticamente ao salvar.
    if (file) setCapaCorAutomatica(true);
  };

  const salvarCapaTurma = async () => {
    try {
      setCapaSalvando(true);
      setCapaErro('');
      await MateriasModuloAPI.atualizarCapaTurma(turmaGUID, {
        imagem: capaImagem || undefined,
        cor: capaCorAutomatica ? undefined : capaCor,
      });
      const turmaAtualizada = await TurmaAPI.buscarTurma(turmaGUID);
      setImagemFundo(turmaAtualizada.TurmaImagemUrl || null);
      setCorFundo(turmaAtualizada.TurmaCorFundo || '#17C077');
      if (capaImagemPreview) URL.revokeObjectURL(capaImagemPreview);
      setCapaImagem(null);
      setCapaImagemPreview(null);
      setModalCapaAberto(false);
    } catch (erro: any) {
      setCapaErro(erro?.message || 'Erro ao atualizar capa da turma');
    } finally {
      setCapaSalvando(false);
    }
  };

  const carregarCategorias = async () => {
    try {
      const { categorias: lista, itensSemCategoria: orfaos } = await MateriasModuloAPI.buscarCategoriasCompletas(materiaGUID, turmaGUID);
      setCategorias(lista);
      setItensSemCategoria(orfaos);
    } catch (erro) {
      console.error('Erro ao carregar categorias:', erro);
    }
  };

  useEffect(() => {
    if (itemAutoAbertoRef.current || !abrirItemGUID || (categorias.length === 0 && itensSemCategoria.length === 0)) return;
    const todosItens = [...categorias.flatMap((c) => c.Itens), ...itensSemCategoria];
    const item = todosItens.find((i) => i.ItemGUID === abrirItemGUID);
    if (item) {
      itemAutoAbertoRef.current = true;
      setItemSelecionado(item);
    }
  }, [abrirItemGUID, categorias, itensSemCategoria]);

  // Categoria "geral" (mesmo nome replicado por turma, ver PLANO_IMPLEMENTACAO_MATERIAS.md
  // 9.1) — renomear/excluir precisa da mesma escolha "só esta turma" vs "todas
  // as turmas" que já existe pra conteúdo/prova, senão as outras turmas com o
  // mesmo nome ficam desatualizadas/órfãs silenciosamente.
  const salvarRenomeCategoria = (categoriaGUID: string, novoNome: string) => {
    setEditandoCategoriaGUID(null);
    const nomeLimpo = novoNome.trim();
    const categoriaAtual = categorias.find((c) => c.CategoriaGUID === categoriaGUID);
    if (!nomeLimpo || !categoriaAtual || nomeLimpo === categoriaAtual.CategoriaNome) return;
    setConfirmacaoCategoria({ tipo: 'renomear', categoria: categoriaAtual, novoNome: nomeLimpo });
  };

  const pedirExclusaoCategoria = (categoria: MateriasModuloAPI.CategoriaCompleta) => {
    setConfirmacaoCategoria({ tipo: 'excluir', categoria });
  };

  const confirmarAcaoCategoria = async (todasAsTurmas: boolean) => {
    if (!confirmacaoCategoria) return;
    const { tipo, categoria, novoNome } = confirmacaoCategoria;
    setConfirmacaoCategoria(null);
    try {
      if (tipo === 'renomear' && novoNome) {
        if (todasAsTurmas) {
          await CategoriaConteudoAPI.atualizarCategoriaGeral(materiaGUID, categoria.CategoriaNome, novoNome);
        } else {
          await CategoriaConteudoAPI.atualizarCategoria(categoria.CategoriaGUID, novoNome);
        }
      } else if (tipo === 'excluir') {
        if (todasAsTurmas) {
          await CategoriaConteudoAPI.excluirCategoriaGeral(materiaGUID, categoria.CategoriaNome);
        } else {
          await CategoriaConteudoAPI.excluirCategoria(categoria.CategoriaGUID);
        }
      }
      await carregarCategorias();
    } catch (erro: any) {
      alert(erro?.message || 'Erro ao processar categoria');
    }
  };

  const criarNovaCategoria = async () => {
    const nome = novaCategoriaNome.trim();
    if (!nome) return;
    try {
      setCriandoCategoria(true);
      await CategoriaConteudoAPI.criarCategoria(materiaGUID, turmaGUID, nome);
      setNovaCategoriaNome('');
      setPopoverGerenciarAberto(false);
      await carregarCategorias();
    } catch (erro: any) {
      alert(erro?.message || 'Erro ao criar categoria');
    } finally {
      setCriandoCategoria(false);
    }
  };

  const abrirNovoItem = (categoriaGUID: string, aba: NovoItemAba) => {
    setPopoverAberto(null);
    setModalNovoItem({ categoriaGUID, aba });
  };

  const handleDragStart = (categoriaGUID: string) => setCategoriaArrastando(categoriaGUID);

  const handleDrop = async (categoriaDestinoGUID: string) => {
    if (!categoriaArrastando || categoriaArrastando === categoriaDestinoGUID) {
      setCategoriaArrastando(null);
      return;
    }

    const ordemAtual = categorias.map((c) => c.CategoriaGUID);
    const origemIdx = ordemAtual.indexOf(categoriaArrastando);
    const destinoIdx = ordemAtual.indexOf(categoriaDestinoGUID);
    ordemAtual.splice(origemIdx, 1);
    ordemAtual.splice(destinoIdx, 0, categoriaArrastando);

    setCategoriaArrastando(null);
    setCategorias((prev) => {
      const mapa = new Map(prev.map((c) => [c.CategoriaGUID, c]));
      return ordemAtual.map((guid) => mapa.get(guid)!);
    });

    try {
      await CategoriaConteudoAPI.reordenarCategorias(materiaGUID, turmaGUID, ordemAtual);
    } catch (erro) {
      console.error('Erro ao reordenar categorias:', erro);
      await carregarCategorias();
    }
  };

  // Drag-and-drop de item: move pra outra categoria (ou reordena dentro da
  // mesma) — itemDestinoGUID null significa "soltou no fim/vazio da categoria".
  const handleItemDragStart = (e: React.DragEvent, itemGUID: string) => {
    e.stopPropagation(); // não deixa o drag do item também disparar o drag da categoria (pai)
    setItemArrastando(itemGUID);
  };

  const moverItem = async (categoriaDestinoGUID: string, itemDestinoGUID: string | null) => {
    if (!itemArrastando) return;
    const arrastadoGUID = itemArrastando;
    setItemArrastando(null);
    if (arrastadoGUID === itemDestinoGUID) return;

    // O item arrastado pode ter vindo de uma categoria real ou do grupo
    // "sem categoria" (itens órfãos de uma categoria excluída) — os dois
    // precisam ser checados como origem possível.
    let itemMovido: ItemCategoria | undefined;
    const itemNoSemCategoria = itensSemCategoria.find((i) => i.ItemGUID === arrastadoGUID);
    if (itemNoSemCategoria) {
      itemMovido = itemNoSemCategoria;
      setItensSemCategoria((prev) => prev.filter((i) => i.ItemGUID !== arrastadoGUID));
    }

    const semOrigem = categorias.map((c) => {
      const idx = c.Itens.findIndex((i) => i.ItemGUID === arrastadoGUID);
      if (idx === -1) return c;
      itemMovido = c.Itens[idx];
      return { ...c, Itens: c.Itens.filter((i) => i.ItemGUID !== arrastadoGUID) };
    });
    if (!itemMovido) return;

    const itemMovidoFinal = itemMovido;
    const novasCategorias = semOrigem.map((c) => {
      if (c.CategoriaGUID !== categoriaDestinoGUID) return c;
      const itens = [...c.Itens];
      const destinoIdx = itemDestinoGUID ? itens.findIndex((i) => i.ItemGUID === itemDestinoGUID) : -1;
      if (destinoIdx === -1) {
        itens.push(itemMovidoFinal);
      } else {
        itens.splice(destinoIdx, 0, itemMovidoFinal);
      }
      return { ...c, Itens: itens };
    });

    setCategorias(novasCategorias);

    const categoriaDestino = novasCategorias.find((c) => c.CategoriaGUID === categoriaDestinoGUID);
    if (!categoriaDestino) return;

    try {
      await CategoriaConteudoAPI.reordenarItens(
        materiaGUID,
        turmaGUID,
        categoriaDestinoGUID,
        categoriaDestino.Itens.map((i) => ({ ItemGUID: i.ItemGUID, Tipo: i.Tipo }))
      );
    } catch (erro) {
      console.error('Erro ao reordenar itens:', erro);
      await carregarCategorias();
    }
  };

  if (carregando) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '3rem 0' }}>
          <Loader />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  const passaFiltro = (item: ItemCategoria) => abaFiltro === 'tudo' || GRUPO_POR_TIPO[item.Tipo] === abaFiltro;
  const categoriasFiltradas = categorias
    .map((c) => ({ ...c, Itens: c.Itens.filter(passaFiltro) }))
    .filter((c) => abaFiltro === 'tudo' || c.Itens.length > 0);
  const itensSemCategoriaFiltrados = itensSemCategoria.filter(passaFiltro);

  return (
    <div className={styles.container}>
      <div className={styles.topoWrap}>
        <Link href={`/dashboard/${escolaGUID}/materias`} className={styles.voltarLink}>
          <Icon name="chevron-left" size={16} /> Matérias
        </Link>
      </div>

      <div className={styles.hero}>
        {imagemFundo ? (
          <div className={styles.heroFundo} style={{ backgroundImage: `url(${imagemFundo})` }} />
        ) : (
          <div className={styles.heroFundoCor} style={{ backgroundColor: corFundo }} />
        )}
        {podeEditarCapa && (
          <button
            type="button"
            className={styles.heroEditarCapa}
            onClick={abrirModalCapa}
            title="Editar capa da turma"
          >
            <Icon name="edit" size={14} /> Editar capa
          </button>
        )}
        <div className={styles.heroConteudo}>
          {mensagem && mensagemVisivel && <div className={styles.heroMensagem}>{mensagem}</div>}
          {turmaLabel && <span className={styles.heroTurmaLabel}>Turma {turmaLabel}</span>}
          <h1 className={styles.heroTitulo}>{materiaNome}</h1>
          {professorNome && (
            <div className={styles.heroProfessor}>
              {professorFotoUrl ? (
                <img src={professorFotoUrl} alt={professorNome} className={styles.heroProfessorFoto} />
              ) : (
                <span className={styles.heroProfessorAvatar}>{iniciais(professorNome)}</span>
              )}
              <span>{professorNome}</span>
              {!ehProfessor && professorGUID && (
                <button
                  type="button"
                  onClick={handleConversarComProfessor}
                  disabled={iniciandoConversa}
                  className={styles.heroProfessorConversar}
                >
                  <Icon name="message-circle" size={14} />
                  {iniciandoConversa ? 'Abrindo...' : 'Conversar'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.abasBar}>
        <div className={styles.abas}>
          {ABAS.map((aba) => (
            <button
              key={aba.chave}
              className={abaFiltro === aba.chave ? styles.abaAtiva : styles.aba}
              onClick={() => setAbaFiltro(aba.chave)}
            >
              <Icon name={aba.icone} size={15} /> {aba.label}
            </button>
          ))}
        </div>
        {ehProfessor && (
          <div className={styles.acoesWrapper}>
            <button
              className={styles.botaoGerenciarCategorias}
              onClick={() => setPopoverGerenciarAberto((v) => !v)}
            >
              <Icon name="folder" size={15} /> Gerenciar categorias
            </button>
            {popoverGerenciarAberto && (
              <div className={styles.popoverGerenciar}>
                <label className={styles.popoverGerenciarLabel}>Nova categoria</label>
                <div className={styles.popoverGerenciarForm}>
                  <input
                    className={styles.popoverGerenciarInput}
                    value={novaCategoriaNome}
                    onChange={(e) => setNovaCategoriaNome(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && criarNovaCategoria()}
                    placeholder="Ex.: 2º Trimestre 2026"
                    autoFocus
                  />
                  <button onClick={criarNovaCategoria} disabled={criandoCategoria || !novaCategoriaNome.trim()}>
                    <Icon name="plus" size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.corpo}>
        {categoriasFiltradas.length === 0 && itensSemCategoriaFiltrados.length === 0 && (
          <p className={styles.mensagemSemCategoria}>
            {categorias.length === 0 && itensSemCategoria.length === 0
              ? ehProfessor
                ? 'Nenhuma categoria criada ainda.'
                : 'Nenhum conteúdo publicado ainda.'
              : 'Nenhum item nesta aba.'}
          </p>
        )}

        {categoriasFiltradas.map((categoria) => (
          <div
            key={categoria.CategoriaGUID}
            className={styles.categoria}
            draggable={ehProfessor}
            onDragStart={() => handleDragStart(categoria.CategoriaGUID)}
            onDragOver={(e) => ehProfessor && e.preventDefault()}
            onDrop={() => ehProfessor && handleDrop(categoria.CategoriaGUID)}
          >
            <div className={styles.categoriaHeader}>
              <div className={styles.categoriaNomeGrupo}>
                <span className={styles.categoriaIconeFolder}><Icon name="folder" size={15} /></span>
                {editandoCategoriaGUID === categoria.CategoriaGUID ? (
                  <input
                    className={styles.inputRenomearCategoria}
                    defaultValue={categoria.CategoriaNome}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => salvarRenomeCategoria(categoria.CategoriaGUID, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setEditandoCategoriaGUID(null);
                    }}
                  />
                ) : (
                  <span className={styles.categoriaNome}>{categoria.CategoriaNome}</span>
                )}
              </div>
              <span className={styles.categoriaContagem}>
                {categoria.Itens.length} {categoria.Itens.length === 1 ? 'item' : 'itens'}
              </span>
              {ehProfessor && (
                <div className={styles.categoriaAcoes}>
                  <div className={styles.acoesWrapper}>
                    <button
                      className={styles.botaoAddItem}
                      onClick={() =>
                        setPopoverAberto((atual) => (atual === categoria.CategoriaGUID ? null : categoria.CategoriaGUID))
                      }
                      title="Novo item"
                    >
                      <Icon name="plus" size={16} />
                    </button>
                    {popoverAberto === categoria.CategoriaGUID && (
                      <div className={styles.popoverNovoItem}>
                        <button onClick={() => abrirNovoItem(categoria.CategoriaGUID, 'conteudo')}>
                          <Icon name="camera" size={16} /> Conteúdo
                        </button>
                        <button onClick={() => abrirNovoItem(categoria.CategoriaGUID, 'tarefa')}>
                          <Icon name="edit" size={16} /> Tarefa
                        </button>
                        <button onClick={() => abrirNovoItem(categoria.CategoriaGUID, 'prova')}>
                          <Icon name="award" size={16} /> Prova
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    className={styles.botaoAddItem}
                    onClick={() => setEditandoCategoriaGUID(categoria.CategoriaGUID)}
                    title="Renomear categoria"
                  >
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    className={styles.botaoAddItem}
                    onClick={() => pedirExclusaoCategoria(categoria)}
                    title="Excluir categoria"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              )}
            </div>

            <div
              className={styles.categoriaItens}
              onDragOver={(e) => {
                if (ehProfessor && itemArrastando) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              onDrop={(e) => {
                if (!ehProfessor || !itemArrastando) return;
                e.stopPropagation();
                void moverItem(categoria.CategoriaGUID, null);
              }}
            >
              {categoria.Itens.length === 0 ? (
                <p className={styles.mensagemVazia}>Nenhum item nesta categoria ainda.</p>
              ) : (
                categoria.Itens.map((item) => (
                  <div
                    key={item.ItemGUID}
                    className={styles.itemLinha}
                    onClick={() => setItemSelecionado(item)}
                    draggable={ehProfessor}
                    onDragStart={(e) => handleItemDragStart(e, item.ItemGUID)}
                    onDragEnd={() => setItemArrastando(null)}
                    onDragOver={(e) => {
                      if (ehProfessor && itemArrastando) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    onDrop={(e) => {
                      if (!ehProfessor || !itemArrastando) return;
                      e.stopPropagation();
                      void moverItem(categoria.CategoriaGUID, item.ItemGUID);
                    }}
                  >
                    <div className={styles.itemEsquerda}>
                      <span className={styles.itemIconeQuadrado} style={{ backgroundColor: COR_ICONE_POR_TIPO[item.Tipo] }}>
                        <Icon name={ICONE_POR_TIPO[item.Tipo]} size={15} color="#fff" />
                      </span>
                      <span className={styles.itemTitulo}>{item.Titulo}</span>
                    </div>
                    {!ehProfessor && (
                      <div className={styles.itemDireita}>
                        <ItemProgressoBar estado={item.Estado} percentual={item.Percentual} />
                        <span className={styles.itemStatusTexto} style={{ color: textoEstado(item.Estado, item.Percentual).cor }}>
                          {textoEstado(item.Estado, item.Percentual).texto}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}

        {itensSemCategoriaFiltrados.length > 0 && (
          <div className={styles.categoria}>
            <div className={styles.categoriaHeader}>
              <div className={styles.categoriaNomeGrupo}>
                <span className={styles.categoriaIconeFolder}><Icon name="folder" size={15} /></span>
                <span className={styles.categoriaNome}>Sem categoria</span>
              </div>
              <span className={styles.categoriaContagem}>
                {itensSemCategoriaFiltrados.length} {itensSemCategoriaFiltrados.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <div className={styles.categoriaItens}>
              {itensSemCategoriaFiltrados.map((item) => (
                <div
                  key={item.ItemGUID}
                  className={styles.itemLinha}
                  onClick={() => setItemSelecionado(item)}
                  draggable={ehProfessor}
                  onDragStart={(e) => handleItemDragStart(e, item.ItemGUID)}
                  onDragEnd={() => setItemArrastando(null)}
                >
                  <div className={styles.itemEsquerda}>
                    <span className={styles.itemIconeQuadrado} style={{ backgroundColor: COR_ICONE_POR_TIPO[item.Tipo] }}>
                      <Icon name={ICONE_POR_TIPO[item.Tipo]} size={15} color="#fff" />
                    </span>
                    <span className={styles.itemTitulo}>{item.Titulo}</span>
                  </div>
                  {!ehProfessor && (
                    <div className={styles.itemDireita}>
                      <ItemProgressoBar estado={item.Estado} percentual={item.Percentual} />
                      <span className={styles.itemStatusTexto} style={{ color: textoEstado(item.Estado, item.Percentual).cor }}>
                        {textoEstado(item.Estado, item.Percentual).texto}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {itemSelecionado && (
        <VisualizadorItemModal
          item={itemSelecionado}
          ehProfessor={ehProfessor}
          escolaGUID={escolaGUID}
          turmaGUID={turmaGUID}
          onFechar={() => setItemSelecionado(null)}
          onProgressoAtualizado={() => void carregarCategorias()}
          onEditar={
            ehProfessor
              ? () => {
                  setItemEditando(itemSelecionado);
                  setItemSelecionado(null);
                }
              : undefined
          }
        />
      )}

      {itemEditando && (
        <EditarItemModal
          item={itemEditando}
          onFechar={() => setItemEditando(null)}
          onAtualizado={() => {
            setItemEditando(null);
            void carregarCategorias();
          }}
        />
      )}

      {confirmacaoCategoria && (
        <div className={styles.overlayConfirmacao} onClick={() => setConfirmacaoCategoria(null)}>
          <div className={styles.painelConfirmacao} onClick={(e) => e.stopPropagation()}>
            {confirmacaoCategoria.tipo === 'renomear' ? (
              <p>
                Renomear <strong>"{confirmacaoCategoria.categoria.CategoriaNome}"</strong> para{' '}
                <strong>"{confirmacaoCategoria.novoNome}"</strong> — aplicar onde?
              </p>
            ) : (
              <p>
                Excluir a categoria <strong>"{confirmacaoCategoria.categoria.CategoriaNome}"</strong>
                {confirmacaoCategoria.categoria.Itens.length > 0 &&
                  ` (${confirmacaoCategoria.categoria.Itens.length} item(ns) vão para "Sem categoria")`}
                . Excluir de onde?
              </p>
            )}
            <div className={styles.painelConfirmacaoAcoes}>
              <button onClick={() => confirmarAcaoCategoria(false)}>Só desta turma</button>
              <button className={styles.botaoConfirmacaoDestaque} onClick={() => confirmarAcaoCategoria(true)}>
                Todas as turmas com essa categoria
              </button>
              <button onClick={() => setConfirmacaoCategoria(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modalNovoItem && (
        <NovoItemModal
          aba={modalNovoItem.aba}
          materiaGUID={materiaGUID}
          turmaGUID={turmaGUID}
          categoriaGUID={modalNovoItem.categoriaGUID}
          onFechar={() => setModalNovoItem(null)}
          onCriado={() => {
            setModalNovoItem(null);
            void carregarCategorias();
          }}
        />
      )}

      {modalCapaAberto && (
        <div className={styles.overlay} onClick={fecharModalCapa}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitulo}>Editar capa da turma</h2>
            <p className={styles.hint}>
              Só o representante/vice-representante da turma (ou Coordenação/Direção) pode alterar a capa.
            </p>

            <div className={styles.campo}>
              <label>Capa (imagem)</label>
              {(capaImagemPreview || imagemFundo) && (
                <img
                  src={capaImagemPreview || imagemFundo || undefined}
                  alt="Prévia da capa"
                  className={styles.previewImagem}
                />
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(e) => escolherImagemCapa(e.target.files?.[0] || null)}
              />
              {capaImagem && (
                <p className={styles.hint}>
                  {capaCorAutomatica
                    ? 'A cor abaixo vai ser definida automaticamente a partir dessa imagem ao salvar — mas você ainda pode escolher outra.'
                    : 'Cor definida manualmente — não será sobrescrita pela imagem.'}
                </p>
              )}
            </div>

            <div className={styles.campo}>
              <label>Cor</label>
              <input
                type="color"
                className={styles.corInput}
                value={capaCor}
                onChange={(e) => {
                  setCapaCor(e.target.value);
                  setCapaCorAutomatica(false);
                }}
              />
            </div>

            {capaErro && <p className={styles.erroCapa}>{capaErro}</p>}

            <div className={styles.botoes}>
              <button className={styles.botaoSalvar} onClick={salvarCapaTurma} disabled={capaSalvando}>
                {capaSalvando ? 'Salvando...' : 'Salvar'}
              </button>
              <button className={styles.botaoCancelar} onClick={fecharModalCapa}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CategoriaPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '3rem 2rem' }}><Loader /><p>Carregando...</p></div>}>
      <CategoriaPageConteudo />
    </Suspense>
  );
}
