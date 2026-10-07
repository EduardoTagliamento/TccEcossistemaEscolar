'use client';

import { ReactNode, useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import * as QuestaoBancoAPI from '@/lib/api/questaobanco.api';
import styles from './PraticaQuestoes.module.css';

const TOKEN_REGEX = /\*\*(.+?)\*\*|!\[([^\]]*)\]\(([^)]+)\)/g;

/** `**texto**` -> negrito; `![alt](url)` -> imagem inline (fórmula recortada
 * que o extrator de PDF não reconstrói como texto). Tamanho controlado via
 * CSS (.enunciadoImagemInline), não por hint na URL/alt — genérico pra
 * qualquer imagem. */
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
 * negrito, `![alt](url)` vira imagem inline.
 */
function renderEnunciado(texto: string) {
  return texto.split(/\n\n+/).map((paragrafo, i) => (
    <p key={i} className={styles.enunciadoParagrafo}>
      {renderInlineTokens(paragrafo, `p${i}`)}
    </p>
  ));
}

interface PraticaQuestoesProps {
  questoes: QuestaoBancoAPI.QuestaoBanco[];
  /** Texto do botão final na tela de resumo (ex.: "Voltar pro histórico", "Escolher outra submatéria"). */
  textoBotaoFinal: string;
  onTerminar: () => void;
}

/**
 * Tela de prática em si (progresso/enunciado/alternativas/feedback/resumo) —
 * extraído pra componente compartilhado porque dois fluxos entram aqui com
 * conjuntos de questões diferentes: a prática normal (matéria/submatéria
 * escolhida, home -> [materiaGUID]) e "refazer individualmente" a partir do
 * histórico (1 questão só, direto na home). Sem isso duplicaria ~200 linhas
 * de JSX entre as duas páginas.
 */
export default function PraticaQuestoes({ questoes, textoBotaoFinal, onTerminar }: PraticaQuestoesProps) {
  const [etapa, setEtapa] = useState<'praticando' | 'resumo'>('praticando');
  const [indice, setIndice] = useState(0);
  const [alternativaEscolhida, setAlternativaEscolhida] = useState<string | null>(null);
  const [respondida, setRespondida] = useState(false);
  const [acertos, setAcertos] = useState(0);
  const [marcadaAtual, setMarcadaAtual] = useState(false);

  const questaoAtual = questoes[indice] || null;

  const alternativasOrdenadas = useMemo(() => {
    if (!questaoAtual) return [];
    return [...questaoAtual.Alternativas].sort((a, b) => a.AlternativaOrdem - b.AlternativaOrdem);
  }, [questaoAtual]);

  /** Só seleciona — não confirma. Confirmar é uma ação separada (botão "Responder" embaixo),
   * pra evitar clique acidental decidir a questão sozinho. */
  const handleSelecionar = (alternativaGUID: string) => {
    if (respondida) return;
    setAlternativaEscolhida(alternativaGUID);
  };

  const handleConfirmarResposta = () => {
    if (respondida || !questaoAtual || !alternativaEscolhida) return;
    setRespondida(true);
    const alt = alternativasOrdenadas.find((a) => a.AlternativaGUID === alternativaEscolhida);
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

  if (etapa === 'resumo') {
    return (
      <div className={styles.card}>
        <Icon name="award" className={styles.resumoIcone} />
        <h2 className={styles.resumoTitulo}>Você acertou {acertos} de {questoes.length}!</h2>
        <p className={styles.subtitulo}>
          {acertos === questoes.length ? 'Mandou muito bem, gabaritou!' : 'Continue praticando pra melhorar ainda mais.'}
        </p>
        <button className={styles.botaoPrimario} onClick={onTerminar}>
          {textoBotaoFinal}
        </button>
      </div>
    );
  }

  if (!questaoAtual) return null;

  return (
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
          else if (!respondida && isEscolhida) classe += ` ${styles.alternativaSelecionada}`;

          return (
            <button
              key={alt.AlternativaGUID}
              className={classe}
              onClick={() => handleSelecionar(alt.AlternativaGUID)}
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

      {!respondida && (
        <button
          type="button"
          className={styles.botaoPrimario}
          onClick={handleConfirmarResposta}
          disabled={!alternativaEscolhida}
        >
          Responder
        </button>
      )}

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
  );
}
