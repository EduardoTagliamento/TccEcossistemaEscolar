'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { criarAnotacao, atualizarAnotacao, toggleAnotacaoFeito, excluirAnotacao } from '@/lib/api/anotacao.api';
import { anotacaoKeys } from './queryKeys';

export function useCriarAnotacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ escolaGUID, data, titulo, descricao }: { escolaGUID: string; data: string; titulo: string; descricao?: string }) =>
      criarAnotacao(escolaGUID, data, titulo, descricao),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: anotacaoKeys.all });
    },
  });
}

export function useAtualizarAnotacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ guid, updates }: { guid: string; updates: Parameters<typeof atualizarAnotacao>[1] }) =>
      atualizarAnotacao(guid, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: anotacaoKeys.all });
    },
  });
}

export function useToggleAnotacaoFeito() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guid: string) => toggleAnotacaoFeito(guid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: anotacaoKeys.all });
    },
  });
}

export function useExcluirAnotacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guid: string) => excluirAnotacao(guid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: anotacaoKeys.all });
    },
  });
}
