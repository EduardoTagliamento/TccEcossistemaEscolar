'use client';

import { useQuery } from '@tanstack/react-query';
import { buscarProva, listarProvas } from '@/lib/api/provaagendada.api';
import { provaKeys, type ProvaFiltros } from './queryKeys';

export function useProva(provaAgendadaGUID: string | undefined) {
  return useQuery({
    queryKey: provaKeys.detalhe(provaAgendadaGUID ?? ''),
    queryFn: () => buscarProva(provaAgendadaGUID as string),
    enabled: !!provaAgendadaGUID,
  });
}

export function useProvas(filtros?: ProvaFiltros) {
  return useQuery({
    queryKey: provaKeys.lista(filtros),
    queryFn: () => listarProvas(filtros),
  });
}
