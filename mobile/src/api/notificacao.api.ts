/**
 * Feed de notificações in-app (sino) — espelha
 * `frontend/lib/api/notificacao.api.ts` (só o feed, sem preferências de canal
 * no v1).
 */
import { API_URL, getHeaders, query, tratarResposta } from './client';

export interface Notificacao {
  NotificacaoGUID: string;
  NotificacaoTipoId: number;
  UsuarioGUID: string;
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

export async function listarNotificacoes(filtro?: {
  lida?: boolean;
  limit?: number;
  offset?: number;
  EscolaGUID?: string;
}): Promise<Notificacao[]> {
  const response = await fetch(`${API_URL}/notificacao${query(filtro ?? {})}`, { headers: getHeaders() });
  const resultado = await tratarResposta<{ notificacoes: Notificacao[] }>(response, 'Erro ao listar notificações');
  return resultado?.notificacoes ?? [];
}

export async function contarNaoLidas(escolaGUID?: string): Promise<number> {
  const response = await fetch(`${API_URL}/notificacao/contador${query({ EscolaGUID: escolaGUID })}`, {
    headers: getHeaders(),
  });
  const resultado = await tratarResposta<{ total: number }>(response, 'Erro ao contar notificações');
  return resultado?.total ?? 0;
}

export async function marcarComoLida(notificacaoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/notificacao/${notificacaoGUID}/lida`, {
    method: 'PATCH',
    headers: getHeaders(),
  });
  await tratarResposta(response, 'Erro ao marcar notificação como lida');
}

export async function marcarTodasComoLidas(escolaGUID?: string): Promise<number> {
  const response = await fetch(`${API_URL}/notificacao/lidas${query({ EscolaGUID: escolaGUID })}`, {
    method: 'PATCH',
    headers: getHeaders(),
  });
  const resultado = await tratarResposta<{ total: number }>(response, 'Erro ao marcar notificações como lidas');
  return resultado?.total ?? 0;
}
