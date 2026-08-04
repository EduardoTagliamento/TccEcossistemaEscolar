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
 * Teto de tentativas do polling abaixo — sem isso, uma prova que nunca teve
 * a geração disparada (ex.: criada antes deste recurso existir, ou que
 * falhou silenciosamente antes de gravar StatusGeracao) faria o cliente
 * bater no backend a cada 4s pra sempre, enquanto a tela ficasse aberta.
 * 20 tentativas × 4s = ~80s de espera antes de desistir.
 */
export const MAX_TENTATIVAS_POLLING_RECOMENDACAO = 20;

/**
 * A geração é assíncrona (fire-and-forget no backend) — enquanto não há
 * cache ainda ou StatusGeracao='Pendente', faz polling curto; assim que
 * fica 'Concluida'/'Falhou' (ou o card é omitido de vez), para de repetir.
 * Também para depois do teto acima, mesmo sem resposta definitiva.
 */
export function useRecomendacaoProva(provaAgendadaGUID: string | undefined) {
  return useQuery({
    queryKey: provaKeys.recomendacao(provaAgendadaGUID ?? ''),
    queryFn: () => buscarRecomendacaoProva(provaAgendadaGUID as string),
    enabled: !!provaAgendadaGUID,
    refetchInterval: (query) => {
      const dados = query.state.data;
      if (dados && dados.StatusGeracao !== 'Pendente') return false;
      if (query.state.dataUpdateCount >= MAX_TENTATIVAS_POLLING_RECOMENDACAO) return false;
      return 4000;
    },
  });
}

export function useProvas(filtros?: ProvaFiltros) {
  return useQuery({
    queryKey: provaKeys.lista(filtros),
    queryFn: () => listarProvas(filtros),
  });
}
