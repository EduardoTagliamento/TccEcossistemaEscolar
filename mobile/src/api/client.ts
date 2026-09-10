/**
 * Base compartilhada por todo `*.api.ts` — mesmo padrão de
 * `frontend/lib/api/*.api.ts` (fetch simples + header `Authorization: Bearer`
 * + `{ success, message, data }`), trocando `localStorage` por
 * `tokenStore.ts` (cache em memória sincronizado com `expo-secure-store`).
 */
import { getToken } from './tokenStore';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.baua.com.br/api';
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'https://www.baua.com.br';

export function getHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token && token.trim() !== '') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Extrai `data` de uma resposta `{ success, message, data }`, lançando com a
 * mensagem do backend em caso de erro. Alguns endpoints (unpin/deletar
 * mensagem etc.) respondem 204 sem corpo — tratado como `undefined`.
 */
export async function tratarResposta<T>(response: Response, mensagemErroPadrao: string): Promise<T> {
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  let resultado: any;
  try {
    resultado = await response.json();
  } catch {
    resultado = null;
  }

  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || mensagemErroPadrao);
  }

  return resultado?.data as T;
}

export function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}
