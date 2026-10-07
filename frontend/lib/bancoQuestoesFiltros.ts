import { QuestaoBancoDificuldade } from './api/questaobanco.api';

/** Filtros multi-seleção da tela de prática (spec 07/10) — vivem na URL (query string), não em
 * estado local, pra sobreviver navegação (home -> matéria) e pro clique no ícone do nav voltar
 * pra home sem filtro nenhum (URL sem query = sem filtro).
 *
 * `vestibulares` guarda NOMES-BASE (ex.: "ENEM", sem o ano — spec 07/10: o filtro de vestibular
 * não deve listar "ENEM 2017"/"ENEM 2018" como opções separadas, isso é o filtro de Ano), não
 * VestibularGUIDs — quem consulta a API precisa expandir nome-base -> GUIDs antes, via
 * `useVestibularesAgrupados().expandirNomesBaseParaGUIDs`. */
export interface FiltrosSelecao {
  vestibulares: string[];
  anos: number[];
  dificuldades: QuestaoBancoDificuldade[];
}

export function filtrosVazios(): FiltrosSelecao {
  return { vestibulares: [], anos: [], dificuldades: [] };
}

function parseLista(valor: string | null): string[] {
  return valor ? valor.split(',').filter(Boolean) : [];
}

export function filtrosDeSearchParams(searchParams: { get(nome: string): string | null } | null): FiltrosSelecao {
  if (!searchParams) return filtrosVazios();
  return {
    vestibulares: parseLista(searchParams.get('vestibulares')),
    anos: parseLista(searchParams.get('anos')).map(Number).filter((n) => Number.isFinite(n)),
    dificuldades: parseLista(searchParams.get('dificuldades')) as QuestaoBancoDificuldade[],
  };
}

/** Preserva outros query params já na URL (ex.: nenhum hoje, mas evita surpresa futura) —
 * substitui só as 3 chaves de filtro. */
export function aplicarFiltrosNaQueryString(searchParamsAtual: URLSearchParams, filtros: FiltrosSelecao): string {
  const params = new URLSearchParams(searchParamsAtual);
  params.delete('vestibulares');
  params.delete('anos');
  params.delete('dificuldades');
  if (filtros.vestibulares.length > 0) params.set('vestibulares', filtros.vestibulares.join(','));
  if (filtros.anos.length > 0) params.set('anos', filtros.anos.join(','));
  if (filtros.dificuldades.length > 0) params.set('dificuldades', filtros.dificuldades.join(','));
  return params.toString();
}

export function contarFiltrosAtivos(filtros: FiltrosSelecao): number {
  return filtros.vestibulares.length + filtros.anos.length + filtros.dificuldades.length;
}

export const DIFICULDADE_LABEL: Record<QuestaoBancoDificuldade, string> = {
  Facil: 'Fácil',
  Media: 'Média',
  Dificil: 'Difícil',
};
