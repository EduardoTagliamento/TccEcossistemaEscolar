/**
 * Sessão do usuário — espelha `frontend/lib/auth/AuthContext.tsx`, trocando
 * `localStorage` por `expo-secure-store` (token fica também em cache síncrono
 * em `src/api/tokenStore.ts`, lido por todo `*.api.ts`).
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as authApi from '../api/auth.api';
import { setToken as setTokenCache } from '../api/tokenStore';
import type { Usuario } from '../api/usuario.api';

const TOKEN_KEY = 'baua_token';

interface AuthContextData {
  usuario: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, senha: string, lembrar?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUsuario: (usuario: Usuario) => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega o token persistido no boot do app.
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (storedToken) {
          setTokenCache(storedToken);
          setToken(storedToken);
          await fetchUser();
          return;
        }
      } catch (error) {
        console.warn('Erro ao ler token persistido:', error);
      }
      setIsLoading(false);
    })();
  }, []);

  const fetchUser = async () => {
    try {
      const dadosUsuario = await authApi.buscarUsuarioAutenticado();
      setUsuario(dadosUsuario);
    } catch (error) {
      console.warn('Sessão inválida, limpando token:', error);
      await clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  const clearSession = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setTokenCache(null);
    setToken(null);
    setUsuario(null);
  };

  const login = async (identifier: string, senha: string, lembrar?: boolean) => {
    setIsLoading(true);
    try {
      const { token: novoToken, usuario: dadosUsuario } = await authApi.login(identifier, senha, lembrar);
      await SecureStore.setItemAsync(TOKEN_KEY, novoToken);
      setTokenCache(novoToken);
      setToken(novoToken);
      setUsuario(dadosUsuario);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authApi.logout();
    await clearSession();
  };

  const refreshUser = async () => {
    if (token) await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        isAuthenticated: !!token && !!usuario,
        isLoading,
        login,
        logout,
        refreshUser,
        setUsuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
