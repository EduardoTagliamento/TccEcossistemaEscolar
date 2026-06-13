'use client';

import { useEffect, useState } from 'react';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  titulo?: string;
  mensagem: string;
  duracao?: number;
  onClose: (id: string) => void;
}

const icones: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const titulosPadrao: Record<ToastType, string> = {
  success: 'Sucesso',
  error: 'Erro',
  warning: 'Atenção',
  info: 'Informação',
};

export function Toast({ id, type, titulo, mensagem, duracao = 5000, onClose }: ToastProps) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (duracao > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duracao);

      return () => clearTimeout(timer);
    }
  }, [duracao, id]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Duração da animação de saída
  };

  return (
    <div className={`${styles.toast} ${styles[type]} ${isClosing ? styles.closing : ''}`}>
      <div className={styles.icone}>{icones[type]}</div>
      <div className={styles.conteudo}>
        <div className={styles.titulo}>{titulo || titulosPadrao[type]}</div>
        <div className={styles.mensagem}>{mensagem}</div>
      </div>
      <button className={styles.botaoFechar} onClick={handleClose} aria-label="Fechar">
        ×
      </button>
      {duracao > 0 && (
        <div
          className={styles.progresso}
          style={{ animationDuration: `${duracao}ms` }}
        />
      )}
    </div>
  );
}

export interface ToastContainerProps {
  toasts: Array<{
    id: string;
    type: ToastType;
    titulo?: string;
    mensagem: string;
    duracao?: number;
  }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onRemove} />
      ))}
    </div>
  );
}
