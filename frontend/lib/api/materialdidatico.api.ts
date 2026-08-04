/**
 * API Client para Material Didático (livro didático) — spec item 7-9.
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

export interface MaterialDidatico {
  MaterialDidaticoGUID: string;
  EscolaGUID: string;
  Titulo: string;
  CriadoPorCPF: string;
  CreatedAt: string | null;
}

export interface MaterialDidaticoCapitulo {
  MaterialDidaticoCapituloGUID: string;
  MaterialDidaticoGUID: string;
  MateriaGUID: string;
  Titulo: string;
  PaginaInicio: number;
  PaginaFim: number;
  AssuntoGUID: string | null;
}

/** Livros que têm pelo menos um capítulo desta matéria — 1º passo do fluxo "escolher livro → escolher capítulo" (spec §6). */
export async function listarLivrosPorMateria(materiaGUID: string): Promise<MaterialDidatico[]> {
  const response = await fetch(`${API_URL}/materialdidatico/por-materia/${materiaGUID}`, { headers: getHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao listar materiais didáticos');
  return result.data?.materiais || [];
}

/** Capítulos de UM livro específico que pertencem à matéria — 2º passo do fluxo. */
export async function listarCapitulosPorMateria(
  materialDidaticoGUID: string,
  materiaGUID: string
): Promise<MaterialDidaticoCapitulo[]> {
  const response = await fetch(`${API_URL}/materialdidatico/${materialDidaticoGUID}/capitulos/materia/${materiaGUID}`, {
    headers: getHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao listar capítulos');
  return result.data?.capitulos || [];
}
