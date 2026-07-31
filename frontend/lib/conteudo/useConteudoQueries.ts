'use client';

import { useQuery } from '@tanstack/react-query';
import { buscarConteudo, listarConteudos } from '@/lib/api/conteudo.api';
import { conteudoKeys, type ConteudoFiltros } from './queryKeys';

export function useConteudo(conteudoGUID: string | undefined) {
  return useQuery({
    queryKey: conteudoKeys.detalhe(conteudoGUID ?? ''),
    queryFn: () => buscarConteudo(conteudoGUID as string),
    enabled: !!conteudoGUID,
  });
}

export function useConteudos(filtros?: ConteudoFiltros) {
  return useQuery({
    queryKey: conteudoKeys.lista(filtros),
    queryFn: () => listarConteudos(filtros),
  });
}
