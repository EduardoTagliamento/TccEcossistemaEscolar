'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/Icon';
import * as QuestaoBancoAPI from '@/lib/api/questaobanco.api';
import { filtrosDeSearchParams, aplicarFiltrosNaQueryString, DIFICULDADE_LABEL } from '@/lib/bancoQuestoesFiltros';
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
  const [vestibulares, setVestibulares] = useState<QuestaoBancoAPI.Vestibular[]>([]);
  const [anos, setAnos] = useState<number[]>([]);
  const [carregandoOpcoes, setCarregandoOpcoes] = useState(false);

  useEffect(() => {
    setCarregandoOpcoes(true);
    Promise.all([QuestaoBancoAPI.listarVestibulares(), QuestaoBancoAPI.listarAnosDisponiveis()])
      .then(([v, a]) => {
        setVestibulares(v);
        setAnos(a);
      })
      .catch(() => {
        // Sem opções, os botões de filtro ficam vazios mas não bloqueiam a tela.
      })
      .finally(() => setCarregandoOpcoes(false));
  }, []);

  const atualizarUrl = (novosFiltros: typeof filtros) => {
    const query = aplicarFiltrosNaQueryString(new URLSearchParams(searchParams?.toString()), novosFiltros);
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const opcoesVestibular: OpcaoSelecaoMultipla[] = vestibulares.map((v) => ({ valor: v.VestibularGUID, label: v.Nome }));
  const opcoesAno: OpcaoSelecaoMultipla[] = anos.map((a) => ({ valor: String(a), label: String(a) }));

  return (
    <>
      <div className={styles.barra}>
        <button
          type="button"
          className={filtros.vestibularGUIDs.length > 0 ? styles.botaoFiltroAtivo : styles.botaoFiltro}
          onClick={() => setModalAberto('vestibular')}
        >
          Vestibular
          {filtros.vestibularGUIDs.length > 0 && <span className={styles.badge}>{filtros.vestibularGUIDs.length}</span>}
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
        selecionados={filtros.vestibularGUIDs}
        carregando={carregandoOpcoes}
        onFechar={() => setModalAberto(null)}
        onAplicar={(selecionados) => atualizarUrl({ ...filtros, vestibularGUIDs: selecionados })}
      />

      <ModalSelecaoMultipla
        aberto={modalAberto === 'ano'}
        titulo="Filtrar por ano"
        opcoes={opcoesAno}
        selecionados={filtros.anos.map(String)}
        carregando={carregandoOpcoes}
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
