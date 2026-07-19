/**
 * API Client para Projetos
 */

import { Projeto, ProjetoCreateDTO, ProjetoUpdateDTO } from '@/types/projeto';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

export async function criarProjeto(data: ProjetoCreateDTO): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projeto`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar projeto');
  }

  return result.data.projeto;
}

export async function listarProjetos(escolaGUID: string): Promise<Projeto[]> {
  const response = await fetch(`${API_URL}/projeto?EscolaGUID=${escolaGUID}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar projetos');
  }

  return result.data?.projetos || [];
}

export async function buscarProjeto(projetoGUID: string): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projeto/${projetoGUID}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao buscar projeto');
  }

  return result.data.projeto;
}

export async function atualizarProjeto(projetoGUID: string, data: ProjetoUpdateDTO): Promise<Projeto> {
  const response = await fetch(`${API_URL}/projeto/${projetoGUID}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao atualizar projeto');
  }

  return result.data.projeto;
}

export async function encerrarProjeto(projetoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/projeto/${projetoGUID}/encerrar`, {
    method: 'PATCH',
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao encerrar projeto');
  }
}
