'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { alocarSlot, removerSlot, AlocarSlotDTO } from '@/lib/api/horarioturma.api';
import { horarioTurmaKeys } from './queryKeys';

export function useAlocarSlot(turmaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slot: AlocarSlotDTO) => alocarSlot(turmaGUID, slot),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: horarioTurmaKeys.cronograma(turmaGUID) });
    },
  });
}

export function useRemoverSlot(turmaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (horarioTurmaGUID: string) => removerSlot(turmaGUID, horarioTurmaGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: horarioTurmaKeys.cronograma(turmaGUID) });
    },
  });
}
