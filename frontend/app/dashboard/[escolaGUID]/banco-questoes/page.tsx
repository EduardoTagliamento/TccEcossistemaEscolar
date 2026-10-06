'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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

const TOKEN_REGEX = /\*\*(.+?)\*\*|!\[([^\]]*)\]\(([^)]+)\)/g;

/** `**texto**` -> negrito; `![alt](url)` -> imagem inline (fórmula recortada
 * que o extrator de PDF não reconstrói como texto — ver coordenação com a
 * sessão de extração). Tamanho controlado via CSS (.enunciadoImagemInline),
 * não por hint na URL/alt — mantém o parser genérico pra qualquer imagem. */
function renderInlineTokens(texto: string, keyPrefix: string): ReactNode[] {
  const partes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = TOKEN_REGEX.exec(texto)) !== null) {
    if (match.index > lastIndex) partes.push(texto.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      partes.push(<strong key={`${keyPrefix}-${idx++}`}>{match[1]}</strong>);
    } else {
      partes.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`${keyPrefix}-${idx++}`} src={match[3]} alt={match[2]} className={styles.enunciadoImagemInline} />
      );
    }
    lastIndex = TOKEN_REGEX.lastIndex;
  }
  if (lastIndex < texto.length) partes.push(texto.slice(lastIndex));
  return partes;
}

/**
 * Parser mínimo pro Enunciado: `\n\n` separa parágrafos, `**texto**` vira
 * negrito, `![alt](url)` vira imagem inline. Suficiente pro caso real
 * (referência bibliográfica em negrito, fórmula recortada como imagem) sem
 * puxar uma lib de markdown inteira.
 */
function renderEnunciado(texto: string) {
  return texto.split(/\n\n+/).map((paragrafo, i) => (
    <p key={i} className={styles.enunciadoParagrafo}>
      {renderInlineTokens(paragrafo, `p${i}`)}
    </p>
  ));
}

type Etapa = 'selecao' | 'praticando' | 'resumo';

