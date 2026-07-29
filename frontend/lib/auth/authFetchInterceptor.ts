'use client';

/**
 * Intercepta globalmente as respostas de `fetch` da aplicação para detectar
 * quando o JWT (validade 24h) expirou/ficou inválido. O backend responde 401
 * em qualquer rota protegida quando o token expira (ver
 * backend/middlewares/auth.middleware.ts), então basta observar isso sem
 * precisar decodificar o token no client.
 *
 * Só é instalado uma vez (idempotente) e só reage a respostas das rotas
 * `/api/...` (a API deste projeto, seja via rewrite relativo ou via
 * NEXT_PUBLIC_API_URL absoluto), nunca a outros fetches do Next (RSC, chunks
 * etc). O login (`/api/auth/login`) é ignorado porque um 401 ali é
 * "credenciais inválidas", não sessão expirada.
 */

export const SESSION_EXPIRED_EVENT = 'auth:session-expired';

let installed = false;

function isApiRequest(url: string): boolean {
  return url.includes('/api/');
}

function isIgnoredAuthRoute(url: string): boolean {
  return url.includes('/api/auth/login');
}

export function installAuthFetchInterceptor(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);

    if (response.status === 401) {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

      if (isApiRequest(url) && !isIgnoredAuthRoute(url)) {
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      }
    }

    return response;
  };
}
