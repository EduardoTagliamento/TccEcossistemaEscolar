'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { excluirConteudo, removerConteudoDeTurma } from '@/lib/api/conteudo.api';
import { registrarProgressoVideo, registrarProgressoTexto, registrarProgressoPagina } from '@/lib/api/materiasmodulo.api';
import { conteudoKeys } from './queryKeys';

export function useExcluirConteudo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conteudoGUID: string) => excluirConteudo(conteudoGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conteudoKeys.all });
    },
  });
}

export function useRemoverConteudoDeTurma() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conteudoGUID, turmaGUID }: { conteudoGUID: string; turmaGUID: string }) =>
      removerConteudoDeTurma(conteudoGUID, turmaGUID),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: conteudoKeys.detalhe(variables.conteudoGUID) });
      queryClient.invalidateQueries({ queryKey: conteudoKeys.all });
    },
  });
}

/** Progresso de consumo (aluno) — não altera o registro de Conteudo em si, só o progresso da matrícula; sem invalidação de conteudoKeys. */
export function useRegistrarProgressoVideo(conteudoGUID: string) {
  return useMutation({
    mutationFn: ({ segundosAssistidos, duracaoTotalSegundos }: { segundosAssistidos: number; duracaoTotalSegundos: number }) =>
      registrarProgressoVideo(conteudoGUID, segundosAssistidos, duracaoTotalSegundos),
  });
}

export function useRegistrarProgressoTexto() {
  return useMutation({
    mutationFn: (conteudoGUID: string) => registrarProgressoTexto(conteudoGUID),
  });
}

export function useRegistrarProgressoPagina() {
  return useMutation({
    mutationFn: (conteudoPaginadoArquivoGUID: string) => registrarProgressoPagina(conteudoPaginadoArquivoGUID),
  });
}
