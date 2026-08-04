/**
 * API Client para o Banco de Questões universal (spec item 11-13).
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

export type QuestaoBancoDificuldade = 'Facil' | 'Media' | 'Dificil';

export interface AlternativaQuestaoBanco {
  AlternativaGUID: string;
  AlternativaTexto: string;
  AlternativaCorreta: boolean;
  AlternativaOrdem: number;
}

export interface QuestaoBanco {
  QuestaoBancoGUID: string;
  MateriaGlobalGUID: string;
  SubMateriaGlobalGUID: string;
  VestibularGUID: string;
  Dificuldade: QuestaoBancoDificuldade;
  Enunciado: string;
  VideoResolucaoUrl: string | null;
  Alternativas: AlternativaQuestaoBanco[];
  CreatedAt: string | null;
}

export interface Vestibular {
  VestibularGUID: string;
  Nome: string;
}

export interface QuestaoBancoCreateDados {
  MateriaGlobalGUID: string;
  SubMateriaGlobalGUID: string;
  VestibularGUID: string;
  Dificuldade: QuestaoBancoDificuldade;
  Enunciado: string;
  VideoResolucaoUrl?: string;
  Alternativas: { Texto: string; Correta: boolean }[];
}

export async function listarQuestoes(filtros?: {
  SubMateriaGlobalGUID?: string;
  Dificuldade?: QuestaoBancoDificuldade;
  VestibularGUID?: string;
}): Promise<QuestaoBanco[]> {
  const params = new URLSearchParams();
  if (filtros?.SubMateriaGlobalGUID) params.append('SubMateriaGlobalGUID', filtros.SubMateriaGlobalGUID);
  if (filtros?.Dificuldade) params.append('Dificuldade', filtros.Dificuldade);
  if (filtros?.VestibularGUID) params.append('VestibularGUID', filtros.VestibularGUID);

  const response = await fetch(`${API_URL}/questaobanco?${params}`, { headers: getHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao listar questões');
  return result.data?.questoes || [];
}

export async function criarQuestao(dados: QuestaoBancoCreateDados): Promise<QuestaoBanco> {
  const response = await fetch(`${API_URL}/questaobanco`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dados),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao criar questão');
  return result.data.questao;
}

export async function excluirQuestao(guid: string): Promise<void> {
  const response = await fetch(`${API_URL}/questaobanco/${guid}`, { method: 'DELETE', headers: getHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao excluir questão');
}

export async function listarVestibulares(): Promise<Vestibular[]> {
  const response = await fetch(`${API_URL}/questaobanco/vestibular`, { headers: getHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao listar vestibulares');
  return result.data?.vestibulares || [];
}

export async function criarVestibular(nome: string): Promise<Vestibular> {
  const response = await fetch(`${API_URL}/questaobanco/vestibular`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ Nome: nome }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao criar vestibular');
  return result.data.vestibular;
}
