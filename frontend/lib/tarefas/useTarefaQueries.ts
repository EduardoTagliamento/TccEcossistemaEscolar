'use client';

import { useQuery } from '@tanstack/react-query';
import { buscarTarefa, buscarTarefaItemDetalhe, listarTarefas, listarQuestoes, buscarRespostasAluno } from '@/lib/api/tarefaacademica.api';
import {
  buscarQuestoesComRespostas,
  buscarEstatisticasItem,
  buscarEstatisticasPorQuestao,
  type ItemTipo,
} from '@/lib/api/materiasmodulo.api';
import { tarefaKeys, type TarefaFiltros } from './queryKeys';

export function useTarefa(tarefaGUID: string | undefined) {
  return useQuery({
    queryKey: tarefaKeys.detalhe(tarefaGUID ?? ''),
    queryFn: () => buscarTarefa(tarefaGUID as string),
    enabled: !!tarefaGUID,
  });
}

export function useTarefas(filtros?: TarefaFiltros, habilitado = true) {
  return useQuery({
    queryKey: tarefaKeys.lista(filtros),
    queryFn: () => listarTarefas(filtros),
    enabled: habilitado,
  });
}

/** Detalhe usado no visualizador de item (matrículas atribuídas, entregas etc.). */
export function useTarefaItemDetalhe(tarefaGUID: string | undefined, ehProfessor: boolean) {
  return useQuery({
    queryKey: tarefaKeys.itemDetalhe(tarefaGUID ?? '', ehProfessor),
    queryFn: () => buscarTarefaItemDetalhe(tarefaGUID as string, ehProfessor),
    enabled: !!tarefaGUID,
  });
}

export function useQuestoes(tarefaGUID: string | undefined) {
  return useQuery({
    queryKey: tarefaKeys.questoes(tarefaGUID ?? ''),
    queryFn: () => listarQuestoes(tarefaGUID as string),
    enabled: !!tarefaGUID,
  });
}

export function useQuestoesComRespostas(tarefaGUID: string | undefined) {
  return useQuery({
    queryKey: tarefaKeys.questoesComRespostas(tarefaGUID ?? ''),
    queryFn: () => buscarQuestoesComRespostas(tarefaGUID as string),
    enabled: !!tarefaGUID,
  });
}

export function useRespostasAluno(tarefaGUID: string | undefined, tarefaMatriculaGUID: string | undefined) {
  return useQuery({
    queryKey: tarefaKeys.respostasAluno(tarefaGUID ?? '', tarefaMatriculaGUID ?? ''),
    queryFn: () => buscarRespostasAluno(tarefaGUID as string, tarefaMatriculaGUID as string),
    enabled: !!tarefaGUID && !!tarefaMatriculaGUID,
  });
}

export function useEstatisticasItem(tipo: ItemTipo, itemGUID: string | undefined, turmaGUID: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: tarefaKeys.estatisticas(itemGUID ?? ''),
    queryFn: () => buscarEstatisticasItem(tipo, itemGUID as string, turmaGUID as string),
    enabled: !!itemGUID && !!turmaGUID && habilitado,
  });
}

export function useEstatisticasPorQuestao(tarefaGUID: string | undefined, turmaGUID: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: tarefaKeys.estatisticasPorQuestao(tarefaGUID ?? '', turmaGUID ?? ''),
    queryFn: () => buscarEstatisticasPorQuestao(tarefaGUID as string, turmaGUID as string),
    enabled: !!tarefaGUID && !!turmaGUID && habilitado,
  });
}