export default function BancoQuestoesPage() {
  const params = useParams();
  const router = useRouter();
  const escolaGUID = (params?.escolaGUID as string) || '';
  const searchParams = useSearchParams();
  const questaoGUIDParaRefazer = searchParams?.get('questaoGUID') || '';

  const [materias, setMaterias] = useState<MateriaGlobalAPI.MateriaGlobal[]>([]);
  const [carregandoMaterias, setCarregandoMaterias] = useState(true);
  const [materiaGUID, setMateriaGUID] = useState('');

  const [submaterias, setSubmaterias] = useState<MateriaGlobalAPI.SubMateriaGlobal[]>([]);
  const [carregandoSubmaterias, setCarregandoSubmaterias] = useState(false);
  const [submateriaGUID, setSubmateriaGUID] = useState('');
  const [todasSubmaterias, setTodasSubmaterias] = useState(false);
  const [contagem, setContagem] = useState<QuestaoBancoAPI.ContagemQuestoes | null>(null);

  const [etapa, setEtapa] = useState<Etapa>('selecao');
  const [carregandoQuestoes, setCarregandoQuestoes] = useState(false);
  const [erro, setErro] = useState('');
  const [questoes, setQuestoes] = useState<QuestaoBancoAPI.QuestaoBanco[]>([]);
  const [indice, setIndice] = useState(0);
  const [alternativaEscolhida, setAlternativaEscolhida] = useState<string | null>(null);
  const [respondida, setRespondida] = useState(false);
  const [acertos, setAcertos] = useState(0);
  const [marcadaAtual, setMarcadaAtual] = useState(false);
  const [modoIndividual, setModoIndividual] = useState(false);

  useEffect(() => {
    // "Refazer essa questão" a partir do histórico (?questaoGUID=) — pula a seleção de
    // matéria/submatéria e vai direto pra prática com só essa questão.
    if (questaoGUIDParaRefazer) {
      setModoIndividual(true);
      setCarregandoQuestoes(true);
      QuestaoBancoAPI.buscarQuestao(questaoGUIDParaRefazer)
        .then((questao) => {
          setQuestoes([questao]);
          setIndice(0);
          setAcertos(0);
          setAlternativaEscolhida(null);
          setRespondida(false);
          setEtapa('praticando');
        })
        .catch((e) => setErro(e.message || 'Erro ao carregar questão.'))
        .finally(() => setCarregandoQuestoes(false));
      return;
    }

    setCarregandoMaterias(true);
    MateriaGlobalAPI.listarMateriasGlobais('Confirmado')
      .then(setMaterias)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregandoMaterias(false));

    QuestaoBancoAPI.contarQuestoesValidadas()
      .then(setContagem)
      .catch(() => {
        // Não bloqueia a tela — sem contagem, os selects só mostram o nome puro (fallback natural).
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questaoGUIDParaRefazer]);

  const contagemPorMateria = useMemo(() => {
    const mapa = new Map<string, number>();
    contagem?.PorMateria.forEach((c) => mapa.set(c.MateriaGlobalGUID, c.Quantidade));
    return mapa;
  }, [contagem]);

  const contagemPorSubMateria = useMemo(() => {
    const mapa = new Map<string, number>();
    contagem?.PorSubMateria.forEach((c) => mapa.set(c.SubMateriaGlobalGUID, c.Quantidade));
    return mapa;
  }, [contagem]);

  useEffect(() => {
    setSubmateriaGUID('');
    setTodasSubmaterias(false);
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
    if (!todasSubmaterias && !submateriaGUID) return;
    setErro('');
    setCarregandoQuestoes(true);
    try {
      const resultado = await QuestaoBancoAPI.listarQuestoes(
        todasSubmaterias ? { MateriaGlobalGUID: materiaGUID } : { SubMateriaGlobalGUID: submateriaGUID }
      );
      if (resultado.length === 0) {
        setErro(
          todasSubmaterias
            ? 'Ainda não tem questões cadastradas pra essa matéria. Tenta outra!'
            : 'Ainda não tem questões cadastradas pra essa submatéria. Tenta outra!'
        );
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
    if (respondida || !questaoAtual) return;
    setAlternativaEscolhida(alternativaGUID);
    setRespondida(true);
    const alt = alternativasOrdenadas.find((a) => a.AlternativaGUID === alternativaGUID);
    const acertou = !!alt?.AlternativaCorreta;
    if (acertou) setAcertos((a) => a + 1);
    QuestaoBancoAPI.registrarResposta(questaoAtual.QuestaoBancoGUID, acertou).catch(() => {
      // Não bloqueia a prática por falha de tracking — só não entra no histórico/exclusão do pool.
    });
  };

  const handleToggleMarcada = () => {
    if (!questaoAtual) return;
    const novoValor = !marcadaAtual;
    setMarcadaAtual(novoValor);
    QuestaoBancoAPI.definirMarcada(questaoAtual.QuestaoBancoGUID, novoValor).catch(() => {
      setMarcadaAtual(!novoValor);
    });
  };

  const handleProxima = () => {
    setMarcadaAtual(false);
    if (indice + 1 >= questoes.length) {
      setEtapa('resumo');
      return;
    }
    setIndice((i) => i + 1);
    setAlternativaEscolhida(null);
    setRespondida(false);
  };

  const handleReiniciar = () => {
    if (modoIndividual) {
      router.push(`/dashboard/${escolaGUID}/banco-questoes/historico`);
      return;
    }
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
        <Link href={`/dashboard/${escolaGUID}/banco-questoes/historico`} className={styles.linkHistorico}>
          <Icon name="clock" className={styles.linkHistoricoIcone} />
          Ver questões feitas e marcadas
        </Link>
      </header>

      {etapa === 'selecao' && modoIndividual && (
        <div className={styles.card}>
          {erro ? (
            <>
              <p className={styles.erro}>{erro}</p>
              <Link href={`/dashboard/${escolaGUID}/banco-questoes/historico`} className={styles.botaoPrimario}>
                Voltar pro histórico
              </Link>
            </>
          ) : (
            <Loader />
          )}
        </div>
      )}

      {etapa === 'selecao' && !modoIndividual && (
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
                  {m.Nome} ({contagemPorMateria.get(m.MateriaGlobalGUID) ?? 0})
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
              disabled={!materiaGUID || carregandoSubmaterias || todasSubmaterias}
            >
              <option value="">{carregandoSubmaterias ? 'Carregando...' : 'Selecione a submatéria'}</option>
              {submaterias.map((s) => (
                <option key={s.SubMateriaGlobalGUID} value={s.SubMateriaGlobalGUID}>
                  {s.Nome} ({contagemPorSubMateria.get(s.SubMateriaGlobalGUID) ?? 0})
                </option>
              ))}
            </select>
          </label>

          <label className={styles.checkboxTodas}>
            <input
              type="checkbox"
              checked={todasSubmaterias}
              onChange={(e) => {
                setTodasSubmaterias(e.target.checked);
                setSubmateriaGUID('');
              }}
              disabled={!materiaGUID}
            />
            Praticar com todas as submatérias de uma vez
          </label>

          {erro && <p className={styles.erro}>{erro}</p>}

          <button
            className={styles.botaoPrimario}
            onClick={handleComecar}
            disabled={(!todasSubmaterias && !submateriaGUID) || carregandoQuestoes}
          >
            {carregandoQuestoes ? 'Carregando questões...' : 'Começar a praticar'}
          </button>
        </div>
      )}

      {etapa === 'praticando' && questaoAtual && (
        <div className={styles.card}>
          <div className={styles.progresso}>
            <span>Questão {indice + 1} de {questoes.length}</span>
            <div className={styles.progressoAcoes}>
              <span className={styles.badgeDificuldade}>{questaoAtual.Dificuldade}</span>
              <button
                type="button"
                className={marcadaAtual ? styles.botaoMarcarAtivo : styles.botaoMarcar}
                onClick={handleToggleMarcada}
                title={marcadaAtual ? 'Remover marcação' : 'Marcar pra ver depois'}
              >
                <Icon name="star" />
              </button>
            </div>
          </div>

          <div className={styles.enunciado}>{renderEnunciado(questaoAtual.Enunciado)}</div>

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
            {modoIndividual ? 'Voltar pro histórico' : 'Praticar outra submatéria'}
          </button>
        </div>
      )}

      {!modoIndividual && carregandoMaterias && etapa === 'selecao' && materias.length === 0 && <Loader />}
    </div>
  );
}
