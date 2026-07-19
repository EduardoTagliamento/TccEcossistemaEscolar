'use client';

/**
 * Conexão WebSocket única e compartilhada (Socket.io), reaproveitável por
 * qualquer módulo em tempo real (hoje: Chat — módulo de Conversa/Mensagem;
 * no futuro também serve para Notificações, que dependem do mesmo
 * `backend/websocket/SocketServer`).
 *
 * Autenticação: `socket.handshake.auth.token` = token JWT do AuthContext
 * (mesmo token salvo em localStorage/`@baua:token`). Ao conectar, o backend
 * já coloca o usuário na room pessoal `usuario:{CPF}` automaticamente —
 * nenhum "join" manual é necessário para isso.
 *
 * Montado uma única vez em `frontend/app/dashboard/[escolaGUID]/layout.tsx`
 * (nível de layout, não por página), para que trocar de tela dentro do
 * dashboard não derrube/reabra a conexão.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth/AuthContext';

interface SocketContextData {
  socket: Socket | null;
  conectado: boolean;
}

const SocketContext = createContext<SocketContextData>({ socket: null, conectado: false });

/** Deriva a origem do servidor Socket.io a partir de NEXT_PUBLIC_API_URL
 * (mesmo host/porta do Express — `backend/Server.ts` inicializa o
 * SocketServer sobre o mesmo `http.Server`), removendo o sufixo `/api`. */
function obterSocketBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return apiUrl.replace(/\/api\/?$/, '');
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setSocket(null);
      setConectado(false);
      return;
    }

    const novoSocket = io(obterSocketBaseUrl(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    novoSocket.on('connect', () => setConectado(true));
    novoSocket.on('disconnect', () => setConectado(false));
    novoSocket.on('connect_error', (erro: Error) => {
      console.error('Erro de conexão WebSocket:', erro.message);
      setConectado(false);
    });

    setSocket(novoSocket);

    return () => {
      novoSocket.disconnect();
      setSocket(null);
      setConectado(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, conectado }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextData {
  return useContext(SocketContext);
}
