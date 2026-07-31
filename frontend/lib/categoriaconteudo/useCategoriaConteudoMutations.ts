'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  criarCategoria,
  reordenarCategorias,
  reordenarItens,
  atualizarCategoria,
  excluirCategoria,
  criarCategoriaGeral,
  reordenarCategoriasGerais,
  moverItemBoardGeral,
  resolverCategoriaPorNomeParaTurmas,
  atualizarCategoriaGeral,
  excluirCategoriaGeral,
  ItemTipoBoardGeral,
} from '@/lib/api/categoriaconteudo.api';
import { categoriaConteudoKeys } from './queryKeys';

export function useCriarCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ materiaGUID, turmaGUID, categoriaNome }: { materiaGUID: string; turmaGUID: string; categoriaNome: string }) =>
      criarCategoria(materiaGUID, turmaGUID, categoriaNome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriaConteudoKeys.all });
    },
  });
}

export function useAtualizarCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoriaGUID, categoriaNome }: { categoriaGUID: string; categoriaNome: string }) =>
      atualizarCategoria(categoriaGUID, categoriaNome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriaConteudoKeys.all });
    },
  });
}

export function useExcluirCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoriaGUID: string) => excluirCategoria(categoriaGUID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriaConteudoKeys.all });
    },
  });
}

export function useReordenarCategorias() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ materiaGUID, turmaGUID, ordem }: { materiaGUID: string; turmaGUID: string; ordem: string[] }) =>
      reordenarCategorias(materiaGUID, turmaGUID, ordem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriaConteudoKeys.all });
    },
  });
}

export function useReordenarItens() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      materiaGUID,
      turmaGUID,
      categoriaDestinoGUID,
      itens,
    }: {
      materiaGUID: string;
      turmaGUID: string;
      categoriaDestinoGUID: string;
      itens: Array<{ ItemGUID: string; Tipo: string }>;
    }) => reordenarItens(materiaGUID, turmaGUID, categoriaDestinoGUID, itens),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriaConteudoKeys.all });
    },
  });
}

export function useAtualizarCategoriaGeral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      materiaGUID,
      categoriaNomeAtual,
      novoNome,
    }: {
      materiaGUID: string;
      categoriaNomeAtual: string;
      novoNome: string;
    }) => atualizarCategoriaGeral(materiaGUID, categoriaNomeAtual, novoNome),
    onSuccess: (_data, { materiaGUID }) => {
      queryClient.invalidateQueries({ queryKey: categoriaConteudoKeys.boardGeral(materiaGUID) });
      queryClient.invalidateQueries({ queryKey: categoriaConteudoKeys.lista() });
    },
  });
}

export function useExcluirCategoriaGeral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ materiaGUID, categoriaNome }: { materiaGUID: string; categoriaNome: string }) =>
      excluirCategoriaGeral(materiaGUID, categoriaNome),
    onSuccess: (_data, { materiaGUID }) => {
      queryClient.invalidateQueries({ queryKey: categoriaConteudoKeys.boardGeral(materiaGUID) });
      queryClient.invalidateQueries({ queryKey: categoriaConteudoKeys.lista() });
    },
  });
}

// As três mutations abaixo (board geral) devolvem o `BoardGeral` inteiro já
// atualizado — em vez de só invalidar, escrevemos a resposta direto no cache
// (`setQueryData`), igual ao `setBoard(resultado)` que existia antes em
// `GerenciarCategoriasModal.tsx`.

export function useCriarCategoriaGeral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ materiaGUID, categoriaNome }: { materiaGUID: string; categoriaNome: string }) =>
      criarCategoriaGeral(materiaGUID, categoriaNome),
    onSuccess: (board, { materiaGUID }) => {
      queryClient.setQueryData(categoriaConteudoKeys.boardGeral(materiaGUID), board);
    },
  });
}

export function useReordenarCategoriasGerais() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ materiaGUID, ordemNomes }: { materiaGUID: string; ordemNomes: string[] }) =>
      reordenarCategoriasGerais(materiaGUID, ordemNomes),
    onSuccess: (board, { materiaGUID }) => {
      queryClient.setQueryData(categoriaConteudoKeys.boardGeral(materiaGUID), board);
    },
  });
}

export function useMoverItemBoardGeral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      materiaGUID,
      item,
      categoriaNomeDestino,
    }: {
      materiaGUID: string;
      item: { ItemGUID: string; Tipo: ItemTipoBoardGeral; TurmaGUID: string };
      categoriaNomeDestino: string | null;
    }) => moverItemBoardGeral(materiaGUID, item, categoriaNomeDestino),
    onSuccess: (board, { materiaGUID }) => {
      queryClient.setQueryData(categoriaConteudoKeys.boardGeral(materiaGUID), board);
    },
  });
}

export function useResolverCategoriaPorNomeParaTurmas() {
  return useMutation({
    mutationFn: ({
      materiaGUID,
      turmasGUID,
      categoriaNome,
    }: {
      materiaGUID: string;
      turmasGUID: string[];
      categoriaNome: string;
    }) => resolverCategoriaPorNomeParaTurmas(materiaGUID, turmasGUID, categoriaNome),
  });
}
