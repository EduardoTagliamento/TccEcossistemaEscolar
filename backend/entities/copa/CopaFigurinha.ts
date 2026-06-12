/**
 * Entity: Copa Figurinha
 * Representa uma figurinha do catálogo da Copa 2026
 */

export interface CopaFigurinha {
  id: number;
  codigo: string; // GHA01, FWC05, CC01
  prefixo: string; // GHA, FWC, CC
  numero: number; // 1, 5, 1
  tipo: "FWC" | "SELECAO" | "COCACOLA";
  grupo: string | null; // Grupo A, Grupo B, etc
  selecao: string | null; // Gana, Brasil, etc
  ordemExibicao: number; // Ordem de exibição no álbum
  criadoEm: Date;
}

export type TipoFigurinha = "FWC" | "SELECAO" | "COCACOLA";
