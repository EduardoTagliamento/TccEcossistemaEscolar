/**
 * Eventos amplos por escola (reuniões, festas, palestras) — espelha
 * `frontend/lib/api/evento.api.ts` (só leitura no v1).
 */
import { API_URL, getHeaders, query, tratarResposta } from './client';

export type EventoStatus = 'Agendado' | 'Realizado' | 'Cancelado';

export interface Evento {
  EventoGUID: string;
  EscolaGUID: string;
  EventoTitulo: string;
  EventoDescricao: string | null;
  EventoData: string;
  EventoStatus: EventoStatus;
}

export async function listarEventos(filtro: {
  EscolaGUID: string;
  dataInicio?: string;
  dataFim?: string;
}): Promise<{ eventos: Evento[]; total: number }> {
  const response = await fetch(`${API_URL}/evento${query(filtro)}`, { headers: getHeaders() });
  return tratarResposta<{ eventos: Evento[]; total: number }>(response, 'Erro ao listar eventos');
}
