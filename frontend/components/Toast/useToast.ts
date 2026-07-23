'use client';

import { useState, useCallback } from 'react';
import { ToastType } from './Toast';

export interface ToastData {
  id: string;
  type: ToastType;
  titulo?: string;
  mensagem: string;
  duracao?: number;
  aoClicar?: () => void;
}

export interface ToastOpcoes {
  titulo?: string;
  duracao?: number;
  /** Se informado, o toast fica clicável (cursor + click navega/executa a ação). */
  aoClicar?: () => void;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback(
    (type: ToastType, mensagem: string, opcoes?: ToastOpcoes) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastData = {
        id,
        type,
        titulo: opcoes?.titulo,
        mensagem,
        duracao: opcoes?.duracao ?? 5000,
        aoClicar: opcoes?.aoClicar,
      };

      setToasts((prev) => [...prev, newToast]);
      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback(
    (mensagem: string, opcoes?: ToastOpcoes) => addToast('success', mensagem, opcoes),
    [addToast]
  );

  const error = useCallback(
    (mensagem: string, opcoes?: ToastOpcoes) => addToast('error', mensagem, opcoes),
    [addToast]
  );

  const warning = useCallback(
    (mensagem: string, opcoes?: ToastOpcoes) => addToast('warning', mensagem, opcoes),
    [addToast]
  );

  const info = useCallback(
    (mensagem: string, opcoes?: ToastOpcoes) => addToast('info', mensagem, opcoes),
    [addToast]
  );

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}
