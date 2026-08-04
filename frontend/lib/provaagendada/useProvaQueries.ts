'use client';

import { useQuery } from '@tanstack/react-query';
import { buscarProva, buscarRecomendacaoProva, listarProvas } from '@/lib/api/provaagendada.api';
import { provaKeys, type ProvaFiltros } from './queryKeys';

export function useProva(provaAgendadaGUID: string | undefined) {
  return useQuery({
    queryKey: provaKeys.detalhe(provaAgendadaGUID ?? ''),
    queryFn: () => buscarProva(provaAgendadaGUID as string),
    enabled: !!provaAgendadaGUID,
  });
}

/**
 * A geração é assíncrona (fire-and-forget no backend) — enquanto não há
 * cache ainda ou StatusGeracao='Pendente', faz polling curto; assim que
 * fica 'Concluida'/'Falhou' (ou o card é omitido de vez), para de repetir.
 */
export function useRecomendacaoProva(provaAgendadaGUID: string | undefined) {
  return useQuery({
    queryKey: provaKeys.recomendacao(provaAgendadaGUID ?? ''),
    queryFn: () => buscarRecomendacaoProva(provaAgendadaGUID as string),
    enabled: !!provaAgendadaGUID,
    refetchInterval: (query) => {
      const dados = query.state.data;
      if (!dados || dados.StatusGeracao === 'Pendente') return 4000;
      return false;
    },
  });
}

export function useProvas(filtros?: ProvaFiltros) {
  return useQuery({
    queryKey: provaKeys.lista(filtros),
    queryFn: () => listarProvas(filtros),
  });
}
