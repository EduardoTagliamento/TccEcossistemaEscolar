/**
 * Tipos TypeScript para o sistema da Copa
 */

export interface Figurinha {
  id: number;
  codigo: string;
  prefixo: string;
  numero: number;
  tipo: "FWC" | "SELECAO" | "COCACOLA";
  grupo: string | null;
  selecao: string | null;
  ordemExibicao: number;
}

export interface Album {
  id: number;
  nome: "prata" | "normal" | "ouro";
  nomeDisplay: string;
  cor: string;
  icone: string;
}

export interface StatusFigurinha {
  id: number;
  albumId: number;
  figurinhaId: number;
  possui: boolean;
  atualizadoEm: string;
  figurinha?: Figurinha;
}

export interface EstatisticasAlbum {
  albumNome: string;
  albumDisplay: string;
  albumCor: string;
  albumIcone: string;
  totalFigurinhas: number;
  completas: number;
  faltantes: number;
  percentualCompleto: number;
}

export interface EstatisticasGerais {
  prata: EstatisticasAlbum;
  normal: EstatisticasAlbum;
  ouro: EstatisticasAlbum;
  completasNos3: number;
}

export interface FigurinhasFaltantes {
  agrupamento: string;
  faltantes: Array<{
    codigo: string;
    prefixo: string;
    numero: number;
    tipo: string;
    selecao: string | null;
  }>;
}
