import { listarProvas } from '@/lib/api/provaagendada.api';

export type ProvaFiltros = Parameters<typeof listarProvas>[0];

export const provaKeys = {
  all: ['provas'] as const,
  lista: (filtros?: ProvaFiltros) => ['provas', filtros ?? {}] as const,
  detalhe: (provaAgendadaGUID: string) => ['prova', provaAgendadaGUID] as const,
};
