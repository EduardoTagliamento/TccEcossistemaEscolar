/**
 * Login/sessão — espelha o fluxo inline em
 * `frontend/lib/auth/AuthContext.tsx` (não existe um `auth.api.ts` dedicado
 * no web; aqui isolamos para reuso fora do `AuthContext`).
 */
import { API_URL, getHeaders, tratarResposta } from './client';
import type { Usuario } from './usuario.api';

export interface LoginResultado {
  token: string;
  usuario: Usuario;
}

export async function login(identifier: string, senha: string, lembrar?: boolean): Promise<LoginResultado> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, senha, lembrar }),
  });
  return tratarResposta<LoginResultado>(response, 'Erro ao fazer login');
}

export async function buscarUsuarioAutenticado(): Promise<Usuario> {
  const response = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
  const resultado = await tratarResposta<{ usuario: Usuario }>(response, 'Sessão inválida');
  return resultado.usuario;
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: getHeaders(),
  });
  // Logout é "best effort" no servidor (não há sessão stateful a invalidar
  // além do próprio token) — mesmo padrão do web: nunca bloqueia o logout
  // local por falha de rede.
  try {
    await tratarResposta(response, 'Erro ao encerrar sessão');
  } catch {
    // ignorado de propósito
  }
}
