'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { enviarConvite, solicitarEntrada, aceitarConvite, recusarConvite } from '@/lib/api/convitegrupoprojeto.api';
import { conviteGrupoProjetoKeys } from './queryKeys';
import { grupoProjetoKeys } from '@/lib/grupoprojeto/queryKeys';

export function useEnviarConvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ grupoGUID, usuarioCPFConvidado }: { grupoGUID: string; usuarioCPFConvidado: string }) => enviarConvite(grupoGUID, usuarioCPFConvidado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conviteGrupoProjetoKeys.pendentes });
    },
  });
}

export function useSolicitarEntrada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (grupoGUID: string) => solicitarEntrada(grupoGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conviteGrupoProjetoKeys.pendentes });
    },
  });
}

export function useAceitarConvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conviteGUID: string) => aceitarConvite(conviteGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conviteGrupoProjetoKeys.pendentes });
      queryClient.invalidateQueries({ queryKey: grupoProjetoKeys.all });
    },
  });
}

export function useRecusarConvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conviteGUID: string) => recusarConvite(conviteGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conviteGrupoProjetoKeys.pendentes });
    },
  });
}
