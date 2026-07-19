/**
 * API Client para Notificações
 * Feed in-app (sino), catálogo de tipos e preferências de canal do usuário.
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

export interface Notificacao {
  NotificacaoGUID: string;
  NotificacaoTipoId: number;
  UsuarioCPF: string;
  EscolaGUID: string;
  NotificacaoTitulo: string;
  NotificacaoConteudo: string | null;
  NotificacaoEntidadeTipo: string | null;
  NotificacaoEntidadeGUID: string | null;
  NotificacaoLink: string | null;
  NotificacaoLida: boolean;
  NotificacaoLidaData: string | null;
  NotificacaoCreatedAt: string;
}

export interface NotificacaoTipo {
  NotificacaoTipoId: number;
  NotificacaoTipoSlug: string;
  NotificacaoTipoDescricao: string;
  NotificacaoTipoCategoria: 'Aviso' | 'Lembrete';
  NotificacaoTipoEmailPadrao: boolean;
  NotificacaoTipoWhatsappPadrao: boolean;
  NotificacaoTipoAtivo: boolean;
  FuncaoIds: number[];
}

export interface NotificacaoPreferencia {
  NotificacaoTipoId: number;
  NotificacaoTipoSlug: string;
  NotificacaoTipoDescricao: string;
  NotificacaoTipoCategoria: 'Aviso' | 'Lembrete';
  PreferenciaEmailAtivo: boolean;
  PreferenciaWhatsappAtivo: boolean;
  Origem: 'padrao' | 'usuario';
}

// ==================== FEED ====================

export async function listarNotificacoes(filtro?: { lida?: boolean; limit?: number; offset?: number }): Promise<Notificacao[]> {
  const query = new URLSearchParams();
  if (filtro?.lida !== undefined) query.set('lida', String(filtro.lida));
  if (filtro?.limit) query.set('limit', String(filtro.limit));
  if (filtro?.offset) query.set('offset', String(filtro.offset));

  const response = await fetch(`${API_URL}/notificacao?${query.toString()}`, {
    headers: getHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao listar notificações');
  return result.data.notificacoes;
}

export async function contarNaoLidas(): Promise<number> {
  const response = await fetch(`${API_URL}/notificacao/contador`, {
    headers: getHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao contar notificações');
  return result.data.total;
}

export async function marcarComoLida(notificacaoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/notificacao/${notificacaoGUID}/lida`, {
    method: 'PATCH',
    headers: getHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao marcar notificação como lida');
}

export async function marcarTodasComoLidas(): Promise<number> {
  const response = await fetch(`${API_URL}/notificacao/lidas`, {
    method: 'PATCH',
    headers: getHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao marcar notificações como lidas');
  return result.data.total;
}

// ==================== CATÁLOGO E PREFERÊNCIAS ====================

export async function listarTipos(): Promise<NotificacaoTipo[]> {
  const response = await fetch(`${API_URL}/notificacao/tipos`, {
    headers: getHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao listar tipos de notificação');
  return result.data.tipos;
}

export async function listarPreferencias(): Promise<NotificacaoPreferencia[]> {
  const response = await fetch(`${API_URL}/notificacao/preferencias`, {
    headers: getHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao listar preferências de notificação');
  return result.data.preferencias;
}

export async function atualizarPreferencia(
  notificacaoTipoId: number,
  preferenciaEmailAtivo: boolean,
  preferenciaWhatsappAtivo: boolean
): Promise<NotificacaoPreferencia> {
  const response = await fetch(`${API_URL}/notificacao/preferencias/${notificacaoTipoId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({
      PreferenciaEmailAtivo: preferenciaEmailAtivo,
      PreferenciaWhatsappAtivo: preferenciaWhatsappAtivo,
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao atualizar preferência de notificação');
  return result.data.preferencia;
}
