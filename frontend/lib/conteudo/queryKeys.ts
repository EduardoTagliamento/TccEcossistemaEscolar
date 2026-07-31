import { listarConteudos } from '@/lib/api/conteudo.api';

export type ConteudoFiltros = Parameters<typeof listarConteudos>[0];

export const conteudoKeys = {
  all: ['conteudos'] as const,
  lista: (filtros?: ConteudoFiltros) => ['conteudos', filtros ?? {}] as const,
  detalhe: (conteudoGUID: string) => ['conteudo', conteudoGUID] as const,
};
