'use client';

/**
 * Bolha de chat flutuante minimizada (estilo Instagram Web) — montada uma
 * única vez em `layout.tsx`, ao lado da `DashboardNavbar`. Sempre que o
 * usuário sai de `/dashboard/[escolaGUID]/chat` com uma conversa aberta
 * (rastreada via `ChatUIContext`), essa bolha aparece fixa no canto
 * inferior direito, por cima de qualquer outra tela do dashboard.
 *
 * Escopo deliberadamente mais enxuto que a tela cheia: só texto (sem
 * anexo), sem editar/apagar/fixar mensagem, sem paginação de histórico —
 * essas ações continuam a um clique de distância via "Expandir". Mensagens
 * em tempo real funcionam porque a conexão WebSocket é única/compartilhada
 * (`SocketContext`) e o servidor mantém o socket nas rooms já visitadas
 * mesmo com a tela cheia desmontada — esta bolha só precisa registrar seus
 * próprios listeners enquanto estiver visível.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSocket } from '@/lib/socket/SocketContext';
import { useChatUI } from '@/lib/chat/ChatUIContext';
import * as ConversaAPI from '@/lib/api/conversa.api';
import styles from './MinimizedChatBubble.module.css';

type IconName = 'x' | 'chevron-down' | 'arrow-right' | 'send' | 'users';

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const common: React.SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  switch (name) {
    case 'x':
      return (
        <svg {...common} aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...common} aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...common} aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      );
    case 'send':
      return (
        <svg {...common} aria-hidden="true">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    default:
      return null;
  }
}

function obterIniciais(nome: string): string {
  return (
    nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte.charAt(0))
      .join('')
      .toUpperCase() || '?'
  );
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function nomeDaConversa(detalhe: ConversaAPI.ConversaDetalhe): string {
  return detalhe.ConversaTipo === 'Grupo' ? detalhe.ConversaGrupoNome || 'Grupo' : detalhe.ParceiroNome || 'Conversa';
}

export default function MinimizedChatBubble() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';
  const { usuario } = useAuth();
  const { socket } = useSocket();
  const { conversaAbertaGUID, definirConversaAberta } = useChatUI();

  const [colapsada, setColapsada] = useState(true);
  const [naoLida, setNaoLida] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [detalhe, setDetalhe] = useState<ConversaAPI.ConversaDetalhe | null>(null);
  const [mensagens, setMensagens] = useState<ConversaAPI.Mensagem[]>([]);
  const [textoInput, setTextoInput] = useState('');

  const mensagensListRef = useRef<HTMLDivElement | null>(null);

  const naTelaDeChat = pathname === `/dashboard/${escolaGUID}/chat`;
  const deveExibir = !!usuario && !!escolaGUID && !!conversaAbertaGUID && !naTelaDeChat;

  // Ao trocar de conversa (ou ela sumir), volta a bolha pro estado colapsado.
  useEffect(() => {
    setColapsada(true);
    setNaoLida(false);
  }, [conversaAbertaGUID]);

  // Carrega os dados da conversa só quando a bolha realmente vai aparecer.
  useEffect(() => {
    if (!deveExibir || !conversaAbertaGUID) return;
    let cancelado = false;

    setCarregando(true);
    setErro('');
    ConversaAPI.buscarConversa(conversaAbertaGUID)
      .then((resultado) => {
        if (cancelado) return;
        setDetalhe(resultado);
        setMensagens([...resultado.Mensagens].reverse());
      })
      .catch((err: any) => {
        if (!cancelado) setErro(err?.message || 'Erro ao carregar conversa');
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [deveExibir, conversaAbertaGUID]);

  // Listeners de WebSocket — só registrados enquanto a bolha está visível
  // (a tela cheia cuida dos seus próprios listeners quando montada).
  useEffect(() => {
    if (!socket || !deveExibir || !conversaAbertaGUID) return;

    const handleNovaMensagem = (mensagem: ConversaAPI.Mensagem) => {
      if (mensagem.ConversaGUID !== conversaAbertaGUID) return;
      setMensagens((prev) => [...prev, mensagem]);
      setColapsada((estaColapsada) => {
        if (estaColapsada) {
          setNaoLida(true);
        } else {
          socket.emit('mark_as_read', { ConversaGUID: conversaAbertaGUID });
        }
        return estaColapsada;
      });
    };

    const handleMensagemEditada = (mensagem: ConversaAPI.Mensagem) => {
      if (mensagem.ConversaGUID !== conversaAbertaGUID) return;
      setMensagens((prev) =>
        prev.map((m) =>
          m.MensagemGUID === mensagem.MensagemGUID
            ? { ...m, MensagemConteudo: mensagem.MensagemConteudo, MensagemEditadaAt: mensagem.MensagemEditadaAt }
            : m
        )
      );
    };

    const handleMensagemDeletada = (payload: { ConversaGUID: string; MensagemGUID: string }) => {
      if (payload.ConversaGUID !== conversaAbertaGUID) return;
      setMensagens((prev) =>
        prev.map((m) => (m.MensagemGUID === payload.MensagemGUID ? { ...m, MensagemDeletedAt: new Date().toISOString() } : m))
      );
    };

    socket.on('nova_mensagem', handleNovaMensagem);
    socket.on('mensagem_editada', handleMensagemEditada);
    socket.on('mensagem_deletada', handleMensagemDeletada);

    return () => {
      socket.off('nova_mensagem', handleNovaMensagem);
      socket.off('mensagem_editada', handleMensagemEditada);
      socket.off('mensagem_deletada', handleMensagemDeletada);
    };
  }, [socket, deveExibir, conversaAbertaGUID]);

  // Auto-scroll pro fim ao chegar mensagem nova / abrir o painel.
  useEffect(() => {
    if (colapsada) return;
    const container = mensagensListRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [mensagens.length, colapsada]);

  if (!deveExibir) return null;

  const handleAlternarColapso = () => {
    setColapsada((atual) => {
      const proximo = !atual;
      if (!proximo && socket && conversaAbertaGUID) {
        socket.emit('mark_as_read', { ConversaGUID: conversaAbertaGUID });
        setNaoLida(false);
      }
      return proximo;
    });
  };

  const handleFechar = (evento: React.MouseEvent) => {
    evento.stopPropagation();
    definirConversaAberta(null);
  };

  const handleExpandir = (evento?: React.MouseEvent) => {
    evento?.stopPropagation();
    router.push(`/dashboard/${escolaGUID}/chat`);
  };

  const handleEnviar = () => {
    const texto = textoInput.trim();
    if (!texto || !socket || !conversaAbertaGUID) return;
    socket.emit('send_mensagem', { ConversaGUID: conversaAbertaGUID, MensagemConteudo: texto, MensagemTipo: 'Texto' });
    setTextoInput('');
  };

  const titulo = detalhe ? nomeDaConversa(detalhe) : 'Conversa';
  const iniciais = obterIniciais(titulo);

  if (colapsada) {
    return (
      <button
        type="button"
        className={styles.bolhaColapsada}
        onClick={handleAlternarColapso}
        aria-label={`Abrir conversa minimizada: ${titulo}`}
        title={titulo}
      >
        {detalhe?.ConversaTipo === 'Grupo' ? <Icon name="users" size={20} /> : <span>{iniciais}</span>}
        {naoLida && <span className={styles.pontoNaoLido} aria-hidden="true" />}
      </button>
    );
  }

  return (
    <div className={styles.painel} role="dialog" aria-label={`Conversa minimizada com ${titulo}`}>
      <div className={styles.painelHeader} onClick={handleAlternarColapso}>
        <span className={styles.avatarPequeno}>
          {detalhe?.ConversaTipo === 'Grupo' ? <Icon name="users" size={15} /> : iniciais}
        </span>
        <span className={styles.painelTitulo}>{titulo}</span>
        <div className={styles.painelAcoes}>
          <button type="button" onClick={handleExpandir} aria-label="Expandir para tela cheia" title="Expandir">
            <Icon name="arrow-right" size={15} />
          </button>
          <button type="button" onClick={handleAlternarColapso} aria-label="Minimizar" title="Minimizar">
            <Icon name="chevron-down" size={16} />
          </button>
          <button type="button" onClick={handleFechar} aria-label="Fechar" title="Fechar">
            <Icon name="x" size={16} />
          </button>
        </div>
      </div>

      <div className={styles.mensagensLista} ref={mensagensListRef}>
        {carregando ? (
          <p className={styles.estadoVazio}>Carregando...</p>
        ) : erro ? (
          <p className={styles.erro}>{erro}</p>
        ) : mensagens.length === 0 ? (
          <p className={styles.estadoVazio}>Nenhuma mensagem ainda.</p>
        ) : (
          mensagens.map((mensagem) => {
            const mine = mensagem.MensagemRemetenteCPF === usuario?.UsuarioCPF;
            const apagada = !!mensagem.MensagemDeletedAt;
            return (
              <div key={mensagem.MensagemGUID} className={`${styles.bolhaLinha} ${mine ? styles.bolhaLinhaMinha : ''}`}>
                <div className={`${styles.bolhaMsg} ${mine ? styles.bolhaMsgMinha : styles.bolhaMsgOutro}`}>
                  <p className={styles.bolhaTexto}>
                    {apagada
                      ? 'Mensagem apagada'
                      : mensagem.MensagemTipo === 'Texto'
                      ? mensagem.MensagemConteudo
                      : mensagem.MensagemTipo === 'Imagem'
                      ? '📷 Imagem (abra a tela cheia pra ver)'
                      : '📎 Arquivo (abra a tela cheia pra ver)'}
                  </p>
                  <span className={styles.bolhaHora}>{formatarHora(mensagem.MensagemCreatedAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={styles.composeBar}>
        <input
          type="text"
          placeholder="Escreva uma mensagem..."
          value={textoInput}
          onChange={(e) => setTextoInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleEnviar();
          }}
        />
        <button type="button" onClick={handleEnviar} disabled={!textoInput.trim()} aria-label="Enviar">
          <Icon name="send" size={16} />
        </button>
      </div>
    </div>
  );
}
