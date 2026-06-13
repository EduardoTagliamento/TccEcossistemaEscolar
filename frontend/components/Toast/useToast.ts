'use client';

import { useState, useCallback } from 'react';
import { ToastType } from './Toast';

export interface ToastData {
  id: string;
  type: ToastType;
  titulo?: string;
  mensagem: string;
  duracao?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback(
    (type: ToastType, mensagem: string, titulo?: string, duracao?: number) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastData = {
        id,
        type,
        titulo,
        mensagem,
        duracao: duracao ?? 5000,
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
    (mensagem: string, titulo?: string, duracao?: number) => {
      return addToast('success', mensagem, titulo, duracao);
    },
    [addToast]
  );

  const error = useCallback(
    (mensagem: string, titulo?: string, duracao?: number) => {
      return addToast('error', mensagem, titulo, duracao);
    },
    [addToast]
  );

  const warning = useCallback(
    (mensagem: string, titulo?: string, duracao?: number) => {
      return addToast('warning', mensagem, titulo, duracao);
    },
    [addToast]
  );

  const info = useCallback(
    (mensagem: string, titulo?: string, duracao?: number) => {
      return addToast('info', mensagem, titulo, duracao);
    },
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
