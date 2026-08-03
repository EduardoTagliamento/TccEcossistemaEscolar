'use client';

import { useQuery } from '@tanstack/react-query';
import { listarEventos, buscarEvento, listarAnexosEvento, EventoStatus } from '@/lib/api/evento.api';
import { eventoKeys } from './queryKeys';

export function useEventos(
  filtro?: { EscolaGUID?: string; EventoStatus?: EventoStatus; dataInicio?: string; dataFim?: string; limit?: number; offset?: number },
  habilitado = true
) {
  return useQuery({
    queryKey: eventoKeys.lista(filtro),
    queryFn: () => listarEventos(filtro ?? {}),
    enabled: habilitado,
  });
}

export function useEvento(eventoGUID: string | undefined) {
  return useQuery({
    queryKey: eventoKeys.detalhe(eventoGUID ?? ''),
    queryFn: () => buscarEvento(eventoGUID as string),
    enabled: !!eventoGUID,
  });
}

export function useAnexosEvento(eventoGUID: string | undefined) {
  return useQuery({
    queryKey: eventoKeys.anexos(eventoGUID ?? ''),
    queryFn: () => listarAnexosEvento(eventoGUID as string),
    enabled: !!eventoGUID,
  });
}
