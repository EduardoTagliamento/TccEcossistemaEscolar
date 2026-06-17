/**
 * API Client para Cursos
 * Endpoints para gerenciamento de cursos técnicos
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Helper: obter token do localStorage
function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

// Helper: headers padrão
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

export interface Curso {
  CursoGUID: string;
  EscolaGUID: string;
  CursoNome: string;
  CursoStatus: 'Ativo' | 'Inativo';
  CursoCreatedAt: Date | string;
  CursoUpdatedAt: Date | string;
}

export interface CursoCreateDTO {
  EscolaGUID: string;
  CursoNome: string;
  CursoStatus?: 'Ativo' | 'Inativo';
}

export interface BatchItemResult {
  item: CursoCreateDTO;
  sucesso: boolean;
  mensagem: string;
  dados?: Curso;
  tipo?: 'criado' | 'duplicado' | 'erro';
}

export interface BatchCreateResponse {
  totalProcessados: number;
  criados: number;
  duplicados: number;
  erros: number;
  resultados: BatchItemResult[];
}

// ==================== CREATE ====================

/**
 * Criar curso individual
 */
export async function criarCurso(data: CursoCreateDTO): Promise<Curso> {
  const response = await fetch(`${API_URL}/curso`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ curso: data })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar curso');
  }

  return result.data;
}

/**
 * Criar múltiplos cursos em massa
 */
export async function criarCursosEmMassa(cursos: CursoCreateDTO[]): Promise<BatchCreateResponse> {
  const response = await fetch(`${API_URL}/curso`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ cursos })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar cursos em massa');
  }

  return result.data;
}

// ==================== READ ====================

/**
 * Listar cursos com filtros opcionais
 */
export async function listarCursos(filters?: {
  EscolaGUID?: string;
  CursoStatus?: 'Ativo' | 'Inativo';
}): Promise<{ cursos: Curso[]; total: number }> {
  const params = new URLSearchParams();
  
  if (filters?.EscolaGUID) {
    params.append('EscolaGUID', filters.EscolaGUID);
  }
  
  if (filters?.CursoStatus) {
    params.append('CursoStatus', filters.CursoStatus);
  }

  const response = await fetch(`${API_URL}/curso?${params}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar cursos');
  }

  return {
    cursos: result.data || [],
    total: result.total || 0
  };
}

/**
 * Buscar curso por GUID
 */
export async function buscarCurso(cursoGUID: string): Promise<Curso> {
  const response = await fetch(`${API_URL}/curso/${cursoGUID}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao buscar curso');
  }

  return result.data;
}

// ==================== UPDATE ====================

/**
 * Atualizar curso
 */
export async function atualizarCurso(
  cursoGUID: string,
  updates: {
    CursoNome?: string;
    CursoStatus?: 'Ativo' | 'Inativo';
  }
): Promise<Curso> {
  const response = await fetch(`${API_URL}/curso/${cursoGUID}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ curso: updates })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao atualizar curso');
  }

  return result.data;
}

// ==================== DELETE ====================

/**
 * Excluir curso (soft delete)
 */
export async function excluirCurso(cursoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/curso/${cursoGUID}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao excluir curso');
  }
}
