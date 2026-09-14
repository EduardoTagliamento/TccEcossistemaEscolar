/**
 * API Client para Escola
 * 
 * Funções para buscar dados de escola
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export interface Escola {
  EscolaGUID: string;
  EscolaNome: string | null;
  EscolaSlug: string | null;
  EscolaCNPJ: string | null;
  EscolaTelefone: string | null;
  EscolaEmail: string | null;
  EscolaEndereco: string | null;
  EscolaCorPriEs: string | null;
  EscolaCorPriCl: string | null;
  EscolaCorSecEs: string | null;
  EscolaCorSecCl: string | null;
  EscolaIcone: string | null; // base64
  EscolaStatus: 'Ativa' | 'Inativa';
  EscolaIsTecnica: boolean;
  EscolaCreatedAt: string | null;
  EscolaUpdatedAt: string | null;
}

export interface AtualizarEscolaDados {
  EscolaNome?: string | null;
  /** Link de login individual (/login/[EscolaSlug]) — só Direção pode editar. */
  EscolaSlug?: string | null;
  EscolaCNPJ?: string | null;
  EscolaTelefone?: string | null;
  EscolaEmail?: string | null;
  EscolaEndereco?: string | null;
  EscolaCorPriEs?: string | null;
  EscolaCorPriCl?: string | null;
  EscolaCorSecEs?: string | null;
  EscolaCorSecCl?: string | null;
  EscolaIcone?: string | null; // base64 sem prefixo data:*, ou null/"" para remover
  EscolaStatus?: 'Ativa' | 'Inativa';
  EscolaIsTecnica?: boolean;
}

export interface EscolaPublico {
  EscolaGUID: string;
  EscolaSlug: string | null;
  EscolaNome: string | null;
  EscolaCorPriEs: string | null;
  EscolaCorPriCl: string | null;
  EscolaCorSecEs: string | null;
  EscolaCorSecCl: string | null;
  EscolaIcone: string | null; // base64
}

/**
 * Buscar branding público da escola pelo slug (SEM autenticação) — usado
 * pela tela /login/[slug] pra pintar a página antes do login. Só retorna
 * nome/cores/ícone (ver EscolaService.buscarPublicoPorSlug no backend).
 */
export async function buscarEscolaPublicaPorSlug(escolaSlug: string): Promise<EscolaPublico> {
  const response = await fetch(`${API_URL}/escola/publico/slug/${encodeURIComponent(escolaSlug)}`, {
    method: 'GET',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Escola não encontrada');
  }

  return data.data;
}

/**
 * Buscar escola por GUID
 */
export async function buscarEscola(escolaGUID: string): Promise<{ escola: Escola }> {
  const response = await fetch(`${API_URL}/escola/${escolaGUID}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao buscar escola');
  }

  const data = await response.json();
  return { escola: data.data || data };
}

/**
 * Atualizar dados institucionais da escola (apenas Direção — FuncaoId=6)
 */
export async function atualizarEscola(
  escolaGUID: string,
  dados: AtualizarEscolaDados
): Promise<{ escola: Escola }> {
  const response = await fetch(`${API_URL}/escola/${escolaGUID}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ escola: dados }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao atualizar escola');
  }

  const data = await response.json();
  return { escola: data.data?.escola ?? data.data };
}

export interface TransferirDirecaoResultado {
  NovoDirecaoCPF: string;
  NovoCoordenacaoCPF: string;
}

/**
 * Elege um Coordenação ativo da escola para assumir a Direção — quem chama
 * (Direção atual) passa a Coordenação, troca simétrica e imediata. Só quem
 * já é Direção ativa da escola pode chamar (backend valida).
 */
export async function transferirDirecao(
  escolaGUID: string,
  novoDirecaoGUID: string
): Promise<TransferirDirecaoResultado> {
  const response = await fetch(`${API_URL}/escola/${escolaGUID}/transferir-direcao`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ NovoDirecaoGUID: novoDirecaoGUID }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao transferir Direção');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Solicita a exclusão da escola — envia um código de 6 dígitos pro email
 * do usuário logado (só Direção). Confirmar com confirmarExclusaoEscola().
 */
export async function solicitarExclusaoEscola(escolaGUID: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/escola/${escolaGUID}/solicitar-exclusao`, {
    method: 'POST',
    headers: getHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Erro ao solicitar exclusão da escola');
  }
  return data;
}

/**
 * Confirma a exclusão com o código recebido por email — desativa a escola
 * imediatamente (exclusão definitiva só depois de 30 dias sem reativação).
 */
export async function confirmarExclusaoEscola(escolaGUID: string, codigo: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/escola/${escolaGUID}/confirmar-exclusao`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ Codigo: codigo }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Erro ao confirmar exclusão da escola');
  }
  return data;
}

/**
 * Listar todas as escolas (filtros opcionais)
 */
export async function listarEscolas(filtros?: {
  EscolaStatus?: string;
}): Promise<{ escolas: Escola[]; total: number }> {
  const params = new URLSearchParams();
  if (filtros?.EscolaStatus) {
    params.append('EscolaStatus', filtros.EscolaStatus);
  }

  const url = `${API_URL}/escola${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao listar escolas');
  }

  const data = await response.json();
  return {
    escolas: data.data || data.escolas || [],
    total: data.total || (data.data?.length || 0)
  };
}
