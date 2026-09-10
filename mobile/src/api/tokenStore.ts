/**
 * Cache em memória do token JWT — os `*.api.ts` leem daqui de forma síncrona
 * (mesmo padrão do `localStorage.getItem('@baua:token')` usado no frontend
 * web), já que `expo-secure-store` é assíncrono e não dá pra consultar em
 * toda chamada de API sem tornar cada função async por acidente. Quem
 * mantém isso sincronizado com o SecureStore é o `AuthContext`
 * (`src/context/AuthContext.tsx`) — lê o valor persistido uma vez no boot e
 * chama `setToken()` a cada login/logout.
 */
let currentToken: string | null = null;

export function setToken(token: string | null): void {
  currentToken = token;
}

export function getToken(): string {
  return currentToken ?? '';
}
