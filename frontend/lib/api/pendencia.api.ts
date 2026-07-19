/**
 * API Client para Pendência.
 * Hoje só cobre listagem (usada no widget "Pendências" da home do dashboard).
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

export interface Pendencia {
  PendenciaGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string;
  PendenciaTitulo: string;
  PendenciaConteudo: string | null;
  PendenciaPostagemData: string;
  PendenciaPrazoData: string;
  PendenciaFeito: boolean;
  PendenciaRealizacaoData: string | null;
}

/** GET /api/pendencia — sem EscolaGUID (ou sem ser admin da escola), a API já restringe às pendências do próprio usuário. */
export async function listarPendencias(filtro?: {
  EscolaGUID?: string;
  PendenciaFeito?: boolean;
  atrasadas?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ pendencias: Pendencia[]; total: number }> {
  const query = new URLSearchParams();
  if (filtro?.EscolaGUID) query.set('EscolaGUID', filtro.EscolaGUID);
  if (filtro?.PendenciaFeito !== undefined) query.set('PendenciaFeito', String(filtro.PendenciaFeito));
  if (filtro?.atrasadas !== undefined) query.set('atrasadas', String(filtro.atrasadas));
  if (filtro?.limit) query.set('limit', String(filtro.limit));
  if (filtro?.offset) query.set('offset', String(filtro.offset));

  const response = await fetch(`${API_URL}/pendencia?${query.toString()}`, {
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao listar pendências');
  }
  return resultado.data as { pendencias: Pendencia[]; total: number };
}
