/**
 * API Client para Turmas
 * Endpoints para gerenciamento de turmas
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

export interface Turma {
  TurmaGUID: string;
  EscolaGUID: string;
  TurmaSerie: string;
  TurmaNome: string;
  TurmaIsTecnico: boolean;
  CursoGUID: string | null;
  TurmaStatus: 'Ativa' | 'Inativa' | 'Encerrada';
  TurmaImagemUrl?: string | null;
  TurmaCorFundo?: string | null;
  TurmaCreatedAt: Date | string;
  TurmaUpdatedAt: Date | string;
}

export interface TurmaCreateDTO {
  EscolaGUID: string;
  TurmaSerie: string;
  TurmaNome: string;
  TurmaIsTecnico: boolean;
  CursoGUID?: string | null;
  CursoNome?: string; // Para resolução nome → GUID
  TurmaStatus?: 'Ativa' | 'Inativa' | 'Encerrada';
}

export interface BatchItemResult {
  item: TurmaCreateDTO;
  sucesso: boolean;
  mensagem: string;
  dados?: Turma;
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
 * Criar turma individual
 */
export async function criarTurma(data: TurmaCreateDTO): Promise<Turma> {
  const response = await fetch(`${API_URL}/turma`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ turma: data })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar turma');
  }

  return result.data.turma;
}

/**
 * Criar múltiplas turmas em massa
 */
export async function criarTurmasEmMassa(turmas: TurmaCreateDTO[]): Promise<BatchCreateResponse> {
  const response = await fetch(`${API_URL}/turma`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ turmas })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar turmas em massa');
  }

  return result.data;
}

// ==================== READ ====================

/**
 * Listar turmas com filtros opcionais
 */
export async function listarTurmas(filters?: {
  EscolaGUID?: string;
  CursoGUID?: string;
  TurmaIsTecnico?: boolean;
  TurmaStatus?: 'Ativa' | 'Inativa' | 'Encerrada';
}): Promise<{ turmas: Turma[]; total: number }> {
  const params = new URLSearchParams();
  
  if (filters?.EscolaGUID) {
    params.append('EscolaGUID', filters.EscolaGUID);
  }
  
  if (filters?.CursoGUID) {
    params.append('CursoGUID', filters.CursoGUID);
  }

  if (filters?.TurmaIsTecnico !== undefined) {
    params.append('TurmaIsTecnico', String(filters.TurmaIsTecnico));
  }

  if (filters?.TurmaStatus) {
    params.append('TurmaStatus', filters.TurmaStatus);
  }

  const response = await fetch(`${API_URL}/turma?${params}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar turmas');
  }

  return {
    turmas: result.data || [],
    total: result.total || 0
  };
}

/**
 * Buscar turma por GUID
 */
export async function buscarTurma(turmaGUID: string): Promise<Turma> {
  const response = await fetch(`${API_URL}/turma/${turmaGUID}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao buscar turma');
  }

  return result.data;
}

// ==================== UPDATE ====================

/**
 * Atualizar turma
 */
export async function atualizarTurma(
  turmaGUID: string,
  updates: {
    TurmaSerie?: string;
    TurmaNome?: string;
    TurmaIsTecnico?: boolean;
    CursoGUID?: string | null;
    TurmaStatus?: 'Ativa' | 'Inativa' | 'Encerrada';
  }
): Promise<Turma> {
  const response = await fetch(`${API_URL}/turma/${turmaGUID}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ turma: updates })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao atualizar turma');
  }

  return result.data;
}

// ==================== DELETE ====================

/**
 * Excluir turma (soft delete)
 */
export async function excluirTurma(turmaGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/turma/${turmaGUID}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao excluir turma');
  }
}
