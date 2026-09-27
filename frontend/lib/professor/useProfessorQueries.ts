'use client';

import { useQuery } from '@tanstack/react-query';
import { listarProfessores, buscarAlocacoesProfessor, listarMateriasQualificadas } from '@/lib/api/professor.api';
import { professorKeys } from './queryKeys';

export function useProfessores(escolaGUID: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: professorKeys.lista(escolaGUID ?? ''),
    queryFn: () => listarProfessores({ EscolaGUID: escolaGUID as string }),
    enabled: !!escolaGUID && habilitado,
  });
}

export function useAlocacoesProfessor(usuarioGUID: string | undefined, escolaGUID: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: professorKeys.alocacoes(usuarioGUID ?? '', escolaGUID ?? ''),
    queryFn: () => buscarAlocacoesProfessor(usuarioGUID as string, escolaGUID as string),
    enabled: !!usuarioGUID && !!escolaGUID && habilitado,
  });
}

/** Matérias que o professor está qualificado a lecionar (independente de turma). */
export function useMateriasQualificadas(usuarioGUID: string | undefined, escolaGUID: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: professorKeys.materiasQualificadas(usuarioGUID ?? '', escolaGUID ?? ''),
    queryFn: () => listarMateriasQualificadas(usuarioGUID as string, escolaGUID as string),
    enabled: !!usuarioGUID && !!escolaGUID && habilitado,
  });
}
