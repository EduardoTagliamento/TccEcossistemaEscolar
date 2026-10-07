'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/Icon';
import Loader from '@/components/Loader';
import { useCoresEscola } from '@/lib/theme/useCoresEscola';
import * as MateriaGlobalAPI from '@/lib/api/materiaglobal.api';
import * as QuestaoBancoAPI from '@/lib/api/questaobanco.api';
import { filtrosDeSearchParams } from '@/lib/bancoQuestoesFiltros';
import { useVestibularesAgrupados } from '@/lib/useVestibularesAgrupados';
import BarraFiltrosBanco from '@/components/banco-questoes/BarraFiltrosBanco';
import CardSelecaoBanco from '@/components/banco-questoes/CardSelecaoBanco';
import PraticaQuestoes from '@/components/banco-questoes/PraticaQuestoes';
import styles from './page.module.css';

/**
 * Tela inicial do Banco de Questões — grade de cards de matéria (cor da
 * escola, quantidade de questões Validadas abaixo, escondida se zerar) +
 * filtro de vestibular/ano/dificuldade. Clicar num card leva pra
 * [materiaGUID]/page.tsx (grade de submatéria), levando os filtros ativos.
 *
 * `?questaoGUID=` (link "refazer" do histórico) é um modo especial que pula
 * tudo isso e cai direto numa prática de 1 questão só — ver bloco no topo
 * do componente.
 */
export default function BancoQuestoesPage() {
  const params = useParams();
  const router = useRouter();
  const escolaGUID = (params?.escolaGUID as string) || '';
  const searchParams = useSearchParams();
  const questaoGUIDParaRefazer = searchParams?.get('questaoGUID') || '';
  const filtros = filtrosDeSearchParams(searchParams);
  const paletaEscola = useCoresEscola();
  const { grupos: gruposVestibular, expandirNomesBaseParaGUIDs } = useVestibularesAgrupados();

  const [materias, setMaterias] = useState<MateriaGlobalAPI.MateriaGlobal[]>([]);
  const [carregandoMaterias, setCarregandoMaterias] = useState(true);
  const [contagem, setContagem] = useState<QuestaoBancoAPI.ContagemQuestoes | null>(null);
  const [erro, setErro] = useState('');

  const [questaoSolo, setQuestaoSolo] = useState<QuestaoBancoAPI.QuestaoBanco | null>(null);
  const [carregandoSolo, setCarregandoSolo] = useState(false);

  useEffect(() => {
    if (!questaoGUIDParaRefazer) {
      setQuestaoSolo(null);
      return;
    }
    setCarregandoSolo(true);
    setErro('');
    QuestaoBancoAPI.buscarQuestao(questaoGUIDParaRefazer)
      .then(setQuestaoSolo)
      .catch((e) => setErro(e.message || 'Erro ao carregar questão.'))
      .finally(() => setCarregandoSolo(false));
  }, [questaoGUIDParaRefazer]);

  useEffect(() => {
    if (questaoGUIDParaRefazer) return;
    setCarregandoMaterias(true);
    MateriaGlobalAPI.listarMateriasGlobais('Confirmado')
      .then(setMaterias)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregandoMaterias(false));
  }, [questaoGUIDParaRefazer]);

  const vestibularesKey = filtros.vestibulares.join(',');
  const anosKey = filtros.anos.join(',');
  const dificuldadesKey = filtros.dificuldades.join(',');

  useEffect(() => {
    if (questaoGUIDParaRefazer) return;
    QuestaoBancoAPI.contarQuestoesValidadas({
      vestibularGUIDs: expandirNomesBaseParaGUIDs(filtros.vestibulares),
      anos: filtros.anos,
      dificuldades: filtros.dificuldades,
    })
      .then(setContagem)
      .catch(() => {
        // Sem contagem, os cards somem todos (fallback seguro — nunca mostra card com número errado).
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questaoGUIDParaRefazer, vestibularesKey, anosKey, dificuldadesKey, gruposVestibular.length]);

  const contagemPorMateria = useMemo(() => {
    const mapa = new Map<string, number>();
    contagem?.PorMateria.forEach((c) => mapa.set(c.MateriaGlobalGUID, c.Quantidade));
    return mapa;
  }, [contagem]);

  const materiasComQuestoes = useMemo(
    () => materias.filter((m) => (contagemPorMateria.get(m.MateriaGlobalGUID) ?? 0) > 0),
    [materias, contagemPorMateria]
  );

  const queryStringAtual = searchParams?.toString() || '';

  if (questaoGUIDParaRefazer) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.titulo}>
            <Icon name="award" className={styles.tituloIcone} />
            Banco de Questões
          </h1>
        </header>

        {carregandoSolo && <Loader />}

        {!carregandoSolo && erro && (
          <div className={styles.cardErroSolo}>
            <p className={styles.erro}>{erro}</p>
            <Link href={`/dashboard/${escolaGUID}/banco-questoes/historico`} className={styles.botaoPrimario}>
              Voltar pro histórico
            </Link>
          </div>
        )}

        {!carregandoSolo && questaoSolo && (
          <PraticaQuestoes
            questoes={[questaoSolo]}
            textoBotaoFinal="Voltar pro histórico"
            onTerminar={() => router.push(`/dashboard/${escolaGUID}/banco-questoes/historico`)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.titulo}>
          <Icon name="award" className={styles.tituloIcone} />
          Banco de Questões
        </h1>
        <p className={styles.subtitulo}>Escolha uma matéria pra praticar com questões de vestibular.</p>
        <Link href={`/dashboard/${escolaGUID}/banco-questoes/historico`} className={styles.linkHistorico}>
          <Icon name="clock" className={styles.linkHistoricoIcone} />
          Ver questões feitas e marcadas
        </Link>
      </header>

      <BarraFiltrosBanco />

      {erro && <p className={styles.erro}>{erro}</p>}

      {carregandoMaterias && <Loader />}

      {!carregandoMaterias && materiasComQuestoes.length === 0 && (
        <p className={styles.vazio}>Nenhuma questão encontrada com esses filtros.</p>
      )}

      <div className={styles.grid}>
        {materiasComQuestoes.map((m, indice) => (
          <CardSelecaoBanco
            key={m.MateriaGlobalGUID}
            href={`/dashboard/${escolaGUID}/banco-questoes/${m.MateriaGlobalGUID}${queryStringAtual ? `?${queryStringAtual}` : ''}`}
            titulo={m.Nome}
            quantidade={contagemPorMateria.get(m.MateriaGlobalGUID) ?? 0}
            cor={paletaEscola[indice % paletaEscola.length]}
          />
        ))}
      </div>
    </div>
  );
}
