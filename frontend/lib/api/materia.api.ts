/**
 * API Client para Matérias
 * Endpoints para gerenciamento de matérias/disciplinas
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Helper: obter token do localStorage
function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

// Helper: headers padrão
function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

// ==================== TYPES ====================

export interface Materia {
  MateriaGUID: string;
  EscolaGUID: string;
  CursoGUID: string | null;
  MateriaNome: string;
  MateriaIsTecnica: boolean;
  MateriaStatus: 'Ativa' | 'Inativa';
  MateriaCreatedAt: Date | string;
  MateriaUpdatedAt: Date | string;
}

export interface MateriaCreateDTO {
  EscolaGUID: string;
  CursoGUID?: string | null;
  CursoNome?: string; // Para resolução nome → GUID
  MateriaNome: string;
  MateriaIsTecnica: boolean;
  MateriaStatus?: 'Ativa' | 'Inativa';
}

export interface BatchItemResult {
  item: MateriaCreateDTO;
  sucesso: boolean;
  mensagem: string;
  dados?: Materia;
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
 * Criar matéria individual
 */
export async function criarMateria(data: MateriaCreateDTO): Promise<Materia> {
  const response = await fetch(`${API_URL}/materia`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ materia: data })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar matéria');
  }

  return result.data.materia;
}

/**
 * Criar múltiplas matérias em massa
 */
export async function criarMateriasEmMassa(materias: MateriaCreateDTO[]): Promise<BatchCreateResponse> {
  const response = await fetch(`${API_URL}/materia`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ materias })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar matérias em massa');
  }

  return result.data;
}

// ==================== READ ====================

/**
 * Listar matérias com filtros opcionais
 */
export async function listarMaterias(filters?: {
  EscolaGUID?: string;
  MateriaStatus?: 'Ativa' | 'Inativa';
  MateriaIsTecnica?: boolean;
}): Promise<{ materias: Materia[]; total: number }> {
  const params = new URLSearchParams();
  
  if (filters?.EscolaGUID) {
    params.append('EscolaGUID', filters.EscolaGUID);
  }
  
  if (filters?.MateriaStatus) {
    params.append('MateriaStatus', filters.MateriaStatus);
  }

  if (filters?.MateriaIsTecnica !== undefined) {
    params.append('MateriaIsTecnica', String(filters.MateriaIsTecnica));
  }

  const response = await fetch(`${API_URL}/materia?${params}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar matérias');
  }

  return {
    materias: result.data?.materias || [],
    total: result.data?.total || 0
  };
}

/**
 * Buscar matéria por GUID
 */
export async function buscarMateria(materiaGUID: string): Promise<Materia> {
  const response = await fetch(`${API_URL}/materia/${materiaGUID}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao buscar matéria');
  }

  return result.data.materia;
}

// ==================== UPDATE ====================

/**
 * Atualizar matéria
 */
export async function atualizarMateria(
  materiaGUID: string,
  updates: {
    MateriaNome?: string;
    MateriaStatus?: 'Ativa' | 'Inativa';
    MateriaIsTecnica?: boolean;
    CursoGUID?: string | null;
  }
): Promise<Materia> {
  const response = await fetch(`${API_URL}/materia/${materiaGUID}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ materia: updates })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao atualizar matéria');
  }

  return result.data.materia;
}

// ==================== DELETE ====================

/**
 * Excluir matéria (soft delete)
 */
export async function excluirMateria(materiaGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/materia/${materiaGUID}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao excluir matéria');
  }
}
