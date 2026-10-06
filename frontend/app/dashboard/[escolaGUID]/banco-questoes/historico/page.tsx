'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Icon } from '@/components/Icon';
import Loader from '@/components/Loader';
import * as QuestaoBancoAPI from '@/lib/api/questaobanco.api';
import styles from './page.module.css';

type Aba = 'Feitas' | 'Marcadas';

const DIFICULDADES: QuestaoBancoAPI.QuestaoBancoDificuldade[] = ['Facil', 'Media', 'Dificil'];

function formatarData(iso: string | null): string {
  if (!iso) return '';
  const data = new Date(iso);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' às ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function HistoricoQuestoesPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';

  const [aba, setAba] = useState<Aba>('Feitas');
  const [vestibulares, setVestibulares] = useState<QuestaoBancoAPI.Vestibular[]>([]);
  const [vestibularGUID, setVestibularGUID] = useState('');
  const [dificuldade, setDificuldade] = useState<QuestaoBancoAPI.QuestaoBancoDificuldade | ''>('');

  const [questoes, setQuestoes] = useState<QuestaoBancoAPI.QuestaoHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState<string | null>(null);

  useEffect(() => {
    QuestaoBancoAPI.listarVestibulares().then(setVestibulares).catch(() => {});
  }, []);

  const carregar = () => {
    setCarregando(true);
    setErro('');
    QuestaoBancoAPI.listarHistorico(aba, {
      VestibularGUID: vestibularGUID || undefined,
      Dificuldade: dificuldade || undefined,
    })
      .then(setQuestoes)
      .catch((e) => setErro(e.message || 'Erro ao carregar histórico.'))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, vestibularGUID, dificuldade]);

  const vestibularPorGUID = useMemo(() => {
    const mapa = new Map<string, string>();
    vestibulares.forEach((v) => mapa.set(v.VestibularGUID, v.Nome));
    return mapa;
  }, [vestibulares]);

  const handleRevisitar = async (guid: string) => {
    setProcessando(guid);
    try {
      await QuestaoBancoAPI.desmarcarFeita(guid);
      setQuestoes((atual) => atual.filter((q) => q.QuestaoBancoGUID !== guid));
    } catch (e: any) {
      setErro(e.message || 'Erro ao revisitar questão.');
    } finally {
      setProcessando(null);
    }
  };

  const handleDesmarcar = async (guid: string) => {
    setProcessando(guid);
    try {
      await QuestaoBancoAPI.definirMarcada(guid, false);
      setQuestoes((atual) => atual.filter((q) => q.QuestaoBancoGUID !== guid));
    } catch (e: any) {
      setErro(e.message || 'Erro ao desmarcar questão.');
    } finally {
      setProcessando(null);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href={`/dashboard/${escolaGUID}/banco-questoes`} className={styles.linkVoltar}>
          <Icon name="chevron-left" />
          Voltar pra prática
        </Link>
        <h1 className={styles.titulo}>Questões feitas e marcadas</h1>
      </header>

      <div className={styles.tabs}>
        <button
          className={aba === 'Feitas' ? styles.tabAtiva : styles.tab}
          onClick={() => setAba('Feitas')}
        >
          Feitas
        </button>
        <button
          className={aba === 'Marcadas' ? styles.tabAtiva : styles.tab}
          onClick={() => setAba('Marcadas')}
        >
          Marcadas
        </button>
      </div>

      <div className={styles.filtros}>
        <select className={styles.select} value={vestibularGUID} onChange={(e) => setVestibularGUID(e.target.value)}>
          <option value="">Todos os vestibulares</option>
          {vestibulares.map((v) => (
            <option key={v.VestibularGUID} value={v.VestibularGUID}>
              {v.Nome}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={dificuldade}
          onChange={(e) => setDificuldade(e.target.value as QuestaoBancoAPI.QuestaoBancoDificuldade | '')}
        >
          <option value="">Todas as dificuldades</option>
          {DIFICULDADES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {erro && <p className={styles.erro}>{erro}</p>}

      {carregando && <Loader />}

      {!carregando && questoes.length === 0 && (
        <p className={styles.vazio}>
          {aba === 'Feitas' ? 'Você ainda não resolveu nenhuma questão por aqui.' : 'Você ainda não marcou nenhuma questão.'}
        </p>
      )}

      <div className={styles.lista}>
        {questoes.map((q) => (
          <div
            key={q.QuestaoBancoGUID}
            className={`${styles.cardQuestao} ${
              aba === 'Feitas' ? (q.Acertou ? styles.cardAcerto : styles.cardErro) : ''
            }`}
          >
            <div className={styles.cardTopo}>
              <span className={styles.badgeDificuldade}>{q.Dificuldade}</span>
              {vestibularPorGUID.get(q.VestibularGUID) && (
                <span className={styles.badgeVestibular}>{vestibularPorGUID.get(q.VestibularGUID)}</span>
              )}
            </div>
            <p className={styles.previewTexto}>{q.EnunciadoPreview}</p>
            <div className={styles.cardRodape}>
              <span className={styles.dataTexto}>
                {aba === 'Feitas' ? `Feita em ${formatarData(q.FeitaEm)}` : `Marcada em ${formatarData(q.MarcadaEm)}`}
              </span>
              <button
                type="button"
                className={styles.botaoAcaoCard}
                disabled={processando === q.QuestaoBancoGUID}
                onClick={() => (aba === 'Feitas' ? handleRevisitar(q.QuestaoBancoGUID) : handleDesmarcar(q.QuestaoBancoGUID))}
              >
                {aba === 'Feitas' ? 'Revisitar' : 'Desmarcar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
