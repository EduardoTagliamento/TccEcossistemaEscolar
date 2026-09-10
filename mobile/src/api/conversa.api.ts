/**
 * Conversa (Mensagem/Chat) — espelha `frontend/lib/api/conversa.api.ts`.
 * Cobre a camada REST (listar conversas/histórico, editar/deletar/fixar/
 * reagir, iniciar conversa individual). Envio de texto é só via WebSocket —
 * ver `src/context/SocketContext.tsx`, evento `send_mensagem`
 * (`backend/websocket/conversa.handler.ts`).
 */
import { API_URL, getHeaders, tratarResposta } from './client';

export type ConversaTipo = 'Individual' | 'Grupo';
export type ConversaGrupoTipo = 'Turma' | 'Tarefa' | 'Projeto';
export type MembroFuncao = 'Membro' | 'Lider' | 'Representante' | 'Vice-Representante';
export type MensagemTipo = 'Texto' | 'Arquivo' | 'Imagem';

export interface UltimaMensagemResumo {
  MensagemConteudo: string;
  MensagemRemetenteGUID: string;
  RemetenteNome: string;
  MensagemCreatedAt: string;
  MensagemTipo: MensagemTipo;
}

export interface ConversaListItem {
  ConversaGUID: string;
  ConversaTipo: ConversaTipo;
  ConversaGrupoNome: string | null;
  ConversaGrupoTipo: ConversaGrupoTipo | null;
  ParceiroGUID: string | null;
  ParceiroNome: string | null;
  TagContextual: string | null;
  UltimaMensagem: UltimaMensagemResumo | null;
  NaoLidas: number;
}

export interface MinhasPermissoesChat {
  PodeExcluirMensagens: boolean;
  PodePersonalizarGrupo: boolean;
}

export interface ConversaMembro {
  UsuarioGUID: string;
  UsuarioNome: string;
  UsuarioFotoUrl?: string | null;
  MembroFuncao: MembroFuncao;
  MembroEntradaAt: string;
}

export const EMOJIS_REACAO_PERMITIDOS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;
export type ReacaoEmoji = (typeof EMOJIS_REACAO_PERMITIDOS)[number];

export interface ReacaoResumo {
  Emoji: string;
  Quantidade: number;
  UsuariosGUID: string[];
}

export interface Mensagem {
  MensagemGUID: string;
  ConversaGUID: string;
  MensagemRemetenteGUID: string;
  MensagemConteudo: string;
  MensagemTipo: MensagemTipo;
  MensagemCreatedAt: string;
  MensagemDeletedAt?: string | null;
  MensagemEditadaAt?: string | null;
  Reacoes?: ReacaoResumo[];
  Leitores?: string[];
}

export interface MensagemFixada {
  MensagemGUID: string;
  ConversaGUID: string;
  MensagemConteudo: string;
  MensagemRemetenteGUID: string;
  MensagemCreatedAt: string;
  MensagemTipo: MensagemTipo;
  FixadaPorGUID: string;
  FixadaAt: string;
}

export interface ConversaDetalhe {
  ConversaGUID: string;
  ConversaTipo: ConversaTipo;
  ConversaGrupoNome: string | null;
  ConversaGrupoTipo: ConversaGrupoTipo | null;
  ConversaGrupoRefGUID: string | null;
  ConversaGrupoCorFundo: string | null;
  ConversaGrupoImagemUrl: string | null;
  Membros?: ConversaMembro[];
  MinhasPermissoes: MinhasPermissoesChat | null;
  ParceiroGUID: string | null;
  ParceiroNome: string | null;
  TagContextual: string | null;
  MensagensFixadas: MensagemFixada[];
  Mensagens: Mensagem[];
  HasMore: boolean;
}

export interface HistoricoMensagens {
  Mensagens: Mensagem[];
  HasMore: boolean;
}

export interface IniciarConversaResultado {
  ConversaGUID: string;
  isNova: boolean;
}

