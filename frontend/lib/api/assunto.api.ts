/**
 * API Client para Assunto — vocabulário controlado por Matéria, usado pra
 * travamento manual na criação de prova (spec item 3).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  const token = getToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export interface Assunto {
  AssuntoGUID: string;
  MateriaGUID: string;
  AssuntoPaiGUID: string | null;
  Nome: string;
  SubMateriaGlobalGUID: string | null;
  Origem: 'Manual' | 'SumarioLivro' | 'SugeridoIA';
  CreatedAt: string | null;
}

export async function listarAssuntos(materiaGUID: string): Promise<Assunto[]> {
  const response = await fetch(`${API_URL}/assunto?MateriaGUID=${materiaGUID}`, {
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar assuntos');
  }
  return result.data?.assuntos || [];
}

export async function criarAssunto(data: { MateriaGUID: string; Nome: string }): Promise<Assunto> {
  const response = await fetch(`${API_URL}/assunto`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ assunto: data }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar assunto');
  }
  return result.data.assunto;
}
