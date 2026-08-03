'use client';

import { useQuery } from '@tanstack/react-query';
import { listarProfessores, buscarAlocacoesProfessor } from '@/lib/api/professor.api';
import { professorKeys } from './queryKeys';

export function useProfessores(escolaGUID: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: professorKeys.lista(escolaGUID ?? ''),
    queryFn: () => listarProfessores({ EscolaGUID: escolaGUID as string }),
    enabled: !!escolaGUID && habilitado,
  });
}

export function useAlocacoesProfessor(cpf: string | undefined, escolaGUID: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: professorKeys.alocacoes(cpf ?? '', escolaGUID ?? ''),
    queryFn: () => buscarAlocacoesProfessor(cpf as string, escolaGUID as string),
    enabled: !!cpf && !!escolaGUID && habilitado,
  });
}
