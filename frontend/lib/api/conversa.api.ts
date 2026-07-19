/**
 * API Client para Conversa (Mensagens / Chat)
 *
 * Cobre a camada REST do módulo (listar conversas/histórico, editar/deletar/
 * fixar/desafixar mensagem, iniciar conversa individual). O envio de
 * mensagem de texto NÃO é REST — acontece via WebSocket
 * (`frontend/lib/socket/SocketContext.tsx`, evento `send_mensagem`).
 *
 * Ver docs/routes/conversa-api.md para a documentação completa dos endpoints.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token && token.trim() !== '') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// ==================== TYPES ====================

export type ConversaTipo = 'Individual' | 'Grupo';
export type ConversaGrupoTipo = 'Turma' | 'Tarefa';
export type MembroFuncao = 'Membro' | 'Lider' | 'Representante' | 'Vice-Representante';
export type MensagemTipo = 'Texto' | 'Arquivo' | 'Imagem';

export interface UltimaMensagemResumo {
  MensagemConteudo: string;
  MensagemRemetenteCPF: string;
  RemetenteNome: string;
  MensagemCreatedAt: string;
  MensagemTipo: MensagemTipo;
}

export interface ConversaListItem {
  ConversaGUID: string;
  ConversaTipo: ConversaTipo;
  ConversaGrupoNome: string | null;
  ConversaGrupoTipo: ConversaGrupoTipo | null;
  ParceiroCPF: string | null;
  ParceiroNome: string | null;
  TagContextual: string | null;
  UltimaMensagem: UltimaMensagemResumo | null;
  NaoLidas: number;
}

export interface ConversaMembro {
  UsuarioCPF: string;
  MembroFuncao: MembroFuncao;
  MembroEntradaAt: string;
}

export interface Mensagem {
  MensagemGUID: string;
  ConversaGUID: string;
  MensagemRemetenteCPF: string;
  MensagemConteudo: string;
  MensagemTipo: MensagemTipo;
  MensagemCreatedAt: string;
  MensagemDeletedAt?: string | null;
  MensagemEditadaAt?: string | null;
}

export interface MensagemFixada {
  MensagemGUID: string;
  ConversaGUID: string;
  MensagemConteudo: string;
  MensagemRemetenteCPF: string;
  MensagemCreatedAt: string;
  MensagemTipo: MensagemTipo;
  FixadaPorCPF: string;
  FixadaAt: string;
}

export interface ConversaDetalhe {
  ConversaGUID: string;
  ConversaTipo: ConversaTipo;
  ConversaGrupoNome: string | null;
  ConversaGrupoTipo: ConversaGrupoTipo | null;
  Membros?: ConversaMembro[];
  ParceiroCPF: string | null;
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

// ==================== HELPERS ====================

async function tratarResposta<T>(response: Response, mensagemErroPadrao: string): Promise<T> {
  // Vários endpoints (unpin/deletar/remover permissão) retornam 204 sem corpo.
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || mensagemErroPadrao);
  }
  return resultado.data as T;
}

// ==================== CONVERSAS ====================

/** Lista todas as conversas (grupo + individuais) em que o usuário participa. */
export async function listarConversas(): Promise<ConversaListItem[]> {
  const response = await fetch(`${API_URL}/conversa`, {
    headers: getHeaders(),
  });
  return tratarResposta<ConversaListItem[]>(response, 'Erro ao listar conversas');
}

/** Detalhe da conversa: membros (se grupo), últimas mensagens e fixadas. */
export async function buscarConversa(conversaGUID: string): Promise<ConversaDetalhe> {
  const response = await fetch(`${API_URL}/conversa/${conversaGUID}`, {
    headers: getHeaders(),
  });
  return tratarResposta<ConversaDetalhe>(response, 'Erro ao buscar conversa');
}

/** Histórico paginado por cursor (`before` = MensagemGUID de referência). */
export async function listarMensagens(
  conversaGUID: string,
  opcoes?: { limit?: number; before?: string }
): Promise<HistoricoMensagens> {
  const query = new URLSearchParams();
  if (opcoes?.limit) query.set('limit', String(opcoes.limit));
  if (opcoes?.before) query.set('before', opcoes.before);

  const response = await fetch(`${API_URL}/conversa/${conversaGUID}/mensagem?${query.toString()}`, {
    headers: getHeaders(),
  });
  return tratarResposta<HistoricoMensagens>(response, 'Erro ao carregar histórico de mensagens');
}

export async function listarFixadas(conversaGUID: string): Promise<MensagemFixada[]> {
  const response = await fetch(`${API_URL}/conversa/${conversaGUID}/fixadas`, {
    headers: getHeaders(),
  });
  return tratarResposta<MensagemFixada[]>(response, 'Erro ao listar mensagens fixadas');
}

/** Cria (ou recupera, se já existir) a conversa 1:1 com outro usuário da escola. */
export async function iniciarConversaIndividual(destinatarioCPF: string): Promise<IniciarConversaResultado> {
  const response = await fetch(`${API_URL}/conversa/individual`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ DestinatarioCPF: destinatarioCPF }),
  });
  return tratarResposta<IniciarConversaResultado>(response, 'Erro ao iniciar conversa');
}

// ==================== MENSAGENS (mutações via REST) ====================
// Enviar mensagem é só via WebSocket (SocketContext) — as ações abaixo têm
// endpoint REST próprio e também emitem o evento WS correspondente para os
// participantes conectados (ver docs/routes/conversa-api.md).

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
