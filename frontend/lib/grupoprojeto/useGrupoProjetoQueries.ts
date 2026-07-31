'use client';

import { useQuery } from '@tanstack/react-query';
import { listarGruposDoProjeto, buscarGrupo } from '@/lib/api/grupoprojeto.api';
import { grupoProjetoKeys } from './queryKeys';

export function useGruposDoProjeto(projetoGUID: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: grupoProjetoKeys.porProjeto(projetoGUID ?? ''),
    queryFn: () => listarGruposDoProjeto(projetoGUID as string),
    enabled: !!projetoGUID && habilitado,
  });
}

export function useGrupo(grupoGUID: string | undefined) {
  return useQuery({
    queryKey: grupoProjetoKeys.detalhe(grupoGUID ?? ''),
    queryFn: () => buscarGrupo(grupoGUID as string),
    enabled: !!grupoGUID,
  });
}
