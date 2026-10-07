import { useEffect, useState } from 'react';
import * as QuestaoBancoAPI from './api/questaobanco.api';

export interface VestibularAgrupado {
  nomeBase: string;
  guids: string[];
}

/** "ENEM 2023" -> "ENEM", "Famerp-SP 2019" -> "Famerp-SP" — o ano já é um filtro próprio
 * (coluna Ano), então o filtro de Vestibular não deve listar uma linha por ano (spec 07/10:
 * "tem enem 2017 e enem 2018 sendo que no vestibular era só pra ter enem"). */
function extrairNomeBase(nomeCompleto: string): string {
  return nomeCompleto
    .replace(/\b(19|20)\d{2}\b/, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Busca os vestibulares e agrupa por nome-base (sem ano) — cada grupo guarda todos os
 * VestibularGUIDs daquele nome (um por ano). O filtro de Vestibular mostra 1 opção por grupo;
 * selecionar "ENEM" expande pra todos os GUIDs de ENEM na hora de consultar a API.
 */
export function useVestibularesAgrupados() {
  const [grupos, setGrupos] = useState<VestibularAgrupado[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    QuestaoBancoAPI.listarVestibulares()
      .then((vestibulares) => {
        // Dado real tem capitalização inconsistente pro mesmo vestibular (ex.: "ENEM 2018" vs.
        // "Enem 2023") — agrupa por chave case-insensitive, senão "ENEM" e "Enem" viram 2 opções
        // no filtro em vez de 1. Label exibido: a variante mais frequente (sem empate real nos
        // dados hoje, mas `localeCompare` desempata deterministicamente se acontecer).
        const porChave = new Map<string, { labels: Map<string, number>; guids: string[] }>();
        for (const v of vestibulares) {
          const nomeBase = extrairNomeBase(v.Nome);
          const chave = nomeBase.toLowerCase();
          const grupo = porChave.get(chave) || { labels: new Map<string, number>(), guids: [] };
          grupo.labels.set(nomeBase, (grupo.labels.get(nomeBase) ?? 0) + 1);
          grupo.guids.push(v.VestibularGUID);
          porChave.set(chave, grupo);
        }
        const gruposOrdenados = Array.from(porChave.values())
          .map(({ labels, guids }) => {
            const labelMaisFrequente = Array.from(labels.entries()).sort(
              (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR')
            )[0][0];
            return { nomeBase: labelMaisFrequente, guids };
          })
          // Alfabética, mas ENEM sempre primeiro (é o vestibular mais usado/procurado).
          .sort((a, b) => {
            const aEhEnem = a.nomeBase.toLowerCase() === 'enem';
            const bEhEnem = b.nomeBase.toLowerCase() === 'enem';
            if (aEhEnem !== bEhEnem) return aEhEnem ? -1 : 1;
            return a.nomeBase.localeCompare(b.nomeBase, 'pt-BR');
          });
        setGrupos(gruposOrdenados);
      })
      .catch(() => {
        // Sem grupos, o filtro de vestibular fica vazio mas não bloqueia a tela.
      })
      .finally(() => setCarregando(false));
  }, []);

  const expandirNomesBaseParaGUIDs = (nomesBase: string[]): string[] => {
    const resultado: string[] = [];
    for (const nomeBase of nomesBase) {
      const grupo = grupos.find((g) => g.nomeBase === nomeBase);
      if (grupo) resultado.push(...grupo.guids);
    }
    return resultado;
  };

  return { grupos, carregando, expandirNomesBaseParaGUIDs };
}
