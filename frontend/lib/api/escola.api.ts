/**
 * API Client para Escola
 * 
 * Funções para buscar dados de escola
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export interface Escola {
  EscolaGUID: string;
  EscolaNome: string;
  EscolaCNPJ: string | null;
  EscolaEndereco: string | null;
  EscolaContato: string | null;
  EscolaStatus: 'Ativo' | 'Inativo';
  EscolaCreatedAt: Date;
  EscolaUpdatedAt: Date;
}

/**
 * Buscar escola por GUID
 */
export async function buscarEscola(escolaGUID: string): Promise<{ escola: Escola }> {
  const response = await fetch(`${API_URL}/escola/${escolaGUID}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao buscar escola');
  }

  const data = await response.json();
  return { escola: data.data || data };
}

/**
 * Listar todas as escolas (filtros opcionais)
 */
export async function listarEscolas(filtros?: {
  EscolaStatus?: string;
}): Promise<{ escolas: Escola[]; total: number }> {
  const params = new URLSearchParams();
  if (filtros?.EscolaStatus) {
    params.append('EscolaStatus', filtros.EscolaStatus);
  }

  const url = `${API_URL}/escola${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao listar escolas');
  }

  const data = await response.json();
  return {
    escolas: data.data || data.escolas || [],
    total: data.total || (data.data?.length || 0)
  };
}
