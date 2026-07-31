'use client';

import { useQuery } from '@tanstack/react-query';
import { listarCategorias, buscarBoardGeral, verificarPendenciaAgregada } from '@/lib/api/categoriaconteudo.api';
import { categoriaConteudoKeys } from './queryKeys';

export function useCategorias(filtro?: { MateriaGUID?: string; TurmaGUID?: string }, habilitado = true) {
  return useQuery({
    queryKey: categoriaConteudoKeys.lista(filtro),
    queryFn: () => listarCategorias(filtro),
    enabled: habilitado,
  });
}

export function useBoardGeral(materiaGUID: string | undefined) {
  return useQuery({
    queryKey: categoriaConteudoKeys.boardGeral(materiaGUID ?? ''),
    queryFn: () => buscarBoardGeral(materiaGUID as string),
    enabled: !!materiaGUID,
  });
}

export function usePendenciaAgregada(ehProfessor: boolean, habilitado = true) {
  return useQuery({
    queryKey: categoriaConteudoKeys.pendenciaAgregada(ehProfessor),
    queryFn: () => verificarPendenciaAgregada(ehProfessor),
    enabled: habilitado,
  });
}
