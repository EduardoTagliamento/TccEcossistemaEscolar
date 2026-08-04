/**
 * API Client de administração da taxonomia global (spec item 17) — todas
 * as rotas atrás de `plataformaAdminGuard` no backend.
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

export interface MateriaGlobal {
  MateriaGlobalGUID: string;
  Nome: string;
  Status: 'Pendente' | 'Confirmado';
  CreatedAt: string | null;
}

export interface SubMateriaGlobal {
  SubMateriaGlobalGUID: string;
  MateriaGlobalGUID: string;
  Nome: string;
}

export async function listarMateriasGlobais(status: 'Pendente' | 'Confirmado'): Promise<MateriaGlobal[]> {
  const response = await fetch(`${API_URL}/materiaglobal?Status=${status}`, { headers: getHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao listar matérias globais');
  return result.data?.materiasGlobais || [];
}

export async function resolverPendente(materiaGlobalGUID: string, mesclarEmGUID: string | null): Promise<void> {
  const response = await fetch(`${API_URL}/materiaglobal/${materiaGlobalGUID}/resolver-pendente`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ MesclarEmGUID: mesclarEmGUID }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao resolver pendência');
}

export async function listarSubMaterias(materiaGlobalGUID: string): Promise<SubMateriaGlobal[]> {
  const response = await fetch(`${API_URL}/materiaglobal/${materiaGlobalGUID}/submateria`, { headers: getHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao listar submatérias');
  return result.data?.submaterias || [];
}

export async function criarSubMateria(materiaGlobalGUID: string, nome: string): Promise<SubMateriaGlobal> {
  const response = await fetch(`${API_URL}/materiaglobal/${materiaGlobalGUID}/submateria`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ Nome: nome }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao criar submatéria');
  return result.data.submateria;
}
