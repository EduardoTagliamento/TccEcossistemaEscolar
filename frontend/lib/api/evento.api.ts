/**
 * API Client para Evento (avisos amplos por escola — reuniões, festas,
 * palestras etc., sem destinatário individual). Ver `docs/routes/evento-api.md`
 * para o contrato completo. Padrão de fetch/headers/erro seguindo
 * `frontend/lib/api/pendencia.api.ts` e `frontend/lib/api/projeto.api.ts`.
 *
 * Criar/atualizar/"cancelar" (soft delete) é restrito no backend a
 * Coordenação/Secretaria/Direção — aqui só refletimos isso na nomenclatura
 * (`cancelarEvento`, não `excluirEvento`, já que DELETE só muda o status
 * para "Cancelado", não remove a linha).
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

export type EventoStatus = 'Agendado' | 'Realizado' | 'Cancelado';

export interface Evento {
  EventoGUID: string;
  EscolaGUID: string;
  EventoTitulo: string;
  EventoDescricao: string | null;
  EventoData: string;
  EventoStatus: EventoStatus;
  EventoCreatedAt: string;
  EventoUpdatedAt: string;
}

export interface EventoCreateDTO {
  EscolaGUID: string;
  EventoTitulo: string;
  EventoDescricao?: string;
  EventoData: string;
}

export interface EventoUpdateDTO {
  EventoTitulo?: string;
  EventoDescricao?: string | null;
  EventoData?: string;
  EventoStatus?: EventoStatus;
}

export interface EventoAnexo {
  AnexoGUID: string;
  AnexoNomeOriginal: string | null;
  AnexoTamanho?: number | null;
}

/** GET /api/evento — filtros opcionais. */
export async function listarEventos(filtro: {
  EscolaGUID?: string;
  EventoStatus?: EventoStatus;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
  offset?: number;
}): Promise<{ eventos: Evento[]; total: number }> {
  const query = new URLSearchParams();
  if (filtro.EscolaGUID) query.set('EscolaGUID', filtro.EscolaGUID);
  if (filtro.EventoStatus) query.set('EventoStatus', filtro.EventoStatus);
  if (filtro.dataInicio) query.set('dataInicio', filtro.dataInicio);
  if (filtro.dataFim) query.set('dataFim', filtro.dataFim);
  if (filtro.limit) query.set('limit', String(filtro.limit));
  if (filtro.offset) query.set('offset', String(filtro.offset));

  const response = await fetch(`${API_URL}/evento?${query.toString()}`, {
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao listar eventos');
  }
  return resultado.data as { eventos: Evento[]; total: number };
}

/** GET /api/evento/:EventoGUID */
export async function buscarEvento(eventoGUID: string): Promise<Evento> {
  const response = await fetch(`${API_URL}/evento/${eventoGUID}`, {
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao buscar evento');
  }
  return resultado.data.evento as Evento;
}

/** POST /api/evento — restrito a Coordenação/Secretaria/Direção (403 do backend caso contrário). */
export async function criarEvento(data: EventoCreateDTO): Promise<Evento> {
  const response = await fetch(`${API_URL}/evento`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao criar evento');
  }
  return resultado.data.evento as Evento;
}

/** PUT /api/evento/:EventoGUID — restrito a Coordenação/Secretaria/Direção. */
export async function atualizarEvento(eventoGUID: string, data: EventoUpdateDTO): Promise<Evento> {
  const response = await fetch(`${API_URL}/evento/${eventoGUID}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao atualizar evento');
  }
  return resultado.data.evento as Evento;
}

/**
 * DELETE /api/evento/:EventoGUID — soft delete: muda `EventoStatus` para
 * "Cancelado", não remove a linha. Nomeado "cancelar" para refletir isso na UI.
 */
export async function cancelarEvento(eventoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/evento/${eventoGUID}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao cancelar evento');
  }
}

/** GET /api/evento/:EventoGUID/anexos */
export async function listarAnexosEvento(eventoGUID: string): Promise<EventoAnexo[]> {
  const response = await fetch(`${API_URL}/evento/${eventoGUID}/anexos`, {
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao listar anexos do evento');
  }
  return (resultado.data?.anexos || []) as EventoAnexo[];
}

/** POST /api/evento/:EventoGUID/anexos — vincula um anexo já enviado via `/api/anexo`. */
export async function vincularAnexoEvento(eventoGUID: string, anexoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/evento/${eventoGUID}/anexos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ AnexoGUID: anexoGUID }),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao vincular anexo ao evento');
  }
}
