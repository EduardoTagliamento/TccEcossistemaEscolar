'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  criarProfessor,
  atualizarProfessor,
  criarProfessoresEmMassa,
  inativarProfessor,
  reativarProfessor,
  criarAlocacao,
  atualizarAlocacao,
  excluirAlocacao,
  ProfessorCreateDTO,
  AlocacaoCreateDTO,
  AlocacaoUpdateDTO,
} from '@/lib/api/professor.api';
import { professorKeys } from './queryKeys';

export function useCriarProfessor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dados, escolaGUID, escolaNome }: { dados: ProfessorCreateDTO; escolaGUID: string; escolaNome: string }) =>
      criarProfessor(dados, escolaGUID, escolaNome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: professorKeys.all });
    },
  });
}

export function useAtualizarProfessor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cpf, updates }: { cpf: string; updates: Parameters<typeof atualizarProfessor>[1] }) =>
      atualizarProfessor(cpf, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: professorKeys.all });
    },
  });
}

export function useCriarProfessoresEmMassa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      professores,
      escolaGUID,
      escolaNome,
    }: {
      professores: ProfessorCreateDTO[];
      escolaGUID: string;
      escolaNome: string;
    }) => criarProfessoresEmMassa(professores, escolaGUID, escolaNome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: professorKeys.all });
    },
  });
}

export function useInativarProfessor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cpf, escolaGUID }: { cpf: string; escolaGUID: string }) => inativarProfessor(cpf, escolaGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: professorKeys.all });
    },
  });
}

export function useReativarProfessor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cpf: string) => reativarProfessor(cpf),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: professorKeys.all });
    },
  });
}

export function useCriarAlocacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alocacao, escolaGUID }: { alocacao: AlocacaoCreateDTO; escolaGUID: string }) =>
      criarAlocacao(alocacao, escolaGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: professorKeys.all });
    },
  });
}

export function useAtualizarAlocacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alocacaoGUID, updates }: { alocacaoGUID: string; updates: AlocacaoUpdateDTO }) =>
      atualizarAlocacao(alocacaoGUID, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: professorKeys.all });
    },
  });
}

export function useExcluirAlocacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alocacaoGUID: string) => excluirAlocacao(alocacaoGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: professorKeys.all });
    },
  });
}
