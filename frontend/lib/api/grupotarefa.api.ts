import { GrupoTarefa, GrupoTarefaComMembros, GrupoTarefaUpdateData, TransferirLiderancaData } from '@/types/grupotarefa';

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

// READ - Listar grupos de uma tarefa
export async function listarGruposDaTarefa(tarefaGUID: string): Promise<GrupoTarefa[]> {
  const response = await fetch(`${API_URL}/grupotarefa/${tarefaGUID}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao listar grupos');
  }

  return result.data;
}

// READ - Buscar grupo com membros
export async function buscarGrupoComMembros(grupoGUID: string): Promise<GrupoTarefaComMembros> {
  const response = await fetch(`${API_URL}/grupotarefa/grupo/${grupoGUID}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao buscar grupo');
  }

  return result.data;
}

// UPDATE - Atualizar nome do grupo (só líder)
export async function atualizarNomeGrupo(
  grupoGUID: string,
  novoNome: string
): Promise<GrupoTarefa> {
  const response = await fetch(`${API_URL}/grupotarefa/${grupoGUID}/nome`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ GrupoNome: novoNome })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao atualizar nome do grupo');
  }

  return result.data;
}

// DELETE - Expulsar membro do grupo (só líder)
export async function expulsarMembro(
  grupoGUID: string,
  membroCPF: string
): Promise<void> {
  const response = await fetch(`${API_URL}/grupotarefa/${grupoGUID}/membros/${membroCPF}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao expulsar membro');
  }
}

// PATCH - Transferir liderança (só líder atual)
export async function transferirLideranca(
  grupoGUID: string,
  novoCPFLider: string
): Promise<GrupoTarefa> {
  const response = await fetch(`${API_URL}/grupotarefa/${grupoGUID}/transferir-lider`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ NovoCPFLider: novoCPFLider })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao transferir liderança');
  }

  return result.data;
}
