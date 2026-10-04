'use client';

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import Loader from '@/components/Loader';
import * as MateriaGlobalAPI from '@/lib/api/materiaglobal.api';
import * as QuestaoBancoAPI from '@/lib/api/questaobanco.api';
import styles from './page.module.css';

function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

type Etapa = 'selecao' | 'praticando' | 'resumo';

export default function BancoQuestoesPage() {
  const [materias, setMaterias] = useState<MateriaGlobalAPI.MateriaGlobal[]>([]);
  const [carregandoMaterias, setCarregandoMaterias] = useState(true);
  const [materiaGUID, setMateriaGUID] = useState('');

  const [submaterias, setSubmaterias] = useState<MateriaGlobalAPI.SubMateriaGlobal[]>([]);
  const [carregandoSubmaterias, setCarregandoSubmaterias] = useState(false);
  const [submateriaGUID, setSubmateriaGUID] = useState('');

  const [etapa, setEtapa] = useState<Etapa>('selecao');
  const [carregandoQuestoes, setCarregandoQuestoes] = useState(false);
  const [erro, setErro] = useState('');
  const [questoes, setQuestoes] = useState<QuestaoBancoAPI.QuestaoBanco[]>([]);
  const [indice, setIndice] = useState(0);
  const [alternativaEscolhida, setAlternativaEscolhida] = useState<string | null>(null);
  const [respondida, setRespondida] = useState(false);
  const [acertos, setAcertos] = useState(0);

  useEffect(() => {
    setCarregandoMaterias(true);
    MateriaGlobalAPI.listarMateriasGlobais('Confirmado')
      .then(setMaterias)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregandoMaterias(false));
  }, []);

  useEffect(() => {
    setSubmateriaGUID('');
    if (!materiaGUID) {
      setSubmaterias([]);
      return;
    }
    setCarregandoSubmaterias(true);
    MateriaGlobalAPI.listarSubMaterias(materiaGUID)
      .then(setSubmaterias)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregandoSubmaterias(false));
  }, [materiaGUID]);

  const questaoAtual = questoes[indice] || null;

  const alternativasOrdenadas = useMemo(() => {
    if (!questaoAtual) return [];
    return [...questaoAtual.Alternativas].sort((a, b) => a.AlternativaOrdem - b.AlternativaOrdem);
  }, [questaoAtual]);

  const handleComecar = async () => {
    if (!submateriaGUID) return;
    setErro('');
    setCarregandoQuestoes(true);
    try {
      const resultado = await QuestaoBancoAPI.listarQuestoes({ SubMateriaGlobalGUID: submateriaGUID });
      if (resultado.length === 0) {
        setErro('Ainda não tem questões cadastradas pra essa submatéria. Tenta outra!');
        return;
      }
      setQuestoes(embaralhar(resultado));
      setIndice(0);
      setAcertos(0);
      setAlternativaEscolhida(null);
      setRespondida(false);
      setEtapa('praticando');
    } catch (e: any) {
      setErro(e.message || 'Erro ao buscar questões.');
    } finally {
      setCarregandoQuestoes(false);
    }
  };

  const handleResponder = (alternativaGUID: string) => {
    if (respondida) return;
    setAlternativaEscolhida(alternativaGUID);
    setRespondida(true);
    const alt = alternativasOrdenadas.find((a) => a.AlternativaGUID === alternativaGUID);
    if (alt?.AlternativaCorreta) setAcertos((a) => a + 1);
  };

  const handleProxima = () => {
    if (indice + 1 >= questoes.length) {
      setEtapa('resumo');
      return;
    }
    setIndice((i) => i + 1);
    setAlternativaEscolhida(null);
    setRespondida(false);
  };

  const handleReiniciar = () => {
    setEtapa('selecao');
    setQuestoes([]);
    setErro('');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.titulo}>
          <Icon name="award" className={styles.tituloIcone} />
          Banco de Questões
        </h1>
        <p className={styles.subtitulo}>Escolha uma matéria e uma submatéria pra praticar com questões de vestibular.</p>
      </header>

      {etapa === 'selecao' && (
        <div className={styles.card}>
          <label className={styles.campo}>
            <span className={styles.rotulo}>Matéria</span>
            <select
              className={styles.select}
              value={materiaGUID}
              onChange={(e) => setMateriaGUID(e.target.value)}
              disabled={carregandoMaterias}
            >
              <option value="">{carregandoMaterias ? 'Carregando...' : 'Selecione a matéria'}</option>
              {materias.map((m) => (
                <option key={m.MateriaGlobalGUID} value={m.MateriaGlobalGUID}>
                  {m.Nome}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.campo}>
            <span className={styles.rotulo}>Submatéria</span>
            <select
              className={styles.select}
              value={submateriaGUID}
              onChange={(e) => setSubmateriaGUID(e.target.value)}
              disabled={!materiaGUID || carregandoSubmaterias}
            >
              <option value="">{carregandoSubmaterias ? 'Carregando...' : 'Selecione a submatéria'}</option>
              {submaterias.map((s) => (
                <option key={s.SubMateriaGlobalGUID} value={s.SubMateriaGlobalGUID}>
                  {s.Nome}
                </option>
              ))}
            </select>
          </label>

          {erro && <p className={styles.erro}>{erro}</p>}

          <button
            className={styles.botaoPrimario}
            onClick={handleComecar}
            disabled={!submateriaGUID || carregandoQuestoes}
          >
            {carregandoQuestoes ? 'Carregando questões...' : 'Começar a praticar'}
          </button>
        </div>
      )}

      {etapa === 'praticando' && questaoAtual && (
        <div className={styles.card}>
          <div className={styles.progresso}>
            <span>Questão {indice + 1} de {questoes.length}</span>
            <span className={styles.badgeDificuldade}>{questaoAtual.Dificuldade}</span>
          </div>

          <p className={styles.enunciado}>{questaoAtual.Enunciado}</p>

          {questaoAtual.Anexos.length > 0 && (
            <div className={styles.anexos}>
              {questaoAtual.Anexos.map((a) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={a.AnexoGUID} src={a.AnexoCaminho} alt={a.AnexoNomeOriginal || 'Imagem da questão'} className={styles.anexoImagem} />
              ))}
            </div>
          )}

          <div className={styles.alternativas}>
            {alternativasOrdenadas.map((alt, i) => {
              const letra = String.fromCharCode(65 + i);
              const isEscolhida = alternativaEscolhida === alt.AlternativaGUID;
              let classe = styles.alternativa;
              if (respondida && alt.AlternativaCorreta) classe += ` ${styles.alternativaCorreta}`;
              else if (respondida && isEscolhida && !alt.AlternativaCorreta) classe += ` ${styles.alternativaErrada}`;

              return (
                <button
                  key={alt.AlternativaGUID}
                  className={classe}
                  onClick={() => handleResponder(alt.AlternativaGUID)}
                  disabled={respondida}
                >
                  <span className={styles.alternativaLetra}>{letra}</span>
                  <span className={styles.alternativaTexto}>{alt.AlternativaTexto}</span>
                  {alt.Anexos.length > 0 && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={alt.Anexos[0].AnexoCaminho} alt="" className={styles.alternativaImagem} />
                  )}
                  {respondida && alt.AlternativaCorreta && <Icon name="check-circle" className={styles.alternativaIcone} />}
                </button>
              );
            })}
          </div>

          {respondida && (
            <div className={styles.feedback}>
              <p className={alternativasOrdenadas.find((a) => a.AlternativaGUID === alternativaEscolhida)?.AlternativaCorreta ? styles.feedbackAcerto : styles.feedbackErro}>
                {alternativasOrdenadas.find((a) => a.AlternativaGUID === alternativaEscolhida)?.AlternativaCorreta
                  ? 'Acertou! 🎉'
                  : 'Não foi essa. Confira o gabarito marcado em verde.'}
              </p>
              {questaoAtual.VideoResolucaoUrl && (
                <a href={questaoAtual.VideoResolucaoUrl} target="_blank" rel="noopener noreferrer" className={styles.linkResolucao}>
                  Ver resolução em vídeo
                </a>
              )}
              <button className={styles.botaoPrimario} onClick={handleProxima}>
                {indice + 1 >= questoes.length ? 'Ver resultado' : 'Próxima questão'}
              </button>
            </div>
          )}
        </div>
      )}

      {etapa === 'resumo' && (
        <div className={styles.card}>
          <Icon name="award" className={styles.resumoIcone} />
          <h2 className={styles.resumoTitulo}>Você acertou {acertos} de {questoes.length}!</h2>
          <p className={styles.subtitulo}>
            {acertos === questoes.length ? 'Mandou muito bem, gabaritou!' : 'Continue praticando pra melhorar ainda mais.'}
          </p>
          <button className={styles.botaoPrimario} onClick={handleReiniciar}>
            Praticar outra submatéria
          </button>
        </div>
      )}

      {carregandoMaterias && etapa === 'selecao' && materias.length === 0 && <Loader />}
    </div>
  );
}
