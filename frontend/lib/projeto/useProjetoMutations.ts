'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { criarProjeto, atualizarProjeto, encerrarProjeto } from '@/lib/api/projeto.api';
import { projetoKeys } from './queryKeys';

export function useCriarProjeto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarProjeto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projetoKeys.all });
    },
  });
}

export function useAtualizarProjeto(projetoGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: Parameters<typeof atualizarProjeto>[1]) => atualizarProjeto(projetoGUID, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projetoKeys.detalhe(projetoGUID) });
      queryClient.invalidateQueries({ queryKey: projetoKeys.all });
    },
  });
}

export function useEncerrarProjeto(projetoGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => encerrarProjeto(projetoGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projetoKeys.detalhe(projetoGUID) });
      queryClient.invalidateQueries({ queryKey: projetoKeys.all });
    },
  });
}
