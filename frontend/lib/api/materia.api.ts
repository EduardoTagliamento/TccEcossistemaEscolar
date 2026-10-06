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

export interface Materia {
  MateriaGUID: string;
  EscolaGUID: string;
  CursoGUID: string | null;
  MateriaGlobalGUID: string | null;
  MateriaNome: string;
  MateriaIsTecnica: boolean;
  MateriaAulasPorSemanaPadrao: number | null;
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
  MateriaAulasPorSemanaPadrao?: number | null;
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
    MateriaAulasPorSemanaPadrao?: number | null;
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

// ==================== MAPEAMENTO GLOBAL (taxonomia cross-escola) ====================

export interface CandidatoMateriaGlobal {
  MateriaGlobalGUID: string;
  Nome: string;
  Score: number;
}

export interface MapeamentoGlobalStatus {
  MateriaGlobalGUID: string | null;
  StatusMapeamento: 'Confirmado' | 'Pendente' | 'Ambiguo';
  NomeMateriaGlobal?: string;
  Candidatos?: CandidatoMateriaGlobal[];
}

/**
 * Resolvido automaticamente no create/update da matéria (similaridade de
 * string + desempate leve por IA) — este GET só existe pra descobrir se
 * ficou ambíguo (precisa de escolha manual) ou já foi resolvido sozinho.
 */
export async function buscarMapeamentoGlobal(materiaGUID: string): Promise<MapeamentoGlobalStatus> {
  const response = await fetch(`${API_URL}/materia/${materiaGUID}/mapeamento-global`, {
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao buscar mapeamento de matéria global');
  }
  return result.data.mapeamento;
}

/** `materiaGlobalGUID=null` cria uma MateriaGlobal nova com o nome desta matéria. */
export async function confirmarMapeamentoGlobal(
  materiaGUID: string,
  materiaGlobalGUID: string | null
): Promise<string> {
  const response = await fetch(`${API_URL}/materia/${materiaGUID}/mapeamento-global`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ MateriaGlobalGUID: materiaGlobalGUID }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao confirmar mapeamento de matéria global');
  }
  return result.data.MateriaGlobalGUID;
}

// ==================== VÍNCULOS N:N (matéria de escola pode cobrir mais de 1 matéria global) ====================

export interface MateriaGlobalVinculada {
  MateriaGlobalGUID: string;
  Nome: string;
  Status: 'Confirmado' | 'Pendente';
}

/** Lista COMPLETA (vínculo primário + adicionais) — superset do que `buscarMapeamentoGlobal`
 * devolve sozinho. Use esta quando a matéria pode cobrir mais de 1 matéria global ao mesmo tempo
 * (ex. "Filosofia/Sociologia" como 1 aula só). */
export async function listarMateriasGlobaisVinculadas(materiaGUID: string): Promise<MateriaGlobalVinculada[]> {
  const response = await fetch(`${API_URL}/materia/${materiaGUID}/materias-globais`, {
    headers: getHeaders(),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar matérias globais vinculadas');
  }
  return result.data.materiasGlobais;
}

/** Adiciona um vínculo ADICIONAL (não mexe no primário resolvido automaticamente). */
export async function adicionarMateriaGlobalVinculada(
  materiaGUID: string,
  materiaGlobalGUID: string
): Promise<MateriaGlobalVinculada[]> {
  const response = await fetch(`${API_URL}/materia/${materiaGUID}/materias-globais`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ MateriaGlobalGUID: materiaGlobalGUID }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao adicionar vínculo de matéria global');
  }
  return result.data.materiasGlobais;
}

export async function removerMateriaGlobalVinculada(
  materiaGUID: string,
  materiaGlobalGUID: string
): Promise<MateriaGlobalVinculada[]> {
  const response = await fetch(`${API_URL}/materia/${materiaGUID}/materias-globais/${materiaGlobalGUID}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao remover vínculo de matéria global');
  }
  return result.data.materiasGlobais;
}
