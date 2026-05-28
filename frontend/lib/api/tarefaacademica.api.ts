import { TarefaAcademica, TarefaFormData, TarefaCreateResponse, TarefaListItem } from '@/types/tarefaacademica';

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

// CREATE - Criar tarefa (individual ou compartilhada)
export async function criarTarefa(data: TarefaFormData): Promise<TarefaCreateResponse> {
  const response = await fetch(`${API_URL}/tarefa`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao criar tarefa');
  }

  return result;
}

// READ - Buscar tarefa por GUID
export async function buscarTarefa(tarefaGUID: string): Promise<TarefaAcademica> {
  const response = await fetch(`${API_URL}/tarefa/${tarefaGUID}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao buscar tarefa');
  }

  return result.data;
}

// READ - Listar tarefas
export async function listarTarefas(filters?: {
  matXprofXturxescGUID?: string;
  DataInicio?: string;
  DataFim?: string;
  TarefaCompartilhada?: boolean;
}): Promise<TarefaListItem[]> {
  const params = new URLSearchParams();
  
  if (filters?.matXprofXturxescGUID) {
    params.append('matXprofXturxescGUID', filters.matXprofXturxescGUID);
  }
  
  if (filters?.DataInicio) {
    params.append('DataInicio', filters.DataInicio);
  }
  
  if (filters?.DataFim) {
    params.append('DataFim', filters.DataFim);
  }
  
  if (filters?.TarefaCompartilhada !== undefined) {
    params.append('TarefaCompartilhada', String(filters.TarefaCompartilhada));
  }

  const response = await fetch(`${API_URL}/tarefa?${params}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao listar tarefas');
  }

  return result.data?.tarefas || [];
}

// UPDATE - Atualizar tarefa
export async function atualizarTarefa(
  tarefaGUID: string,
  updates: Partial<Pick<TarefaAcademica, 
    'TarefaTitulo' | 'TarefaConteudo' | 'TarefaPrazoData' | 'TarefaTipoEntrega' |
    'TarefaMinPessoas' | 'TarefaMaxPessoas'
  >>
): Promise<TarefaAcademica> {
  const response = await fetch(`${API_URL}/tarefa/${tarefaGUID}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao atualizar tarefa');
  }

  return result.data;
}

// DELETE - Deletar tarefa
export async function deletarTarefa(tarefaGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/tarefa/${tarefaGUID}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao deletar tarefa');
  }
}
