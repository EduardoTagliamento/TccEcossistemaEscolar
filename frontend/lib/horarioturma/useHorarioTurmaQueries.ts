'use client';

import { useQuery } from '@tanstack/react-query';
import { obterCronograma } from '@/lib/api/horarioturma.api';
import { horarioTurmaKeys } from './queryKeys';

export function useCronograma(turmaGUID: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: horarioTurmaKeys.cronograma(turmaGUID ?? ''),
    queryFn: () => obterCronograma(turmaGUID as string),
    enabled: !!turmaGUID && habilitado,
  });
}
