'use client';

import { useQuery } from '@tanstack/react-query';
import { listarPendencias, buscarPendencia, listarAnexosPendencia, contarPendencias } from '@/lib/api/pendencia.api';
import { pendenciaKeys } from './queryKeys';

export function usePendencias(
  filtro?: { EscolaGUID?: string; PendenciaFeito?: boolean; atrasadas?: boolean; limit?: number; offset?: number },
  habilitado = true
) {
  return useQuery({
    queryKey: pendenciaKeys.lista(filtro),
    queryFn: () => listarPendencias(filtro),
    enabled: habilitado,
  });
}

export function usePendencia(pendenciaGUID: string | undefined) {
  return useQuery({
    queryKey: pendenciaKeys.detalhe(pendenciaGUID ?? ''),
    queryFn: () => buscarPendencia(pendenciaGUID as string),
    enabled: !!pendenciaGUID,
  });
}

export function useAnexosPendencia(pendenciaGUID: string | undefined) {
  return useQuery({
    queryKey: pendenciaKeys.anexos(pendenciaGUID ?? ''),
    queryFn: () => listarAnexosPendencia(pendenciaGUID as string),
    enabled: !!pendenciaGUID,
  });
}

export function useContadorPendencias(escolaGUID: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: pendenciaKeys.contador(escolaGUID),
    queryFn: () => contarPendencias(escolaGUID),
    enabled: !!escolaGUID && habilitado,
  });
}
