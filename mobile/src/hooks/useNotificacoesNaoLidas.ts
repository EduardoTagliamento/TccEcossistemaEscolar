/**
 * Contador de notificações não lidas para o badge do sino no header.
 * Sem push notification nativo nesta leva (ver
 * `docs/ANALISE_VIABILIDADE_APP_MOBILE.md`) — atualiza por polling leve
 * enquanto o app está em primeiro plano.
 */
import { useEffect, useState, useCallback } from 'react';
import { contarNaoLidas } from '../api/notificacao.api';
import { useEscola } from '../context/EscolaContext';
import { useAuth } from '../context/AuthContext';

const INTERVALO_MS = 30000;

export function useNotificacoesNaoLidas() {
  const { isAuthenticated } = useAuth();
  const { escola } = useEscola();
  const [total, setTotal] = useState(0);

  const recarregar = useCallback(async () => {
    if (!isAuthenticated || !escola) return;
    try {
      setTotal(await contarNaoLidas(escola.EscolaGUID));
    } catch {
      // silencioso — badge não é crítico
    }
  }, [isAuthenticated, escola?.EscolaGUID]);

  useEffect(() => {
    recarregar();
    const id = setInterval(recarregar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [recarregar]);

  return { total, recarregar };
}
