'use client';

import { useQuery } from '@tanstack/react-query';
import { listarConvitesPendentes } from '@/lib/api/convitegrupotarefa.api';
import { conviteGrupoTarefaKeys } from './queryKeys';

export function useConvitesPendentes(habilitado = true) {
  return useQuery({
    queryKey: conviteGrupoTarefaKeys.pendentes,
    queryFn: () => listarConvitesPendentes(),
    enabled: habilitado,
  });
}
