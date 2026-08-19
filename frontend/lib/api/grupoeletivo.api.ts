/**
 * API Client para Grupos Eletivos (turmas mistas/eletivas)
 * Ver docs/PLANO_IMPLEMENTACAO_GRUPO_ELETIVO.md
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

// ==================== TYPES ====================

export interface GrupoEletivo {
  GrupoEletivoGUID: string;
  EscolaGUID: string;
  GrupoEletivoNome: string;
  GrupoEletivoStatus: 'Ativo' | 'Inativo';
  TotalMembros: number;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface GrupoEletivoCreateDTO {
  EscolaGUID: string;
  GrupoEletivoNome: string;
}

export interface GrupoEletivoUpdateDTO {
  GrupoEletivoNome?: string;
  GrupoEletivoStatus?: 'Ativo' | 'Inativo';
}

export interface MembroGrupoEletivo {
  UsuarioGUID: string;
  UsuarioNome: string;
  MatriculaGUID: string;
  MatriculaDataEntrada: string;
}

// ==================== CRUD ====================

export async function criarGrupoEletivo(data: GrupoEletivoCreateDTO): Promise<GrupoEletivo> {
  const response = await fetch(`${API_URL}/grupoeletivo`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao criar grupo eletivo');
  return result.data;
}

export async function listarGruposEletivos(filters?: {
  EscolaGUID?: string;
  GrupoEletivoStatus?: 'Ativo' | 'Inativo';
}): Promise<{ grupos: GrupoEletivo[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.EscolaGUID) params.append('EscolaGUID', filters.EscolaGUID);
  if (filters?.GrupoEletivoStatus) params.append('GrupoEletivoStatus', filters.GrupoEletivoStatus);

  const response = await fetch(`${API_URL}/grupoeletivo?${params}`, {
    headers: getHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao listar grupos eletivos');
  return { grupos: result.data || [], total: result.total || 0 };
}

export async function buscarGrupoEletivo(guid: string): Promise<GrupoEletivo> {
  const response = await fetch(`${API_URL}/grupoeletivo/${guid}`, {
    headers: getHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao buscar grupo eletivo');
  return result.data;
}

export async function atualizarGrupoEletivo(guid: string, updates: GrupoEletivoUpdateDTO): Promise<GrupoEletivo> {
  const response = await fetch(`${API_URL}/grupoeletivo/${guid}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao atualizar grupo eletivo');
  return result.data;
}

export async function excluirGrupoEletivo(guid: string): Promise<void> {
  const response = await fetch(`${API_URL}/grupoeletivo/${guid}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao excluir grupo eletivo');
}

// ==================== MEMBROS ====================

export async function listarMembrosGrupoEletivo(guid: string): Promise<MembroGrupoEletivo[]> {
  const response = await fetch(`${API_URL}/grupoeletivo/${guid}/membros`, {
    headers: getHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao listar membros');
  return result.data || [];
}

export async function adicionarMembroGrupoEletivo(guid: string, usuarioGUID: string): Promise<MembroGrupoEletivo> {
  const response = await fetch(`${API_URL}/grupoeletivo/${guid}/membros`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ UsuarioGUID: usuarioGUID }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao adicionar membro');
  return result.data;
}

export async function removerMembroGrupoEletivo(guid: string, usuarioGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/grupoeletivo/${guid}/membros/${usuarioGUID}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao remover membro');
}
