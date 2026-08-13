'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { atualizarNomeGrupo, expulsarMembro, transferirLideranca } from '@/lib/api/grupotarefa.api';
import { grupoTarefaKeys } from './queryKeys';

export function useAtualizarNomeGrupo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ grupoGUID, novoNome }: { grupoGUID: string; novoNome: string }) => atualizarNomeGrupo(grupoGUID, novoNome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grupoTarefaKeys.all });
    },
  });
}

export function useExpulsarMembro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ grupoGUID, membroGUID }: { grupoGUID: string; membroGUID: string }) => expulsarMembro(grupoGUID, membroGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grupoTarefaKeys.all });
    },
  });
}

export function useTransferirLideranca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ grupoGUID, novoLiderGUID }: { grupoGUID: string; novoLiderGUID: string }) => transferirLideranca(grupoGUID, novoLiderGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grupoTarefaKeys.all });
    },
  });
}
