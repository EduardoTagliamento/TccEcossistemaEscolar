'use client';

import { useQuery } from '@tanstack/react-query';
import { listarCalendario } from '@/lib/api/calendario.api';
import { calendarioKeys } from './queryKeys';

export function useCalendario(
  filtros: { EscolaGUID: string; DataInicio: string; DataFim: string; TipoAviso?: 'tarefa' | 'prova' } | undefined,
  habilitado = true
) {
  return useQuery({
    queryKey: calendarioKeys.lista(filtros ?? { EscolaGUID: '', DataInicio: '', DataFim: '' }),
    queryFn: () => listarCalendario(filtros as { EscolaGUID: string; DataInicio: string; DataFim: string; TipoAviso?: 'tarefa' | 'prova' }),
    enabled: !!filtros && habilitado,
  });
}
