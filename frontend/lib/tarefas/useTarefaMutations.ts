'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  criarTarefa,
  atualizarTarefa,
  deletarTarefa,
  marcarComoFeito,
  enviarAnexoEntrega,
  criarQuestao,
  criarQuestoesBatch,
  atualizarQuestao,
  excluirQuestao,
  reordenarQuestoes,
  vincularAnexoQuestao,
  desvincularAnexoQuestao,
  importarQuestoesPlanilha,
  avaliarQuestaoDiscursiva,
} from '@/lib/api/tarefaacademica.api';
import { avaliarTarefa, responderObjetiva, responderDiscursiva } from '@/lib/api/materiasmodulo.api';
import { tarefaKeys } from './queryKeys';

export function useCriarTarefa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarTarefa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.all });
    },
  });
}

export function useAtualizarTarefa(tarefaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Parameters<typeof atualizarTarefa>[1]) => atualizarTarefa(tarefaGUID, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.detalhe(tarefaGUID) });
      queryClient.invalidateQueries({ queryKey: tarefaKeys.all });
    },
  });
}

export function useExcluirTarefa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tarefaGUID: string) => deletarTarefa(tarefaGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.all });
    },
  });
}

export function useMarcarComoFeito(tarefaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matriculaGUID, tarefaFeito }: { matriculaGUID: string; tarefaFeito: boolean }) =>
      marcarComoFeito(tarefaGUID, matriculaGUID, tarefaFeito),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.detalhe(tarefaGUID) });
    },
  });
}

export function useEnviarAnexoEntrega(tarefaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (anexoGUID: string) => enviarAnexoEntrega(tarefaGUID, anexoGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.detalhe(tarefaGUID) });
    },
  });
}

export function useCriarQuestao(tarefaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questao: Parameters<typeof criarQuestao>[1]) => criarQuestao(tarefaGUID, questao),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.questoes(tarefaGUID) });
    },
  });
}

export function useCriarQuestoesBatch(tarefaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questoes: Parameters<typeof criarQuestoesBatch>[1]) => criarQuestoesBatch(tarefaGUID, questoes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.questoes(tarefaGUID) });
    },
  });
}

export function useAtualizarQuestao(tarefaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questaoGUID, questao }: { questaoGUID: string; questao: Parameters<typeof atualizarQuestao>[1] }) =>
      atualizarQuestao(questaoGUID, questao),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.questoes(tarefaGUID) });
    },
  });
}

export function useExcluirQuestao(tarefaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questaoGUID: string) => excluirQuestao(questaoGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.questoes(tarefaGUID) });
    },
  });
}

export function useReordenarQuestoes(tarefaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ordens: Parameters<typeof reordenarQuestoes>[1]) => reordenarQuestoes(tarefaGUID, ordens),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.questoes(tarefaGUID) });
    },
  });
}

export function useVincularAnexoQuestao(tarefaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questaoGUID, anexoGUID }: { questaoGUID: string; anexoGUID: string }) => vincularAnexoQuestao(questaoGUID, anexoGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.questoes(tarefaGUID) });
    },
  });
}

export function useDesvincularAnexoQuestao(tarefaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questaoGUID, anexoGUID }: { questaoGUID: string; anexoGUID: string }) => desvincularAnexoQuestao(questaoGUID, anexoGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.questoes(tarefaGUID) });
    },
  });
}

export function useImportarQuestoesPlanilha(tarefaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linhas: Parameters<typeof importarQuestoesPlanilha>[1]) => importarQuestoesPlanilha(tarefaGUID, linhas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.questoes(tarefaGUID) });
    },
  });
}

export function useResponderObjetiva(tarefaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questaoGUID, alternativaGUID }: { questaoGUID: string; alternativaGUID: string }) =>
      responderObjetiva(tarefaGUID, questaoGUID, alternativaGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.questoesComRespostas(tarefaGUID) });
    },
  });
}

export function useResponderDiscursiva(tarefaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questaoGUID, texto }: { questaoGUID: string; texto: string }) => responderDiscursiva(tarefaGUID, questaoGUID, texto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.questoesComRespostas(tarefaGUID) });
    },
  });
}

export function useAvaliarQuestaoDiscursiva(tarefaGUID: string, tarefaMatriculaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ respostaGUID, pontos }: { respostaGUID: string; pontos: number }) => avaliarQuestaoDiscursiva(respostaGUID, pontos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.respostasAluno(tarefaGUID, tarefaMatriculaGUID) });
    },
  });
}

export function useAvaliarTarefa(tarefaGUID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tarefaMatriculaGUID, nota }: { tarefaMatriculaGUID: string; nota: number }) => avaliarTarefa(tarefaMatriculaGUID, nota),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tarefaKeys.detalhe(tarefaGUID) });
    },
  });
}
