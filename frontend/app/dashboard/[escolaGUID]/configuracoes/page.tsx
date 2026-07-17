'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

import * as EscolaConfiguracaoAPI from '@/lib/api/escolaconfiguracao.api';
import { DIAS_SEMANA, DIA_SEMANA_LABEL, DiaSemana, Intervalo } from '@/lib/api/escolaconfiguracao.api';

interface IntervaloLinha {
  IntervaloInicio: string;
  IntervaloFim: string;
}

export default function ConfiguracoesEscolaPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [avisos, setAvisos] = useState<string[]>([]);

  const [minutosPorAula, setMinutosPorAula] = useState(50);
  const [diasSemana, setDiasSemana] = useState<DiaSemana[]>(['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta']);
  const [periodoManhaInicio, setPeriodoManhaInicio] = useState('07:00');
  const [periodoManhaFim, setPeriodoManhaFim] = useState('12:20');
  const [temAulaTarde, setTemAulaTarde] = useState(false);
  const [periodoTardeInicio, setPeriodoTardeInicio] = useState('13:00');
  const [periodoTardeFim, setPeriodoTardeFim] = useState('17:00');
  const [intervaloVariado, setIntervaloVariado] = useState(false);

  // Modo fixo: uma lista única de intervalos, aplicada a todos os dias letivos
  const [intervalosFixos, setIntervalosFixos] = useState<IntervaloLinha[]>([
    { IntervaloInicio: '09:50', IntervaloFim: '10:05' },
  ]);

  // Modo variado: uma lista de intervalos por dia da semana
  const [intervalosPorDia, setIntervalosPorDia] = useState<Record<string, IntervaloLinha[]>>({});

  useEffect(() => {
    if (escolaGUID) {
      carregarConfiguracao();
    }
  }, [escolaGUID]);

  const carregarConfiguracao = async () => {
    try {
      setCarregando(true);
      setErro('');

      const config = await EscolaConfiguracaoAPI.obterConfiguracao(escolaGUID);

      setMinutosPorAula(config.MinutosPorAula);
      setDiasSemana(config.DiasSemana);
      setPeriodoManhaInicio(config.PeriodoManhaInicio);
      setPeriodoManhaFim(config.PeriodoManhaFim);
      setTemAulaTarde(config.TemAulaTarde);
      setPeriodoTardeInicio(config.PeriodoTardeInicio || '13:00');
      setPeriodoTardeFim(config.PeriodoTardeFim || '17:00');
      setIntervaloVariado(config.IntervaloVariado);

      if (config.IntervaloVariado) {
        setIntervalosPorDia(agruparIntervalosPorDia(config.Intervalos));
      } else {
        const fixos = config.Intervalos.map((i) => ({
          IntervaloInicio: i.IntervaloInicio,
          IntervaloFim: i.IntervaloFim,
        }));
        setIntervalosFixos(fixos.length > 0 ? fixos : [{ IntervaloInicio: '09:50', IntervaloFim: '10:05' }]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar configuração da escola:', err);
      setErro(err.message || 'Erro ao carregar configuração da escola');
    } finally {
      setCarregando(false);
    }
  };

  const agruparIntervalosPorDia = (intervalos: Intervalo[]): Record<string, IntervaloLinha[]> => {
    const mapa: Record<string, IntervaloLinha[]> = {};
    intervalos.forEach((i) => {
      if (!i.DiaSemana) return;
      if (!mapa[i.DiaSemana]) mapa[i.DiaSemana] = [];
      mapa[i.DiaSemana].push({ IntervaloInicio: i.IntervaloInicio, IntervaloFim: i.IntervaloFim });
    });
    return mapa;
  };

  const alternarDia = (dia: DiaSemana) => {
    setDiasSemana((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : DIAS_SEMANA.filter((d) => prev.includes(d) || d === dia)
    );
  };

  const alternarIntervaloVariado = (novoValor: boolean) => {
    if (novoValor && Object.keys(intervalosPorDia).length === 0) {
      // Ao ligar "variado" pela primeira vez, usa os intervalos fixos como ponto de partida para cada dia letivo
      const preenchido: Record<string, IntervaloLinha[]> = {};
      diasSemana.forEach((dia) => {
        preenchido[dia] = intervalosFixos.map((i) => ({ ...i }));
      });
      setIntervalosPorDia(preenchido);
    }
    setIntervaloVariado(novoValor);
  };

  // ===== Handlers: intervalos fixos =====
  const adicionarIntervaloFixo = () => {
    setIntervalosFixos((prev) => [...prev, { IntervaloInicio: '', IntervaloFim: '' }]);
  };

  const removerIntervaloFixo = (index: number) => {
    setIntervalosFixos((prev) => prev.filter((_, i) => i !== index));
  };

  const atualizarIntervaloFixo = (index: number, campo: keyof IntervaloLinha, valor: string) => {
    setIntervalosFixos((prev) => prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
  };

  // ===== Handlers: intervalos por dia =====
  const adicionarIntervaloDia = (dia: DiaSemana) => {
    setIntervalosPorDia((prev) => ({
      ...prev,
      [dia]: [...(prev[dia] || []), { IntervaloInicio: '', IntervaloFim: '' }],
    }));
  };

  const removerIntervaloDia = (dia: DiaSemana, index: number) => {
    setIntervalosPorDia((prev) => ({
      ...prev,
      [dia]: (prev[dia] || []).filter((_, i) => i !== index),
    }));
  };

  const atualizarIntervaloDia = (dia: DiaSemana, index: number, campo: keyof IntervaloLinha, valor: string) => {
    setIntervalosPorDia((prev) => ({
      ...prev,
      [dia]: (prev[dia] || []).map((item, i) => (i === index ? { ...item, [campo]: valor } : item)),
    }));
  };

  const previewSlots = useMemo(() => {
    if (!periodoManhaInicio || !periodoManhaFim || minutosPorAula <= 0) return [];

    const linhas: string[] = [];
    const calcularQtdAulas = (inicio: string, fim: string) => {
      const [hI, mI] = inicio.split(':').map(Number);
      const [hF, mF] = fim.split(':').map(Number);
      const totalMin = hF * 60 + mF - (hI * 60 + mI);
      return Math.max(0, Math.floor(totalMin / minutosPorAula));
    };

    linhas.push(`Manhã (${periodoManhaInicio}–${periodoManhaFim}): ${calcularQtdAulas(periodoManhaInicio, periodoManhaFim)} aulas de ${minutosPorAula}min`);
    if (temAulaTarde && periodoTardeInicio && periodoTardeFim) {
      linhas.push(`Tarde (${periodoTardeInicio}–${periodoTardeFim}): ${calcularQtdAulas(periodoTardeInicio, periodoTardeFim)} aulas de ${minutosPorAula}min`);
    }
    return linhas;
  }, [periodoManhaInicio, periodoManhaFim, temAulaTarde, periodoTardeInicio, periodoTardeFim, minutosPorAula]);

  const montarIntervalosParaEnvio = (): Intervalo[] => {
    if (!intervaloVariado) {
      return intervalosFixos
        .filter((i) => i.IntervaloInicio && i.IntervaloFim)
        .map((i) => ({ DiaSemana: null, IntervaloInicio: i.IntervaloInicio, IntervaloFim: i.IntervaloFim }));
    }

    const resultado: Intervalo[] = [];
    diasSemana.forEach((dia) => {
      (intervalosPorDia[dia] || [])
        .filter((i) => i.IntervaloInicio && i.IntervaloFim)
        .forEach((i) => {
          resultado.push({ DiaSemana: dia, IntervaloInicio: i.IntervaloInicio, IntervaloFim: i.IntervaloFim });
        });
    });
    return resultado;
  };

  const handleSalvar = async () => {
    try {
      setSalvando(true);
      setErro('');
      setAvisos([]);

      if (diasSemana.length === 0) {
        setErro('Selecione ao menos um dia da semana com aula.');
        return;
      }

      const resultado = await EscolaConfiguracaoAPI.salvarConfiguracao(escolaGUID, {
        MinutosPorAula: minutosPorAula,
        DiasSemana: diasSemana,
        PeriodoManhaInicio: periodoManhaInicio,
        PeriodoManhaFim: periodoManhaFim,
        TemAulaTarde: temAulaTarde,
        PeriodoTardeInicio: temAulaTarde ? periodoTardeInicio : null,
        PeriodoTardeFim: temAulaTarde ? periodoTardeFim : null,
        IntervaloVariado: intervaloVariado,
        Intervalos: montarIntervalosParaEnvio(),
      });

      setAvisos(resultado.avisos);
      alert('Configurações da escola salvas com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar configuração da escola:', err);
      setErro(err.message || 'Erro ao salvar configuração da escola');
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>⏰ Configurações da Escola</h1>
          <p className={styles.subtitulo}>
            Defina os parâmetros de horário letivo usados no cronograma das turmas
          </p>
        </div>
        <Link href={`/dashboard/${escolaGUID}`} className={styles.botaoVoltar}>
          ← Voltar
        </Link>
      </div>

      {erro && <div className={styles.erro}>{erro}</div>}

      {avisos.length > 0 && (
        <div className={styles.avisos}>
          <div className={styles.avisosTitulo}>⚠️ Avisos (não impedem o salvamento)</div>
          <ul className={styles.avisosLista}>
            {avisos.map((aviso, idx) => (
              <li key={idx}>{aviso}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.secao}>
        <h2 className={styles.secaoTitulo}>Duração da aula</h2>
        <div className={styles.campoContainer}>
          <label className={styles.label}>Minutos por aula</label>
          <input
            type="number"
            min={10}
            max={180}
            className={styles.input}
            value={minutosPorAula}
            onChange={(e) => setMinutosPorAula(parseInt(e.target.value, 10) || 0)}
          />
        </div>
      </div>

      <div className={styles.secao}>
        <h2 className={styles.secaoTitulo}>Dias da semana com aula</h2>
        <div className={styles.diasSemanaGrid}>
          {DIAS_SEMANA.map((dia) => (
            <div
              key={dia}
              className={`${styles.diaChip} ${diasSemana.includes(dia) ? styles.diaChipAtivo : ''}`}
              onClick={() => alternarDia(dia)}
            >
              <input type="checkbox" checked={diasSemana.includes(dia)} readOnly />
              {DIA_SEMANA_LABEL[dia]}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.secao}>
        <h2 className={styles.secaoTitulo}>Período da manhã</h2>
        <div className={styles.linhaHorarios}>
          <input
            type="time"
            className={styles.input}
            value={periodoManhaInicio}
            onChange={(e) => setPeriodoManhaInicio(e.target.value)}
          />
          <span className={styles.ate}>até</span>
          <input
            type="time"
            className={styles.input}
            value={periodoManhaFim}
            onChange={(e) => setPeriodoManhaFim(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.secao}>
        <div className={styles.checkboxLinha}>
          <input
            type="checkbox"
            id="temAulaTarde"
            checked={temAulaTarde}
            onChange={(e) => setTemAulaTarde(e.target.checked)}
          />
          <label htmlFor="temAulaTarde">Esta escola também tem aula à tarde</label>
        </div>

        {temAulaTarde && (
          <div className={styles.linhaHorarios}>
            <input
              type="time"
              className={styles.input}
              value={periodoTardeInicio}
              onChange={(e) => setPeriodoTardeInicio(e.target.value)}
            />
            <span className={styles.ate}>até</span>
            <input
              type="time"
              className={styles.input}
              value={periodoTardeFim}
              onChange={(e) => setPeriodoTardeFim(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className={styles.secao}>
        <div className={styles.checkboxLinha}>
          <input
            type="checkbox"
            id="intervaloVariado"
            checked={intervaloVariado}
            onChange={(e) => alternarIntervaloVariado(e.target.checked)}
          />
          <label htmlFor="intervaloVariado">O horário do intervalo varia de acordo com o dia da semana</label>
        </div>

        {!intervaloVariado && (
          <div className={styles.intervaloBloco}>
            <div className={styles.intervaloBlocoTitulo}>Intervalo(s) fixo(s), repetidos todos os dias letivos</div>
            {intervalosFixos.map((intervalo, index) => (
              <div key={index} className={styles.intervaloLinha}>
                <input
                  type="time"
                  className={styles.input}
                  value={intervalo.IntervaloInicio}
                  onChange={(e) => atualizarIntervaloFixo(index, 'IntervaloInicio', e.target.value)}
                />
                <span className={styles.ate}>até</span>
                <input
                  type="time"
                  className={styles.input}
                  value={intervalo.IntervaloFim}
                  onChange={(e) => atualizarIntervaloFixo(index, 'IntervaloFim', e.target.value)}
                />
                <button type="button" className={styles.botaoRemover} onClick={() => removerIntervaloFixo(index)}>
                  Remover
                </button>
              </div>
            ))}
            <button type="button" className={styles.botaoAdicionar} onClick={adicionarIntervaloFixo}>
              + Adicionar intervalo
            </button>
          </div>
        )}

        {intervaloVariado &&
          diasSemana.map((dia) => (
            <div key={dia} className={styles.intervaloBloco}>
              <div className={styles.intervaloBlocoTitulo}>{DIA_SEMANA_LABEL[dia]}</div>
              {(intervalosPorDia[dia] || []).map((intervalo, index) => (
                <div key={index} className={styles.intervaloLinha}>
                  <input
                    type="time"
                    className={styles.input}
                    value={intervalo.IntervaloInicio}
                    onChange={(e) => atualizarIntervaloDia(dia, index, 'IntervaloInicio', e.target.value)}
                  />
                  <span className={styles.ate}>até</span>
                  <input
                    type="time"
                    className={styles.input}
                    value={intervalo.IntervaloFim}
                    onChange={(e) => atualizarIntervaloDia(dia, index, 'IntervaloFim', e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.botaoRemover}
                    onClick={() => removerIntervaloDia(dia, index)}
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button type="button" className={styles.botaoAdicionar} onClick={() => adicionarIntervaloDia(dia)}>
                + Adicionar intervalo de {DIA_SEMANA_LABEL[dia]}
              </button>
            </div>
          ))}
      </div>

      {previewSlots.length > 0 && (
        <div className={styles.secao}>
          <h2 className={styles.secaoTitulo}>Prévia da grade de aulas</h2>
          <div className={styles.preview}>
            {previewSlots.map((linha, idx) => (
              <div key={idx} className={styles.previewLinha}>
                <span>{linha}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.rodape}>
        <button type="button" className={styles.botaoSalvar} onClick={handleSalvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}
