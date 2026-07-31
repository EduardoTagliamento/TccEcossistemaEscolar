'use client';

import { useQuery } from '@tanstack/react-query';
import { listarGruposDaTarefa, buscarGrupoComMembros } from '@/lib/api/grupotarefa.api';
import { grupoTarefaKeys } from './queryKeys';

export function useGruposDaTarefa(tarefaGUID: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: grupoTarefaKeys.porTarefa(tarefaGUID ?? ''),
    queryFn: () => listarGruposDaTarefa(tarefaGUID as string),
    enabled: !!tarefaGUID && habilitado,
  });
}

export function useGrupoComMembros(grupoGUID: string | undefined) {
  return useQuery({
    queryKey: grupoTarefaKeys.detalhe(grupoGUID ?? ''),
    queryFn: () => buscarGrupoComMembros(grupoGUID as string),
    enabled: !!grupoGUID,
  });
}
