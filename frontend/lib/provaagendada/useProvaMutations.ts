'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { criarProva, atualizarProva, excluirProva, removerProvaDeTurma, registrarVisualizacaoProva } from '@/lib/api/provaagendada.api';
import { provaKeys } from './queryKeys';

export function useCriarProva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarProva,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: provaKeys.all });
    },
  });
}

export function useAtualizarProva(provaAgendadaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: Parameters<typeof atualizarProva>[1]) => atualizarProva(provaAgendadaGUID, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: provaKeys.detalhe(provaAgendadaGUID) });
      queryClient.invalidateQueries({ queryKey: provaKeys.all });
    },
  });
}

export function useExcluirProva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provaAgendadaGUID: string) => excluirProva(provaAgendadaGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: provaKeys.all });
    },
  });
}

export function useRemoverProvaDeTurma() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ provaAgendadaGUID, turmaGUID }: { provaAgendadaGUID: string; turmaGUID: string }) =>
      removerProvaDeTurma(provaAgendadaGUID, turmaGUID),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: provaKeys.detalhe(variables.provaAgendadaGUID) });
      queryClient.invalidateQueries({ queryKey: provaKeys.all });
    },
  });
}

/** Visualização (aluno) — não altera o registro de ProvaAgendada em si, sem invalidação de provaKeys. */
export function useRegistrarVisualizacaoProva() {
  return useMutation({
    mutationFn: (provaAgendadaTurmaGUID: string) => registrarVisualizacaoProva(provaAgendadaTurmaGUID),
  });
}
