'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { criarAviso, excluirAviso, CriarAvisoInput } from '@/lib/api/aviso.api';
import { avisoKeys } from './queryKeys';

export function useCriarAviso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CriarAvisoInput) => criarAviso(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: avisoKeys.all });
    },
  });
}

export function useExcluirAviso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guid: string) => excluirAviso(guid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: avisoKeys.all });
    },
  });
}
