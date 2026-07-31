/**
 * API Client para o Calendário (avisos de tarefa/prova agregados por período,
 * consumido hoje só pela tela `dashboard/[escolaGUID]/calendario`).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token && token.trim() !== '') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface AvisoCalendario {
  TipoAviso: 'tarefa' | 'prova';
  AvisoId: string;
  MatriculaGUID?: string | null;
  DataPrazo: string;
  Titulo: string;
  Descricao: string | null;
  StatusBoolean?: boolean | null;
  StatusTexto: string;
  TipoEntrega: 'digital' | 'fisica' | null;
  IsFeito?: boolean;
}

export async function listarCalendario(filtros: {
  EscolaGUID: string;
  DataInicio: string;
  DataFim: string;
  TipoAviso?: 'tarefa' | 'prova';
}): Promise<AvisoCalendario[]> {
  const params = new URLSearchParams({
    EscolaGUID: filtros.EscolaGUID,
    DataInicio: filtros.DataInicio,
    DataFim: filtros.DataFim,
  });
  if (filtros.TipoAviso) params.set('TipoAviso', filtros.TipoAviso);

  const response = await fetch(`${API_URL}/calendario?${params.toString()}`, {
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao carregar calendário');
  }
  return resultado.data?.avisos ?? [];
}
