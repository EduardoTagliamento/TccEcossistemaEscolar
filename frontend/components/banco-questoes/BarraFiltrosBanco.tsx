'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/Icon';
import * as QuestaoBancoAPI from '@/lib/api/questaobanco.api';
import { filtrosDeSearchParams, aplicarFiltrosNaQueryString, DIFICULDADE_LABEL } from '@/lib/bancoQuestoesFiltros';
import { useVestibularesAgrupados } from '@/lib/useVestibularesAgrupados';
import ModalSelecaoMultipla, { OpcaoSelecaoMultipla } from './ModalSelecaoMultipla';
import styles from './BarraFiltrosBanco.module.css';

type ModalAberto = 'vestibular' | 'ano' | 'dificuldade' | null;

const OPCOES_DIFICULDADE: OpcaoSelecaoMultipla[] = (['Facil', 'Media', 'Dificil'] as const).map((d) => ({
  valor: d,
  label: DIFICULDADE_LABEL[d],
}));

/**
 * Barra de filtros (Vestibular/Ano/Dificuldade, multi-seleção, cada um com seu modal) —
 * auto-contida: lê e escreve direto na URL (query string), sem precisar de callback do pai.
 * Isso faz os filtros sobreviverem a navegação (home -> matéria) de graça, e some sozinho
 * quando a URL não tem query (ex.: clique no ícone do nav voltando pra home).
 */
export default function BarraFiltrosBanco() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const filtros = filtrosDeSearchParams(searchParams);

  const [modalAberto, setModalAberto] = useState<ModalAberto>(null);
  const { grupos: gruposVestibular, carregando: carregandoVestibulares } = useVestibularesAgrupados();
  const [anos, setAnos] = useState<number[]>([]);
  const [carregandoAnos, setCarregandoAnos] = useState(true);
  const [contagemPorVestibularGUID, setContagemPorVestibularGUID] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    QuestaoBancoAPI.listarAnosDisponiveis()
      .then(setAnos)
      .catch(() => {
        // Sem opções, o filtro de ano fica vazio mas não bloqueia a tela.
      })
      .finally(() => setCarregandoAnos(false));
  }, []);

  const anosKey = filtros.anos.join(',');
  const dificuldadesKey = filtros.dificuldades.join(',');

  useEffect(() => {
    // Nunca passa vestibulares aqui — a contagem de cada vestibular no modal precisa ignorar o
    // próprio filtro de vestibular, senão os não selecionados apareceriam com (0).
    QuestaoBancoAPI.contarQuestoesValidadas({ anos: filtros.anos, dificuldades: filtros.dificuldades })
      .then((contagem) => {
        setContagemPorVestibularGUID(new Map(contagem.PorVestibular.map((c) => [c.VestibularGUID, c.Quantidade])));
      })
      .catch(() => {
        // Sem contagem, as opções do filtro de vestibular ficam sem número — não bloqueia a tela.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anosKey, dificuldadesKey]);

  const atualizarUrl = (novosFiltros: typeof filtros) => {
    const query = aplicarFiltrosNaQueryString(new URLSearchParams(searchParams?.toString()), novosFiltros);
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const opcoesVestibular: OpcaoSelecaoMultipla[] = gruposVestibular.map((g) => {
    const quantidade = g.guids.reduce((soma, guid) => soma + (contagemPorVestibularGUID.get(guid) ?? 0), 0);
    return { valor: g.nomeBase, label: `${g.nomeBase} (${quantidade})` };
  });
  const opcoesAno: OpcaoSelecaoMultipla[] = anos.map((a) => ({ valor: String(a), label: String(a) }));

  return (
    <>
      <div className={styles.barra}>
        <button
          type="button"
          className={filtros.vestibulares.length > 0 ? styles.botaoFiltroAtivo : styles.botaoFiltro}
          onClick={() => setModalAberto('vestibular')}
        >
          Vestibular
          {filtros.vestibulares.length > 0 && <span className={styles.badge}>{filtros.vestibulares.length}</span>}
          <Icon name="chevron-down" />
        </button>

        <button
          type="button"
          className={filtros.anos.length > 0 ? styles.botaoFiltroAtivo : styles.botaoFiltro}
          onClick={() => setModalAberto('ano')}
        >
          Ano
          {filtros.anos.length > 0 && <span className={styles.badge}>{filtros.anos.length}</span>}
          <Icon name="chevron-down" />
        </button>

        <button
          type="button"
          className={filtros.dificuldades.length > 0 ? styles.botaoFiltroAtivo : styles.botaoFiltro}
          onClick={() => setModalAberto('dificuldade')}
        >
          Dificuldade
          {filtros.dificuldades.length > 0 && <span className={styles.badge}>{filtros.dificuldades.length}</span>}
          <Icon name="chevron-down" />
        </button>
      </div>

      <ModalSelecaoMultipla
        aberto={modalAberto === 'vestibular'}
        titulo="Filtrar por vestibular"
        opcoes={opcoesVestibular}
        selecionados={filtros.vestibulares}
        carregando={carregandoVestibulares}
        onFechar={() => setModalAberto(null)}
        onAplicar={(selecionados) => atualizarUrl({ ...filtros, vestibulares: selecionados })}
      />

      <ModalSelecaoMultipla
        aberto={modalAberto === 'ano'}
        titulo="Filtrar por ano"
        opcoes={opcoesAno}
        selecionados={filtros.anos.map(String)}
        carregando={carregandoAnos}
        onFechar={() => setModalAberto(null)}
        onAplicar={(selecionados) => atualizarUrl({ ...filtros, anos: selecionados.map(Number) })}
      />

      <ModalSelecaoMultipla
        aberto={modalAberto === 'dificuldade'}
        titulo="Filtrar por dificuldade"
        opcoes={OPCOES_DIFICULDADE}
        selecionados={filtros.dificuldades}
        onFechar={() => setModalAberto(null)}
        onAplicar={(selecionados) =>
          atualizarUrl({ ...filtros, dificuldades: selecionados as typeof filtros.dificuldades })
        }
      />
    </>
  );
}
