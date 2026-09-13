/**
 * API Client para ApiKey (chaves de API de parceiros externos). Ver
 * docs/PLANO_IMPLEMENTACAO_API_KEYS.md. Padrão de fetch/headers/erro
 * seguindo `frontend/lib/api/evento.api.ts`.
 *
 * Restrito no backend à Direção da escola.
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

export const ESCOPOS_APIKEY = [
  'usuario:leitura',
  'turma:leitura',
  'matricula:leitura',
  'tarefa:leitura',
  'prova:leitura',
  'aviso:leitura',
] as const;

export type ApiKeyEscopo = (typeof ESCOPOS_APIKEY)[number];

export interface ApiKey {
  ApiKeyGUID: string;
  EscolaGUID: string;
  ApiKeyNome: string;
  ApiKeyPrefixo: string;
  ApiKeyEscopos: ApiKeyEscopo[];
  ApiKeyStatus: 'Ativa' | 'Revogada';
  ApiKeyCriadoPorGUID: string;
  ApiKeyUltimoUsoEm: string | null;
  ApiKeyCreatedAt: string;
  ApiKeyUpdatedAt: string;
}

export interface ApiKeyCreateDTO {
  EscolaGUID: string;
  ApiKeyNome: string;
  ApiKeyEscopos: ApiKeyEscopo[];
}

export interface ApiKeyCreatedResultado {
  apiKey: ApiKey;
  /** Segredo completo — só existe nesta resposta, nunca mais é recuperável. */
  chave: string;
}

/** POST /api/api-key — restrito à Direção da escola. */
export async function criarApiKey(data: ApiKeyCreateDTO): Promise<ApiKeyCreatedResultado> {
  const response = await fetch(`${API_URL}/api-key`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao criar chave de API');
  }
  return resultado.data as ApiKeyCreatedResultado;
}

/** GET /api/api-key?EscolaGUID= — restrito à Direção da escola. */
export async function listarApiKeys(escolaGUID: string): Promise<{ chaves: ApiKey[]; total: number }> {
  const query = new URLSearchParams({ EscolaGUID: escolaGUID });
  const response = await fetch(`${API_URL}/api-key?${query.toString()}`, {
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao listar chaves de API');
  }
  return resultado.data as { chaves: ApiKey[]; total: number };
}

/** DELETE /api/api-key/:ApiKeyGUID — restrito à Direção da escola. */
export async function revogarApiKey(apiKeyGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/api-key/${apiKeyGUID}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao revogar chave de API');
  }
}
