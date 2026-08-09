'use client';

import { useQuery } from '@tanstack/react-query';
import { listarAvisos, buscarAviso, buscarAvisoNaoVisualizado } from '@/lib/api/aviso.api';
import { avisoKeys } from './queryKeys';

export function useAvisos(escolaGUID: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: avisoKeys.lista(escolaGUID ?? ''),
    queryFn: () => listarAvisos(escolaGUID as string),
    enabled: !!escolaGUID && habilitado,
  });
}

export function useAviso(guid: string | undefined) {
  return useQuery({
    queryKey: avisoKeys.detalhe(guid ?? ''),
    queryFn: () => buscarAviso(guid as string),
    enabled: !!guid,
  });
}

export function useAvisoNaoVisualizado(escolaGUID: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: avisoKeys.naoVisualizado(escolaGUID ?? ''),
    queryFn: () => buscarAvisoNaoVisualizado(escolaGUID as string),
    enabled: !!escolaGUID && habilitado,
  });
}
