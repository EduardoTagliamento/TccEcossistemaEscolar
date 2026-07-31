'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { enviarConvite, solicitarEntrada, aceitarConvite, recusarConvite } from '@/lib/api/convitegrupotarefa.api';
import { conviteGrupoTarefaKeys } from './queryKeys';
import { grupoTarefaKeys } from '@/lib/grupotarefa/queryKeys';

export function useEnviarConvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ grupoGUID, cpfConvidado }: { grupoGUID: string; cpfConvidado: string }) => enviarConvite(grupoGUID, cpfConvidado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conviteGrupoTarefaKeys.pendentes });
    },
  });
}

export function useSolicitarEntrada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (grupoGUID: string) => solicitarEntrada(grupoGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conviteGrupoTarefaKeys.pendentes });
    },
  });
}

export function useAceitarConvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conviteGUID: string) => aceitarConvite(conviteGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conviteGrupoTarefaKeys.pendentes });
      queryClient.invalidateQueries({ queryKey: grupoTarefaKeys.all });
    },
  });
}

export function useRecusarConvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conviteGUID: string) => recusarConvite(conviteGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conviteGrupoTarefaKeys.pendentes });
    },
  });
}
