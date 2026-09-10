/**
 * Conexão WebSocket única e compartilhada (Socket.io) — espelha
 * `frontend/lib/socket/SocketContext.tsx`. Autenticação via
 * `socket.handshake.auth.token` (mesmo JWT do AuthContext); o backend já
 * coloca o usuário na room pessoal `usuario:{GUID}` automaticamente ao
 * conectar (`backend/websocket/SocketServer.ts`).
 *
 * Eventos usados pelo Chat (`backend/websocket/conversa.handler.ts`):
 * emitidos pelo cliente — `join_conversa`, `send_mensagem`, `mark_as_read`,
 * `typing`; recebidos do servidor — `nova_mensagem`, `mensagem_nao_lida`,
 * `mensagem_lida`, `usuario_digitando`, `erro`.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../api/client';
import { useAuth } from './AuthContext';

interface SocketContextData {
  socket: Socket | null;
  conectado: boolean;
}

const SocketContext = createContext<SocketContextData>({ socket: null, conectado: false });

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

    const novoSocket = io(SOCKET_URL, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket'],
    });

    novoSocket.on('connect', () => setConectado(true));
    novoSocket.on('disconnect', () => setConectado(false));
    novoSocket.on('connect_error', (erro: Error) => {
      console.warn('Erro de conexão WebSocket:', erro.message);
      setConectado(false);
    });

    setSocket(novoSocket);

    return () => {
      novoSocket.disconnect();
      setSocket(null);
      setConectado(false);
    };
  }, [token, isAuthenticated]);

  return <SocketContext.Provider value={{ socket, conectado }}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextData {
  return useContext(SocketContext);
}
