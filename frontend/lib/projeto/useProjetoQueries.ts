'use client';

import { useQuery } from '@tanstack/react-query';
import { listarProjetos, buscarProjeto } from '@/lib/api/projeto.api';
import { projetoKeys } from './queryKeys';

export function useProjetos(escolaGUID: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: projetoKeys.lista(escolaGUID ?? ''),
    queryFn: () => listarProjetos(escolaGUID as string),
    enabled: !!escolaGUID && habilitado,
  });
}

export function useProjeto(projetoGUID: string | undefined) {
  return useQuery({
    queryKey: projetoKeys.detalhe(projetoGUID ?? ''),
    queryFn: () => buscarProjeto(projetoGUID as string),
    enabled: !!projetoGUID,
  });
}
