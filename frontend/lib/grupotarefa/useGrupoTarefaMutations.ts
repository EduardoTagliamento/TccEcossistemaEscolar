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
    mutationFn: ({ grupoGUID, membroCPF }: { grupoGUID: string; membroCPF: string }) => expulsarMembro(grupoGUID, membroCPF),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grupoTarefaKeys.all });
    },
  });
}

export function useTransferirLideranca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ grupoGUID, novoCPFLider }: { grupoGUID: string; novoCPFLider: string }) => transferirLideranca(grupoGUID, novoCPFLider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grupoTarefaKeys.all });
    },
  });
}
