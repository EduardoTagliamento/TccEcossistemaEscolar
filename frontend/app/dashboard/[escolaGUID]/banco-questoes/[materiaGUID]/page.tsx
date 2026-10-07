'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/Icon';
import Loader from '@/components/Loader';
import { useCoresEscola } from '@/lib/theme/useCoresEscola';
import { embaralhar } from '@/lib/embaralhar';
import * as MateriaGlobalAPI from '@/lib/api/materiaglobal.api';
import * as QuestaoBancoAPI from '@/lib/api/questaobanco.api';
import { filtrosDeSearchParams } from '@/lib/bancoQuestoesFiltros';
import { useVestibularesAgrupados } from '@/lib/useVestibularesAgrupados';
import BarraFiltrosBanco from '@/components/banco-questoes/BarraFiltrosBanco';
import CardSelecaoBanco from '@/components/banco-questoes/CardSelecaoBanco';
import PraticaQuestoes from '@/components/banco-questoes/PraticaQuestoes';
import styles from './page.module.css';

/**
 * Tela da matéria — grade de cards de submatéria (mesmo padrão da home) +
 * botão "todas as submatérias" + os mesmos filtros (carregados da URL,
 * herdados da home). Clicar num card de submatéria OU no botão "todas"
 * dispara a prática ali mesmo (sem navegar pra outra URL — senão "voltar"
 * do navegador ficaria estranho no meio de uma prova).
 */
export default function MateriaBancoQuestoesPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';
  const materiaGUID = (params?.materiaGUID as string) || '';
  const searchParams = useSearchParams();
  const filtros = filtrosDeSearchParams(searchParams);
  const paletaEscola = useCoresEscola();
  const { grupos: gruposVestibular, expandirNomesBaseParaGUIDs } = useVestibularesAgrupados();

  const [materia, setMateria] = useState<MateriaGlobalAPI.MateriaGlobal | null>(null);
  const [submaterias, setSubmaterias] = useState<MateriaGlobalAPI.SubMateriaGlobal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [contagem, setContagem] = useState<QuestaoBancoAPI.ContagemQuestoes | null>(null);
  const [erro, setErro] = useState('');

  const [questoesPratica, setQuestoesPratica] = useState<QuestaoBancoAPI.QuestaoBanco[] | null>(null);
  const [carregandoPratica, setCarregandoPratica] = useState(false);

  useEffect(() => {
    setCarregando(true);
    Promise.all([MateriaGlobalAPI.listarMateriasGlobais('Confirmado'), MateriaGlobalAPI.listarSubMaterias(materiaGUID)])
      .then(([materias, subs]) => {
        setMateria(materias.find((m) => m.MateriaGlobalGUID === materiaGUID) || null);
        setSubmaterias(subs);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [materiaGUID]);

  const vestibularesKey = filtros.vestibulares.join(',');
  const anosKey = filtros.anos.join(',');
  const dificuldadesKey = filtros.dificuldades.join(',');

  useEffect(() => {
    QuestaoBancoAPI.contarQuestoesValidadas({
      vestibularGUIDs: expandirNomesBaseParaGUIDs(filtros.vestibulares),
      anos: filtros.anos,
      dificuldades: filtros.dificuldades,
    })
      .then(setContagem)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vestibularesKey, anosKey, dificuldadesKey, gruposVestibular.length]);

  const contagemPorSubMateria = useMemo(() => {
    const mapa = new Map<string, number>();
    contagem?.PorSubMateria.forEach((c) => mapa.set(c.SubMateriaGlobalGUID, c.Quantidade));
    return mapa;
  }, [contagem]);

  const totalMateria = useMemo(
    () => contagem?.PorMateria.find((c) => c.MateriaGlobalGUID === materiaGUID)?.Quantidade ?? 0,
    [contagem, materiaGUID]
  );

  const submateriasComQuestoes = useMemo(
    () => submaterias.filter((s) => (contagemPorSubMateria.get(s.SubMateriaGlobalGUID) ?? 0) > 0),
    [submaterias, contagemPorSubMateria]
  );

  const handleComecar = async (submateriaGUID?: string) => {
    setErro('');
    setCarregandoPratica(true);
    try {
      const resultado = await QuestaoBancoAPI.listarQuestoes({
        MateriaGlobalGUID: submateriaGUID ? undefined : materiaGUID,
        SubMateriaGlobalGUID: submateriaGUID,
        vestibularGUIDs: expandirNomesBaseParaGUIDs(filtros.vestibulares),
        anos: filtros.anos,
        dificuldades: filtros.dificuldades,
      });
      if (resultado.length === 0) {
        setErro('Nenhuma questão encontrada com esses filtros.');
        return;
      }
      setQuestoesPratica(embaralhar(resultado));
    } catch (e: any) {
      setErro(e.message || 'Erro ao buscar questões.');
    } finally {
      setCarregandoPratica(false);
    }
  };

  if (questoesPratica) {
    return (
      <div className={styles.container}>
        <PraticaQuestoes
          questoes={questoesPratica}
          textoBotaoFinal="Escolher outra submatéria"
          onTerminar={() => setQuestoesPratica(null)}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href={`/dashboard/${escolaGUID}/banco-questoes`} className={styles.linkVoltar}>
          <Icon name="chevron-left" />
          Voltar
        </Link>
        <h1 className={styles.titulo}>{materia?.Nome || 'Matéria'}</h1>
      </header>

      <BarraFiltrosBanco />

      <button
        type="button"
        className={styles.botaoTodasSubmaterias}
        onClick={() => handleComecar(undefined)}
        disabled={carregandoPratica || totalMateria === 0}
      >
        {carregandoPratica
          ? 'Carregando questões...'
          : `Praticar com todas as submatérias (${totalMateria} ${totalMateria === 1 ? 'questão' : 'questões'})`}
      </button>

      {erro && <p className={styles.erro}>{erro}</p>}

      {carregando && <Loader />}

      {!carregando && submateriasComQuestoes.length === 0 && (
        <p className={styles.vazio}>Nenhuma questão encontrada com esses filtros.</p>
      )}

      <div className={styles.grid}>
        {submateriasComQuestoes.map((s, indice) => (
          <CardSelecaoBanco
            key={s.SubMateriaGlobalGUID}
            onClick={() => handleComecar(s.SubMateriaGlobalGUID)}
            disabled={carregandoPratica}
            titulo={s.Nome}
            quantidade={contagemPorSubMateria.get(s.SubMateriaGlobalGUID) ?? 0}
            cor={paletaEscola[indice % paletaEscola.length]}
          />
        ))}
      </div>
    </div>
  );
}
