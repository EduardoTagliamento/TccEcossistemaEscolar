/**
 * Similaridade de string sem dependência nova — coeficiente de Dice sobre
 * bigramas de caracteres, depois de normalizar (minúsculo, sem acento, sem
 * pontuação). Determinístico e instantâneo, usado como primeira camada do
 * mapeamento `Materia → MateriaGlobal` (spec §3.7 do bakeoff) antes de
 * qualquer chamada de LLM.
 */

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (marcas diacríticas combinantes)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function bigramas(texto: string): string[] {
  const normalizado = normalizar(texto);
  if (normalizado.length < 2) return [normalizado];

  const pares: string[] = [];
  for (let i = 0; i < normalizado.length - 1; i++) {
    pares.push(normalizado.slice(i, i + 2));
  }
  return pares;
}

/** Coeficiente de Dice: 2 * |interseção| / (|A| + |B|), entre 0 e 1. */
export function similaridadeDice(a: string, b: string): number {
  const normA = normalizar(a);
  const normB = normalizar(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  const bigramasA = bigramas(normA);
  const bigramasB = [...bigramas(normB)];

  let intersecao = 0;
  for (const bigrama of bigramasA) {
    const indice = bigramasB.indexOf(bigrama);
    if (indice !== -1) {
      intersecao++;
      bigramasB.splice(indice, 1);
    }
  }

  return (2 * intersecao) / (bigramasA.length + bigramasB.length + intersecao);
}

export interface CandidatoSimilaridade<T> {
  item: T;
  score: number;
}

/** Ordena `candidatos` por similaridade com `referencia`, do mais parecido pro menos. */
export function ordenarPorSimilaridade<T>(
  referencia: string,
  candidatos: T[],
  extrairNome: (item: T) => string
): CandidatoSimilaridade<T>[] {
  return candidatos
    .map((item) => ({ item, score: similaridadeDice(referencia, extrairNome(item)) }))
    .sort((a, b) => b.score - a.score);
}
