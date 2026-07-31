'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  criarPendencia,
  atualizarPendencia,
  excluirPendencia,
  marcarComoFeito,
  vincularAnexoPendencia,
  PendenciaCreateDTO,
  PendenciaUpdateDTO,
} from '@/lib/api/pendencia.api';
import { pendenciaKeys } from './queryKeys';

export function useCriarPendencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PendenciaCreateDTO) => criarPendencia(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pendenciaKeys.all });
    },
  });
}

export function useAtualizarPendencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pendenciaGUID, data }: { pendenciaGUID: string; data: PendenciaUpdateDTO }) =>
      atualizarPendencia(pendenciaGUID, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pendenciaKeys.all });
    },
  });
}

export function useExcluirPendencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pendenciaGUID: string) => excluirPendencia(pendenciaGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pendenciaKeys.all });
    },
  });
}

export function useMarcarComoFeito() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pendenciaGUID: string) => marcarComoFeito(pendenciaGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pendenciaKeys.all });
    },
  });
}

export function useVincularAnexoPendencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pendenciaGUID, anexoGUID }: { pendenciaGUID: string; anexoGUID: string }) =>
      vincularAnexoPendencia(pendenciaGUID, anexoGUID),
    onSuccess: (_data, { pendenciaGUID }) => {
      queryClient.invalidateQueries({ queryKey: pendenciaKeys.anexos(pendenciaGUID) });
    },
  });
}
