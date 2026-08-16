'use client';

import { useQuery } from '@tanstack/react-query';
import { listarPendentes } from '@/lib/api/convitegrupoprojeto.api';
import { conviteGrupoProjetoKeys } from './queryKeys';

export function useConvitesPendentes(escolaGUID?: string, habilitado = true) {
  return useQuery({
    queryKey: [...conviteGrupoProjetoKeys.pendentes, escolaGUID ?? null],
    queryFn: () => listarPendentes(escolaGUID),
    enabled: habilitado,
  });
}
