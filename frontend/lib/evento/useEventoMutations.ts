'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { criarEvento, atualizarEvento, cancelarEvento, vincularAnexoEvento, EventoCreateDTO, EventoUpdateDTO } from '@/lib/api/evento.api';
import { eventoKeys } from './queryKeys';

export function useCriarEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EventoCreateDTO) => criarEvento(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventoKeys.all });
    },
  });
}

export function useAtualizarEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventoGUID, data }: { eventoGUID: string; data: EventoUpdateDTO }) => atualizarEvento(eventoGUID, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventoKeys.all });
    },
  });
}

export function useCancelarEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventoGUID: string) => cancelarEvento(eventoGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventoKeys.all });
    },
  });
}

export function useVincularAnexoEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventoGUID, anexoGUID }: { eventoGUID: string; anexoGUID: string }) => vincularAnexoEvento(eventoGUID, anexoGUID),
    onSuccess: (_data, { eventoGUID }) => {
      queryClient.invalidateQueries({ queryKey: eventoKeys.anexos(eventoGUID) });
    },
  });
}
