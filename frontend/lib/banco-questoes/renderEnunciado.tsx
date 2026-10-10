import { ReactNode } from 'react';

const TOKEN_REGEX = /\*\*(.+?)\*\*|!\[([^\]]*)\]\(([^)]+)\)/g;

/** `**texto**` -> negrito; `![alt](url)` -> imagem inline (fórmula recortada que o extrator de
 * PDF não reconstrói como texto). Tamanho controlado via CSS (classe passada por quem chama),
 * não por hint na URL/alt — genérico pra qualquer imagem.
 *
 * Extraído de PraticaQuestoes.tsx pra ser compartilhado com o modal Tinder de montagem de
 * simulado (mesma formatação de enunciado nos dois lugares). */
export function renderInlineTokens(texto: string, keyPrefix: string, classeImagem: string): ReactNode[] {
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
        <img key={`${keyPrefix}-${idx++}`} src={match[3]} alt={match[2]} className={classeImagem} />
      );
    }
    lastIndex = TOKEN_REGEX.lastIndex;
  }
  if (lastIndex < texto.length) partes.push(texto.slice(lastIndex));
  return partes;
}

/** Parser mínimo pro Enunciado: `\n\n` separa parágrafos, `**texto**` vira negrito, `![alt](url)`
 * vira imagem inline. `classeParagrafo`/`classeImagem` vêm de quem chama (CSS modules diferentes
 * em cada tela). */
export function renderEnunciado(texto: string, classeParagrafo: string, classeImagem: string): ReactNode {
  return texto.split(/\n\n+/).map((paragrafo, i) => (
    <p key={i} className={classeParagrafo}>
      {renderInlineTokens(paragrafo, `p${i}`, classeImagem)}
    </p>
  ));
}
