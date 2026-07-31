'use client';

import { useQuery } from '@tanstack/react-query';
import { listarPendentes } from '@/lib/api/convitegrupoprojeto.api';
import { conviteGrupoProjetoKeys } from './queryKeys';

export function useConvitesPendentes(habilitado = true) {
  return useQuery({
    queryKey: conviteGrupoProjetoKeys.pendentes,
    queryFn: () => listarPendentes(),
    enabled: habilitado,
  });
}
