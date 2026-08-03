'use client';

import { useQuery } from '@tanstack/react-query';
import { listarAnotacoesPorPeriodo, listarAnotacoes, obterEstatisticas } from '@/lib/api/anotacao.api';
import { anotacaoKeys } from './queryKeys';

export function useAnotacoesPorPeriodo(
  escolaGUID: string | undefined,
  dataInicio: string | undefined,
  dataFim: string | undefined,
  habilitado = true
) {
  return useQuery({
    queryKey: anotacaoKeys.porPeriodo(escolaGUID ?? '', dataInicio ?? '', dataFim ?? ''),
    queryFn: () => listarAnotacoesPorPeriodo(escolaGUID as string, dataInicio as string, dataFim as string),
    enabled: !!escolaGUID && !!dataInicio && !!dataFim && habilitado,
  });
}

export function useAnotacoes(escolaGUID: string | undefined, isFeito?: boolean, habilitado = true) {
  return useQuery({
    queryKey: anotacaoKeys.lista(escolaGUID ?? '', isFeito),
    queryFn: () => listarAnotacoes(escolaGUID as string, isFeito),
    enabled: !!escolaGUID && habilitado,
  });
}

export function useEstatisticasAnotacao(escolaGUID: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: anotacaoKeys.estatisticas(escolaGUID ?? ''),
    queryFn: () => obterEstatisticas(escolaGUID as string),
    enabled: !!escolaGUID && habilitado,
  });
}
