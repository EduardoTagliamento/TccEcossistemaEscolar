'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSocket } from '@/lib/socket/SocketContext';
import { useChatUI } from '@/lib/chat/ChatUIContext';
import * as ConversaAPI from '@/lib/api/conversa.api';
import * as UploadAPI from '@/lib/api/upload.api';
import { Icon } from './icons';
import NovaConversaModal from './NovaConversaModal';
import styles from './page.module.css';

type AbaFiltro = 'todas' | 'grupo' | 'individual';

// Mesmos limites aplicados no backend (backend/middlewares/upload.middleware.ts,
// uploadMensagemMiddleware) — checados aqui só pra dar feedback imediato ao
// usuário, sem esperar a viagem até o servidor; a validação real continua no
// backend (não dá pra confiar só no client).
const TIPOS_ANEXO_PERMITIDOS = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'text/plain',
];
const TAMANHO_MAXIMO_ANEXO = 10 * 1024 * 1024; // 10MB

function formatarTamanhoArquivo(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Extrai um nome de arquivo "amigável" da URL pública gerada pelo upload
 * (formato `mensagens/<conversaGUID>/<timestamp>-<random>-<nome-original>`). */
function obterNomeArquivoDaUrl(url: string): string {
  try {
    const ultimoSegmento = decodeURIComponent(url.split('/').pop() || '');
    return ultimoSegmento.replace(/^\d+-[a-z0-9]{6}-/, '') || ultimoSegmento || 'arquivo';
  } catch {
    return 'arquivo';
  }
}

function obterIniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase() || '?';
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarPreviewData(iso: string): string {
  const data = new Date(iso);
  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();
  if (mesmoDia) return formatarHora(iso);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatarSeparadorData(iso: string): string {
  const data = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  if (data.toDateString() === hoje.toDateString()) return 'Hoje';
  if (data.toDateString() === ontem.toDateString()) return 'Ontem';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatarPreviewConteudo(mensagem: { MensagemConteudo: string; MensagemTipo: ConversaAPI.MensagemTipo }): string {
  if (mensagem.MensagemTipo === 'Imagem') return '📷 Imagem';
  if (mensagem.MensagemTipo === 'Arquivo') return '📎 Arquivo';
  return mensagem.MensagemConteudo;
}

function nomeDaConversa(conversa: ConversaAPI.ConversaListItem): string {
  return conversa.ConversaTipo === 'Grupo'
    ? conversa.ConversaGrupoNome || 'Grupo'
    : conversa.ParceiroNome || 'Conversa';
}

export default function ChatPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';
  const { usuario } = useAuth();
  const { socket, conectado } = useSocket();
  const { conversaAbertaGUID, definirConversaAberta } = useChatUI();

  const [conversas, setConversas] = useState<ConversaAPI.ConversaListItem[]>([]);
  const [carregandoConversas, setCarregandoConversas] = useState(true);
  const [erroConversas, setErroConversas] = useState('');
  const [aba, setAba] = useState<AbaFiltro>('todas');
  const [buscaConversas, setBuscaConversas] = useState('');
  const [modalNovaConversaAberto, setModalNovaConversaAberto] = useState(false);

  // Estado inicial lido do ChatUIContext: se o usuário chegou aqui clicando
  // em "Expandir" na bolha flutuante minimizada (MinimizedChatBubble), a
  // tela já abre direto na conversa que estava minimizada.
  const [conversaAtivaGUID, setConversaAtivaGUIDState] = useState<string | null>(() => conversaAbertaGUID);
  const setConversaAtivaGUID = (guid: string | null) => {
    setConversaAtivaGUIDState(guid);
    definirConversaAberta(guid);
  };
  const [conversaAtiva, setConversaAtiva] = useState<ConversaAPI.ConversaDetalhe | null>(null);
  const [mensagens, setMensagens] = useState<ConversaAPI.Mensagem[]>([]);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [erroConversaAtiva, setErroConversaAtiva] = useState('');

  const [textoInput, setTextoInput] = useState('');
  const [editandoMensagemGUID, setEditandoMensagemGUID] = useState<string | null>(null);
  const [editandoConteudo, setEditandoConteudo] = useState('');
  const [menuAbertoGUID, setMenuAbertoGUID] = useState<string | null>(null);
  const [digitandoNome, setDigitandoNome] = useState<string | null>(null);

  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [erroAnexo, setErroAnexo] = useState('');

  const conversaAtivaGUIDRef = useRef<string | null>(null);
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const digitandoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mensagensListRef = useRef<HTMLDivElement | null>(null);
  const ignorarProximoAutoScrollRef = useRef(false);
  const inputArquivoRef = useRef<HTMLInputElement | null>(null);

  // ---------- Carregar lista de conversas ----------
  useEffect(() => {
    if (!escolaGUID) return;
    void carregarConversas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaGUID]);

  const carregarConversas = async () => {
    setCarregandoConversas(true);
    setErroConversas('');
    try {
      const lista = await ConversaAPI.listarConversas();
      setConversas(lista);
    } catch (erro: any) {
      setErroConversas(erro?.message || 'Erro ao carregar conversas');
    } finally {
      setCarregandoConversas(false);
    }
  };

  // ---------- Entrar em todas as rooms (atualização em tempo real da lista) ----------
  useEffect(() => {
    if (!socket || !conectado) return;
    conversas.forEach((conversa) => {
      if (!joinedRoomsRef.current.has(conversa.ConversaGUID)) {
        socket.emit('join_conversa', { ConversaGUID: conversa.ConversaGUID });
        joinedRoomsRef.current.add(conversa.ConversaGUID);
      }
    });
  }, [socket, conectado, conversas]);

  useEffect(() => {
    if (!conectado) {
      // Ao cair a conexão, as rooms do lado do servidor se perdem — limpa o
      // cache local para que o efeito acima reenvie join_conversa ao reconectar.
      joinedRoomsRef.current.clear();
    }
  }, [conectado]);

  useEffect(() => {
    conversaAtivaGUIDRef.current = conversaAtivaGUID;
  }, [conversaAtivaGUID]);

  // ---------- Listeners globais do WebSocket ----------
  useEffect(() => {
    if (!socket) return;

    const handleNovaMensagem = (mensagem: ConversaAPI.Mensagem) => {
      const conversaAberta = conversaAtivaGUIDRef.current === mensagem.ConversaGUID;
      const souEuQueEnviei = mensagem.MensagemRemetenteCPF === usuario?.UsuarioCPF;

      setConversas((prev) => {
        const alvo = prev.find((c) => c.ConversaGUID === mensagem.ConversaGUID);
        if (!alvo) return prev; // conversa nova (ex.: acabou de ser criada) — recarregada por outro fluxo
        const resto = prev.filter((c) => c.ConversaGUID !== mensagem.ConversaGUID);
        const atualizado: ConversaAPI.ConversaListItem = {
          ...alvo,
          UltimaMensagem: {
            MensagemConteudo: mensagem.MensagemConteudo,
            MensagemRemetenteCPF: mensagem.MensagemRemetenteCPF,
            RemetenteNome: souEuQueEnviei ? 'Você' : nomeDaConversa(alvo),
            MensagemCreatedAt: mensagem.MensagemCreatedAt,
            MensagemTipo: mensagem.MensagemTipo,
          },
          NaoLidas: conversaAberta || souEuQueEnviei ? 0 : alvo.NaoLidas + 1,
        };
        return [atualizado, ...resto];
      });

      if (conversaAberta) {
        setMensagens((prev) => [...prev, mensagem]);
        socket.emit('mark_as_read', { ConversaGUID: mensagem.ConversaGUID });
      }
    };

    const handleMensagemEditada = (mensagem: ConversaAPI.Mensagem) => {
      if (conversaAtivaGUIDRef.current !== mensagem.ConversaGUID) return;
      setMensagens((prev) =>
        prev.map((m) =>
          m.MensagemGUID === mensagem.MensagemGUID
            ? { ...m, MensagemConteudo: mensagem.MensagemConteudo, MensagemEditadaAt: mensagem.MensagemEditadaAt }
            : m
        )
      );
    };

    const handleMensagemDeletada = (payload: { ConversaGUID: string; MensagemGUID: string }) => {
      if (conversaAtivaGUIDRef.current !== payload.ConversaGUID) return;
      setMensagens((prev) =>
        prev.map((m) =>
          m.MensagemGUID === payload.MensagemGUID ? { ...m, MensagemDeletedAt: new Date().toISOString() } : m
        )
      );
    };

    const handleMensagemFixada = (fixada: ConversaAPI.MensagemFixada) => {
      if (conversaAtivaGUIDRef.current !== fixada.ConversaGUID) return;
      setConversaAtiva((prev) =>
        prev
          ? { ...prev, MensagensFixadas: [fixada, ...prev.MensagensFixadas.filter((f) => f.MensagemGUID !== fixada.MensagemGUID)] }
          : prev
      );
    };

    const handleMensagemDesafixada = (payload: { ConversaGUID: string; MensagemGUID: string }) => {
      if (conversaAtivaGUIDRef.current !== payload.ConversaGUID) return;
      setConversaAtiva((prev) =>
        prev ? { ...prev, MensagensFixadas: prev.MensagensFixadas.filter((f) => f.MensagemGUID !== payload.MensagemGUID) } : prev
      );
    };

    const handleUsuarioDigitando = (payload: {
      ConversaGUID: string;
      UsuarioCPF: string;
      UsuarioNome: string;
      isTyping: boolean;
    }) => {
      if (conversaAtivaGUIDRef.current !== payload.ConversaGUID || payload.UsuarioCPF === usuario?.UsuarioCPF) return;
      if (digitandoTimeoutRef.current) clearTimeout(digitandoTimeoutRef.current);
      if (payload.isTyping) {
        setDigitandoNome(payload.UsuarioNome);
        digitandoTimeoutRef.current = setTimeout(() => setDigitandoNome(null), 3000);
      } else {
        setDigitandoNome(null);
      }
    };

    const handleErro = (payload: { message?: string }) => {
      setErroConversaAtiva(payload?.message || 'Ocorreu um erro no chat.');
    };

    socket.on('nova_mensagem', handleNovaMensagem);
    socket.on('mensagem_editada', handleMensagemEditada);
    socket.on('mensagem_deletada', handleMensagemDeletada);
    socket.on('mensagem_fixada', handleMensagemFixada);
    socket.on('mensagem_desafixada', handleMensagemDesafixada);
    socket.on('usuario_digitando', handleUsuarioDigitando);
    socket.on('erro', handleErro);

    return () => {
      socket.off('nova_mensagem', handleNovaMensagem);
      socket.off('mensagem_editada', handleMensagemEditada);
      socket.off('mensagem_deletada', handleMensagemDeletada);
      socket.off('mensagem_fixada', handleMensagemFixada);
      socket.off('mensagem_desafixada', handleMensagemDesafixada);
      socket.off('usuario_digitando', handleUsuarioDigitando);
      socket.off('erro', handleErro);
    };
  }, [socket, usuario]);

  // ---------- Abrir conversa ----------
  useEffect(() => {
    if (!conversaAtivaGUID) return;
    void carregarConversaAtiva(conversaAtivaGUID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversaAtivaGUID]);

  const carregarConversaAtiva = async (guid: string) => {
    setCarregandoMensagens(true);
    setErroConversaAtiva('');
    setEditandoMensagemGUID(null);
    setDigitandoNome(null);
    try {
      const detalhe = await ConversaAPI.buscarConversa(guid);
      setConversaAtiva(detalhe);
      setMensagens([...detalhe.Mensagens].reverse());
      setHasMore(detalhe.HasMore);
      setConversas((prev) => prev.map((c) => (c.ConversaGUID === guid ? { ...c, NaoLidas: 0 } : c)));
      socket?.emit('join_conversa', { ConversaGUID: guid });
      socket?.emit('mark_as_read', { ConversaGUID: guid });
    } catch (erro: any) {
      setErroConversaAtiva(erro?.message || 'Erro ao carregar conversa');
    } finally {
      setCarregandoMensagens(false);
    }
  };

  const carregarMensagensAnteriores = async () => {
    if (!conversaAtivaGUID || !hasMore || carregandoMais || mensagens.length === 0) return;
    setCarregandoMais(true);
    const container = mensagensListRef.current;
    const alturaAntes = container?.scrollHeight || 0;
    try {
      const primeira = mensagens[0];
      const resultado = await ConversaAPI.listarMensagens(conversaAtivaGUID, { before: primeira.MensagemGUID, limit: 30 });
      const maisAntigas = [...resultado.Mensagens].reverse();
      ignorarProximoAutoScrollRef.current = true;
      setMensagens((prev) => [...maisAntigas, ...prev]);
      setHasMore(resultado.HasMore);
      requestAnimationFrame(() => {
        if (container) {
          const alturaDepois = container.scrollHeight;
          container.scrollTop = alturaDepois - alturaAntes;
        }
      });
    } catch (erro: any) {
      setErroConversaAtiva(erro?.message || 'Erro ao carregar mensagens anteriores');
    } finally {
      setCarregandoMais(false);
    }
  };

  const handleScrollMensagens = () => {
    const container = mensagensListRef.current;
    if (!container) return;
    if (container.scrollTop < 80) {
      void carregarMensagensAnteriores();
    }
  };

  // Auto-scroll para o fim ao chegar mensagem nova (exceto ao paginar pra cima)
  useEffect(() => {
    if (ignorarProximoAutoScrollRef.current) {
      ignorarProximoAutoScrollRef.current = false;
      return;
    }
    const container = mensagensListRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [mensagens.length, conversaAtivaGUID]);

  // ---------- Envio / digitação ----------
  const handleTextoInputChange = (valor: string) => {
    setTextoInput(valor);
    if (!socket || !conversaAtivaGUID) return;
    socket.emit('typing', { ConversaGUID: conversaAtivaGUID, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { ConversaGUID: conversaAtivaGUID, isTyping: false });
    }, 2000);
  };

  const handleEnviar = async () => {
    if (!conversaAtivaGUID || !socket || !conectado) return;

    // Anexo pendente: schema de Mensagem guarda ou texto OU a URL do anexo em
    // MensagemConteudo (nunca os dois juntos) — envia o arquivo como uma
    // mensagem própria, ignorando o texto digitado (se houver).
    if (arquivoSelecionado) {
      setEnviandoAnexo(true);
      setErroAnexo('');
      try {
        const resultado = await UploadAPI.uploadMensagemAnexo(conversaAtivaGUID, arquivoSelecionado);
        socket.emit('send_mensagem', {
          ConversaGUID: conversaAtivaGUID,
          MensagemConteudo: resultado.fileUrl,
          MensagemTipo: resultado.mensagemTipo,
        });
        handleRemoverAnexo();
      } catch (erro: any) {
        setErroAnexo(erro?.message || 'Erro ao enviar anexo');
      } finally {
        setEnviandoAnexo(false);
      }
      return;
    }

    const texto = textoInput.trim();
    if (!texto) return;
    socket.emit('send_mensagem', { ConversaGUID: conversaAtivaGUID, MensagemConteudo: texto, MensagemTipo: 'Texto' });
    setTextoInput('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('typing', { ConversaGUID: conversaAtivaGUID, isTyping: false });
  };

  // ---------- Anexos ----------
  const handleSelecionarArquivo = (arquivo: File | undefined) => {
    setErroAnexo('');
    if (!arquivo) return;

    if (!TIPOS_ANEXO_PERMITIDOS.includes(arquivo.type)) {
      setErroAnexo('Tipo de arquivo não suportado.');
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_ANEXO) {
      setErroAnexo(`O arquivo não pode passar de ${TAMANHO_MAXIMO_ANEXO / (1024 * 1024)}MB.`);
      return;
    }

    if (previewURL) URL.revokeObjectURL(previewURL);
    setArquivoSelecionado(arquivo);
    setPreviewURL(arquivo.type.startsWith('image/') ? URL.createObjectURL(arquivo) : null);
  };

  const handleRemoverAnexo = () => {
    if (previewURL) URL.revokeObjectURL(previewURL);
    setArquivoSelecionado(null);
    setPreviewURL(null);
    setErroAnexo('');
    if (inputArquivoRef.current) inputArquivoRef.current.value = '';
  };

  // Libera o object URL do preview ao trocar de conversa ou desmontar a página
  useEffect(() => {
    return () => {
      if (previewURL) URL.revokeObjectURL(previewURL);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    handleRemoverAnexo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversaAtivaGUID]);

  // ---------- Ações de mensagem ----------
  const meuPapelNoGrupo = useMemo(() => {
    if (!conversaAtiva || conversaAtiva.ConversaTipo !== 'Grupo') return null;
    return conversaAtiva.Membros?.find((m) => m.UsuarioCPF === usuario?.UsuarioCPF)?.MembroFuncao || null;
  }, [conversaAtiva, usuario]);

  const podeFixarNaConversa = useMemo(() => {
    if (!conversaAtiva) return false;
    if (conversaAtiva.ConversaTipo === 'Individual') return true;
    return meuPapelNoGrupo === 'Lider' || meuPapelNoGrupo === 'Representante' || meuPapelNoGrupo === 'Vice-Representante';
  }, [conversaAtiva, meuPapelNoGrupo]);

  const podeApagar = (mensagem: ConversaAPI.Mensagem): boolean => {
    if (!conversaAtiva) return false;
    if (mensagem.MensagemRemetenteCPF === usuario?.UsuarioCPF) return true;
    if (conversaAtiva.ConversaTipo === 'Individual') return false;
    if (conversaAtiva.ConversaGrupoTipo === 'Tarefa') return meuPapelNoGrupo === 'Lider';
    return meuPapelNoGrupo === 'Representante' || meuPapelNoGrupo === 'Vice-Representante';
  };

  const handleFixarToggle = async (mensagem: ConversaAPI.Mensagem) => {
    if (!conversaAtivaGUID) return;
    setMenuAbertoGUID(null);
    const jaFixada = conversaAtiva?.MensagensFixadas.some((f) => f.MensagemGUID === mensagem.MensagemGUID);
    try {
      if (jaFixada) {
        await ConversaAPI.desafixarMensagem(conversaAtivaGUID, mensagem.MensagemGUID);
      } else {
        await ConversaAPI.fixarMensagem(conversaAtivaGUID, mensagem.MensagemGUID);
      }
    } catch (erro: any) {
      setErroConversaAtiva(erro?.message || 'Erro ao fixar/desafixar mensagem');
    }
  };

  const handleApagar = async (mensagem: ConversaAPI.Mensagem) => {
    if (!conversaAtivaGUID) return;
    setMenuAbertoGUID(null);
    if (!confirm('Apagar esta mensagem?')) return;
    try {
      await ConversaAPI.deletarMensagem(conversaAtivaGUID, mensagem.MensagemGUID);
    } catch (erro: any) {
      setErroConversaAtiva(erro?.message || 'Erro ao apagar mensagem');
    }
  };

  const handleIniciarEdicao = (mensagem: ConversaAPI.Mensagem) => {
    setMenuAbertoGUID(null);
    setEditandoMensagemGUID(mensagem.MensagemGUID);
    setEditandoConteudo(mensagem.MensagemConteudo);
  };

  const handleSalvarEdicao = async () => {
    if (!conversaAtivaGUID || !editandoMensagemGUID) return;
    const conteudo = editandoConteudo.trim();
    if (!conteudo) return;
    try {
      await ConversaAPI.editarMensagem(conversaAtivaGUID, editandoMensagemGUID, conteudo);
      setEditandoMensagemGUID(null);
    } catch (erro: any) {
      setErroConversaAtiva(erro?.message || 'Erro ao editar mensagem');
    }
  };

  // ---------- Nova conversa ----------
  const handleConversaIniciada = async (novaConversaGUID: string) => {
    await carregarConversas();
    setConversaAtivaGUID(novaConversaGUID);
  };

  // ---------- Derivados de UI ----------
  const conversasFiltradas = useMemo(() => {
    return conversas.filter((c) => {
      if (aba === 'grupo' && c.ConversaTipo !== 'Grupo') return false;
      if (aba === 'individual' && c.ConversaTipo !== 'Individual') return false;
      if (buscaConversas.trim()) {
        const termo = buscaConversas.trim().toLowerCase();
        if (!nomeDaConversa(c).toLowerCase().includes(termo)) return false;
      }
      return true;
    });
  }, [conversas, aba, buscaConversas]);

  const tituloConversaAtiva = conversaAtiva
    ? conversaAtiva.ConversaTipo === 'Grupo'
      ? conversaAtiva.ConversaGrupoNome || 'Grupo'
      : conversaAtiva.ParceiroNome || 'Conversa'
    : '';

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Conversas</h1>
        {!conectado && <span className={styles.statusOffline}>Reconectando ao chat…</span>}
      </header>

      <div className={`${styles.chatShell} ${conversaAtivaGUID ? styles.mostrandoConversa : ''}`}>
        {/* ---------- Lista de conversas ---------- */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div className={styles.searchWrap}>
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Buscar conversa..."
                value={buscaConversas}
                onChange={(e) => setBuscaConversas(e.target.value)}
              />
            </div>
            <button
              type="button"
              className={styles.novaConversaButton}
              onClick={() => setModalNovaConversaAberto(true)}
              aria-label="Nova conversa"
              title="Nova conversa"
            >
              <Icon name="plus" size={18} />
            </button>
          </div>

          <div className={styles.abas}>
            <button type="button" className={aba === 'todas' ? styles.abaAtiva : styles.aba} onClick={() => setAba('todas')}>
              Todas
            </button>
            <button type="button" className={aba === 'grupo' ? styles.abaAtiva : styles.aba} onClick={() => setAba('grupo')}>
              Grupos
            </button>
            <button
              type="button"
              className={aba === 'individual' ? styles.abaAtiva : styles.aba}
              onClick={() => setAba('individual')}
            >
              Individuais
            </button>
          </div>

          {erroConversas && <p className={styles.erroInline}>{erroConversas}</p>}

          <div className={styles.listaConversas}>
            {carregandoConversas ? (
              <p className={styles.estadoVazio}>Carregando conversas...</p>
            ) : conversasFiltradas.length === 0 ? (
              <p className={styles.estadoVazio}>
                {conversas.length === 0 ? 'Você ainda não tem conversas.' : 'Nenhuma conversa encontrada.'}
              </p>
            ) : (
              conversasFiltradas.map((conversa) => {
                const nome = nomeDaConversa(conversa);
                const ativa = conversa.ConversaGUID === conversaAtivaGUID;
                return (
                  <button
                    type="button"
                    key={conversa.ConversaGUID}
                    className={`${styles.conversaItem} ${ativa ? styles.conversaItemAtiva : ''}`}
                    onClick={() => setConversaAtivaGUID(conversa.ConversaGUID)}
                  >
                    {conversa.ConversaTipo === 'Grupo' ? (
                      <span className={styles.avatarGrupo}>
                        <Icon name="users" size={18} />
                      </span>
                    ) : (
                      <span className={styles.avatar}>{obterIniciais(nome)}</span>
                    )}
                    <span className={styles.conversaInfo}>
                      <span className={styles.conversaLinhaTopo}>
                        <span className={styles.conversaNome}>{nome}</span>
                        {conversa.UltimaMensagem && (
                          <span className={styles.conversaHora}>
                            {formatarPreviewData(conversa.UltimaMensagem.MensagemCreatedAt)}
                          </span>
                        )}
                      </span>
                      <span className={styles.conversaLinhaBase}>
                        <span className={styles.conversaPreview}>
                          {conversa.UltimaMensagem
                            ? `${conversa.UltimaMensagem.RemetenteNome}: ${formatarPreviewConteudo(conversa.UltimaMensagem)}`
                            : conversa.ConversaTipo === 'Grupo' && conversa.ConversaGrupoTipo
                            ? `Grupo de ${conversa.ConversaGrupoTipo}`
                            : 'Nenhuma mensagem ainda'}
                        </span>
                        {conversa.NaoLidas > 0 && <span className={styles.badgeNaoLidas}>{conversa.NaoLidas}</span>}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ---------- Painel da conversa ---------- */}
        <section className={styles.painel}>
          {!conversaAtivaGUID ? (
            <div className={styles.painelVazio}>
              <span className={styles.painelVazioIcone}>
                <Icon name="message-circle" size={26} />
              </span>
              <h2>Selecione uma conversa</h2>
              <p>Escolha uma conversa na lista ao lado ou inicie uma nova para começar a trocar mensagens.</p>
            </div>
          ) : (
            <>
              <div className={styles.painelHeader}>
                <button
                  type="button"
                  className={styles.voltarMobile}
                  onClick={() => setConversaAtivaGUID(null)}
                  aria-label="Voltar para a lista"
                >
                  <Icon name="chevron-left" size={20} />
                </button>
                {conversaAtiva?.ConversaTipo === 'Grupo' ? (
                  <span className={styles.avatarGrupo}>
                    <Icon name="users" size={18} />
                  </span>
                ) : (
                  <span className={styles.avatar}>{obterIniciais(tituloConversaAtiva)}</span>
                )}
                <div className={styles.painelHeaderInfo}>
                  <span className={styles.painelHeaderNome}>{tituloConversaAtiva}</span>
                  <span className={styles.painelHeaderSub}>
                    {conversaAtiva?.ConversaTipo === 'Grupo'
                      ? `Grupo de ${conversaAtiva.ConversaGrupoTipo === 'Turma' ? 'Turma' : 'Tarefa'} · ${
                          conversaAtiva.Membros?.length || 0
                        } membros`
                      : digitandoNome
                      ? `${digitandoNome} está digitando...`
                      : 'Conversa individual'}
                  </span>
                </div>
              </div>

              {conversaAtiva && conversaAtiva.MensagensFixadas.length > 0 && (
                <div className={styles.fixadasBar}>
                  <Icon name="star" size={14} />
                  <span className={styles.fixadasTexto}>
                    {formatarPreviewConteudo(conversaAtiva.MensagensFixadas[0])}
                  </span>
                  {conversaAtiva.MensagensFixadas.length > 1 && (
                    <span className={styles.fixadasContador}>+{conversaAtiva.MensagensFixadas.length - 1} fixada(s)</span>
                  )}
                </div>
              )}

              {erroConversaAtiva && <p className={styles.erroInline}>{erroConversaAtiva}</p>}

              <div className={styles.mensagensLista} ref={mensagensListRef} onScroll={handleScrollMensagens}>
                {carregandoMensagens ? (
                  <p className={styles.estadoVazio}>Carregando mensagens...</p>
                ) : (
                  <>
                    {carregandoMais && <p className={styles.estadoVazioPequeno}>Carregando mensagens anteriores...</p>}
                    {mensagens.length === 0 ? (
                      <p className={styles.estadoVazio}>Nenhuma mensagem ainda. Diga oi!</p>
                    ) : (
                      mensagens.map((mensagem, indice) => {
                        const mensagemAnterior = mensagens[indice - 1];
                        const mostrarSeparador =
                          !mensagemAnterior ||
                          new Date(mensagemAnterior.MensagemCreatedAt).toDateString() !==
                            new Date(mensagem.MensagemCreatedAt).toDateString();
                        const mine = mensagem.MensagemRemetenteCPF === usuario?.UsuarioCPF;
                        const apagada = !!mensagem.MensagemDeletedAt;
                        const editandoEsta = editandoMensagemGUID === mensagem.MensagemGUID;
                        const fixada = conversaAtiva?.MensagensFixadas.some((f) => f.MensagemGUID === mensagem.MensagemGUID);

                        return (
                          <div key={mensagem.MensagemGUID}>
                            {mostrarSeparador && (
                              <div className={styles.separadorData}>
                                <span>{formatarSeparadorData(mensagem.MensagemCreatedAt)}</span>
                              </div>
                            )}
                            <div className={`${styles.bolhaLinha} ${mine ? styles.bolhaLinhaMinha : ''}`}>
                              <div className={`${styles.bolha} ${mine ? styles.bolhaMinha : styles.bolhaOutro} ${apagada ? styles.bolhaApagada : ''}`}>
                                {conversaAtiva?.ConversaTipo === 'Grupo' && !mine && !apagada && (
                                  <span className={styles.bolhaAutor}>{mensagem.MensagemRemetenteCPF}</span>
                                )}

                                {editandoEsta ? (
                                  <div className={styles.edicaoWrap}>
                                    <input
                                      type="text"
                                      value={editandoConteudo}
                                      onChange={(e) => setEditandoConteudo(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') void handleSalvarEdicao();
                                        if (e.key === 'Escape') setEditandoMensagemGUID(null);
                                      }}
                                      autoFocus
                                    />
                                    <div className={styles.edicaoAcoes}>
                                      <button type="button" onClick={() => setEditandoMensagemGUID(null)}>
                                        Cancelar
                                      </button>
                                      <button type="button" onClick={() => void handleSalvarEdicao()}>
                                        Salvar
                                      </button>
                                    </div>
                                  </div>
                                ) : apagada ? (
                                  <p className={styles.bolhaTexto}>Mensagem apagada</p>
                                ) : mensagem.MensagemTipo === 'Imagem' ? (
                                  <a href={mensagem.MensagemConteudo} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={mensagem.MensagemConteudo}
                                      alt="Imagem enviada no chat"
                                      className={styles.bolhaImagem}
                                    />
                                  </a>
                                ) : mensagem.MensagemTipo === 'Arquivo' ? (
                                  <a
                                    href={mensagem.MensagemConteudo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className={styles.anexoArquivoCard}
                                  >
                                    <span className={styles.anexoArquivoIcone}>
                                      <Icon name="file-text" size={18} />
                                    </span>
                                    <span className={styles.anexoArquivoNome}>
                                      {obterNomeArquivoDaUrl(mensagem.MensagemConteudo)}
                                    </span>
                                  </a>
                                ) : (
                                  <p className={styles.bolhaTexto}>{mensagem.MensagemConteudo}</p>
                                )}

                                {!editandoEsta && (
                                  <span className={styles.bolhaMeta}>
                                    {fixada && <Icon name="star" size={11} />}
                                    {mensagem.MensagemEditadaAt && !apagada && <span>editada · </span>}
                                    {formatarHora(mensagem.MensagemCreatedAt)}
                                  </span>
                                )}

                                {!apagada && !editandoEsta && (podeFixarNaConversa || podeApagar(mensagem) || mensagem.MensagemTipo === 'Texto') && (
                                  <div className={styles.bolhaAcoesWrap}>
                                    <button
                                      type="button"
                                      className={styles.bolhaAcoesTrigger}
                                      onClick={() =>
                                        setMenuAbertoGUID((atual) => (atual === mensagem.MensagemGUID ? null : mensagem.MensagemGUID))
                                      }
                                      aria-label="Ações da mensagem"
                                    >
                                      <Icon name="more-vertical" size={14} />
                                    </button>
                                    {menuAbertoGUID === mensagem.MensagemGUID && (
                                      <div className={styles.bolhaAcoesMenu}>
                                        {podeFixarNaConversa && (
                                          <button type="button" onClick={() => void handleFixarToggle(mensagem)}>
                                            <Icon name="star" size={14} /> {fixada ? 'Desafixar' : 'Fixar'}
                                          </button>
                                        )}
                                        {mine && mensagem.MensagemTipo === 'Texto' && (
                                          <button type="button" onClick={() => handleIniciarEdicao(mensagem)}>
                                            <Icon name="edit" size={14} /> Editar
                                          </button>
                                        )}
                                        {podeApagar(mensagem) && (
                                          <button type="button" onClick={() => void handleApagar(mensagem)}>
                                            <Icon name="trash" size={14} /> Apagar
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </div>

              {erroAnexo && <p className={styles.erroInline}>{erroAnexo}</p>}

              {arquivoSelecionado && (
                <div className={styles.anexoPreviewBar}>
                  {previewURL ? (
                    <img src={previewURL} alt="Pré-visualização do anexo" className={styles.anexoPreviewThumb} />
                  ) : (
                    <span className={styles.anexoPreviewIconeWrap}>
                      <Icon name="file-text" size={18} />
                    </span>
                  )}
                  <div className={styles.anexoPreviewInfo}>
                    <span className={styles.anexoPreviewNome}>{arquivoSelecionado.name}</span>
                    <span className={styles.anexoPreviewTamanho}>{formatarTamanhoArquivo(arquivoSelecionado.size)}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.anexoPreviewRemover}
                    onClick={handleRemoverAnexo}
                    disabled={enviandoAnexo}
                    aria-label="Remover anexo"
                  >
                    <Icon name="x" size={16} />
                  </button>
                </div>
              )}

              <div className={styles.composeBar}>
                <input
                  ref={inputArquivoRef}
                  type="file"
                  className={styles.inputArquivoOculto}
                  accept={TIPOS_ANEXO_PERMITIDOS.join(',')}
                  onChange={(e) => handleSelecionarArquivo(e.target.files?.[0])}
                />
                <button
                  type="button"
                  className={styles.anexarButton}
                  onClick={() => inputArquivoRef.current?.click()}
                  disabled={!conectado || enviandoAnexo || !!arquivoSelecionado}
                  aria-label="Anexar arquivo"
                  title="Anexar imagem ou arquivo"
                >
                  <Icon name="paperclip" size={18} />
                </button>
                <input
                  type="text"
                  placeholder={
                    arquivoSelecionado
                      ? 'Anexo pronto para enviar'
                      : conectado
                      ? 'Escreva uma mensagem...'
                      : 'Conectando ao chat...'
                  }
                  value={textoInput}
                  disabled={!conectado || !!arquivoSelecionado}
                  onChange={(e) => handleTextoInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleEnviar();
                  }}
                />
                <button
                  type="button"
                  className={styles.enviarButton}
                  onClick={() => void handleEnviar()}
                  disabled={!conectado || enviandoAnexo || (!arquivoSelecionado && !textoInput.trim())}
                  aria-label="Enviar mensagem"
                >
                  <Icon name="send" size={18} />
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <NovaConversaModal
        aberto={modalNovaConversaAberto}
        escolaGUID={escolaGUID}
        meuCPF={usuario?.UsuarioCPF || ''}
        onClose={() => setModalNovaConversaAberto(false)}
        onConversaIniciada={(guid) => void handleConversaIniciada(guid)}
      />
    </div>
  );
}
