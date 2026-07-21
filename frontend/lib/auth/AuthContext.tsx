'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  aplicarTema,
  aplicarModoDaltonico,
  aplicarEscalaFonte,
  aplicarReduzirMovimento,
  aplicarAltoContraste,
  type PreferenciaTema,
  type EscalaFonte,
} from '@/lib/theme/tema';

interface Usuario {
  UsuarioCPF: string;
  UsuarioNome: string;
  UsuarioSobrenome: string;
  UsuarioEmail: string;
  UsuarioTelefone: string;
  UsuarioFotoUrl?: string | null;
  UsuarioTema?: PreferenciaTema;
  UsuarioModoDaltonico?: boolean;
  UsuarioEscalaFonte?: EscalaFonte;
  UsuarioReduzirMovimento?: boolean;
  UsuarioAltoContraste?: boolean;
  UsuarioStatus: 'Ativo' | 'Inativo' | 'Pendente';
}

interface AuthContextData {
  usuario: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, senha: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Aplica as 5 preferências de acessibilidade assim que o usuário
  // autenticado carrega (ou reaplica o fallback padrão quando desloga). Ver
  // frontend/lib/theme/tema.ts — preferências são salvas por conta, sem
  // localStorage.
  useEffect(() => {
    aplicarTema(usuario?.UsuarioTema ?? 'system');
    aplicarModoDaltonico(usuario?.UsuarioModoDaltonico ?? false);
    aplicarEscalaFonte(usuario?.UsuarioEscalaFonte ?? 'medium');
    aplicarReduzirMovimento(usuario?.UsuarioReduzirMovimento ?? false);
    aplicarAltoContraste(usuario?.UsuarioAltoContraste ?? false);
  }, [
    usuario?.UsuarioTema,
    usuario?.UsuarioModoDaltonico,
    usuario?.UsuarioEscalaFonte,
    usuario?.UsuarioReduzirMovimento,
    usuario?.UsuarioAltoContraste,
  ]);

  // Carregar token do localStorage na montagem
  useEffect(() => {
    const storedToken = localStorage.getItem('@baua:token');
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Buscar dados do usuário
  const fetchUser = async (authToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsuario(data.data.usuario);
      } else {
        // Token inválido, limpar
        localStorage.removeItem('@baua:token');
        setToken(null);
        setUsuario(null);
      }
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      localStorage.removeItem('@baua:token');
      setToken(null);
      setUsuario(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login
  const login = async (identifier: string, senha: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao fazer login');
      }

      const { token: newToken, usuario: userData } = data.data;

      // Salvar token e usuário
      localStorage.setItem('@baua:token', newToken);
      setToken(newToken);
      setUsuario(userData);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = () => {
    // Chamar endpoint de logout (opcional)
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).catch(console.error);
    }

    // Limpar estado
    localStorage.removeItem('@baua:token');
    setToken(null);
    setUsuario(null);
  };

  // Refresh user
  const refreshUser = async () => {
    if (token) {
      await fetchUser(token);
    }
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
