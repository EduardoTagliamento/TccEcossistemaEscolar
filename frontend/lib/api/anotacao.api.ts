import { Anotacao } from '@/types/anotacao';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Helper: obter token do localStorage
function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('token') || '';
}

// Helper: headers padrão
function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

// CREATE
export async function criarAnotacao(
  escolaGUID: string,
  data: string,
  titulo: string,
  descricao?: string
): Promise<Anotacao> {
  const response = await fetch(`${API_URL}/anotacao`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      EscolaGUID: escolaGUID,
      AnotacaoData: data,
      AnotacaoTitulo: titulo,
      AnotacaoDescricao: descricao || null
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar anotação');
  }

  return result.data;
}

// READ (listar por período - usado no calendário)
export async function listarAnotacoesPorPeriodo(
  escolaGUID: string,
  dataInicio: string,
  dataFim: string
): Promise<Anotacao[]> {
  const params = new URLSearchParams({
    EscolaGUID: escolaGUID,
    DataInicio: dataInicio,
    DataFim: dataFim
  });

  const response = await fetch(`${API_URL}/anotacao?${params}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar anotações');
  }

  return result.data;
}

// READ (listar com filtro de status)
export async function listarAnotacoes(
  escolaGUID: string,
  isFeito?: boolean
): Promise<Anotacao[]> {
  const params: any = { EscolaGUID: escolaGUID };
  
  if (isFeito !== undefined) {
    params.AnotacaoIsFeito = isFeito;
  }

  const queryString = new URLSearchParams(params).toString();

  const response = await fetch(`${API_URL}/anotacao?${queryString}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar anotações');
  }

  return result.data;
}

// UPDATE
export async function atualizarAnotacao(
  guid: string,
  updates: {
    AnotacaoData?: string;
    AnotacaoTitulo?: string;
    AnotacaoDescricao?: string | null;
    AnotacaoIsFeito?: boolean;
  }
): Promise<Anotacao> {
  const response = await fetch(`${API_URL}/anotacao/${guid}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao atualizar anotação');
  }

  return result.data;
}

// TOGGLE FEITO
export async function toggleAnotacaoFeito(guid: string): Promise<Anotacao> {
  const response = await fetch(`${API_URL}/anotacao/${guid}/toggle`, {
    method: 'PATCH',
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao atualizar status');
  }

  return result.data;
}

// DELETE
export async function excluirAnotacao(guid: string): Promise<void> {
  const response = await fetch(`${API_URL}/anotacao/${guid}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao excluir anotação');
  }
}

// STATS
export async function obterEstatisticas(escolaGUID: string): Promise<{
  total: number;
  feitas: number;
  pendentes: number;
}> {
  const params = new URLSearchParams({ EscolaGUID: escolaGUID });

  const response = await fetch(`${API_URL}/anotacao/estatisticas?${params}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao obter estatísticas');
  }

  return result.data;
}
