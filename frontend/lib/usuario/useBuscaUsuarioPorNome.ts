'use client';

import { useEffect, useRef, useState } from 'react';
import { buscarUsuariosPorNome, UsuarioBusca } from '@/lib/api/usuario.api';

const MIN_CARACTERES = 3;
const DEBOUNCE_MS = 400;

/**
 * Busca usuários por nome com debounce, pra alimentar um dropdown de
 * candidatos nas telas de Gestão de Dados (Professores/Alunos/Secretaria/
 * Coordenação) — substitui a busca por CPF agora que CPF é opcional. Nome
 * não é único como CPF era, então o resultado é sempre uma lista (0, 1 ou
 * N candidatos), nunca um match único automático.
 *
 * `termo` é o texto digitado (controlado pelo caller). Retorna os
 * candidatos encontrados, se está buscando, e `limpar()` pra esconder a
 * lista depois que o caller já resolveu a seleção.
 */
export function useBuscaUsuarioPorNome(termo: string) {
  const [candidatos, setCandidatos] = useState<UsuarioBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const ultimaBuscaId = useRef(0);

  useEffect(() => {
    const termoLimpo = termo.trim();

    if (termoLimpo.length < MIN_CARACTERES) {
      setCandidatos([]);
      setBuscando(false);
      return;
    }

    setBuscando(true);
    const buscaId = ++ultimaBuscaId.current;

    const timeout = setTimeout(() => {
      buscarUsuariosPorNome(termoLimpo)
        .then((encontrados) => {
          if (buscaId !== ultimaBuscaId.current) return; // resposta de uma busca já obsoleta
          setCandidatos(encontrados);
        })
        .catch(() => {
          if (buscaId !== ultimaBuscaId.current) return;
          setCandidatos([]);
        })
        .finally(() => {
          if (buscaId !== ultimaBuscaId.current) return;
          setBuscando(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [termo]);

  const limpar = () => {
    ultimaBuscaId.current++; // invalida qualquer busca em voo
    setCandidatos([]);
    setBuscando(false);
  };

  return { candidatos, buscando, limpar };
}
