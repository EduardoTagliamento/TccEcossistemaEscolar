/**
 * API Client para Categorias de Conteúdo
 * Pessoais de cada professor, por matéria (ex: "Cinemática" em Física).
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

export interface CategoriaConteudo {
  CategoriaGUID: string;
  UsuarioCPF: string;
  MateriaGUID: string;
  CategoriaNome: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export async function criarCategoria(materiaGUID: string, categoriaNome: string): Promise<CategoriaConteudo> {
  const response = await fetch(`${API_URL}/categoria-conteudo`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ categoria: { MateriaGUID: materiaGUID, CategoriaNome: categoriaNome } }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar categoria');
  }
  return result.data.categoria;
}

export async function listarCategorias(filters?: { MateriaGUID?: string }): Promise<CategoriaConteudo[]> {
  const params = new URLSearchParams();
  if (filters?.MateriaGUID) params.append('MateriaGUID', filters.MateriaGUID);

  const response = await fetch(`${API_URL}/categoria-conteudo?${params}`, {
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar categorias');
  }
  return result.data?.categorias || [];
}

export async function atualizarCategoria(categoriaGUID: string, categoriaNome: string): Promise<CategoriaConteudo> {
  const response = await fetch(`${API_URL}/categoria-conteudo/${categoriaGUID}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ categoria: { CategoriaNome: categoriaNome } }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao atualizar categoria');
  }
  return result.data.categoria;
}

export async function excluirCategoria(categoriaGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/categoria-conteudo/${categoriaGUID}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao excluir categoria');
  }
}
