'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  criarGrupo,
  atualizarGrupo,
  atualizarPontuacao,
  entrarGrupo,
  sairGrupo,
  adicionarMembro,
  expulsarMembro,
  transferirLideranca,
} from '@/lib/api/grupoprojeto.api';
import { grupoProjetoKeys } from './queryKeys';

export function useCriarGrupo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarGrupo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grupoProjetoKeys.all });
    },
  });
}

export function useAtualizarGrupo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ grupoGUID, dados }: { grupoGUID: string; dados: Parameters<typeof atualizarGrupo>[1] }) => atualizarGrupo(grupoGUID, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grupoProjetoKeys.all });
    },
  });
}

export function useAtualizarPontuacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ grupoGUID, pontuacao }: { grupoGUID: string; pontuacao: number }) => atualizarPontuacao(grupoGUID, pontuacao),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grupoProjetoKeys.all });
    },
  });
}

export function useEntrarGrupo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (grupoGUID: string) => entrarGrupo(grupoGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grupoProjetoKeys.all });
    },
  });
}

export function useSairGrupo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (grupoGUID: string) => sairGrupo(grupoGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grupoProjetoKeys.all });
    },
  });
}

export function useAdicionarMembro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ grupoGUID, usuarioCPF }: { grupoGUID: string; usuarioCPF: string }) => adicionarMembro(grupoGUID, usuarioCPF),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grupoProjetoKeys.all });
    },
  });
}

export function useExpulsarMembro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ grupoGUID, cpf }: { grupoGUID: string; cpf: string }) => expulsarMembro(grupoGUID, cpf),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grupoProjetoKeys.all });
    },
  });
}

export function useTransferirLideranca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ grupoGUID, novoLiderCPF }: { grupoGUID: string; novoLiderCPF: string }) => transferirLideranca(grupoGUID, novoLiderCPF),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: grupoProjetoKeys.all });
    },
  });
}
