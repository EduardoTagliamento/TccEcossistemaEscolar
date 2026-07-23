'use client';

/**
 * Toast em tempo real para notificações — sempre montado (ver layout.tsx),
 * escuta `notificacao:nova` (emitido por `NotificacaoService.#emitirTempoReal`
 * na room pessoal `usuario:{CPF}`, já entrada automaticamente ao conectar o
 * socket) e mostra um toast em cima de qualquer tela do dashboard. Clicar no
 * toast marca a notificação como lida e navega para `NotificacaoLink` (mesmo
 * comportamento do dropdown do sino em DashboardNavbar).
 *
 * Mesmo padrão de MinimizedChatBubble: componente próprio com estado local,
 * sem precisar de um Context compartilhado — nada mais no app consome toasts
 * ainda, então `useToast()` local aqui é suficiente.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/socket/SocketContext';
import { useToast, ToastContainer } from '@/components/Toast';
import * as NotificacaoAPI from '@/lib/api/notificacao.api';
import type { Notificacao } from '@/lib/api/notificacao.api';

export default function NotificacaoToastListener() {
  const { socket } = useSocket();
  const { toasts, info, removeToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!socket) return;

    const handleNotificacaoNova = (notificacao: Notificacao) => {
      const temConteudo = !!notificacao.NotificacaoConteudo;
      info(temConteudo ? notificacao.NotificacaoConteudo! : notificacao.NotificacaoTitulo, {
        titulo: temConteudo ? notificacao.NotificacaoTitulo : undefined,
        duracao: 7000,
        aoClicar: notificacao.NotificacaoLink
          ? () => {
              if (!notificacao.NotificacaoLida) {
                void NotificacaoAPI.marcarComoLida(notificacao.NotificacaoGUID).catch(() => {});
              }
              router.push(notificacao.NotificacaoLink!);
            }
          : undefined,
      });
    };

    socket.on('notificacao:nova', handleNotificacaoNova);
    return () => {
      socket.off('notificacao:nova', handleNotificacaoNova);
    };
  }, [socket, info, router]);

  return <ToastContainer toasts={toasts} onRemove={removeToast} />;
}
