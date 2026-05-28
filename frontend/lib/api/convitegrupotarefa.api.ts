import { ConviteGrupoTarefa, ConvitePendente, EnviarConviteData } from '@/types/convitegrupotarefa';

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

// POST - Enviar convite (líder convida aluno)
export async function enviarConvite(
  grupoGUID: string,
  cpfConvidado: string
): Promise<ConviteGrupoTarefa> {
  const response = await fetch(`${API_URL}/convitegrupotarefa/${grupoGUID}/convites`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ UsuarioCPFConvidado: cpfConvidado })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao enviar convite');
  }

  return result.data;
}

// POST - Solicitar entrada em grupo (aluno pede para entrar)
export async function solicitarEntrada(grupoGUID: string): Promise<ConviteGrupoTarefa> {
  const response = await fetch(`${API_URL}/convitegrupotarefa/${grupoGUID}/solicitacoes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({})
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao solicitar entrada');
  }

  return result.data;
}

// GET - Listar convites/solicitações pendentes do usuário
export async function listarConvitesPendentes(): Promise<ConvitePendente[]> {
  const response = await fetch(`${API_URL}/convitegrupotarefa/pendentes`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao listar convites pendentes');
  }

  return result.data;
}

// PATCH - Aceitar convite ou solicitação
export async function aceitarConvite(conviteGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/convitegrupotarefa/${conviteGUID}/aceitar`, {
    method: 'PATCH',
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao aceitar convite');
  }
}

// PATCH - Recusar convite ou solicitação
export async function recusarConvite(conviteGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/convitegrupotarefa/${conviteGUID}/recusar`, {
    method: 'PATCH',
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao recusar convite');
  }
}