export interface ReacaoAtualizada {
  ConversaGUID: string;
  MensagemGUID: string;
  Reacoes: ReacaoResumo[];
  AtorGUID: string;
  Acao: 'adicionada' | 'removida';
}

// ==================== CONVERSAS ====================

export async function listarConversas(escolaGUID?: string): Promise<ConversaListItem[]> {
  const q = escolaGUID ? `?EscolaGUID=${encodeURIComponent(escolaGUID)}` : '';
  const response = await fetch(`${API_URL}/conversa${q}`, { headers: getHeaders() });
  return tratarResposta<ConversaListItem[]>(response, 'Erro ao listar conversas');
}

export async function buscarConversa(conversaGUID: string): Promise<ConversaDetalhe> {
  const response = await fetch(`${API_URL}/conversa/${conversaGUID}`, { headers: getHeaders() });
  return tratarResposta<ConversaDetalhe>(response, 'Erro ao buscar conversa');
}

export async function listarMensagens(
  conversaGUID: string,
  opcoes?: { limit?: number; before?: string }
): Promise<HistoricoMensagens> {
  const q = new URLSearchParams();
  if (opcoes?.limit) q.set('limit', String(opcoes.limit));
  if (opcoes?.before) q.set('before', opcoes.before);

  const response = await fetch(`${API_URL}/conversa/${conversaGUID}/mensagem?${q.toString()}`, {
    headers: getHeaders(),
  });
  return tratarResposta<HistoricoMensagens>(response, 'Erro ao carregar histórico de mensagens');
}

export async function listarFixadas(conversaGUID: string): Promise<MensagemFixada[]> {
  const response = await fetch(`${API_URL}/conversa/${conversaGUID}/fixadas`, { headers: getHeaders() });
  return tratarResposta<MensagemFixada[]>(response, 'Erro ao listar mensagens fixadas');
}

/** Cria (ou recupera, se já existir) a conversa 1:1 com outro usuário da escola. */
export async function iniciarConversaIndividual(destinatarioGUID: string): Promise<IniciarConversaResultado> {
  const response = await fetch(`${API_URL}/conversa/individual`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ DestinatarioGUID: destinatarioGUID }),
  });
  return tratarResposta<IniciarConversaResultado>(response, 'Erro ao iniciar conversa');
}

// ==================== MENSAGENS (mutações via REST) ====================
// Enviar mensagem é só via WebSocket — ver SocketContext.tsx.

export async function fixarMensagem(conversaGUID: string, mensagemGUID: string): Promise<MensagemFixada> {
  const response = await fetch(`${API_URL}/conversa/${conversaGUID}/mensagem/${mensagemGUID}/fixar`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return tratarResposta<MensagemFixada>(response, 'Erro ao fixar mensagem');
}

export async function desafixarMensagem(conversaGUID: string, mensagemGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/conversa/${conversaGUID}/mensagem/${mensagemGUID}/fixar`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return tratarResposta<void>(response, 'Erro ao desafixar mensagem');
}

export async function deletarMensagem(conversaGUID: string, mensagemGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/conversa/${conversaGUID}/mensagem/${mensagemGUID}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return tratarResposta<void>(response, 'Erro ao apagar mensagem');
}

export async function editarMensagem(
  conversaGUID: string,
  mensagemGUID: string,
  mensagemConteudo: string
): Promise<Mensagem> {
  const response = await fetch(`${API_URL}/conversa/${conversaGUID}/mensagem/${mensagemGUID}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ MensagemConteudo: mensagemConteudo }),
  });
  return tratarResposta<Mensagem>(response, 'Erro ao editar mensagem');
}

/** Reage (toggle) a uma mensagem com um emoji. */
export async function reagirMensagem(
  conversaGUID: string,
  mensagemGUID: string,
  emoji: ReacaoEmoji
): Promise<ReacaoAtualizada> {
  const response = await fetch(`${API_URL}/conversa/${conversaGUID}/mensagem/${mensagemGUID}/reacao`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ReacaoEmoji: emoji }),
  });
  return tratarResposta<ReacaoAtualizada>(response, 'Erro ao reagir à mensagem');
}
