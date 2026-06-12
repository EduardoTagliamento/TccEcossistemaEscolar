/**
 * Tipos e interfaces compartilhadas do sistema Copa
 */

export * from "./CopaFigurinha";
export * from "./CopaAlbum";
export * from "./CopaStatus";

/**
 * Estatísticas de um álbum
 */
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

/**
 * Estatísticas gerais de todos os álbuns
 */
export interface EstatisticasGerais {
  prata: EstatisticasAlbum;
  normal: EstatisticasAlbum;
  ouro: EstatisticasAlbum;
  completasNos3: number;
}

/**
 * Figurinhas faltantes agrupadas
 */
export interface FigurinhasFaltantes {
  agrupamento: string; // Grupo A, FWC, etc
  faltantes: Array<{
    codigo: string;
    prefixo: string;
    numero: number;
    tipo: string;
    selecao: string | null;
  }>;
}
